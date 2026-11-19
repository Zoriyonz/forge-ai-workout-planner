import { generatePlan, interpretGoal, type Plan, type Profile } from "@forge/planner";
import {
  EXPORT_FORMATS,
  toIcs,
  toJson,
  toMarkdown,
  toText,
  type ExportFormat,
} from "@forge/export";
import { UsageError, type Io } from "../io";
import {
  isoDate,
  parseEquipment,
  parseExperience,
  parseNumber,
  parseOptionalNumber,
  parseStartDate,
} from "../validate";

export interface PlanFlags {
  goal?: string;
  height?: string;
  weight?: string;
  age?: string;
  days?: string;
  minutes?: string;
  experience?: string;
  equipment?: string;
  limits?: string;
  waist?: string;
  hips?: string;
  format?: string;
  out?: string;
  ai?: boolean;
  start?: string;
  weeks?: string;
  hour?: string;
}

export function profileFromFlags(flags: PlanFlags): Profile {
  const goalText = flags.goal?.trim();
  if (!goalText)
    throw new UsageError('--goal is required, e.g. --goal "build muscle, 4 days a week".');
  const waistCm = parseOptionalNumber("waist", flags.waist, { min: 40, max: 250 });
  const hipsCm = parseOptionalNumber("hips", flags.hips, { min: 40, max: 250 });

  return {
    goalText,
    heightCm: parseNumber("height", flags.height, { min: 100, max: 250 }),
    weightKg: parseNumber("weight", flags.weight, { min: 30, max: 300 }),
    age: parseNumber("age", flags.age, { min: 12, max: 100, fallback: 0 }),
    daysPerWeek: parseNumber("days", flags.days, { min: 2, max: 6, fallback: 3 }),
    sessionMinutes: parseNumber("minutes", flags.minutes, { min: 20, max: 90, fallback: 45 }),
    experience: parseExperience(flags.experience),
    equipment: parseEquipment(flags.equipment),
    limitationsText: flags.limits ?? "",
    measurements: waistCm || hipsCm ? { waistCm, hipsCm } : undefined,
  };
}

function parseFormat(raw: string | undefined): ExportFormat {
  if (raw === undefined) return "text";
  const v = raw.toLowerCase() === "md" ? "markdown" : (raw.toLowerCase() as ExportFormat);
  if (!EXPORT_FORMATS.includes(v)) {
    throw new UsageError(`--format must be one of: ${EXPORT_FORMATS.join(", ")} (got "${raw}").`);
  }
  return v;
}

export function render(plan: Plan, format: ExportFormat, flags: PlanFlags, io: Io): string {
  switch (format) {
    case "markdown":
      return toMarkdown(plan);
    case "json":
      return toJson(plan);
    case "ics":
      return toIcs(plan, {
        start: parseStartDate(flags.start, isoDate(io.now())),
        weeks: parseNumber("weeks", flags.weeks, { min: 1, max: 52, fallback: 8 }),
        startHour: parseNumber("hour", flags.hour, { min: 0, max: 23, fallback: 18 }),
        now: io.now(),
      });
    case "text":
      return toText(plan);
  }
}

export async function planCommand(flags: PlanFlags, io: Io): Promise<void> {
  const profile = profileFromFlags(flags);
  const format = parseFormat(flags.format);

  if (flags.ai && !io.env.ANTHROPIC_API_KEY) {
    throw new UsageError("--ai needs ANTHROPIC_API_KEY set in your environment.");
  }
  const interpretation = flags.ai
    ? await interpretGoal(profile.goalText, io.env, io.fetch)
    : undefined;

  const plan = generatePlan(profile, interpretation);
  const output = render(plan, format, flags, io);

  if (flags.out) {
    io.writeFile(flags.out, output);
    io.stderr(`Wrote ${format} plan to ${flags.out}\n`);
  } else {
    io.stdout(output);
  }
}
