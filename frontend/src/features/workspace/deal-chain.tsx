"use client";

import { BadgeCheck, Radio } from "lucide-react";
import type { ReactNode } from "react";

import { Eyebrow } from "@/components/page";
import { formatMoney, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

import { useWorkspace } from "./context";

/**
 * The three-step chain the brief describes: what it costs → what it earns →
 * how good the return is. Always visible so every input has a visible effect.
 */
export function DealChain({ className }: { className?: string }) {
  const { calc, autosave, underwriting } = useWorkspace();
  const p = calc.purchase;
  const low = calc.scenarios.low;
  const mid = calc.scenarios.mid;
  const high = calc.scenarios.high;

  const confirmed =
    autosave.state.status === "saved" &&
    autosave.state.pendingSections.length === 0 &&
    mid !== null &&
    underwriting.m_cash_on_cash !== null &&
    formatPercent(underwriting.m_cash_on_cash) === formatPercent(mid.cashOnCash) &&
    formatMoney(underwriting.total_oop) === formatMoney(calc.totalOutOfPocket);

  return (
    <section
      aria-label="Deal summary"
      data-testid="deal-chain"
      className={cn("overflow-hidden rounded-xl bg-card shadow-card ring-1 ring-foreground/[0.07]", className)}
    >
      <div className="flex items-center justify-between border-b px-5 py-3">
        <h2 className="text-sm font-semibold">Deal summary</h2>
        {confirmed ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-success-foreground" data-testid="chain-confirmed">
            <BadgeCheck className="size-3.5" aria-hidden />
            Matches API
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Radio className="size-3.5" aria-hidden />
            Live preview
          </span>
        )}
      </div>

      <ol className="relative px-5 py-4">
        <span aria-hidden className="absolute top-8 bottom-12 left-[31px] w-px bg-border" />
        <ChainStep
          index={1}
          eyebrow="What it costs"
          label="Total out of pocket"
          value={formatMoney(calc.totalOutOfPocket)}
          testId="chain-oop"
          detail={
            p ? (
              <>
                Down {formatMoney(p.downPayment)} · Closing {formatMoney(p.closingCosts)} · Setup{" "}
                {formatMoney(calc.optimizationTotal)}
              </>
            ) : (
              "Complete purchase & financing"
            )
          }
        />
        <ChainStep
          index={2}
          eyebrow="What it earns"
          label="Annual free cash flow · Mid"
          value={formatMoney(mid?.freeCashFlow)}
          tone={mid ? (mid.freeCashFlow >= 0 ? "positive" : "negative") : undefined}
          testId="chain-fcf"
          detail={
            mid ? (
              <>
                NOI {formatMoney(mid.noi)} − debt {formatMoney(mid.debtService)}
              </>
            ) : (
              "Add revenue and the co-hosting fee"
            )
          }
        />
        <ChainStep
          index={3}
          eyebrow="How good the return is"
          label="Cash-on-cash · Mid"
          value={formatPercent(mid?.cashOnCash)}
          tone={mid ? (mid.cashOnCash >= 0 ? "positive" : "negative") : undefined}
          testId="chain-coc"
          detail={
            mid ? (
              <span className="flex gap-3">
                <span>
                  Low <span className="figure font-medium text-foreground">{formatPercent(low?.cashOnCash)}</span>
                </span>
                <span>
                  High <span className="figure font-medium text-foreground">{formatPercent(high?.cashOnCash)}</span>
                </span>
              </span>
            ) : (
              "Free cash flow ÷ out of pocket"
            )
          }
          last
        />
      </ol>

      <dl className="grid grid-cols-2 border-t">
        <div className="border-r px-5 py-3">
          <dt className="text-xs text-muted-foreground">Tax savings (Y1)</dt>
          <dd className="figure mt-0.5 text-sm font-semibold">{formatMoney(calc.taxes?.taxSavings)}</dd>
        </div>
        <div className="px-5 py-3">
          <dt className="text-xs text-muted-foreground">PRR</dt>
          <dd className="figure mt-0.5 text-sm font-semibold">{formatPercent(calc.prr)}</dd>
        </div>
      </dl>
    </section>
  );
}

function ChainStep({
  index,
  eyebrow,
  label,
  value,
  detail,
  tone,
  last,
  testId,
}: {
  index: number;
  eyebrow: string;
  label: string;
  value: string;
  detail: ReactNode;
  tone?: "positive" | "negative";
  last?: boolean;
  testId: string;
}) {
  const empty = value === "—";
  return (
    <li className={cn("relative flex gap-3.5", !last && "pb-5")}>
      <span
        className={cn(
          "relative z-10 grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold ring-4 ring-card",
          empty ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground",
        )}
      >
        {index}
      </span>
      <div className="min-w-0 flex-1">
        <Eyebrow className="text-[10px]">{eyebrow}</Eyebrow>
        <p className="mt-1 text-[13px] text-muted-foreground">{label}</p>
        <p
          data-testid={testId}
          className={cn(
            "figure mt-0.5 text-[22px] leading-7 font-semibold tracking-tight",
            empty && "text-muted-foreground/60",
            tone === "positive" && "text-success-foreground",
            tone === "negative" && "text-danger-foreground",
          )}
        >
          {value}
        </p>
        <div className="figure mt-0.5 text-xs leading-5 text-muted-foreground">{detail}</div>
      </div>
    </li>
  );
}
