export const MUSCLES = [
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
] as const;
export type Muscle = (typeof MUSCLES)[number];

/** Bodyweight is always available, so it is not listed here. */
export const EQUIPMENT = [
  "dumbbells",
  "barbell",
  "bench",
  "pullup_bar",
  "bands",
  "kettlebell",
  "cables",
  "machines",
] as const;
export type Equipment = (typeof EQUIPMENT)[number];

export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  dumbbells: "Dumbbells",
  barbell: "Barbell + rack",
  bench: "Bench",
  pullup_bar: "Pull-up bar",
  bands: "Resistance bands",
  kettlebell: "Kettlebell",
  cables: "Cable machine",
  machines: "Weight machines",
};

export type Pattern = "squat" | "hinge" | "lunge" | "push" | "pull" | "isolation" | "core";
export type Limitation = "knee" | "shoulder" | "back" | "wrist" | "hip";
export type Goal = "fat_loss" | "muscle_gain" | "strength" | "endurance" | "general";
export type Experience = "beginner" | "intermediate" | "advanced";

export interface Exercise {
  id: string;
  name: string;
  pattern: Pattern;
  primary: Muscle;
  /** Every item must be available. An empty list means bodyweight only. */
  requires: Equipment[];
  level: 1 | 2 | 3;
  /** Limitations for which this exercise is skipped. */
  avoid?: Limitation[];
  impact?: boolean;
  /** Prescribed as a hold (seconds) rather than reps. */
  timed?: boolean;
  cue: string;
}

export interface Measurements {
  waistCm?: number;
  hipsCm?: number;
  chestCm?: number;
  armCm?: number;
  thighCm?: number;
}

export interface Profile {
  heightCm: number;
  weightKg: number;
  age: number;
  experience: Experience;
  goalText: string;
  equipment: Equipment[];
  daysPerWeek: number;
  sessionMinutes: number;
  limitationsText: string;
  measurements?: Measurements;
}

export interface Interpretation {
  goal: Goal;
  emphasis: Muscle[];
  daysPerWeek?: number;
  summary: string;
  source: "local" | "claude";
}

export interface PlannedExercise {
  exercise: Exercise;
  sets: number;
  /** e.g. "8-12" or "30-45 sec" */
  reps: string;
  restSec: number;
}

export interface PlanDay {
  name: string;
  weekday: string;
  focus: string;
  exercises: PlannedExercise[];
  finisher?: string;
  estimatedMinutes: number;
}

export interface Metrics {
  bmi: number;
  waistToHeight?: number;
  waistToHip?: number;
}

export interface Plan {
  goal: Goal;
  summary: string;
  days: PlanDay[];
  notes: string[];
  avoided: Limitation[];
  metrics: Metrics;
}
