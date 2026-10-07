"use client";

import { ArrowRight, CircleCheck, Gauge, House, PencilLine, Trophy } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Eyebrow, PageContainer, PageHeader } from "@/components/page";
import { PropertyImage } from "@/components/property-image";
import { StatusBadge } from "@/components/rating-badge";
import { StatTile } from "@/components/stat-tile";
import { EmptyState, ErrorState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDashboard, useSubmissions } from "@/lib/api/hooks";
import type { Dashboard, DashboardProperty, TrainingStatus } from "@/lib/api/schemas";
import { formatMoney } from "@/lib/format";
import { parseNumber } from "@/lib/parse";
import { ordinal } from "@/lib/scoring";

import { useTeam } from "../team/use-team";

import { PropertyCard, primaryAction, streetOf } from "./property-card";
import { RecentAttempts } from "./recent-attempts";

type StatusFilter = "all" | TrainingStatus;

export function DashboardView() {
  const dashboard = useDashboard();
  const submissions = useSubmissions();
  const team = useTeam({ skills: false });
  const you = team.data?.ranking.find((r) => r.trainee.isYou);
  const teamRank = you && you.averageScore !== null ? { rank: you.rank, of: team.data?.ranking.length ?? 0 } : null;

  return (
    <PageContainer className="pb-16">
      <PageHeader
        title="Training dashboard"
        description="Pick a property, underwrite it, and see how close your Mid revenue forecast lands to the analyst's."
      />

      {dashboard.isPending ? (
        <DashboardSkeleton />
      ) : dashboard.isError ? (
        <ErrorState title="Couldn't load your training cases" error={dashboard.error} onRetry={() => dashboard.refetch()} />
      ) : dashboard.data.properties.length === 0 ? (
        <EmptyState
          icon={<House />}
          title="No training cases yet"
          description="When properties are assigned to you they'll show up here. Ask your lead to load the training set."
        />
      ) : (
        <div className="space-y-10">
          <SummaryTiles data={dashboard.data} teamRank={teamRank} />
          <NextUp properties={dashboard.data.properties} />
          <TrainingCases properties={dashboard.data.properties} summary={dashboard.data.summary} />
          <section aria-labelledby="recent-attempts" className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 id="recent-attempts" className="text-base font-semibold tracking-tight">
                  Recent attempts
                </h2>
                <p className="text-sm text-muted-foreground">Your latest graded submissions across every property.</p>
              </div>
            </div>
            {submissions.isError ? (
              <ErrorState title="Couldn't load attempts" error={submissions.error} onRetry={() => submissions.refetch()} />
            ) : submissions.isPending ? (
              <Skeleton className="h-48 rounded-xl" />
            ) : (
              <RecentAttempts submissions={submissions.data} properties={dashboard.data.properties} />
            )}
          </section>
        </div>
      )}
    </PageContainer>
  );
}

function SummaryTiles({ data, teamRank }: { data: Dashboard; teamRank: { rank: number; of: number } | null }) {
  const { summary, properties } = data;
  const pct = summary.total_properties ? (summary.submitted / summary.total_properties) * 100 : 0;
  const bestCount = properties.filter((p) => p.best_rating === "best").length;
  const remaining = summary.total_properties - summary.submitted;

  return (
    <section aria-label="Progress summary" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      <StatTile
        testId="summary-completed"
        label="Cases completed"
        icon={<CircleCheck />}
        value={
          <>
            {summary.submitted}
            <span className="text-lg font-medium text-muted-foreground"> / {summary.total_properties}</span>
          </>
        }
      >
        <div className="space-y-2">
          <Progress value={pct} aria-label="Training progress" className="h-1.5" />
          <p className="text-[13px] text-muted-foreground">
            {remaining === 0 ? "Every case submitted. Nice work." : `${remaining} ${remaining === 1 ? "case" : "cases"} left to submit`}
          </p>
        </div>
      </StatTile>
      <StatTile
        testId="summary-average"
        label="Average score"
        icon={<Gauge />}
        value={summary.average_accuracy === null ? "—" : summary.average_accuracy.toFixed(0)}
        hint={
          summary.average_accuracy === null ? (
            "Submit a case to get scored"
          ) : teamRank ? (
            <span data-testid="summary-team-rank">
              {ordinal(teamRank.rank)} of {teamRank.of} on the team ·{" "}
              <Link href="/team" className="font-medium text-primary hover:underline">
                View team
              </Link>
            </span>
          ) : (
            "Latest attempt on each property, out of 100"
          )
        }
      />
      <StatTile
        testId="summary-in-progress"
        label="In progress"
        icon={<PencilLine />}
        value={summary.in_progress}
        hint="Drafts save automatically as you type"
      />
      <StatTile
        testId="summary-best"
        label="Best-rated cases"
        icon={<Trophy />}
        value={bestCount}
        hint="Mid forecast within 10% of the analyst"
      />
    </section>
  );
}

function NextUp({ properties }: { properties: DashboardProperty[] }) {
  const inProgress = properties.find((p) => p.status === "in_progress");
  const notStarted = properties.find((p) => p.status === "not_started");
  const property = inProgress ?? notStarted;
  if (!property) return null;

  const action = primaryAction(property);
  const resuming = property === inProgress;

  return (
    <section
      aria-label={resuming ? "Continue where you left off" : "Next up"}
      className="flex flex-col overflow-hidden rounded-xl bg-card shadow-card ring-1 ring-foreground/[0.07] sm:flex-row"
    >
      <PropertyImage src={property.img_src} alt="" className="h-36 w-full shrink-0 sm:h-auto sm:w-56" priority />
      <div className="flex flex-1 flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
        <div className="space-y-1.5">
          <Eyebrow className="text-primary">{resuming ? "Continue where you left off" : "Next up"}</Eyebrow>
          <p className="text-lg font-semibold tracking-tight">{streetOf(property.address)}</p>
          <p className="text-sm text-muted-foreground">
            {[property.city, property.state].filter(Boolean).join(", ")} · {property.market_name} ·{" "}
            <span className="figure">{formatMoney(parseNumber(property.unformatted_price))}</span>
          </p>
        </div>
        <Button asChild size="lg" className="shrink-0 px-4">
          <Link href={action.href}>
            {action.label}
            <ArrowRight data-icon="inline-end" aria-hidden />
          </Link>
        </Button>
      </div>
    </section>
  );
}

function TrainingCases({
  properties,
  summary,
}: {
  properties: DashboardProperty[];
  summary: Dashboard["summary"];
}) {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [market, setMarket] = useState("all");

  const markets = useMemo(
    () => [...new Set(properties.map((p) => p.market_name).filter((m): m is string => Boolean(m)))].sort(),
    [properties],
  );

  const visible = properties.filter(
    (p) => (status === "all" || p.status === status) && (market === "all" || p.market_name === market),
  );

  const counts: Record<StatusFilter, number> = {
    all: summary.total_properties,
    not_started: summary.not_started,
    in_progress: summary.in_progress,
    submitted: summary.submitted,
  };

  return (
    <section aria-labelledby="training-cases" className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 id="training-cases" className="text-base font-semibold tracking-tight">
            Training cases
          </h2>
          <p className="text-sm text-muted-foreground">Each case is a real listing with an analyst&apos;s hidden underwriting.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
            <TabsList aria-label="Filter by status">
              {(["all", "not_started", "in_progress", "submitted"] as const).map((key) => (
                <TabsTrigger key={key} value={key} className="gap-1.5 px-2.5">
                  {key === "all" ? "All" : key === "not_started" ? "Not started" : key === "in_progress" ? "In progress" : "Submitted"}
                  <span className="figure text-xs text-muted-foreground">{counts[key]}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Select value={market} onValueChange={setMarket}>
            <SelectTrigger aria-label="Filter by market" className="min-w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="end">
              <SelectItem value="all">All markets</SelectItem>
              {markets.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="No cases match these filters"
          description={
            status !== "all" ? (
              <>
                Nothing is <StatusBadge status={status} className="mx-1 align-middle" /> in this view.
              </>
            ) : (
              "Try a different market."
            )
          }
          action={
            <Button
              variant="outline"
              onClick={() => {
                setStatus("all");
                setMarket("all");
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((property) => (
            <PropertyCard key={property.zpid} property={property} />
          ))}
        </div>
      )}
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-10" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[132px] rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-36 rounded-xl" />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-[400px] rounded-xl" />
        ))}
      </div>
    </div>
  );
}
