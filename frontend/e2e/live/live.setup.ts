import { test as setup, expect } from "@playwright/test";

import { API_BASE_URL, resetDatabase } from "../support/api";

/**
 * Runs before the `live` project: fail fast with a useful message if the
 * backend isn't up, then reset it so every run starts from the same seed data.
 */
setup("backend is reachable and reset to seed data", async ({ request }) => {
  const health = await request.get(`${API_BASE_URL}/api/health`).catch(() => null);
  if (!health?.ok()) {
    throw new Error(
      `The training API isn't reachable at ${API_BASE_URL}.\n` +
        "Start it with: cd backend && docker compose up -d --build --wait\n" +
        "or point the tests elsewhere with API_BASE_URL=http://host:port",
    );
  }

  resetDatabase();

  const dashboard = await (await request.get(`${API_BASE_URL}/api/dashboard`)).json();
  expect(dashboard.properties).toHaveLength(6);
  if (process.env.E2E_SKIP_RESET !== "1") {
    expect(dashboard.summary.submitted).toBe(0);
  }
});
