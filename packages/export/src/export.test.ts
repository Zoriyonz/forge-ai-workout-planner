import { describe, expect, it } from "vitest";
import { generatePlan, type Profile } from "@forge/planner";
import { toIcs, toJson, toMarkdown, toText } from "./index";

const profile: Profile = {
  heightCm: 178,
  weightKg: 80,
  age: 24,
  experience: "intermediate",
  goalText: "build muscle, bigger chest, 4 days a week",
  equipment: ["dumbbells", "bench", "pullup_bar"],
  daysPerWeek: 4,
  sessionMinutes: 60,
  limitationsText: "sore left knee",
  measurements: { waistCm: 82, hipsCm: 98 },
};
const plan = generatePlan(profile);
const NOW = new Date("2026-01-05T12:00:00Z");

describe("toMarkdown", () => {
  const md = toMarkdown(plan);
  it("has a heading, one section per day and a notes section", () => {
    expect(md.startsWith("# 4-day plan: Muscle gain")).toBe(true);
    expect(md.match(/^## (Mon|Tue|Wed|Thu|Fri|Sat) · /gm)).toHaveLength(plan.days.length);
    expect(md).toContain("## Notes");
  });
  it("lists every exercise in a table row", () => {
    for (const day of plan.days)
      for (const x of day.exercises) expect(md).toContain(`| ${x.exercise.name} |`);
  });
  it("reports body ratios when measurements exist", () => {
    expect(md).toContain("waist-to-height");
    expect(md).toContain("waist-to-hip");
  });
});

describe("toText", () => {
  it("never exceeds 80 columns", () => {
    for (const line of toText(plan).split("\n")) expect(line.length).toBeLessThanOrEqual(80);
  });
});

describe("toJson", () => {
  it("round-trips through JSON.parse with flattened exercises", () => {
    const data = JSON.parse(toJson(plan));
    expect(data.days).toHaveLength(plan.days.length);
    expect(data.days[0].exercises[0]).toMatchObject({
      id: expect.any(String),
      sets: expect.any(Number),
    });
    expect(data.goal).toBe("muscle_gain");
  });
});

describe("toIcs", () => {
  const ics = toIcs(plan, { start: "2026-01-07", now: NOW });
  const events = ics.split("BEGIN:VEVENT").slice(1);

  it("is a well-formed calendar with CRLF endings", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
  });

  it("makes one weekly event per training day", () => {
    expect(events).toHaveLength(plan.days.length);
    expect(ics).toContain("RRULE:FREQ=WEEKLY;COUNT=8;BYDAY=MO");
  });

  it("starts each session on its weekday on or after the start date", () => {
    // 2026-01-07 is a Wednesday: Mon -> Jan 12, Tue -> Jan 13, Thu -> Jan 8, Fri -> Jan 9.
    expect(ics).toContain("DTSTART:20260112T180000");
    expect(ics).toContain("DTSTART:20260113T180000");
    expect(ics).toContain("DTSTART:20260108T180000");
    expect(ics).toContain("DTSTART:20260109T180000");
  });

  it("uses the plan's estimated duration and a stable DTSTAMP", () => {
    expect(ics).toContain(`DURATION:PT${plan.days[0]!.estimatedMinutes}M`);
    expect(ics).toContain("DTSTAMP:20260105T120000Z");
  });

  it("folds long lines to 75 octets and escapes text", () => {
    for (const line of ics.split("\r\n"))
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    expect(ics).toContain("\\n");
  });

  it("honours weeks and startHour", () => {
    const custom = toIcs(plan, { start: "2026-01-07", weeks: 12, startHour: 7, now: NOW });
    expect(custom).toContain("COUNT=12");
    expect(custom).toContain("T070000");
  });

  it("rejects bad input", () => {
    expect(() => toIcs(plan, { start: "07/01/2026" })).toThrow(/YYYY-MM-DD/);
    expect(() => toIcs(plan, { start: "2026-02-31" })).toThrow(/real date/);
    expect(() => toIcs(plan, { start: "2026-01-07", weeks: 0 })).toThrow(/weeks/);
    expect(() => toIcs(plan, { start: "2026-01-07", startHour: 24 })).toThrow(/startHour/);
  });
});
