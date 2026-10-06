"use client";

import { ArrowRight, LoaderCircle, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { PageContainer, PageHeader } from "@/components/page";
import { RatingBadge } from "@/components/rating-badge";
import { ErrorState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, errorMessage } from "@/lib/api/client";
import {
  useDashboard,
  useProperty,
  useReferenceUnderwriting,
  useStartUnderwriting,
  useSubmission,
  useSubmissions,
  useUnderwriting,
} from "@/lib/api/hooks";
import type { Submission } from "@/lib/api/schemas";
import { formatDateTime, formatMoney, formatSignedPercent } from "@/lib/format";
import { RATING_META, describeDeviation, nextBandHint, rankSubmissions, signedDeviation } from "@/lib/scoring";
import { cn } from "@/lib/utils";

import { streetOf } from "../dashboard/property-card";
import { BandScale } from "./band-scale";
import { Comparison } from "./comparison";
import { Leaderboard } from "./leaderboard";
import { ScoreBands } from "./score-bands";
import { ScoreDial } from "./score-dial";

const HEADLINE: Record<Submission["rating"], string> = {
  best: "Right on target",
  medium: "Close, but not quite",
  low: "Well off the analyst's number",
};

export function ResultsView({ id }: { id: number }) {
  const submission = useSubmission(id);
  const zpid = submission.data?.zpid;
  const property = useProperty(zpid);
  const attempts = useSubmissions(zpid, { enabled: Boolean(zpid) });
  const mine = useUnderwriting(submission.data?.underwriting_id);
  const analyst = useReferenceUnderwriting(submission.data);

  if (!Number.isFinite(id) || submission.isError) {
    const notFound = !Number.isFinite(id) || (submission.error instanceof ApiError && submission.error.status === 404);
    return (
      <PageContainer className="py-10">
        <ErrorState
          title={notFound ? "Result not found" : "Couldn't load this result"}
          error={submission.error ?? new ApiError(404, "That link doesn't point to a graded attempt.")}
          onRetry={notFound ? undefined : () => submission.refetch()}
        />
      </PageContainer>
    );
  }
  if (submission.isPending) return <ResultsSkeleton />;

  const s = submission.data;
  const { breakdown } = s;
  const street = property.data?.address_street ?? streetOf(property.data?.address) ?? "Property";
  const deviation = signedDeviation(breakdown.candidate, breakdown.reference);
  const attemptNumber = attempts.data ? rankSubmissions(attempts.data).find((a) => a.id === s.id)?.attemptNumber : undefined;
  const hint = nextBandHint(breakdown);

  return (
    <PageContainer className="pb-16">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: street, href: `/properties/${s.zpid}` }, { label: "Results" }]}
        title={`Results · ${street}`}
        description={
          <>
            {attemptNumber ? `Attempt ${attemptNumber} · ` : ""}Submitted {formatDateTime(s.submitted_at)}
          </>
        }
        actions={<NextActions zpid={s.zpid} />}
      />

      <div className="space-y-6">
        <section
          aria-labelledby="score-heading"
          data-testid="score-card"
          data-rating={s.rating}
          className="overflow-hidden rounded-xl bg-card shadow-card ring-1 ring-foreground/[0.07]"
        >
          <div className="grid grid-cols-1 gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-12">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <ScoreDial score={RATING_META[s.rating].score} rating={s.rating} />
              <div className="space-y-2.5">
                <RatingBadge rating={s.rating} />
                <h2 id="score-heading" className="text-xl font-semibold tracking-tight text-balance">
                  {HEADLINE[s.rating]}
                </h2>
                <p className="text-sm leading-6 text-muted-foreground" data-testid="score-explanation">
                  {describeDeviation(breakdown)}
                </p>
                {hint && <p className="text-[13px] leading-5 text-muted-foreground">{hint}</p>}
              </div>
            </div>

            <div className="space-y-5">
              <dl className="grid grid-cols-3 divide-x rounded-lg border">
                <Stat label="Your Mid forecast" value={formatMoney(breakdown.candidate)} testId="stat-candidate" />
                <Stat label="Analyst's Mid" value={formatMoney(breakdown.reference)} testId="stat-reference" />
                <Stat
                  label="Difference"
                  value={formatSignedPercent(deviation)}
                  testId="stat-deviation"
                  className={cn(
                    s.rating === "best" && "text-success-foreground",
                    s.rating === "medium" && "text-warning-foreground",
                    s.rating === "low" && "text-danger-foreground",
                  )}
                />
              </dl>
              {breakdown.reference !== null && (
                <BandScale
                  candidate={breakdown.candidate}
                  reference={breakdown.reference}
                  rating={s.rating}
                  bestThreshold={breakdown.best_threshold ?? undefined}
                  mediumThreshold={breakdown.medium_threshold ?? undefined}
                />
              )}
            </div>
          </div>
          <div className="border-t bg-muted/40 px-6 py-3 text-xs text-muted-foreground sm:px-8">
            Graded on one number: the {breakdown.label.toLowerCase()}. Deviation = |yours − analyst&apos;s| ÷ analyst&apos;s.
            Exactly 10% or 25% still counts in your favour.
          </div>
        </section>

        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className="space-y-6">
            {attempts.isError ? (
              <ErrorState title="Couldn't load the leaderboard" error={attempts.error} onRetry={() => attempts.refetch()} />
            ) : attempts.data ? (
              <Leaderboard submissions={attempts.data} currentId={s.id} />
            ) : (
              <Skeleton className="h-80 rounded-xl" />
            )}
            <ScoreBands breakdown={breakdown} />
          </div>
          {analyst.isError || mine.isError ? (
            <ErrorState
              title="Couldn't load the comparison"
              error={analyst.error ?? mine.error}
              onRetry={() => {
                void analyst.refetch();
                void mine.refetch();
              }}
            />
          ) : (
            <Comparison mine={mine.data} analyst={analyst.data} />
          )}
        </div>
      </div>
    </PageContainer>
  );
}

function Stat({ label, value, testId, className }: { label: string; value: string; testId: string; className?: string }) {
  return (
    <div className="px-4 py-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("figure mt-1 text-lg font-semibold tracking-tight", className)} data-testid={testId}>
        {value}
      </dd>
    </div>
  );
}

function NextActions({ zpid }: { zpid: string }) {
  const router = useRouter();
  const start = useStartUnderwriting();
  const dashboard = useDashboard();
  const next = dashboard.data?.properties.find((p) => p.status === "not_started" && p.zpid !== zpid);

  return (
    <>
      <Button
        variant="outline"
        disabled={start.isPending}
        onClick={() =>
          start.mutate(zpid, {
            onSuccess: (underwriting) => router.push(`/underwritings/${underwriting.id}`),
            onError: (error) => toast.error("Couldn't start a new attempt", { description: errorMessage(error) }),
          })
        }
      >
        {start.isPending ? (
          <LoaderCircle className="animate-spin" data-icon="inline-start" aria-hidden />
        ) : (
          <RotateCcw data-icon="inline-start" aria-hidden />
        )}
        Try again
      </Button>
      {next ? (
        <Button asChild>
          <Link href={`/properties/${next.zpid}`}>
            Next case
            <ArrowRight data-icon="inline-end" aria-hidden />
          </Link>
        </Button>
      ) : (
        <Button asChild>
          <Link href="/">
            Back to dashboard
            <ArrowRight data-icon="inline-end" aria-hidden />
          </Link>
        </Button>
      )}
    </>
  );
}

function ResultsSkeleton() {
  return (
    <PageContainer className="pb-16" >
      <div className="space-y-3 py-8">
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-8 w-80" />
      </div>
      <div className="space-y-6" aria-busy="true">
        <Skeleton className="h-64 rounded-xl" />
        <div className="grid gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    </PageContainer>
  );
}

