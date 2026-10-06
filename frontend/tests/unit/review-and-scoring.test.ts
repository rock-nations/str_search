import { describe, expect, it } from "vitest";

import { submissionSchema, type Submission } from "@/lib/api/schemas";
import { formatMoney, formatPercent, formatSignedPercent } from "@/lib/format";
import { bandRanges, describeDeviation, nextBandHint, ordinal, rankSubmissions } from "@/lib/scoring";
import { calculate } from "@/lib/underwriting/calc";
import { emptyFormValues } from "@/lib/underwriting/defaults";
import { toCalcInputs } from "@/lib/underwriting/mappers";
import { buildReview } from "@/lib/underwriting/review";

function submission(id: number, candidate: number, reference: number, minutesAgo: number): Submission {
  const deviation = Math.abs(candidate - reference) / reference;
  const rating = deviation <= 0.1 ? "best" : deviation <= 0.25 ? "medium" : "low";
  return submissionSchema.parse({
    id,
    underwriting_id: id + 100,
    reference_underwriting_id: 1,
    zpid: "41234567",
    rating,
    accuracy: rating === "best" ? "100.00" : rating === "medium" ? "70.00" : "40.00",
    breakdown: {
      rating,
      accuracy: "0",
      metric: "mid_gross_revenue",
      label: "Mid revenue forecast",
      candidate: String(candidate),
      reference: String(reference),
      deviation: deviation.toFixed(4),
      best_threshold: "0.10",
      medium_threshold: "0.25",
    },
    submitted_at: new Date(Date.UTC(2026, 9, 6, 12, 0) - minutesAgo * 60_000).toISOString(),
  });
}

describe("review model", () => {
  it("lists every required field as missing on an empty form", () => {
    const values = emptyFormValues();
    const review = buildReview(values, calculate(toCalcInputs(values)));
    // Taxes are prefilled, so 14 required numbers minus 4 tax fields are missing.
    expect(review.missing).toBe(10);
    expect(review.invalid).toBe(0);
    expect(review.byStep.financials.complete).toBe(false);
    expect(review.byStep.analysis.missing).toBe(5);
  });

  it("flags invalid values and warns about inverted scenarios", () => {
    const values = emptyFormValues();
    values.purchase.downPaymentPct = "120";
    values.revenue.low = "200000";
    values.revenue.mid = "100000";
    const review = buildReview(values, calculate(toCalcInputs(values)));
    const down = review.sections[0].items.find((item) => item.id === "purchase.downPaymentPct");
    expect(down?.status).toBe("invalid");
    expect(down?.message).toBe("Down payment must be between 0% and 100%");
    expect(review.warnings.map((w) => w.id)).toContain("low-above-mid");
  });
});

describe("scoring copy", () => {
  it("explains the deviation in plain language", () => {
    expect(describeDeviation({ candidate: 130_000, reference: 125_000 })).toBe(
      "Your Mid forecast of $130,000 was 4.0% above the analyst's $125,000.",
    );
    expect(describeDeviation({ candidate: 102_500, reference: 125_000 })).toBe(
      "Your Mid forecast of $102,500 was 18.0% below the analyst's $125,000.",
    );
    expect(describeDeviation({ candidate: null, reference: 125_000 })).toMatch(/No Mid forecast/);
  });

  it("matches the brief's band table", () => {
    const ranges = bandRanges(125_000);
    expect(ranges.best.map((v) => formatMoney(v))).toEqual(["$112,500", "$137,500"]);
    expect(ranges.medium.map((v) => formatMoney(v))).toEqual(["$93,750", "$156,250"]);
  });

  it("hints at the next band", () => {
    const medium = submission(1, 150_000, 125_000, 0);
    expect(nextBandHint(medium.breakdown)).toBe(
      "A Mid forecast between $112,500 – $137,500 would have scored Best.",
    );
  });
});

describe("leaderboard ranking", () => {
  it("ranks by closeness, ties share a rank, attempts are numbered chronologically", () => {
    const ranked = rankSubmissions([
      submission(1, 200_000, 125_000, 30),
      submission(2, 130_000, 125_000, 20),
      submission(3, 120_000, 125_000, 10),
      submission(4, 150_000, 125_000, 5),
    ]);
    expect(ranked.map((s) => [s.id, s.rank, s.attemptNumber])).toEqual([
      [2, 1, 2],
      [3, 1, 3],
      [4, 3, 4],
      [1, 4, 1],
    ]);
    expect(formatSignedPercent(ranked[1].signedDeviation)).toBe("−4.0%");
  });

  it("formats ordinals and percentages", () => {
    expect([1, 2, 3, 4, 11, 22].map(ordinal)).toEqual(["1st", "2nd", "3rd", "4th", "11th", "22nd"]);
    expect(formatPercent(0.366)).toBe("36.6%");
    expect(formatPercent(-0.05)).toBe("−5.0%");
    expect(formatMoney(-1234.4)).toBe("−$1,234");
  });
});
