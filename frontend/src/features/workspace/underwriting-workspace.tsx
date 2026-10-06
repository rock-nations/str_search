"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, ChevronUp, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Breadcrumbs, Eyebrow, PageContainer } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { errorMessage } from "@/lib/api/client";
import { useSubmitUnderwriting } from "@/lib/api/hooks";
import type { Property, Underwriting } from "@/lib/api/schemas";
import { formatMoney, formatPercent } from "@/lib/format";
import { parseNumber } from "@/lib/parse";
import { calculate } from "@/lib/underwriting/calc";
import { STEPS, type StepId, type UnderwritingFormValues } from "@/lib/underwriting/fields";
import { underwritingFormSchema } from "@/lib/underwriting/form-schema";
import { apiToForm, buildPayload, toCalcInputs } from "@/lib/underwriting/mappers";
import { buildReview } from "@/lib/underwriting/review";

import { streetOf } from "../dashboard/property-card";
import { WorkspaceProvider, useWorkspace, type WorkspaceContextValue } from "./context";
import { DealChain } from "./deal-chain";
import { SaveIndicator } from "./save-indicator";
import { StepNav } from "./step-nav";
import { AnalysisStep } from "./steps/analysis-step";
import { FinancialsStep } from "./steps/financials-step";
import { ReviewStep } from "./steps/review-step";
import { TagsStep } from "./steps/tags-step";
import { SubmitDialog } from "./submit-dialog";
import { applyServerErrors, useAutosave } from "./use-autosave";
import { useStep } from "./use-step";

export function UnderwritingWorkspace({
  underwriting,
  property,
}: {
  underwriting: Underwriting;
  property: Property | undefined;
}) {
  const router = useRouter();
  // The form is seeded once; later API responses update figures, not inputs.
  const [seed] = useState(() => apiToForm(underwriting));
  const form = useForm<UnderwritingFormValues, unknown, UnderwritingFormValues>({
    defaultValues: seed.values,
    resolver: zodResolver(underwritingFormSchema),
    mode: "onTouched",
  });

  const values = useWatch({ control: form.control }) as UnderwritingFormValues;
  const calc = useMemo(() => calculate(toCalcInputs(values)), [values]);
  const review = useMemo(() => buildReview(values, calc), [values, calc]);
  const autosave = useAutosave(underwriting.id, form);
  const [step, setStep] = useStep();
  const [pendingFocus, setPendingFocus] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const submit = useSubmitUnderwriting(underwriting.id);
  const listingPrice = parseNumber(property?.unformatted_price) ?? underwriting.purchase_price;
  const { flush } = autosave;

  const goTo = useCallback(
    (next: StepId, fieldPath?: string) => {
      void flush();
      setStep(next);
      if (fieldPath) setPendingFocus(fieldPath);
      else window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [flush, setStep],
  );

  // Focus a field after its step has rendered (used by "Fix" links).
  useEffect(() => {
    if (!pendingFocus) return;
    const frame = requestAnimationFrame(() => {
      // A target is either a form field path or a "#section-anchor".
      if (pendingFocus.startsWith("#")) {
        document.getElementById(pendingFocus.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        const element = document.querySelector<HTMLElement>(`[name="${CSS.escape(pendingFocus)}"]`);
        if (element) {
          element.scrollIntoView({ block: "center", behavior: "smooth" });
          element.focus({ preventScroll: true });
          void form.trigger(pendingFocus as never);
        }
      }
      setPendingFocus(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [pendingFocus, step, form]);

  const requestSubmit = useCallback(async () => {
    const valid = await form.trigger();
    const latest = buildReview(form.getValues(), calculate(toCalcInputs(form.getValues())));
    if (!valid || latest.blocking > 0) {
      setStep("review");
      window.scrollTo({ top: 0, behavior: "smooth" });
      toast.error("Not ready to submit yet", {
        description: `${latest.blocking} ${latest.blocking === 1 ? "item needs" : "items need"} attention. See the checklist.`,
      });
      return;
    }
    setConfirmOpen(true);
  }, [form, setStep]);

  const confirmSubmit = () => {
    autosave.stop();
    const built = buildPayload(form.getValues());
    submit.mutate(built.payload, {
      onSuccess: (result) => {
        toast.success("Submitted for grading");
        router.push(`/submissions/${result.submission.id}`);
      },
      onError: (error) => {
        autosave.resume();
        setConfirmOpen(false);
        const mapped = applyServerErrors(form, error, built.rowIndexes);
        toast.error("Submission failed", {
          description: mapped ? "The API rejected some values. They're highlighted in the form." : errorMessage(error),
        });
      },
    });
  };

  const context: WorkspaceContextValue = {
    underwriting,
    property,
    listingPrice,
    calc,
    review,
    autosave,
    step,
    goTo,
    requestSubmit: () => void requestSubmit(),
    submitting: submit.isPending,
  };

  return (
    <FormProvider {...form}>
      <WorkspaceProvider value={context}>
        <WorkspaceHeader />
        <PageContainer className="pt-6 pb-32 lg:pb-16">
          <div className="mb-5 xl:hidden">
            <StepNav orientation="horizontal" />
          </div>
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[208px_minmax(0,1fr)_320px] 2xl:grid-cols-[220px_minmax(0,1fr)_340px]">
            <aside className="hidden xl:block xl:sticky xl:top-20">
              <StepNav orientation="vertical" />
            </aside>
            <form onSubmit={(event) => event.preventDefault()} noValidate className="min-w-0" aria-label="Underwriting">
              <StepIntro />
              {step === "financials" && <FinancialsStep />}
              {step === "analysis" && <AnalysisStep />}
              {step === "tags" && <TagsStep />}
              {step === "review" && <ReviewStep />}
              <StepFooter />
            </form>
            <aside className="hidden lg:sticky lg:top-20 lg:block">
              <DealChain />
            </aside>
          </div>
        </PageContainer>
        <MobileSummaryBar />
        <SubmitDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          onConfirm={confirmSubmit}
          submitting={submit.isPending}
        />
      </WorkspaceProvider>
    </FormProvider>
  );
}

function WorkspaceHeader() {
  const { underwriting, property, listingPrice, requestSubmit, submitting } = useWorkspace();
  const street = property?.address_street ?? underwriting.street ?? streetOf(underwriting.property_address);
  const zpid = underwriting.zpid;

  return (
    <div className="border-b bg-card">
      <PageContainer className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 space-y-1">
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/" },
              { label: street, href: zpid ? `/properties/${zpid}` : undefined },
              { label: "Underwriting" },
            ]}
          />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-xl font-semibold tracking-tight">{street}</h1>
            <span className="text-sm text-muted-foreground">
              {[underwriting.city, underwriting.state].filter(Boolean).join(", ")}
              {property?.market?.name && <> · {property.market.name}</>}
              {listingPrice !== null && (
                <>
                  {" "}
                  · List <span className="figure">{formatMoney(listingPrice)}</span>
                </>
              )}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 md:justify-end">
          <SaveIndicator />
          <Button onClick={requestSubmit} disabled={submitting} data-testid="header-submit">
            <Send data-icon="inline-start" aria-hidden />
            Submit
          </Button>
        </div>
      </PageContainer>
    </div>
  );
}

const STEP_INTRO: Record<StepId, string> = {
  financials: "Everything the investor pays: the purchase, setup spend, monthly running costs and the tax assumptions.",
  analysis: "Forecast revenue for a cautious, an expected and a strong year. Returns update as you type.",
  tags: "Describe the deal at a glance. Optional, and not part of the score.",
  review: "Check what's missing or invalid, look over your assumptions, then submit.",
};

function StepIntro() {
  const { step } = useWorkspace();
  const index = STEPS.findIndex((s) => s.id === step);
  const meta = STEPS[index];
  return (
    <div className="mb-5 space-y-1">
      <Eyebrow>
        Step {index + 1} of {STEPS.length} · {meta.description}
      </Eyebrow>
      <h2 className="text-xl font-semibold tracking-tight" data-testid="step-title">
        {meta.label}
      </h2>
      <p className="text-sm text-muted-foreground">{STEP_INTRO[step]}</p>
    </div>
  );
}

function StepFooter() {
  const { step, goTo } = useWorkspace();
  const index = STEPS.findIndex((s) => s.id === step);
  const previous = STEPS[index - 1];
  const next = STEPS[index + 1];

  return (
    <div className="mt-8 flex items-center justify-between gap-3 border-t pt-6">
      {previous ? (
        <Button variant="ghost" onClick={() => goTo(previous.id)}>
          <ArrowLeft data-icon="inline-start" aria-hidden />
          {previous.label}
        </Button>
      ) : (
        <Button variant="ghost" asChild>
          <Link href="/">
            <ArrowLeft data-icon="inline-start" aria-hidden />
            Dashboard
          </Link>
        </Button>
      )}
      {next && (
        <Button onClick={() => goTo(next.id)} variant={next.id === "review" ? "default" : "outline"}>
          Continue to {next.label.toLowerCase()}
          <ArrowRight data-icon="inline-end" aria-hidden />
        </Button>
      )}
    </div>
  );
}

function MobileSummaryBar() {
  const { calc } = useWorkspace();
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 backdrop-blur lg:hidden">
      <Sheet>
        <SheetTrigger asChild>
          <button
            type="button"
            className="mx-auto flex w-full max-w-[1440px] items-center gap-6 px-4 py-3 text-left sm:px-6"
            aria-label="Open deal summary"
          >
            <span>
              <span className="block text-[11px] text-muted-foreground">Out of pocket</span>
              <span className="figure text-sm font-semibold">{formatMoney(calc.totalOutOfPocket)}</span>
            </span>
            <span>
              <span className="block text-[11px] text-muted-foreground">Mid cash flow</span>
              <span className="figure text-sm font-semibold">{formatMoney(calc.scenarios.mid?.freeCashFlow)}</span>
            </span>
            <span>
              <span className="block text-[11px] text-muted-foreground">Mid CoC</span>
              <span className="figure text-sm font-semibold">{formatPercent(calc.scenarios.mid?.cashOnCash)}</span>
            </span>
            <ChevronUp className="ml-auto size-4 text-muted-foreground" aria-hidden />
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto p-4">
          <SheetHeader className="px-0">
            <SheetTitle>Deal summary</SheetTitle>
          </SheetHeader>
          <DealChain className="shadow-none" />
        </SheetContent>
      </Sheet>
    </div>
  );
}
