"use client";

import { useMemo } from "react";

import { useDashboard, useSubmissions, useUnderwritings } from "@/lib/api/hooks";
import type { DashboardProperty } from "@/lib/api/schemas";
import { TEAMMATES, YOU, demoAttempts } from "@/lib/team/demo-team";
import { buildYourAttempts, rankTeam, summarizeTrainee } from "@/lib/team/stats";
import type { RankedTrainee, TraineeSummary } from "@/lib/team/types";

const DEMO_ATTEMPTS = demoAttempts();

export type TeamData = {
  ranking: RankedTrainee[];
  summaries: Map<string, TraineeSummary>;
  properties: Map<string, DashboardProperty>;
  markets: string[];
  marketOf: (zpid: string) => string;
  /** False until your setup and running-cost comparisons have loaded. */
  skillsReady: boolean;
};

/**
 * The whole team: you (every graded attempt in the API) plus the six demo
 * teammates. With `skills`, it also loads your submitted underwritings and the
 * analyst's, to compare setup budgets and running costs. Those references are
 * only requested for properties you have already submitted.
 */
export function useTeam({ skills = true }: { skills?: boolean } = {}) {
  const dashboard = useDashboard();
  const submissions = useSubmissions();

  const underwritingIds = useMemo(() => {
    if (!skills || !submissions.data) return [];
    const ids = new Set<number>();
    for (const s of submissions.data) {
      ids.add(s.underwriting_id);
      if (typeof s.reference_underwriting_id === "number") ids.add(s.reference_underwriting_id);
    }
    return [...ids].sort((a, b) => a - b);
  }, [skills, submissions.data]);

  const underwritings = useUnderwritings(underwritingIds, { enabled: skills });

  const data = useMemo<TeamData | undefined>(() => {
    if (!dashboard.data || !submissions.data) return undefined;
    const properties = new Map(dashboard.data.properties.map((p) => [p.zpid, p]));
    const marketOf = (zpid: string) => properties.get(zpid)?.market_name ?? "Other";
    const markets = [...new Set(dashboard.data.properties.map((p) => p.market_name ?? "Other"))].sort();
    const attempts = [...DEMO_ATTEMPTS, ...buildYourAttempts(submissions.data, underwritings.byId)];
    const summaries = [YOU, ...TEAMMATES].map((trainee) => summarizeTrainee(trainee, attempts, marketOf));
    return {
      ranking: rankTeam(summaries),
      summaries: new Map(summaries.map((s) => [s.trainee.id, s])),
      properties,
      markets,
      marketOf,
      skillsReady: !skills || !underwritings.isPending,
    };
  }, [dashboard.data, submissions.data, underwritings.byId, underwritings.isPending, skills]);

  const error = dashboard.error ?? submissions.error;
  return {
    data,
    isPending: dashboard.isPending || submissions.isPending,
    isError: dashboard.isError || submissions.isError,
    error,
    refetch: () => {
      void dashboard.refetch();
      void submissions.refetch();
    },
  };
}
