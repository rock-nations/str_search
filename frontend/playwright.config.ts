import { defineConfig, devices } from "@playwright/test";

/**
 * Two projects:
 *  - `live`   drives the real FastAPI backend. The `live-setup` project checks it
 *             is reachable and resets it to seed data first.
 *  - `mocked` needs no backend: every API call is answered from recorded
 *             fixtures, which lets us inject failures the real API can't produce.
 *
 *   npm run e2e               # backend up + full suite, unattended
 *   npm run test:e2e:mocked   # no Docker needed
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);
export const API_BASE_URL = (process.env.API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  // The live project shares one database, so tests run one at a time for determinism.
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
    ["junit", { outputFile: "test-results/junit.xml" }],
  ],
  use: {
    ...devices["Desktop Chrome"],
    viewport: { width: 1440, height: 900 },
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10_000,
  },
  projects: [
    { name: "live-setup", testMatch: /live\.setup\.ts/ },
    { name: "live", testMatch: /live\/.*\.spec\.ts/, dependencies: ["live-setup"] },
    { name: "mocked", testMatch: /mocked\/.*\.spec\.ts/ },
  ],
  webServer: {
    // A production build: what reviewers would run, and free of dev-only overlays.
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: { API_BASE_URL },
    stdout: "ignore",
    stderr: "pipe",
  },
});
