import { DEAL_TAG_KEYS, type SaveUnderwritingPayload, type Underwriting } from "@/lib/api/schemas";
import { formatMoneyInput } from "@/lib/format";
import { fractionToPercent, moneyToString, percentToFraction } from "@/lib/parse";

import type { CalcInputs } from "./calc";
import {
  NUMBER_FIELD_BY_NAME,
  checkLineItem,
  checkNumber,
  getFieldValue,
  lineItemsTotal,
  readNumber,
  type LineItemKind,
  type LineItemValues,
  type NumberFieldName,
  type SectionId,
  type UnderwritingFormValues,
} from "./fields";
import { STANDARD_TAXES, emptyTags } from "./defaults";
import { hasZeroOutOfPocket } from "./form-schema";

/* ------------------------------------------------------------ API → form - */

const money = (value: number | null | undefined) =>
  value === null || value === undefined ? "" : formatMoneyInput(value);

export type FormSeed = {
  values: UnderwritingFormValues;
  /** True when the tax inputs were prefilled with the standard training assumptions. */
  usedTaxDefaults: boolean;
};

/** Builds the initial form state from a saved draft (or a fresh one). */
export function apiToForm(uw: Underwriting): FormSeed {
  const purchase = uw.detail?.purchase_details ?? null;
  const revenue = uw.detail?.forecasted_revenue ?? null;
  const taxes = uw.taxes;
  const hasTaxes = taxes !== null && taxes !== undefined && taxes.land_assumptions_pct !== null;

  const tags = emptyTags();
  for (const key of DEAL_TAG_KEYS) tags[key] = Boolean(uw[key]);

  return {
    usedTaxDefaults: !hasTaxes,
    values: {
      purchase: {
        // The listing price is the prefill until the trainee saves their own.
        purchasePrice: money(purchase?.purchase_price ?? uw.purchase_price),
        downPaymentPct: fractionToPercent(purchase?.down_payment_pct),
        interestRatePct: fractionToPercent(purchase?.interest_rate),
        termYears: purchase?.mortgage_years != null ? String(purchase.mortgage_years) : "",
        closingCostsPct: fractionToPercent(purchase?.closing_costs_pct),
      },
      optimizationItems: uw.optimization_items.map((item) => ({
        label: item.category ?? "",
        amount: money(item.total_price),
      })),
      operatingExpenses: uw.operating_expenses.map((item) => ({
        label: item.expense_name ?? "",
        amount: money(item.monthly_amount),
      })),
      taxes: hasTaxes
        ? {
            landPct: fractionToPercent(taxes.land_assumptions_pct),
            slaPct: fractionToPercent(taxes.sla_multiplier_pct),
            bonusPct: fractionToPercent(taxes.bonus_amount_pct),
            taxRatePct: fractionToPercent(taxes.tax_rate_pct),
          }
        : { ...STANDARD_TAXES },
      revenue: {
        low: money(revenue?.scenarios?.low?.forecasted_revenue),
        mid: money(revenue?.scenarios?.mid?.forecasted_revenue),
        high: money(revenue?.scenarios?.high?.forecasted_revenue),
        coHostingPct: revenue ? fractionToPercent(revenue.co_hosting_fee_pct) : "",
        appreciationPct: revenue ? fractionToPercent(revenue.annual_re_appreciation_pct) : "",
      },
      tags,
    },
  };
}

/* ----------------------------------------------------------- form → calc - */

export function toCalcInputs(values: UnderwritingFormValues): CalcInputs {
  return {
    purchasePrice: readNumber(values, "purchase.purchasePrice"),
    downPaymentPct: readNumber(values, "purchase.downPaymentPct"),
    interestRatePct: readNumber(values, "purchase.interestRatePct"),
    termYears: readNumber(values, "purchase.termYears"),
    closingCostsPct: readNumber(values, "purchase.closingCostsPct"),
    optimizationTotal: lineItemsTotal(values.optimizationItems, "optimization"),
    opexMonthly: lineItemsTotal(values.operatingExpenses, "opex"),
    landPct: readNumber(values, "taxes.landPct"),
    slaPct: readNumber(values, "taxes.slaPct"),
    bonusPct: readNumber(values, "taxes.bonusPct"),
    taxRatePct: readNumber(values, "taxes.taxRatePct"),
    revenue: {
      low: readNumber(values, "revenue.low"),
      mid: readNumber(values, "revenue.mid"),
      high: readNumber(values, "revenue.high"),
    },
    coHostingPct: readNumber(values, "revenue.coHostingPct"),
    appreciationPct: readNumber(values, "revenue.appreciationPct"),
  };
}

/* -------------------------------------------------------- form → payload - */

function allValid(values: UnderwritingFormValues, names: NumberFieldName[]): boolean {
  return names.every((name) => checkNumber(getFieldValue(values, name), NUMBER_FIELD_BY_NAME[name]).status === "ok");
}

function num(values: UnderwritingFormValues, name: NumberFieldName): number {
  return readNumber(values, name) as number;
}

type LineItemPayload = { rows: { label: string; amount: number }[]; indexes: number[] } | null;

function lineItemPayload(rows: LineItemValues[], kind: LineItemKind): LineItemPayload {
  const out: { label: string; amount: number }[] = [];
  const indexes: number[] = [];
  for (const [index, row] of rows.entries()) {
    const check = checkLineItem(row, kind);
    if (check.status === "invalid") return null;
    if (check.status === "ok") {
      out.push({ label: check.label, amount: check.amount });
      indexes.push(index);
    }
  }
  return { rows: out, indexes };
}

export type BuiltPayload = {
  payload: SaveUnderwritingPayload;
  /** Sections held back because they still contain errors. */
  pendingSections: SectionId[];
  /** Maps payload row positions back to form rows (empty rows are skipped). */
  rowIndexes: { optimization: number[]; opex: number[] };
};

/**
 * Builds the PUT/submit body. Only sections that are fully valid are sent:
 * the API rejects the whole request if any section it receives is invalid,
 * so one half-typed field must never block saving everything else.
 * Percentages go from 0–100 to the API's 0–1 fractions here.
 */
export function buildPayload(values: UnderwritingFormValues): BuiltPayload {
  const payload: SaveUnderwritingPayload = {};
  const pendingSections: SectionId[] = [];
  const zeroOop = hasZeroOutOfPocket(values);

  const purchaseNames: NumberFieldName[] = [
    "purchase.purchasePrice",
    "purchase.downPaymentPct",
    "purchase.interestRatePct",
    "purchase.termYears",
    "purchase.closingCostsPct",
  ];
  if (allValid(values, purchaseNames) && !zeroOop) {
    payload.purchase_details = {
      purchase_price: moneyToString(num(values, "purchase.purchasePrice")),
      down_payment_pct: percentToFraction(num(values, "purchase.downPaymentPct")),
      interest_rate: percentToFraction(num(values, "purchase.interestRatePct")),
      mortgage_years: num(values, "purchase.termYears"),
      closing_costs_pct: percentToFraction(num(values, "purchase.closingCostsPct")),
    };
  } else {
    pendingSections.push("purchase");
  }

  const optimization = lineItemPayload(values.optimizationItems, "optimization");
  if (optimization && !zeroOop) {
    payload.optimization_items = optimization.rows.map((row) => ({
      category: row.label,
      total_price: moneyToString(row.amount),
    }));
  } else {
    pendingSections.push("optimization");
  }

  const opex = lineItemPayload(values.operatingExpenses, "opex");
  if (opex) {
    payload.operating_expenses = opex.rows.map((row) => ({
      expense_name: row.label,
      monthly_amount: moneyToString(row.amount),
    }));
  } else {
    pendingSections.push("opex");
  }

  if (allValid(values, ["taxes.landPct", "taxes.slaPct", "taxes.bonusPct", "taxes.taxRatePct"])) {
    payload.taxes = {
      land_assumptions_pct: percentToFraction(num(values, "taxes.landPct")),
      sla_multiplier_pct: percentToFraction(num(values, "taxes.slaPct")),
      bonus_amount_pct: percentToFraction(num(values, "taxes.bonusPct")),
      tax_rate_pct: percentToFraction(num(values, "taxes.taxRatePct")),
    };
  } else {
    pendingSections.push("taxes");
  }

  if (
    allValid(values, [
      "revenue.low",
      "revenue.mid",
      "revenue.high",
      "revenue.coHostingPct",
      "revenue.appreciationPct",
    ])
  ) {
    payload.forecasted_revenue = {
      co_hosting_fee_pct: percentToFraction(num(values, "revenue.coHostingPct")),
      annual_re_appreciation_pct: percentToFraction(num(values, "revenue.appreciationPct")),
      scenarios: {
        low: { forecasted_revenue: moneyToString(num(values, "revenue.low")) },
        mid: { forecasted_revenue: moneyToString(num(values, "revenue.mid")) },
        high: { forecasted_revenue: moneyToString(num(values, "revenue.high")) },
      },
    };
  } else {
    pendingSections.push("revenue");
  }

  payload.tags = Object.fromEntries(DEAL_TAG_KEYS.map((key) => [key, Boolean(values.tags[key])]));

  return {
    payload,
    pendingSections,
    rowIndexes: { optimization: optimization?.indexes ?? [], opex: opex?.indexes ?? [] },
  };
}

/* ----------------------------------------------- API errors → form paths - */

const API_FIELD_TO_FORM: Record<string, string> = {
  "purchase_details.purchase_price": "purchase.purchasePrice",
  "purchase_details.down_payment_pct": "purchase.downPaymentPct",
  "purchase_details.interest_rate": "purchase.interestRatePct",
  "purchase_details.mortgage_years": "purchase.termYears",
  "purchase_details.closing_costs_pct": "purchase.closingCostsPct",
  "taxes.land_assumptions_pct": "taxes.landPct",
  "taxes.sla_multiplier_pct": "taxes.slaPct",
  "taxes.bonus_amount_pct": "taxes.bonusPct",
  "taxes.tax_rate_pct": "taxes.taxRatePct",
  "forecasted_revenue.co_hosting_fee_pct": "revenue.coHostingPct",
  "forecasted_revenue.annual_re_appreciation_pct": "revenue.appreciationPct",
  "forecasted_revenue.scenarios.low.forecasted_revenue": "revenue.low",
  "forecasted_revenue.scenarios.mid.forecasted_revenue": "revenue.mid",
  "forecasted_revenue.scenarios.high.forecasted_revenue": "revenue.high",
};

/** Translates an API validation path (`purchase_details.down_payment_pct`) to a form field path. */
export function apiPathToFormPath(path: string, rowIndexes: BuiltPayload["rowIndexes"]): string | null {
  if (API_FIELD_TO_FORM[path]) return API_FIELD_TO_FORM[path];
  const row = /^(optimization_items|operating_expenses)\.(\d+)\.(\w+)$/.exec(path);
  if (!row) return null;
  const [, list, rawIndex, field] = row;
  const isOptimization = list === "optimization_items";
  const formIndex = (isOptimization ? rowIndexes.optimization : rowIndexes.opex)[Number(rawIndex)] ?? Number(rawIndex);
  const formList = isOptimization ? "optimizationItems" : "operatingExpenses";
  const formField = field === "category" || field === "expense_name" ? "label" : "amount";
  return `${formList}.${formIndex}.${formField}`;
}
