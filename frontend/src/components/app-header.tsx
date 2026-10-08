"use client";

import { LayoutDashboard, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import logo from "@/assets/brand/str-search-logo.png";
import { ScoringGuide } from "@/components/scoring-guide";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

/**
 * The STR Search band: forest green, with the logo on a white badge exactly as
 * strsearch.com shows it. The badge also keeps the logo legible in dark mode.
 */
export function AppHeader() {
  const pathname = usePathname();
  const links = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard, active: pathname === "/" },
    { href: "/team", label: "Team", icon: Users, active: pathname.startsWith("/team") },
  ];

  return (
    <header className="sticky top-0 z-40 bg-brand text-brand-foreground shadow-[0_1px_0_0_oklch(0_0_0/0.12),0_6px_16px_-10px_oklch(0.2_0.05_169/0.5)]">
      <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center gap-2 px-4 sm:gap-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-3.5 rounded-[10px] outline-none focus-visible:ring-3 focus-visible:ring-cta/60"
        >
          <span className="flex h-10 items-center rounded-[10px] bg-white px-2.5 shadow-[0_1px_2px_0_oklch(0_0_0/0.18)] sm:h-11 sm:px-3">
            <Image src={logo} alt="STR Search" priority className="h-7 w-auto sm:h-8" />
          </span>
          <span className="hidden h-8 w-px bg-brand-foreground/20 lg:block" aria-hidden />
          <span className="hidden flex-col leading-none lg:flex">
            <span className="font-heading text-[15px] font-semibold tracking-tight">Underwriting Lab</span>
            <span className="mt-1 text-[11px] text-brand-muted">Analyst training</span>
          </span>
        </Link>

        <nav aria-label="Main" className="flex items-center gap-1 sm:ml-2">
          {links.map(({ href, label, icon: Icon, active }) => (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-brand-foreground/75 outline-none transition-colors hover:bg-white/10 hover:text-brand-foreground focus-visible:ring-3 focus-visible:ring-cta/60 sm:px-3",
                active &&
                  "bg-white/12 text-brand-foreground after:absolute after:inset-x-2.5 after:-bottom-[14px] after:h-[3px] after:rounded-t-full after:bg-cta sm:after:inset-x-3",
              )}
            >
              <Icon className="size-4" aria-hidden />
              <span className="sr-only sm:not-sr-only">{label}</span>
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
          <ScoringGuide />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
