"use client";

import { ArrowRight, CircleAlert, CircleCheck, CircleDashed, ClipboardCheck, Send, TriangleAlert } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatMoney, formatPctUnits, formatPercent } from "@/lib/format";
import { parseNumber } from "@/lib/parse";
import { SECTIONS, type UnderwritingFormValues } from "@/lib/underwriting/fields";
import type { ReviewItem, ReviewSection } from "@/lib/underwriting/review";
import { cn } from "@/lib/utils";

import { useWorkspace } from "../context";
import { SectionCard } from "../section-card";

export function ReviewStep() {
  const { review, requestSubmit, submitting } = useWorkspace();
  const ready = review.blocking === 0;
  const pct = review.totalRequired ? (review.completeRequired / review.totalRequired) * 100 : 0;

  return (
    <div className="space-y-6">
      <section
        aria-label="Submission readiness"
        data-testid="review-status"
        data-ready={ready}
        className={cn(
          "rounded-xl p-6 ring-1",
          ready ? "bg-success/8 ring-success/25" : "bg-card shadow-card ring-foreground/[0.07]",
        )}
      >
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <span
              className={cn(
                "grid size-10 shrink-0 place-items-center rounded-full",
                ready ? "bg-success/15 text-success-foreground" : "bg-warning/15 text-warning-foreground",
              )}
            >
              {ready ? <CircleCheck className="size-5" aria-hidden /> : <ClipboardCheck className="size-5" aria-hidden />}
            </span>
            <div className="space-y-1">
              <h2 className="text-base font-semibold tracking-tight">
                {ready
                  ? "Ready to submit"
                  : `${review.blocking} ${review.blocking === 1 ? "item needs" : "items need"} attention before you submit`}
              </h2>
              <p className="text-sm text-muted-foreground">
                {ready
                  ? "Every required input is complete and valid. Check the assumptions below, then submit for grading."
                  : [
                      review.missing && `${review.missing} missing`,
                      review.invalid && `${review.invalid} invalid`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
              </p>
            </div>
          </div>
          <div className="w-full shrink-0 space-y-1.5 md:w-56">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Required inputs</span>
              <span className="figure font-medium text-foreground">
                {review.completeRequired} / {review.totalRequired}
              </span>
            </div>
            <Progress value={pct} aria-label="Required inputs complete" className="h-1.5" />
          </div>
        </div>
      </section>

      <SectionCard icon={<ClipboardCheck />} title="Checklist" description="Everything the grader needs, section by section.">
        <ul className="divide-y rounded-lg border">
          {review.sections.map((section) => (
            <ChecklistSection key={section.id} section={section} />
          ))}
        </ul>
      </SectionCard>

      {review.warnings.length > 0 && <Warnings />}

      <Assumptions />

      <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-lg text-[13px] text-muted-foreground">
          Submitting locks this attempt. You&apos;ll see your score straight away, along with the analyst&apos;s
          underwriting for comparison.
        </p>
        <Button size="lg" onClick={requestSubmit} disabled={!ready || submitting} className="px-4">
          <Send data-icon="inline-start" aria-hidden />
          Submit for grading
        </Button>
      </div>
    </div>
  );
}

function ChecklistSection({ section }: { section: ReviewSection }) {
  const { goTo } = useWorkspace();
  const open = section.items.filter((item) => item.status !== "complete");
  const total = section.items.length;
  const missing = open.filter((item) => item.status === "missing").length;
  const invalid = open.filter((item) => item.status === "invalid").length;

  const summary = section.optional
    ? open.length === 0
      ? { tone: "complete", text: "Optional · looks good" }
      : { tone: "invalid", text: `${open.length} ${open.length === 1 ? "row" : "rows"} to fix` }
    : open.length === 0
      ? { tone: "complete", text: `${total} of ${total} complete` }
      : {
          tone: invalid ? "invalid" : "missing",
          text: [missing && `${missing} missing`, invalid && `${invalid} invalid`].filter(Boolean).join(" · "),
        };

  return (
    <li data-testid={`checklist-${section.id}`} className="px-4 py-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <StatusIcon status={summary.tone as ReviewItem["status"]} />
          <span className="text-sm font-medium">{section.title}</span>
        </div>
        <span
          className={cn(
            "text-xs",
            summary.tone === "complete" && "text-muted-foreground",
            summary.tone === "missing" && "text-warning-foreground",
            summary.tone === "invalid" && "text-danger-foreground",
          )}
        >
          {summary.text}
        </span>
      </div>
      {open.length > 0 && (
        <ul className="mt-2.5 space-y-1.5 pl-[26px]">
          {open.map((item) => (
            <li
              key={item.id}
              data-testid={`checklist-item-${item.id}`}
              data-status={item.status}
              className="flex items-center justify-between gap-3 rounded-md bg-muted/50 px-3 py-2"
            >
              <span className="min-w-0 text-[13px]">
                <span className="font-medium">{item.label}</span>
                <span className={item.status === "invalid" ? "text-danger-foreground" : "text-muted-foreground"}>
                  {" "}
                  · {item.status === "missing" ? "Missing" : item.message}
                </span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="shrink-0 text-primary"
                onClick={() => goTo(item.step, item.fieldPath)}
                aria-label={`Fix ${item.label}`}
              >
                Fix
                <ArrowRight data-icon="inline-end" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function StatusIcon({ status }: { status: ReviewItem["status"] }) {
  if (status === "complete") return <CircleCheck className="size-4 text-success-foreground" aria-label="Complete" />;
  if (status === "invalid") return <CircleAlert className="size-4 text-danger-foreground" aria-label="Has errors" />;
  return <CircleDashed className="size-4 text-warning-foreground" aria-label="Incomplete" />;
}

function Warnings() {
  const { review, goTo } = useWorkspace();
  return (
    <section
      aria-labelledby="warnings-heading"
      data-testid="review-warnings"
      className="rounded-xl bg-warning/8 p-5 ring-1 ring-warning/30"
    >
      <h2 id="warnings-heading" className="flex items-center gap-2 text-sm font-semibold text-warning-foreground">
        <TriangleAlert className="size-4" aria-hidden />
        Worth a second look
        <span className="font-normal">· these won&apos;t block submission</span>
      </h2>
      <ul className="mt-3 space-y-2">
        {review.warnings.map((warning) => (
          <li key={warning.id} data-testid={`warning-${warning.id}`} className="flex items-start justify-between gap-3 text-[13px]">
            <span>{warning.message}</span>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="shrink-0"
              onClick={() => goTo(warning.step, warning.fieldPath ?? `#${SECTIONS[warning.section].anchor}`)}
            >
              Review
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Assumptions() {
  const { calc } = useWorkspace();
  const { control } = useFormContext<UnderwritingFormValues>();
  const values = useWatch({ control }) as UnderwritingFormValues;
  const pct = (raw: string | undefined) => formatPctUnits(parseNumber(raw));
  const money = (raw: string | undefined) => formatMoney(parseNumber(raw));

  const groups: { title: string; rows: [string, string][] }[] = [
    {
      title: "Financing",
      rows: [
        ["Purchase price", money(values.purchase?.purchasePrice)],
        ["Down payment", pct(values.purchase?.downPaymentPct)],
        ["Interest rate", pct(values.purchase?.interestRatePct)],
        ["Loan term", values.purchase?.termYears ? `${values.purchase.termYears} years` : "—"],
        ["Closing costs", pct(values.purchase?.closingCostsPct)],
      ],
    },
    {
      title: "Costs",
      rows: [
        ["Setup spend", formatMoney(calc.optimizationTotal)],
        ["Monthly OPEX", formatMoney(calc.opexMonthly)],
        ["Co-hosting fee", pct(values.revenue?.coHostingPct)],
        ["Appreciation", pct(values.revenue?.appreciationPct)],
        [
          "Tax inputs",
          [values.taxes?.landPct, values.taxes?.slaPct, values.taxes?.bonusPct, values.taxes?.taxRatePct]
            .map((v) => (parseNumber(v) === null ? "—" : `${parseNumber(v)}%`))
            .join(" / "),
        ],
      ],
    },
    {
      title: "Outcome",
      rows: [
        ["Total out of pocket", formatMoney(calc.totalOutOfPocket)],
        ["Mid free cash flow", formatMoney(calc.scenarios.mid?.freeCashFlow)],
        ["Cash-on-cash L / M / H", ["low", "mid", "high"].map((k) => formatPercent(calc.scenarios[k as "low"]?.cashOnCash)).join(" / ")],
        ["Tax savings", formatMoney(calc.taxes?.taxSavings)],
        ["PRR", formatPercent(calc.prr)],
      ],
    },
  ];

  return (
    <SectionCard
      title="Key assumptions"
      description="What you're submitting. The grade depends only on the Mid forecast."
      action={
        <div className="rounded-lg bg-accent px-3 py-2 text-right">
          <p className="text-[11px] font-medium tracking-wide text-accent-foreground/80 uppercase">Graded Mid forecast</p>
          <p className="figure text-lg font-semibold text-accent-foreground" data-testid="review-graded-mid">
            {money(values.revenue?.mid)}
          </p>
        </div>
      }
    >
      <div className="grid gap-6 md:grid-cols-3">
        {groups.map((group) => (
          <div key={group.title}>
            <p className="mb-2 text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase">{group.title}</p>
            <dl className="space-y-1.5">
              {group.rows.map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-3 text-[13px]">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="figure text-right font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
