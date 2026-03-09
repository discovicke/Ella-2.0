#!/usr/bin/env node
/**
 * First-time project bootstrap.
 * - Reads the DbProviders enum from the C# source.
 * - Prompts the user to pick a database provider.
 * - Writes a .env-example file into Backend/ (with auto-generated JWT key).
 * - Starts Docker containers if the chosen provider needs them.
 *
 * Called by `npm run setup`.
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const crypto = require("crypto");
const { execSync } = require("child_process");
const ui = require("./lib/ella-ui");
const { c } = ui;

const ROOT = path.resolve(__dirname, "..");
const ENV_PATH = path.join(ROOT, "Backend", ".env");
const ENV_EXAMPLE_PATH = path.join(ROOT, "Backend", ".env-example");
const DB_PROVIDERS_CS = path.join(
  ROOT,
  "Backend",
  "app",
  "Core",
  "Models",
  "Enums",
  "DbProviders.cs",
);

const DOCKER_PROVIDERS = ["postgres", "sqlserver"];

// --- Helper: extract value from compose env vars ---
// Handles both plain values (KEY: value) and Docker ${VAR:-default} syntax.
function extractEnvValue(yml, pattern) {
  const raw = yml.match(pattern)?.[1]?.trim();
  if (!raw) return null;
  // Strip surrounding quotes
  const unquoted = raw.replace(/^["']|["']$/g, "");
  // Match ${VAR:-default} and extract the default
  const fallbackMatch = unquoted.match(/^\$\{[^:-]+:-?(.+)\}$/);
  return fallbackMatch ? fallbackMatch[1] : unquoted;
}

// --- Already set up? ---
if (fs.existsSync(ENV_PATH) || fs.existsSync(ENV_EXAMPLE_PATH)) {
  ui.header("Setup");
  ui.ok("Environment already configured.");

  const existing = [
    fs.existsSync(ENV_PATH) && "Backend/.env",
    fs.existsSync(ENV_EXAMPLE_PATH) && "Backend/.env-example",
  ].filter(Boolean);
  ui.detail(`Found: ${existing.join(", ")}`);

  const rlReconfigure = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rlReconfigure.question(
    ui.prompt("Reconfigure from scratch? (y/N): "),
    (ans) => {
      rlReconfigure.close();
      if (ans.trim().toLowerCase() !== "y") {
        ui.hint("Keeping existing configuration.");
        ui.footer();
        process.exit(0);
      }
      // Remove old env files and continue setup
      function removeAndContinue() {
        if (fs.existsSync(ENV_PATH)) fs.unlinkSync(ENV_PATH);
        if (fs.existsSync(ENV_EXAMPLE_PATH)) fs.unlinkSync(ENV_EXAMPLE_PATH);
        ui.ok("Removed old environment files.");
        runSetup();
      }

      if (fs.existsSync(ENV_PATH)) {
        ui.warn(
          "A real Backend/.env file exists (may contain production credentials).",
        );
        const rlConfirm = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });
        rlConfirm.question(
          ui.prompt("Delete Backend/.env too? This cannot be undone. (y/N): "),
          (confirm) => {
            rlConfirm.close();
            if (confirm.trim().toLowerCase() !== "y") {
              ui.hint("Keeping Backend/.env — only removing .env-example.");
              if (fs.existsSync(ENV_EXAMPLE_PATH))
                fs.unlinkSync(ENV_EXAMPLE_PATH);
              ui.ok("Removed Backend/.env-example.");
              runSetup();
            } else {
              removeAndContinue();
            }
          },
        );
      } else {
        removeAndContinue();
      }
    },
  );
} else {
  runSetup();
}

function runSetup() {
  // --- Parse enum members from C# source ---
  const csSource = fs.readFileSync(DB_PROVIDERS_CS, "utf8");
  const enumBodyMatch = csSource.match(/enum\s+DbProviders\s*\{([^}]+)\}/);
  if (!enumBodyMatch) {
    ui.fail("Could not parse DbProviders enum from C# source.");
    process.exit(1);
  }
  const providers = enumBodyMatch[1]
    .split(",")
    .map((s) => s.replace(/\/\/.*$/m, "").trim())
    .filter(Boolean);

  // --- Connection string templates per provider ---
  // For Docker-backed providers, reads credentials from the compose file to stay in sync.
  function getConnectionString(providerName) {
    const providerLower = providerName.toLowerCase();

    if (providerLower === "sqlite") {
      return "Data Source=app/Infrastructure/Data/ella.db";
    }

    const composeFile = path.join(
      ROOT,
      "_tools",
      "docker",
      `docker-compose.${providerLower}.yml`,
    );
    if (!fs.existsSync(composeFile)) {
      return "YOUR_CONNECTION_STRING_HERE";
    }

    const yml = fs.readFileSync(composeFile, "utf8");

    if (providerLower === "postgres") {
      const user = extractEnvValue(yml, /POSTGRES_USER:\s*(.+)/) ?? "postgres";
      const pass =
        extractEnvValue(yml, /POSTGRES_PASSWORD:\s*(.+)/) ?? "postgres";
      const db = extractEnvValue(yml, /POSTGRES_DB:\s*(.+)/) ?? "postgres";
      const port =
        extractEnvValue(yml, /POSTGRES_PORT:-?(\d+)/) ??
        yml.match(/"(\d+):5432"/)?.[1] ??
        "5432";
      return `Host=localhost;Port=${port};Database=${db};Username=${user};Password=${pass};`;
    }

    if (providerLower === "sqlserver") {
      const pass =
        extractEnvValue(yml, /MSSQL_SA_PASSWORD:\s*(.+)/) ??
        "YourPasswordHere!";
      const port =
        extractEnvValue(yml, /MSSQL_PORT:-?(\d+)/) ??
        yml.match(/"(\d+):1433"/)?.[1] ??
        "1433";
      return `Server=localhost,${port};Database=ella_db;User Id=sa;Password=${pass};TrustServerCertificate=True;`;
    }

    return "YOUR_CONNECTION_STRING_HERE";
  }

  // --- Prompt ---
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  ui.header("First-time Setup");
  ui.section("Select a database provider");
  providers.forEach((p, i) => ui.menuItem(i + 1, p));
  console.log();

  rl.question(
    `Enter choice (1-${providers.length}) [default: 1]: `,
    (answer) => {
      rl.close();

      const raw = answer.trim();
      let index = 0;
      if (raw !== "") {
        const n = parseInt(raw, 10);
        if (!isNaN(n) && n >= 1 && n <= providers.length) {
          index = n - 1;
        } else {
          ui.fail(`Invalid choice "${raw}". Aborting.`);
          process.exit(1);
        }
      }

      const chosen = providers[index];
      const connStr = getConnectionString(chosen);

      const jwtKey = crypto.randomBytes(32).toString("base64");

      const content = [
        `# --- Database Settings ---`,
        `# Available providers: ${providers.join(" | ")}`,
        `DatabaseSettings__Provider=${chosen.toLowerCase()}`,
        `DatabaseSettings__ConnectionString=${connStr}`,
        `# --- JWT Settings ---`,
        `# Auto-generated secure key. Replace if needed (min 32 characters).`,
        `JwtSettings__SecretKey=${jwtKey}`,
        `JwtSettings__Issuer=EllaBookingAPI`,
        `JwtSettings__Audience=EllaBookingClient`,
        `JwtSettings__AccessTokenExpirationMinutes=60`,
      ].join("\n");

      fs.writeFileSync(ENV_EXAMPLE_PATH, content, "utf8");

      ui.section("Environment");
      ui.ok(
        `Created Backend/.env-example  ${c.dim}(provider: ${chosen})${c.reset}`,
      );
      ui.ok(
        `Generated JWT signing key  ${c.dim}(auto-generated, unique to this machine)${c.reset}`,
      );
      ui.hint(
        "For production, copy to Backend/.env and configure real credentials.",
      );

      // Start Docker if needed
      const providerLower = chosen.toLowerCase();
      if (DOCKER_PROVIDERS.includes(providerLower)) {
        ui.section("Docker");
        const composeFile = path.join(
          ROOT,
          "_tools",
          "docker",
          `docker-compose.${providerLower}.yml`,
        );
        if (!fs.existsSync(composeFile)) {
          ui.fail(
            `No compose file found: _tools/docker/docker-compose.${providerLower}.yml`,
          );
          process.exit(1);
        }
        try {
          execSync("docker info", { stdio: "ignore" });
        } catch {
          ui.fail(
            `Docker is not running. Start Docker Desktop and run 'npm run setup' again.`,
          );
          process.exit(1);
        }
        ui.info(`Starting ${chosen} container...`);
        try {
          execSync(`docker-compose -f "${composeFile}" up -d`, {
            cwd: ROOT,
            stdio: "pipe",
          });
          ui.ok(`${chosen} container is running.`);
        } catch (err) {
          ui.fail(`docker-compose up failed.`);
          if (err.stderr) console.error(err.stderr.toString());
          process.exit(1);
        }
      }

      ui.done(
        `Setup complete!  Run ${c.cyan}npm start${c.reset}${c.green}${c.bold} to launch the project.`,
      );
      ui.footer();
    },
  );
} // end runSetup
