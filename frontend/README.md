# Underwriting Lab · frontend

The Next.js app for the underwriting training platform. Setup, tests and an overview are in the [root README](../README.md). This file is a short reference for working inside `frontend/`.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on http://localhost:3000 |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | ESLint (Next.js core-web-vitals + TypeScript rules, React Compiler checks) |
| `npm run typecheck` | Generates route types, then `tsc --noEmit` |
| `npm test` | Vitest unit tests |
| `npm run e2e` | Starts the backend with Docker, installs Chromium, runs every Playwright test |
| `npm run test:e2e:live` / `test:e2e:mocked` | One Playwright project (the app server is started for you) |
| `npm run e2e:report` | Opens the last HTML report |
| `npm run fixtures:capture` | Re-records `e2e/fixtures/api/*.json` from a freshly reset backend |
| `npm run screenshots -- --pages "/,/properties/41234567" --widths 1440,390 --themes light,dark` | Full-page screenshots for design review |

## Environment

| Variable | Default | Used by |
|---|---|---|
| `API_BASE_URL` | `http://localhost:8000` | The `/api/backend` proxy, read at request time, and the Playwright helpers |
| `API_PORT` | `8000` | `npm run e2e`, when the backend is published on another port |
| `E2E_PORT` | `3100` | Port of the app server Playwright starts |
| `E2E_RESET_COMMAND` | `docker compose … exec -T api python -m scripts.seed --reset` | How the live tests reset the database |
| `E2E_SKIP_RESET` | unset | Set to `1` to skip resets. Tests are then no longer deterministic. |
| `E2E_DEMO_FAILURE` | unset | Set to `1` to run the deliberately failing demo test |

## Where things live

- `src/lib/underwriting/fields.ts` is the single registry of inputs and their rules. Inline errors, the review checklist and the stepper counts all read from it.
- `src/lib/underwriting/calc.ts` is the live-preview port of the backend calculator, with the same rounding.
- `src/lib/underwriting/mappers.ts` converts between the form (percent as 0–100) and the API (fractions). It only sends sections that are valid.
- `src/features/workspace/use-autosave.ts` is the debounced, non-overlapping autosave.
- `src/app/api/backend/[...path]/route.ts` is the same-origin proxy to FastAPI.
