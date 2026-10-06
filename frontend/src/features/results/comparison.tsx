import { ArrowDown, ArrowUp, Eye, Lightbulb } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Underwriting } from "@/lib/api/schemas";
import { formatMoney, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

type Kind = "money" | "fraction" | "years";

type ComparisonRow = {
  key: string;
  label: string;
  group: "Revenue" | "Financing" | "Costs" | "Returns";
  kind: Kind;
  mine: number | null;
  analyst: number | null;
  graded?: boolean;
  /** Inputs (not outputs) feed the "biggest differences" takeaways. */
  input?: boolean;
};

function rows(mine: Underwriting, analyst: Underwriting): ComparisonRow[] {
  const pd = (u: Underwriting) => u.detail?.purchase_details;
  const fr = (u: Underwriting) => u.detail?.forecasted_revenue;
  const row = (
    key: string,
    label: string,
    group: ComparisonRow["group"],
    kind: Kind,
    get: (u: Underwriting) => number | null | undefined,
    extra: Partial<ComparisonRow> = {},
  ): ComparisonRow => ({ key, label, group, kind, mine: get(mine) ?? null, analyst: get(analyst) ?? null, ...extra });

  return [
    row("low", "Low revenue", "Revenue", "money", (u) => u.low_gross_revenue, { input: true }),
    row("mid", "Mid revenue", "Revenue", "money", (u) => u.mid_gross_revenue, { graded: true, input: true }),
    row("high", "High revenue", "Revenue", "money", (u) => u.high_gross_revenue, { input: true }),
    row("price", "Purchase price", "Financing", "money", (u) => u.purchase_price, { input: true }),
    row("down", "Down payment", "Financing", "fraction", (u) => pd(u)?.down_payment_pct, { input: true }),
    row("rate", "Interest rate", "Financing", "fraction", (u) => pd(u)?.interest_rate, { input: true }),
    row("term", "Loan term", "Financing", "years", (u) => pd(u)?.mortgage_years, { input: true }),
    row("closing", "Closing costs", "Financing", "fraction", (u) => pd(u)?.closing_costs_pct, { input: true }),
    row("setup", "Setup spend", "Costs", "money", (u) => u.optimization_total, { input: true }),
    row("opex", "Monthly operating expenses", "Costs", "money", (u) => u.operating_expense_total, { input: true }),
    row("cohost", "Co-hosting fee", "Costs", "fraction", (u) => fr(u)?.co_hosting_fee_pct, { input: true }),
    row("oop", "Total out of pocket", "Returns", "money", (u) => u.total_oop),
    row("fcf", "Mid annual free cash flow", "Returns", "money", (u) => fr(u)?.scenarios?.mid?.annual_free_cash_flow),
    row("coc", "Mid cash-on-cash", "Returns", "fraction", (u) => u.m_cash_on_cash),
    row("tax", "Tax savings (year 1)", "Returns", "money", (u) => u.taxes?.tax_savings),
    row("prr", "PRR", "Returns", "fraction", (u) => u.prr),
  ];
}

function format(kind: Kind, value: number | null): string {
  if (kind === "money") return formatMoney(value);
  if (kind === "years") return value === null ? "—" : `${value} yrs`;
  if (value === 0) return "0%";
  // Small rates (6.99%) need two decimals; larger ratios read fine with one.
  return formatPercent(value, value !== null && Math.abs(value) < 0.1 ? 2 : 1);
}

function difference(row: ComparisonRow): { text: string; direction: "up" | "down" | "same" } | null {
  if (row.mine === null || row.analyst === null) return null;
  const delta = row.mine - row.analyst;
  if (Math.abs(delta) < 1e-9) return { text: "Same", direction: "same" };
  const direction = delta > 0 ? "up" : "down";
  if (row.kind === "fraction") {
    const points = Math.abs(delta * 100);
    return { text: `${points.toFixed(points < 1 ? 2 : 1)} pts`, direction };
  }
  if (row.kind === "years") return { text: `${Math.abs(delta)} yrs`, direction };
  const relative = row.analyst !== 0 ? ` · ${Math.abs((delta / row.analyst) * 100).toFixed(0)}%` : "";
  return { text: `${formatMoney(Math.abs(delta))}${relative}`, direction };
}

/**
 * The inputs that differ most from the analyst, as plain-language takeaways.
 * Dollar inputs compare relatively (10%+ apart); rates compare in percentage
 * points (1 pt+ apart), since "100% lower than 10%" reads badly.
 */
function takeaways(all: ComparisonRow[]): string[] {
  return all
    .filter((r) => r.input && !r.graded && r.mine !== null && r.analyst !== null && r.kind !== "years")
    .map((r) => {
      const mine = r.mine as number;
      const analyst = r.analyst as number;
      const weight = r.kind === "fraction" ? Math.abs(mine - analyst) * 10 : analyst === 0 ? 0 : Math.abs((mine - analyst) / analyst);
      return { row: r, mine, analyst, weight };
    })
    .filter(({ weight }) => weight >= 0.1)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map(({ row, mine, analyst }) => {
      const direction = mine > analyst ? "higher" : "lower";
      const gap =
        row.kind === "fraction"
          ? `${(Math.abs(mine - analyst) * 100).toFixed(1)} percentage points`
          : `${Math.abs(((mine - analyst) / analyst) * 100).toFixed(0)}%`;
      return `Your ${row.label.toLowerCase()} was ${gap} ${direction} than the analyst's (${format(row.kind, mine)} vs ${format(row.kind, analyst)}).`;
    });
}

export function Comparison({ mine, analyst }: { mine: Underwriting | undefined; analyst: Underwriting | undefined }) {
  if (!mine || !analyst) {
    return <Skeleton className="h-[560px] rounded-xl" />;
  }
  const all = rows(mine, analyst);
  const notes = takeaways(all);
  const groups = ["Revenue", "Financing", "Costs", "Returns"] as const;

  return (
    <section
      aria-labelledby="comparison-heading"
      data-testid="comparison"
      className="overflow-hidden rounded-xl bg-card shadow-card ring-1 ring-foreground/[0.07]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 px-6 pt-5 pb-4">
        <div>
          <h2 id="comparison-heading" className="text-[15px] font-semibold tracking-tight">
            Your underwriting vs the analyst&apos;s
          </h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">Only the Mid revenue forecast is graded. The rest is for learning.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
          <Eye className="size-3.5" aria-hidden />
          Revealed after submission
        </span>
      </div>

      {notes.length > 0 && (
        <div className="mx-6 mb-4 rounded-lg bg-accent/60 px-4 py-3" data-testid="takeaways">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-accent-foreground">
            <Lightbulb className="size-3.5" aria-hidden />
            Biggest differences in your inputs
          </p>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[13px] leading-5">
            {notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-x-auto">
        <Table className="min-w-[520px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-6"> </TableHead>
              <TableHead className="text-right">Yours</TableHead>
              <TableHead className="text-right">Analyst</TableHead>
              <TableHead className="pr-6 text-right">Difference</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((group) => (
              <GroupRows key={group} group={group} rows={all.filter((r) => r.group === group)} />
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

function GroupRows({ group, rows: groupRows }: { group: string; rows: ComparisonRow[] }) {
  return (
    <>
      <TableRow className="bg-muted/40 hover:bg-muted/40">
        <TableCell colSpan={4} className="pl-6 text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
          {group}
        </TableCell>
      </TableRow>
      {groupRows.map((row) => {
        const diff = difference(row);
        return (
          <TableRow
            key={row.key}
            data-testid={`compare-${row.key}`}
            className={cn("hover:bg-transparent", row.graded && "bg-accent/50 hover:bg-accent/50")}
          >
            <TableCell className={cn("pl-6", row.graded ? "font-semibold" : "text-muted-foreground")}>
              {row.label}
              {row.graded && (
                <span className="ml-2 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                  Graded
                </span>
              )}
            </TableCell>
            <TableCell className={cn("figure text-right", row.graded && "font-semibold")}>{format(row.kind, row.mine)}</TableCell>
            <TableCell className="figure text-right">{format(row.kind, row.analyst)}</TableCell>
            <TableCell className="figure pr-6 text-right text-muted-foreground">
              {diff === null ? (
                "—"
              ) : (
                <span className="inline-flex items-center gap-1">
                  {diff.direction === "up" && <ArrowUp className="size-3" aria-label="higher" />}
                  {diff.direction === "down" && <ArrowDown className="size-3" aria-label="lower" />}
                  {diff.text}
                </span>
              )}
            </TableCell>
          </TableRow>
        );
      })}
    </>
  );
}
