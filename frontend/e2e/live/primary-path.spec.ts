import { resetDatabase } from "../support/api";
import { expect, test } from "../support/test";

/**
 * The whole training case through the UI, against the real API:
 * dashboard → property brief → financials → analysis → tags → review →
 * submit → results → back to an updated dashboard.
 */
test.beforeAll(() => resetDatabase());

test("a trainee completes and submits a full underwriting", async ({ page, workspace }) => {
  await test.step("dashboard lists six untouched cases", async () => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Training dashboard" })).toBeVisible();
    await expect(page.locator("[data-testid^=property-card-]")).toHaveCount(6);
    await expect(page.getByTestId("summary-completed")).toContainText(/0\s*\/\s*6/);
  });

  await test.step("property brief shows the listing and market", async () => {
    await page.getByTestId("property-card-41234567").getByRole("link", { name: "Review & start" }).click();
    await expect(page.getByRole("heading", { name: "1240 Ski View Dr", level: 1 })).toBeVisible();
    await expect(page.getByText("Smoky & Blue Ridge Mountains")).toBeVisible();
    await expect(page.getByText(/Drive-to cabin market/)).toBeVisible();
    await expect(page.getByText("The analyst's underwriting stays hidden until you submit.")).toBeVisible();
    await page.getByRole("button", { name: "Start underwriting" }).click();
    await page.waitForURL(/\/underwritings\/\d+/);
  });

  await test.step("financials: purchase, setup spend, monthly costs and taxes", async () => {
    await expect(workspace.field("Purchase price")).toHaveValue("675,000");
    await expect(page.getByText("From listing")).toBeVisible();
    await workspace.fillPurchase({ down: "20", rate: "6.99", term: "30", closing: "3" });
    await workspace.addLineItem("optimization", "Furniture & design", "45000");
    await workspace.addLineItem("optimization", "Hot tub", "12000");
    await workspace.addLineItem("opex", "Utilities", "450");
    await workspace.addLineItem("opex", "Insurance", "320");
    await expect(page.getByText("Standard training assumptions")).toBeVisible();
    await expect(workspace.field("Tax rate")).toHaveValue("37");
    await expect(workspace.chain("oop")).toHaveText("$212,250");
    await expect(workspace.stepButton("financials")).toContainText("Complete");
  });

  await test.step("analysis: revenue scenarios drive the returns", async () => {
    await page.getByRole("button", { name: "Continue to analysis" }).click();
    await expect(page.getByTestId("step-title")).toHaveText("Analysis");
    await workspace.fillRevenue({ low: "110000", mid: "130000", high: "150000", cohost: "0", appreciation: "3" });
    await expect(workspace.chain("fcf")).toHaveText("$77,692");
    await expect(workspace.chain("coc")).toHaveText("36.6%");
    await expect(page.getByTestId("scenario-mid-net-operating-income")).toHaveText("$120,760");
    // The live preview agrees with what the API calculated on save.
    await workspace.waitForSaved();
    await expect(page.getByTestId("chain-confirmed")).toBeVisible();
  });

  await test.step("deal tags", async () => {
    await page.getByRole("button", { name: "Continue to deal tags" }).click();
    await page.getByRole("switch", { name: "Turnkey" }).click();
    await expect(page.getByRole("switch", { name: "Turnkey" })).toBeChecked();
  });

  await test.step("review shows a ready checklist and the graded forecast", async () => {
    await page.getByRole("button", { name: "Continue to review & submit" }).click();
    await expect(page.getByTestId("review-status")).toHaveAttribute("data-ready", "true");
    await expect(page.getByTestId("review-graded-mid")).toHaveText("$130,000");
  });

  await test.step("submit and land on the results", async () => {
    await workspace.submit();
    await expect(page.getByTestId("score-value")).toHaveAttribute("data-score", "100");
    await expect(page.getByTestId("score-card")).toHaveAttribute("data-rating", "best");
    await expect(page.getByTestId("score-explanation")).toHaveText(
      "Your Mid forecast of $130,000 was 4.0% above the analyst's $125,000.",
    );
    // $130,000 is 4% off; two demo teammates were closer on this property.
    await expect(page.getByTestId("team-position")).toContainText("3rd");
    await expect(page.getByTestId("team-standing-you")).toHaveAttribute("data-current", "true");
    await expect(page.getByTestId("compare-mid")).toContainText("$125,000");
  });

  await test.step("dashboard reflects the graded attempt", async () => {
    await page.getByRole("link", { name: "Dashboard", exact: true }).first().click();
    const card = page.getByTestId("property-card-41234567");
    await expect(card.getByText("Submitted")).toBeVisible();
    await expect(card).toContainText(/Best\s*·\s*100/);
    await expect(page.getByTestId("summary-completed")).toContainText(/1\s*\/\s*6/);
    await expect(page.getByTestId("summary-average")).toContainText("100");
  });
});
