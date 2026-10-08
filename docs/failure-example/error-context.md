# Test info

- Name: mocked/demo-failure.spec.ts >> demo: expects the wrong score so the failure artifacts can be inspected
- Location: e2e/mocked/demo-failure.spec.ts:16:5

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator:  getByTestId('score-value')
Expected: "70"
Received: "100"
Timeout:  3000ms

Call log:
  - Expect "toHaveAttribute" getByTestId('score-value') with timeout 3000ms
  - waiting for getByTestId('score-value')
    - locator resolved to <p data-score="100" data-testid="score-value" class="figure text-[40px] leading-none font-semibold tracking-tight">10</p>
    - unexpected value "100"
    - locator resolved to <p data-score="100" data-testid="score-value" class="figure text-[40px] leading-none font-semibold tracking-tight">44</p>
    - unexpected value "100"
    - locator resolved to <p data-score="100" data-testid="score-value" class="figure text-[40px] leading-none font-semibold tracking-tight">69</p>
    - unexpected value "100"
    - locator resolved to <p data-score="100" data-testid="score-value" class="figure text-[40px] leading-none font-semibold tracking-tight">85</p>
    5 × unexpected value "100"
      - locator resolved to <p data-score="100" data-testid="score-value" class="figure text-[40px] leading-none font-semibold tracking-tight">100</p>
    - unexpected value "100"

```

```yaml
- paragraph: "100"
```

# Test source

```ts
  1  | import { SUBMISSION_ID, mockApi } from "../support/mock-api";
  2  | import { expect, test } from "../support/test";
  3  | 
  4  | /**
  5  |  * A deliberately failing test that demonstrates the failure artifacts.
  6  |  * Skipped unless E2E_DEMO_FAILURE=1:
  7  |  *
  8  |  *   E2E_DEMO_FAILURE=1 npx playwright test --project=mocked demo-failure
  9  |  *
  10 |  * The run leaves, under test-results/<test>/: a screenshot, a video, a trace
  11 |  * (open with `npx playwright show-trace <zip>`) and api-calls.json, the log of
  12 |  * every API call the page made. `npx playwright show-report` shows them all.
  13 |  */
  14 | test.skip(process.env.E2E_DEMO_FAILURE !== "1", "Demo only: set E2E_DEMO_FAILURE=1 to see failure artifacts");
  15 | 
  16 | test("demo: expects the wrong score so the failure artifacts can be inspected", async ({ page }) => {
  17 |   await mockApi(page);
  18 |   await page.goto(`/submissions/${SUBMISSION_ID}`);
  19 |   // The recorded submission scored 100 (Best). Expecting 70 fails on purpose.
> 20 |   await expect(page.getByTestId("score-value")).toHaveAttribute("data-score", "70", { timeout: 3_000 });
     |                                                 ^ Error: expect(locator).toHaveAttribute(expected) failed
  21 | });
  22 | 
```