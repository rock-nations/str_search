import { Medal } from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";

import { RatingBadge } from "@/components/rating-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Submission } from "@/lib/api/schemas";
import { formatMoney, formatRelativeTime, formatSignedPercent } from "@/lib/format";
import { ordinal, rankSubmissions } from "@/lib/scoring";
import { cn } from "@/lib/utils";

const VISIBLE_ROWS = 8;
const medalTone = ["text-amber-500", "text-zinc-400", "text-orange-700/80"];

/**
 * Every graded attempt on this property, closest to the analyst first.
 * The API has no trainee identity, so each attempt is one entry.
 */
export function Leaderboard({ submissions, currentId }: { submissions: Submission[]; currentId: number }) {
  const ranked = rankSubmissions(submissions);
  const current = ranked.find((entry) => entry.id === currentId);
  const top = ranked.slice(0, VISIBLE_ROWS);
  const showCurrentSeparately = current && !top.some((entry) => entry.id === currentId);

  return (
    <section
      aria-labelledby="leaderboard-heading"
      data-testid="leaderboard"
      className="overflow-hidden rounded-xl bg-card shadow-card ring-1 ring-foreground/[0.07]"
    >
      <div className="flex flex-wrap items-end justify-between gap-3 px-6 pt-5 pb-4">
        <div>
          <h2 id="leaderboard-heading" className="text-[15px] font-semibold tracking-tight">
            Leaderboard
          </h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">Graded attempts on this property, closest first.</p>
        </div>
        {current && (
          <p className="text-right" data-testid="leaderboard-position">
            <span className="block text-xs text-muted-foreground">This attempt placed</span>
            <span className="figure text-xl font-semibold tracking-tight">
              {ordinal(current.rank)} <span className="text-sm font-normal text-muted-foreground">of {ranked.length}</span>
            </span>
          </p>
        )}
      </div>
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
            <LeaderboardRow key={entry.id} entry={entry} current={entry.id === currentId} />
          ))}
          {showCurrentSeparately && current && (
            <Fragment>
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="py-1 text-center text-xs text-muted-foreground">
                  ···
                </TableCell>
              </TableRow>
              <LeaderboardRow entry={current} current />
            </Fragment>
          )}
        </TableBody>
      </Table>
    </section>
  );
}

function LeaderboardRow({
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
      <TableCell className="figure hidden text-right text-muted-foreground sm:table-cell">{formatSignedPercent(entry.signedDeviation)}</TableCell>
      <TableCell className="pr-6 text-right">
        <RatingBadge rating={entry.rating} withScore />
      </TableCell>
    </TableRow>
  );
}
