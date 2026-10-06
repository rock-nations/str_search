import { z } from "zod";

import { apiFetch } from "./client";
import {
  dashboardSchema,
  marketSchema,
  propertySchema,
  submissionSchema,
  submitResultSchema,
  underwritingSchema,
  type SaveUnderwritingPayload,
} from "./schemas";

/** One function per backend endpoint. Every response is validated with Zod. */
export const api = {
  dashboard: (signal?: AbortSignal) => apiFetch("/dashboard", dashboardSchema, { signal }),

  market: (id: number, signal?: AbortSignal) => apiFetch(`/markets/${id}`, marketSchema, { signal }),

  property: (zpid: string, signal?: AbortSignal) =>
    apiFetch(`/properties/${encodeURIComponent(zpid)}`, propertySchema, { signal }),

  underwriting: (id: number, signal?: AbortSignal) =>
    apiFetch(`/underwritings/${id}`, underwritingSchema, { signal }),

  startUnderwriting: (zpid: string) =>
    apiFetch("/underwritings", underwritingSchema, { method: "POST", body: { zpid } }),

  saveUnderwriting: (id: number, payload: SaveUnderwritingPayload) =>
    apiFetch(`/underwritings/${id}`, underwritingSchema, { method: "PUT", body: payload }),

  submitUnderwriting: (id: number, payload: SaveUnderwritingPayload) =>
    apiFetch(`/underwritings/${id}/submit`, submitResultSchema, { method: "POST", body: payload }),

  submissions: (zpid?: string, signal?: AbortSignal) =>
    apiFetch(
      zpid ? `/submissions?zpid=${encodeURIComponent(zpid)}` : "/submissions",
      z.array(submissionSchema),
      { signal },
    ),

  submission: (id: number, signal?: AbortSignal) =>
    apiFetch(`/submissions/${id}`, submissionSchema, { signal }),
};
