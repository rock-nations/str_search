import { SUBMISSION_ID, mockApi } from "../support/mock-api";
import { expect, test } from "../support/test";

/**
 * A deliberately failing test that demonstrates the failure artifacts.
 * Skipped unless E2E_DEMO_FAILURE=1:
 *
 *   E2E_DEMO_FAILURE=1 npx playwright test --project=mocked demo-failure
 *
 * The run leaves, under test-results/<test>/: a screenshot, a video, a trace
 * (open with `npx playwright show-trace <zip>`) and api-calls.json, the log of
 * every API call the page made. `npx playwright show-report` shows them all.
 */
test.skip(process.env.E2E_DEMO_FAILURE !== "1", "Demo only: set E2E_DEMO_FAILURE=1 to see failure artifacts");

test("demo: expects the wrong score so the failure artifacts can be inspected", async ({ page }) => {
  await mockApi(page);
  await page.goto(`/submissions/${SUBMISSION_ID}`);
  // The recorded submission scored 100 (Best). Expecting 70 fails on purpose.
  await expect(page.getByTestId("score-value")).toHaveAttribute("data-score", "70", { timeout: 3_000 });
});
