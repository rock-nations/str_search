"use client";

import { ArrowUpRight, Lightbulb, MapPin, Receipt, Sofa, TrendingUp, UserRound } from "lucide-react";
import Link from "next/link";

import { PageContainer, PageHeader } from "@/components/page";
import { RatingBadge } from "@/components/rating-badge";
import { StatTile } from "@/components/stat-tile";
import { EmptyState, ErrorState } from "@/components/states";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime, formatPercent, formatSignedPercent } from "@/lib/format";
import { ordinal } from "@/lib/scoring";
import { SKILL_LABEL } from "@/lib/team/stats";
import type { RankedTrainee, SkillKey, SkillResult } from "@/lib/team/types";
import { cn } from "@/lib/utils";

import { streetOf } from "../dashboard/property-card";
import { DemoBadge, LEVEL_LABEL, LevelChip, TraineeAvatar } from "./team-ui";
import { useTeam, type TeamData } from "./use-team";

const SKILL_ICON: Record<SkillKey, typeof TrendingUp> = { revenue: TrendingUp, setup: Sofa, opex: Receipt };
const SKILL_HINT: Record<SkillKey, string> = {
  revenue: "Mid revenue forecast. This is the graded number.",
  setup: "Setup and renovation budget from the optimization list.",
  opex: "Monthly running costs.",
};

export function TraineeView({ traineeId }: { traineeId: string }) {
  const team = useTeam();
  const row = team.data?.ranking.find((r) => r.trainee.id === traineeId);

  if (team.isPending) {
    return (
      <PageContainer className="space-y-6 py-8" >
        <Skeleton className="h-16 w-80" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </PageContainer>
    );
  }
  if (team.isError || !team.data) {
    return (
      <PageContainer className="py-10">
        <ErrorState title="Couldn't load this trainee" error={team.error} onRetry={team.refetch} />
      </PageContainer>
    );
  }
  if (!row) {
    return (
      <PageContainer className="py-16">
        <EmptyState
          icon={<UserRound />}
          title="Trainee not found"
          description="There's no trainee with that name on the team."
          action={
            <Link href="/team" className="text-sm font-medium text-primary hover:underline">
              Back to the team
            </Link>
          }
        />
      </PageContainer>
    );
  }

  return <TraineeProfile row={row} data={team.data} />;
}

function TraineeProfile({ row, data }: { row: RankedTrainee; data: TeamData }) {
  const you = row.trainee.isYou;
  const total = data.ranking.length;

  return (
    <PageContainer className="pb-16">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Team", href: "/team" }, { label: row.trainee.name }]}
        title={
          <span className="flex items-center gap-3">
            <TraineeAvatar trainee={row.trainee} size="lg" />
            <span>{you ? "Your progress" : row.trainee.name}</span>
          </span>
        }
        description={
          row.averageScore === null ? (
            "No graded attempts yet."
          ) : (
            <span data-testid="profile-rank">
              {ordinal(row.rank)} of {total} on the team.{" "}
              {you ? "Built from your real attempts." : "Coaching notes are worked out from their latest attempts."}
            </span>
          )
        }
        actions={you ? undefined : <DemoBadge />}
      />

      <div className="space-y-6">
        <section aria-label="Summary" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatTile
            label="Average score"
            value={row.averageScore === null ? "—" : Math.round(row.averageScore)}
            hint="Latest attempt per property"
          />
          <StatTile
            label="First-try average"
            value={row.firstTryAverage === null ? "—" : Math.round(row.firstTryAverage)}
            hint={`${row.retakes} ${row.retakes === 1 ? "retake" : "retakes"}`}
          />
          <StatTile
            label="Cases completed"
            value={
              <>
                {row.casesCompleted}
                <span className="text-lg font-medium text-muted-foreground"> / {data.properties.size}</span>
              </>
            }
            hint={`${row.attempts.length} graded ${row.attempts.length === 1 ? "attempt" : "attempts"}`}
          />
          <StatTile label="Best-rated" value={row.bestRated} hint="Mid within 10% of the analyst" />
        </section>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
          <section aria-labelledby="skills-heading" className="rounded-xl bg-card p-6 shadow-card ring-1 ring-foreground/[0.07]">
            <h2 id="skills-heading" className="text-[15px] font-semibold tracking-tight">
              Estimates vs the analyst
            </h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground">Average miss on the latest attempt at each property.</p>
            <ul className="mt-5 space-y-5">
              {(["revenue", "setup", "opex"] as const).map((key) => (
                <SkillRow key={key} skillKey={key} skill={row.skills[key]} loading={Boolean(you) && key !== "revenue" && !data.skillsReady} />
              ))}
            </ul>
          </section>

          <section aria-labelledby="markets-heading" className="rounded-xl bg-card p-6 shadow-card ring-1 ring-foreground/[0.07]">
            <h2 id="markets-heading" className="text-[15px] font-semibold tracking-tight">
              Markets
            </h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground">Average score on the latest attempts in each market.</p>
            {row.markets.length === 0 ? (
              <p className="mt-5 text-sm text-muted-foreground">No graded attempts yet.</p>
            ) : (
              <ul className="mt-4 divide-y">
                {row.markets.map((market) => (
                  <li key={market.market} className="flex items-center justify-between gap-3 py-3">
                    <span className="flex items-center gap-2.5 text-sm">
                      <MapPin className="size-4 text-muted-foreground" aria-hidden />
                      <span className="font-medium">{market.market}</span>
                      <span className="text-muted-foreground">
                        · {market.cases} {market.cases === 1 ? "case" : "cases"}
                      </span>
                    </span>
                    <LevelChip level={market.level}>avg {Math.round(market.averageScore)}</LevelChip>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section aria-labelledby="notes-heading" className="rounded-xl bg-card p-6 shadow-card ring-1 ring-foreground/[0.07]" data-testid="profile-notes">
          <h2 id="notes-heading" className="text-[15px] font-semibold tracking-tight">
            Coaching notes
          </h2>
          {row.notes.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {row.averageScore === null ? "Notes appear once there are graded attempts." : "No coaching flags. Estimates are in line with the analyst's."}
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {row.notes.map((note) => (
                <li key={note.id} className="flex gap-3 text-sm leading-6">
                  <Lightbulb className="mt-1 size-4 shrink-0 text-warning-foreground" aria-hidden />
                  <span>
                    <span className="font-medium">{note.title}.</span>{" "}
                    <span className="text-muted-foreground">{note.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <AttemptHistory row={row} data={data} />
      </div>
    </PageContainer>
  );
}

function SkillRow({ skillKey, skill, loading }: { skillKey: SkillKey; skill: SkillResult; loading: boolean }) {
  const Icon = SKILL_ICON[skillKey];
  // A 50% miss fills the bar; anything beyond is clamped.
  const width = skill.miss === null ? 0 : Math.min(1, skill.miss / 0.5) * 100;
  const bias =
    skill.bias === null || skill.miss === null || skill.miss < 0.05
      ? null
      : skill.bias >= 0
        ? "usually above"
        : "usually below";

  return (
    <li data-testid={`profile-skill-${skillKey}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-medium">
          <Icon className="size-4 text-muted-foreground" aria-hidden />
          {SKILL_LABEL[skillKey]}
        </span>
        {loading ? <Skeleton className="h-6 w-20" /> : <LevelChip level={skill.level} />}
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div
          className={cn(
            "h-full rounded-full transition-all",
            skill.level === "good" && "bg-success",
            skill.level === "ok" && "bg-warning",
            skill.level === "needs-work" && "bg-danger",
          )}
          style={{ width: `${loading ? 0 : width}%` }}
        />
      </div>
      <p className="figure mt-1.5 text-xs text-muted-foreground">
        {loading
          ? "Comparing with the analyst…"
          : skill.miss === null
            ? `${SKILL_HINT[skillKey]} No data yet.`
            : `${formatPercent(skill.miss, 1)} off on average${bias ? `, ${bias}` : ""}. ${skill.level ? LEVEL_LABEL[skill.level] : ""}.`}
      </p>
    </li>
  );
}

function AttemptHistory({ row, data }: { row: RankedTrainee; data: TeamData }) {
  const attempts = [...row.attempts].reverse();
  return (
    <section aria-labelledby="history-heading" className="space-y-3">
      <h2 id="history-heading" className="text-base font-semibold tracking-tight">
        Attempt history
      </h2>
      {attempts.length === 0 ? (
        <EmptyState title="No graded attempts yet" className="py-10" />
      ) : (
        <div className="overflow-hidden rounded-xl bg-card shadow-card ring-1 ring-foreground/[0.07]">
          <Table className="min-w-[720px]" data-testid="attempt-history">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">Property</TableHead>
                <TableHead>Attempt</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Mid vs analyst</TableHead>
                <TableHead className="text-right">Setup vs analyst</TableHead>
                <TableHead className="text-right">Running costs vs analyst</TableHead>
                <TableHead className="pr-5 text-right">Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attempts.map((attempt) => {
                const property = data.properties.get(attempt.zpid);
                return (
                  <TableRow key={attempt.id}>
                    <TableCell className="pl-5 font-medium">
                      {attempt.submissionId ? (
                        <Link href={`/submissions/${attempt.submissionId}`} className="inline-flex items-center gap-1 hover:underline">
                          {streetOf(property?.address)}
                          <ArrowUpRight className="size-3.5 text-muted-foreground" aria-hidden />
                        </Link>
                      ) : (
                        streetOf(property?.address)
                      )}
                      <span className="block text-xs font-normal text-muted-foreground">{property?.market_name}</span>
                    </TableCell>
                    <TableCell className="figure">{attempt.attemptNumber === 1 ? "First try" : `Retake ${attempt.attemptNumber - 1}`}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(attempt.submittedAt)}</TableCell>
                    <TableCell className="figure text-right">{formatSignedPercent(attempt.midDeviation)}</TableCell>
                    <TableCell className="figure text-right text-muted-foreground">{formatSignedPercent(attempt.setupDeviation)}</TableCell>
                    <TableCell className="figure text-right text-muted-foreground">{formatSignedPercent(attempt.opexDeviation)}</TableCell>
                    <TableCell className="pr-5 text-right">
                      <RatingBadge rating={attempt.rating} withScore />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
