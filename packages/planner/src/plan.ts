import { EXERCISES } from "./exercises";
import { parseGoal, parseLimitations } from "./goals";
import { computeMetrics } from "./metrics";
import type {
  Exercise,
  Experience,
  Goal,
  Interpretation,
  Limitation,
  Muscle,
  Pattern,
  Plan,
  PlanDay,
  PlannedExercise,
  Profile,
} from "./types";

interface Slot {
  pattern?: Pattern;
  muscle?: Muscle;
}

type DayType = "full" | "upper" | "lower" | "push" | "pull" | "legs";

const TEMPLATES: Record<DayType, Slot[]> = {
  full: [
    { pattern: "squat" },
    { pattern: "push", muscle: "chest" },
    { pattern: "pull", muscle: "back" },
    { pattern: "hinge" },
    { muscle: "core" },
    { pattern: "isolation", muscle: "shoulders" },
  ],
  upper: [
    { pattern: "push", muscle: "chest" },
    { pattern: "pull", muscle: "back" },
    { pattern: "push", muscle: "shoulders" },
    { pattern: "pull", muscle: "shoulders" },
    { pattern: "isolation", muscle: "biceps" },
    { pattern: "isolation", muscle: "triceps" },
  ],
  lower: [
    { pattern: "squat" },
    { pattern: "hinge", muscle: "hamstrings" },
    { pattern: "lunge" },
    { pattern: "hinge", muscle: "glutes" },
    { pattern: "isolation", muscle: "calves" },
    { muscle: "core" },
  ],
  push: [
    { pattern: "push", muscle: "chest" },
    { pattern: "push", muscle: "shoulders" },
    { pattern: "push", muscle: "chest" },
    { pattern: "isolation", muscle: "shoulders" },
    { pattern: "isolation", muscle: "triceps" },
    { pattern: "isolation", muscle: "triceps" },
  ],
  pull: [
    { pattern: "pull", muscle: "back" },
    { pattern: "pull", muscle: "back" },
    { pattern: "pull", muscle: "shoulders" },
    { pattern: "isolation", muscle: "biceps" },
    { pattern: "isolation", muscle: "biceps" },
    { muscle: "core" },
  ],
  legs: [
    { pattern: "squat" },
    { pattern: "hinge", muscle: "hamstrings" },
    { pattern: "lunge" },
    { pattern: "hinge", muscle: "glutes" },
    { pattern: "isolation", muscle: "calves" },
    { muscle: "core" },
  ],
};

const DOMAIN: Record<DayType, Muscle[]> = {
  full: [
    "chest",
    "back",
    "shoulders",
    "biceps",
    "triceps",
    "quads",
    "hamstrings",
    "glutes",
    "calves",
    "core",
  ],
  upper: ["chest", "back", "shoulders", "biceps", "triceps"],
  lower: ["quads", "hamstrings", "glutes", "calves"],
  push: ["chest", "shoulders", "triceps"],
  pull: ["back", "biceps"],
  legs: ["quads", "hamstrings", "glutes", "calves"],
};

const FOCUS: Record<DayType, string> = {
  full: "Full body",
  upper: "Upper body",
  lower: "Lower body",
  push: "Chest, shoulders, triceps",
  pull: "Back and biceps",
  legs: "Legs and glutes",
};

const LAYOUTS: Record<number, DayType[]> = {
  2: ["full", "full"],
  3: ["full", "full", "full"],
  4: ["upper", "lower", "upper", "lower"],
  5: ["push", "pull", "legs", "upper", "lower"],
  6: ["push", "pull", "legs", "push", "pull", "legs"],
};

const WEEKDAYS: Record<number, string[]> = {
  2: ["Mon", "Thu"],
  3: ["Mon", "Wed", "Fri"],
  4: ["Mon", "Tue", "Thu", "Fri"],
  5: ["Mon", "Tue", "Thu", "Fri", "Sat"],
  6: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
};

const LEVEL: Record<Experience, number> = { beginner: 1, intermediate: 2, advanced: 3 };
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(n)));

function available(
  ex: Exercise,
  owned: Set<string>,
  avoid: Set<Limitation>,
  exp: Experience,
): boolean {
  if (!ex.requires.every((r) => owned.has(r))) return false;
  if (ex.avoid?.some((l) => avoid.has(l))) return false;
  if (exp === "beginner" && ex.level === 3) return false;
  return true;
}

function score(ex: Exercise, goal: Goal, exp: Experience, used: Map<string, number>): number {
  let s = 0;
  if (goal === "strength" && ex.requires.includes("barbell")) s += 3;
  else if (goal !== "endurance" && ex.requires.length > 0) s += 1;
  if (ex.level === LEVEL[exp]) s += 1;
  if (exp === "beginner" && ex.impact) s -= 2;
  s -= (used.get(ex.id) ?? 0) * (goal === "strength" ? 1 : 3);
  return s;
}

function pick(
  slot: Slot,
  pool: Exercise[],
  dayUsed: Set<string>,
  used: Map<string, number>,
  goal: Goal,
  exp: Experience,
): Exercise | undefined {
  const candidates = (strict: boolean) =>
    pool.filter(
      (x) =>
        !dayUsed.has(x.id) &&
        (!slot.muscle || x.primary === slot.muscle) &&
        (!strict || !slot.pattern || x.pattern === slot.pattern),
    );
  let list = candidates(true);
  if (list.length === 0 && slot.muscle) list = candidates(false);
  return list.sort(
    (a, b) => score(b, goal, exp, used) - score(a, goal, exp, used) || a.id.localeCompare(b.id),
  )[0];
}

function prescribe(
  ex: Exercise,
  index: number,
  goal: Goal,
  exp: Experience,
): Pick<PlannedExercise, "sets" | "reps" | "restSec"> {
  const isolation = ex.pattern === "isolation" || ex.pattern === "core";
  let sets = 3;
  let reps = "8-12";
  let rest = 75;

  switch (goal) {
    case "strength":
      if (!isolation && index < 2) ({ sets, reps, rest } = { sets: 4, reps: "4-6", rest: 150 });
      else ({ sets, reps, rest } = { sets: 3, reps: "8-10", rest: 90 });
      break;
    case "muscle_gain":
      ({ sets, reps, rest } = isolation
        ? { sets: 3, reps: "10-15", rest: 60 }
        : { sets: index < 2 && exp === "advanced" ? 4 : 3, reps: "8-12", rest: 90 });
      break;
    case "fat_loss":
      ({ sets, reps, rest } = {
        sets: 3,
        reps: isolation ? "12-15" : "10-15",
        rest: isolation ? 45 : 60,
      });
      break;
    case "endurance":
      ({ sets, reps, rest } = { sets: 3, reps: "15-20", rest: 45 });
      break;
    default:
      break;
  }

  if (exp === "beginner" && sets > 2 && goal !== "general") sets -= 1;
  if (ex.timed) reps = exp === "beginner" ? "20-30 sec" : "30-45 sec";
  return { sets, reps, restSec: rest };
}

/** Rough minutes for one exercise: working time plus rest plus setup. */
function minutesFor(p: Pick<PlannedExercise, "sets" | "reps" | "restSec">): number {
  const upper = Number(p.reps.match(/(\d+)\D*$/)?.[1] ?? 12);
  const work = p.reps.includes("sec") ? upper : upper * 3.5;
  return (p.sets * (work + p.restSec)) / 60 + 0.5;
}

function dayName(type: DayType, nth: number, total: number): string {
  const base: Record<DayType, string> = {
    full: "Full Body",
    upper: "Upper",
    lower: "Lower",
    push: "Push",
    pull: "Pull",
    legs: "Legs",
  };
  return total > 1 ? `${base[type]} ${String.fromCharCode(64 + nth)}` : base[type];
}

export function generatePlan(profile: Profile, interpretation?: Interpretation): Plan {
  const interp = interpretation ?? parseGoal(profile.goalText);
  const owned = new Set<string>(profile.equipment);
  const limitations = parseLimitations(profile.limitationsText);
  const avoid = new Set<Limitation>(limitations);
  const pool = EXERCISES.filter((x) => available(x, owned, avoid, profile.experience));

  const days = clamp(interp.daysPerWeek ?? profile.daysPerWeek, 2, 6);
  const minutes = clamp(profile.sessionMinutes, 20, 90);
  const layout = LAYOUTS[days] ?? LAYOUTS[3]!;
  const weekdays = WEEKDAYS[days] ?? WEEKDAYS[3]!;

  const finisherMinutes =
    interp.goal === "fat_loss" && minutes >= 40
      ? 8
      : interp.goal === "endurance" && minutes >= 45
        ? 12
        : 0;
  const budget = minutes - 8 - finisherMinutes;

  const used = new Map<string, number>();
  const typeTotals = layout.reduce<Record<string, number>>(
    (acc, t) => ({ ...acc, [t]: (acc[t] ?? 0) + 1 }),
    {},
  );
  const typeSeen: Record<string, number> = {};

  const planDays: PlanDay[] = layout.map((type, i) => {
    typeSeen[type] = (typeSeen[type] ?? 0) + 1;

    const slots = [...(TEMPLATES[type] ?? [])];
    const boosts = interp.emphasis.filter((m) => DOMAIN[type].includes(m)).slice(0, 2);
    boosts.forEach((m, k) => slots.splice(2 + k, 0, { muscle: m }));

    const dayUsed = new Set<string>();
    const exercises: PlannedExercise[] = [];
    let total = 0;

    for (const slot of slots) {
      const ex = pick(slot, pool, dayUsed, used, interp.goal, profile.experience);
      if (!ex) continue;
      const rx = prescribe(ex, exercises.length, interp.goal, profile.experience);
      const cost = minutesFor(rx);
      if (total + cost > budget && exercises.length >= 3) break;
      dayUsed.add(ex.id);
      used.set(ex.id, (used.get(ex.id) ?? 0) + 1);
      exercises.push({ exercise: ex, ...rx });
      total += cost;
    }

    const finisher =
      finisherMinutes === 8
        ? "8 min intervals: 30 seconds hard, 30 seconds easy (jog in place, bike, or fast stair climbs)."
        : finisherMinutes === 12
          ? "12 min steady cardio at a pace where you can still talk in short sentences."
          : undefined;

    return {
      name: dayName(type, typeSeen[type] ?? 1, typeTotals[type] ?? 1),
      weekday: weekdays[i] ?? `Day ${i + 1}`,
      focus: FOCUS[type],
      exercises,
      finisher,
      estimatedMinutes: Math.round(8 + total + finisherMinutes),
    };
  });

  const notes: string[] = [
    "Warm up for 5 minutes (easy cardio plus a few light sets of your first exercise) before each session.",
    "Pick loads that leave about 2 reps in reserve. When you hit the top of the rep range on every set, add a little weight next time.",
    "Rest at least a day between sessions that train the same muscles, and stop any exercise that causes sharp pain.",
  ];
  if (limitations.length > 0) {
    notes.push(
      `Because you mentioned ${limitations.join(", ")}, exercises that commonly stress that area were left out. If you have a diagnosed injury, check with a clinician or physio before starting.`,
    );
  }
  if (profile.equipment.length === 0) {
    notes.push(
      "Planned with bodyweight only. Resistance bands or dumbbells would unlock many more options.",
    );
  }
  if (interp.daysPerWeek && interp.daysPerWeek !== profile.daysPerWeek) {
    notes.push(`Your goal mentioned ${interp.daysPerWeek} days a week, so the plan uses that.`);
  }

  return {
    goal: interp.goal,
    summary: interp.summary,
    days: planDays,
    notes,
    avoided: limitations,
    metrics: computeMetrics(profile.heightCm, profile.weightKg, profile.measurements),
  };
}
