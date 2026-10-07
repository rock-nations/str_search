import { gradeDeviation } from "@/lib/scoring";

import type { TeamAttempt, Trainee } from "./types";

/**
 * DEMO DATA. The API has no users, so the hiring team asked for teammates to
 * be mocked. Every attempt submitted through the API is "You"; these six
 * teammates are fixed, hand-written results, labelled as demo data in the UI.
 *
 * Each teammate shows one pattern a lead analyst would want to spot:
 *   Priya   strong all-round
 *   Marcus  accurate revenue, setup budgets far below the analyst
 *   Elena   good overall, weak in two markets
 *   Tom     new, overestimates revenue
 *   Aisha   accurate revenue, running costs far below the analyst
 *   Daniel  high latest scores that come from retakes, weak first tries
 *
 * Dates are fixed so tests and screenshots never change. Deviations are signed
 * fractions against the analyst's reference, never dollar amounts, so the demo
 * data can't reveal an analyst's number for a property you haven't submitted.
 */

export const YOU: Trainee = { id: "you", name: "You", initials: "YOU", hue: 273, isYou: true };

export const TEAMMATES: Trainee[] = [
  { id: "priya-shah", name: "Priya Shah", initials: "PS", hue: 200 },
  { id: "marcus-lee", name: "Marcus Lee", initials: "ML", hue: 32 },
  { id: "elena-ruiz", name: "Elena Ruiz", initials: "ER", hue: 340 },
  { id: "tom-becker", name: "Tom Becker", initials: "TB", hue: 150 },
  { id: "aisha-khan", name: "Aisha Khan", initials: "AK", hue: 255 },
  { id: "daniel-okafor", name: "Daniel Okafor", initials: "DO", hue: 95 },
];

const SKI_VIEW = "41234567";
const BROKEN_BOW = "52345678";
const PALM_ISLE = "63456789";
const ASPEN_RIDGE = "74567890";
const DUNE_WALK = "85678901";
const CEDAR_HOLLOW = "96789012";

export const SEEDED_PROPERTY_IDS = [SKI_VIEW, BROKEN_BOW, PALM_ISLE, ASPEN_RIDGE, DUNE_WALK, CEDAR_HOLLOW];

/** [property, date, Mid deviation, setup deviation, running-cost deviation] */
type Row = [zpid: string, date: string, mid: number, setup: number, opex: number];

const DEMO_ROWS: Record<string, Row[]> = {
  "priya-shah": [
    [SKI_VIEW, "2026-09-02", 0.045, -0.04, 0.03],
    [BROKEN_BOW, "2026-09-04", -0.06, 0.05, -0.04],
    [PALM_ISLE, "2026-09-08", 0.08, -0.06, 0.05],
    [ASPEN_RIDGE, "2026-09-11", -0.03, 0.02, -0.02],
    [DUNE_WALK, "2026-09-15", 0.05, -0.03, 0.06],
    [CEDAR_HOLLOW, "2026-09-18", -0.09, 0.04, -0.05],
  ],
  "marcus-lee": [
    [SKI_VIEW, "2026-09-03", 0.07, -0.38, 0.04],
    [BROKEN_BOW, "2026-09-05", -0.05, -0.33, -0.05],
    [PALM_ISLE, "2026-09-09", 0.09, -0.41, 0.06],
    [ASPEN_RIDGE, "2026-09-12", -0.08, -0.3, -0.03],
    [DUNE_WALK, "2026-09-16", 0.12, -0.36, 0.05],
    [CEDAR_HOLLOW, "2026-09-19", -0.04, -0.34, -0.02],
  ],
  "elena-ruiz": [
    [SKI_VIEW, "2026-09-02", 0.05, -0.07, 0.04],
    [BROKEN_BOW, "2026-09-06", -0.07, 0.05, -0.06],
    [PALM_ISLE, "2026-09-10", 0.34, -0.08, 0.07],
    [ASPEN_RIDGE, "2026-09-13", -0.04, 0.06, -0.03],
    [DUNE_WALK, "2026-09-17", -0.31, 0.04, -0.08],
    [CEDAR_HOLLOW, "2026-09-20", 0.06, -0.04, 0.05],
    [PALM_ISLE, "2026-09-22", 0.28, -0.05, 0.04],
  ],
  "tom-becker": [
    [SKI_VIEW, "2026-09-23", 0.22, 0.08, -0.06],
    [BROKEN_BOW, "2026-09-25", 0.31, -0.09, 0.07],
    [ASPEN_RIDGE, "2026-09-28", 0.26, 0.05, -0.04],
  ],
  "aisha-khan": [
    [SKI_VIEW, "2026-09-07", -0.03, 0.05, -0.28],
    [BROKEN_BOW, "2026-09-10", 0.06, -0.04, -0.33],
    [PALM_ISLE, "2026-09-14", -0.08, 0.06, -0.31],
    [ASPEN_RIDGE, "2026-09-18", 0.02, -0.03, -0.27],
    [CEDAR_HOLLOW, "2026-09-24", 0.11, 0.02, -0.3],
  ],
  "daniel-okafor": [
    [SKI_VIEW, "2026-09-08", 0.42, 0.12, -0.08],
    [SKI_VIEW, "2026-09-09", 0.01, 0.05, -0.04],
    [BROKEN_BOW, "2026-09-12", -0.38, -0.1, 0.09],
    [BROKEN_BOW, "2026-09-13", -0.02, -0.03, 0.04],
    [PALM_ISLE, "2026-09-19", 0.33, 0.11, -0.07],
    [PALM_ISLE, "2026-09-20", 0.03, 0.04, -0.02],
    [ASPEN_RIDGE, "2026-09-25", -0.29, -0.09, 0.08],
    [ASPEN_RIDGE, "2026-09-26", 0.04, -0.02, 0.03],
  ],
};

/** The demo teammates' attempts, graded with the same rules as the API. */
export function demoAttempts(): TeamAttempt[] {
  const attempts: TeamAttempt[] = [];
  for (const [traineeId, rows] of Object.entries(DEMO_ROWS)) {
    const sorted = [...rows].sort((a, b) => a[1].localeCompare(b[1]));
    const counts = new Map<string, number>();
    for (const [zpid, date, mid, setup, opex] of sorted) {
      const attemptNumber = (counts.get(zpid) ?? 0) + 1;
      counts.set(zpid, attemptNumber);
      attempts.push({
        id: `${traineeId}-${zpid}-${attemptNumber}`,
        traineeId,
        zpid,
        attemptNumber,
        submittedAt: `${date}T15:00:00.000Z`,
        midDeviation: mid,
        setupDeviation: setup,
        opexDeviation: opex,
        ...gradeDeviation(mid),
        source: "demo",
      });
    }
  }
  return attempts;
}
