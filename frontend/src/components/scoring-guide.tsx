"use client";

import { CircleHelp } from "lucide-react";

import { RatingBadge } from "@/components/rating-badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RATING_META } from "@/lib/scoring";

/** Always-available reminder of how attempts are graded. */
export function ScoringGuide() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
          <CircleHelp className="size-4" aria-hidden />
          <span className="hidden sm:inline">How scoring works</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b p-4">
          <p className="text-sm font-semibold">One number decides the score</p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
            Your <span className="font-medium text-foreground">Mid revenue forecast</span> is compared with the
            analyst&apos;s. Everything else is practice and doesn&apos;t change the grade.
          </p>
        </div>
        <ul className="space-y-2.5 p-4">
          {(["best", "medium", "low"] as const).map((rating) => (
            <li key={rating} className="flex items-center justify-between gap-3">
              <RatingBadge rating={rating} withScore />
              <span className="text-right text-[13px] text-muted-foreground">{RATING_META[rating].range}</span>
            </li>
          ))}
        </ul>
        <p className="border-t bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
          Deviation = |your Mid − analyst&apos;s Mid| ÷ analyst&apos;s Mid. Exactly 10% or 25% counts in your favour.
        </p>
      </PopoverContent>
    </Popover>
  );
}
