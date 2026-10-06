import { describe, expect, it } from "vitest";

import { underwritingSchema } from "@/lib/api/schemas";
import { emptyFormValues } from "@/lib/underwriting/defaults";
import type { UnderwritingFormValues } from "@/lib/underwriting/fields";
import { apiPathToFormPath, apiToForm, buildPayload } from "@/lib/underwriting/mappers";
import { fractionToPercent, parseNumber, percentToFraction } from "@/lib/parse";

import draft from "../../e2e/fixtures/api/underwriting-draft.json";
import saved from "../../e2e/fixtures/api/underwriting-saved.json";

function filled(): UnderwritingFormValues {
  const values = emptyFormValues();
  values.purchase = {
    purchasePrice: "675,000",
    downPaymentPct: "20",
    interestRatePct: "6.99",
    termYears: "30",
    closingCostsPct: "3",
  };
  values.optimizationItems = [{ label: "Hot tub", amount: "12,000" }];
  values.operatingExpenses = [{ label: "Utilities", amount: "450" }];
  values.revenue = { low: "110000", mid: "130000", high: "150000", coHostingPct: "0", appreciationPct: "3" };
  return values;
}

describe("number parsing", () => {
  it.each([
    ["$650,000", 650000],
    ["6.99%", 6.99],
    [" 1 200 ", 1200],
    ["−5", -5],
    [".5", 0.5],
    ["", null],
    ["abc", null],
    ["1.2.3", null],
  ])("parses %s", (raw, expected) => {
    expect(parseNumber(raw)).toBe(expected);
  });

  it("converts percentages without float noise", () => {
    expect(percentToFraction(6.99)).toBe("0.0699");
    expect(percentToFraction(20)).toBe("0.2");
    expect(percentToFraction(0.1)).toBe("0.001");
    expect(fractionToPercent(0.0699)).toBe("6.99");
    expect(fractionToPercent(0.07)).toBe("7");
  });
});

describe("apiToForm", () => {
  it("prefills the listing price and standard taxes on a fresh draft", () => {
    const seed = apiToForm(underwritingSchema.parse(draft));
    expect(seed.values.purchase.purchasePrice).toBe("675,000");
    expect(seed.values.purchase.downPaymentPct).toBe("");
    expect(seed.usedTaxDefaults).toBe(true);
    expect(seed.values.taxes).toEqual({ landPct: "20", slaPct: "25", bonusPct: "60", taxRatePct: "37" });
  });

  it("restores a saved draft in form units", () => {
    const seed = apiToForm(underwritingSchema.parse(saved));
    expect(seed.usedTaxDefaults).toBe(false);
    expect(seed.values.purchase.interestRatePct).toBe("6.99");
    expect(seed.values.purchase.termYears).toBe("30");
    expect(seed.values.revenue.mid).toBe("130,000");
    expect(seed.values.optimizationItems[0]).toEqual({ label: "Furniture & design", amount: "45,000" });
    expect(seed.values.tags.turnkey).toBe(true);
  });
});

describe("buildPayload", () => {
  it("converts every section to API units", () => {
    const { payload, pendingSections } = buildPayload(filled());
    expect(pendingSections).toEqual([]);
    expect(payload.purchase_details).toEqual({
      purchase_price: "675000",
      down_payment_pct: "0.2",
      interest_rate: "0.0699",
      mortgage_years: 30,
      closing_costs_pct: "0.03",
    });
    expect(payload.forecasted_revenue?.scenarios.mid.forecasted_revenue).toBe("130000");
    expect(payload.taxes?.tax_rate_pct).toBe("0.37");
    expect(payload.optimization_items).toEqual([{ category: "Hot tub", total_price: "12000" }]);
  });

  it("holds back only the section that has an error", () => {
    const values = filled();
    values.purchase.downPaymentPct = "120";
    const { payload, pendingSections } = buildPayload(values);
    expect(pendingSections).toEqual(["purchase"]);
    expect(payload.purchase_details).toBeUndefined();
    expect(payload.forecasted_revenue).toBeDefined();
  });

  it("skips empty rows but holds back half-filled ones", () => {
    const values = filled();
    values.operatingExpenses = [
      { label: "", amount: "" },
      { label: "Internet", amount: "90" },
    ];
    expect(buildPayload(values).payload.operating_expenses).toEqual([
      { expense_name: "Internet", monthly_amount: "90" },
    ]);

    values.operatingExpenses.push({ label: "Insurance", amount: "" });
    const built = buildPayload(values);
    expect(built.pendingSections).toContain("opex");
    expect(built.payload.operating_expenses).toBeUndefined();
  });

  it("never sends a purchase that leaves nothing out of pocket", () => {
    const values = filled();
    values.purchase.downPaymentPct = "0";
    values.purchase.closingCostsPct = "0";
    values.optimizationItems = [];
    const { pendingSections } = buildPayload(values);
    expect(pendingSections).toEqual(expect.arrayContaining(["purchase", "optimization"]));
  });

  it("maps API validation paths back to form fields", () => {
    const rowIndexes = { optimization: [0, 2], opex: [] };
    expect(apiPathToFormPath("purchase_details.down_payment_pct", rowIndexes)).toBe("purchase.downPaymentPct");
    expect(apiPathToFormPath("forecasted_revenue.scenarios.mid.forecasted_revenue", rowIndexes)).toBe("revenue.mid");
    expect(apiPathToFormPath("optimization_items.1.total_price", rowIndexes)).toBe("optimizationItems.2.amount");
    expect(apiPathToFormPath("unknown.field", rowIndexes)).toBeNull();
  });
});
