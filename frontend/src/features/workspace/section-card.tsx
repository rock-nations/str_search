import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** A titled form section. `anchor` lets review links scroll straight to it. */
export function SectionCard({
  anchor,
  icon,
  title,
  description,
  action,
  children,
  footer,
  className,
}: {
  anchor?: string;
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const headingId = anchor ? `${anchor}-title` : undefined;
  return (
    <section
      id={anchor}
      aria-labelledby={headingId}
      className={cn("scroll-mt-24 rounded-xl bg-card shadow-card ring-1 ring-foreground/[0.07]", className)}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 px-6 pt-5 pb-1">
        <div className="flex items-start gap-3">
          {icon && (
            <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-4">
              {icon}
            </span>
          )}
          <div>
            <h2 id={headingId} className="text-[15px] font-semibold tracking-tight">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-[13px] leading-5 text-muted-foreground">{description}</p>}
          </div>
        </div>
        {action}
      </header>
      <div className="px-6 pt-4 pb-6">{children}</div>
      {footer && <footer className="rounded-b-xl border-t bg-muted/40 px-6 py-3.5">{footer}</footer>}
    </section>
  );
}

/** A row of derived figures shown under the inputs that produce them. */
export function DerivedStrip({ items }: { items: { label: string; value: string; strong?: boolean }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-xs text-muted-foreground">{item.label}</dt>
          <dd className={cn("figure mt-0.5 truncate text-sm", item.strong ? "font-semibold" : "font-medium")}>
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
