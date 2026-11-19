import { toIcs, toMarkdown } from "@forge/export";
import type { Plan } from "@forge/planner";

const localIsoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function save(filename: string, mime: string, data: string) {
  const url = URL.createObjectURL(new Blob([data], { type: `${mime};charset=utf-8` }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** The same renderers the `forge` CLI uses, so a web download and a terminal export match. */
export const downloads = {
  markdown: (plan: Plan) => save("forge-plan.md", "text/markdown", toMarkdown(plan)),
  calendar: (plan: Plan) =>
    save("forge-plan.ics", "text/calendar", toIcs(plan, { start: localIsoDate(new Date()) })),
};
