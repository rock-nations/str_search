import { SUBMISSION_ID, mockApi } from "../support/mock-api";
import { expect, test } from "../support/test";

/**
 * The team view with recorded API data: "You" is the recorded submission
 * (Mid $130,000, 4% above the analyst; setup and running costs below the
 * analyst's) and the six teammates are the fixed demo data.
 */
test("the team page ranks every trainee and labels the demo data", async ({ page }) => {
  await mockApi(page);
  await page.goto("/team");

  await expect(page.getByTestId("demo-badge")).toBeVisible();
  const rows = page.getByTestId("team-table").locator("tbody tr");
  await expect(rows).toHaveCount(7);
  await expect(rows.nth(0)).toHaveAttribute("data-testid", "team-row-priya-shah");
  await expect(rows.nth(1)).toHaveAttribute("data-testid", "team-row-daniel-okafor");
  // 100 on one case: level with the top two, who completed more cases.
  await expect(page.getByTestId("your-rank")).toHaveText(/3rd\s*of 7/);
  await expect(page.getByTestId("team-row-you")).toHaveAttribute("data-current", "true");
});

test("the skills grid shows what each trainee should practise", async ({ page }) => {
  await mockApi(page);
  await page.goto("/team");

  await expect(page.getByTestId("skill-marcus-lee-setup")).toHaveAttribute("data-level", "needs-work");
  await expect(page.getByTestId("skill-marcus-lee-revenue")).toHaveAttribute("data-level", "good");
  await expect(page.getByTestId("skill-tom-becker-revenue")).toHaveAttribute("data-level", "needs-work");
  await expect(page.getByTestId("skill-aisha-khan-opex")).toHaveAttribute("data-level", "needs-work");
  await expect(page.getByTestId("market-elena-ruiz-Central Florida")).toHaveAttribute("data-level", "needs-work");
  // Your running costs: $770 a month against the analyst's $1,850.
  await expect(page.getByTestId("skill-you-opex")).toHaveAttribute("data-level", "needs-work");
  await expect(page.getByTestId("skill-you-opex")).toContainText("58% off");

  await expect(page.getByTestId("note-daniel-okafor-retakes")).toContainText("First tries average 40");
});

test("a trainee profile explains their coaching focus", async ({ page }) => {
  await mockApi(page);
  await page.goto("/team");
  await page.getByTestId("team-row-marcus-lee").getByRole("link").click();

  await expect(page).toHaveURL(/\/team\/marcus-lee/);
  await expect(page.getByTestId("profile-rank")).toContainText("of 7 on the team");
  await expect(page.getByTestId("profile-skill-setup")).toContainText("Needs work");
  await expect(page.getByTestId("profile-notes")).toContainText("Setup and renovation budgets run 35% below the analyst's");
  await expect(page.getByTestId("attempt-history").locator("tbody tr")).toHaveCount(6);
});

test("your profile links each attempt to its results", async ({ page }) => {
  await mockApi(page);
  await page.goto("/team/you");

  await expect(page.getByRole("heading", { name: "Your progress" })).toBeVisible();
  await page.getByTestId("attempt-history").getByRole("link", { name: /1240 Ski View Dr/ }).click();
  await expect(page).toHaveURL(new RegExp(`/submissions/${SUBMISSION_ID}`));
});

test("the results page ranks trainees on the property", async ({ page }) => {
  await mockApi(page);
  await page.goto(`/submissions/${SUBMISSION_ID}`);

  const standings = page.getByTestId("team-standings").locator("tbody tr");
  await expect(standings).toHaveCount(7);
  await expect(standings.nth(0)).toHaveAttribute("data-testid", "team-standing-daniel-okafor");
  await expect(standings.nth(2)).toHaveAttribute("data-testid", "team-standing-you");
  // Teammates' forecasts are shown in dollars only here, after the reveal.
  await expect(page.getByTestId("team-standing-daniel-okafor")).toContainText("$126,250");

  await page.getByRole("tab", { name: /Your attempts/ }).click();
  await expect(page.getByTestId("leaderboard-position")).toContainText("1st");
  await expect(page.getByTestId("leaderboard-position")).toContainText("of 1");
});

test("an unknown trainee shows a not-found state", async ({ page }) => {
  await mockApi(page);
  await page.goto("/team/nobody");
  await expect(page.getByText("Trainee not found")).toBeVisible();
});
