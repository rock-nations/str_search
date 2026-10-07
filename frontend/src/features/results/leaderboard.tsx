"use client";

import { FlaskConical, Medal } from "lucide-react";
import Link from "next/link";
import { Fragment, useState } from "react";

import { RatingBadge } from "@/components/rating-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Submission } from "@/lib/api/schemas";
import { formatMoney, formatRelativeTime, formatSignedPercent } from "@/lib/format";
import { ordinal, rankSubmissions } from "@/lib/scoring";
import { propertyLeaderboard } from "@/lib/team/stats";
import { cn } from "@/lib/utils";

import { TraineeAvatar } from "../team/team-ui";
import { useTeam } from "../team/use-team";

const VISIBLE_ROWS = 8;
const medalTone = ["text-amber-500", "text-zinc-400", "text-orange-700/80"];

/**
 * Two views of the same property:
 *  - Team: every trainee's latest attempt here, closest to the analyst first.
 *  - Your attempts: each of your graded attempts here, closest first.
 */
export function Leaderboard({ submission, submissions }: { submission: Submission; submissions: Submission[] }) {
  const [tab, setTab] = useState("team");

  return (
    <section
      aria-labelledby="leaderboard-heading"
      data-testid="leaderboard"
      className="overflow-hidden rounded-xl bg-card shadow-card ring-1 ring-foreground/[0.07]"
    >
      <Tabs value={tab} onValueChange={setTab} className="gap-0">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-5 pb-4">
          <h2 id="leaderboard-heading" className="text-[15px] font-semibold tracking-tight">
            Leaderboard
          </h2>
          <TabsList aria-label="Leaderboard view">
            <TabsTrigger value="team" className="px-3">
              Team
            </TabsTrigger>
            <TabsTrigger value="attempts" className="gap-1.5 px-3">
              Your attempts <span className="figure text-xs text-muted-foreground">{submissions.length}</span>
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="team">
          <TeamStandings submission={submission} />
        </TabsContent>
        <TabsContent value="attempts">
          <AttemptsTable submissions={submissions} currentId={submission.id} />
        </TabsContent>
      </Tabs>
    </section>
  );
}

function SubHeader({ text, position }: { text: string; position?: React.ReactNode }) {
  return (
    <div className="space-y-0.5 px-6 pb-3">
      {position}
      <p className="text-[13px] text-muted-foreground">{text}</p>
    </div>
  );
}

function Placement({ label, rank, of, testId }: { label: string; rank: number; of: string; testId: string }) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-2" data-testid={testId}>
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className="figure text-xl font-semibold tracking-tight">{ordinal(rank)}</span>
      <span className="text-sm text-muted-foreground">{of}</span>
    </p>
  );
}

function TeamStandings({ submission }: { submission: Submission }) {
  const team = useTeam({ skills: false });
  const reference = submission.breakdown.reference;

  if (team.isPending) {
    return (
      <div className="space-y-2 px-6 pb-6" aria-busy="true">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
    );
  }
  if (team.isError || !team.data) {
    return <p className="px-6 pb-6 text-sm text-muted-foreground">Couldn&apos;t load the team standings.</p>;
  }

  const standings = propertyLeaderboard([...team.data.summaries.values()], submission.zpid);
  const yours = standings.find((s) => s.trainee.isYou);
  const viewingOlder = yours?.attempt.submissionId !== undefined && yours.attempt.submissionId !== submission.id;

  return (
    <div data-testid="team-standings">
      <SubHeader
        text={
          viewingOlder
            ? "Each trainee's latest attempt here, closest first. You're ranked on your latest attempt."
            : "Each trainee's latest attempt on this property, closest to the analyst first."
        }
        position={
          yours ? (
            <Placement label="You placed" rank={yours.rank} of={`of ${standings.length} trainees`} testId="team-position" />
          ) : undefined
        }
      />
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-14 pl-6">Rank</TableHead>
            <TableHead>Trainee</TableHead>
            <TableHead className="text-right">Mid forecast</TableHead>
            <TableHead className="hidden text-right sm:table-cell">vs analyst</TableHead>
            <TableHead className="pr-6 text-right">Score</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {standings.map(({ rank, trainee, attempt }) => {
            const you = Boolean(trainee.isYou);
            // The analyst's number is already revealed on this page, so a teammate's
            // forecast in dollars gives nothing away.
            const forecast =
              reference === null || attempt.midDeviation === null ? null : reference * (1 + attempt.midDeviation);
            return (
              <TableRow
                key={trainee.id}
                data-testid={`team-standing-${trainee.id}`}
                data-current={you || undefined}
                aria-current={you ? "true" : undefined}
                className={cn(you && "bg-accent/70 hover:bg-accent/80")}
              >
                <TableCell className="pl-6">
                  <span className="figure inline-flex items-center gap-1 font-semibold">
                    {rank <= 3 ? <Medal className={cn("size-4", medalTone[rank - 1])} aria-hidden /> : null}
                    {rank}
                  </span>
                </TableCell>
                <TableCell>
                  <Link href={`/team/${trainee.id}`} className="inline-flex items-center gap-2.5 hover:underline">
                    <TraineeAvatar trainee={trainee} size="sm" />
                    <span className={cn("font-medium", you && "text-accent-foreground")}>{trainee.name}</span>
                  </Link>
                  {attempt.attemptNumber > 1 && (
                    <span className="ml-2 text-xs text-muted-foreground">retake {attempt.attemptNumber - 1}</span>
                  )}
                </TableCell>
                <TableCell className="figure text-right font-medium">{formatMoney(forecast)}</TableCell>
                <TableCell className="figure hidden text-right text-muted-foreground sm:table-cell">
                  {formatSignedPercent(attempt.midDeviation)}
                </TableCell>
                <TableCell className="pr-6 text-right">
                  <RatingBadge rating={attempt.rating} withScore />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <p className="flex items-center gap-1.5 border-t px-6 py-2.5 text-xs text-muted-foreground">
        <FlaskConical className="size-3.5" aria-hidden />
        Teammates are demo data. Your attempts are real.
      </p>
    </div>
  );
}

function AttemptsTable({ submissions, currentId }: { submissions: Submission[]; currentId: number }) {
  const ranked = rankSubmissions(submissions);
  const current = ranked.find((entry) => entry.id === currentId);
  const top = ranked.slice(0, VISIBLE_ROWS);
  const showCurrentSeparately = current && !top.some((entry) => entry.id === currentId);

  return (
    <div data-testid="attempts-leaderboard">
      <SubHeader
        text="Your graded attempts on this property, closest first."
        position={
          current ? (
            <Placement label="This attempt placed" rank={current.rank} of={`of ${ranked.length}`} testId="leaderboard-position" />
          ) : undefined
        }
      />
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-14 pl-6">Rank</TableHead>
            <TableHead>Attempt</TableHead>
            <TableHead className="text-right">Mid forecast</TableHead>
            <TableHead className="hidden text-right sm:table-cell">vs analyst</TableHead>
            <TableHead className="pr-6 text-right">Score</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {top.map((entry) => (
            <AttemptRow key={entry.id} entry={entry} current={entry.id === currentId} />
          ))}
          {showCurrentSeparately && current && (
            <Fragment>
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="py-1 text-center text-xs text-muted-foreground">
                  ···
                </TableCell>
              </TableRow>
              <AttemptRow entry={current} current />
            </Fragment>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function AttemptRow({
  entry,
  current,
}: {
  entry: ReturnType<typeof rankSubmissions>[number];
  current: boolean;
}) {
  return (
    <TableRow
      data-testid={`leaderboard-row-${entry.id}`}
      data-current={current || undefined}
      aria-current={current ? "true" : undefined}
      className={cn(current && "bg-accent/70 hover:bg-accent/80")}
    >
      <TableCell className="pl-6">
        <span className="figure inline-flex items-center gap-1 font-semibold">
          {entry.rank <= 3 ? <Medal className={cn("size-4", medalTone[entry.rank - 1])} aria-hidden /> : null}
          {entry.rank}
        </span>
      </TableCell>
      <TableCell>
        {current ? (
          <span className="font-medium text-accent-foreground">This attempt</span>
        ) : (
          <Link href={`/submissions/${entry.id}`} className="hover:underline">
            Attempt {entry.attemptNumber}
          </Link>
        )}
        <span className="block text-xs text-muted-foreground">{formatRelativeTime(entry.submitted_at)}</span>
      </TableCell>
      <TableCell className="figure text-right font-medium">{formatMoney(entry.breakdown.candidate)}</TableCell>
      <TableCell className="figure hidden text-right text-muted-foreground sm:table-cell">
        {formatSignedPercent(entry.signedDeviation)}
      </TableCell>
      <TableCell className="pr-6 text-right">
        <RatingBadge rating={entry.rating} withScore />
      </TableCell>
    </TableRow>
  );
}
