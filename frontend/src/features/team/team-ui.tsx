"use client";

import { FlaskConical, UserRound } from "lucide-react";
import type { ReactNode } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { SkillLevel, Trainee } from "@/lib/team/types";
import { cn } from "@/lib/utils";

const avatarSize = {
  sm: "size-7 text-[10px]",
  md: "size-8 text-[11px]",
  lg: "size-12 text-sm",
} as const;

/** Initials on a per-trainee colour; "You" gets the brand colour and a person icon. */
export function TraineeAvatar({ trainee, size = "md" }: { trainee: Trainee; size?: keyof typeof avatarSize }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-semibold tracking-wide text-white ring-2 ring-card",
        avatarSize[size],
        trainee.isYou && "bg-primary text-primary-foreground",
      )}
      style={trainee.isYou ? undefined : { backgroundColor: `oklch(0.6 0.13 ${trainee.hue})` }}
    >
      {trainee.isYou ? <UserRound className={size === "lg" ? "size-6" : "size-4"} /> : trainee.initials}
    </span>
  );
}

export const LEVEL_LABEL: Record<SkillLevel, string> = {
  good: "On target",
  ok: "Close",
  "needs-work": "Needs work",
};

const levelStyles: Record<SkillLevel, string> = {
  good: "bg-success/12 text-success-foreground ring-success/25",
  ok: "bg-warning/15 text-warning-foreground ring-warning/30",
  "needs-work": "bg-danger/10 text-danger-foreground ring-danger/25",
};

/** A coloured value chip. The level is also spoken, so it never depends on colour alone. */
export function LevelChip({
  level,
  children,
  className,
  testId,
}: {
  level: SkillLevel | null;
  children?: ReactNode;
  className?: string;
  testId?: string;
}) {
  if (!level) {
    return (
      <span data-testid={testId} data-level="none" className={cn("text-muted-foreground", className)}>
        —
      </span>
    );
  }
  return (
    <span
      data-testid={testId}
      data-level={level}
      className={cn(
        "figure inline-flex h-6 min-w-14 items-center justify-center rounded-md px-2 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        levelStyles[level],
        className,
      )}
    >
      {children ?? LEVEL_LABEL[level]}
      <span className="sr-only">, {LEVEL_LABEL[level]}</span>
    </span>
  );
}

export function LevelLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
      {(["good", "ok", "needs-work"] as const).map((level) => (
        <span key={level} className="inline-flex items-center gap-1.5">
          <span className={cn("size-2.5 rounded-sm ring-1 ring-inset", levelStyles[level])} aria-hidden />
          {LEVEL_LABEL[level]}
        </span>
      ))}
    </div>
  );
}

/** Says plainly that teammates are mocked, as the hiring team asked. */
export function DemoBadge({ className }: { className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        data-testid="demo-badge"
        className={cn(
          "inline-flex h-7 items-center gap-1.5 rounded-full bg-muted px-3 text-xs font-medium text-muted-foreground ring-1 ring-border ring-inset",
          className,
        )}
      >
        <FlaskConical className="size-3.5" aria-hidden />
        Teammates are demo data
      </TooltipTrigger>
      <TooltipContent className="max-w-72">
        The API has no user accounts, so your six teammates&apos; results are fixed demo data. Every attempt you
        submit is real and appears as &ldquo;You&rdquo;.
      </TooltipContent>
    </Tooltip>
  );
}

/** Score colour bands: 85+ on target, 60+ close, below that needs work. */
export function scoreLevel(score: number | null): SkillLevel | null {
  if (score === null) return null;
  if (score >= 85) return "good";
  if (score >= 60) return "ok";
  return "needs-work";
}
