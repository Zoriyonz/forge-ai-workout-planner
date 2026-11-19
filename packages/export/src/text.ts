import type { Plan } from "@forge/planner";
import { GOAL_LABEL } from "./labels";

const wrap = (text: string, width: number, indent: string): string[] => {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    if (line && (indent + line + " " + word).length > width) {
      lines.push(indent + line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(indent + line);
  return lines;
};

/** A terminal-friendly rendering (80 columns, no markup). */
export function toText(plan: Plan): string {
  const out: string[] = [];
  const title = `${plan.days.length}-day plan: ${GOAL_LABEL[plan.goal]}`;
  out.push(title, "=".repeat(title.length), "", ...wrap(plan.summary, 80, ""), "");

  for (const day of plan.days) {
    const head = `${day.weekday}  ${day.name} (${day.focus}, ~${day.estimatedMinutes} min)`;
    out.push(head, "-".repeat(Math.min(head.length, 80)));
    day.exercises.forEach((x, i) => {
      out.push(
        `${String(i + 1).padStart(2)}. ${x.exercise.name}  ${x.sets} x ${x.reps}  rest ${x.restSec}s`,
      );
      out.push(...wrap(x.exercise.cue, 80, "      "));
    });
    if (day.finisher) out.push("", ...wrap(`Finisher: ${day.finisher}`, 80, "    "));
    out.push("");
  }

  out.push("Notes", "-----");
  for (const note of plan.notes)
    out.push(...wrap(note, 80, "  ").map((l, i) => (i === 0 ? `*${l.slice(1)}` : l)));
  out.push("");
  return out.join("\n");
}
