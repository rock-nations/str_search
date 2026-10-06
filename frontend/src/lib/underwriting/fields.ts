import type { DealTagKey } from "@/lib/api/schemas";
import { isBlank, parseNumber } from "@/lib/parse";

/* ------------------------------------------------------------ form shape -- */

/** A row in the optimization list or the operating-expense list. */
export type LineItemValues = { label: string; amount: string };

/**
 * Form values in the units a person types: money in dollars, percentages as
 * 0–100. Inputs keep the raw string so half-typed values ("6.") survive.
 */
export type UnderwritingFormValues = {
  purchase: {
    purchasePrice: string;
    downPaymentPct: string;
    interestRatePct: string;
    termYears: string;
    closingCostsPct: string;
  };
  optimizationItems: LineItemValues[];
  operatingExpenses: LineItemValues[];
  taxes: {
    landPct: string;
    slaPct: string;
    bonusPct: string;
    taxRatePct: string;
  };
  revenue: {
    low: string;
    mid: string;
    high: string;
    coHostingPct: string;
    appreciationPct: string;
  };
  tags: Record<DealTagKey, boolean>;
};

/* ------------------------------------------------------- steps/sections -- */

export type StepId = "financials" | "analysis" | "tags" | "review";
export type SectionId = "purchase" | "optimization" | "opex" | "taxes" | "revenue" | "tags";

export const STEPS: { id: StepId; label: string; description: string }[] = [
  { id: "financials", label: "Financials", description: "What the deal costs" },
  { id: "analysis", label: "Analysis", description: "What the deal earns" },
  { id: "tags", label: "Deal tags", description: "Label the deal" },
  { id: "review", label: "Review & submit", description: "Check and send" },
];

export const SECTIONS: Record<SectionId, { title: string; step: StepId; anchor: string }> = {
  purchase: { title: "Purchase & financing", step: "financials", anchor: "section-purchase" },
  optimization: { title: "Optimization list", step: "financials", anchor: "section-optimization" },
  opex: { title: "Operating expenses", step: "financials", anchor: "section-opex" },
  taxes: { title: "Taxes", step: "financials", anchor: "section-taxes" },
  revenue: { title: "Revenue scenarios", step: "analysis", anchor: "section-revenue" },
  tags: { title: "Deal tags", step: "tags", anchor: "section-tags" },
};

export function isStepId(value: string | null | undefined): value is StepId {
  return STEPS.some((step) => step.id === value);
}

/* ------------------------------------------------------ number fields ---- */

export type NumberFieldName =
  | "purchase.purchasePrice"
  | "purchase.downPaymentPct"
  | "purchase.interestRatePct"
  | "purchase.termYears"
  | "purchase.closingCostsPct"
  | "taxes.landPct"
  | "taxes.slaPct"
  | "taxes.bonusPct"
  | "taxes.taxRatePct"
  | "revenue.low"
  | "revenue.mid"
  | "revenue.high"
  | "revenue.coHostingPct"
  | "revenue.appreciationPct";

export type NumberKind = "money" | "percent" | "years";

export type NumberFieldSpec = {
  name: NumberFieldName;
  label: string;
  section: SectionId;
  kind: NumberKind;
  min: number;
  max: number;
  /** When true the value must be strictly greater than `min`. */
  minExclusive?: boolean;
  integer?: boolean;
};

const percent = (name: NumberFieldName, label: string, section: SectionId): NumberFieldSpec => ({
  name,
  label,
  section,
  kind: "percent",
  min: 0,
  max: 100,
});

const revenue = (name: NumberFieldName, label: string): NumberFieldSpec => ({
  name,
  label,
  section: "revenue",
  kind: "money",
  min: 0,
  max: 100_000_000,
});

/** Every required number input, in the order a trainee meets them. */
export const NUMBER_FIELDS: NumberFieldSpec[] = [
  {
    name: "purchase.purchasePrice",
    label: "Purchase price",
    section: "purchase",
    kind: "money",
    min: 0,
    minExclusive: true,
    max: 100_000_000,
  },
  percent("purchase.downPaymentPct", "Down payment", "purchase"),
  percent("purchase.interestRatePct", "Interest rate", "purchase"),
  {
    name: "purchase.termYears",
    label: "Loan term",
    section: "purchase",
    kind: "years",
    min: 1,
    max: 50,
    integer: true,
  },
  percent("purchase.closingCostsPct", "Closing costs", "purchase"),
  percent("taxes.landPct", "Land value", "taxes"),
  percent("taxes.slaPct", "Short-life asset multiplier", "taxes"),
  percent("taxes.bonusPct", "Bonus depreciation", "taxes"),
  percent("taxes.taxRatePct", "Tax rate", "taxes"),
  revenue("revenue.low", "Low revenue"),
  revenue("revenue.mid", "Mid revenue"),
  revenue("revenue.high", "High revenue"),
  percent("revenue.coHostingPct", "Co-hosting fee", "revenue"),
  percent("revenue.appreciationPct", "Annual appreciation", "revenue"),
];

export const NUMBER_FIELD_BY_NAME = Object.fromEntries(
  NUMBER_FIELDS.map((spec) => [spec.name, spec]),
) as Record<NumberFieldName, NumberFieldSpec>;

export type FieldCheck =
  | { status: "ok"; value: number }
  | { status: "missing" | "invalid"; value: null; message: string };

function rangeMessage(spec: NumberFieldSpec): string {
  switch (spec.kind) {
    case "percent":
      return `${spec.label} must be between ${spec.min}% and ${spec.max}%`;
    case "years":
      return `${spec.label} must be ${spec.min}–${spec.max} years`;
    case "money":
      return spec.minExclusive
        ? `${spec.label} must be more than $${spec.min}`
        : `${spec.label} can't be negative`;
  }
}

/** Validates one raw input against its spec. Shared by the form and the review checklist. */
export function checkNumber(raw: string | undefined, spec: NumberFieldSpec): FieldCheck {
  if (isBlank(raw)) {
    return { status: "missing", value: null, message: `${spec.label} is required` };
  }
  const value = parseNumber(raw);
  if (value === null) {
    return { status: "invalid", value: null, message: `${spec.label} must be a number` };
  }
  const belowMin = spec.minExclusive ? value <= spec.min : value < spec.min;
  if (belowMin || value > spec.max) {
    if (spec.kind === "money" && value > spec.max) {
      return { status: "invalid", value: null, message: `${spec.label} looks too large` };
    }
    return { status: "invalid", value: null, message: rangeMessage(spec) };
  }
  if (spec.integer && !Number.isInteger(value)) {
    return { status: "invalid", value: null, message: `${spec.label} must be a whole number of years` };
  }
  return { status: "ok", value };
}

/* --------------------------------------------------------- line items ---- */

export type LineItemKind = "optimization" | "opex";

export const LINE_ITEM_COPY: Record<
  LineItemKind,
  { listName: "optimizationItems" | "operatingExpenses"; labelName: string; amountName: string; noun: string }
> = {
  optimization: {
    listName: "optimizationItems",
    labelName: "Category",
    amountName: "Amount",
    noun: "setup cost",
  },
  opex: {
    listName: "operatingExpenses",
    labelName: "Expense",
    amountName: "Monthly amount",
    noun: "expense",
  },
};

export type LineItemCheck =
  | { status: "blank" }
  | { status: "ok"; label: string; amount: number }
  | { status: "invalid"; field: "label" | "amount"; message: string };

/** A row is ignored when completely empty, valid when both parts are filled. */
export function checkLineItem(row: LineItemValues, kind: LineItemKind): LineItemCheck {
  const copy = LINE_ITEM_COPY[kind];
  const labelBlank = isBlank(row.label);
  const amountBlank = isBlank(row.amount);
  if (labelBlank && amountBlank) return { status: "blank" };
  if (labelBlank) return { status: "invalid", field: "label", message: `${copy.labelName} is required` };
  if (amountBlank) return { status: "invalid", field: "amount", message: `${copy.amountName} is required` };
  const amount = parseNumber(row.amount);
  if (amount === null) return { status: "invalid", field: "amount", message: `${copy.amountName} must be a number` };
  if (amount < 0) return { status: "invalid", field: "amount", message: `${copy.amountName} can't be negative` };
  return { status: "ok", label: row.label.trim(), amount };
}

/** Sum of the valid rows; invalid and empty rows count as zero. */
export function lineItemsTotal(rows: LineItemValues[] | undefined, kind: LineItemKind): number {
  return (rows ?? []).reduce((total, row) => {
    const check = checkLineItem(row, kind);
    return check.status === "ok" ? total + check.amount : total;
  }, 0);
}

/* ------------------------------------------------------------- helpers --- */

/** Reads a nested value like "purchase.downPaymentPct" from the form values. */
export function getFieldValue(values: UnderwritingFormValues, name: NumberFieldName): string {
  const [group, key] = name.split(".") as [keyof UnderwritingFormValues, string];
  const bucket = values[group] as Record<string, string> | undefined;
  return bucket?.[key] ?? "";
}

export function readNumber(values: UnderwritingFormValues, name: NumberFieldName): number | null {
  const check = checkNumber(getFieldValue(values, name), NUMBER_FIELD_BY_NAME[name]);
  return check.status === "ok" ? check.value : null;
}

/**
 * Whether the trainee has typed anything into a section beyond the prefills
 * (listing price, standard taxes). Used to decide if an unsaved section is
 * worth warning about: an untouched section has nothing to lose.
 */
export function sectionHasUserInput(values: UnderwritingFormValues, section: SectionId): boolean {
  const filled = (raw: string | undefined) => !isBlank(raw);
  switch (section) {
    case "purchase":
      return (
        filled(values.purchase?.downPaymentPct) ||
        filled(values.purchase?.interestRatePct) ||
        filled(values.purchase?.termYears) ||
        filled(values.purchase?.closingCostsPct) ||
        checkNumber(values.purchase?.purchasePrice, NUMBER_FIELD_BY_NAME["purchase.purchasePrice"]).status !== "ok"
      );
    case "taxes":
      return true;
    case "revenue":
      return Object.values(values.revenue ?? {}).some(filled);
    case "optimization":
      return (values.optimizationItems ?? []).some((row) => filled(row.label) || filled(row.amount));
    case "opex":
      return (values.operatingExpenses ?? []).some((row) => filled(row.label) || filled(row.amount));
    case "tags":
      return false;
  }
}
