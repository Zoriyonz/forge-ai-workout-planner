import Link from "next/link";
import { Nav } from "@/components/Nav";

const features = [
  {
    title: "Built from your gear",
    body: "Tell Forge what you own, from nothing at all to a full rack. Every exercise in your plan is checked against that list.",
  },
  {
    title: "Your goals, in your words",
    body: "Write your goal the way you'd say it. Forge turns it into training focus, weekly volume and how many days to train.",
  },
  {
    title: "Private by design",
    body: "Measurements and progress photos stay in your browser. Photos are resized on your device and never uploaded.",
  },
];

const sample = [
  { day: "Mon", name: "Push", detail: "Dumbbell Bench Press · 3 × 8-12" },
  { day: "Tue", name: "Pull", detail: "Chin-Up · 3 × 8-12" },
  { day: "Thu", name: "Legs", detail: "Goblet Squat · 3 × 8-12" },
];

export default function Home() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-5xl px-5">
        <section className="grid items-center gap-12 py-16 lg:grid-cols-[1.2fr_1fr]">
          <div className="rise">
            <p className="mb-4 text-xs uppercase tracking-[0.25em] text-mute">AI workout planner</p>
            <h1 className="font-display text-5xl leading-[1.05] sm:text-6xl">
              <span className="text-gradient">A plan built</span>
              <br />
              around you.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-mute">
              Share your measurements, your goal and the equipment you actually have. Forge builds a
              week of training that fits your schedule, and tracks your progress privately.
            </p>
            <div className="mt-8 flex gap-3">
              <Link
                href="/build"
                className="rounded-full bg-ember px-6 py-3 text-sm font-medium text-black hover:brightness-110"
              >
                Build my plan
              </Link>
              <Link
                href="/progress"
                className="rounded-full border border-line px-6 py-3 text-sm hover:bg-white/5"
              >
                Track progress
              </Link>
            </div>
          </div>

          <div className="rise card-sheen rounded-2xl border border-line p-5" aria-hidden="true">
            <p className="mb-4 text-xs uppercase tracking-widest text-mute">This week</p>
            <div className="space-y-3">
              {sample.map((s) => (
                <div
                  key={s.day}
                  className="flex items-center gap-4 rounded-xl border border-line bg-black/20 p-3"
                >
                  <span className="grid h-11 w-11 place-items-center rounded-lg bg-ember/15 text-sm font-medium text-ember">
                    {s.day}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-xs text-mute">{s.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 pb-16 md:grid-cols-3">
          {features.map((f) => (
            <article key={f.title} className="card-sheen rounded-2xl border border-line p-6">
              <h2 className="font-display text-xl">{f.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-mute">{f.body}</p>
            </article>
          ))}
        </section>

        <footer className="border-t border-line py-8 text-sm text-mute">
          Forge gives general fitness guidance, not medical advice. If you have an injury or health
          condition, check with a clinician before starting a new program.
        </footer>
      </main>
    </>
  );
}
