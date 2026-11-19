"use client";

import {
  EQUIPMENT,
  EQUIPMENT_LABEL,
  generatePlan,
  parseGoal,
  type Equipment,
  type Experience,
  type Interpretation,
  type Plan,
  type Profile,
} from "@forge/planner";
import { useMemo, useState } from "react";
import { downloads } from "@/lib/download";
import { usePersisted } from "@/lib/storage";
import {
  fromCm,
  fromKg,
  lengthLabel,
  num,
  round1,
  toCm,
  toKg,
  weightLabel,
  type Units,
} from "@/lib/units";

interface Saved {
  profile: Profile;
  interpretation: Interpretation;
}

interface Form {
  height: string;
  weight: string;
  age: string;
  experience: Experience;
  goalText: string;
  equipment: Equipment[];
  days: number;
  minutes: number;
  limitations: string;
  waist: string;
  hips: string;
  chest: string;
  arm: string;
  thigh: string;
}

const EMPTY: Form = {
  height: "",
  weight: "",
  age: "",
  experience: "beginner",
  goalText: "",
  equipment: [],
  days: 3,
  minutes: 60,
  limitations: "",
  waist: "",
  hips: "",
  chest: "",
  arm: "",
  thigh: "",
};

const STEPS = ["You", "Goals", "Equipment", "Schedule"] as const;

const field =
  "w-full rounded-lg border border-line bg-black/30 px-3 py-2.5 text-sm outline-none transition focus:border-ember/60 focus:ring-2 focus:ring-ember/20";

function stepError(step: number, f: Form, units: Units): string | null {
  if (step === 0) {
    const h = num(f.height);
    const w = num(f.weight);
    const a = num(f.age);
    if (!h || toCm(h, units) < 120 || toCm(h, units) > 230)
      return "Enter a height between 120 and 230 cm (47 to 90 in).";
    if (!w || toKg(w, units) < 35 || toKg(w, units) > 250)
      return "Enter a weight between 35 and 250 kg (77 to 550 lb).";
    if (!a || a < 16 || a > 90) return "Forge is built for ages 16 to 90.";
  }
  if (step === 1 && f.goalText.trim().length < 5) return "Describe your goal in a sentence or two.";
  return null;
}

function toProfile(f: Form, units: Units): Profile {
  const cm = (s: string) => {
    const n = num(s);
    return n ? Math.round(toCm(n, units) * 10) / 10 : undefined;
  };
  return {
    heightCm: toCm(num(f.height) ?? 0, units),
    weightKg: toKg(num(f.weight) ?? 0, units),
    age: num(f.age) ?? 0,
    experience: f.experience,
    goalText: f.goalText.trim(),
    equipment: f.equipment,
    daysPerWeek: f.days,
    sessionMinutes: f.minutes,
    limitationsText: f.limitations.trim(),
    measurements: {
      waistCm: cm(f.waist),
      hipsCm: cm(f.hips),
      chestCm: cm(f.chest),
      armCm: cm(f.arm),
      thighCm: cm(f.thigh),
    },
  };
}

function toForm(p: Profile, units: Units): Form {
  const len = (cm?: number) => (cm ? String(round1(fromCm(cm, units))) : "");
  return {
    height: String(round1(fromCm(p.heightCm, units))),
    weight: String(round1(fromKg(p.weightKg, units))),
    age: String(p.age),
    experience: p.experience,
    goalText: p.goalText,
    equipment: p.equipment,
    days: p.daysPerWeek,
    minutes: p.sessionMinutes,
    limitations: p.limitationsText,
    waist: len(p.measurements?.waistCm),
    hips: len(p.measurements?.hipsCm),
    chest: len(p.measurements?.chestCm),
    arm: len(p.measurements?.armCm),
    thigh: len(p.measurements?.thighCm),
  };
}

function Label({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs text-mute">
      <span className="mb-1 block">{text}</span>
      {children}
    </label>
  );
}

export function BuildClient() {
  const [saved, setSaved, ready] = usePersisted<Saved | null>("forge.saved.v1", null);
  const [units, setUnits] = usePersisted<Units>("forge.units", "metric");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const plan = useMemo(
    () => (saved ? generatePlan(saved.profile, saved.interpretation) : null),
    [saved],
  );
  const showWizard = ready && (!saved || editing);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  function switchUnits(next: Units) {
    if (next === units) return;
    const conv = (s: string, fn: (n: number) => number) => {
      const n = num(s);
      return n ? String(round1(fn(n))) : "";
    };
    const toLen = (n: number) => fromCm(toCm(n, units), next);
    setForm((f) => ({
      ...f,
      height: conv(f.height, toLen),
      weight: conv(f.weight, (n) => fromKg(toKg(n, units), next)),
      waist: conv(f.waist, toLen),
      hips: conv(f.hips, toLen),
      chest: conv(f.chest, toLen),
      arm: conv(f.arm, toLen),
      thigh: conv(f.thigh, toLen),
    }));
    setUnits(next);
  }

  function startEdit() {
    if (saved) setForm(toForm(saved.profile, units));
    setStep(0);
    setError(null);
    setEditing(true);
  }

  function next() {
    const err = stepError(step, form, units);
    setError(err);
    if (!err) setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }

  async function generate() {
    for (let s = 0; s < 2; s++) {
      const err = stepError(s, form, units);
      if (err) {
        setStep(s);
        setError(err);
        return;
      }
    }
    setBusy(true);
    setError(null);
    const profile = toProfile(form, units);
    let interpretation: Interpretation;
    try {
      const res = await fetch("/api/interpret", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ goalText: profile.goalText }),
      });
      if (!res.ok) throw new Error("bad response");
      interpretation = ((await res.json()) as { interpretation: Interpretation }).interpretation;
    } catch {
      interpretation = parseGoal(profile.goalText); // offline fallback keeps the app usable
    }
    setSaved({ profile, interpretation });
    setEditing(false);
    setBusy(false);
  }

  if (!ready) return <div className="mx-auto h-96 max-w-3xl animate-pulse px-5" />;

  if (showWizard) {
    return (
      <main className="mx-auto max-w-2xl px-5 pb-20">
        <ol className="mb-8 flex items-center gap-2" aria-label="Progress">
          {STEPS.map((s, i) => (
            <li key={s} className="flex flex-1 items-center gap-2">
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs ${i <= step ? "bg-ember text-black" : "border border-line text-mute"}`}
                aria-current={i === step ? "step" : undefined}
              >
                {i + 1}
              </span>
              <span
                className={`hidden text-xs sm:inline ${i === step ? "text-white" : "text-mute"}`}
              >
                {s}
              </span>
              {i < STEPS.length - 1 && <span className="h-px flex-1 bg-line" />}
            </li>
          ))}
        </ol>

        <section className="rise card-sheen rounded-2xl border border-line p-6">
          {step === 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h1 className="font-display text-3xl">About you</h1>
                <div
                  className="flex rounded-full border border-line p-0.5 text-xs"
                  role="group"
                  aria-label="Units"
                >
                  {(["metric", "imperial"] as const).map((u) => (
                    <button
                      key={u}
                      onClick={() => switchUnits(u)}
                      className={`rounded-full px-3 py-1 ${units === u ? "bg-white/10 text-white" : "text-mute"}`}
                      aria-pressed={units === u}
                    >
                      {u === "metric" ? "cm / kg" : "in / lb"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Label text={`Height (${lengthLabel(units)})`}>
                  <input
                    className={field}
                    inputMode="decimal"
                    value={form.height}
                    onChange={(e) => set("height", e.target.value)}
                  />
                </Label>
                <Label text={`Weight (${weightLabel(units)})`}>
                  <input
                    className={field}
                    inputMode="decimal"
                    value={form.weight}
                    onChange={(e) => set("weight", e.target.value)}
                  />
                </Label>
                <Label text="Age">
                  <input
                    className={field}
                    inputMode="numeric"
                    value={form.age}
                    onChange={(e) => set("age", e.target.value)}
                  />
                </Label>
              </div>
              <Label text="Training experience">
                <select
                  className={field}
                  value={form.experience}
                  onChange={(e) => set("experience", e.target.value as Experience)}
                >
                  <option value="beginner">Beginner (under 1 year of consistent training)</option>
                  <option value="intermediate">Intermediate (1 to 3 years)</option>
                  <option value="advanced">Advanced (3+ years)</option>
                </select>
              </Label>
              <details className="rounded-lg border border-line p-3">
                <summary className="cursor-pointer text-sm">Body measurements (optional)</summary>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {(
                    [
                      ["waist", "Waist"],
                      ["hips", "Hips"],
                      ["chest", "Chest"],
                      ["arm", "Upper arm"],
                      ["thigh", "Thigh"],
                    ] as const
                  ).map(([k, label]) => (
                    <Label key={k} text={`${label} (${lengthLabel(units)})`}>
                      <input
                        className={field}
                        inputMode="decimal"
                        value={form[k]}
                        onChange={(e) => set(k, e.target.value)}
                      />
                    </Label>
                  ))}
                </div>
                <p className="mt-3 text-xs text-mute">
                  Stored only in this browser. Used for context and to track change over time.
                </p>
              </details>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h1 className="font-display text-3xl">Your goal</h1>
              <Label text="In your own words">
                <textarea
                  className={`${field} h-32 resize-y`}
                  placeholder="e.g. I want to build muscle, especially chest and arms, and I can train 4 days a week."
                  value={form.goalText}
                  onChange={(e) => set("goalText", e.target.value)}
                />
              </Label>
              <Label text="Injuries or areas to protect (optional)">
                <input
                  className={field}
                  placeholder="e.g. bad left knee, tight lower back"
                  value={form.limitations}
                  onChange={(e) => set("limitations", e.target.value)}
                />
              </Label>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h1 className="font-display text-3xl">Your equipment</h1>
              <p className="text-sm text-mute">
                Bodyweight exercises are always included. Tap everything you can use.
              </p>
              <div className="flex flex-wrap gap-2">
                {EQUIPMENT.map((eq) => {
                  const on = form.equipment.includes(eq);
                  return (
                    <button
                      key={eq}
                      aria-pressed={on}
                      onClick={() =>
                        set(
                          "equipment",
                          on ? form.equipment.filter((x) => x !== eq) : [...form.equipment, eq],
                        )
                      }
                      className={`rounded-full border px-4 py-2 text-sm transition ${on ? "border-ember bg-ember/15 text-ember" : "border-line text-mute hover:text-white"}`}
                    >
                      {EQUIPMENT_LABEL[eq]}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-mute">
                A bench is only needed for exercises that use it, and a barbell assumes a rack with
                safety bars.
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <h1 className="font-display text-3xl">Your schedule</h1>
              <Label text={`Days per week: ${form.days}`}>
                <input
                  type="range"
                  min={2}
                  max={6}
                  value={form.days}
                  onChange={(e) => set("days", Number(e.target.value))}
                  className="w-full accent-[#ff7a45]"
                />
              </Label>
              <Label text={`Minutes per session: ${form.minutes}`}>
                <input
                  type="range"
                  min={20}
                  max={90}
                  step={5}
                  value={form.minutes}
                  onChange={(e) => set("minutes", Number(e.target.value))}
                  className="w-full accent-[#ff7a45]"
                />
              </Label>
              <p className="text-xs text-mute">
                If your goal text names a number of days, that takes priority.
              </p>
            </div>
          )}

          {error && (
            <p className="mt-4 text-sm text-red-300" role="alert">
              {error}
            </p>
          )}

          <div className="mt-8 flex items-center justify-between">
            <button
              onClick={() =>
                step === 0 ? (saved ? setEditing(false) : undefined) : setStep(step - 1)
              }
              className={`rounded-lg px-4 py-2 text-sm text-mute hover:text-white ${step === 0 && !saved ? "invisible" : ""}`}
            >
              {step === 0 ? "Cancel" : "Back"}
            </button>
            {step < STEPS.length - 1 ? (
              <button
                onClick={next}
                className="rounded-full bg-white px-6 py-2.5 text-sm font-medium text-black hover:bg-stone-200"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={generate}
                disabled={busy}
                className="rounded-full bg-ember px-6 py-2.5 text-sm font-medium text-black hover:brightness-110 disabled:opacity-50"
              >
                {busy ? "Building…" : "Build my plan"}
              </button>
            )}
          </div>
        </section>
      </main>
    );
  }

  return plan && saved ? (
    <PlanView plan={plan} interpretation={saved.interpretation} onEdit={startEdit} />
  ) : null;
}

const GOAL_LABEL: Record<Plan["goal"], string> = {
  fat_loss: "Fat loss",
  muscle_gain: "Muscle gain",
  strength: "Strength",
  endurance: "Endurance",
  general: "General fitness",
};

function PlanView({
  plan,
  interpretation,
  onEdit,
}: {
  plan: Plan;
  interpretation: Interpretation;
  onEdit: () => void;
}) {
  return (
    <main className="mx-auto max-w-3xl px-5 pb-20">
      <header className="rise mb-8">
        <div className="no-print mb-3 flex items-center justify-between">
          <span className="rounded-full border border-ember/40 bg-ember/10 px-3 py-1 text-xs text-ember">
            {GOAL_LABEL[plan.goal]}
          </span>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              onClick={() => downloads.calendar(plan)}
              className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-white/5"
              title="Weekly recurring events for Google, Apple or Outlook calendar"
            >
              Calendar
            </button>
            <button
              onClick={() => downloads.markdown(plan)}
              className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-white/5"
            >
              Markdown
            </button>
            <button
              onClick={() => window.print()}
              className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-white/5"
            >
              Print
            </button>
            <button
              onClick={onEdit}
              className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-white/5"
            >
              Edit inputs
            </button>
          </div>
        </div>
        <h1 className="font-display text-4xl">Your {plan.days.length}-day plan</h1>
        <p className="mt-2 text-mute">{plan.summary}</p>
        <p className="mt-1 text-xs text-mute">
          Goal read by {interpretation.source === "claude" ? "Claude" : "the built-in parser"}.
        </p>

        <dl className="mt-5 flex flex-wrap gap-3 text-sm">
          <div className="card-sheen rounded-xl border border-line px-4 py-2">
            <dt className="text-xs text-mute">BMI</dt>
            <dd className="font-medium">{plan.metrics.bmi}</dd>
          </div>
          {plan.metrics.waistToHeight !== undefined && (
            <div className="card-sheen rounded-xl border border-line px-4 py-2">
              <dt className="text-xs text-mute">Waist to height</dt>
              <dd className="font-medium">{plan.metrics.waistToHeight}</dd>
            </div>
          )}
          {plan.metrics.waistToHip !== undefined && (
            <div className="card-sheen rounded-xl border border-line px-4 py-2">
              <dt className="text-xs text-mute">Waist to hip</dt>
              <dd className="font-medium">{plan.metrics.waistToHip}</dd>
            </div>
          )}
        </dl>
        <p className="mt-2 text-xs text-mute">
          These ratios are rough context only. They don&apos;t measure fitness or health on their
          own.
        </p>
      </header>

      <div className="space-y-3">
        {plan.days.map((day, i) => (
          <details
            key={`${day.name}-${i}`}
            open={i === 0}
            className="rise card-sheen rounded-2xl border border-line p-5"
          >
            <summary className="flex cursor-pointer items-center justify-between gap-4">
              <span className="flex items-center gap-4">
                <span className="grid h-11 w-11 place-items-center rounded-lg bg-ember/15 text-sm font-medium text-ember">
                  {day.weekday}
                </span>
                <span>
                  <span className="block font-medium">{day.name}</span>
                  <span className="block text-xs text-mute">{day.focus}</span>
                </span>
              </span>
              <span className="text-xs text-mute">~{day.estimatedMinutes} min</span>
            </summary>

            <ol className="mt-4 space-y-3">
              {day.exercises.map((x, j) => (
                <li key={x.exercise.id} className="flex gap-3">
                  <span className="mt-0.5 w-5 shrink-0 text-xs text-mute">{j + 1}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {x.exercise.name}
                      <span className="ml-2 font-normal text-mute">
                        {x.sets} × {x.reps} · rest {x.restSec}s
                      </span>
                    </p>
                    <p className="text-xs text-mute">{x.exercise.cue}</p>
                  </div>
                </li>
              ))}
            </ol>
            {day.finisher && (
              <p className="mt-4 rounded-lg border border-line p-3 text-sm text-mute">
                Finisher: {day.finisher}
              </p>
            )}
          </details>
        ))}
      </div>

      <section className="mt-8">
        <h2 className="mb-2 font-display text-xl">Notes</h2>
        <ul className="space-y-2 text-sm text-mute">
          {plan.notes.map((n) => (
            <li key={n} className="flex gap-2">
              <span className="text-ember">→</span>
              {n}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
