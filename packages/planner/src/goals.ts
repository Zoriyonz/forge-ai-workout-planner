import type { Goal, Interpretation, Limitation, Muscle } from "./types";

const GOAL_KEYWORDS: [Goal, RegExp][] = [
  ["fat_loss", /\b(lose|losing|fat|cut|cutting|lean|leaner|slim|tone|toned|weight loss|shred)\b/],
  ["strength", /\b(strong|stronger|strength|powerlift\w*|power|heavy|1rm|deadlift|squat|bench)\b/],
  [
    "muscle_gain",
    /\b(muscle|muscles|bulk|bulking|size|hypertrophy|bigger|build|gain|mass|physique)\b/,
  ],
  ["endurance", /\b(run|running|endurance|cardio|stamina|marathon|5k|10k|conditioning|fitness)\b/],
];

const EMPHASIS_KEYWORDS: [Muscle[], RegExp][] = [
  [["chest"], /\b(chest|pecs?)\b/],
  [["back"], /\b(back|lats?|posture)\b/],
  [["shoulders"], /\b(shoulders?|delts?)\b/],
  [["biceps", "triceps"], /\b(arms?|biceps?|triceps?|guns)\b/],
  [["glutes"], /\b(glutes?|butt|booty)\b/],
  [["quads", "hamstrings", "glutes"], /\b(legs?|lower body)\b/],
  [["core"], /\b(abs?|core|six[- ]?pack|midsection)\b/],
];

const LIMITATION_KEYWORDS: [Limitation, RegExp][] = [
  ["knee", /\b(knee|knees|acl|mcl|meniscus|patella\w*)\b/],
  ["shoulder", /\b(shoulder|shoulders|rotator|impingement)\b/],
  ["back", /\b(back pain|lower back|spine|disc|sciatica|herniated|lumbar)\b/],
  ["wrist", /\b(wrist|wrists|carpal)\b/],
  ["hip", /\b(hip|hips)\b/],
];

const DAY_WORDS: Record<string, number> = { two: 2, three: 3, four: 4, five: 5, six: 6 };

export function parseLimitations(text: string): Limitation[] {
  const t = text.toLowerCase();
  return LIMITATION_KEYWORDS.filter(([, re]) => re.test(t)).map(([l]) => l);
}

function parseDays(t: string): number | undefined {
  const m = t.match(/\b([2-6]|two|three|four|five|six)\s*(?:x|times|days?|sessions?)\b/);
  if (!m?.[1]) return undefined;
  return DAY_WORDS[m[1]] ?? Number(m[1]);
}

/**
 * Offline goal interpreter. Scores each goal by keyword hits and takes the
 * highest; ties favour the order in GOAL_KEYWORDS (fat loss first because
 * "lean" and "lose" are the most specific signals).
 */
export function parseGoal(text: string): Interpretation {
  const t = text.toLowerCase();
  let best: Goal = "general";
  let bestHits = 0;
  for (const [goal, re] of GOAL_KEYWORDS) {
    const hits = (t.match(new RegExp(re.source, "g")) ?? []).length;
    if (hits > bestHits) {
      best = goal;
      bestHits = hits;
    }
  }

  const emphasis = new Set<Muscle>();
  for (const [muscles, re] of EMPHASIS_KEYWORDS) {
    if (re.test(t)) muscles.forEach((m) => emphasis.add(m));
  }

  const daysPerWeek = parseDays(t);
  const label: Record<Goal, string> = {
    fat_loss: "lose fat while keeping muscle",
    muscle_gain: "build muscle",
    strength: "get stronger",
    endurance: "improve conditioning and endurance",
    general: "build general fitness",
  };
  const focus = emphasis.size ? ` with extra work on ${[...emphasis].join(", ")}` : "";

  return {
    goal: best,
    emphasis: [...emphasis],
    daysPerWeek,
    summary: `Your plan is set up to ${label[best]}${focus}.`,
    source: "local",
  };
}
