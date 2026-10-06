/**
 * Data-driven scoring cases.
 *
 * The table below is copied from the assessment brief ("How scoring works"):
 * each seeded property, its analyst reference Mid forecast and the Best /
 * Medium ranges. Expected outcomes are derived from these literal ranges,
 * not from app code, so the tests act as an independent oracle.
 */
export type Rating = "best" | "medium" | "low";

export type SeedProperty = {
  zpid: string;
  street: string;
  referenceMid: number;
  best: [number, number];
  medium: [number, number];
};

export const SEED_PROPERTIES: SeedProperty[] = [
  { zpid: "41234567", street: "1240 Ski View Dr", referenceMid: 125_000, best: [112_500, 137_500], medium: [93_750, 156_250] },
  { zpid: "52345678", street: "88 Lakeshore Ln", referenceMid: 96_000, best: [86_400, 105_600], medium: [72_000, 120_000] },
  { zpid: "63456789", street: "3402 Palm Isle Ct", referenceMid: 165_000, best: [148_500, 181_500], medium: [123_750, 206_250] },
  { zpid: "74567890", street: "215 Aspen Ridge Rd", referenceMid: 128_000, best: [115_200, 140_800], medium: [96_000, 160_000] },
  { zpid: "85678901", street: "9 Dune Walk", referenceMid: 192_000, best: [172_800, 211_200], medium: [144_000, 240_000] },
  { zpid: "96789012", street: "47 Cedar Hollow Rd", referenceMid: 80_000, best: [72_000, 88_000], medium: [60_000, 100_000] },
];

export const SCORE: Record<Rating, number> = { best: 100, medium: 70, low: 40 };
export const RATING_LABEL: Record<Rating, string> = { best: "Best", medium: "Medium", low: "Low" };

/** Both limits are inclusive (brief: "Both limits count in the trainee's favor"). */
export function expectedRating(property: SeedProperty, mid: number): Rating {
  if (mid >= property.best[0] && mid <= property.best[1]) return "best";
  if (mid >= property.medium[0] && mid <= property.medium[1]) return "medium";
  return "low";
}

export type ScoreCase = {
  title: string;
  property: SeedProperty;
  mid: number;
  rating: Rating;
  score: number;
  /** e.g. "4.0% above" — how the results page should describe the miss. */
  deviationText: string;
};

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

function makeCase(property: SeedProperty, mid: number, label: string): ScoreCase {
  const rating = expectedRating(property, mid);
  const deviation = (mid - property.referenceMid) / property.referenceMid;
  const deviationText = `${Math.abs(deviation * 100).toFixed(1)}% ${deviation >= 0 ? "above" : "below"}`;
  return {
    title: `${property.street} · ${label} · Mid ${usd(mid)} → ${RATING_LABEL[rating]} (${SCORE[rating]})`,
    property,
    mid,
    rating,
    score: SCORE[rating],
    deviationText,
  };
}

/**
 * Per property: one forecast in each band. Plus the four boundary cases that
 * prove the limits are inclusive and that $1 past a limit drops a band.
 */
export function buildScoreCases(): ScoreCase[] {
  const cases: ScoreCase[] = [];
  for (const property of SEED_PROPERTIES) {
    const ref = property.referenceMid;
    cases.push(makeCase(property, Math.round(ref * 1.04), "4% high"));
    cases.push(makeCase(property, Math.round(ref * 0.82), "18% low"));
    cases.push(makeCase(property, Math.round(ref * 1.5), "50% high"));
  }
  const [skiView, brokenBow] = SEED_PROPERTIES;
  cases.push(makeCase(skiView, skiView.best[1], "exactly +10%"));
  cases.push(makeCase(skiView, skiView.best[1] + 1, "+10% plus $1"));
  cases.push(makeCase(brokenBow, brokenBow.medium[0], "exactly −25%"));
  cases.push(makeCase(brokenBow, brokenBow.medium[0] - 1, "−25% minus $1"));
  return cases;
}

/** Sanity check that the generated set covers every outcome. */
export function coverage(cases: ScoreCase[]): Record<Rating, number> {
  return cases.reduce(
    (acc, c) => ({ ...acc, [c.rating]: acc[c.rating] + 1 }),
    { best: 0, medium: 0, low: 0 } as Record<Rating, number>,
  );
}
