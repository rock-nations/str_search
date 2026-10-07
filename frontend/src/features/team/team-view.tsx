"use client";

import { ArrowRight, Lightbulb, Medal } from "lucide-react";
import Link from "next/link";

import { PageContainer, PageHeader } from "@/components/page";
import { ErrorState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPercent } from "@/lib/format";
import { ordinal } from "@/lib/scoring";
import { SKILL_LABEL } from "@/lib/team/stats";
import type { RankedTrainee, SkillKey } from "@/lib/team/types";
import { cn } from "@/lib/utils";

import { DemoBadge, LevelChip, LevelLegend, TraineeAvatar, scoreLevel } from "./team-ui";
import { useTeam, type TeamData } from "./use-team";

const medalTone = ["text-amber-500", "text-zinc-400", "text-orange-700/80"];
const SKILLS: SkillKey[] = ["revenue", "setup", "opex"];

export function TeamView() {
  const team = useTeam();

  return (
    <PageContainer className="pb-16">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Team" }]}
        title="Team"
        description="Every trainee's results in one place: who is doing best, and what each person should practise next."
        actions={<DemoBadge />}
      />

      {team.isPending ? (
        <TeamSkeleton />
      ) : team.isError || !team.data ? (
        <ErrorState title="Couldn't load the team" error={team.error} onRetry={team.refetch} />
      ) : (
        <div className="space-y-8">
          <YourStanding data={team.data} />
          <TeamTable data={team.data} />
          <SkillsGrid data={team.data} />
          <CoachingFocus data={team.data} />
        </div>
      )}
    </PageContainer>
  );
}

function YourStanding({ data }: { data: TeamData }) {
  const you = data.ranking.find((r) => r.trainee.isYou);
  if (!you) return null;
  const total = data.ranking.length;

  if (you.averageScore === null) {
    return (
      <section
        aria-label="Your standing"
        data-testid="your-standing"
        className="flex flex-col items-start justify-between gap-4 rounded-xl bg-card p-5 shadow-card ring-1 ring-foreground/[0.07] sm:flex-row sm:items-center sm:p-6"
      >
        <div className="flex items-center gap-4">
          <TraineeAvatar trainee={you.trainee} size="lg" />
          <div>
            <p className="font-semibold">You&apos;re not on the board yet</p>
            <p className="text-sm text-muted-foreground">Submit your first case to see where you rank.</p>
          </div>
        </div>
        <Button asChild>
          <Link href="/">
            Pick a case
            <ArrowRight data-icon="inline-end" aria-hidden />
          </Link>
        </Button>
      </section>
    );
  }

  const stats = [
    { label: "Average score", value: Math.round(you.averageScore).toString() },
    { label: "First try", value: you.firstTryAverage === null ? "—" : Math.round(you.firstTryAverage).toString() },
    { label: "Cases", value: `${you.casesCompleted} / ${data.properties.size}` },
    { label: "Best-rated", value: you.bestRated.toString() },
  ];

  return (
    <section
      aria-label="Your standing"
      data-testid="your-standing"
      className="grid gap-5 rounded-xl bg-card p-5 shadow-card ring-1 ring-foreground/[0.07] sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"
    >
      <div className="flex items-center gap-4">
        <TraineeAvatar trainee={you.trainee} size="lg" />
        <div>
          <p className="text-xs font-semibold tracking-[0.08em] text-primary uppercase">Your standing</p>
          <p className="figure text-2xl font-semibold tracking-tight" data-testid="your-rank">
            {ordinal(you.rank)} <span className="text-base font-normal text-muted-foreground">of {total}</span>
          </p>
          <p className="text-[13px] text-muted-foreground">Ranked by average score on your latest attempt at each property.</p>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4 lg:gap-x-10">
        {stats.map((stat) => (
          <div key={stat.label}>
            <dt className="text-xs text-muted-foreground">{stat.label}</dt>
            <dd className="figure mt-0.5 text-lg font-semibold">{stat.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function TeamTable({ data }: { data: TeamData }) {
  return (
    <section aria-labelledby="leaderboard-heading" className="space-y-3">
      <div>
        <h2 id="leaderboard-heading" className="text-base font-semibold tracking-tight">
          Leaderboard
        </h2>
        <p className="text-sm text-muted-foreground">
          Average score on each trainee&apos;s latest attempt per property. Ties go to whoever has completed more cases.
        </p>
      </div>
      <div className="overflow-hidden rounded-xl bg-card shadow-card ring-1 ring-foreground/[0.07]">
        <Table className="min-w-[760px]" data-testid="team-table">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-16 pl-5">Rank</TableHead>
              <TableHead>Trainee</TableHead>
              <TableHead className="text-right">Average</TableHead>
              <TableHead className="text-right">First try</TableHead>
              <TableHead className="text-right">Cases</TableHead>
              <TableHead className="text-right">Best-rated</TableHead>
              <TableHead className="text-right">Revenue miss</TableHead>
              <TableHead className="pr-5">Focus</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.ranking.map((row) => (
              <TeamRow key={row.trainee.id} row={row} totalCases={data.properties.size} />
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

function TeamRow({ row, totalCases }: { row: RankedTrainee; totalCases: number }) {
  const you = row.trainee.isYou;
  const focus = row.notes[0];
  return (
    <TableRow
      data-testid={`team-row-${row.trainee.id}`}
      data-current={you || undefined}
      className={cn(you && "bg-accent/70 hover:bg-accent/80")}
    >
      <TableCell className="pl-5">
        <span className="figure inline-flex items-center gap-1 font-semibold">
          {row.rank <= 3 && row.averageScore !== null ? (
            <Medal className={cn("size-4", medalTone[row.rank - 1])} aria-hidden />
          ) : null}
          {row.rank}
        </span>
      </TableCell>
      <TableCell>
        <Link
          href={`/team/${row.trainee.id}`}
          className="group/name inline-flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <TraineeAvatar trainee={row.trainee} size="sm" />
          <span className={cn("font-medium group-hover/name:underline", you && "text-accent-foreground")}>
            {row.trainee.name}
          </span>
        </Link>
      </TableCell>
      <TableCell className="text-right">
        <LevelChip level={scoreLevel(row.averageScore)}>
          {row.averageScore === null ? "—" : Math.round(row.averageScore)}
        </LevelChip>
      </TableCell>
      <TableCell className="figure text-right text-muted-foreground">
        {row.firstTryAverage === null ? "—" : Math.round(row.firstTryAverage)}
      </TableCell>
      <TableCell className="figure text-right">
        {row.casesCompleted} <span className="text-muted-foreground">/ {totalCases}</span>
      </TableCell>
      <TableCell className="figure text-right">{row.bestRated}</TableCell>
      <TableCell className="figure text-right text-muted-foreground">{formatPercent(row.skills.revenue.miss)}</TableCell>
      <TableCell className="pr-5">
        {row.averageScore === null ? (
          <span className="text-xs text-muted-foreground">No attempts yet</span>
        ) : focus ? (
          <span className="inline-flex h-6 items-center rounded-full bg-danger/10 px-2.5 text-xs font-medium whitespace-nowrap text-danger-foreground ring-1 ring-danger/20 ring-inset">
            {focus.title}
            {row.notes.length > 1 && <span className="ml-1 opacity-70">+{row.notes.length - 1}</span>}
          </span>
        ) : (
          <span className="inline-flex h-6 items-center rounded-full bg-success/12 px-2.5 text-xs font-medium text-success-foreground ring-1 ring-success/25 ring-inset">
            On track
          </span>
        )}
      </TableCell>
    </TableRow>
  );
}

function SkillsGrid({ data }: { data: TeamData }) {
  return (
    <section aria-labelledby="skills-heading" className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="skills-heading" className="text-base font-semibold tracking-tight">
            Skills by trainee
          </h2>
          <p className="text-sm text-muted-foreground">
            How far each estimate lands from the analyst&apos;s, and the average score in each market.
          </p>
        </div>
        <LevelLegend />
      </div>
      <div className="overflow-hidden rounded-xl bg-card shadow-card ring-1 ring-foreground/[0.07]">
        <Table className="min-w-[860px]" data-testid="skills-grid">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead rowSpan={2} className="pl-5 align-bottom">
                Trainee
              </TableHead>
              <TableHead colSpan={SKILLS.length} className="h-8 border-b text-center text-xs">
                Average miss vs analyst
              </TableHead>
              <TableHead colSpan={data.markets.length} className="h-8 border-b border-l pr-5 text-center text-xs">
                Average score by market
              </TableHead>
            </TableRow>
            <TableRow className="hover:bg-transparent">
              {SKILLS.map((key) => (
                <TableHead key={key} className="text-center text-xs whitespace-normal">
                  {SKILL_LABEL[key]}
                </TableHead>
              ))}
              {data.markets.map((market, index) => (
                <TableHead
                  key={market}
                  className={cn("text-center text-xs whitespace-normal", index === 0 && "border-l", index === data.markets.length - 1 && "pr-5")}
                >
                  {market}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.ranking.map((row) => (
              <TableRow
                key={row.trainee.id}
                data-testid={`skills-row-${row.trainee.id}`}
                className={cn("hover:bg-transparent", row.trainee.isYou && "bg-accent/50")}
              >
                <TableCell className="pl-5">
                  <span className="inline-flex items-center gap-2.5">
                    <TraineeAvatar trainee={row.trainee} size="sm" />
                    <span className="font-medium">{row.trainee.name}</span>
                  </span>
                </TableCell>
                {SKILLS.map((key) => {
                  const skill = row.skills[key];
                  const loading = row.trainee.isYou && key !== "revenue" && !data.skillsReady;
                  return (
                    <TableCell key={key} className="text-center">
                      {loading ? (
                        <Skeleton className="mx-auto h-6 w-16" />
                      ) : (
                        <LevelChip level={skill.level} testId={`skill-${row.trainee.id}-${key}`}>
                          {skill.miss === null ? undefined : `${formatPercent(skill.miss, 0)} off`}
                        </LevelChip>
                      )}
                    </TableCell>
                  );
                })}
                {data.markets.map((market, index) => {
                  const result = row.markets.find((m) => m.market === market);
                  return (
                    <TableCell key={market} className={cn("text-center", index === 0 && "border-l", index === data.markets.length - 1 && "pr-5")}>
                      <LevelChip level={result?.level ?? null} testId={`market-${row.trainee.id}-${market}`}>
                        {result ? `avg ${Math.round(result.averageScore)}` : undefined}
                      </LevelChip>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

function CoachingFocus({ data }: { data: TeamData }) {
  const flagged = data.ranking.filter((row) => row.notes.length > 0);
  return (
    <section aria-labelledby="coaching-heading" className="space-y-3" data-testid="coaching-focus">
      <div>
        <h2 id="coaching-heading" className="text-base font-semibold tracking-tight">
          Coaching focus
        </h2>
        <p className="text-sm text-muted-foreground">
          Patterns worth a conversation, worked out from each trainee&apos;s latest attempts.
        </p>
      </div>
      {flagged.length === 0 ? (
        <p className="rounded-xl border border-dashed px-5 py-8 text-center text-sm text-muted-foreground">
          Nobody needs coaching right now.
        </p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {flagged.map((row) => (
            <li key={row.trainee.id} className="rounded-xl bg-card p-5 shadow-card ring-1 ring-foreground/[0.07]">
              <Link
                href={`/team/${row.trainee.id}`}
                className="inline-flex items-center gap-2.5 rounded-md font-medium outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <TraineeAvatar trainee={row.trainee} size="sm" />
                {row.trainee.name}
              </Link>
              <ul className="mt-3 space-y-2.5">
                {row.notes.map((note) => (
                  <li key={note.id} className="flex gap-2.5 text-[13px] leading-5" data-testid={`note-${row.trainee.id}-${note.kind}`}>
                    <Lightbulb className="mt-0.5 size-4 shrink-0 text-warning-foreground" aria-hidden />
                    <span>
                      <span className="font-medium">{note.title}.</span>{" "}
                      <span className="text-muted-foreground">{note.detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TeamSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading team">
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="h-80 rounded-xl" />
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );
}
