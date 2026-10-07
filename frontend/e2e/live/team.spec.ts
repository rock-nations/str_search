import { resetDatabase } from "../support/api";
import { expect, test } from "../support/test";

/**
 * Your real attempts join the demo team. A retake counts as the latest
 * attempt (the rule the hiring team confirmed), while the first try stays
 * visible so lead analysts can see how the score was reached.
 */
test.beforeAll(() => resetDatabase());

test("your attempts join the team with latest and first-try scores", async ({ page, api }) => {
  // 1240 Ski View Dr, analyst's Mid $125,000.
  await api.submitAttempt("41234567", 175_000); // +40%: Low, 40
  const retake = await api.submitAttempt("41234567", 126_000); // +0.8%: Best, 100

  await page.goto("/team");
  const you = page.getByTestId("team-row-you");
  await expect(you).toContainText("100");
  await expect(you).toContainText("40");
  // Level with the top two on 100, but they completed more cases.
  await expect(page.getByTestId("your-rank")).toHaveText(/3rd\s*of 7/);
  await expect(page.getByTestId("skill-you-revenue")).toHaveAttribute("data-level", "good");

  await page.goto("/team/you");
  await expect(page.getByText("1 retake")).toBeVisible();
  await expect(page.getByTestId("attempt-history").locator("tbody tr")).toHaveCount(2);

  // On the property itself, the retake is the closest of all seven trainees.
  await page.goto(`/submissions/${retake}`);
  await expect(page.getByTestId("team-position")).toContainText("1st");
  await expect(page.getByTestId("team-standing-you")).toContainText("retake 1");

  await page.goto("/");
  await expect(page.getByTestId("summary-team-rank")).toContainText("3rd of 7 on the team");
});
