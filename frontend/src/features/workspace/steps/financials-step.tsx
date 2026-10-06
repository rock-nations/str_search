"use client";

import { ArrowRight, CircleAlert, Landmark, Receipt, RotateCcw, Sofa, Wallet } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import { parseNumber } from "@/lib/parse";
import { OPEX_SUGGESTIONS, OPTIMIZATION_SUGGESTIONS, STANDARD_TAXES } from "@/lib/underwriting/defaults";
import type { UnderwritingFormValues } from "@/lib/underwriting/fields";
import { OOP_ERROR_MESSAGE, hasZeroOutOfPocket } from "@/lib/underwriting/form-schema";

import { useWorkspace } from "../context";
import { FormulaHint } from "../formula-hint";
import { LineItemsEditor } from "../line-items-editor";
import { NumberField } from "../number-field";
import { DerivedStrip, SectionCard } from "../section-card";

export function FinancialsStep() {
  return (
    <div className="space-y-6">
      <PurchaseCard />
      <SectionCard
        anchor="section-optimization"
        icon={<Sofa />}
        title="Optimization list"
        description="One-time setup before the first guest arrives. Adds to total out of pocket and to the depreciable basis."
      >
        <LineItemsEditor
          kind="optimization"
          suggestions={OPTIMIZATION_SUGGESTIONS}
          emptyHint="No setup costs yet. Add furniture, a hot tub, a game room or anything else the property needs."
        />
      </SectionCard>
      <SectionCard
        anchor="section-opex"
        icon={<Receipt />}
        title="Operating expenses"
        description="Recurring monthly costs. Low and High scenarios scale them by ×0.96 and ×1.04."
      >
        <LineItemsEditor
          kind="opex"
          suggestions={OPEX_SUGGESTIONS}
          amountSuffix="/ mo"
          emptyHint="No monthly costs yet. Most properties carry utilities, internet, insurance and property tax."
        />
      </SectionCard>
      <TaxesCard />
    </div>
  );
}

function PurchaseCard() {
  const { calc, listingPrice } = useWorkspace();
  const { control } = useFormContext<UnderwritingFormValues>();
  const priceRaw = useWatch({ control, name: "purchase.purchasePrice" });
  const zeroOutOfPocket = hasZeroOutOfPocket(useWatch({ control }) as UnderwritingFormValues);
  const price = parseNumber(priceRaw);
  const p = calc.purchase;
  const fromListing = listingPrice !== null && price === listingPrice;

  return (
    <SectionCard
      anchor="section-purchase"
      icon={<Landmark />}
      title="Purchase & financing"
      description="Works out the loan, the monthly mortgage and the cash needed at closing."
      footer={
        <DerivedStrip
          items={[
            { label: "Down payment", value: formatMoney(p?.downPayment) },
            { label: "Loan amount", value: formatMoney(p?.loanAmount) },
            { label: "Closing costs", value: formatMoney(p?.closingCosts) },
            { label: "Monthly mortgage", value: formatMoney(p?.monthlyPayment), strong: true },
          ]}
        />
      }
    >
      <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2 lg:grid-cols-6">
        <NumberField
          name="purchase.purchasePrice"
          label="Purchase price"
          kind="money"
          className="sm:col-span-2 lg:col-span-6 xl:col-span-2"
          badge={
            fromListing ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                From listing
              </span>
            ) : listingPrice !== null && price !== null ? (
              <span className="text-[11px] text-muted-foreground">List {formatMoney(listingPrice)}</span>
            ) : null
          }
          description="Prefilled from the listing. Change it if you'd offer less."
        />
        <NumberField
          name="purchase.downPaymentPct"
          label="Down payment"
          kind="percent"
          placeholder="e.g. 20"
          className="lg:col-span-2 xl:col-span-1"
          description={p ? `= ${formatMoney(p.downPayment)}` : "Share of the price paid up front"}
        />
        <NumberField
          name="purchase.interestRatePct"
          label="Interest rate"
          kind="percent"
          placeholder="e.g. 7"
          className="lg:col-span-2 xl:col-span-1"
          description="Annual rate"
        />
        <NumberField
          name="purchase.termYears"
          label="Loan term"
          kind="years"
          placeholder="e.g. 30"
          className="lg:col-span-1 xl:col-span-1"
        />
        <NumberField
          name="purchase.closingCostsPct"
          label="Closing costs"
          kind="percent"
          placeholder="e.g. 3"
          className="lg:col-span-1 xl:col-span-1"
          description={p ? `= ${formatMoney(p.closingCosts)}` : undefined}
        />
      </div>
      {zeroOutOfPocket && (
        <p
          role="alert"
          data-testid="oop-error"
          className="mt-5 flex items-start gap-2 rounded-lg bg-danger/8 px-3 py-2.5 text-[13px] text-danger-foreground ring-1 ring-danger/20"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {OOP_ERROR_MESSAGE}
        </p>
      )}
    </SectionCard>
  );
}

function TaxesCard() {
  const { calc } = useWorkspace();
  const { control, setValue } = useFormContext<UnderwritingFormValues>();
  const taxes = useWatch({ control, name: "taxes" });
  const isStandard = (Object.keys(STANDARD_TAXES) as (keyof typeof STANDARD_TAXES)[]).every(
    (key) => parseNumber(taxes?.[key]) === Number(STANDARD_TAXES[key]),
  );
  const t = calc.taxes;

  const resetToStandard = () => {
    for (const [key, value] of Object.entries(STANDARD_TAXES)) {
      setValue(`taxes.${key as keyof typeof STANDARD_TAXES}`, value, { shouldDirty: true, shouldValidate: true });
    }
  };

  return (
    <SectionCard
      anchor="section-taxes"
      icon={<Wallet />}
      title="Taxes"
      description="Estimates first-year tax savings from depreciation (cost segregation)."
      action={
        isStandard ? (
          <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
            Standard training assumptions
          </span>
        ) : (
          <Button type="button" variant="ghost" size="sm" onClick={resetToStandard}>
            <RotateCcw data-icon="inline-start" aria-hidden />
            Reset to 20 / 25 / 60 / 37
          </Button>
        )
      }
      footer={
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
          <TaxChainStep label="Improvement basis" value={formatMoney(t?.improvementBasis)} />
          <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden />
          <TaxChainStep label="Short-life assets" value={formatMoney(t?.shortLifeAssets)} />
          <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden />
          <TaxChainStep label="Year-1 depreciation" value={formatMoney(t?.y1Depreciation)} />
          <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden />
          <TaxChainStep label="Tax savings" value={formatMoney(t?.taxSavings)} strong />
          <span className="ml-auto">
            <FormulaHint
              title="Tax savings"
              formula="Basis = Price × (1 − Land %) + Setup · SLA = Basis × SLA % · Y1 loss = SLA × Bonus % · Savings = Y1 loss × Tax rate"
              calculation={
                t
                  ? `${formatMoney(t.improvementBasis)} → ${formatMoney(t.shortLifeAssets)} → ${formatMoney(t.y1Depreciation)} → ${formatMoney(t.taxSavings)}`
                  : null
              }
            />
          </span>
        </div>
      }
    >
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <NumberField name="taxes.landPct" label="Land value" kind="percent" description="Share of price that is land" />
        <NumberField name="taxes.slaPct" label="Short-life assets" kind="percent" description="Multiplier on the basis" />
        <NumberField name="taxes.bonusPct" label="Bonus depreciation" kind="percent" description="Taken in year one" />
        <NumberField name="taxes.taxRatePct" label="Tax rate" kind="percent" description="Investor's marginal rate" />
      </div>
    </SectionCard>
  );
}

function TaxChainStep({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <span className="flex flex-col">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={strong ? "figure font-semibold text-success-foreground" : "figure font-medium"}>{value}</span>
    </span>
  );
}
