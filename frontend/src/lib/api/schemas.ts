import { z } from "zod";

/**
 * Zod schemas that mirror the FastAPI/Pydantic response models.
 *
 * The API serialises Python `Decimal` as strings ("675000.00"), so every
 * numeric field goes through `decimal`, which accepts a string or a number
 * and always hands the app a `number | null`.
 */
export const decimal = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform((value): number | null => {
    if (value === null || value === undefined || value === "") return null;
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  });

const optionalString = z.string().nullish().transform((v) => v ?? null);
const optionalBool = z.boolean().nullish().transform((v) => v ?? false);

export const ratingSchema = z.enum(["best", "medium", "low"]);
export type Rating = z.infer<typeof ratingSchema>;

export const trainingStatusSchema = z.enum(["not_started", "in_progress", "submitted"]);
export type TrainingStatus = z.infer<typeof trainingStatusSchema>;

/* ------------------------------------------------------------ markets ---- */

export const marketSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  state: optionalString,
  region: optionalString,
  country: z.string(),
  timezone: optionalString,
  description: optionalString,
  is_active: z.boolean(),
  property_count: z.number().default(0),
});
export type Market = z.infer<typeof marketSchema>;

export const marketSummarySchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  state: optionalString,
});

/* --------------------------------------------------------- properties ---- */

export const propertySchema = z.object({
  zpid: z.string(),
  img_src: optionalString,
  detail_url: optionalString,
  price: optionalString,
  unformatted_price: optionalString,
  address: optionalString,
  address_street: optionalString,
  address_city: optionalString,
  address_state: optionalString,
  address_zipcode: optionalString,
  beds: z.number().nullish(),
  baths: z.number().nullish(),
  area: z.number().nullish(),
  home_type: optionalString,
  home_status: optionalString,
  time_on_zillow: optionalString,
  market_id: z.number().nullish(),
  market: marketSummarySchema.nullish(),
});
export type Property = z.infer<typeof propertySchema>;

/* --------------------------------------------------------- dashboard ----- */

export const dashboardPropertySchema = z.object({
  zpid: z.string(),
  address: optionalString,
  city: optionalString,
  state: optionalString,
  zipcode: optionalString,
  price: optionalString,
  unformatted_price: optionalString,
  beds: z.number().nullish(),
  baths: z.number().nullish(),
  area: z.number().nullish(),
  img_src: optionalString,
  detail_url: optionalString,
  home_type: optionalString,
  market_id: z.number().nullish(),
  market_name: optionalString,
  status: trainingStatusSchema,
  attempts: z.number(),
  latest_accuracy: decimal,
  latest_rating: ratingSchema.nullish(),
  best_accuracy: decimal,
  best_rating: ratingSchema.nullish(),
  active_underwriting_id: z.number().nullish(),
  latest_submission_id: z.number().nullish(),
});
export type DashboardProperty = z.infer<typeof dashboardPropertySchema>;

export const dashboardSchema = z.object({
  summary: z.object({
    total_properties: z.number(),
    submitted: z.number(),
    in_progress: z.number(),
    not_started: z.number(),
    average_accuracy: decimal,
  }),
  properties: z.array(dashboardPropertySchema),
});
export type Dashboard = z.infer<typeof dashboardSchema>;

/* ------------------------------------------------------ underwritings ---- */

const scenarioOutputSchema = z.object({
  forecasted_revenue: decimal,
  operating_expenses_annual: decimal,
  co_hosting_fee: decimal,
  net_operating_income: decimal,
  debt_service_annual: decimal,
  annual_free_cash_flow: decimal,
  principal_pay_down: decimal,
  annual_re_appreciation: decimal,
  annual_total_re_return_pct: decimal,
  cash_on_cash_pct: decimal,
});
export type ScenarioOutput = z.infer<typeof scenarioOutputSchema>;

export const purchaseDetailsSchema = z.object({
  purchase_price: decimal,
  down_payment_pct: decimal,
  interest_rate: decimal,
  mortgage_years: decimal,
  closing_costs_pct: decimal,
  loan_amount: decimal,
  down_payment_amount: decimal,
  closing_costs_amount: decimal,
});

export const forecastedRevenueSchema = z.object({
  co_hosting_fee_pct: decimal,
  annual_re_appreciation_pct: decimal,
  scenarios: z
    .object({
      low: scenarioOutputSchema.partial().nullish(),
      mid: scenarioOutputSchema.partial().nullish(),
      high: scenarioOutputSchema.partial().nullish(),
    })
    .nullish(),
});

export const underwritingTaxesSchema = z.object({
  land_assumptions_pct: decimal,
  sla_multiplier_pct: decimal,
  improvement_basis: decimal,
  estimated_short_life_assets: decimal,
  bonus_amount_pct: decimal,
  tax_rate_pct: decimal,
  y1_loss_from_depreciation: decimal,
  tax_savings: decimal,
});

export const DEAL_TAG_KEYS = [
  "turnkey",
  "furnished",
  "luxury",
  "tax_efficient",
  "new_construction",
  "existing_airbnb",
  "arv",
  "high_cash_on_cash",
  "low_cash_on_cash",
  "add_inground_pool",
  "waterfront",
  "remote",
  "can_support_cohost",
] as const;
export type DealTagKey = (typeof DEAL_TAG_KEYS)[number];

const tagShape = Object.fromEntries(DEAL_TAG_KEYS.map((key) => [key, optionalBool])) as Record<
  DealTagKey,
  typeof optionalBool
>;

export const underwritingSchema = z.object({
  id: z.number(),
  zpid: optionalString,
  market_id: z.number().nullish(),
  is_reference: z.boolean(),
  deal_status: optionalString,
  deal_submitted: optionalString,
  property_address: optionalString,
  street: optionalString,
  city: optionalString,
  state: optionalString,
  bedrooms: z.number().nullish(),
  bathrooms: decimal,
  purchase_price: decimal,
  total_oop: decimal,
  prr: decimal,
  budget_to_pp: decimal,
  low_gross_revenue: decimal,
  mid_gross_revenue: decimal,
  high_gross_revenue: decimal,
  l_cash_on_cash: decimal,
  m_cash_on_cash: decimal,
  h_cash_on_cash: decimal,
  optimization_total: decimal,
  operating_expense_total: decimal,
  ...tagShape,
  listing_url: optionalString,
  created_at: optionalString,
  updated_at: optionalString,
  detail: z
    .object({
      purchase_details: purchaseDetailsSchema.nullish(),
      forecasted_revenue: forecastedRevenueSchema.nullish(),
      y1_coc_incl_tax_savings: z.record(z.string(), decimal).nullish(),
    })
    .nullish(),
  taxes: underwritingTaxesSchema.nullish(),
  optimization_items: z
    .array(z.object({ id: z.number(), category: optionalString, total_price: decimal }))
    .default([]),
  operating_expenses: z
    .array(z.object({ id: z.number(), expense_name: optionalString, monthly_amount: decimal }))
    .default([]),
});
export type Underwriting = z.infer<typeof underwritingSchema>;

/* -------------------------------------------------------- submissions ---- */

export const scoreBreakdownSchema = z.object({
  rating: ratingSchema,
  accuracy: decimal,
  metric: z.string(),
  label: z.string(),
  candidate: decimal,
  reference: decimal,
  deviation: decimal,
  best_threshold: decimal,
  medium_threshold: decimal,
});
export type ScoreBreakdown = z.infer<typeof scoreBreakdownSchema>;

export const submissionSchema = z.object({
  id: z.number(),
  underwriting_id: z.number(),
  reference_underwriting_id: z.number().nullish(),
  zpid: z.string(),
  rating: ratingSchema,
  accuracy: decimal,
  breakdown: scoreBreakdownSchema,
  submitted_at: z.string(),
});
export type Submission = z.infer<typeof submissionSchema>;

export const submitResultSchema = z.object({
  submission: submissionSchema,
  underwriting: underwritingSchema,
  dashboard: dashboardSchema,
});
export type SubmitResult = z.infer<typeof submitResultSchema>;

/* ------------------------------------------------------ write payload ---- */

/** Shape of PUT /underwritings/{id} and the submit body. Values are strings. */
export type SaveUnderwritingPayload = {
  purchase_details?: {
    purchase_price: string;
    down_payment_pct: string;
    interest_rate: string;
    mortgage_years: number;
    closing_costs_pct: string;
  };
  forecasted_revenue?: {
    co_hosting_fee_pct: string;
    annual_re_appreciation_pct: string;
    scenarios: {
      low: { forecasted_revenue: string };
      mid: { forecasted_revenue: string };
      high: { forecasted_revenue: string };
    };
  };
  taxes?: {
    land_assumptions_pct: string;
    sla_multiplier_pct: string;
    bonus_amount_pct: string;
    tax_rate_pct: string;
  };
  optimization_items?: { category: string; total_price: string }[];
  operating_expenses?: { expense_name: string; monthly_amount: string }[];
  tags?: Partial<Record<DealTagKey, boolean>>;
};
