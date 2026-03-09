#!/usr/bin/env node
/**
 * sync-frontend.js — Run swagger-typescript-api + generate-input-limits
 * with clean, unified output. Replaces the raw npx call.
 *
 * Called by: npm run frontend:sync (from root)
 */

const path = require("path");
const { execSync } = require("child_process");
const ui = require("./lib/ella-ui");

const ROOT = path.resolve(__dirname, "..");
const FRONTEND = path.join(ROOT, "Frontend", "ng.Frontend");

// --- Generate TypeScript models from OpenAPI spec ---
try {
  execSync(
    "npx swagger-typescript-api generate -p ./openapi/models.json -o src/app/models -n models.ts --no-client",
    { cwd: FRONTEND, stdio: "pipe", encoding: "utf-8" },
  );
  ui.ok("models.ts synced from OpenAPI spec");
} catch (err) {
  ui.fail("swagger-typescript-api failed");
  if (err.stderr) console.error(err.stderr);
  process.exit(1);
}

// --- Generate input-limits.ts ---
try {
  execSync("node scripts/generate-input-limits.js", {
    cwd: FRONTEND,
    stdio: "inherit",
  });
} catch {
  ui.fail("generate-input-limits.js failed");
  process.exit(1);
}
