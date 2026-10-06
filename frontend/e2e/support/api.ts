import { execSync } from "node:child_process";
import path from "node:path";

import type { APIRequestContext } from "@playwright/test";

export const API_BASE_URL = (process.env.API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");

const COMPOSE_FILE = path.resolve(__dirname, "..", "..", "..", "backend", "docker-compose.yml");
export const DEFAULT_RESET_COMMAND = `docker compose -f "${COMPOSE_FILE}" exec -T api python -m scripts.seed --reset`;

/**
 * Puts the backend back to seed data: 4 markets, 6 properties, 6 references,
 * no attempts. Override with E2E_RESET_COMMAND (e.g. for a non-Docker backend)
 * or skip with E2E_SKIP_RESET=1.
 */
export function resetDatabase(): void {
  if (process.env.E2E_SKIP_RESET === "1") return;
  const command = process.env.E2E_RESET_COMMAND ?? DEFAULT_RESET_COMMAND;
  try {
    execSync(command, { stdio: "pipe", timeout: 90_000 });
  } catch (error) {
    const output = (error as { stderr?: Buffer }).stderr?.toString() ?? String(error);
    throw new Error(
      `Couldn't reset the training database.\nCommand: ${command}\n${output}\n` +
        "Start the backend with `docker compose up -d` in backend/, set E2E_RESET_COMMAND, or skip with E2E_SKIP_RESET=1.",
    );
  }
}

/** Financial inputs used whenever a test needs a draft whose only open question is revenue. */
export const STANDARD_FINANCIALS = {
  purchase_details: {
    purchase_price: "675000",
    down_payment_pct: "0.2",
    interest_rate: "0.0699",
    mortgage_years: 30,
    closing_costs_pct: "0.03",
  },
  taxes: { land_assumptions_pct: "0.2", sla_multiplier_pct: "0.25", bonus_amount_pct: "0.6", tax_rate_pct: "0.37" },
  optimization_items: [
    { category: "Furniture & design", total_price: "45000" },
    { category: "Hot tub", total_price: "12000" },
  ],
  operating_expenses: [
    { expense_name: "Utilities", monthly_amount: "450" },
    { expense_name: "Insurance", monthly_amount: "320" },
  ],
};

export function revenuePayload(mid: number) {
  return {
    co_hosting_fee_pct: "0",
    annual_re_appreciation_pct: "0.03",
    scenarios: {
      low: { forecasted_revenue: String(Math.round(mid * 0.85)) },
      mid: { forecasted_revenue: String(mid) },
      high: { forecasted_revenue: String(Math.round(mid * 1.15)) },
    },
  };
}

/** Thin client for arranging test state directly against the backend. */
export class TrainingApi {
  constructor(private readonly request: APIRequestContext) {}

  private async json<T>(method: "GET" | "POST" | "PUT", route: string, data?: unknown): Promise<T> {
    const response = await this.request.fetch(`${API_BASE_URL}/api${route}`, { method, data });
    if (!response.ok()) {
      throw new Error(`${method} ${route} failed: ${response.status()} ${await response.text()}`);
    }
    return (await response.json()) as T;
  }

  dashboard() {
    return this.json<{ summary: Record<string, number | string | null>; properties: { zpid: string; status: string }[] }>(
      "GET",
      "/dashboard",
    );
  }

  submissions(zpid: string) {
    return this.json<{ id: number; rating: string }[]>("GET", `/submissions?zpid=${zpid}`);
  }

  async startDraft(zpid: string): Promise<number> {
    const draft = await this.json<{ id: number }>("POST", "/underwritings", { zpid });
    return draft.id;
  }

  save(id: number, payload: Record<string, unknown>) {
    return this.json<Record<string, unknown>>("PUT", `/underwritings/${id}`, payload);
  }

  /** A draft with complete financials and no revenue yet. */
  async draftWithFinancials(zpid: string): Promise<number> {
    const id = await this.startDraft(zpid);
    await this.save(id, STANDARD_FINANCIALS);
    return id;
  }

  /** A graded attempt created entirely through the API. Returns the submission id. */
  async submitAttempt(zpid: string, mid: number): Promise<number> {
    const id = await this.startDraft(zpid);
    const result = await this.json<{ submission: { id: number } }>("POST", `/underwritings/${id}/submit`, {
      ...STANDARD_FINANCIALS,
      forecasted_revenue: revenuePayload(mid),
    });
    return result.submission.id;
  }
}
