"use client";

import { createContext, useContext } from "react";

import type { Property, Underwriting } from "@/lib/api/schemas";
import type { CalcResult } from "@/lib/underwriting/calc";
import type { StepId } from "@/lib/underwriting/fields";
import type { ReviewModel } from "@/lib/underwriting/review";

import type { AutosaveApi } from "./use-autosave";

export type WorkspaceContextValue = {
  underwriting: Underwriting;
  property: Property | undefined;
  listingPrice: number | null;
  calc: CalcResult;
  review: ReviewModel;
  autosave: AutosaveApi;
  step: StepId;
  /**
   * Switches step and, optionally, brings a target into view once it renders:
   * a form field path ("purchase.downPaymentPct") or a section ("#section-opex").
   */
  goTo: (step: StepId, target?: string) => void;
  requestSubmit: () => void;
  submitting: boolean;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export const WorkspaceProvider = WorkspaceContext.Provider;

export function useWorkspace(): WorkspaceContextValue {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("useWorkspace must be used inside <WorkspaceProvider>");
  return value;
}
