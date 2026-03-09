#!/usr/bin/env node
/**
 * Unified database management script for ELLA.
 *
 * Reads the active provider from Backend/.env (or .env-example)
 * and dispatches the requested action.
 *
 * Usage:  node scripts/db.js <up|down|reset>
 *
 * Called by:
 *   npm run db:up     -> starts the container
 *   npm run db:down   -> stops the container
 *   npm run db:reset  -> prompts, wipes everything, restarts
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { execSync } = require("child_process");
const ui = require("./lib/ella-ui");
const { c } = ui;

const ACTIONS = ["up", "down", "reset"];
const action = process.argv[2];

if (!ACTIONS.includes(action)) {
  ui.fail(`Unknown action "${action}". Expected: ${ACTIONS.join(", ")}`);
  process.exit(1);
}

// ── Shared helpers ─────────────────────────────────────────

const ROOT = path.resolve(__dirname, "..");
const ENV_PATH = path.join(ROOT, "Backend", ".env");
const ENV_EXAMPLE_PATH = path.join(ROOT, "Backend", ".env-example");

function loadEnv() {
  const envFile = fs.existsSync(ENV_PATH)
    ? ENV_PATH
    : fs.existsSync(ENV_EXAMPLE_PATH)
      ? ENV_EXAMPLE_PATH
      : null;

  if (!envFile) {
    ui.fail("No .env or .env-example found in Backend/");
    process.exit(1);
  }

  const content = fs.readFileSync(envFile, "utf8");
  const provider = content
    .match(/DatabaseSettings__Provider=([^\r\n]+)/)?.[1]
    ?.trim()
    .toLowerCase();
  const connectionString = content
    .match(/DatabaseSettings__ConnectionString=([^\r\n]+)/)?.[1]
    ?.trim();

  if (!provider) {
    ui.fail("Could not determine DatabaseSettings__Provider from env files.");
    process.exit(1);
  }

  return { provider, connectionString };
}

function getComposeFile(provider) {
  const file = path.join(
    ROOT,
    "_tools",
    "docker",
    `docker-compose.${provider}.yml`,
  );
  if (!fs.existsSync(file)) {
    ui.fail(`Docker compose file not found: _tools/docker/docker-compose.${provider}.yml`);
    process.exit(1);
  }
  return file;
}

function requireDocker() {
  try {
    execSync("docker info", { stdio: "ignore" });
  } catch {
    ui.fail(
      "Docker is not running. Start Docker Desktop and try again.",
    );
    process.exit(1);
  }
}

function docker(composeFile, args) {
  execSync(`docker compose -f "${composeFile}" ${args}`, {
    cwd: ROOT,
    stdio: "inherit",
  });
}

function confirm(message) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(ui.prompt(message), (ans) => {
      rl.close();
      resolve(ans.trim().toLowerCase() === "y");
    });
  });
}

// ── Actions ────────────────────────────────────────────────

const { provider, connectionString } = loadEnv();

async function run() {
  if (action === "up") {
    if (provider === "sqlite") {
      ui.info("Provider is SQLite — no container to start.");
      return;
    }
    requireDocker();
    const compose = getComposeFile(provider);
    ui.info(`Starting ${provider} container...`);
    docker(compose, "up -d");
    ui.ok(`${provider} container is running.`);
    return;
  }

  if (action === "down") {
    if (provider === "sqlite") {
      ui.info("Provider is SQLite — no container to stop.");
      return;
    }
    requireDocker();
    const compose = getComposeFile(provider);
    ui.info(`Stopping ${provider} container...`);
    docker(compose, "down");
    ui.ok(`${provider} container stopped.`);
    return;
  }

  if (action === "reset") {
    ui.header("Database Reset");

    const yes = await confirm(
      `Are you sure you want to wipe your ${c.cyan}${provider}${c.reset} database? All data will be destroyed. (y/N): `,
    );

    if (!yes) {
      ui.hint("Reset cancelled.");
      ui.footer();
      return;
    }

    if (provider === "sqlite") {
      // ── SQLite: delete the .db file ──
      if (!connectionString) {
        ui.fail("Could not find connection string for SQLite.");
        process.exit(1);
      }

      const match = connectionString.match(/Data Source=([^;]+)/i);
      if (!match) {
        ui.fail(
          `Could not parse SQLite path from connection string: ${connectionString}`,
        );
        process.exit(1);
      }

      const dbPath = path.resolve(ROOT, "Backend", match[1].trim());
      const deleted = [];

      [dbPath, `${dbPath}-wal`, `${dbPath}-shm`].forEach((f) => {
        if (fs.existsSync(f)) {
          fs.unlinkSync(f);
          deleted.push(path.basename(f));
        }
      });

      if (deleted.length) {
        ui.ok(`Deleted: ${deleted.join(", ")}`);
      } else {
        ui.warn(`No SQLite file found at: ${dbPath}`);
      }

      ui.hint("The database will be recreated on next application start.");
    } else {
      // ── Docker providers: down -v then up -d ──
      requireDocker();
      const compose = getComposeFile(provider);

      ui.info(`Wiping ${provider} (docker compose down -v)...`);
      docker(compose, "down -v");
      ui.ok(`${provider} volumes removed.`);

      ui.info(`Starting fresh ${provider} container...`);
      docker(compose, "up -d");
      ui.ok(`${provider} container is running.`);
    }

    ui.done("Database reset complete.");
    ui.footer();
  }
}

run().catch((err) => {
  ui.fail(err.message);
  process.exit(1);
});
