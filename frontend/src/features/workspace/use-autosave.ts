"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWatch, type UseFormReturn } from "react-hook-form";

import { ApiError } from "@/lib/api/client";
import { useSaveUnderwriting } from "@/lib/api/hooks";
import { sectionHasUserInput, type SectionId, type UnderwritingFormValues } from "@/lib/underwriting/fields";
import { apiPathToFormPath, buildPayload, type BuiltPayload } from "@/lib/underwriting/mappers";

export const AUTOSAVE_DELAY_MS = 800;

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export type AutosaveState = {
  status: SaveStatus;
  savedAt: number | null;
  error: unknown;
  /** Sections the trainee has worked on that can't be saved yet (incomplete or invalid). */
  pendingSections: SectionId[];
};

export type AutosaveApi = {
  state: AutosaveState;
  /** Save now (cancels the debounce). Resolves once the save settles. */
  flush: () => Promise<void>;
  /** Stop autosaving, e.g. while the underwriting is being submitted. */
  stop: () => void;
  /** Restart autosaving after `stop`, e.g. when a submission fails. */
  resume: () => void;
  /** True when the form holds valid changes the API hasn't stored yet. */
  hasUnsavedChanges: () => boolean;
};

/** Puts API validation messages next to the fields they belong to. */
export function applyServerErrors(
  form: UseFormReturn<UnderwritingFormValues>,
  error: unknown,
  rowIndexes: BuiltPayload["rowIndexes"],
): boolean {
  if (!(error instanceof ApiError) || error.status !== 422) return false;
  let applied = false;
  for (const [apiPath, message] of Object.entries(error.fieldErrors)) {
    const formPath = apiPathToFormPath(apiPath, rowIndexes);
    if (formPath) {
      form.setError(formPath as never, { type: "server", message });
      applied = true;
    }
  }
  return applied;
}

/**
 * Debounced autosave. Only sections that are fully valid are sent (see
 * `buildPayload`), saves never overlap, and an identical payload is never
 * sent twice.
 */
export function useAutosave(
  underwritingId: number,
  form: UseFormReturn<UnderwritingFormValues>,
): AutosaveApi {
  const save = useSaveUnderwriting(underwritingId);
  const values = useWatch({ control: form.control });
  const [state, setState] = useState<AutosaveState>({
    status: "idle",
    savedAt: null,
    error: null,
    pendingSections: [],
  });

  const lastSent = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inFlight = useRef<Promise<void> | null>(null);
  const queued = useRef(false);
  const stopped = useRef(false);
  // Lets a finished save start the queued one without the callback referencing itself.
  const runRef = useRef<() => Promise<void>>(async () => {});
  const mutateAsync = save.mutateAsync;

  const run = useCallback(async (): Promise<void> => {
    if (stopped.current) return;
    if (inFlight.current) {
      queued.current = true;
      return inFlight.current;
    }

    const current = form.getValues();
    const built = buildPayload(current);
    const pendingSections = built.pendingSections.filter((section) => sectionHasUserInput(current, section));
    const json = JSON.stringify(built.payload);
    if (json === lastSent.current) {
      setState((prev) =>
        prev.pendingSections.join() === pendingSections.join() ? prev : { ...prev, pendingSections },
      );
      return;
    }

    setState((prev) => ({ ...prev, status: "saving", pendingSections }));
    const request = mutateAsync(built.payload)
      .then(() => {
        lastSent.current = json;
        setState({ status: "saved", savedAt: Date.now(), error: null, pendingSections });
      })
      .catch((error: unknown) => {
        applyServerErrors(form, error, built.rowIndexes);
        setState((prev) => ({ ...prev, status: "error", error }));
      })
      .finally(() => {
        inFlight.current = null;
        if (queued.current && !stopped.current) {
          queued.current = false;
          void runRef.current();
        }
      });
    inFlight.current = request;
    return request;
  }, [form, mutateAsync]);

  useEffect(() => {
    runRef.current = run;
  }, [run]);

  useEffect(() => {
    if (stopped.current) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void run(), AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer.current);
  }, [values, run]);

  const hasUnsavedChanges = useCallback(
    () => JSON.stringify(buildPayload(form.getValues()).payload) !== lastSent.current,
    [form],
  );

  // Warn before closing the tab with work the API hasn't stored.
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!stopped.current && (inFlight.current || hasUnsavedChanges())) {
        event.preventDefault();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasUnsavedChanges]);

  const flush = useCallback(() => {
    clearTimeout(timer.current);
    return run();
  }, [run]);

  const stop = useCallback(() => {
    stopped.current = true;
    clearTimeout(timer.current);
  }, []);

  const resume = useCallback(() => {
    stopped.current = false;
  }, []);

  return { state, flush, stop, resume, hasUnsavedChanges };
}
