import type { Submission, Underwriting } from "@/lib/api/schemas";
import { formatPercent } from "@/lib/format";
import { BEST_THRESHOLD, MEDIUM_THRESHOLD, RATING_META, signedDeviation } from "@/lib/scoring";

import { YOU } from "./demo-team";
import type {
  CoachingNote,
  MarketResult,
  RankedTrainee,
  SkillKey,
  SkillLevel,
  SkillResult,
  TeamAttempt,
  Trainee,
  TraineeSummary,
} from "./types";

/* ---------------------------------------------------------- thresholds -- */

/** Coaching flags. Revenue is flagged earlier because it is the graded number. */
export const COACHING_THRESHOLDS = { revenue: 0.15, setup: 0.2, opex: 0.2 } as const;
/** A market is flagged when it averages below this… */
export const WEAK_MARKET_SCORE = 60;
/** …and sits at least this many points below the trainee's other properties. */
export const MARKET_GAP = 25;
/** Retake reliance: latest average beats the first-try average by this much… */
export const RETAKE_GAIN = 20;
/** …across at least this many retakes. */
export const RETAKE_MIN = 2;

export const SKILL_LABEL: Record<SkillKey, string> = {
  revenue: "Revenue forecast",
  setup: "Setup budget",
  opex: "Running costs",
};

/** Same bands as the score: within 10% is on target, within 25% is close. */
export function skillLevel(miss: number | null): SkillLevel | null {
  if (miss === null) return null;
  if (miss <= BEST_THRESHOLD + 1e-9) return "good";
  if (miss <= MEDIUM_THRESHOLD + 1e-9) return "ok";
  return "needs-work";
}

export function marketLevel(averageScore: number): SkillLevel {
  if (averageScore >= 85) return "good";
  if (averageScore >= WEAK_MARKET_SCORE) return "ok";
  return "needs-work";
}

/* ------------------------------------------------------- your attempts -- */

function relativeDiff(mine: number | null | undefined, reference: number | null | undefined): number | null {
  if (mine === null || mine === undefined || reference === null || reference === undefined || reference === 0) {
    return null;
  }
  return (mine - reference) / reference;
}

/**
 * Turns your real API submissions into team attempts. Setup and running-cost
 * deviations need your underwriting and the analyst's; they stay null until
 * those have loaded (or if they can't be loaded).
 */
export function buildYourAttempts(
  submissions: Submission[],
  underwritings: Map<number, Underwriting> = new Map(),
): TeamAttempt[] {
  const sorted = [...submissions].sort(
    (a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime() || a.id - b.id,
  );
  const counts = new Map<string, number>();
  return sorted.map((submission) => {
    const attemptNumber = (counts.get(submission.zpid) ?? 0) + 1;
    counts.set(submission.zpid, attemptNumber);
    const mine = underwritings.get(submission.underwriting_id);
    const analyst =
      submission.reference_underwriting_id === null || submission.reference_underwriting_id === undefined
        ? undefined
        : underwritings.get(submission.reference_underwriting_id);
    return {
      id: `you-${submission.id}`,
      traineeId: YOU.id,
      zpid: submission.zpid,
      attemptNumber,
      submittedAt: submission.submitted_at,
      midDeviation: signedDeviation(submission.breakdown.candidate, submission.breakdown.reference),
      setupDeviation: relativeDiff(mine?.optimization_total, analyst?.optimization_total),
      opexDeviation: relativeDiff(mine?.operating_expense_total, analyst?.operating_expense_total),
      rating: submission.rating,
      score: submission.accuracy ?? RATING_META[submission.rating].score,
      source: "api",
      submissionId: submission.id,
    };
  });
}

/* ------------------------------------------------------------ summaries -- */

const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);

function skill(key: SkillKey, latest: TeamAttempt[]): SkillResult {
  const pick = (a: TeamAttempt) =>
    key === "revenue" ? a.midDeviation : key === "setup" ? a.setupDeviation : a.opexDeviation;
  const values = latest.map(pick).filter((v): v is number => v !== null);
  const miss = mean(values.map(Math.abs));
  return { key, miss, bias: mean(values), level: skillLevel(miss) };
}

function chronological(attempts: TeamAttempt[]): TeamAttempt[] {
  return [...attempts].sort((a, b) => a.submittedAt.localeCompare(b.submittedAt) || a.id.localeCompare(b.id));
}

function coachingNotes(
  skills: Record<SkillKey, SkillResult>,
  markets: MarketResult[],
  latest: TeamAttempt[],
  marketOf: (zpid: string) => string,
  averageScore: number | null,
  firstTryAverage: number | null,
  retakes: number,
): CoachingNote[] {
  const notes: CoachingNote[] = [];
  const direction = (bias: number | null, high: string, low: string) => ((bias ?? 0) >= 0 ? high : low);

  const revenue = skills.revenue;
  if (revenue.miss !== null && revenue.miss > COACHING_THRESHOLDS.revenue) {
    notes.push({
      id: "revenue",
      kind: "revenue",
      title: "Revenue forecasts",
      detail: `Mid forecasts miss the analyst by ${formatPercent(revenue.miss, 0)} on average, usually ${direction(revenue.bias, "too high", "too low")}. This is the graded number, so it costs the most points.`,
    });
  }
  const setup = skills.setup;
  if (setup.miss !== null && setup.miss > COACHING_THRESHOLDS.setup) {
    notes.push({
      id: "setup",
      kind: "setup",
      title: "Setup budgets",
      detail: `Setup and renovation budgets run ${formatPercent(setup.miss, 0)} ${direction(setup.bias, "above", "below")} the analyst's. Review furniture, amenity and renovation pricing.`,
    });
  }
  const opex = skills.opex;
  if (opex.miss !== null && opex.miss > COACHING_THRESHOLDS.opex) {
    notes.push({
      id: "opex",
      kind: "opex",
      title: "Running costs",
      detail: `Monthly running costs run ${formatPercent(opex.miss, 0)} ${direction(opex.bias, "above", "below")} the analyst's. Check utilities, insurance and property tax.`,
    });
  }
  for (const market of markets) {
    const elsewhere = mean(latest.filter((a) => marketOf(a.zpid) !== market.market).map((a) => a.score));
    if (market.averageScore < WEAK_MARKET_SCORE && elsewhere !== null && elsewhere - market.averageScore >= MARKET_GAP) {
      notes.push({
        id: `market-${market.market}`,
        kind: "market",
        title: `${market.market} market`,
        detail: `Averages ${Math.round(market.averageScore)} on ${market.market} properties, against ${Math.round(elsewhere)} elsewhere.`,
      });
    }
  }
  if (
    averageScore !== null &&
    firstTryAverage !== null &&
    retakes >= RETAKE_MIN &&
    averageScore - firstTryAverage >= RETAKE_GAIN
  ) {
    notes.push({
      id: "retakes",
      kind: "retakes",
      title: "Relies on retakes",
      detail: `First tries average ${Math.round(firstTryAverage)}. The ${Math.round(averageScore)} average comes from ${retakes} retakes made after the analyst's numbers were revealed.`,
    });
  }
  return notes;
}

/**
 * One trainee's results. The average uses the latest attempt on each property,
 * which is the API's rule for the dashboard (confirmed by the hiring team).
 */
export function summarizeTrainee(
  trainee: Trainee,
  attempts: TeamAttempt[],
  marketOf: (zpid: string) => string,
): TraineeSummary {
  const ordered = chronological(attempts.filter((a) => a.traineeId === trainee.id));
  const latestMap = new Map<string, TeamAttempt>();
  const firstMap = new Map<string, TeamAttempt>();
  for (const attempt of ordered) {
    latestMap.set(attempt.zpid, attempt);
    if (!firstMap.has(attempt.zpid)) firstMap.set(attempt.zpid, attempt);
  }
  const latest = [...latestMap.values()];
  const averageScore = mean(latest.map((a) => a.score));
  const firstTryAverage = mean([...firstMap.values()].map((a) => a.score));
  const retakes = ordered.length - latest.length;

  const skills: Record<SkillKey, SkillResult> = {
    revenue: skill("revenue", latest),
    setup: skill("setup", latest),
    opex: skill("opex", latest),
  };

  const byMarket = new Map<string, number[]>();
  for (const attempt of latest) {
    const market = marketOf(attempt.zpid);
    byMarket.set(market, [...(byMarket.get(market) ?? []), attempt.score]);
  }
  const markets: MarketResult[] = [...byMarket.entries()]
    .map(([market, scores]) => {
      const averageScoreInMarket = mean(scores) as number;
      return { market, averageScore: averageScoreInMarket, cases: scores.length, level: marketLevel(averageScoreInMarket) };
    })
    .sort((a, b) => a.market.localeCompare(b.market));

  return {
    trainee,
    attempts: ordered,
    latest,
    averageScore,
    firstTryAverage,
    casesCompleted: latest.length,
    bestRated: latest.filter((a) => a.rating === "best").length,
    retakes,
    skills,
    markets,
    notes: coachingNotes(skills, markets, latest, marketOf, averageScore, firstTryAverage, retakes),
  };
}

/**
 * Team order: higher average score first; ties go to whoever has completed
 * more cases, then to the smaller revenue miss. Trainees with no graded
 * attempts come last.
 */
export function rankTeam(summaries: TraineeSummary[]): RankedTrainee[] {
  const sorted = [...summaries].sort((a, b) => {
    if (a.averageScore === null || b.averageScore === null) {
      if (a.averageScore === b.averageScore) return a.trainee.name.localeCompare(b.trainee.name);
      return a.averageScore === null ? 1 : -1;
    }
    return (
      b.averageScore - a.averageScore ||
      b.casesCompleted - a.casesCompleted ||
      (a.skills.revenue.miss ?? Infinity) - (b.skills.revenue.miss ?? Infinity) ||
      a.trainee.name.localeCompare(b.trainee.name)
    );
  });
  return sorted.map((summary, index) => ({ ...summary, rank: index + 1 }));
}

export type PropertyStanding = { rank: number; trainee: Trainee; attempt: TeamAttempt };

/** Each trainee's latest attempt on one property, closest to the analyst first. */
export function propertyLeaderboard(summaries: TraineeSummary[], zpid: string): PropertyStanding[] {
  return summaries
    .flatMap((summary) => {
      const attempt = summary.latest.find((a) => a.zpid === zpid);
      return attempt ? [{ trainee: summary.trainee, attempt }] : [];
    })
    .sort(
      (a, b) =>
        Math.abs(a.attempt.midDeviation ?? Infinity) - Math.abs(b.attempt.midDeviation ?? Infinity) ||
        a.attempt.submittedAt.localeCompare(b.attempt.submittedAt),
    )
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}
