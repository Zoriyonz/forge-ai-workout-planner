import type { Plan } from "@forge/planner";

/** Stable, pretty JSON. Exercises are flattened to what a consumer needs. */
export function toJson(plan: Plan): string {
  const flat = {
    goal: plan.goal,
    summary: plan.summary,
    metrics: plan.metrics,
    avoided: plan.avoided,
    notes: plan.notes,
    days: plan.days.map((d) => ({
      weekday: d.weekday,
      name: d.name,
      focus: d.focus,
      estimatedMinutes: d.estimatedMinutes,
      finisher: d.finisher ?? null,
      exercises: d.exercises.map((x) => ({
        id: x.exercise.id,
        name: x.exercise.name,
        muscle: x.exercise.primary,
        sets: x.sets,
        reps: x.reps,
        restSec: x.restSec,
        cue: x.exercise.cue,
      })),
    })),
  };
  return `${JSON.stringify(flat, null, 2)}\n`;
}
