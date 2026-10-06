import { z } from "zod";

import { DEAL_TAG_KEYS, type DealTagKey } from "@/lib/api/schemas";

import {
  NUMBER_FIELD_BY_NAME,
  checkLineItem,
  checkNumber,
  lineItemsTotal,
  readNumber,
  type LineItemKind,
  type NumberFieldName,
  type UnderwritingFormValues,
} from "./fields";

/**
 * React Hook Form schema. Built from the same field registry as the review
 * checklist, so an error shown inline and the checklist can never disagree.
 */
const numberInput = (name: NumberFieldName) =>
  z.string().superRefine((raw, ctx) => {
    const check = checkNumber(raw, NUMBER_FIELD_BY_NAME[name]);
    if (check.status !== "ok") ctx.addIssue({ code: "custom", message: check.message });
  });

const lineItems = (kind: LineItemKind) =>
  z.array(z.object({ label: z.string(), amount: z.string() })).superRefine((rows, ctx) => {
    rows.forEach((row, index) => {
      const check = checkLineItem(row, kind);
      if (check.status === "invalid") {
        ctx.addIssue({ code: "custom", path: [index, check.field], message: check.message });
      }
    });
  });

const tagsShape = Object.fromEntries(DEAL_TAG_KEYS.map((key) => [key, z.boolean()])) as Record<
  DealTagKey,
  z.ZodBoolean
>;

export const OOP_ERROR_MESSAGE =
  "Total out of pocket is $0. Add a down payment, closing costs or setup spend.";

/** True when purchase inputs are valid but leave nothing out of pocket (the API rejects this). */
export function hasZeroOutOfPocket(values: UnderwritingFormValues): boolean {
  const price = readNumber(values, "purchase.purchasePrice");
  const down = readNumber(values, "purchase.downPaymentPct");
  const closing = readNumber(values, "purchase.closingCostsPct");
  if (price === null || down === null || closing === null) return false;
  const total = price * (down / 100) + price * (closing / 100) + lineItemsTotal(values.optimizationItems, "optimization");
  return total <= 0;
}

export const underwritingFormSchema = z
  .object({
    purchase: z.object({
      purchasePrice: numberInput("purchase.purchasePrice"),
      downPaymentPct: numberInput("purchase.downPaymentPct"),
      interestRatePct: numberInput("purchase.interestRatePct"),
      termYears: numberInput("purchase.termYears"),
      closingCostsPct: numberInput("purchase.closingCostsPct"),
    }),
    optimizationItems: lineItems("optimization"),
    operatingExpenses: lineItems("opex"),
    taxes: z.object({
      landPct: numberInput("taxes.landPct"),
      slaPct: numberInput("taxes.slaPct"),
      bonusPct: numberInput("taxes.bonusPct"),
      taxRatePct: numberInput("taxes.taxRatePct"),
    }),
    revenue: z.object({
      low: numberInput("revenue.low"),
      mid: numberInput("revenue.mid"),
      high: numberInput("revenue.high"),
      coHostingPct: numberInput("revenue.coHostingPct"),
      appreciationPct: numberInput("revenue.appreciationPct"),
    }),
    tags: z.object(tagsShape),
  })
  .superRefine((values, ctx) => {
    if (hasZeroOutOfPocket(values as UnderwritingFormValues)) {
      // A cross-field rule: shown as an alert on the Purchase card, not under one input.
      ctx.addIssue({ code: "custom", path: ["purchase", "outOfPocket"], message: OOP_ERROR_MESSAGE });
    }
  });
