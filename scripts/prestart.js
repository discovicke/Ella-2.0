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
const ui = require("./lib/ella-ui");
const { c } = ui;

const ROOT = path.resolve(__dirname, "..");
const ENV_PATH = path.join(ROOT, "Backend", ".env");
const ENV_EXAMPLE_PATH = path.join(ROOT, "Backend", ".env-example");

const DOCKER_PROVIDERS = ["postgres", "sqlserver"];

// --- Check env files exist ---
if (!fs.existsSync(ENV_PATH) && !fs.existsSync(ENV_EXAMPLE_PATH)) {
  ui.header("Pre-flight");
  ui.fail("No .env or .env-example found.");
  ui.hint(
    `Run ${c.cyan}npm run setup${c.reset}${c.dim} to complete initial configuration.`,
  );
  ui.footer();
  process.exit(1);
}

// --- Read env file ---
const envFile = fs.existsSync(ENV_PATH) ? ENV_PATH : ENV_EXAMPLE_PATH;
const content = fs.readFileSync(envFile, "utf8");

// --- Check for JWT placeholder key ---
const jwtMatch = content.match(/JwtSettings__SecretKey=(.+)/);
const jwtKey = jwtMatch ? jwtMatch[1].trim() : null;
const PLACEHOLDERS = ["CHANGE_ME", "REPLACE_WITH_SECURE_KEY_MIN_32_CHARS"];
if (jwtKey && PLACEHOLDERS.includes(jwtKey.toUpperCase())) {
  ui.header("Pre-flight");
  ui.fail("JWT SecretKey is set to a placeholder — the app will not start.");
  console.log();
  ui.hint(
    `Open ${c.cyan}${envFile}${c.reset}${c.dim} and replace the JwtSettings__SecretKey value.`,
  );
  ui.hint(
    `Generate a key with: ${c.cyan}node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"${c.reset}`,
  );
  console.log();
  ui.hint(
    `Or delete both env files and run ${c.cyan}npm run setup${c.reset}${c.dim} to regenerate automatically.`,
  );
  ui.footer();
  process.exit(1);
}

// --- Read provider ---
const match = content.match(/DatabaseSettings__Provider=(.+)/);
const provider = match ? match[1].trim().toLowerCase() : null;

// --- Start Docker if needed ---
if (provider && DOCKER_PROVIDERS.includes(provider)) {
  const composeFile = path.join(
    ROOT,
    "_tools",
    "docker",
    `docker-compose.${provider}.yml`,
  );
  if (!fs.existsSync(composeFile)) {
    ui.fail(
      `No compose file found: _tools/docker/docker-compose.${provider}.yml`,
    );
    process.exit(1);
  }

  try {
    execSync("docker info", { stdio: "ignore" });
  } catch {
    ui.fail(`Docker is not running. Start Docker Desktop and try again.`);
    process.exit(1);
  }

  ui.header("Pre-flight");
  ui.info(`Ensuring ${provider} container is up...`);
  try {
    execSync(`docker-compose -f "${composeFile}" up -d`, {
      cwd: ROOT,
      stdio: "pipe",
    });
    ui.ok(`${provider} container is running.`);
  } catch (err) {
    ui.fail(
      `docker-compose up failed for _tools/docker/docker-compose.${provider}.yml`,
    );
    if (err.stderr) console.error(err.stderr.toString());
    process.exit(1);
  }
}
