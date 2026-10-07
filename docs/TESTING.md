# Testing

## Run it

From `frontend/`:

```bash
npm run e2e                 # unattended: docker compose up --wait, install Chromium, run all Playwright tests
npm run test:e2e:mocked     # Playwright with recorded API fixtures only; no Docker
npm run test:e2e:live       # Playwright against an already-running backend
npm test                    # Vitest unit tests
npm run e2e:report          # HTML report of the last run
```

`npm run e2e` exits non-zero when anything fails, so it works as-is in CI. If the backend uses another port, run `API_PORT=8001 npm run e2e`. Any extra arguments go to `playwright test`, for example `npm run e2e -- --grep "Ski View"`.

Playwright starts its own **production build** of the app on port 3100. That is what a reviewer would run, and it is free of dev-mode overlays and double renders.

## What the suite covers

Results from the last full run:

```
Running 44 tests using 1 worker
  1 skipped      (the opt-in demo failure)
  43 passed (1.5m)
```

### Live project (real FastAPI + Postgres)

| Spec | Cases | Covers |
|---|---|---|
| `live/primary-path.spec.ts` | 1 | The **primary path**, entirely in the UI. Dashboard → property brief → financials (purchase, two setup costs, two expenses, default taxes) → analysis → tags → review → submit → results → dashboard updated. It checks the derived numbers on the way: $212,250 out of pocket, $77,692 free cash flow, 36.6% cash-on-cash, and "Matches API". |
| `live/scoring-matrix.spec.ts` | 22 | **Data-driven evaluation** for every seeded property in every band, plus the four boundary cases (see below). Each case asserts the score, the rating, the deviation sentence and the property's Best range. |
| `live/validation.spec.ts` | 5 | The missing-field checklist and blocked submit. *Fix* focuses the field. Invalid values (120%, `abc`, 2.5 years, negative revenue, a nameless expense row) show inline errors **and are never sent to the API**. A $0 out-of-pocket deal is blocked. Inverted scenarios warn but still allow submission. |
| `live/persistence.spec.ts` | 5 | Autosave puts **`"0.0699"` on the wire for 6.99%**. Values survive a reload. The live preview equals the API's cash-on-cash. A draft can be resumed from the dashboard. A submitted attempt is locked. The reference underwriting is never shown. |
| `live/leaderboard.spec.ts` | 1 | Three attempts are ranked by closeness, not submission order. The current attempt is highlighted with "2nd of 3", and the rows link to each other. |

### Mocked project (no backend)

| Spec | Covers |
|---|---|
| `mocked/resilience.spec.ts` (8) | A failed autosave shows *Couldn't save* and *Retry* recovers. A failed submission keeps the work. A 422 from the API lands on the right field. An empty training set shows an empty state. An API outage shows an error and recovers on retry. The reference guard holds. Results render from recorded data. An unknown result shows not-found. |
| `mocked/demo-failure.spec.ts` | Deliberately failing and opt-in (`E2E_DEMO_FAILURE=1`), to demonstrate the failure artifacts. |

### Unit tests (Vitest, 45)

- `calc.test.ts` runs the live-preview calculator against **the backend's own test vectors** from `backend/tests/test_underwriting_calculator.py`, and against numbers captured from a real API response. It also covers the edge cases: 0% interest, an all-cash purchase, and incomplete inputs.
- `mappers.test.ts` covers number parsing, percent ↔ fraction conversion without float noise, prefills, valid-sections-only payloads, empty versus half-filled rows, and mapping API error paths back to form fields.
- `review-and-scoring.test.ts` covers the review model, the deviation sentences, the brief's band table, and leaderboard ranking, ties included.
- `fixtures.test.ts` parses every recorded API fixture with the app's Zod schemas, so the mocks can't silently drift from the contract.

## Fixture and case-generation strategy

**Live data is deterministic by construction.** The backend seeds the same 4 markets, 6 properties and 6 reference underwritings for everyone. Before the live project runs, a setup project checks the API is reachable (failing with a "start the backend" message if not) and resets it:

```
docker compose -f ../backend/docker-compose.yml exec -T api python -m scripts.seed --reset
```

**Each live spec file also resets in `beforeAll`**, so no file depends on another's leftovers or on run order. Tests run with one worker because they share one database.

**State that isn't under test is arranged through the API.** Each scoring case creates a draft and fills its financials with one `PUT` (`e2e/support/api.ts`). The UI time goes into what's being tested: entering a forecast, submitting, and reading the grade. The primary path is the only test that fills everything by hand.

**Scoring cases are generated from the brief's table, not from app code.** `e2e/fixtures/score-cases.ts` copies the brief's table literally: each property's reference Mid and its Best and Medium dollar ranges. From it, `buildScoreCases()` generates:

- three forecasts per property: reference × 1.04 (Best), × 0.82 (Medium) and × 1.5 (Low), giving 18 cases;
- four boundary cases that prove *"both limits count in the trainee's favour"*:

| Case | Mid | Expected |
|---|---|---|
| Ski View, exactly +10% | $137,500 | Best · 100 |
| Ski View, +10% plus $1 | $137,501 | Medium · 70 |
| Broken Bow, exactly −25% | $72,000 | Medium · 70 |
| Broken Bow, −25% minus $1 | $71,999 | Low · 40 |

The expected rating comes from the literal ranges (inclusive), so the test is an independent check on the app and the API. A guard asserts the generated set still covers 7 Best, 8 Medium and 7 Low.

**Mocks are recordings, not hand-written JSON.** `npm run fixtures:capture` records real responses (dashboard, property, market, draft, saved draft, submit result, submissions, reference) into `e2e/fixtures/api/`. A unit test validates them against the schemas. `e2e/support/mock-api.ts` serves them by `METHOD /path`, and anything unmocked returns 404 so a missing mock fails loudly.

**Failure injection depends on state, not call order.** For example, "the API is down until the test flips a flag". That stays correct no matter how many requests the page makes or how many times the client retries.

**External dependencies are stubbed.** Listing photos come from picsum.photos, so the suite serves a local SVG for them. A network blip can't fail a run.

## When a test fails

Playwright keeps these for every failed test, under `frontend/test-results/<test-name>/`:

| Artifact | What it's for |
|---|---|
| `trace.zip` | Step-by-step replay: DOM snapshots, actions, console, network. `npx playwright show-trace <zip>` |
| `test-failed-1.png` | Screenshot at the moment of failure |
| `video.webm` | Video of the whole test |
| `api-calls.json` | **Our own fixture.** Every call the page made to the API, with request body, status, response body and timing. |
| `error-context.md` | The failing assertion plus an accessibility snapshot of the page |

The HTML report (`npm run e2e:report`) shows all of them per test. A JUnit file is written to `test-results/junit.xml` for CI.

### A real example

[`docs/failure-example/`](failure-example/) holds the artifacts of an actual failing run: the opt-in demo test, which expects a score of 70 on a submission that scored 100.

```bash
E2E_DEMO_FAILURE=1 npx playwright test --project=mocked demo-failure
```

- [`screenshot.png`](failure-example/screenshot.png) shows the page at failure: a score of 100, Best.
- [`error-context.md`](failure-example/error-context.md) shows the assertion `expected "70", received "100"` and the page snapshot.
- [`api-calls.json`](failure-example/api-calls.json) shows that `GET /submissions/1` returned `"rating": "best", "accuracy": "100.00"`.
- [`trace.zip`](failure-example/trace.zip) can be opened from the `frontend` folder with `npx playwright show-trace ../docs/failure-example/trace.zip`.

### How I debug one

1. **Read the assertion** in the terminal or `error-context.md`. It usually says expected versus received.
2. **Check `api-calls.json`.** Did the API return what the test assumed? That one file tells a data or contract problem apart from a UI one. Here the API said `best/100`, so the test's expectation is wrong, not the app.
3. **If the API looks right, open the trace** and step to the failing action. Check the DOM snapshot and the console at that moment.
4. **Reproduce visually:** `npx playwright test <file> --headed --debug`, or `--ui` for watch mode.
5. **For a live-only failure**, rerun against a clean backend (`docker compose exec -T api python -m scripts.seed --reset`). Then compare with the mocked project to tell whether the backend or the frontend changed.

## CI

`.github/workflows/e2e.yml` runs lint, typecheck and unit tests, then `npm run e2e`, which uses Docker on the runner. It uploads the HTML report and `test-results/` as artifacts, so a failed CI run comes with its traces. With `CI` set, Playwright forbids `.only` and retries a failed test once.
