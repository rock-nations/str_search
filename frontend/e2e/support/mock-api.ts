import type { Page, Route } from "@playwright/test";

import dashboardAfterSubmit from "../fixtures/api/dashboard-after-submit.json";
import market from "../fixtures/api/market.json";
import property from "../fixtures/api/property.json";
import reference from "../fixtures/api/reference-underwriting.json";
import submissions from "../fixtures/api/submissions.json";
import submitResult from "../fixtures/api/submit-result.json";
import draft from "../fixtures/api/underwriting-draft.json";
import saved from "../fixtures/api/underwriting-saved.json";

/**
 * Fixtures recorded from the real API by `scripts/capture-fixtures.mjs`
 * (and validated against the app's Zod schemas in the unit tests), so the
 * mocks can't drift from the contract unnoticed.
 */
export const fixtures = { dashboardAfterSubmit, market, property, reference, submissions, submitResult, draft, saved };

export const DRAFT_ID = draft.id; // 7
export const REFERENCE_ID = reference.id; // 1
export const SUBMISSION_ID = submitResult.submission.id; // 1

export type Reply = { status?: number; body: unknown; delayMs?: number };
export type Handler = Reply | ((route: Route) => Promise<void>);

/** Serves the replies in order; the last one repeats. */
export function sequence(...replies: Reply[]): Handler {
  let call = 0;
  return async (route) => {
    const reply = replies[Math.min(call, replies.length - 1)];
    call += 1;
    await fulfill(route, reply);
  };
}

async function fulfill(route: Route, reply: Reply) {
  if (reply.delayMs) await new Promise((resolve) => setTimeout(resolve, reply.delayMs));
  await route.fulfill({ status: reply.status ?? 200, json: reply.body });
}

const DEFAULT_ROUTES: Record<string, Handler> = {
  "GET /dashboard": { body: dashboardAfterSubmit },
  "GET /submissions": { body: submissions },
  [`GET /submissions?zpid=${property.zpid}`]: { body: submissions },
  [`GET /submissions/${SUBMISSION_ID}`]: { body: submitResult.submission },
  [`GET /properties/${property.zpid}`]: { body: property },
  "GET /markets/1": { body: market },
  [`GET /underwritings/${DRAFT_ID}`]: { body: saved },
  [`PUT /underwritings/${DRAFT_ID}`]: { body: saved },
  [`POST /underwritings/${DRAFT_ID}/submit`]: { body: submitResult },
  [`GET /underwritings/${REFERENCE_ID}`]: { body: reference },
};

/**
 * Answers every browser call to the API proxy from fixtures. Keys look like
 * "GET /dashboard" or "GET /submissions?zpid=41234567" (query match wins).
 * Anything unmocked gets a 404 so a missing mock fails loudly.
 */
export async function mockApi(page: Page, overrides: Record<string, Handler> = {}) {
  const routes = { ...DEFAULT_ROUTES, ...overrides };
  await page.route("**/api/backend/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api\/backend/, "");
    const handler = routes[`${request.method()} ${path}${url.search}`] ?? routes[`${request.method()} ${path}`];
    if (!handler) {
      await route.fulfill({ status: 404, json: { detail: `No mock for ${request.method()} ${path}${url.search}` } });
      return;
    }
    if (typeof handler === "function") await handler(route);
    else await fulfill(route, handler);
  });
}
