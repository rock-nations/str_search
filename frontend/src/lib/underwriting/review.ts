import type { CalcResult } from "./calc";
import {
  LINE_ITEM_COPY,
  NUMBER_FIELDS,
  SECTIONS,
  checkLineItem,
  checkNumber,
  getFieldValue,
  readNumber,
  type LineItemKind,
  type SectionId,
  type StepId,
  type UnderwritingFormValues,
} from "./fields";
import { OOP_ERROR_MESSAGE, hasZeroOutOfPocket } from "./form-schema";

export type ReviewStatus = "complete" | "missing" | "invalid";

export type ReviewItem = {
  id: string;
  label: string;
  status: ReviewStatus;
  message?: string;
  /** Form path to focus when the trainee clicks "Fix". */
  fieldPath: string;
  section: SectionId;
  step: StepId;
};

export type ReviewWarning = {
  id: string;
  message: string;
  step: StepId;
  fieldPath?: string;
  section: SectionId;
};

export type ReviewSection = {
  id: SectionId;
  title: string;
  step: StepId;
  items: ReviewItem[];
  optional?: boolean;
};

export type StepProgress = { missing: number; invalid: number; complete: boolean };

export type ReviewModel = {
  sections: ReviewSection[];
  warnings: ReviewWarning[];
  missing: number;
  invalid: number;
  /** Items that must be fixed before submitting. */
  blocking: number;
  completeRequired: number;
  totalRequired: number;
  byStep: Record<StepId, StepProgress>;
};

function lineItemReview(values: UnderwritingFormValues, kind: LineItemKind, section: SectionId): ReviewItem[] {
  const copy = LINE_ITEM_COPY[kind];
  const rows = values[copy.listName] ?? [];
  const items: ReviewItem[] = [];
  rows.forEach((row, index) => {
    const check = checkLineItem(row, kind);
    if (check.status !== "invalid") return;
    items.push({
      id: `${copy.listName}.${index}`,
      label: `Row ${index + 1}${row.label.trim() ? ` · ${row.label.trim()}` : ""}`,
      status: "invalid",
      message: check.message,
      fieldPath: `${copy.listName}.${index}.${check.field}`,
      section,
      step: SECTIONS[section].step,
    });
  });
  return items;
}

export function buildReview(values: UnderwritingFormValues, calc: CalcResult): ReviewModel {
  const numberItems = NUMBER_FIELDS.map<ReviewItem>((spec) => {
    const check = checkNumber(getFieldValue(values, spec.name), spec);
    return {
      id: spec.name,
      label: spec.label,
      status: check.status === "ok" ? "complete" : check.status,
      message: check.status === "ok" ? undefined : check.message,
      fieldPath: spec.name,
      section: spec.section,
      step: SECTIONS[spec.section].step,
    };
  });

  if (hasZeroOutOfPocket(values)) {
    numberItems.push({
      id: "total-out-of-pocket",
      label: "Total out of pocket",
      status: "invalid",
      message: OOP_ERROR_MESSAGE,
      fieldPath: "purchase.downPaymentPct",
      section: "purchase",
      step: "financials",
    });
  }

  const sectionItems = (id: SectionId) => numberItems.filter((item) => item.section === id);

  const sections: ReviewSection[] = [
    { id: "purchase", title: SECTIONS.purchase.title, step: "financials", items: sectionItems("purchase") },
    {
      id: "optimization",
      title: SECTIONS.optimization.title,
      step: "financials",
      items: lineItemReview(values, "optimization", "optimization"),
      optional: true,
    },
    {
      id: "opex",
      title: SECTIONS.opex.title,
      step: "financials",
      items: lineItemReview(values, "opex", "opex"),
      optional: true,
    },
    { id: "taxes", title: SECTIONS.taxes.title, step: "financials", items: sectionItems("taxes") },
    { id: "revenue", title: SECTIONS.revenue.title, step: "analysis", items: sectionItems("revenue") },
  ];

  const allItems = sections.flatMap((section) => section.items);
  const missing = allItems.filter((item) => item.status === "missing").length;
  const invalid = allItems.filter((item) => item.status === "invalid").length;
  const requiredNumberItems = numberItems.filter((item) => item.id !== "total-out-of-pocket");

  const stepProgress = (step: StepId): StepProgress => {
    const items = allItems.filter((item) => item.step === step);
    const stepMissing = items.filter((item) => item.status === "missing").length;
    const stepInvalid = items.filter((item) => item.status === "invalid").length;
    return { missing: stepMissing, invalid: stepInvalid, complete: stepMissing + stepInvalid === 0 };
  };

  return {
    sections,
    warnings: buildWarnings(values, calc),
    missing,
    invalid,
    blocking: missing + invalid,
    completeRequired: requiredNumberItems.filter((item) => item.status === "complete").length,
    totalRequired: requiredNumberItems.length,
    byStep: {
      financials: stepProgress("financials"),
      analysis: stepProgress("analysis"),
      tags: { missing: 0, invalid: 0, complete: true },
      review: { missing, invalid, complete: missing + invalid === 0 },
    },
  };
}

/** Non-blocking checks: things an analyst would want a second look at. */
function buildWarnings(values: UnderwritingFormValues, calc: CalcResult): ReviewWarning[] {
  const warnings: ReviewWarning[] = [];
  const low = readNumber(values, "revenue.low");
  const mid = readNumber(values, "revenue.mid");
  const high = readNumber(values, "revenue.high");

  if (low !== null && mid !== null && low > mid) {
    warnings.push({
      id: "low-above-mid",
      message: "Your Low forecast is above Mid. Low should be the cautious year.",
      step: "analysis",
      section: "revenue",
      fieldPath: "revenue.low",
    });
  }
  if (mid !== null && high !== null && mid > high) {
    warnings.push({
      id: "mid-above-high",
      message: "Your Mid forecast is above High. High should be the strong year.",
      step: "analysis",
      section: "revenue",
      fieldPath: "revenue.high",
    });
  }

  const rate = readNumber(values, "purchase.interestRatePct");
  if (rate !== null && rate > 15) {
    warnings.push({
      id: "high-rate",
      message: `An interest rate of ${rate}% is unusually high. Check it isn't a typo.`,
      step: "financials",
      section: "purchase",
      fieldPath: "purchase.interestRatePct",
    });
  }

  const closing = readNumber(values, "purchase.closingCostsPct");
  if (closing !== null && closing > 10) {
    warnings.push({
      id: "high-closing",
      message: `Closing costs of ${closing}% are well above the usual 2–5%.`,
      step: "financials",
      section: "purchase",
      fieldPath: "purchase.closingCostsPct",
    });
  }

  const opexRows = (values.operatingExpenses ?? []).filter((row) => checkLineItem(row, "opex").status === "ok");
  if (opexRows.length === 0) {
    warnings.push({
      id: "no-opex",
      message: "No operating expenses yet. Most properties carry utilities, insurance and property tax.",
      step: "financials",
      section: "opex",
    });
  }

  for (const kind of ["optimization", "opex"] as const) {
    const copy = LINE_ITEM_COPY[kind];
    const blank = (values[copy.listName] ?? []).filter((row) => checkLineItem(row, kind).status === "blank").length;
    if (blank > 0) {
      warnings.push({
        id: `blank-${kind}`,
        message: `${blank} empty ${blank === 1 ? "row" : "rows"} in ${SECTIONS[kind].title} will be ignored.`,
        step: "financials",
        section: kind,
      });
    }
  }

  const midScenario = calc.scenarios.mid;
  if (midScenario && midScenario.freeCashFlow < 0) {
    warnings.push({
      id: "negative-cash-flow",
      message: "The Mid scenario loses money each year after the mortgage. That can be right, but confirm it.",
      step: "analysis",
      section: "revenue",
    });
  }

  if (values.tags?.high_cash_on_cash && values.tags?.low_cash_on_cash) {
    warnings.push({
      id: "conflicting-coc-tags",
      message: "Both High and Low cash-on-cash are tagged. Pick the one that fits.",
      step: "tags",
      section: "tags",
    });
  }

  return warnings;
}
