import { resetDatabase } from "../support/api";
import { expect, test } from "../support/test";

/**
 * Forms that hold up when people make mistakes: missing fields, invalid
 * values, a deal with nothing out of pocket, and soft warnings that inform
 * without blocking.
 */
test.beforeAll(() => resetDatabase());

test("review lists every missing input and blocks submission", async ({ page, api, workspace }) => {
  const id = await api.startDraft("52345678");
  await workspace.goto(id, "review");

  await expect(page.getByTestId("review-status")).toHaveAttribute("data-ready", "false");
  await expect(page.getByTestId("review-status")).toContainText("9 items need attention");
  await expect(page.getByTestId("checklist-item-purchase.downPaymentPct")).toHaveAttribute("data-status", "missing");
  await expect(page.getByTestId("checklist-item-revenue.mid")).toContainText("Mid revenue · Missing");
  // Purchase price is prefilled from the listing and taxes from the standard assumptions.
  await expect(page.getByTestId("checklist-taxes")).toContainText("4 of 4 complete");
  await expect(page.getByRole("button", { name: "Submit for grading" })).toBeDisabled();

  // The header Submit explains why instead of silently doing nothing.
  await page.getByTestId("header-submit").click();
  await expect(page.getByText("Not ready to submit yet")).toBeVisible();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
});

test("a Fix link jumps to the step and focuses the field", async ({ page, api, workspace }) => {
  const id = await api.startDraft("52345678");
  await workspace.goto(id, "review");

  await page.getByRole("button", { name: "Fix Interest rate" }).click();
  await expect(page).toHaveURL(/step=financials/);
  await expect(workspace.field("Interest rate")).toBeFocused();
});

test("invalid values show inline errors and are never sent to the API", async ({ page, api, workspace }) => {
  const id = await api.startDraft("63456789");
  const sentPurchase: unknown[] = [];
  page.on("request", (request) => {
    if (request.method() === "PUT" && request.url().includes(`/underwritings/${id}`)) {
      const body = request.postDataJSON() as { purchase_details?: unknown };
      if (body.purchase_details) sentPurchase.push(body.purchase_details);
    }
  });

  await workspace.goto(id, "financials");
  await workspace.fillPurchase({ down: "120", rate: "abc", term: "2.5", closing: "3" });
  await expect(page.getByText("Down payment must be between 0% and 100%")).toBeVisible();
  await expect(page.getByText("Interest rate must be a number")).toBeVisible();
  await expect(page.getByText("Loan term must be a whole number of years")).toBeVisible();
  await expect(workspace.field("Down payment")).toHaveAttribute("aria-invalid", "true");

  // A half-filled expense row is flagged; the rest of the form keeps saving.
  await page.locator("#section-opex").getByRole("button", { name: "Add expense" }).click();
  await page.getByLabel("Monthly amount 1", { exact: true }).fill("300");
  await page.getByLabel("Monthly amount 1", { exact: true }).blur();
  await expect(page.getByText("Expense is required")).toBeVisible();

  await workspace.openStep("analysis");
  await workspace.fill("Mid revenue", "-5");
  await expect(page.getByText("Mid revenue can't be negative")).toBeVisible();

  await workspace.waitForSaved();
  await expect(page.getByTestId("save-pending")).toBeVisible();
  expect(sentPurchase).toEqual([]);

  await workspace.openStep("review");
  await expect(page.getByTestId("checklist-item-purchase.downPaymentPct")).toHaveAttribute("data-status", "invalid");
  await expect(page.getByTestId("checklist-opex")).toContainText("1 row to fix");
  await expect(page.getByRole("button", { name: "Submit for grading" })).toBeDisabled();
});

test("a deal with nothing out of pocket is blocked before the API rejects it", async ({ page, api, workspace }) => {
  const id = await api.startDraft("74567890");
  await workspace.goto(id, "financials");
  await workspace.fillPurchase({ down: "0", rate: "7", term: "30", closing: "0" });

  await expect(page.getByText("Total out of pocket is $0.")).toBeVisible();
  await workspace.openStep("review");
  await expect(page.getByTestId("checklist-item-total-out-of-pocket")).toHaveAttribute("data-status", "invalid");
});

test("inverted scenarios warn but still allow submission", async ({ page, api, workspace }) => {
  const id = await api.draftWithFinancials("85678901");
  await workspace.goto(id, "analysis");
  await workspace.fillRevenue({ low: "250000", mid: "200000", high: "260000", cohost: "0", appreciation: "3" });

  await workspace.openStep("review");
  await expect(page.getByTestId("warning-low-above-mid")).toBeVisible();
  await expect(page.getByTestId("review-status")).toHaveAttribute("data-ready", "true");
  await expect(page.getByRole("button", { name: "Submit for grading" })).toBeEnabled();
});
