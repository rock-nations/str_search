import { resetDatabase } from "../support/api";
import { expect, test } from "../support/test";

/** Saving, unit conversion, resuming and locking, against the real API. */
test.beforeAll(() => resetDatabase());

test("autosave sends percentages as fractions and values survive a reload", async ({ page, api, workspace }) => {
  const id = await api.startDraft("96789012");
  await workspace.goto(id, "financials");

  const saved = page.waitForRequest((request) => {
    if (request.method() !== "PUT" || !request.url().includes(`/underwritings/${id}`)) return false;
    const body = request.postDataJSON() as { purchase_details?: { interest_rate?: string } };
    return body.purchase_details?.interest_rate === "0.0699";
  });
  await workspace.fillPurchase({ down: "25", rate: "6.99", term: "30", closing: "3" });
  const body = (await saved).postDataJSON();
  expect(body.purchase_details).toEqual({
    purchase_price: "449000",
    down_payment_pct: "0.25",
    interest_rate: "0.0699",
    mortgage_years: 30,
    closing_costs_pct: "0.03",
  });
  await workspace.waitForSaved();

  await page.reload();
  await expect(workspace.field("Interest rate")).toHaveValue("6.99");
  await expect(workspace.field("Down payment")).toHaveValue("25");
  await expect(workspace.field("Purchase price")).toHaveValue("449,000");
});

test("the live preview matches the API's own calculation", async ({ page, api, workspace }) => {
  const id = await api.draftWithFinancials("41234567");
  await workspace.goto(id, "analysis");
  await workspace.fillRevenue({ low: "110000", mid: "130000", high: "150000", cohost: "10", appreciation: "3" });
  await workspace.waitForSaved();

  await expect(page.getByTestId("chain-confirmed")).toBeVisible();
  const saved = await page.request.get(`/api/backend/underwritings/${id}`).then((r) => r.json());
  const apiCoc = `${(Number(saved.m_cash_on_cash) * 100).toFixed(1)}%`;
  await expect(workspace.chain("coc")).toHaveText(apiCoc);
});

test("a draft can be resumed from the dashboard", async ({ page, api }) => {
  const id = await api.draftWithFinancials("74567890");
  await page.goto("/");
  const card = page.getByTestId("property-card-74567890");
  await expect(card.getByText("In progress")).toBeVisible();
  await card.getByRole("link", { name: "Resume draft" }).click();
  await expect(page).toHaveURL(new RegExp(`/underwritings/${id}`));
  await expect(page.getByLabel("Interest rate", { exact: true })).toHaveValue("6.99");
});

test("a submitted attempt is locked and links to its results", async ({ page, api }) => {
  const submissionId = await api.submitAttempt("52345678", 96_000);
  const submission = await page.request.get(`/api/backend/submissions/${submissionId}`).then((r) => r.json());

  await page.goto(`/underwritings/${submission.underwriting_id}`);
  await expect(page.getByTestId("submitted-notice")).toBeVisible();
  await expect(page.getByLabel("Mid revenue", { exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "View results" }).click();
  await expect(page).toHaveURL(new RegExp(`/submissions/${submissionId}`));
});

test("the analyst's reference underwriting is never shown in the workspace", async ({ page }) => {
  // After a reset, ids 1–6 are the seeded reference underwritings.
  await page.goto("/underwritings/1");
  await expect(page.getByTestId("reference-guard")).toBeVisible();
  await expect(page.getByText("$125,000")).toHaveCount(0);
  await expect(page.getByRole("textbox")).toHaveCount(0);
});
