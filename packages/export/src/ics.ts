import type { Plan } from "@forge/planner";

export interface IcsOptions {
  /** First day to schedule from, as YYYY-MM-DD. Each session lands on its weekday on or after this. */
  start: string;
  /** How many weeks the schedule repeats. Default 8. */
  weeks?: number;
  /** Local start time, 24h. Default 18 (6pm). */
  startHour?: number;
  /** Fixed "now" so output is deterministic in tests. */
  now?: Date;
}

const BYDAY: Record<string, { code: string; index: number }> = {
  Mon: { code: "MO", index: 1 },
  Tue: { code: "TU", index: 2 },
  Wed: { code: "WE", index: 3 },
  Thu: { code: "TH", index: 4 },
  Fri: { code: "FR", index: 5 },
  Sat: { code: "SA", index: 6 },
  Sun: { code: "SU", index: 0 },
};

const pad = (n: number) => String(n).padStart(2, "0");

/** RFC 5545 section 3.3.11 text escaping. */
const escapeText = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** RFC 5545 section 3.1: fold lines longer than 75 octets, continuing with a single space. */
function fold(line: string): string {
  const bytes = new TextEncoder();
  if (bytes.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  for (const ch of line) {
    const limit = parts.length === 0 ? 75 : 74;
    if (bytes.encode(current + ch).length > limit) {
      parts.push(current);
      current = ch;
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts.join("\r\n ");
}

function parseDate(iso: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) throw new Error(`start must be YYYY-MM-DD, got "${iso}"`);
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (d.getUTCMonth() !== Number(m[2]) - 1) throw new Error(`start is not a real date: "${iso}"`);
  return d;
}

/**
 * An iCalendar (.ics) file with one weekly-recurring event per training day,
 * in floating local time so it lands at the same wall-clock hour wherever you
 * are. Import it into Google Calendar, Apple Calendar or Outlook.
 */
export function toIcs(plan: Plan, options: IcsOptions): string {
  const weeks = options.weeks ?? 8;
  const hour = options.startHour ?? 18;
  if (!Number.isInteger(weeks) || weeks < 1 || weeks > 52) throw new Error("weeks must be 1 to 52");
  if (!Number.isInteger(hour) || hour < 0 || hour > 23)
    throw new Error("startHour must be 0 to 23");

  const start = parseDate(options.start);
  const now = options.now ?? new Date();
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Forge//Workout Planner//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Forge training plan",
  ];

  plan.days.forEach((day, i) => {
    const wd = BYDAY[day.weekday];
    if (!wd) return;
    const offset = (wd.index - start.getUTCDay() + 7) % 7;
    const first = new Date(start.getTime() + offset * 86_400_000);
    const dt = `${first.getUTCFullYear()}${pad(first.getUTCMonth() + 1)}${pad(first.getUTCDate())}T${pad(hour)}0000`;

    const description = [
      day.focus,
      ...day.exercises.map((x) => `${x.exercise.name}: ${x.sets} x ${x.reps}, rest ${x.restSec}s`),
      ...(day.finisher ? [`Finisher: ${day.finisher}`] : []),
    ].join("\n");

    lines.push(
      "BEGIN:VEVENT",
      `UID:forge-${i + 1}-${wd.code.toLowerCase()}-${dt}@forge.local`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${dt}`,
      `DURATION:PT${day.estimatedMinutes}M`,
      `RRULE:FREQ=WEEKLY;COUNT=${weeks};BYDAY=${wd.code}`,
      `SUMMARY:${escapeText(`Forge: ${day.name}`)}`,
      `DESCRIPTION:${escapeText(description)}`,
      "END:VEVENT",
    );
  });

  lines.push("END:VCALENDAR");
  return `${lines.map(fold).join("\r\n")}\r\n`;
}
