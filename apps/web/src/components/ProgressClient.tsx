"use client";

import { useState } from "react";
import { resizeImage } from "@/lib/image";
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

interface Entry {
  id: string;
  date: string;
  weightKg?: number;
  waistCm?: number;
  chestCm?: number;
  hipsCm?: number;
  armCm?: number;
  thighCm?: number;
  photo?: string;
}

const field =
  "w-full rounded-lg border border-line bg-black/30 px-3 py-2 text-sm outline-none transition focus:border-ember/60 focus:ring-2 focus:ring-ember/20";

const today = () => new Date().toISOString().slice(0, 10);

function Sparkline({ values, label }: { values: number[]; label: string }) {
  if (values.length < 2)
    return (
      <p className="text-xs text-mute">
        Log at least two entries to see {label.toLowerCase()} over time.
      </p>
    );
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const w = 280;
  const h = 64;
  const pts = values
    .map((v, i) => `${(i / (values.length - 1)) * w},${h - 6 - ((v - min) / span) * (h - 12)}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-16 w-full" role="img" aria-label={`${label} trend`}>
      <polyline
        points={pts}
        fill="none"
        stroke="#ff7a45"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function delta(values: number[], unit: string): string | null {
  if (values.length < 2) return null;
  const d = round1((values[values.length - 1] ?? 0) - (values[0] ?? 0));
  return `${d > 0 ? "+" : ""}${d} ${unit} since first entry`;
}

export function ProgressClient() {
  const [entries, setEntries, ready] = usePersisted<Entry[]>("forge.progress.v1", []);
  const [units] = usePersisted<Units>("forge.units", "metric");
  const [date, setDate] = useState(today());
  const [vals, setVals] = useState({
    weight: "",
    waist: "",
    chest: "",
    hips: "",
    arm: "",
    thigh: "",
  });
  const [photo, setPhoto] = useState<string | undefined>();
  const [msg, setMsg] = useState<string | null>(null);

  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const weights = sorted.flatMap((e) => (e.weightKg ? [round1(fromKg(e.weightKg, units))] : []));
  const waists = sorted.flatMap((e) => (e.waistCm ? [round1(fromCm(e.waistCm, units))] : []));
  const withPhoto = sorted.filter((e) => e.photo);
  const first = withPhoto[0];
  const latest = withPhoto[withPhoto.length - 1];

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    try {
      setPhoto(await resizeImage(file));
      setMsg(null);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not use that photo.");
    }
  }

  function add() {
    const cm = (s: string) => {
      const n = num(s);
      return n ? Math.round(toCm(n, units) * 10) / 10 : undefined;
    };
    const w = num(vals.weight);
    const entry: Entry = {
      id: crypto.randomUUID(),
      date,
      weightKg: w ? Math.round(toKg(w, units) * 10) / 10 : undefined,
      waistCm: cm(vals.waist),
      chestCm: cm(vals.chest),
      hipsCm: cm(vals.hips),
      armCm: cm(vals.arm),
      thighCm: cm(vals.thigh),
      photo,
    };
    if (
      !entry.weightKg &&
      !entry.waistCm &&
      !entry.chestCm &&
      !entry.hipsCm &&
      !entry.armCm &&
      !entry.thighCm &&
      !photo
    ) {
      setMsg("Add at least one measurement or a photo.");
      return;
    }
    const ok = setEntries([...entries, entry]);
    if (!ok && photo) {
      // Browser storage is small; keep the numbers even if the photo doesn't fit.
      setEntries([...entries, { ...entry, photo: undefined }]);
      setMsg(
        "Saved your measurements, but the photo didn't fit in browser storage. Try deleting older photos.",
      );
    } else {
      setMsg(null);
    }
    setVals({ weight: "", waist: "", chest: "", hips: "", arm: "", thigh: "" });
    setPhoto(undefined);
  }

  function clearAll() {
    if (!window.confirm("Delete all Forge data (plan, measurements, photos) from this browser?"))
      return;
    for (const k of Object.keys(window.localStorage))
      if (k.startsWith("forge.")) window.localStorage.removeItem(k);
    window.location.reload();
  }

  if (!ready) return <div className="mx-auto h-96 max-w-3xl animate-pulse px-5" />;

  return (
    <main className="mx-auto max-w-3xl px-5 pb-20">
      <h1 className="font-display text-4xl">Progress</h1>
      <p className="mt-2 text-sm text-mute">
        Everything here is saved only in this browser. Photos are resized on your device, stripped
        of location data, and never uploaded.
      </p>

      <section className="card-sheen mt-6 rounded-2xl border border-line p-5">
        <h2 className="mb-4 text-sm font-medium">Log a check-in</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label className="text-xs text-mute">
            Date
            <input
              type="date"
              className={`${field} mt-1`}
              value={date}
              max={today()}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          {(
            [
              ["weight", `Weight (${weightLabel(units)})`],
              ["waist", `Waist (${lengthLabel(units)})`],
              ["chest", `Chest (${lengthLabel(units)})`],
              ["hips", `Hips (${lengthLabel(units)})`],
              ["arm", `Arm (${lengthLabel(units)})`],
              ["thigh", `Thigh (${lengthLabel(units)})`],
            ] as const
          ).map(([k, label]) => (
            <label key={k} className="text-xs text-mute">
              {label}
              <input
                className={`${field} mt-1`}
                inputMode="decimal"
                value={vals[k]}
                onChange={(e) => setVals((v) => ({ ...v, [k]: e.target.value }))}
              />
            </label>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="cursor-pointer rounded-lg border border-line px-3 py-2 text-sm hover:bg-white/5">
            {photo ? "Change photo" : "Add progress photo"}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => onPhoto(e.target.files?.[0])}
            />
          </label>
          {photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt="Selected progress photo preview"
              className="h-12 w-12 rounded-lg object-cover"
            />
          )}
          <button
            onClick={add}
            className="ml-auto rounded-full bg-ember px-5 py-2 text-sm font-medium text-black hover:brightness-110"
          >
            Save check-in
          </button>
        </div>
        {msg && (
          <p className="mt-3 text-sm text-amber-300" role="status">
            {msg}
          </p>
        )}
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="card-sheen rounded-2xl border border-line p-5">
          <p className="text-xs uppercase tracking-widest text-mute">
            Weight ({weightLabel(units)})
          </p>
          <Sparkline values={weights} label="Weight" />
          <p className="text-xs text-mute">{delta(weights, weightLabel(units)) ?? ""}</p>
        </div>
        <div className="card-sheen rounded-2xl border border-line p-5">
          <p className="text-xs uppercase tracking-widest text-mute">
            Waist ({lengthLabel(units)})
          </p>
          <Sparkline values={waists} label="Waist" />
          <p className="text-xs text-mute">{delta(waists, lengthLabel(units)) ?? ""}</p>
        </div>
      </section>

      {first && latest && first.id !== latest.id && (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-medium">First vs latest</h2>
          <div className="grid grid-cols-2 gap-3">
            {[first, latest].map((e, i) => (
              <figure key={e.id} className="overflow-hidden rounded-2xl border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={e.photo}
                  alt={`${i === 0 ? "First" : "Latest"} progress photo from ${e.date}`}
                  className="aspect-[3/4] w-full object-cover"
                />
                <figcaption className="p-2 text-center text-xs text-mute">
                  {i === 0 ? "First" : "Latest"} · {e.date}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-medium">History</h2>
        {sorted.length === 0 ? (
          <p className="text-sm text-mute">No check-ins yet.</p>
        ) : (
          <ul className="space-y-2">
            {[...sorted].reverse().map((e) => (
              <li
                key={e.id}
                className="card-sheen flex items-center gap-3 rounded-xl border border-line p-3 text-sm"
              >
                {e.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={e.photo} alt="" className="h-10 w-10 rounded-lg object-cover" />
                ) : (
                  <span className="h-10 w-10 rounded-lg bg-white/5" />
                )}
                <span className="flex-1">
                  <span className="block font-medium">{e.date}</span>
                  <span className="block text-xs text-mute">
                    {[
                      e.weightKg && `${round1(fromKg(e.weightKg, units))} ${weightLabel(units)}`,
                      e.waistCm && `waist ${round1(fromCm(e.waistCm, units))}`,
                      e.chestCm && `chest ${round1(fromCm(e.chestCm, units))}`,
                      e.hipsCm && `hips ${round1(fromCm(e.hipsCm, units))}`,
                      e.armCm && `arm ${round1(fromCm(e.armCm, units))}`,
                      e.thighCm && `thigh ${round1(fromCm(e.thighCm, units))}`,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Photo only"}
                  </span>
                </span>
                <button
                  onClick={() => setEntries(entries.filter((x) => x.id !== e.id))}
                  className="text-xs text-red-300/80 hover:text-red-300"
                  aria-label={`Delete check-in from ${e.date}`}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-10 border-t border-line pt-6">
        <button onClick={clearAll} className="text-sm text-red-300/80 hover:text-red-300">
          Delete all my data from this browser
        </button>
      </div>
    </main>
  );
}
