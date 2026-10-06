#!/usr/bin/env node
/**
 * One command, no manual steps: start the backend, make sure Chromium is
 * installed, run every Playwright project, and exit with the suite's status.
 *
 *   npm run e2e
 *   API_PORT=8001 npm run e2e        # backend on another port
 *   npm run e2e -- --project=mocked  # extra args go to `playwright test`
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const composeFile = path.resolve(root, "..", "..", "backend", "docker-compose.yml");
const apiPort = process.env.API_PORT ?? "8000";
const env = { ...process.env, API_BASE_URL: process.env.API_BASE_URL ?? `http://localhost:${apiPort}` };

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
  run("docker", ["compose", "-f", composeFile, "up", "-d", "--build", "--wait"], "Starting the backend (Docker)");
}
run("npx", ["playwright", "install", "chromium"], "Making sure Chromium is installed");

console.log(`\n▶ Running Playwright against ${env.API_BASE_URL}`);
const tests = spawnSync("npx", ["playwright", "test", ...extra], { stdio: "inherit", env, cwd: path.resolve(root, "..") });
console.log("\nHTML report: npx playwright show-report   ·   failure artifacts: test-results/");
process.exit(tests.status ?? 1);
