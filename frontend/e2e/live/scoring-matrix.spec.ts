import { buildScoreCases, coverage, RATING_LABEL } from "../fixtures/score-cases";
import { resetDatabase } from "../support/api";
import { expect, test } from "../support/test";

/**
 * Data-driven: one test per generated case (6 properties × 3 bands + 4
 * boundary cases). Financials are arranged through the API so each case
 * spends its time on what's being tested: entering a forecast in the UI,
 * submitting, and reading the grade.
 */
const cases = buildScoreCases();

test.beforeAll(() => {
  // Guard against a generator change silently dropping an outcome.
  expect(coverage(cases)).toEqual({ best: 7, medium: 8, low: 7 });
  resetDatabase();
});

for (const scoreCase of cases) {
  test(scoreCase.title, async ({ page, api, workspace }) => {
    const draftId = await api.draftWithFinancials(scoreCase.property.zpid);
    await workspace.goto(draftId, "analysis");

    await workspace.fillRevenue({
      low: String(Math.round(scoreCase.mid * 0.85)),
      mid: String(scoreCase.mid),
      high: String(Math.round(scoreCase.mid * 1.15)),
      cohost: "0",
      appreciation: "3",
    });
    await workspace.submit();

    await expect(page.getByTestId("score-value")).toHaveAttribute("data-score", String(scoreCase.score));
    await expect(page.getByTestId("score-card")).toHaveAttribute("data-rating", scoreCase.rating);
    await expect(page.getByTestId("score-card").getByText(RATING_LABEL[scoreCase.rating], { exact: true })).toBeVisible();
    await expect(page.getByTestId("score-explanation")).toContainText(
      `${scoreCase.deviationText} the analyst's $${scoreCase.property.referenceMid.toLocaleString("en-US")}`,
    );
    const [bestLow, bestHigh] = scoreCase.property.best;
    await expect(page.getByTestId("score-bands")).toContainText(
      `$${bestLow.toLocaleString("en-US")} – $${bestHigh.toLocaleString("en-US")}`,
    );
  });
}
