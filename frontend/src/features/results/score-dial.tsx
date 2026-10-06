"use client";

import { useEffect, useState } from "react";

import type { Rating } from "@/lib/api/schemas";
import { cn } from "@/lib/utils";

const strokeByRating: Record<Rating, string> = {
  best: "stroke-success",
  medium: "stroke-warning",
  low: "stroke-danger",
};

/** Counts up to the score once, unless the person prefers reduced motion. */
function useCountUp(target: number, durationMs = 700) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const frame = requestAnimationFrame(() => setValue(target));
      return () => cancelAnimationFrame(frame);
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - progress) ** 3;
      setValue(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);
  return value;
}

export function ScoreDial({ score, rating, size = 148 }: { score: number; rating: Rating; size?: number }) {
  const shown = useCountUp(score);
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - shown / 100);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 140 140" className="size-full -rotate-90" aria-hidden>
        <circle cx="70" cy="70" r={radius} fill="none" strokeWidth="10" className="stroke-muted" />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(strokeByRating[rating])}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="figure text-[40px] leading-none font-semibold tracking-tight" data-testid="score-value" data-score={score}>
            {shown}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">out of 100</p>
        </div>
      </div>
      <span className="sr-only">
        Score {score} out of 100
      </span>
    </div>
  );
}
