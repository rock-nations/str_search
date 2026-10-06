#!/usr/bin/env node
/**
 * Captures full-page screenshots for design review and the README.
 *
 *   node scripts/screenshots.mjs --base http://localhost:3000 --out ../docs/screenshots \
 *     --pages "/,/properties/41234567" --widths 1440,390 --themes light,dark
 *
 * A page entry may carry a name and a step query: "workspace=/underwritings/7?step=analysis".
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";

import { chromium } from "@playwright/test";

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .join(" ")
    .split("--")
    .filter(Boolean)
    .map((pair) => {
      const [key, ...rest] = pair.trim().split(" ");
      return [key, rest.join(" ")];
    }),
);

const base = args.base ?? "http://localhost:3000";
const out = path.resolve(args.out ?? "screenshots");
const pages = (args.pages ?? "/").split(",").map((entry) => {
  // "name=/path?query=1" → split on the first "=" only, and only when the entry doesn't start with "/".
  const eq = entry.indexOf("=");
  const named = !entry.startsWith("/") && eq > 0;
  const target = named ? entry.slice(eq + 1) : entry;
  const name = named ? entry.slice(0, eq) : target.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "home";
  return { name, target };
});
const widths = (args.widths ?? "1440").split(",").map(Number);
const themes = (args.themes ?? "light").split(",");
const fullPage = args.viewport === undefined;

await mkdir(out, { recursive: true });
const browser = await chromium.launch();

for (const theme of themes) {
  for (const width of widths) {
    const context = await browser.newContext({
      viewport: { width, height: width < 600 ? 844 : 900 },
      deviceScaleFactor: width < 600 ? 2 : 1,
      colorScheme: theme === "dark" ? "dark" : "light",
    });
    await context.addInitScript((t) => window.localStorage.setItem("theme", t), theme);
    const page = await context.newPage();
    for (const { name, target } of pages) {
      await page.goto(`${base}${target}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(Number(args.wait ?? 600));
      const file = path.join(out, `${name}-${width}-${theme}.png`);
      await page.screenshot({ path: file, fullPage });
      console.log(file);
    }
    await context.close();
  }
}

await browser.close();
