import { DEAL_TAG_KEYS, type DealTagKey } from "@/lib/api/schemas";

import type { UnderwritingFormValues } from "./fields";

/** The brief: "Most training deals use 20%, 25%, 60% and 37%." */
export const STANDARD_TAXES: UnderwritingFormValues["taxes"] = {
  landPct: "20",
  slaPct: "25",
  bonusPct: "60",
  taxRatePct: "37",
};

export const OPTIMIZATION_SUGGESTIONS = [
  "Furniture & design",
  "Hot tub",
  "Game room",
  "Fire pit & deck",
  "Pool",
  "Themed bedrooms",
];

export const OPEX_SUGGESTIONS = [
  "Utilities",
  "Internet",
  "Insurance",
  "Property taxes",
  "Supplies",
  "Software",
  "Maintenance reserve",
  "Lawn & snow",
  "Pool service",
  "HOA",
];

export type DealTagGroup = "Condition" | "Positioning" | "Returns" | "Operations";

export const DEAL_TAGS: { key: DealTagKey; label: string; hint: string; group: DealTagGroup }[] = [
  { key: "turnkey", label: "Turnkey", hint: "Ready to host with little or no work", group: "Condition" },
  { key: "furnished", label: "Furnished", hint: "Sold with furniture included", group: "Condition" },
  { key: "new_construction", label: "New construction", hint: "Newly built or under construction", group: "Condition" },
  { key: "existing_airbnb", label: "Existing Airbnb", hint: "Already operating as a short-term rental", group: "Condition" },
  { key: "luxury", label: "Luxury", hint: "Premium finishes and price point", group: "Positioning" },
  { key: "waterfront", label: "Waterfront", hint: "On a lake, river or beach", group: "Positioning" },
  { key: "remote", label: "Remote", hint: "Far from towns or attractions", group: "Positioning" },
  { key: "add_inground_pool", label: "Add in-ground pool", hint: "Pool install is part of the plan", group: "Positioning" },
  { key: "high_cash_on_cash", label: "High cash-on-cash", hint: "Strong return on cash invested", group: "Returns" },
  { key: "low_cash_on_cash", label: "Low cash-on-cash", hint: "Thin return on cash invested", group: "Returns" },
  { key: "tax_efficient", label: "Tax efficient", hint: "Large first-year depreciation benefit", group: "Returns" },
  { key: "arv", label: "ARV", hint: "After-repair value play", group: "Returns" },
  { key: "can_support_cohost", label: "Can support co-host", hint: "Margins leave room for a co-host fee", group: "Operations" },
];

export const DEAL_TAG_GROUPS: DealTagGroup[] = ["Condition", "Positioning", "Returns", "Operations"];

export function emptyTags(): Record<DealTagKey, boolean> {
  return Object.fromEntries(DEAL_TAG_KEYS.map((key) => [key, false])) as Record<DealTagKey, boolean>;
}

export function emptyFormValues(): UnderwritingFormValues {
  return {
    purchase: { purchasePrice: "", downPaymentPct: "", interestRatePct: "", termYears: "", closingCostsPct: "" },
    optimizationItems: [],
    operatingExpenses: [],
    taxes: { ...STANDARD_TAXES },
    revenue: { low: "", mid: "", high: "", coHostingPct: "", appreciationPct: "" },
    tags: emptyTags(),
  };
}
