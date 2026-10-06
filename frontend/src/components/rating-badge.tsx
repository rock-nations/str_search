import { CircleCheck, Circle, PencilLine, Target, TriangleAlert, Trophy } from "lucide-react";

import type { Rating, TrainingStatus } from "@/lib/api/schemas";
import { RATING_META } from "@/lib/scoring";
import { cn } from "@/lib/utils";

const ratingStyles: Record<Rating, string> = {
  best: "bg-success/12 text-success-foreground ring-success/25",
  medium: "bg-warning/15 text-warning-foreground ring-warning/30",
  low: "bg-danger/10 text-danger-foreground ring-danger/25",
};

const ratingIcons = { best: Trophy, medium: Target, low: TriangleAlert } as const;

/** Colour + icon + words, so the rating never relies on colour alone. */
export function RatingBadge({
  rating,
  withScore = false,
  className,
}: {
  rating: Rating;
  withScore?: boolean;
  className?: string;
}) {
  const Icon = ratingIcons[rating];
  const meta = RATING_META[rating];
  return (
    <span
      data-rating={rating}
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap",
        ratingStyles[rating],
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {meta.label}
      {withScore && <span className="figure opacity-80">· {meta.score}</span>}
    </span>
  );
}

const statusMeta: Record<TrainingStatus, { label: string; className: string; icon: typeof Circle }> = {
  not_started: {
    label: "Not started",
    className: "bg-muted text-muted-foreground ring-border",
    icon: Circle,
  },
  in_progress: {
    label: "In progress",
    className: "bg-accent text-accent-foreground ring-primary/20",
    icon: PencilLine,
  },
  submitted: {
    label: "Submitted",
    className: "bg-success/12 text-success-foreground ring-success/25",
    icon: CircleCheck,
  },
};

export function StatusBadge({ status, className }: { status: TrainingStatus; className?: string }) {
  const meta = statusMeta[status];
  const Icon = meta.icon;
  return (
    <span
      data-status={status}
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap",
        meta.className,
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {meta.label}
    </span>
  );
}

export const STATUS_LABEL: Record<TrainingStatus, string> = {
  not_started: statusMeta.not_started.label,
  in_progress: statusMeta.in_progress.label,
  submitted: statusMeta.submitted.label,
};
