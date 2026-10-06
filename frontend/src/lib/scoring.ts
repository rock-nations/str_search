import type { Rating, ScoreBreakdown, Submission } from "@/lib/api/schemas";
import { formatMoney, formatPercent } from "@/lib/format";

/** Mirrors `backend/app/services/scoring_service.py`. Both limits are inclusive. */
export const BEST_THRESHOLD = 0.1;
export const MEDIUM_THRESHOLD = 0.25;

export const RATING_META: Record<Rating, { label: string; score: number; range: string }> = {
  best: { label: "Best", score: 100, range: "Within 10% of the analyst" },
  medium: { label: "Medium", score: 70, range: "Within 25% of the analyst" },
  low: { label: "Low", score: 40, range: "More than 25% away" },
};

/** (candidate − reference) ÷ reference. Positive means the trainee forecast higher. */
export function signedDeviation(candidate: number | null, reference: number | null): number | null {
  if (candidate === null || reference === null || reference === 0) return null;
  return (candidate - reference) / reference;
}

/** "Your Mid forecast of $130,000 was 4.0% above the analyst's $125,000." */
export function describeDeviation(breakdown: Pick<ScoreBreakdown, "candidate" | "reference">): string {
  const { candidate, reference } = breakdown;
  if (candidate === null) return "No Mid forecast was submitted, so this attempt scored Low.";
  if (reference === null) return `Your Mid forecast was ${formatMoney(candidate)}.`;
  const deviation = signedDeviation(candidate, reference);
  if (deviation === null || Math.abs(deviation) < 0.0005) {
    return `Your Mid forecast of ${formatMoney(candidate)} matched the analyst's exactly.`;
  }
  const direction = deviation > 0 ? "above" : "below";
  return `Your Mid forecast of ${formatMoney(candidate)} was ${formatPercent(Math.abs(deviation))} ${direction} the analyst's ${formatMoney(reference)}.`;
}

export type BandRanges = {
  best: [number, number];
  medium: [number, number];
};

export function bandRanges(reference: number, best = BEST_THRESHOLD, medium = MEDIUM_THRESHOLD): BandRanges {
  return {
    best: [reference * (1 - best), reference * (1 + best)],
    medium: [reference * (1 - medium), reference * (1 + medium)],
  };
}

export function formatRange([low, high]: [number, number]): string {
  return `${formatMoney(low)} – ${formatMoney(high)}`;
}

/** What it would have taken to reach the next band, or null at Best. */
export function nextBandHint(breakdown: ScoreBreakdown): string | null {
  if (breakdown.rating === "best" || breakdown.reference === null) return null;
  const ranges = bandRanges(
    breakdown.reference,
    breakdown.best_threshold ?? BEST_THRESHOLD,
    breakdown.medium_threshold ?? MEDIUM_THRESHOLD,
  );
  if (breakdown.rating === "medium") {
    return `A Mid forecast between ${formatRange(ranges.best)} would have scored Best.`;
  }
  return `A Mid forecast between ${formatRange(ranges.medium)} would have scored at least Medium.`;
}

export type RankedSubmission = Submission & {
  rank: number;
  /** 1 for the first attempt on this property, 2 for the second, … */
  attemptNumber: number;
  signedDeviation: number | null;
};

/**
 * Leaderboard ordering: closest to the analyst first. Ties share a rank and
 * are listed oldest first. The API has no trainee identity, so each graded
 * attempt is one entry.
 */
export function rankSubmissions(submissions: Submission[]): RankedSubmission[] {
  const chronological = [...submissions].sort(
    (a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime() || a.id - b.id,
  );
  const attemptNumbers = new Map(chronological.map((s, index) => [s.id, index + 1]));

  const deviationOf = (s: Submission) => s.breakdown.deviation ?? Number.POSITIVE_INFINITY;
  const sorted = [...submissions].sort(
    (a, b) =>
      deviationOf(a) - deviationOf(b) ||
      new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime() ||
      a.id - b.id,
  );

  let previousDeviation: number | null = null;
  let previousRank = 0;
  return sorted.map((submission, index) => {
    const deviation = deviationOf(submission);
    const rank = previousDeviation !== null && deviation === previousDeviation ? previousRank : index + 1;
    previousDeviation = deviation;
    previousRank = rank;
    return {
      ...submission,
      rank,
      attemptNumber: attemptNumbers.get(submission.id) ?? index + 1,
      signedDeviation: signedDeviation(submission.breakdown.candidate, submission.breakdown.reference),
    };
  });
}

export function ordinal(n: number): string {
  const suffixes: Record<string, string> = { one: "st", two: "nd", few: "rd", other: "th" };
  const rule = new Intl.PluralRules("en-US", { type: "ordinal" }).select(n);
  return `${n}${suffixes[rule] ?? "th"}`;
}
