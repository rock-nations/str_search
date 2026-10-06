import { RatingBadge } from "@/components/rating-badge";
import type { Rating, ScoreBreakdown } from "@/lib/api/schemas";
import { formatMoney } from "@/lib/format";
import { BEST_THRESHOLD, MEDIUM_THRESHOLD, bandRanges, formatRange } from "@/lib/scoring";
import { cn } from "@/lib/utils";

/** The dollar ranges for each band on this property, with the achieved band highlighted. */
export function ScoreBands({ breakdown }: { breakdown: ScoreBreakdown }) {
  if (breakdown.reference === null) return null;
  const ranges = bandRanges(
    breakdown.reference,
    breakdown.best_threshold ?? BEST_THRESHOLD,
    breakdown.medium_threshold ?? MEDIUM_THRESHOLD,
  );
  const rows: { rating: Rating; text: string }[] = [
    { rating: "best", text: formatRange(ranges.best) },
    {
      rating: "medium",
      text: `${formatRange([ranges.medium[0], ranges.best[0]])} or ${formatRange([ranges.best[1], ranges.medium[1]])}`,
    },
    {
      rating: "low",
      text: `Below ${formatMoney(ranges.medium[0])} or above ${formatMoney(ranges.medium[1])}`,
    },
  ];

  return (
    <section
      aria-labelledby="bands-heading"
      data-testid="score-bands"
      className="rounded-xl bg-card p-6 shadow-card ring-1 ring-foreground/[0.07]"
    >
      <h2 id="bands-heading" className="text-[15px] font-semibold tracking-tight">
        Score bands for this property
      </h2>
      <p className="mt-0.5 text-[13px] text-muted-foreground">
        What each Mid forecast would have scored. Both limits count in your favour.
      </p>
      <ul className="mt-4 space-y-2">
        {rows.map((row) => {
          const achieved = row.rating === breakdown.rating;
          return (
            <li
              key={row.rating}
              data-achieved={achieved || undefined}
              className={cn(
                "flex flex-col gap-1.5 rounded-lg border px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
                achieved && "border-primary/40 bg-accent/50",
              )}
            >
              <span className="flex items-center gap-2">
                <RatingBadge rating={row.rating} withScore />
                {achieved && <span className="text-xs font-medium text-accent-foreground">Your band</span>}
              </span>
              <span className="figure text-[13px] text-muted-foreground sm:text-right">{row.text}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
