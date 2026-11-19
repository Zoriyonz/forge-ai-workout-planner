import { describe, expect, it, vi } from "vitest";
import {
  EXERCISES,
  computeMetrics,
  generatePlan,
  interpretGoal,
  parseGoal,
  parseLimitations,
  validateInterpretation,
  type Equipment,
  type Profile,
} from "./index";

const base: Profile = {
  heightCm: 178,
  weightKg: 78,
  age: 24,
  experience: "intermediate",
  goalText: "I want to build muscle, especially chest and arms, 4 days a week",
  equipment: ["dumbbells", "bench", "pullup_bar"],
  daysPerWeek: 3,
  sessionMinutes: 60,
  limitationsText: "",
};

const allExercises = (p: ReturnType<typeof generatePlan>) => p.days.flatMap((d) => d.exercises.map((x) => x.exercise));

describe("parseGoal", () => {
  it("detects muscle gain, emphasis and days per week", () => {
    const g = parseGoal(base.goalText);
    expect(g.goal).toBe("muscle_gain");
    expect(g.emphasis).toEqual(expect.arrayContaining(["chest", "biceps", "triceps"]));
    expect(g.daysPerWeek).toBe(4);
  });

  it("detects fat loss and strength goals", () => {
    expect(parseGoal("I want to lose fat and get lean").goal).toBe("fat_loss");
    expect(parseGoal("get stronger, add to my squat and deadlift").goal).toBe("strength");
  });

  it("falls back to general for vague text", () => {
    expect(parseGoal("be healthier").goal).toBe("general");
  });
});

describe("parseLimitations", () => {
  it("maps phrases to body areas", () => {
    expect(parseLimitations("bad knees and some lower back pain")).toEqual(expect.arrayContaining(["knee", "back"]));
    expect(parseLimitations("none")).toEqual([]);
  });
});

describe("generatePlan", () => {
  it("only uses equipment the person owns", () => {
    const owned = new Set<Equipment>(base.equipment);
    for (const ex of allExercises(generatePlan(base))) {
      expect(ex.requires.every((r) => owned.has(r))).toBe(true);
    }
  });

  it("works with bodyweight only and never requires equipment", () => {
    const plan = generatePlan({ ...base, equipment: [] });
    const exercises = allExercises(plan);
    expect(exercises.length).toBeGreaterThan(5);
    expect(exercises.every((x) => x.requires.length === 0)).toBe(true);
    expect(plan.notes.join(" ")).toMatch(/bodyweight only/i);
  });

  it("skips exercises that conflict with a mentioned limitation", () => {
    const plan = generatePlan({ ...base, equipment: ["dumbbells"], limitationsText: "bad knees", goalText: "lose fat" });
    expect(allExercises(plan).some((x) => x.avoid?.includes("knee"))).toBe(false);
    expect(plan.avoided).toContain("knee");
    expect(plan.notes.join(" ")).toMatch(/clinician/i);
  });

  it("uses the days per week implied by the goal text", () => {
    expect(generatePlan(base).days).toHaveLength(4);
    const three = generatePlan({ ...base, goalText: "build muscle" });
    expect(three.days).toHaveLength(3);
  });

  it("keeps sessions within the time budget", () => {
    for (const minutes of [30, 45, 60, 90]) {
      const plan = generatePlan({ ...base, sessionMinutes: minutes });
      for (const d of plan.days) expect(d.estimatedMinutes).toBeLessThanOrEqual(minutes + 6);
    }
  });

  it("never repeats an exercise within a single day", () => {
    for (const day of generatePlan({ ...base, daysPerWeek: 6, goalText: "get stronger" }).days) {
      const ids = day.exercises.map((x) => x.exercise.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("adds a finisher for fat loss and gives timed holds in seconds", () => {
    const plan = generatePlan({ ...base, goalText: "lose fat", sessionMinutes: 60 });
    expect(plan.days[0]?.finisher).toBeDefined();
    const plank = plan.days.flatMap((d) => d.exercises).find((x) => x.exercise.timed);
    if (plank) expect(plank.reps).toMatch(/sec/);
  });

  it("is deterministic", () => {
    expect(JSON.stringify(generatePlan(base))).toBe(JSON.stringify(generatePlan(base)));
  });

  it("excludes the hardest exercises for beginners", () => {
    const plan = generatePlan({ ...base, experience: "beginner", equipment: ["barbell", "bench", "pullup_bar"] });
    expect(allExercises(plan).every((x) => x.level < 3)).toBe(true);
  });
});

describe("exercise library", () => {
  it("has unique ids", () => {
    const ids = EXERCISES.map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("computeMetrics", () => {
  it("computes BMI and waist ratios", () => {
    const m = computeMetrics(180, 81, { waistCm: 90, hipsCm: 100 });
    expect(m.bmi).toBe(25);
    expect(m.waistToHeight).toBe(0.5);
    expect(m.waistToHip).toBe(0.9);
  });
});

describe("interpretGoal", () => {
  it("falls back to the offline parser with no key", async () => {
    const r = await interpretGoal("build muscle", {});
    expect(r.source).toBe("local");
  });

  it("accepts valid model output", async () => {
    const body = { content: [{ type: "text", text: '{"goal":"strength","emphasis":["back","bogus"],"daysPerWeek":4,"summary":"Get stronger."}' }] };
    const f = vi.fn().mockResolvedValue({ ok: true, json: async () => body }) as unknown as typeof fetch;
    const r = await interpretGoal("stronger back", { ANTHROPIC_API_KEY: "k" }, f);
    expect(r).toMatchObject({ goal: "strength", emphasis: ["back"], daysPerWeek: 4, source: "claude" });
  });

  it("rejects invalid model output and falls back", async () => {
    const body = { content: [{ type: "text", text: '{"goal":"become a wizard","summary":"x"}' }] };
    const f = vi.fn().mockResolvedValue({ ok: true, json: async () => body }) as unknown as typeof fetch;
    const r = await interpretGoal("lose fat", { ANTHROPIC_API_KEY: "k" }, f);
    expect(r.source).toBe("local");
    expect(r.goal).toBe("fat_loss");
  });

  it("falls back when the request fails", async () => {
    const f = vi.fn().mockRejectedValue(new Error("network")) as unknown as typeof fetch;
    expect((await interpretGoal("lose fat", { ANTHROPIC_API_KEY: "k" }, f)).source).toBe("local");
  });
});

describe("validateInterpretation", () => {
  it("rejects non-objects and missing summaries", () => {
    expect(validateInterpretation(null)).toBeUndefined();
    expect(validateInterpretation({ goal: "strength" })).toBeUndefined();
  });
});
