"use client";

import { useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { isStepId, type StepId } from "@/lib/underwriting/fields";

/**
 * The active step lives in the URL (`?step=analysis`) so it survives a reload,
 * can be linked to, and works with the browser's back button. Native history
 * calls keep step changes instant: no server round trip.
 */
export function useStep(): [StepId, (next: StepId) => void] {
  const searchParams = useSearchParams();
  const raw = searchParams.get("step");
  const step: StepId = isStepId(raw) ? raw : "financials";

  const setStep = useCallback((next: StepId) => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("step") === next) return;
    params.set("step", next);
    window.history.pushState(null, "", `${window.location.pathname}?${params.toString()}`);
  }, []);

  return [step, setStep];
}
