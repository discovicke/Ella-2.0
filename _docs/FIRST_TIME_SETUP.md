# First-Time Setup Guide

## Prerequisites

| Tool      | Version | Check              |
| --------- | ------- | ------------------ |
| Node.js   | 18+     | `node -v`          |
| .NET SDK  | 9.0+    | `dotnet --version` |
| Docker    | 20+     | `docker --version` |

> Docker is only required for **Postgres** or **SqlServer**. Sqlite works without it.

---

## Setup

```bash
git clone <repo-url>
cd ELLA_v2
npm run setup
```

This installs all dependencies and runs the interactive bootstrap:

```
[ELLA Setup] No .env file found — first-time setup.
Select a database provider:

  [1] Sqlite     — no Docker, file-based DB
  [2] Postgres   — Docker (docker-compose.postgres.yml)
  [3] SqlServer  — Docker (docker-compose.sqlserver.yml)

Enter choice (1-3) [default: 1]:
```

After picking, setup creates `Backend/.env-example` with the correct connection string (credentials pulled directly from the compose file) and starts the Docker container if needed.

---

## Daily Workflow

```bash
npm start
```

Automatically: verifies env files exist → starts Docker if needed → rebuilds backend & syncs OpenAPI models → launches both servers:

- Backend (watch mode) → `http://localhost:5269`
- Frontend (dev server) → `http://localhost:4200`

---

## Real Credentials

Setup writes `Backend/.env-example` with working defaults. To use your own credentials:

```bash
cp Backend/.env-example Backend/.env
# edit Backend/.env with your real values
```

Both files are gitignored. The app loads `.env` first, falling back to `.env-example`.

---

## Reconfiguring

```bash
rm Backend/.env Backend/.env-example
npm run setup
```

---

## Quick Reference

| Command                  | Purpose                                              |
| ------------------------ | ---------------------------------------------------- |
| `npm run setup`          | One-time: install deps, pick DB provider, start Docker |
| `npm start`              | Daily: pre-checks, build, serve both servers         |
| `npm run refresh:models` | Regenerate TypeScript models from backend DTOs       |
| `npm run build:prod`     | Production build → `dist/final_app`                  |
| `npm run help`           | Show all available commands                          |

---

## Troubleshooting

**`[ELLA] No .env or .env-example found`** — Run `npm run setup` first.

**`password authentication failed`** — Delete both env files and re-run `npm run setup` to regenerate credentials from the compose file.

**`Docker is not running`** — Start Docker Desktop, then retry.

**`Failed to connect to 127.0.0.1:5432`** — Container didn't start. Run `docker-compose -f docker-compose.postgres.yml up -d` manually.
