"use client";

import { CircleAlert, CircleCheck } from "lucide-react";

import { STEPS, type StepId } from "@/lib/underwriting/fields";
import type { StepProgress } from "@/lib/underwriting/review";
import { cn } from "@/lib/utils";

import { useWorkspace } from "./context";

function progressText(id: StepId, progress: StepProgress, blocking: number): string {
  if (id === "tags") return "Optional";
  if (id === "review") return blocking === 0 ? "Ready to submit" : `${blocking} open ${blocking === 1 ? "item" : "items"}`;
  if (progress.invalid) return `${progress.invalid} to fix`;
  if (progress.missing) return `${progress.missing} to complete`;
  return "Complete";
}

export function StepNav({ orientation }: { orientation: "vertical" | "horizontal" }) {
  const { step, goTo, review } = useWorkspace();

  return (
    <nav aria-label="Underwriting steps">
      <ol
        className={cn(
          orientation === "vertical" ? "flex flex-col gap-1" : "-mx-1 flex gap-1 overflow-x-auto px-1 pb-1",
        )}
      >
        {STEPS.map((item, index) => {
          const progress = review.byStep[item.id];
          const active = step === item.id;
          const done = item.id !== "review" && item.id !== "tags" && progress.complete;
          const hasErrors = progress.invalid > 0 && item.id !== "review";
          return (
            <li key={item.id} className={orientation === "horizontal" ? "shrink-0" : undefined}>
              <button
                type="button"
                onClick={() => goTo(item.id)}
                aria-current={active ? "step" : undefined}
                data-testid={`step-${item.id}`}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  active ? "bg-card shadow-card ring-1 ring-foreground/[0.08]" : "hover:bg-muted/70",
                  orientation === "horizontal" && "py-2 pr-4",
                )}
              >
                <span
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold transition-colors",
                    hasErrors
                      ? "bg-danger/12 text-danger-foreground"
                      : done
                        ? "bg-success/15 text-success-foreground"
                        : active
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground ring-1 ring-border",
                  )}
                >
                  {hasErrors ? (
                    <CircleAlert className="size-3.5" aria-hidden />
                  ) : done ? (
                    <CircleCheck className="size-3.5" aria-hidden />
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="min-w-0">
                  <span className={cn("block text-sm", active ? "font-semibold" : "font-medium")}>{item.label}</span>
                  <span
                    className={cn(
                      "block text-xs whitespace-nowrap",
                      hasErrors ? "text-danger-foreground" : "text-muted-foreground",
                      item.id === "review" && review.blocking === 0 && "text-success-foreground",
                    )}
                  >
                    {progressText(item.id, progress, review.blocking)}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
