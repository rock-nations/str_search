"use client";

import { Info } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/** "How is this calculated?" — the formula plus the trainee's own numbers. */
export function FormulaHint({
  title,
  formula,
  calculation,
  note,
}: {
  title: string;
  formula: string;
  calculation?: string | null;
  note?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger
        className="inline-grid size-5 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        aria-label={`How ${title.toLowerCase()} is calculated`}
      >
        <Info className="size-3.5" aria-hidden />
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-3 p-4" align="start">
        <p className="text-sm font-semibold">{title}</p>
        <p className="rounded-md bg-muted px-2.5 py-2 font-mono text-xs leading-5">{formula}</p>
        {calculation && (
          <div>
            <p className="text-xs text-muted-foreground">With your numbers</p>
            <p className="figure mt-1 font-mono text-xs leading-5">{calculation}</p>
          </div>
        )}
        {note && <p className="text-xs leading-5 text-muted-foreground">{note}</p>}
      </PopoverContent>
    </Popover>
  );
}
