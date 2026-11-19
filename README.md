# Forge

**A workout plan built around your body, goals and gear.** Enter your measurements, describe your goal in plain English, and pick the equipment you actually have. Forge builds a weekly plan that only uses what you own, then helps you track progress privately in your browser.

## Features

- **Equipment-aware planning**: every exercise is checked against the gear you selected, down to bodyweight only
- **Goals in your own words**: "build muscle, especially chest and arms, 4 days a week" becomes a goal, extra emphasis and a training split
- **Fits your schedule**: 2 to 6 days a week, 20 to 90 minutes a session, with a time budget the planner enforces
- **Injury-aware**: mention a sore knee or back and exercises that commonly stress that area are left out
- **Progress tracking**: log weight and measurements, see trends, and compare first vs latest photos
- **Private by design**: measurements and photos never leave the browser; photos are resized on-device and stripped of EXIF location data
- **Print-ready** plan

## Architecture

```
forge/
├── apps/web              Next.js 15 (App Router), React 19, Tailwind v4
└── packages/planner      Framework-free TypeScript planning engine
```

The key design decision: **the model never writes the workouts.** An LLM is good at reading messy human goals but unreliable at respecting constraints, so the work is split.

1. `interpretGoal` reads the free-text goal and returns a small structured object (goal type, emphasis, days per week). With an `ANTHROPIC_API_KEY`, Claude does this. Its output is validated, and any failure falls back to a keyword parser, so the app works with no key.
2. `generatePlan` is deterministic. It filters a curated exercise library by equipment, experience and limitations, fills a split template, applies sets and reps for the goal, and trims to the time budget.

So an invalid or hallucinated model response can never put a barbell in a bodyweight-only plan.

### What is and isn't sent to a server

| Data | Where it goes |
| --- | --- |
| Goal text | Sent to `/api/interpret`, and to Anthropic only if you configure a key |
| Height, weight, measurements | Stay in the browser |
| Progress photos | Stay in the browser; never analysed or uploaded |

Forge deliberately does **not** estimate body composition from photos. That can't be done reliably and would be misleading.

## Getting started

Requires Node 20+ and pnpm.

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm test       # planner unit tests
pnpm typecheck
pnpm build
```

### Optional: Claude-powered goal reading

```bash
cp apps/web/.env.example apps/web/.env.local
# set ANTHROPIC_API_KEY in .env.local
```

## Limitations

Forge gives general fitness guidance, not medical advice. The BMI and waist ratios shown are rough context, not a measure of health. Anyone with an injury or medical condition should consult a clinician first.

## Roadmap

- Workout logging with automatic load progression
- Exercise demo media
- Sync across devices behind the same storage interface

## License

MIT
