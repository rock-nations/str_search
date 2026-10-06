import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  dashboardSchema,
  marketSchema,
  propertySchema,
  submissionSchema,
  submitResultSchema,
  underwritingSchema,
} from "@/lib/api/schemas";

import dashboardAfterSubmit from "../../e2e/fixtures/api/dashboard-after-submit.json";
import dashboardFresh from "../../e2e/fixtures/api/dashboard-fresh.json";
import market from "../../e2e/fixtures/api/market.json";
import property from "../../e2e/fixtures/api/property.json";
import reference from "../../e2e/fixtures/api/reference-underwriting.json";
import submissions from "../../e2e/fixtures/api/submissions.json";
import submitResult from "../../e2e/fixtures/api/submit-result.json";
import draft from "../../e2e/fixtures/api/underwriting-draft.json";
import saved from "../../e2e/fixtures/api/underwriting-saved.json";

/**
 * The mocked Playwright project serves these recorded responses. If the API
 * contract (or our schemas) change, this fails before the mocks drift.
 */
describe("recorded API fixtures match the app's schemas", () => {
  it.each([
    ["dashboard-fresh", dashboardSchema, dashboardFresh],
    ["dashboard-after-submit", dashboardSchema, dashboardAfterSubmit],
    ["market", marketSchema, market],
    ["property", propertySchema, property],
    ["underwriting-draft", underwritingSchema, draft],
    ["underwriting-saved", underwritingSchema, saved],
    ["reference-underwriting", underwritingSchema, reference],
    ["submit-result", submitResultSchema, submitResult],
    ["submissions", z.array(submissionSchema), submissions],
  ] as const)("%s", (_name, schema, fixture) => {
    expect(schema.safeParse(fixture).success).toBe(true);
  });

  it("parses Decimal strings into numbers", () => {
    const parsed = submitResultSchema.parse(submitResult);
    expect(parsed.submission.breakdown.reference).toBe(125_000);
    expect(parsed.underwriting.m_cash_on_cash).toBeCloseTo(0.366, 4);
  });
});
