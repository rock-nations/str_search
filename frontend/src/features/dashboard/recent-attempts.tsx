import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { RatingBadge } from "@/components/rating-badge";
import { EmptyState } from "@/components/states";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { DashboardProperty, Submission } from "@/lib/api/schemas";
import { formatMoney, formatRelativeTime, formatSignedPercent } from "@/lib/format";
import { signedDeviation } from "@/lib/scoring";
import { cn } from "@/lib/utils";

import { streetOf } from "./property-card";

export function RecentAttempts({
  submissions,
  properties,
}: {
  submissions: Submission[];
  properties: DashboardProperty[];
}) {
  const byZpid = new Map(properties.map((p) => [p.zpid, p]));
  const rows = submissions.slice(0, 8);

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No graded attempts yet"
        description="Submit your first underwriting and your scores will appear here."
        className="py-10"
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl bg-card shadow-card ring-1 ring-foreground/[0.07]">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-5">Property</TableHead>
            <TableHead className="text-right">Your Mid forecast</TableHead>
            <TableHead className="text-right">vs analyst</TableHead>
            <TableHead>Score</TableHead>
            <TableHead className="hidden md:table-cell">Submitted</TableHead>
            <TableHead className="w-12 pr-5">
              <span className="sr-only">Open</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((submission) => {
            const deviation = signedDeviation(submission.breakdown.candidate, submission.breakdown.reference);
            return (
              <TableRow key={submission.id} className="group">
                <TableCell className="pl-5 font-medium">
                  {streetOf(byZpid.get(submission.zpid)?.address)}
                </TableCell>
                <TableCell className="figure text-right">{formatMoney(submission.breakdown.candidate)}</TableCell>
                <TableCell
                  className={cn(
                    "figure text-right",
                    deviation !== null && Math.abs(deviation) > 0.25 && "text-danger-foreground",
                  )}
                >
                  {formatSignedPercent(deviation)}
                </TableCell>
                <TableCell>
                  <RatingBadge rating={submission.rating} withScore />
                </TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">
                  {formatRelativeTime(submission.submitted_at)}
                </TableCell>
                <TableCell className="pr-5 text-right">
                  <Link
                    href={`/submissions/${submission.id}`}
                    className="inline-grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label={`View results for ${streetOf(byZpid.get(submission.zpid)?.address)}`}
                  >
                    <ArrowUpRight className="size-4" aria-hidden />
                  </Link>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
