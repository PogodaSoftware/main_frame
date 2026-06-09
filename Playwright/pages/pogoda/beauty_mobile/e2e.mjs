#!/usr/bin/env bun
/**
 * One-shot end-to-end runner for the RN Beauty app.
 *
 * `bun run e2e`               → both pytest suites + the TS Playwright specs
 * `bun run e2e:web`           → web-mobile pytest only (Expo web bundle)
 * `bun run e2e:native`        → Appium native pytest only (emulator-5554)
 * `bun run e2e:ts`            → existing TS spec files (admin/auth/business)
 *
 * Cross-platform via Node-style ``child_process``; works under Windows bun.
 */
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
// Repo root = .../main_frame (four levels above this file)
const REPO = resolve(HERE, "../../../..");

const mode = process.argv[2] ?? "all";

function run(label, cmd, args, env = {}) {
  console.log(`\n=== ${label} ===\n$ ${cmd} ${args.join(" ")}`);
  const result = spawnSync(cmd, args, {
    cwd: REPO,
    stdio: "inherit",
    env: { ...process.env, ...env },
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    console.error(`\n${label} FAILED (exit ${result.status})`);
    process.exit(result.status ?? 1);
  }
}

const PYTEST_ENV = { PYTHONPATH: REPO };

const targets = {
  web: () =>
    run(
      "web-mobile pytest (Expo web bundle, port BEAUTY_MOBILE_PORT)",
      "python",
      [
        "-m", "pytest",
        "Playwright/steps/beauty_mobile/test_all_routes_web_mobile.py",
        "-v",
      ],
      PYTEST_ENV,
    ),
  native: () =>
    run(
      "native pytest (Appium UiAutomator2 + emulator-5554)",
      "python",
      [
        "-m", "pytest",
        "Playwright/steps/beauty_mobile_native/test_all_routes_native.py",
        "-v",
      ],
      PYTEST_ENV,
    ),
  ts: () =>
    run(
      "TS Playwright specs (admin/auth/business)",
      process.platform === "win32" ? "bunx.exe" : "bunx",
      ["playwright", "test"],
    ),
};

if (mode === "all") {
  targets.native();
  targets.web();
  targets.ts();
} else if (targets[mode]) {
  targets[mode]();
} else {
  console.error(`Unknown mode: ${mode}. Expected one of: web, native, ts, all.`);
  process.exit(2);
}
