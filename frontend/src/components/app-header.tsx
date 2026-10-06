"use client";

import { GraduationCap, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ScoringGuide } from "@/components/scoring-guide";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

export function AppHeader() {
  const pathname = usePathname();
  const onDashboard = pathname === "/";

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-14 w-full max-w-[1440px] items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-card">
            <GraduationCap className="size-[18px]" aria-hidden />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-sm font-semibold tracking-tight">Underwriting Lab</span>
            <span className="mt-0.5 hidden text-[11px] text-muted-foreground sm:block">Analyst training</span>
          </span>
        </Link>

        <nav aria-label="Main" className="ml-2 hidden items-center gap-1 sm:flex">
          <Link
            href="/"
            aria-current={onDashboard ? "page" : undefined}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              onDashboard && "bg-muted text-foreground",
            )}
          >
            <LayoutDashboard className="size-4" aria-hidden />
            Dashboard
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <ScoringGuide />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
