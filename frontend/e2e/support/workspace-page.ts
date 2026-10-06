import { expect, type Locator, type Page } from "@playwright/test";

type Step = "financials" | "analysis" | "tags" | "review";

/** Page object for the underwriting workspace. Locators use labels and roles first. */
export class WorkspacePage {
  constructor(readonly page: Page) {}

  async goto(id: number, step?: Step) {
    await this.page.goto(`/underwritings/${id}${step ? `?step=${step}` : ""}`);
    await expect(this.page.getByTestId("step-title")).toBeVisible();
  }

  field(label: string): Locator {
    return this.page.getByLabel(label, { exact: true });
  }

  async fill(label: string, value: string) {
    const input = this.field(label);
    await input.fill(value);
    await input.blur();
  }

  /** The stepper renders twice (rail on wide screens, tabs on narrow ones); use the visible one. */
  stepButton(step: Step): Locator {
    return this.page.getByTestId(`step-${step}`).filter({ visible: true });
  }

  async openStep(step: Step) {
    await this.stepButton(step).click();
    await expect(this.page).toHaveURL(new RegExp(`step=${step}`));
  }

  async fillPurchase(values: { price?: string; down: string; rate: string; term: string; closing: string }) {
    if (values.price) await this.fill("Purchase price", values.price);
    await this.fill("Down payment", values.down);
    await this.fill("Interest rate", values.rate);
    await this.fill("Loan term", values.term);
    await this.fill("Closing costs", values.closing);
  }

  /** Adds a row with a suggestion chip when one exists, otherwise with the "Add" button. */
  async addLineItem(kind: "optimization" | "opex", label: string, amount: string) {
    const section = this.page.locator(kind === "optimization" ? "#section-optimization" : "#section-opex");
    const chip = section.getByRole("button", { name: label, exact: true });
    const nameLabel = kind === "optimization" ? "Category" : "Expense";
    const amountLabel = kind === "optimization" ? "Amount" : "Monthly amount";
    const rowsBefore = await section.getByRole("listitem").count();
    if (await chip.isVisible().catch(() => false)) {
      await chip.click();
    } else {
      await section.getByRole("button", { name: kind === "optimization" ? "Add setup cost" : "Add expense" }).click();
      await section.getByLabel(`${nameLabel} ${rowsBefore + 1}`, { exact: true }).fill(label);
    }
    const amountInput = section.getByLabel(`${amountLabel} ${rowsBefore + 1}`, { exact: true });
    await amountInput.fill(amount);
    await amountInput.blur();
  }

  async fillRevenue(values: { low: string; mid: string; high: string; cohost?: string; appreciation?: string }) {
    await this.fill("Low revenue", values.low);
    await this.fill("Mid revenue", values.mid);
    await this.fill("High revenue", values.high);
    if (values.cohost !== undefined) await this.fill("Co-hosting fee", values.cohost);
    if (values.appreciation !== undefined) await this.fill("Annual appreciation", values.appreciation);
  }

  saveStatus(): Locator {
    return this.page.getByTestId("save-status");
  }

  async waitForSaved() {
    await expect(this.saveStatus()).toHaveAttribute("data-status", "saved", { timeout: 15_000 });
  }

  /** Clicks Submit, confirms the dialog and waits for the results page. Returns the submission id. */
  async submit(): Promise<number> {
    await this.page.getByTestId("header-submit").click();
    const dialog = this.page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();
    await dialog.getByTestId("confirm-submit").click();
    await this.page.waitForURL(/\/submissions\/\d+/, { timeout: 20_000 });
    return Number(/\/submissions\/(\d+)/.exec(this.page.url())?.[1]);
  }

  chain(name: "oop" | "fcf" | "coc"): Locator {
    return this.page.getByTestId(`chain-${name}`);
  }
}
