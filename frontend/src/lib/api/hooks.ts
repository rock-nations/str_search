"use client";

import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "./endpoints";
import type { SaveUnderwritingPayload, Submission } from "./schemas";

export const queryKeys = {
  dashboard: ["dashboard"] as const,
  market: (id: number) => ["market", id] as const,
  property: (zpid: string) => ["property", zpid] as const,
  underwriting: (id: number) => ["underwriting", id] as const,
  submissions: (zpid?: string) => ["submissions", zpid ?? "all"] as const,
  submission: (id: number) => ["submission", id] as const,
};

export function useDashboard() {
  return useQuery({ queryKey: queryKeys.dashboard, queryFn: ({ signal }) => api.dashboard(signal) });
}

export function useMarket(id: number | null | undefined) {
  return useQuery({
    queryKey: queryKeys.market(id ?? -1),
    queryFn: ({ signal }) => api.market(id as number, signal),
    enabled: typeof id === "number",
    staleTime: 5 * 60_000,
  });
}

export function useProperty(zpid: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.property(zpid ?? ""),
    queryFn: ({ signal }) => api.property(zpid as string, signal),
    enabled: Boolean(zpid),
    staleTime: 5 * 60_000,
  });
}

export function useUnderwriting(id: number | null | undefined) {
  return useQuery({
    queryKey: queryKeys.underwriting(id ?? -1),
    queryFn: ({ signal }) => api.underwriting(id as number, signal),
    enabled: typeof id === "number" && Number.isFinite(id),
  });
}

/**
 * Several underwritings at once, keyed by id. Used by the team view to compare
 * your submitted attempts with the analyst's. Callers must only pass ids of
 * submitted attempts and their references, never a reference you haven't earned.
 */
export function useUnderwritings(ids: number[], options: { enabled?: boolean } = {}) {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: queryKeys.underwriting(id),
      queryFn: ({ signal }: { signal: AbortSignal }) => api.underwriting(id, signal),
      staleTime: Infinity,
      enabled: options.enabled ?? true,
    })),
    combine: (results) => ({
      byId: new Map(
        results.flatMap((result, index) => (result.data ? [[ids[index], result.data] as const] : [])),
      ),
      isPending: results.some((result) => result.isPending && result.fetchStatus !== "idle"),
      isError: results.some((result) => result.isError),
    }),
  });
}

/**
 * The analyst's reference underwriting. It is only ever requested once a
 * graded submission exists, so trainees can't see it while they work.
 */
export function useReferenceUnderwriting(submission: Submission | undefined) {
  const id = submission?.reference_underwriting_id ?? null;
  return useQuery({
    queryKey: queryKeys.underwriting(id ?? -1),
    queryFn: ({ signal }) => api.underwriting(id as number, signal),
    enabled: Boolean(submission) && typeof id === "number",
    staleTime: Infinity,
  });
}

export function useSubmissions(zpid?: string | null, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.submissions(zpid ?? undefined),
    queryFn: ({ signal }) => api.submissions(zpid ?? undefined, signal),
    enabled: options.enabled ?? true,
  });
}

export function useSubmission(id: number) {
  return useQuery({
    queryKey: queryKeys.submission(id),
    queryFn: ({ signal }) => api.submission(id, signal),
    enabled: Number.isFinite(id),
    staleTime: Infinity,
  });
}

export function useStartUnderwriting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (zpid: string) => api.startUnderwriting(zpid),
    onSuccess: (underwriting) => {
      queryClient.setQueryData(queryKeys.underwriting(underwriting.id), underwriting);
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

export function useSaveUnderwriting(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["save-underwriting", id],
    mutationFn: (payload: SaveUnderwritingPayload) => api.saveUnderwriting(id, payload),
    onSuccess: (underwriting) => {
      queryClient.setQueryData(queryKeys.underwriting(id), underwriting);
    },
  });
}

export function useSubmitUnderwriting(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SaveUnderwritingPayload) => api.submitUnderwriting(id, payload),
    onSuccess: (result) => {
      // Mark the draft stale without refetching it now: the workspace is about to
      // navigate to the results page and shouldn't flash its "submitted" state.
      void queryClient.invalidateQueries({ queryKey: queryKeys.underwriting(id), refetchType: "none" });
      queryClient.setQueryData(queryKeys.dashboard, result.dashboard);
      queryClient.setQueryData(queryKeys.submission(result.submission.id), result.submission);
      void queryClient.invalidateQueries({ queryKey: ["submissions"] });
    },
  });
}
