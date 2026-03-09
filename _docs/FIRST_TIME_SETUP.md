# First-Time Setup Guide

## Prerequisites

| Tool     | Version | Check              |
| -------- | ------- | ------------------ |
| Node.js  | 18+     | `node -v`          |
| .NET SDK | 9.0+    | `dotnet --version` |
| Docker   | 20+     | `docker --version` |

> Docker is only required for **Postgres** or **SqlServer**. Sqlite works without it.

---

## Setup

```bash
git clone <repo-url>
cd ELLA_v2
npm run setup
```

This installs all dependencies (root, frontend, backend restore) and runs the interactive bootstrap:

```
  ────────────────────────────────────────────────
  ELLA  First-time Setup
  ────────────────────────────────────────────────

  Select a database provider
  ────────────────────────────────────────────────
     1  Sqlite
     2  Postgres
     3  SqlServer

Enter choice (1-3) [default: 1]:
```

After picking, setup:

1. Writes `Backend/.env-example` with the correct connection string (credentials pulled directly from the provider's compose file) and an auto-generated JWT signing key.
2. Starts the Docker container if the chosen provider requires one.
3. Prints **"Setup complete! Run `npm start` to launch the project."**

If env files already exist, setup asks if you want to reconfigure. If a real `.env` exists (not just `.env-example`), it asks for a second confirmation before deleting it.

---

## Daily Workflow

```bash
npm start
```

Automatically:

1. Verifies env files exist (exits with instructions if missing).
2. Starts the Docker container if the configured provider needs one.
3. Rebuilds the backend and syncs OpenAPI TypeScript models.
4. Generates DBML schema diagram locally. Publishing to dbdocs.io is handled automatically by GitHub Actions when schema changes are pushed to main.
5. Launches both servers in parallel:

| Server   | URL                   |
| -------- | --------------------- |
| Backend  | http://localhost:5269 |
| Frontend | http://localhost:4200 |

---

## Using Real Credentials

Setup writes `Backend/.env-example` with working defaults derived from the compose file. To use your own credentials:

```bash
cp Backend/.env-example Backend/.env
# edit Backend/.env with your real values
```

Both files are gitignored. The app loads `.env` first, falling back to `.env-example`.

> **Note:** Setup auto-generates a unique JWT signing key — no manual step needed for development.

> **Production:** The `.env-example` fallback is blocked when `ASPNETCORE_ENVIRONMENT=Production`.  
> In production, use a real `.env` file or set environment variables directly (e.g. via Azure App Service Configuration, CI/CD, etc.).

---

## Reconfiguring

```bash
rm Backend/.env Backend/.env-example
npm run setup
```

---

## Quick Reference

| Command                  | Purpose                                                          |
| ------------------------ | ---------------------------------------------------------------- |
| `npm run setup`          | One-time: install deps, pick DB provider, start Docker           |
| `npm start`              | Daily: pre-checks, rebuild models, generate DBML, serve servers  |
| `npm run sync:models`    | Regenerate TypeScript models from backend DTOs (no restart)      |
| `npm run dbml:generate`  | Regenerate DBML from PostgresSchema.sql (+ publish if logged in) |
| `npm run build:prod`     | Full production build → `dist/final_app`                         |
| `npm run help`           | Show all available commands                                      |

---

## Troubleshooting

**`✖  No .env or .env-example found`** — Run `npm run setup` first.

**`password authentication failed`** — Delete both env files and re-run `npm run setup` to regenerate credentials from the compose file.

**`Docker is not running`** — Start Docker Desktop, then retry.

**Container fails to start** — Run the compose command manually to see the full error output:

```bash
docker-compose -f _tools/docker/docker-compose.postgres.yml up -d
# or
docker-compose -f _tools/docker/docker-compose.sqlserver.yml up -d
```

> **Tip:** Docker compose credentials can be overridden with environment variables (e.g. `POSTGRES_PASSWORD`, `MSSQL_SA_PASSWORD`). The compose files use `${VAR:-default}` syntax — see the files for all supported variables.

**`JWT SecretKey is set to a placeholder`** — This happens if the `.env` / `.env-example` file was manually created or edited with a placeholder value instead of a real key. To fix:

1. Open `Backend/.env` (or `Backend/.env-example`)
2. Replace the `JwtSettings__SecretKey=...` value with a real key:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```
3. Or delete both env files and run `npm run setup` — it auto-generates a key for you.
