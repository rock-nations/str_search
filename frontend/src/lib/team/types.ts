import type { Rating } from "@/lib/api/schemas";

export type Trainee = {
  id: string;
  name: string;
  initials: string;
  /** Hue (0–360) for the avatar; readable in both themes with white text. */
  hue: number;
  isYou?: boolean;
};

/**
 * One graded attempt in a shape that works for real API submissions and demo
 * teammates alike. Deviations are signed fractions: +0.12 means 12% above the
 * analyst, −0.30 means 30% below.
 */
export type TeamAttempt = {
  id: string;
  traineeId: string;
  zpid: string;
  /** 1 for the trainee's first attempt on this property, 2 for the next, … */
  attemptNumber: number;
  submittedAt: string;
  /** Mid revenue forecast vs the analyst's. This is the graded number. */
  midDeviation: number | null;
  /** Setup and renovation budget (the optimization list) vs the analyst's. */
  setupDeviation: number | null;
  /** Monthly running costs vs the analyst's. */
  opexDeviation: number | null;
  rating: Rating;
  score: number;
  source: "api" | "demo";
  /** Set for real attempts, so the UI can link to their results page. */
  submissionId?: number;
};

export type SkillLevel = "good" | "ok" | "needs-work";

export type SkillKey = "revenue" | "setup" | "opex";

export type CoachingNote = {
  id: string;
  kind: SkillKey | "market" | "retakes";
  title: string;
  detail: string;
};

export type MarketResult = {
  market: string;
  averageScore: number;
  cases: number;
  level: SkillLevel;
};

export type SkillResult = {
  key: SkillKey;
  /** Average absolute miss, as a fraction. Null when there is no data. */
  miss: number | null;
  /** Average signed miss: tells "usually high" from "usually low". */
  bias: number | null;
  level: SkillLevel | null;
};

export type TraineeSummary = {
  trainee: Trainee;
  /** Every attempt, oldest first. */
  attempts: TeamAttempt[];
  /** The latest attempt on each property: these count, as the API's average does. */
  latest: TeamAttempt[];
  averageScore: number | null;
  firstTryAverage: number | null;
  casesCompleted: number;
  bestRated: number;
  retakes: number;
  skills: Record<SkillKey, SkillResult>;
  markets: MarketResult[];
  notes: CoachingNote[];
};

export type RankedTrainee = TraineeSummary & { rank: number };
