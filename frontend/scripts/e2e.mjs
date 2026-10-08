#!/usr/bin/env node
/**
 * One command, no manual steps: start the backend, make sure Chromium is
 * installed, run every Playwright project, and exit with the suite's status.
 *
 *   npm run e2e
 *   API_PORT=8001 npm run e2e        # backend on another port
 *   BACKEND_DIR=… npm run e2e        # the provided backend lives somewhere else
 *   npm run e2e -- --project=mocked  # extra args go to `playwright test`
 *
 * The backend is the provided API (github.com/fahimstrsearch/strs_fe_assessment_v1),
 * not part of this repository. It is found through BACKEND_DIR, then ./backend,
 * then a clone of the assessment repository next to this one.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(root, "..", "..");
const backendDir = (
  process.env.BACKEND_DIR
    ? [process.env.BACKEND_DIR]
    : [path.join(repoRoot, "backend"), path.join(repoRoot, "..", "strs_fe_assessment_v1", "backend")]
)
  .map((dir) => path.resolve(dir))
  .find((dir) => existsSync(path.join(dir, "docker-compose.yml")));
const composeFile = backendDir && path.join(backendDir, "docker-compose.yml");
const apiPort = process.env.API_PORT ?? "8000";
const env = {
  ...process.env,
  API_BASE_URL: process.env.API_BASE_URL ?? `http://localhost:${apiPort}`,
  ...(backendDir && { BACKEND_DIR: backendDir }),
};

function run(command, args, label) {
  console.log(`\n▶ ${label}\n  $ ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, { stdio: "inherit", env, cwd: path.resolve(root, "..") });
  if (result.status !== 0) {
    console.error(`\n✖ ${label} failed (exit ${result.status ?? result.signal}).`);
    process.exit(result.status ?? 1);
  }
}

const extra = process.argv.slice(2);
const mockedOnly = extra.includes("--project=mocked");

if (!mockedOnly) {
  if (!composeFile) {
    console.error(
      "\n✖ Couldn't find the provided backend. Clone https://github.com/fahimstrsearch/strs_fe_assessment_v1\n" +
        "  next to this repository, or set BACKEND_DIR to its backend/ folder. Mocked tests only: npm run e2e -- --project=mocked",
    );
    process.exit(1);
  }
  run("docker", ["compose", "-f", composeFile, "up", "-d", "--build", "--wait"], "Starting the backend (Docker)");
}
run("npx", ["playwright", "install", "chromium"], "Making sure Chromium is installed");

console.log(`\n▶ Running Playwright against ${env.API_BASE_URL}`);
const tests = spawnSync("npx", ["playwright", "test", ...extra], { stdio: "inherit", env, cwd: path.resolve(root, "..") });
console.log("\nHTML report: npx playwright show-report   ·   failure artifacts: test-results/");
process.exit(tests.status ?? 1);
