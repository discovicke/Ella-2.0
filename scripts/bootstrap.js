#!/usr/bin/env node
/**
 * First-time project bootstrap.
 * - Reads the DbProviders enum from the C# source.
 * - Prompts the user to pick a database provider.
 * - Writes a .env-example file into Backend/.
 * - Starts Docker containers if the chosen provider needs them.
 *
 * Called by `npm run setup`.
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { execSync } = require("child_process");

// --- Output helpers ---
const c = {
  reset:  "\x1b[0m",
  bold:   "\x1b[1m",
  dim:    "\x1b[2m",
  red:    "\x1b[31m",
  green:  "\x1b[32m",
  yellow: "\x1b[33m",
  cyan:   "\x1b[36m",
};
const DIV = `  ${c.dim}${'─'.repeat(42)}${c.reset}`;
const ok      = (msg) => console.log(`  ${c.green}✔${c.reset}  ${msg}`);
const info    = (msg) => console.log(`  ${c.cyan}◆${c.reset}  ${msg}`);
const hint    = (msg) => console.log(`     ${c.dim}${msg}${c.reset}`);
const fail    = (msg) => console.error(`  ${c.red}✖${c.reset}  ${msg}`);
const section = (msg) => console.log(`\n  ${c.bold}${msg}${c.reset}\n${DIV}`);

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

// --- Already set up ---
if (fs.existsSync(ENV_PATH) || fs.existsSync(ENV_EXAMPLE_PATH)) {
  console.log(`\n${DIV}`);
  ok("Environment already configured — skipping setup.");
  hint("To reconfigure, delete Backend/.env and Backend/.env-example, then run this again.");
  console.log(`${DIV}\n`);
  process.exit(0);
}

// --- Parse enum members from C# source ---
const csSource = fs.readFileSync(DB_PROVIDERS_CS, "utf8");
const enumBodyMatch = csSource.match(/enum\s+DbProviders\s*\{([^}]+)\}/);
if (!enumBodyMatch) {
  fail("Could not parse DbProviders enum from C# source.");
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

  const composeFile = path.join(ROOT, `docker-compose.${providerLower}.yml`);
  if (!fs.existsSync(composeFile)) {
    return "YOUR_CONNECTION_STRING_HERE";
  }

  const yml = fs.readFileSync(composeFile, "utf8");

  if (providerLower === "postgres") {
    const user = yml.match(/POSTGRES_USER:\s*(.+)/)?.[1]?.trim() ?? "postgres";
    const pass =
      yml.match(/POSTGRES_PASSWORD:\s*(.+)/)?.[1]?.trim() ?? "postgres";
    const db = yml.match(/POSTGRES_DB:\s*(.+)/)?.[1]?.trim() ?? "postgres";
    const port = yml.match(/"(\d+):5432"/)?.[1] ?? "5432";
    return `Host=localhost;Port=${port};Database=${db};Username=${user};Password=${pass};`;
  }

  if (providerLower === "sqlserver") {
    const pass =
      yml.match(/MSSQL_SA_PASSWORD:\s*"?(.+?)"?\s*$/m)?.[1]?.trim() ??
      "YourPasswordHere!";
    const port = yml.match(/"(\d+):1433"/)?.[1] ?? "1433";
    return `Server=localhost,${port};Database=ella_db;User Id=sa;Password=${pass};TrustServerCertificate=True;`;
  }

  return "YOUR_CONNECTION_STRING_HERE";
}

// --- Prompt ---
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log(`\n${DIV}`);
console.log(`  ${c.yellow}${c.bold}  ELLA — First-time Setup${c.reset}`);
console.log(DIV);
section("Select a database provider");
providers.forEach((p, i) => console.log(`     ${c.bold}${i + 1}${c.reset}  ${p}`));
console.log();

rl.question(`Enter choice (1-${providers.length}) [default: 1]: `, (answer) => {
  rl.close();

  const raw = answer.trim();
  let index = 0;
  if (raw !== "") {
    const n = parseInt(raw, 10);
    if (!isNaN(n) && n >= 1 && n <= providers.length) {
      index = n - 1;
    } else {
      fail(`Invalid choice "${raw}". Aborting.`);
      process.exit(1);
    }
  }

  const chosen = providers[index];
  const connStr = getConnectionString(chosen);

  const content = [
    `# --- Database Settings ---`,
    `# Available providers: ${providers.join(" | ")}`,
    `DatabaseSettings__Provider=${chosen.toLowerCase()}`,
    `DatabaseSettings__ConnectionString=${connStr}`,
    `# --- JWT Settings ---`,
    `# WARNING: Replace this with a secure, random key of at least 32 characters`,
    `JwtSettings__SecretKey=REPLACE_WITH_SECURE_KEY_MIN_32_CHARS`,
    `JwtSettings__Issuer=EllaBookingAPI`,
    `JwtSettings__Audience=EllaBookingClient`,
    `JwtSettings__AccessTokenExpirationMinutes=60`,
  ].join("\n");

  fs.writeFileSync(ENV_EXAMPLE_PATH, content, "utf8");

  section("Environment");
  ok(`Created Backend/.env-example  ${c.dim}(provider: ${chosen})${c.reset}`);
  hint("Copy to Backend/.env and fill in your real credentials.");

  // Start Docker if needed
  const providerLower = chosen.toLowerCase();
  if (DOCKER_PROVIDERS.includes(providerLower)) {
    section("Docker");
    const composeFile = path.join(ROOT, `docker-compose.${providerLower}.yml`);
    if (!fs.existsSync(composeFile)) {
      fail(`No compose file found: docker-compose.${providerLower}.yml`);
      process.exit(1);
    }
    try {
      execSync("docker info", { stdio: "ignore" });
    } catch {
      fail(`Docker is not running. Start Docker Desktop and run 'npm run setup' again.`);
      process.exit(1);
    }
    info(`Starting ${chosen} container...`);
    execSync(`docker-compose -f "${composeFile}" up -d`, {
      cwd: ROOT,
      stdio: "inherit",
    });
  }

  console.log(`\n${DIV}`);
  console.log(`  ${c.green}${c.bold}Setup complete!${c.reset}  Run ${c.cyan}npm start${c.reset} to launch the project.`);
  console.log(`${DIV}\n`);
});
