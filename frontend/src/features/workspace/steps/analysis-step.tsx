"use client";

import { ChartColumn, MapPin, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMarket } from "@/lib/api/hooks";
import { formatMoney, formatPercent } from "@/lib/format";
import { SCENARIOS, type ScenarioKey, type ScenarioResult } from "@/lib/underwriting/calc";
import { cn } from "@/lib/utils";

import { useWorkspace } from "../context";
import { FormulaHint } from "../formula-hint";
import { NumberField } from "../number-field";
import { SectionCard } from "../section-card";

const SCENARIO_META: Record<ScenarioKey, { label: string; hint: string }> = {
  low: { label: "Low", hint: "A cautious year" },
  mid: { label: "Mid", hint: "The expected year" },
  high: { label: "High", hint: "A strong year" },
};

export function AnalysisStep() {
  return (
    <div className="space-y-6">
      <RevenueCard />
      <HeadlineFigures />
      <ScenarioTable />
    </div>
  );
}

function RevenueCard() {
  const { underwriting, property } = useWorkspace();
  const market = useMarket(underwriting.market_id);

  return (
    <SectionCard
      anchor="section-revenue"
      icon={<TrendingUp />}
      title="Revenue scenarios"
      description="Forecast a year of gross booking revenue three ways. Your Mid forecast is the one that's graded."
    >
      <div className="space-y-6">
        {(market.data || property) && (
          <div className="flex gap-3 rounded-lg bg-muted/60 px-4 py-3 text-[13px] leading-5">
            <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
            <p className="text-muted-foreground">
              {market.data && <span className="font-medium text-foreground">{market.data.name}. </span>}
              {market.data?.description}
              {property && (
                <span className="figure">
                  {" "}
                  This home: {property.beds ?? "—"} bd · {property.baths ?? "—"} ba · {property.area?.toLocaleString("en-US") ?? "—"} sq ft.
                </span>
              )}
            </p>
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-3">
          {SCENARIOS.map((key) => (
            <NumberField
              key={key}
              name={`revenue.${key}`}
              label={`${SCENARIO_META[key].label} revenue`}
              kind="money"
              placeholder={key === "mid" ? "Expected year" : SCENARIO_META[key].hint}
              emphasis={key === "mid"}
              badge={
                key === "mid" ? (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground">
                    Graded
                  </span>
                ) : (
                  <span className="text-[11px] text-muted-foreground">{SCENARIO_META[key].hint}</span>
                )
              }
              description={key === "mid" ? "Compared with the analyst's Mid forecast" : "Annual gross revenue"}
            />
          ))}
        </div>

        <div className="grid gap-5 border-t pt-5 md:grid-cols-3">
          <NumberField
            name="revenue.coHostingPct"
            label="Co-hosting fee"
            kind="percent"
            placeholder="e.g. 10"
            description="Share of revenue paid to a co-host. Enter 0 if self-managed."
          />
          <NumberField
            name="revenue.appreciationPct"
            label="Annual appreciation"
            kind="percent"
            placeholder="e.g. 3"
            description="How much the property's value grows each year"
          />
        </div>
      </div>
    </SectionCard>
  );
}

function HeadlineFigures() {
  const { calc } = useWorkspace();
  const mid = calc.scenarios.mid;
  const taxes = calc.taxes;
  const oop = calc.totalOutOfPocket;
  const cocWithTax = mid && taxes && oop ? (mid.freeCashFlow + taxes.taxSavings) / oop : null;

  return (
    <section aria-label="First-year figures" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Figure
        label="First-year return"
        value={formatMoney(calc.firstYearTotalReturn)}
        hint="Mid cash flow + tax savings"
        tone={calc.firstYearTotalReturn === null ? undefined : calc.firstYearTotalReturn >= 0 ? "positive" : "negative"}
        formula={
          <FormulaHint
            title="First-year total return"
            formula="Annual free cash flow (Mid) + Tax savings"
            calculation={
              mid && taxes
                ? `${formatMoney(mid.freeCashFlow)} + ${formatMoney(taxes.taxSavings)} = ${formatMoney(calc.firstYearTotalReturn)}`
                : null
            }
          />
        }
      />
      <Figure
        label="Year-1 CoC incl. tax"
        value={formatPercent(cocWithTax)}
        hint="Mid, counting tax savings"
        formula={
          <FormulaHint
            title="Cash-on-cash including tax savings"
            formula="(Annual free cash flow + Tax savings) ÷ Total out of pocket"
            calculation={
              cocWithTax !== null && mid && taxes && oop
                ? `(${formatMoney(mid.freeCashFlow)} + ${formatMoney(taxes.taxSavings)}) ÷ ${formatMoney(oop)} = ${formatPercent(cocWithTax)}`
                : null
            }
          />
        }
      />
      <Figure
        label="Tax savings (year 1)"
        value={formatMoney(taxes?.taxSavings)}
        hint="From bonus depreciation"
        formula={
          <FormulaHint
            title="Tax savings"
            formula="Year-1 depreciation × Tax rate"
            calculation={taxes ? `${formatMoney(taxes.y1Depreciation)} × tax rate = ${formatMoney(taxes.taxSavings)}` : null}
          />
        }
      />
      <Figure
        label="PRR"
        value={formatPercent(calc.prr)}
        hint="Mid revenue ÷ purchase price"
        formula={
          <FormulaHint
            title="PRR"
            formula="Mid revenue ÷ Purchase price"
            calculation={
              calc.prr !== null && calc.purchase
                ? `${formatMoney(calc.scenarios.mid?.revenue ?? null)} ÷ ${formatMoney(calc.purchase.purchasePrice)} = ${formatPercent(calc.prr)}`
                : null
            }
            note="A quick check of how hard the property works for its price."
          />
        }
      />
    </section>
  );
}

function Figure({
  label,
  value,
  hint,
  formula,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  formula: ReactNode;
  tone?: "positive" | "negative";
}) {
  return (
    <div className="rounded-xl bg-card p-4 shadow-card ring-1 ring-foreground/[0.07]">
      <div className="flex items-center justify-between gap-1.5">
        <p className="text-xs font-medium text-balance text-muted-foreground">{label}</p>
        {formula}
      </div>
      <p
        className={cn(
          "figure mt-2.5 text-2xl font-semibold tracking-tight",
          tone === "positive" && "text-success-foreground",
          tone === "negative" && "text-danger-foreground",
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

type Row = {
  label: string;
  get: (s: ScenarioResult) => number | null;
  format: "money" | "percent";
  sign?: "minus";
  strong?: boolean;
  tone?: boolean;
  formula?: ReactNode;
};

const ROWS: Row[] = [
  { label: "Forecast revenue", get: (s) => s.revenue, format: "money" },
  { label: "Operating expenses", get: (s) => s.opexAnnual, format: "money", sign: "minus" },
  { label: "Co-hosting fee", get: (s) => s.coHostingFee, format: "money", sign: "minus" },
  {
    label: "Net operating income",
    get: (s) => s.noi,
    format: "money",
    strong: true,
    formula: <FormulaHint title="Net operating income" formula="Revenue − Operating expenses − Co-hosting fee % × Revenue" note="Before the mortgage." />,
  },
  { label: "Debt service", get: (s) => s.debtService, format: "money", sign: "minus" },
  {
    label: "Annual free cash flow",
    get: (s) => s.freeCashFlow,
    format: "money",
    strong: true,
    tone: true,
    formula: <FormulaHint title="Annual free cash flow" formula="NOI − 12 × Monthly mortgage payment" note="The money the investor actually keeps." />,
  },
  {
    label: "Cash-on-cash",
    get: (s) => s.cashOnCash,
    format: "percent",
    strong: true,
    tone: true,
    formula: <FormulaHint title="Cash-on-cash" formula="Annual free cash flow ÷ Total out of pocket" note="The headline return." />,
  },
  {
    label: "Total return incl. equity",
    get: (s) => s.totalReturn,
    format: "percent",
    formula: (
      <FormulaHint
        title="Total real-estate return"
        formula="(Free cash flow + Year-1 principal pay-down + Appreciation) ÷ Total out of pocket"
      />
    ),
  },
];

function ScenarioTable() {
  const { calc } = useWorkspace();
  const ready = SCENARIOS.some((key) => calc.scenarios[key] !== null);

  const missing: string[] = [];
  if (!calc.purchase) missing.push("purchase & financing");
  if (!ready && calc.purchase) missing.push("revenue and the co-hosting fee");

  return (
    <SectionCard
      icon={<ChartColumn />}
      title="Returns by scenario"
      description="Recalculated as you type. Debt service is the same in every scenario."
    >
      {!ready ? (
        <p className="rounded-lg border border-dashed px-4 py-6 text-center text-[13px] text-muted-foreground">
          Complete {missing.join(" and ")} to see cash flow and returns for each scenario.
        </p>
      ) : (
        <div className="-mx-6 overflow-x-auto">
          <Table className="min-w-[560px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6">Per year</TableHead>
                {SCENARIOS.map((key) => (
                  <TableHead
                    key={key}
                    className={cn("text-right", key === "mid" && "bg-accent/60 text-accent-foreground", key === "high" && "pr-6")}
                  >
                    {SCENARIO_META[key].label}
                    {key === "mid" && <span className="ml-1.5 text-[11px] font-normal">· graded</span>}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {ROWS.map((row) => (
                <TableRow key={row.label} className={cn("hover:bg-transparent", row.strong && "bg-muted/30")}>
                  <TableCell className={cn("pl-6", row.strong ? "font-medium" : "text-muted-foreground")}>
                    <span className="inline-flex items-center gap-1">
                      {row.label}
                      {row.formula}
                    </span>
                  </TableCell>
                  {SCENARIOS.map((key) => {
                    const scenario = calc.scenarios[key];
                    const value = scenario ? row.get(scenario) : null;
                    const text =
                      value === null
                        ? "—"
                        : row.format === "money"
                          ? `${row.sign === "minus" && value !== 0 ? "−" : ""}${formatMoney(Math.abs(value))}`
                          : formatPercent(value);
                    return (
                      <TableCell
                        key={key}
                        data-testid={`scenario-${key}-${row.label.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                        className={cn(
                          "figure text-right",
                          key === "mid" && "bg-accent/40",
                          key === "high" && "pr-6",
                          row.strong && "font-semibold",
                          row.tone && value !== null && value < 0 && "text-danger-foreground",
                          row.sign === "minus" && "text-muted-foreground",
                        )}
                      >
                        {row.format === "money" && row.sign !== "minus" ? formatMoney(value) : text}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </SectionCard>
  );
}
