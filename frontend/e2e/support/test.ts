import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { test as base, expect } from "@playwright/test";

import { TrainingApi } from "./api";
import { WorkspacePage } from "./workspace-page";

type ApiCall = {
  method: string;
  url: string;
  status: number | null;
  requestBody: unknown;
  responseBody: unknown;
  durationMs: number;
};

const LISTING_PHOTO = readFileSync(path.join(__dirname, "..", "fixtures", "listing-photo.svg"));

function parse(text: string | null | undefined): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text.slice(0, 2000);
  }
}

export const test = base.extend<{
  apiLog: ApiCall[];
  stubImages: void;
  api: TrainingApi;
  workspace: WorkspacePage;
}>({
  /**
   * Records every call the browser makes to the API proxy. When a test fails,
   * the log is attached to the report next to the trace, screenshot and video,
   * so you can see exactly what the UI sent and what came back.
   */
  apiLog: [
    async ({ page }, use, testInfo) => {
      const calls: ApiCall[] = [];
      const started = new Map<object, number>();
      page.on("request", (request) => {
        if (request.url().includes("/api/backend/")) started.set(request, Date.now());
      });
      page.on("requestfinished", async (request) => {
        if (!request.url().includes("/api/backend/")) return;
        const response = await request.response();
        calls.push({
          method: request.method(),
          url: request.url().replace(/^https?:\/\/[^/]+/, ""),
          status: response?.status() ?? null,
          requestBody: parse(request.postData()),
          responseBody: parse(await response?.text().catch(() => null)),
          durationMs: Date.now() - (started.get(request) ?? Date.now()),
        });
      });
      page.on("requestfailed", (request) => {
        if (!request.url().includes("/api/backend/")) return;
        calls.push({
          method: request.method(),
          url: request.url().replace(/^https?:\/\/[^/]+/, ""),
          status: null,
          requestBody: parse(request.postData()),
          responseBody: request.failure()?.errorText ?? "failed",
          durationMs: Date.now() - (started.get(request) ?? Date.now()),
        });
      });

      await use(calls);

      if (testInfo.status !== testInfo.expectedStatus) {
        const file = testInfo.outputPath("api-calls.json");
        writeFileSync(file, JSON.stringify(calls, null, 2));
        await testInfo.attach("api-calls.json", { path: file, contentType: "application/json" });
      }
    },
    { auto: true },
  ],

  /** Listing photos come from an external service; serve a local one so runs never depend on it. */
  stubImages: [
    async ({ page }, use) => {
      await page.route(/picsum\.photos/, (route) =>
        route.fulfill({ status: 200, contentType: "image/svg+xml", body: LISTING_PHOTO }),
      );
      await use();
    },
    { auto: true },
  ],

  api: async ({ request }, use) => {
    await use(new TrainingApi(request));
  },

  workspace: async ({ page }, use) => {
    await use(new WorkspacePage(page));
  },
});

export { expect };
