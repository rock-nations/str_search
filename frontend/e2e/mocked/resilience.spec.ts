import { DRAFT_ID, REFERENCE_ID, SUBMISSION_ID, fixtures, mockApi } from "../support/mock-api";
import { expect, test } from "../support/test";

/**
 * States the real API can't be made to produce on demand: outages, failed
 * saves, rejected submissions and empty data. No backend needed.
 */

test("a failed autosave is visible and Retry recovers", async ({ page, workspace }) => {
  // The API stays down until the test says otherwise, however many requests the page makes.
  let apiDown = true;
  await mockApi(page, {
    [`GET /underwritings/${DRAFT_ID}`]: { body: fixtures.draft },
    [`PUT /underwritings/${DRAFT_ID}`]: async (route) =>
      apiDown
        ? route.fulfill({ status: 500, json: { detail: "Failed to save underwriting" } })
        : route.fulfill({ json: fixtures.saved }),
  });
  await workspace.goto(DRAFT_ID, "financials");

  await expect(workspace.saveStatus()).toHaveAttribute("data-status", "error");
  await expect(workspace.saveStatus()).toContainText("Couldn't save");

  apiDown = false;
  await workspace.saveStatus().getByRole("button", { name: "Retry" }).click();
  await expect(workspace.saveStatus()).toHaveAttribute("data-status", "saved");
});

test("a failed submission keeps the trainee's work", async ({ page, workspace }) => {
  await mockApi(page, {
    [`POST /underwritings/${DRAFT_ID}/submit`]: { status: 500, body: { detail: "Failed to submit underwriting" } },
  });
  await workspace.goto(DRAFT_ID, "review");
  await expect(page.getByTestId("review-status")).toHaveAttribute("data-ready", "true");

  await page.getByRole("button", { name: "Submit for grading" }).click();
  await page.getByTestId("confirm-submit").click();

  await expect(page.getByText("Submission failed")).toBeVisible();
  await expect(page.getByText("Failed to submit underwriting")).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/underwritings/${DRAFT_ID}`));
  await workspace.openStep("analysis");
  await expect(workspace.field("Mid revenue")).toHaveValue("130,000");
});

test("API validation errors land on the field they belong to", async ({ page, workspace }) => {
  await mockApi(page, {
    [`POST /underwritings/${DRAFT_ID}/submit`]: {
      status: 422,
      body: {
        detail: [
          {
            type: "less_than_equal",
            loc: ["body", "purchase_details", "interest_rate"],
            msg: "Input should be less than or equal to 1",
          },
        ],
      },
    },
  });
  await workspace.goto(DRAFT_ID, "review");
  await page.getByRole("button", { name: "Submit for grading" }).click();
  await page.getByTestId("confirm-submit").click();

  await expect(page.getByText("The API rejected some values.")).toBeVisible();
  await workspace.openStep("financials");
  await expect(page.getByText("Input should be less than or equal to 1")).toBeVisible();
  await expect(workspace.field("Interest rate")).toHaveAttribute("aria-invalid", "true");
});

test("an empty training set shows an empty state", async ({ page }) => {
  await mockApi(page, {
    "GET /dashboard": {
      body: {
        summary: { total_properties: 0, submitted: 0, in_progress: 0, not_started: 0, average_accuracy: null },
        properties: [],
      },
    },
    "GET /submissions": { body: [] },
  });
  await page.goto("/");
  await expect(page.getByText("No training cases yet")).toBeVisible();
});

test("an API outage shows a clear error and recovers on retry", async ({ page }) => {
  let apiDown = true;
  await mockApi(page, {
    "GET /dashboard": async (route) =>
      apiDown
        ? route.fulfill({ status: 503, json: { detail: "The training API isn't reachable at http://localhost:8000." } })
        : route.fulfill({ json: fixtures.dashboardAfterSubmit }),
  });
  await page.goto("/");

  await expect(page.getByText("Couldn't load your training cases")).toBeVisible();
  await expect(page.getByText("The training API isn't reachable")).toBeVisible();

  apiDown = false;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.locator("[data-testid^=property-card-]")).toHaveCount(6);
});

test("the analyst's reference is never rendered as an editable draft", async ({ page }) => {
  await mockApi(page);
  await page.goto(`/underwritings/${REFERENCE_ID}`);
  await expect(page.getByTestId("reference-guard")).toBeVisible();
  await expect(page.getByText("$125,000")).toHaveCount(0);
  await expect(page.getByRole("textbox")).toHaveCount(0);
});

test("results explain the grade from a recorded submission", async ({ page }) => {
  await mockApi(page);
  await page.goto(`/submissions/${SUBMISSION_ID}`);

  await expect(page.getByTestId("score-value")).toHaveAttribute("data-score", "100");
  await expect(page.getByTestId("score-explanation")).toHaveText(
    "Your Mid forecast of $130,000 was 4.0% above the analyst's $125,000.",
  );
  await expect(page.getByTestId("stat-deviation")).toHaveText("+4.0%");
  await expect(page.getByTestId("leaderboard-position")).toContainText("1st");
  await expect(page.getByTestId("compare-mid")).toContainText("$130,000");
  await expect(page.getByTestId("takeaways")).toContainText("monthly operating expenses");
});

test("an unknown result shows a not-found state", async ({ page }) => {
  await mockApi(page, { "GET /submissions/999": { status: 404, body: { detail: "Submission 999 not found" } } });
  await page.goto("/submissions/999");
  await expect(page.getByText("Result not found")).toBeVisible();
});
