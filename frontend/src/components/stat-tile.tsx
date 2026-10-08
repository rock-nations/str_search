import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function StatTile({
  label,
  value,
  hint,
  icon,
  children,
  className,
  testId,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  children?: ReactNode;
  className?: string;
  testId?: string;
}) {
  return (
    <div
      data-testid={testId}
      className={cn("flex flex-col gap-3 rounded-xl bg-card p-4 shadow-card ring-1 ring-foreground/[0.07] sm:p-5", className)}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
        {icon && <span className="text-muted-foreground/70 [&_svg]:size-4">{icon}</span>}
      </div>
      <div className="figure font-heading text-2xl leading-none font-semibold tracking-tight sm:text-[28px]" data-slot="value">
        {value}
      </div>
      {hint && <div className="text-[13px] text-muted-foreground">{hint}</div>}
      {children}
    </div>
  );
}
