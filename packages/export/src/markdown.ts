import type { Plan } from "@forge/planner";
import { GOAL_LABEL } from "./labels";

/** A shareable, paste-anywhere version of a plan (GitHub, Notion, Obsidian, email). */
export function toMarkdown(plan: Plan): string {
  const out: string[] = [];
  out.push(`# ${plan.days.length}-day plan: ${GOAL_LABEL[plan.goal]}`, "", plan.summary, "");

  for (const day of plan.days) {
    out.push(`## ${day.weekday} · ${day.name}`, "");
    out.push(`_${day.focus} · about ${day.estimatedMinutes} min_`, "");
    out.push("| # | Exercise | Sets × reps | Rest |", "| - | - | - | - |");
    day.exercises.forEach((x, i) => {
      out.push(`| ${i + 1} | ${x.exercise.name} | ${x.sets} × ${x.reps} | ${x.restSec}s |`);
    });
    out.push("");
    day.exercises.forEach((x) => out.push(`- **${x.exercise.name}:** ${x.exercise.cue}`));
    if (day.finisher) out.push("", `**Finisher:** ${day.finisher}`);
    out.push("");
  }

  out.push("## Notes", "", ...plan.notes.map((n) => `- ${n}`), "");
  const { bmi, waistToHeight, waistToHip } = plan.metrics;
  const metrics = [`BMI ${bmi}`];
  if (waistToHeight !== undefined) metrics.push(`waist-to-height ${waistToHeight}`);
  if (waistToHip !== undefined) metrics.push(`waist-to-hip ${waistToHip}`);
  out.push(`_${metrics.join(" · ")}. Rough context only, not a measure of health._`, "");
  return out.join("\n");
}
