import { EQUIPMENT, type Equipment, type Experience } from "@forge/planner";
import { UsageError } from "./io";

const EXPERIENCE: readonly Experience[] = ["beginner", "intermediate", "advanced"];

export function parseNumber(
  flag: string,
  raw: string | undefined,
  { min, max, fallback }: { min: number; max: number; fallback?: number },
): number {
  if (raw === undefined) {
    if (fallback === undefined) throw new UsageError(`--${flag} is required.`);
    return fallback;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n < min || n > max) {
    throw new UsageError(`--${flag} must be a number from ${min} to ${max} (got "${raw}").`);
  }
  return n;
}

export function parseOptionalNumber(
  flag: string,
  raw: string | undefined,
  range: { min: number; max: number },
): number | undefined {
  return raw === undefined ? undefined : parseNumber(flag, raw, range);
}

export function parseExperience(raw: string | undefined): Experience {
  if (raw === undefined) return "beginner";
  const v = raw.toLowerCase() as Experience;
  if (!EXPERIENCE.includes(v)) {
    throw new UsageError(`--experience must be one of: ${EXPERIENCE.join(", ")} (got "${raw}").`);
  }
  return v;
}

/** Accepts "dumbbells,pull-up bar", "none" or "bodyweight". Bodyweight is always available. */
export function parseEquipment(raw: string | undefined): Equipment[] {
  if (raw === undefined) return [];
  const items = raw
    .split(",")
    .map((s) =>
      s
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "_"),
    )
    .filter(Boolean)
    .filter((s) => s !== "none" && s !== "bodyweight");
  const bad = items.filter((s) => !(EQUIPMENT as readonly string[]).includes(s));
  if (bad.length > 0) {
    throw new UsageError(
      `Unknown equipment: ${bad.join(", ")}. Choose from: ${EQUIPMENT.join(", ")}.`,
    );
  }
  return [...new Set(items)] as Equipment[];
}

/** Local calendar date as YYYY-MM-DD. */
export function isoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Validates a YYYY-MM-DD calendar date, defaulting to the supplied fallback. */
export function parseStartDate(raw: string | undefined, fallback: string): string {
  if (raw === undefined) return fallback;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  const d = m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))) : undefined;
  if (!m || !d || d.getUTCMonth() !== Number(m[2]) - 1) {
    throw new UsageError(`--start must be a real date as YYYY-MM-DD (got "${raw}").`);
  }
  return raw;
}
