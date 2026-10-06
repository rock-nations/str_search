import { resetDatabase } from "../support/api";
import { expect, test } from "../support/test";

/**
 * The leaderboard ranks every graded attempt on a property by closeness to
 * the analyst (the API has no trainee identity, so each attempt is an entry).
 */
test.beforeAll(() => resetDatabase());

test("attempts are ranked by closeness and the current one is highlighted", async ({ page, api }) => {
  // Reference Mid for 3402 Palm Isle Ct is $165,000. Submitted in this order:
  const medium = await api.submitAttempt("63456789", 140_000); // −15.2% → Medium
  const low = await api.submitAttempt("63456789", 260_000); // +57.6% → Low
  const best = await api.submitAttempt("63456789", 170_000); // +3.0% → Best

  await page.goto(`/submissions/${medium}`);
  const board = page.getByTestId("leaderboard");
  await expect(page.getByTestId("leaderboard-position")).toContainText("2nd");
  await expect(page.getByTestId("leaderboard-position")).toContainText("of 3");

  const rows = board.locator("tbody tr");
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toHaveAttribute("data-testid", `leaderboard-row-${best}`);
  await expect(rows.nth(1)).toHaveAttribute("data-testid", `leaderboard-row-${medium}`);
  await expect(rows.nth(2)).toHaveAttribute("data-testid", `leaderboard-row-${low}`);
  await expect(rows.nth(1)).toHaveAttribute("data-current", "true");
  await expect(rows.nth(1)).toContainText("This attempt");

  // Other attempts link to their own results.
  await rows.nth(0).getByRole("link").click();
  await expect(page).toHaveURL(new RegExp(`/submissions/${best}`));
  await expect(page.getByTestId("leaderboard-position")).toContainText("1st");
});
