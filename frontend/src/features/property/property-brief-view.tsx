"use client";

import {
  ArrowRight,
  ArrowUpRight,
  Calculator,
  EyeOff,
  LoaderCircle,
  MapPin,
  Tags,
  Target,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Eyebrow, PageContainer, PageHeader } from "@/components/page";
import { PropertyImage } from "@/components/property-image";
import { RatingBadge, StatusBadge } from "@/components/rating-badge";
import { ErrorState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/lib/api/client";
import { useDashboard, useMarket, useProperty, useStartUnderwriting, useSubmissions } from "@/lib/api/hooks";
import type { DashboardProperty, Property } from "@/lib/api/schemas";
import { formatHomeType, formatMoney, formatNumber, formatRelativeTime } from "@/lib/format";
import { parseNumber } from "@/lib/parse";
import { rankSubmissions } from "@/lib/scoring";

import { streetOf } from "../dashboard/property-card";

export function PropertyBriefView({ zpid }: { zpid: string }) {
  const property = useProperty(zpid);
  const dashboard = useDashboard();
  const market = useMarket(property.data?.market_id);
  const submissions = useSubmissions(zpid);

  if (property.isPending) return <BriefSkeleton />;
  if (property.isError) {
    return (
      <PageContainer className="py-10">
        <ErrorState
          title={(property.error as { status?: number }).status === 404 ? "Property not found" : "Couldn't load this property"}
          error={property.error}
          onRetry={() => property.refetch()}
        />
      </PageContainer>
    );
  }

  const p = property.data;
  const row = dashboard.data?.properties.find((item) => item.zpid === zpid);
  const street = p.address_street ?? streetOf(p.address);
  const price = parseNumber(p.unformatted_price);
  const attempts = submissions.data ? rankSubmissions(submissions.data) : [];
  const chronological = [...attempts].sort((a, b) => b.attemptNumber - a.attemptNumber);

  return (
    <PageContainer className="pb-16">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: street }]}
        title={street}
        description={[p.address_city, p.address_state].filter(Boolean).join(", ") + (p.address_zipcode ? ` ${p.address_zipcode}` : "")}
        eyebrow={row ? <StatusBadge status={row.status} /> : undefined}
      />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <ListingFacts property={p} price={price} street={street} />
          <section
            aria-labelledby="market-heading"
            className="rounded-xl bg-card p-6 shadow-card ring-1 ring-foreground/[0.07]"
          >
            <div className="flex items-start gap-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                <MapPin className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 space-y-1.5">
                <Eyebrow>Market</Eyebrow>
                {market.isPending ? (
                  <Skeleton className="h-5 w-56" />
                ) : (
                  <h2 id="market-heading" className="text-base font-semibold tracking-tight">
                    {market.data?.name ?? p.market?.name ?? "Unassigned market"}
                    {market.data?.region && (
                      <span className="font-normal text-muted-foreground"> · {market.data.region}</span>
                    )}
                  </h2>
                )}
                {market.isPending ? (
                  <Skeleton className="h-10 w-full max-w-lg" />
                ) : (
                  <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                    {market.data?.description ?? "No market notes for this property."}
                  </p>
                )}
                <p className="pt-1 text-xs text-muted-foreground">
                  Context only. Properties in a market share demand patterns, so use this to judge your revenue forecast.
                </p>
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-20">
          <TaskCard row={row} zpid={zpid} />
          {attempts.length > 0 && (
            <section
              aria-labelledby="attempts-heading"
              className="rounded-xl bg-card shadow-card ring-1 ring-foreground/[0.07]"
            >
              <div className="flex items-center justify-between border-b px-5 py-3.5">
                <h2 id="attempts-heading" className="text-sm font-semibold">
                  Your attempts
                </h2>
                <span className="text-xs text-muted-foreground">{attempts.length} graded</span>
              </div>
              <ul className="divide-y">
                {chronological.map((attempt) => (
                  <li key={attempt.id}>
                    <Link
                      href={`/submissions/${attempt.id}`}
                      className="flex items-center gap-3 px-5 py-3 text-sm transition-colors hover:bg-muted/50"
                    >
                      <span className="w-16 text-muted-foreground">Attempt {attempt.attemptNumber}</span>
                      <span className="figure flex-1 font-medium">{formatMoney(attempt.breakdown.candidate)}</span>
                      <RatingBadge rating={attempt.rating} withScore />
                      <ArrowUpRight className="size-4 text-muted-foreground" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="border-t px-5 py-2.5 text-xs text-muted-foreground">
                Latest {formatRelativeTime(chronological[0].submitted_at)}
              </p>
            </section>
          )}
        </aside>
      </div>
    </PageContainer>
  );
}

function ListingFacts({ property, price, street }: { property: Property; price: number | null; street: string }) {
  const pricePerSqft = price && property.area ? price / property.area : null;
  const facts: { label: string; value: string }[] = [
    { label: "List price", value: formatMoney(price) },
    { label: "Price / sq ft", value: formatMoney(pricePerSqft) },
    { label: "Bedrooms", value: formatNumber(property.beds) },
    { label: "Bathrooms", value: formatNumber(property.baths) },
    { label: "Living area", value: property.area ? `${formatNumber(property.area)} sq ft` : "—" },
    { label: "Home type", value: formatHomeType(property.home_type) },
    { label: "On market", value: property.time_on_zillow ?? "—" },
    { label: "Listing status", value: formatHomeType(property.home_status) },
  ];

  return (
    <section
      aria-labelledby="facts-heading"
      className="grid overflow-hidden rounded-xl bg-card shadow-card ring-1 ring-foreground/[0.07] md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
    >
      <PropertyImage src={property.img_src} alt={`Listing photo of ${street}`} className="aspect-[16/10] md:aspect-auto md:h-full" priority />
      <div className="flex flex-col md:border-l">
      <div className="flex items-center justify-between border-b px-6 py-3.5">
        <h2 id="facts-heading" className="text-sm font-semibold">
          Listing
        </h2>
        {property.detail_url && (
          <a
            href={property.detail_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline"
          >
            View on Zillow
            <ArrowUpRight className="size-3.5" aria-hidden />
          </a>
        )}
      </div>
      <dl className="grid flex-1 grid-cols-2 gap-px bg-border">
        {facts.map((fact) => (
          <div key={fact.label} className="bg-card px-6 py-4">
            <dt className="text-xs text-muted-foreground">{fact.label}</dt>
            <dd className="figure mt-1 text-[15px] font-semibold">{fact.value}</dd>
          </div>
        ))}
      </dl>
      </div>
    </section>
  );
}

const TASK_STEPS = [
  {
    icon: Calculator,
    title: "Financials",
    body: "Purchase & financing, setup spend, monthly costs and taxes.",
    result: "Total out of pocket",
  },
  {
    icon: TrendingUp,
    title: "Analysis",
    body: "Forecast a cautious, expected and strong year of revenue.",
    result: "Cash flow & cash-on-cash",
  },
  { icon: Tags, title: "Deal tags", body: "Label the deal at a glance. Tags don't affect the score.", result: null },
];

function TaskCard({ row, zpid }: { row: DashboardProperty | undefined; zpid: string }) {
  const router = useRouter();
  const start = useStartUnderwriting();

  const startAttempt = () =>
    start.mutate(zpid, {
      onSuccess: (underwriting) => router.push(`/underwritings/${underwriting.id}`),
      onError: (error) => toast.error("Couldn't start the underwriting", { description: errorMessage(error) }),
    });

  const draftId = row?.status === "in_progress" ? row.active_underwriting_id : null;
  const submitted = row?.status === "submitted";

  return (
    <section aria-labelledby="task-heading" className="overflow-hidden rounded-xl bg-card shadow-card ring-1 ring-foreground/[0.07]">
      <div className="space-y-1 p-5 pb-4">
        <Eyebrow>Your task</Eyebrow>
        <h2 id="task-heading" className="text-base font-semibold tracking-tight">
          Underwrite this property
        </h2>
        <p className="text-sm text-muted-foreground">Will it make money as a short-term rental, and how much?</p>
      </div>

      <ol className="relative mx-5 space-y-4 border-l border-dashed pb-1 pl-5">
        {TASK_STEPS.map((step, index) => (
          <li key={step.title} className="relative">
            <span className="absolute top-0 -left-[33px] grid size-6 place-items-center rounded-full bg-card text-xs font-semibold ring-1 ring-border">
              {index + 1}
            </span>
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <step.icon className="size-4 text-muted-foreground" aria-hidden />
              {step.title}
            </p>
            <p className="mt-0.5 text-[13px] leading-5 text-muted-foreground">{step.body}</p>
            {step.result && (
              <p className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                <ArrowRight className="size-3" aria-hidden /> {step.result}
              </p>
            )}
          </li>
        ))}
      </ol>

      <div className="mx-5 mt-5 space-y-3 rounded-lg bg-accent/60 p-4 text-[13px] leading-5">
        <p className="flex gap-2.5">
          <Target className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <span>
            <span className="font-medium">You&apos;re graded on your Mid revenue forecast.</span>{" "}
            <span className="text-muted-foreground">Within 10% of the analyst scores 100, within 25% scores 70, otherwise 40.</span>
          </span>
        </p>
        <p className="flex gap-2.5">
          <EyeOff className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <span className="text-muted-foreground">The analyst&apos;s underwriting stays hidden until you submit.</span>
        </p>
      </div>

      <div className="space-y-2 p-5">
        {draftId ? (
          <Button asChild size="lg" className="w-full">
            <Link href={`/underwritings/${draftId}`}>
              Resume draft
              <ArrowRight data-icon="inline-end" aria-hidden />
            </Link>
          </Button>
        ) : (
          <Button size="lg" className="w-full" onClick={startAttempt} disabled={start.isPending}>
            {start.isPending ? (
              <LoaderCircle className="animate-spin" data-icon="inline-start" aria-hidden />
            ) : null}
            {submitted ? "Start a new attempt" : "Start underwriting"}
            {!start.isPending && <ArrowRight data-icon="inline-end" aria-hidden />}
          </Button>
        )}
        {submitted && row?.latest_submission_id && (
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link href={`/submissions/${row.latest_submission_id}`}>View latest results</Link>
          </Button>
        )}
      </div>
    </section>
  );
}

function BriefSkeleton() {
  return (
    <PageContainer className="pb-16" >
      <div className="space-y-3 py-8">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]" aria-busy="true">
        <div className="space-y-6">
          <Skeleton className="h-[340px] rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
        <Skeleton className="h-[520px] rounded-xl" />
      </div>
    </PageContainer>
  );
}
