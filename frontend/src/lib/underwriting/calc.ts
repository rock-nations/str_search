/**
 * Live-preview port of the "Underwriting Calculations" formulas.
 *
 * It mirrors `backend/app/services/underwriting_calculator.py`, including its
 * rounding (money to cents, half away from zero), so the numbers a trainee
 * sees while typing match what the API returns after a save.
 *
 * Inputs use the units a person types: percentages are 0–100.
 * Each output is `null` until the inputs it depends on are valid.
 */

export const SCENARIOS = ["low", "mid", "high"] as const;
export type ScenarioKey = (typeof SCENARIOS)[number];

/** The Low and High scenarios nudge operating costs (brief: ×0.96 and ×1.04). */
export const OPEX_MULTIPLIER: Record<ScenarioKey, number> = { low: 0.96, mid: 1, high: 1.04 };

export type CalcInputs = {
  purchasePrice: number | null;
  downPaymentPct: number | null;
  interestRatePct: number | null;
  termYears: number | null;
  closingCostsPct: number | null;
  optimizationTotal: number;
  opexMonthly: number;
  landPct: number | null;
  slaPct: number | null;
  bonusPct: number | null;
  taxRatePct: number | null;
  revenue: Record<ScenarioKey, number | null>;
  coHostingPct: number | null;
  appreciationPct: number | null;
};

export type PurchaseResult = {
  purchasePrice: number;
  downPayment: number;
  loanAmount: number;
  closingCosts: number;
  monthlyPayment: number;
  annualDebtService: number;
  principalPaydownY1: number;
};

export type TaxResult = {
  improvementBasis: number;
  shortLifeAssets: number;
  y1Depreciation: number;
  taxSavings: number;
};

export type ScenarioResult = {
  revenue: number;
  opexAnnual: number;
  coHostingFee: number;
  noi: number;
  debtService: number;
  freeCashFlow: number;
  /** Fraction: 0.366 = 36.6%. */
  cashOnCash: number;
  principalPaydown: number;
  appreciation: number | null;
  /** Fraction; null until appreciation is entered. */
  totalReturn: number | null;
};

export type CalcResult = {
  purchase: PurchaseResult | null;
  optimizationTotal: number;
  opexMonthly: number;
  opexAnnual: number;
  totalOutOfPocket: number | null;
  taxes: TaxResult | null;
  scenarios: Record<ScenarioKey, ScenarioResult | null>;
  /** Mid revenue ÷ purchase price, as a fraction. */
  prr: number | null;
  /** Mid free cash flow + tax savings. */
  firstYearTotalReturn: number | null;
};

/** Half-away-from-zero rounding to cents, matching Python's ROUND_HALF_UP. */
export function roundMoney(value: number): number {
  const sign = value < 0 ? -1 : 1;
  return (sign * Math.round(Math.abs(value) * 100 + 1e-9)) / 100;
}

export function monthlyPayment(loanAmount: number, annualRatePct: number, termYears: number): number {
  if (loanAmount <= 0) return 0;
  const n = termYears * 12;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return loanAmount / n;
  const growth = (1 + r) ** n;
  return (loanAmount * r * growth) / (growth - 1);
}

/** Principal repaid across the first twelve payments. */
export function principalPaydownYearOne(loanAmount: number, annualRatePct: number, termYears: number): number {
  const payment = monthlyPayment(loanAmount, annualRatePct, termYears);
  const r = annualRatePct / 100 / 12;
  if (loanAmount <= 0) return 0;
  if (r === 0) return (loanAmount / (termYears * 12)) * 12;
  let balance = loanAmount;
  let paid = 0;
  for (let month = 0; month < 12; month += 1) {
    const principal = payment - balance * r;
    paid += principal;
    balance -= principal;
  }
  return paid;
}

export function calculatePurchase(inputs: CalcInputs): PurchaseResult | null {
  const { purchasePrice, downPaymentPct, interestRatePct, termYears, closingCostsPct } = inputs;
  if (
    purchasePrice === null ||
    downPaymentPct === null ||
    interestRatePct === null ||
    termYears === null ||
    closingCostsPct === null
  ) {
    return null;
  }
  const downPaymentRaw = purchasePrice * (downPaymentPct / 100);
  const loanAmount = roundMoney(purchasePrice - downPaymentRaw);
  const payment = monthlyPayment(loanAmount, interestRatePct, termYears);
  return {
    purchasePrice,
    downPayment: roundMoney(downPaymentRaw),
    loanAmount,
    closingCosts: roundMoney(purchasePrice * (closingCostsPct / 100)),
    monthlyPayment: payment,
    annualDebtService: payment * 12,
    principalPaydownY1: principalPaydownYearOne(loanAmount, interestRatePct, termYears),
  };
}

export function calculateTaxes(inputs: CalcInputs): TaxResult | null {
  const { purchasePrice, landPct, slaPct, bonusPct, taxRatePct, optimizationTotal } = inputs;
  if (purchasePrice === null || landPct === null || slaPct === null || bonusPct === null || taxRatePct === null) {
    return null;
  }
  const improvementBasis = purchasePrice * (1 - landPct / 100) + optimizationTotal;
  const shortLifeAssets = improvementBasis * (slaPct / 100);
  const y1Depreciation = shortLifeAssets * (bonusPct / 100);
  const taxSavings = y1Depreciation * (taxRatePct / 100);
  return {
    improvementBasis: roundMoney(improvementBasis),
    shortLifeAssets: roundMoney(shortLifeAssets),
    y1Depreciation: roundMoney(y1Depreciation),
    taxSavings: roundMoney(taxSavings),
  };
}

export function calculate(inputs: CalcInputs): CalcResult {
  const purchase = calculatePurchase(inputs);
  const opexAnnual = inputs.opexMonthly * 12;
  const totalOutOfPocket = purchase
    ? roundMoney(purchase.downPayment + purchase.closingCosts + inputs.optimizationTotal)
    : null;
  const taxes = calculateTaxes(inputs);

  const scenarioFor = (key: ScenarioKey): ScenarioResult | null => {
    const revenue = inputs.revenue[key];
    if (!purchase || totalOutOfPocket === null || revenue === null || inputs.coHostingPct === null) return null;
    const scenarioOpex = opexAnnual * OPEX_MULTIPLIER[key];
    const coHostingFee = revenue * (inputs.coHostingPct / 100);
    const noi = revenue - scenarioOpex - coHostingFee;
    const freeCashFlow = noi - purchase.annualDebtService;
    const appreciation =
      inputs.appreciationPct === null ? null : purchase.purchasePrice * (inputs.appreciationPct / 100);
    const hasOop = totalOutOfPocket > 0;
    return {
      revenue,
      opexAnnual: roundMoney(scenarioOpex),
      coHostingFee: roundMoney(coHostingFee),
      noi: roundMoney(noi),
      debtService: roundMoney(purchase.annualDebtService),
      freeCashFlow: roundMoney(freeCashFlow),
      cashOnCash: hasOop ? freeCashFlow / totalOutOfPocket : 0,
      principalPaydown: roundMoney(purchase.principalPaydownY1),
      appreciation: appreciation === null ? null : roundMoney(appreciation),
      totalReturn:
        appreciation === null || !hasOop
          ? null
          : (freeCashFlow + purchase.principalPaydownY1 + appreciation) / totalOutOfPocket,
    };
  };

  const scenarios = { low: scenarioFor("low"), mid: scenarioFor("mid"), high: scenarioFor("high") };
  const midRevenue = inputs.revenue.mid;

  return {
    purchase,
    optimizationTotal: inputs.optimizationTotal,
    opexMonthly: inputs.opexMonthly,
    opexAnnual,
    totalOutOfPocket,
    taxes,
    scenarios,
    prr:
      midRevenue !== null && inputs.purchasePrice !== null && inputs.purchasePrice > 0
        ? midRevenue / inputs.purchasePrice
        : null,
    firstYearTotalReturn:
      scenarios.mid && taxes ? roundMoney(scenarios.mid.freeCashFlow + taxes.taxSavings) : null,
  };
}
