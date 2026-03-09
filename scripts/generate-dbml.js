#!/usr/bin/env node
// ============================================================
// generate-dbml.js — Convert PostgresSchema.sql → DBML
//
// Usage:  node scripts/generate-dbml.js          (called by npm start)
//
// 1. Strips Postgres-specific syntax that sql2dbml can't parse
// 2. Converts to DBML via sql2dbml
// 3. Pushes to dbdocs.io if authenticated (optional, graceful)
// 4. Updates DATABASE_DOC.md + README.md links on successful push
// ============================================================

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execSync } = require("child_process");
const ui = require("./lib/ella-ui");

const ROOT = path.resolve(__dirname, "..");
const SCHEMA_PATH = path.join(
  ROOT,
  "Backend",
  "app",
  "Infrastructure",
  "Data",
  "PostgresSchema.sql",
);
const OUTPUT_PATH = path.join(ROOT, "_tools", "dbml", "schema.dbml");
const HASH_PATH = path.join(ROOT, "_tools", "dbml", ".schema.hash");
const TEMP_SQL = path.join(ROOT, "_tools", "dbml", ".schema-clean.sql");
const DATABASE_DOC_PATH = path.join(
  ROOT,
  "Backend",
  "_docs",
  "details",
  "DATABASE_DOC.md",
);
const README_PATH = path.join(ROOT, "README.md");
const DBDOCS_PROJECT = "ELLA2";

// --- Read ---
let sql = fs.readFileSync(SCHEMA_PATH, "utf-8");

// --- Extract ENUMs from DO $$ blocks ---
// Pattern: CREATE TYPE <name> AS ENUM ('val1', 'val2', ...);
const enumRegex = /CREATE\s+TYPE\s+(\w+)\s+AS\s+ENUM\s*\(([^)]+)\)/gi;
const enums = [];
let match;
while ((match = enumRegex.exec(sql)) !== null) {
  const name = match[1];
  const values = match[2]
    .split(",")
    .map((v) => v.trim().replace(/'/g, ""))
    .filter(Boolean);
  enums.push({ name, values });
}

// --- Build clean SQL ---

// 1) Remove DO $$ ... END $$; blocks (enum definitions, migrations)
sql = sql.replace(/DO\s*\$\$[\s\S]*?END\s*\$\$\s*;/gi, "");

// 2) Remove ALTER TYPE statements
sql = sql.replace(/ALTER\s+TYPE\s+[^;]+;/gi, "");

// 3) Remove DROP VIEW statements
sql = sql.replace(/DROP\s+VIEW\s+[^;]+;/gi, "");

// 4) Remove CREATE (OR REPLACE) VIEW ... (ends at next CREATE or EOF section marker)
sql = sql.replace(
  /CREATE\s+(OR\s+REPLACE\s+)?VIEW[\s\S]*?(?=\n--\s*={3,}|\nCREATE\s+(OR\s+REPLACE\s+)?FUNCTION|$)/gi,
  "",
);

// 5) Remove CREATE (OR REPLACE) FUNCTION ... $$ LANGUAGE plpgsql;
sql = sql.replace(
  /CREATE\s+(OR\s+REPLACE\s+)?FUNCTION[\s\S]*?\$\$\s*LANGUAGE\s+\w+\s*;/gi,
  "",
);

// 6) Remove CREATE (OR REPLACE) TRIGGER statements
sql = sql.replace(
  /CREATE\s+(OR\s+REPLACE\s+)?TRIGGER[\s\S]*?EXECUTE\s+FUNCTION\s+\w+\(\)\s*;/gi,
  "",
);

// 7) Remove CREATE INDEX statements (sql2dbml doesn't handle them)
sql = sql.replace(/CREATE\s+(UNIQUE\s+)?INDEX\s+[^;]+;/gi, "");

// 8) Prepend DBML-compatible enum CREATE TYPE statements
//    sql2dbml --postgres understands: CREATE TYPE name AS ENUM ('a','b');
const enumSql = enums
  .map(
    (e) =>
      `CREATE TYPE ${e.name} AS ENUM (${e.values.map((v) => `'${v}'`).join(", ")});`,
  )
  .join("\n");

sql = enumSql + "\n\n" + sql;

// 9) Collapse excessive blank lines
sql = sql.replace(/\n{4,}/g, "\n\n");

// --- Write temp file ---
fs.writeFileSync(TEMP_SQL, sql, "utf-8");

// --- Run sql2dbml ---
try {
  execSync(`sql2dbml "${TEMP_SQL}" --postgres -o "${OUTPUT_PATH}"`, {
    stdio: "pipe",
    cwd: ROOT,
  });
  ui.ok(`Generated ${path.relative(ROOT, OUTPUT_PATH)}`);
} catch (err) {
  ui.fail("sql2dbml failed. Check .schema-clean.sql for debugging.");
  process.exit(1);
} finally {
  try {
    fs.unlinkSync(TEMP_SQL);
  } catch {
    /* ignore */
  }
}

// --- Optional: push to dbdocs.io (only if schema changed) ---
const dbml = fs.readFileSync(OUTPUT_PATH, "utf-8");
const currentHash = crypto.createHash("sha256").update(dbml).digest("hex");
const previousHash = fs.existsSync(HASH_PATH)
  ? fs.readFileSync(HASH_PATH, "utf-8").trim()
  : null;

if (currentHash === previousHash) {
  ui.hint("Schema unchanged — skipped dbdocs publish.");
} else {
  try {
    ui.info("Schema changed — pushing to dbdocs...");
    const result = execSync(
      `dbdocs build "${OUTPUT_PATH}" --project ${DBDOCS_PROJECT}`,
      {
        cwd: ROOT,
        encoding: "utf-8",
        timeout: 30000,
        stdio: ["pipe", "pipe", "pipe"],
      },
    );

    // Extract the URL from dbdocs output
    const urlMatch = result.match(/https:\/\/dbdocs\.io\/\S+/);
    if (urlMatch) {
      const dbdocsUrl = urlMatch[0];
      updateDocLinks(dbdocsUrl);
      ui.ok("Published schema diagram");
      ui.link(dbdocsUrl);
    }

    // Cache the hash after successful publish
    fs.writeFileSync(HASH_PATH, currentHash, "utf-8");
  } catch {
    // Not authenticated, offline, or dbdocs unavailable — skip silently
    ui.hint(
      'Skipped dbdocs publish (not authenticated). Run "dbdocs login" to enable.',
    );
  }
}

// --- Update links in documentation ---
function updateDocLinks(url) {
  const MARKER_START = "<!-- dbdocs-link:start -->";
  const MARKER_END = "<!-- dbdocs-link:end -->";
  const date = new Date().toISOString().split("T")[0];
  const replacement = `${MARKER_START}\n📊 **[View live schema diagram](${url})** — *auto-updated ${date}*\n${MARKER_END}`;

  for (const docPath of [DATABASE_DOC_PATH, README_PATH]) {
    try {
      let doc = fs.readFileSync(docPath, "utf-8");
      const markerRegex = new RegExp(
        `${escapeRegex(MARKER_START)}[\\s\\S]*?${escapeRegex(MARKER_END)}`,
      );
      if (markerRegex.test(doc)) {
        doc = doc.replace(markerRegex, replacement);
        fs.writeFileSync(docPath, doc, "utf-8");
      }
    } catch {
      /* file missing or unwritable — skip */
    }
  }
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
