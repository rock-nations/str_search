# Design explanation

This page explains how the workflow is sequenced, why the interface is organised the way it is, and the engineering choices behind it.

## The idea everything hangs on

The brief reduces underwriting to one chain: **what it costs → what it earns → how good the return is.** Total out of pocket, then annual free cash flow, then cash-on-cash. Every input feeds one link of that chain. So the interface's main job is to make the chain visible and to show, at every moment, how an input moves it.

Three decisions follow from that:

1. **The workspace steps follow the chain.** Financials (what it costs) comes first, then Analysis (what it earns, and the returns that follow). Deal tags and Review come last.
2. **A deal summary panel is always on screen.** It shows the three links as a numbered vertical flow: out of pocket, Mid free cash flow, then Mid cash-on-cash with Low and High beside it. Each link explains its own composition ("Down $135,000 · Closing $20,250 · Setup $57,000", "NOI $120,760 − debt $43,068"). Typing a down payment or an expense visibly changes it, which teaches the model rather than just collecting numbers. On narrow screens it collapses into a bottom bar that opens as a sheet.
3. **Derived figures sit next to the inputs that produce them.** The Purchase card ends with down payment, loan, closing costs and monthly mortgage. Taxes end with the cost-segregation chain (basis → short-life assets → year-1 depreciation → tax savings). Operating expenses show monthly and annual totals.

## The workflow, step by step

| Step | Screen | Why it exists |
|---|---|---|
| 1 | **Dashboard** | Answers "where am I and what next?" It has a progress tile, average score, drafts in progress and best-rated cases. A single **Next up / Continue where you left off** call to action is the only primary button on the page. Case cards show status, latest and best score, and a context action: *Review & start*, *Resume draft*, or *View results* with *Try again*. A recent attempts table shows previous scores. |
| 2 | **Property brief** | The brief asks trainees to review the property and market before underwriting. The page shows the listing facts and the market description. It also shows what the task is, that only the Mid forecast is graded and how, and that the analyst's version stays hidden until submission. Setting expectations here removes surprises later. |
| 3 | **Workspace** | Four steps in a left rail: Financials, Analysis, Deal tags, Review & submit. Navigation is **non-linear**, because analysts jump around. Each step shows its own state: *4 to complete*, *2 to fix* (red only for invalid values), *Complete* or *Optional*. The step lives in the URL (`?step=analysis`), so reloads, links and the back button work. |
| 4 | **Review & submit** | A readiness banner and a checklist grouped by section. Each open item has a **Fix** link that switches step, scrolls to the field and focuses it. Non-blocking warnings ("Low forecast is above Mid", "no operating expenses") are separate from blocking errors. A key-assumptions summary and the graded Mid forecast make the final check quick. |
| 5 | **Results** | Covered in its own section below. |
| 6 | **Team** | Where every trainee stands and what each should practise. Covered in its own section below. |

Submitting asks for confirmation. The dialog shows the Low, Mid and High forecasts with Mid highlighted, and says what happens next: the attempt locks and the analyst's underwriting is revealed.

## Making the grade easy to understand

The brief asks to "explain the score, not just display it". The results page does that in layers:

- **A headline sentence.** "Your Mid forecast of $130,000 was 4.0% above the analyst's $125,000." It comes with a score dial (100 / 70 / 40) and a rating badge. The badge pairs colour with an icon and a word, so the rating never depends on colour alone.
- **Your forecast, the analyst's, and the signed difference** side by side.
- **A band scale.** Best, Medium and Low are drawn as zones around the analyst's number, with dollar ticks at ±10% and ±25% and a marker for the trainee. The scale zooms out for big misses, and the marker clamps with an arrow when it is off the scale.
- **A next-band hint.** "A Mid forecast between $112,500 – $137,500 would have scored Best."
- **Score bands for this property.** The dollar range for each band, with the trainee's band highlighted.
- **A leaderboard with two tabs.** *Team* ranks every trainee on this property by their latest attempt ("You placed 3rd of 7 trainees"), with retakes marked. *Your attempts* ranks your own attempts on the property by closeness and links to each one.
- **Your underwriting vs the analyst's.** Revealed only now. It compares inputs and outputs with signed differences, with Mid marked *Graded*. Above the table, a short list of the **biggest differences in your inputs** turns the table into a lesson ("Your monthly operating expenses were 58% lower than the analyst's").

## The team view

The hiring team asked for a mocked, per-trainee leaderboard with a team component. Its purpose: lead analysts should see who is doing best and what kind of training each person needs, for example "construction estimates are good but revenue forecasts are off", or "struggles with properties in certain markets".

- **Who is real.** The API has no users. Every attempt submitted through it is "You", and six teammates are fixed demo data. A "Teammates are demo data" badge says so on every team screen. Each teammate shows one pattern a lead would want to spot:
  - strong all-round;
  - setup budgets far below the analyst's;
  - weak in two markets;
  - overestimates revenue;
  - running costs far below the analyst's;
  - a high score built on retakes.
- **One rule for the score.** The team average uses each trainee's latest attempt per property, the same rule as the API's dashboard average, which the hiring team confirmed. Ties go to whoever has completed more cases.
- **The Team page** answers three questions, in order:
  - Where do I stand? A "Your standing" card.
  - Who is doing best? A leaderboard with average, first try, cases, Best-rated count and the main coaching focus.
  - What does each person need? A skills grid. It shows how far revenue, setup-budget and running-cost estimates land from the analyst's, and the average score in each market. It uses the same green, amber and red bands as the score, so "within 10%" means the same thing everywhere.
- **Coaching notes are plain sentences.** "Setup and renovation budgets run 35% below the analyst's. Review furniture, amenity and renovation pricing." They come from simple, unit-tested thresholds in `src/lib/team/stats.ts`. A market is only flagged when it is clearly worse than the trainee's other properties, so a generally weak trainee isn't flagged for every market.
- **Retake gaming stays visible.** The hiring team agreed attempts shouldn't be gameable. Because the analyst's numbers are revealed after submitting, the team view shows a first-try average next to every score. It flags "relies on retakes" when retakes lift the average by 20 points or more.
- **Your skills use your real numbers.** Your setup spend and monthly costs are compared with the analyst's underwriting, which the app fetches only for properties you've already submitted. The demo data is stored as percentages, never dollars, so nothing on the Team page reveals an analyst's number early.
- **Each trainee has a profile.** It shows their average, first try, cases, a bar for each skill, market results, coaching notes, and every attempt. Your own attempts link to their results pages.

## Numbers that are easy to read

- Every figure uses tabular numerals, so columns of numbers line up. Table figures are right-aligned. Negatives use a true minus sign (−$43,068), and losses are red.
- Formats are consistent: whole dollars everywhere, percentages to one decimal, and small rates (6.99%) to two.
- The Mid column is tinted wherever scenarios appear, because Mid is what's graded.
- An **ⓘ popover** on key figures shows the formula and the calculation with the trainee's own numbers: `$77,692 ÷ $212,250 = 36.6%`. The brief suggests showing how a number was reached, and this does it without cluttering the page.
- Money inputs take `$` prefixes and accept `$650,000` pasted in. They add thousands separators on blur, but never while typing, so the cursor doesn't jump.

## Forms that hold up when people make mistakes

- **One field registry** (`lib/underwriting/fields.ts`) defines each input's label, units, range and section. Inline errors, the review checklist, the stepper counts and the payload builder all read from it, so they can never disagree.
- **Missing and invalid are different states.** Missing is neutral: "4 to complete". Invalid is red, with a specific message: "Down payment must be between 0% and 100%", "Loan term must be a whole number of years".
- Errors appear **on blur, not while typing**. Submitting, or pressing *Fix*, validates everything.
- **Cross-field rules** mirror the API. A deal with $0 out of pocket gets a card-level alert, because the API would reject it with a 422. Line items are validated per row: an amount without a name is flagged, while empty rows are simply ignored.
- **Soft warnings never block.** Inverted scenarios, unusually high rates or closing costs, missing OPEX, negative Mid cash flow and contradictory tags are all things a reviewer would question, but they can be right.
- **Server errors land on fields.** A 422 from FastAPI (`loc: ["body", "purchase_details", "interest_rate"]`) is mapped back to the input it belongs to.

## Saving

- **Autosave**, debounced by 800 ms, never overlapping, and never sending an identical payload twice. It flushes on step changes and warns before closing the tab with unsaved work.
- **Only valid sections are sent.** The API rejects the whole PUT if any section in it is invalid. One half-typed field must not stop the rest of the work from saving. Sections the trainee has touched but can't save yet show as *"2 not saved yet"* next to the save status, with a tooltip naming them.
- **Unit conversion happens once, at the boundary.** The form works in percent as 0–100, and the API in fractions (6.99 becomes `"0.0699"`). A test checks the exact value on the wire.
- A failed save shows **Couldn't save · Retry**, and the work stays in the form.

## Trusting the live numbers

The returns update as the trainee types, which needs a client-side calculation. `lib/underwriting/calc.ts` ports the backend calculator, including its half-away-from-zero rounding to cents. Unit tests run it against the backend's own test vectors and a real API response. In the UI, the deal summary shows **Matches API** once the saved underwriting comes back with the same total out of pocket and cash-on-cash. Every figure on screen is either confirmed by the API or labelled *Live preview*.

## Protecting the answer key

The API serves reference underwritings through the same endpoint as drafts. The app never requests one until a graded submission exists, using `submission.reference_underwriting_id`. If someone opens `/underwritings/1` directly, the workspace renders a guard screen with no figures. A test covers this.

## Visual system

- A calm, neutral base with one indigo accent for actions and focus. Semantic colours have fixed meanings: emerald for Best and positive cash flow, amber for Medium and warnings, rose for Low, errors and losses. Each always comes with an icon or text.
- Design tokens live in `globals.css` as CSS variables for light and dark themes. A header toggle switches themes, and the server-rendered HTML is identical in both, so there is no hydration mismatch.
- Geist Sans, a 4 px spacing scale, 12 px card radii, hairline rings and very light shadows. Large type is reserved for the numbers that matter.
- Every loading, empty and error state is designed. Skeletons match the final layout. Error states say what happened and offer **Try again**. When the API is down, the proxy returns a clear message rather than a fetch failure.
- Accessibility: labelled inputs, `aria-invalid` and `aria-describedby`, an `aria-live` save status, focus management for *Fix* links, keyboard-operable steps and switches, and reduced-motion support.

## Architecture

```
app/ (routes, server components)  →  features/<screen>/ (client components)
                                          ↓ hooks
                                     lib/api (TanStack Query + Zod-validated fetch)
                                          ↓ /api/backend/* (route handler proxy)
                                     FastAPI
lib/underwriting (pure, unit-tested): fields · calc · form-schema · mappers · review
lib/team (pure, unit-tested): demo teammates · team statistics · coaching rules
```

- **Routes are thin server components** that read the URL params (async in Next 16) and render a client feature module. Data is fetched in the browser with TanStack Query. That gives one cache that save and submit update directly. It gives explicit loading, empty and error states. And it gives Playwright control over every API response, which is what makes the mocked failure tests possible. The trade-off is no server-rendered data on first paint. For an authenticated internal tool that is an acceptable cost.
- **Same-origin proxy.** `app/api/backend/[...path]/route.ts` forwards to `API_BASE_URL`, which is read at request time. One build therefore works against any backend, there is no CORS configuration, and an unreachable API becomes a readable 503.
- **Every response is validated with Zod.** Pydantic serialises `Decimal` as strings, so one `decimal` helper normalises them to numbers at the edge. The rest of the app only sees typed numbers.
- **Domain logic is framework-free** in `lib/underwriting`, and it is where most of the unit tests point.
- **Forms** use React Hook Form with a Zod resolver built from the field registry. Line items use `useFieldArray`.

## What I'd do next

- Replace the demo teammates with real trainee identities from the API. Only the data source in `src/lib/team/` would change.
- Add the comp set editor. Comparable listings are the main evidence for a revenue forecast, and the API already supports them.
- Show scoring trends over time on the dashboard.
- Run the full suite in CI on every push. The workflow is ready but hasn't run yet.
