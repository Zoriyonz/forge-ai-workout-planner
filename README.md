# Forge

**A workout plan built around your body, your goals and the gear you actually own.**

[![CI](https://github.com/Zoriyonz/forge-ai-workout-planner/actions/workflows/ci.yml/badge.svg)](https://github.com/Zoriyonz/forge-ai-workout-planner/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs)
![Turborepo](https://img.shields.io/badge/Turborepo-monorepo-ef4444?logo=turborepo&logoColor=white)
![Node](https://img.shields.io/badge/node-%E2%89%A5%2020-339933?logo=nodedotjs&logoColor=white)
![Status](https://img.shields.io/badge/status-prototype-orange)

Enter your measurements, describe your goal in plain English, and pick the equipment you have. Forge builds a weekly plan that only uses what you own, then helps you track progress privately in your browser. No account, and it works with no API key.

## Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [How the plan is built](#how-the-plan-is-built)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [Scripts](#scripts)
- [Testing and quality gates](#testing-and-quality-gates)
- [Privacy and security](#privacy-and-security)
- [Design decisions](#design-decisions)
- [Limitations](#limitations)
- [Roadmap](#roadmap)
- [License](#license)

## Overview

Most "AI workout" apps let a language model write the whole program. Models are good at reading messy human goals and unreliable at respecting hard constraints, so they will happily put a barbell squat in a bodyweight-only plan. Forge splits the job:

- A **language model (optional) reads the goal** and returns a small structured object: goal type, muscles to emphasise and days per week.
- A **deterministic planner builds the workouts** from a curated exercise library, filtered by your equipment, experience and limitations.

So an invalid or hallucinated model response can never put equipment you do not own into your plan, and the whole app runs offline with a built-in keyword parser when no key is set.

## Features

- **Equipment-aware planning.** Every exercise is checked against the gear you selected, down to bodyweight only.
- **Goals in your own words.** "Build muscle, especially chest and arms, 4 days a week" becomes a goal, extra emphasis and a training split.
- **Fits your schedule.** 2 to 6 days a week and 20 to 90 minutes per session, with a time budget the planner enforces.
- **Injury-aware.** Mention a sore knee, shoulder, back, wrist or hip and exercises that commonly stress that area are left out.
- **Progress tracking.** Log weight and measurements, see trends, and compare first against latest photos.
- **Private by design.** Measurements and photos never leave the browser. Photos are resized on the device and stripped of EXIF location data.
- **Print-ready plan.**

## Architecture

```mermaid
flowchart LR
    subgraph Browser
        UI[apps/web<br/>Next.js UI] --> P[packages/planner<br/>deterministic engine]
        UI --> LS[(localStorage<br/>profile, logs, photos)]
    end
    UI -->|goal text only| API[POST /api/interpret]
    API --> I{ANTHROPIC_API_KEY?}
    I -->|yes| C[Claude<br/>structured goal]
    I -->|no or failure| K[Offline keyword parser]
    C -->|validated| P
    K --> P
    P --> Plan[Weekly plan]
```

```
forge/
├── apps/web                  Next.js 16 (App Router), React 19, Tailwind v4
└── packages/planner          Framework-free TypeScript planning engine
```

`packages/planner` has no framework dependency, so it can be tested in isolation and reused (for example by a mobile app or a CLI).

## How the plan is built

1. **`interpretGoal`** turns free text into `{ goal, emphasis, daysPerWeek, summary }`. With an `ANTHROPIC_API_KEY`, Claude does this and its output is strictly validated (goal must be one of five values, emphasis must be known muscles, days must be 2 to 6). Any failure, including a network error, falls back to the offline keyword parser, so the app always works.
2. **`generatePlan`** is deterministic. It filters a curated library of 65 exercises by equipment, experience level and limitations, fills a split template for the chosen number of days, applies sets and reps for the goal, adds a finisher for fat loss, and trims each session to the time budget.
3. **`computeMetrics`** calculates BMI and waist ratios for context only.

The same input always gives the same plan.

## Tech stack

| Area      | Choice                                                  |
| --------- | ------------------------------------------------------- |
| Framework | Next.js 16 (App Router), React 19                       |
| Language  | TypeScript 5 in strict mode                             |
| Styling   | Tailwind CSS 4                                          |
| Monorepo  | pnpm workspaces and Turborepo                           |
| AI        | Anthropic Messages API (optional), plain `fetch`        |
| Testing   | Vitest                                                  |
| Quality   | ESLint (`eslint-config-next`), Prettier, GitHub Actions |
| Packages  | pnpm 10, Node 20 or newer (`.nvmrc` pins 22)            |

## Project structure

```
forge/
├── apps/web/
│   └── src/
│       ├── app/                 Pages: /, /build, /progress, and POST /api/interpret
│       ├── components/          BuildClient, ProgressClient, Nav
│       └── lib/                 storage (SSR-safe localStorage), image (resize, strip EXIF), units
├── packages/planner/
│   └── src/
│       ├── exercises.ts         The exercise library
│       ├── goals.ts             Offline goal and limitation parser
│       ├── ai.ts                Claude interpretation with validation and fallback
│       ├── plan.ts              Deterministic plan generator
│       ├── metrics.ts           BMI and waist ratios
│       ├── types.ts             Shared types
│       └── planner.test.ts      20 unit tests
├── .github/workflows/ci.yml     Format, lint, typecheck, test, build
├── turbo.json, pnpm-workspace.yaml, tsconfig.base.json
└── .editorconfig, .prettierrc.json, .nvmrc, LICENSE
```

## Getting started

Requires Node 20 or newer and [pnpm](https://pnpm.io) 10.

```bash
git clone https://github.com/Zoriyonz/forge-ai-workout-planner.git
cd forge-ai-workout-planner
pnpm install
pnpm dev                       # http://localhost:3000
```

### Optional: Claude-powered goal reading

```bash
cp apps/web/.env.example apps/web/.env.local
# then set ANTHROPIC_API_KEY in apps/web/.env.local
```

## Configuration

| Variable            | Required | Purpose                                                                |
| ------------------- | -------- | ---------------------------------------------------------------------- |
| `ANTHROPIC_API_KEY` | No       | Lets Claude read the goal text. Without it the offline parser is used. |
| `ANTHROPIC_MODEL`   | No       | Overrides the default model.                                           |

## Scripts

Run from the repository root.

| Command             | What it does                                   |
| ------------------- | ---------------------------------------------- |
| `pnpm dev`          | Start the web app                              |
| `pnpm build`        | Build everything through Turborepo             |
| `pnpm lint`         | ESLint                                         |
| `pnpm typecheck`    | `tsc --noEmit` in every package                |
| `pnpm test`         | Planner unit tests                             |
| `pnpm format`       | Format everything with Prettier                |
| `pnpm format:check` | Fail if anything is not formatted (used in CI) |

## Testing and quality gates

The planner has 20 unit tests that run offline. They cover goal parsing, limitation mapping and the plan's invariants: only equipment you own is used, bodyweight-only plans never need equipment, limitations remove conflicting exercises, sessions stay within the time budget, no exercise repeats in a day, timed holds are prescribed in seconds, beginners do not get the hardest movements, and the output is deterministic. They also cover the AI path: valid model output is accepted, invalid output falls back, and a failed request falls back.

CI runs `format:check`, `lint`, `typecheck`, `test` and `build` on every push and pull request.

## Privacy and security

| Data                         | Where it goes                                                          |
| ---------------------------- | ---------------------------------------------------------------------- |
| Goal text                    | Sent to `/api/interpret`, and to Anthropic only if you configure a key |
| Height, weight, measurements | Stay in the browser                                                    |
| Progress photos              | Stay in the browser; never analysed or uploaded                        |

- The API route accepts only the goal text, rejects malformed JSON and caps the goal at 2,000 characters.
- The API key is read only on the server.
- Forge deliberately does not estimate body composition from photos. That cannot be done reliably and would be misleading.

## Design decisions

- **The model never writes the workouts.** It outputs a validated, bounded object and the planner does the rest, so constraints like equipment always hold.
- **Offline first.** A keyword parser means the demo works with zero configuration, and the AI is an enhancement rather than a dependency.
- **A framework-free engine package.** The planner imports nothing from React or Next.js.
- **Local-first data.** Storage sits behind a small hook, which is the seam a future sync backend would use.

## Limitations

- **General guidance, not medical advice.** The BMI and waist ratios are rough context, not a measure of health. Anyone with an injury or medical condition should consult a clinician first.
- **Data lives in one browser.** Clearing site data or switching devices loses it until sync exists.
- **No rate limiting** on `/api/interpret`. With a key configured, a public deployment would need one.
- **The exercise library is curated, not exhaustive** (65 exercises), and plans do not yet adapt week to week.

## Roadmap

- Workout logging with automatic load progression
- Exercise demo media
- Sync across devices behind the same storage interface

## License

[MIT](LICENSE) © 2026 Zoriyon Zion
