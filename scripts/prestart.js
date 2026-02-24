#!/usr/bin/env node
/**
 * Pre-start checks for `npm start`.
 * - Ensures a .env or .env-example file exists (otherwise points to `npm run setup`).
 * - Starts Docker containers if the configured provider needs them.
 *
 * No interactivity — safe for piped/non-interactive environments.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// --- Output helpers ---
const c = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
};
const DIV = `  ${c.dim}${"─".repeat(42)}${c.reset}`;
const info = (msg) => console.log(`  ${c.cyan}◆${c.reset}  ${msg}`);
const fail = (msg) => console.error(`  ${c.red}✖${c.reset}  ${msg}`);
const hint = (msg) => console.log(`     ${c.dim}${msg}${c.reset}`);

const ROOT = path.resolve(__dirname, "..");
const ENV_PATH = path.join(ROOT, "Backend", ".env");
const ENV_EXAMPLE_PATH = path.join(ROOT, "Backend", ".env-example");

const DOCKER_PROVIDERS = ["postgres", "sqlserver"];

// --- Check env files exist ---
if (!fs.existsSync(ENV_PATH) && !fs.existsSync(ENV_EXAMPLE_PATH)) {
  console.log(`\n${DIV}`);
  fail("No .env or .env-example found.");
  hint(
    `Run ${c.cyan}npm run setup${c.reset}${c.dim} to complete initial configuration.`,
  );
  console.log(`${DIV}\n`);
  process.exit(1);
}

// --- Read provider ---
const envFile = fs.existsSync(ENV_PATH) ? ENV_PATH : ENV_EXAMPLE_PATH;
const content = fs.readFileSync(envFile, "utf8");
const match = content.match(/DatabaseSettings__Provider=(.+)/);
const provider = match ? match[1].trim().toLowerCase() : null;

// --- Start Docker if needed ---
if (provider && DOCKER_PROVIDERS.includes(provider)) {
  const composeFile = path.join(ROOT, `docker-compose.${provider}.yml`);
  if (!fs.existsSync(composeFile)) {
    fail(`No compose file found: docker-compose.${provider}.yml`);
    process.exit(1);
  }

  try {
    execSync("docker info", { stdio: "ignore" });
  } catch {
    fail(`Docker is not running. Start Docker Desktop and try again.`);
    process.exit(1);
  }

  console.log(`\n${DIV}`);
  info(`Ensuring ${provider} container is up...`);
  try {
    execSync(`docker-compose -f "${composeFile}" up -d`, {
      cwd: ROOT,
      stdio: "inherit",
    });
  } catch {
    fail(`docker-compose up failed for docker-compose.${provider}.yml`);
    process.exit(1);
  }
  console.log(DIV);
}
