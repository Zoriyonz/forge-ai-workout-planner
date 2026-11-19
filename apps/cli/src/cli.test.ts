import { describe, expect, it } from "vitest";
import { run } from "./cli";
import type { Io } from "./io";

function harness(env: Record<string, string | undefined> = {}, fetchImpl?: typeof fetch) {
  const out: string[] = [];
  const err: string[] = [];
  const files = new Map<string, string>();
  const io: Io = {
    stdout: (t) => void out.push(t),
    stderr: (t) => void err.push(t),
    writeFile: (p, d) => void files.set(p, d),
    env,
    now: () => new Date(2026, 0, 5, 12, 0, 0),
    fetch: fetchImpl ?? (async () => new Response("{}", { status: 500 })),
  };
  return { io, stdout: () => out.join(""), stderr: () => err.join(""), files };
}

const BASE = ["plan", "--goal", "build muscle, 4 days a week", "--height", "178", "--weight", "80"];

describe("forge plan", () => {
  it("prints a text plan by default and exits 0", async () => {
    const h = harness();
    expect(await run([...BASE, "--equipment", "dumbbells,bench"], h.io)).toBe(0);
    expect(h.stdout()).toContain("4-day plan: Muscle gain");
  });

  it("honours --days when the goal text has no day count", async () => {
    const h = harness();
    await run(
      ["plan", "--goal", "get fit", "--height", "170", "--weight", "70", "--days", "5"],
      h.io,
    );
    expect(h.stdout()).toContain("5-day plan");
  });

  it.each([
    ["markdown", "# 4-day plan"],
    ["md", "# 4-day plan"],
    ["json", '"goal": "muscle_gain"'],
    ["ics", "BEGIN:VCALENDAR"],
  ])("renders --format %s", async (format, marker) => {
    const h = harness();
    expect(await run([...BASE, "--format", format], h.io)).toBe(0);
    expect(h.stdout()).toContain(marker);
  });

  it("schedules ics from --start with --weeks and --hour", async () => {
    const h = harness();
    await run(
      [...BASE, "--format", "ics", "--start", "2026-03-02", "--weeks", "6", "--hour", "7"],
      h.io,
    );
    expect(h.stdout()).toContain("DTSTART:20260302T070000");
    expect(h.stdout()).toContain("COUNT=6");
  });

  it("defaults the ics start to today", async () => {
    const h = harness();
    await run([...BASE, "--format", "ics"], h.io);
    expect(h.stdout()).toMatch(/DTSTART:202601(05|06|07|08|09|10|11)T180000/);
  });

  it("writes to --out instead of stdout", async () => {
    const h = harness();
    expect(await run([...BASE, "--format", "markdown", "--out", "plan.md"], h.io)).toBe(0);
    expect(h.stdout()).toBe("");
    expect(h.files.get("plan.md")).toContain("# 4-day plan");
    expect(h.stderr()).toContain("Wrote markdown plan to plan.md");
  });

  it("leaves out exercises that conflict with a stated limitation", async () => {
    const h = harness();
    await run([...BASE, "--limits", "bad knees", "--format", "json"], h.io);
    const plan = JSON.parse(h.stdout());
    expect(plan.avoided).toContain("knee");
  });

  it("uses Claude only with --ai, and falls back offline on failure", async () => {
    const h = harness({ ANTHROPIC_API_KEY: "test-key" });
    expect(await run([...BASE, "--ai"], h.io)).toBe(0); // fetch returns 500 -> offline parser
    expect(h.stdout()).toContain("4-day plan");
  });

  it("uses the model's reading of the goal when --ai succeeds", async () => {
    const reply = JSON.stringify({
      content: [
        {
          type: "text",
          text: '{"goal":"strength","emphasis":["back"],"daysPerWeek":3,"summary":"Get strong."}',
        },
      ],
    });
    const h = harness({ ANTHROPIC_API_KEY: "k" }, async () => new Response(reply, { status: 200 }));
    await run(
      [
        "plan",
        "--goal",
        "whatever",
        "--height",
        "170",
        "--weight",
        "70",
        "--ai",
        "--format",
        "json",
      ],
      h.io,
    );
    expect(JSON.parse(h.stdout())).toMatchObject({ goal: "strength", summary: "Get strong." });
  });
});

describe("forge plan validation (exit code 2)", () => {
  const cases: [string, string[], RegExp][] = [
    ["missing goal", ["plan", "--height", "170", "--weight", "70"], /--goal is required/],
    ["missing height", ["plan", "--goal", "x", "--weight", "70"], /--height is required/],
    [
      "height out of range",
      ["plan", "--goal", "x", "--height", "20", "--weight", "70"],
      /--height must be a number from 100 to 250/,
    ],
    ["bad equipment", [...BASE, "--equipment", "jetpack"], /Unknown equipment: jetpack/],
    ["bad experience", [...BASE, "--experience", "god"], /--experience must be one of/],
    ["bad format", [...BASE, "--format", "pdf"], /--format must be one of/],
    ["bad start date", [...BASE, "--format", "ics", "--start", "tomorrow"], /YYYY-MM-DD/],
    ["--ai without key", [...BASE, "--ai"], /ANTHROPIC_API_KEY/],
  ];
  it.each(cases)("%s", async (_name, argv, message) => {
    const h = harness();
    expect(await run(argv, h.io)).toBe(2);
    expect(h.stderr()).toMatch(message);
    expect(h.stdout()).toBe("");
  });
});

describe("forge exercises", () => {
  it("lists the library with a count", async () => {
    const h = harness();
    expect(await run(["exercises"], h.io)).toBe(0);
    expect(h.stdout()).toMatch(/\d+ exercises\n$/);
  });

  it("filters by muscle and equipment", async () => {
    const h = harness();
    await run(["exercises", "--muscle", "glutes", "--equipment", "bands", "--json"], h.io);
    const list = JSON.parse(h.stdout()) as { primary: string; requires: string[] }[];
    expect(list.length).toBeGreaterThan(0);
    for (const x of list) {
      expect(x.primary).toBe("glutes");
      expect(x.requires.every((r) => r === "bands")).toBe(true);
    }
  });

  it("rejects an unknown muscle", async () => {
    const h = harness();
    expect(await run(["exercises", "--muscle", "wings"], h.io)).toBe(2);
    expect(h.stderr()).toContain("--muscle must be one of");
  });
});

describe("general", () => {
  it("prints help for --help and exits 0", async () => {
    const h = harness();
    expect(await run(["--help"], h.io)).toBe(0);
    expect(h.stdout()).toContain("USAGE");
  });

  it("prints help and exits 2 when run with no command", async () => {
    const h = harness();
    expect(await run([], h.io)).toBe(2);
    expect(h.stdout()).toContain("USAGE");
  });

  it("prints the version", async () => {
    const h = harness();
    expect(await run(["--version"], h.io)).toBe(0);
    expect(h.stdout().trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("rejects unknown commands and flags with exit 2", async () => {
    const a = harness();
    expect(await run(["nope"], a.io)).toBe(2);
    expect(a.stderr()).toContain('Unknown command "nope"');
    const b = harness();
    expect(await run(["plan", "--bogus"], b.io)).toBe(2);
  });
});
