import { describe, expect, it } from "vitest";

import { calculate, monthlyPayment, principalPaydownYearOne, type CalcInputs } from "@/lib/underwriting/calc";

/** Same inputs as backend/tests/test_underwriting_calculator.py. */
const backendVector: CalcInputs = {
  purchasePrice: 500_000,
  downPaymentPct: 20,
  interestRatePct: 7,
  termYears: 30,
  closingCostsPct: 3,
  optimizationTotal: 60_000,
  opexMonthly: 800,
  landPct: 20,
  slaPct: 25,
  bonusPct: 60,
  taxRatePct: 37,
  revenue: { low: 100_000, mid: 120_000, high: 140_000 },
  coHostingPct: 0,
  appreciationPct: 3,
};

describe("calculate (backend test vectors)", () => {
  const result = calculate(backendVector);

  it("totals out of pocket as down payment + closing + optimization", () => {
    expect(result.totalOutOfPocket).toBe(175_000);
  });

  it("matches standard amortization", () => {
    expect(result.purchase?.monthlyPayment).toBeCloseTo(2661.21, 2);
    const paydown = result.purchase?.principalPaydownY1 ?? 0;
    expect(paydown).toBeGreaterThan(4000);
    expect(paydown).toBeLessThan(4200);
  });

  it("computes PRR as mid revenue over price", () => {
    expect(result.prr).toBeCloseTo(0.24, 4);
  });

  it("chains the cost-segregation tax savings", () => {
    expect(result.taxes).toEqual({
      improvementBasis: 460_000,
      shortLifeAssets: 115_000,
      y1Depreciation: 69_000,
      taxSavings: 25_530,
    });
  });

  it("orders cash-on-cash low < mid < high and divides FCF by OOP", () => {
    const { low, mid, high } = result.scenarios;
    expect(low!.cashOnCash).toBeLessThan(mid!.cashOnCash);
    expect(mid!.cashOnCash).toBeLessThan(high!.cashOnCash);
    expect(mid!.cashOnCash).toBeCloseTo(mid!.freeCashFlow / 175_000, 4);
  });

  it("nudges OPEX by 0.96 / 1 / 1.04", () => {
    expect(result.scenarios.low?.opexAnnual).toBe(9216);
    expect(result.scenarios.mid?.opexAnnual).toBe(9600);
    expect(result.scenarios.high?.opexAnnual).toBe(9984);
  });

  it("first-year total return is mid FCF + tax savings", () => {
    expect(result.firstYearTotalReturn).toBeCloseTo(result.scenarios.mid!.freeCashFlow + 25_530, 2);
  });
});

describe("calculate (live API sample)", () => {
  // Captured from PUT /api/underwritings/7 against the real backend.
  const result = calculate({
    ...backendVector,
    purchasePrice: 675_000,
    interestRatePct: 6.99,
    optimizationTotal: 57_000,
    opexMonthly: 770,
    revenue: { low: 110_000, mid: 130_000, high: 150_000 },
  });

  it("matches the API's stored numbers", () => {
    expect(result.totalOutOfPocket).toBe(212_250);
    expect(result.purchase?.loanAmount).toBe(540_000);
    expect(result.scenarios.mid?.debtService).toBe(43_068.09);
    expect(result.scenarios.mid?.freeCashFlow).toBe(77_691.91);
    expect(result.scenarios.mid?.principalPaydown).toBe(5495.95);
    expect(result.scenarios.mid?.cashOnCash).toBeCloseTo(0.366, 4);
    expect(result.scenarios.mid?.totalReturn).toBeCloseTo(0.4873, 4);
    expect(result.taxes?.taxSavings).toBe(33_133.5);
    expect(result.prr).toBeCloseTo(0.1926, 4);
  });
});

describe("edge cases", () => {
  it("handles a zero interest rate", () => {
    expect(monthlyPayment(360_000, 0, 30)).toBe(1000);
    expect(principalPaydownYearOne(360_000, 0, 30)).toBe(12_000);
  });

  it("handles an all-cash purchase", () => {
    expect(monthlyPayment(0, 7, 30)).toBe(0);
    const result = calculate({ ...backendVector, downPaymentPct: 100 });
    expect(result.scenarios.mid?.debtService).toBe(0);
  });

  it("returns null outputs until inputs are complete", () => {
    const result = calculate({ ...backendVector, interestRatePct: null, coHostingPct: null });
    expect(result.purchase).toBeNull();
    expect(result.totalOutOfPocket).toBeNull();
    expect(result.scenarios.mid).toBeNull();
    // Taxes only need price + tax inputs.
    expect(result.taxes?.taxSavings).toBe(25_530);
  });

  it("leaves total return empty without appreciation", () => {
    const result = calculate({ ...backendVector, appreciationPct: null });
    expect(result.scenarios.mid?.cashOnCash).toBeTypeOf("number");
    expect(result.scenarios.mid?.totalReturn).toBeNull();
  });
});
