#!/usr/bin/env node
/**
 * Records real API responses into e2e/fixtures/api/*.json for the mocked
 * Playwright project and the unit tests.
 *
 * Run it against a freshly reset backend so ids are stable:
 *   docker compose -f ../backend/docker-compose.yml exec -T api python -m scripts.seed --reset
 *   API_BASE_URL=http://localhost:8000 node scripts/capture-fixtures.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const API = `${(process.env.API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "")}/api`;
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "e2e", "fixtures", "api");
const ZPID = "41234567";

async function call(method, route, body) {
  const res = await fetch(`${API}${route}`, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`${method} ${route} -> ${res.status} ${JSON.stringify(json)}`);
  return json;
}

async function save(name, data) {
  await writeFile(path.join(OUT, `${name}.json`), `${JSON.stringify(data, null, 2)}\n`);
  console.log(`wrote ${name}.json`);
}

const fullPayload = {
  purchase_details: {
    purchase_price: "675000",
    down_payment_pct: "0.2",
    interest_rate: "0.0699",
    mortgage_years: 30,
    closing_costs_pct: "0.03",
  },
  forecasted_revenue: {
    co_hosting_fee_pct: "0",
    annual_re_appreciation_pct: "0.03",
    scenarios: {
      low: { forecasted_revenue: "110000" },
      mid: { forecasted_revenue: "130000" },
      high: { forecasted_revenue: "150000" },
    },
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
  tags: { turnkey: true },
};

await mkdir(OUT, { recursive: true });
await save("dashboard-fresh", await call("GET", "/dashboard"));
await save("property", await call("GET", `/properties/${ZPID}`));
await save("market", await call("GET", "/markets/1"));
const draft = await call("POST", "/underwritings", { zpid: ZPID });
await save("underwriting-draft", draft);
await save("underwriting-saved", await call("PUT", `/underwritings/${draft.id}`, fullPayload));
const result = await call("POST", `/underwritings/${draft.id}/submit`, fullPayload);
await save("submit-result", result);
await save("submissions", await call("GET", `/submissions?zpid=${ZPID}`));
await save("reference-underwriting", await call("GET", `/underwritings/${result.submission.reference_underwriting_id}`));
await save("dashboard-after-submit", await call("GET", "/dashboard"));
