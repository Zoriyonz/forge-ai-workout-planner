import { parseGoal } from "./goals";
import { MUSCLES, type Goal, type Interpretation, type Muscle } from "./types";

const GOALS: Goal[] = ["fat_loss", "muscle_gain", "strength", "endurance", "general"];

const SYSTEM =
  "You convert a person's fitness goal into JSON for a workout planner. Reply with JSON only, no prose, shaped as " +
  '{"goal":"fat_loss|muscle_gain|strength|endurance|general","emphasis":["chest|back|shoulders|biceps|triceps|quads|hamstrings|glutes|calves|core"],' +
  '"daysPerWeek":number or null,"summary":"one friendly sentence, max 30 words"}. ' +
  "Only use what the person actually wrote. Never give medical advice or mention body fat estimates.";

/** Validates untrusted model output, returning undefined if anything is off. */
export function validateInterpretation(raw: unknown): Interpretation | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const o = raw as Record<string, unknown>;
  if (typeof o.goal !== "string" || !GOALS.includes(o.goal as Goal)) return undefined;
  const emphasis = Array.isArray(o.emphasis)
    ? o.emphasis.filter(
        (m): m is Muscle => typeof m === "string" && (MUSCLES as readonly string[]).includes(m),
      )
    : [];
  const days =
    typeof o.daysPerWeek === "number" && o.daysPerWeek >= 2 && o.daysPerWeek <= 6
      ? Math.round(o.daysPerWeek)
      : undefined;
  const summary =
    typeof o.summary === "string" && o.summary.trim() ? o.summary.trim().slice(0, 240) : undefined;
  if (!summary) return undefined;
  return {
    goal: o.goal as Goal,
    emphasis: [...new Set(emphasis)],
    daysPerWeek: days,
    summary,
    source: "claude",
  };
}

/**
 * Uses Claude to read the free-text goal when a key is configured. The model
 * only produces structured settings; the planner builds the actual workouts
 * from its own exercise library, so equipment and limitation rules always hold.
 * Any failure falls back to the offline parser.
 */
export async function interpretGoal(
  goalText: string,
  env: Record<string, string | undefined>,
  fetchImpl: typeof fetch = fetch,
): Promise<Interpretation> {
  const key = env.ANTHROPIC_API_KEY;
  if (!key) return parseGoal(goalText);

  try {
    const res = await fetchImpl("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
        max_tokens: 300,
        system: SYSTEM,
        messages: [{ role: "user", content: goalText }],
      }),
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = data.content?.find((c) => c.type === "text")?.text ?? "";
    const json = text.match(/\{[\s\S]*\}/)?.[0];
    const valid = json ? validateInterpretation(JSON.parse(json)) : undefined;
    return valid ?? parseGoal(goalText);
  } catch {
    return parseGoal(goalText);
  }
}
