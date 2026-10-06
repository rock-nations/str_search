import { ChevronLeft, ChevronRight } from "lucide-react";

import type { Rating } from "@/lib/api/schemas";
import { formatMoney, formatSignedPercent } from "@/lib/format";
import { BEST_THRESHOLD, MEDIUM_THRESHOLD } from "@/lib/scoring";
import { cn } from "@/lib/utils";

const markerTone: Record<Rating, string> = {
  best: "bg-success text-white",
  medium: "bg-warning text-black",
  low: "bg-danger text-white",
};

/**
 * Horizontal scale of deviation from the analyst's Mid forecast, with the
 * scoring bands drawn in. Shows where the trainee landed and what each band
 * would have required in dollars.
 */
export function BandScale({
  candidate,
  reference,
  rating,
  bestThreshold = BEST_THRESHOLD,
  mediumThreshold = MEDIUM_THRESHOLD,
}: {
  candidate: number | null;
  reference: number;
  rating: Rating;
  bestThreshold?: number;
  mediumThreshold?: number;
}) {
  const deviation = candidate === null ? null : (candidate - reference) / reference;
  // Zoom so the marker is visible, but keep the bands readable.
  const domain = Math.min(1, Math.max(0.4, deviation === null ? 0 : Math.abs(deviation) * 1.2));
  const pos = (x: number) => `${((Math.max(-domain, Math.min(domain, x)) + domain) / (2 * domain)) * 100}%`;
  const offScale = deviation !== null && Math.abs(deviation) > domain;

  const segments = [
    { from: -domain, to: -mediumThreshold, className: "bg-danger/15" },
    { from: -mediumThreshold, to: -bestThreshold, className: "bg-warning/25" },
    { from: -bestThreshold, to: bestThreshold, className: "bg-success/25" },
    { from: bestThreshold, to: mediumThreshold, className: "bg-warning/25" },
    { from: mediumThreshold, to: domain, className: "bg-danger/15" },
  ];
  const ticks = [-mediumThreshold, -bestThreshold, bestThreshold, mediumThreshold];

  return (
    <figure aria-label="Where your Mid forecast landed relative to the analyst's" data-testid="band-scale">
      <div className="relative h-16">
        {deviation !== null && (
          <div
            className="absolute bottom-1 flex -translate-x-1/2 flex-col items-center"
            style={{ left: pos(deviation) }}
            data-testid="band-marker-you"
          >
            <span className={cn("figure flex items-center gap-0.5 rounded-md px-2 py-1 text-xs font-semibold whitespace-nowrap shadow-card", markerTone[rating])}>
              {offScale && deviation < 0 && <ChevronLeft className="size-3" aria-hidden />}
              You · {formatMoney(candidate)}
              {offScale && deviation > 0 && <ChevronRight className="size-3" aria-hidden />}
            </span>
            <span className={cn("mt-0.5 size-2 rotate-45", markerTone[rating])} aria-hidden />
          </div>
        )}
      </div>

      <div className="relative h-4 overflow-hidden rounded-full ring-1 ring-foreground/10">
        {segments.map((segment) => (
          <span
            key={`${segment.from}`}
            className={cn("absolute inset-y-0", segment.className)}
            style={{ left: pos(segment.from), right: `calc(100% - ${pos(segment.to)})` }}
          />
        ))}
        {ticks.map((tick) => (
          <span key={tick} className="absolute inset-y-0 w-px bg-foreground/15" style={{ left: pos(tick) }} aria-hidden />
        ))}
        <span className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-foreground" style={{ left: pos(0) }} aria-hidden />
        {deviation !== null && (
          <span
            className={cn("absolute inset-y-0 w-1 -translate-x-1/2 rounded-full", markerTone[rating])}
            style={{ left: pos(deviation) }}
            aria-hidden
          />
        )}
      </div>

      <div className="relative mt-2 h-10 text-[11px] text-muted-foreground">
        {ticks.map((tick) => (
          <span
            key={tick}
            className={cn(
              "absolute -translate-x-1/2 text-center whitespace-nowrap",
              // Inner (±10%) labels crowd the analyst label when zoomed out or on narrow screens.
              Math.abs(tick) === bestThreshold && (domain > 0.45 ? "hidden" : "hidden sm:block"),
            )}
            style={{ left: pos(tick) }}
          >
            <span className="figure block font-medium text-foreground/80">{formatMoney(reference * (1 + tick))}</span>
            <span className="figure">{formatSignedPercent(tick, 0)}</span>
          </span>
        ))}
        <span className="absolute -translate-x-1/2 text-center whitespace-nowrap" style={{ left: pos(0) }}>
          <span className="figure block font-semibold text-foreground">{formatMoney(reference)}</span>
          <span>Analyst</span>
        </span>
      </div>

      <figcaption className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
        <Legend className="bg-success/40" label={`Best · within ±${bestThreshold * 100}%`} />
        <Legend className="bg-warning/50" label={`Medium · within ±${mediumThreshold * 100}%`} />
        <Legend className="bg-danger/30" label="Low · further out" />
      </figcaption>
    </figure>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-2.5 rounded-sm", className)} aria-hidden />
      {label}
    </span>
  );
}
