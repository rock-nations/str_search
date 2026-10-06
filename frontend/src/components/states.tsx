import { CircleAlert, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed bg-card/50 px-6 py-12 text-center",
        className,
      )}
    >
      {icon && (
        <div className="mb-4 grid size-11 place-items-center rounded-full bg-muted text-muted-foreground [&_svg]:size-5">
          {icon}
        </div>
      )}
      <p className="text-sm font-semibold">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Couldn't load this page",
  error,
  onRetry,
  className,
}: {
  title?: string;
  error: unknown;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-danger/25 bg-danger/5 px-6 py-12 text-center",
        className,
      )}
    >
      <div className="mb-4 grid size-11 place-items-center rounded-full bg-danger/10 text-danger-foreground">
        <CircleAlert className="size-5" aria-hidden />
      </div>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{errorMessage(error)}</p>
      {onRetry && (
        <Button variant="outline" className="mt-5" onClick={onRetry}>
          <RefreshCw data-icon="inline-start" aria-hidden />
          Try again
        </Button>
      )}
    </div>
  );
}
