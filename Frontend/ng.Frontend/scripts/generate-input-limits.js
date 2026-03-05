#!/usr/bin/env node
/**
 * generate-input-limits.js
 *
 * Reads the OpenAPI spec (models.json) and extracts every `maxLength`
 * constraint from the component schemas. Outputs a TypeScript constants
 * file that the frontend imports — fully auto-generated, never hand-edited.
 *
 * Run via:  node scripts/generate-input-limits.js
 * Hooked into the api:sync pipeline so it runs automatically.
 */

const fs = require('fs');
const path = require('path');

// ── Paths ──────────────────────────────────────────────────
const OPENAPI_PATH = path.resolve(__dirname, '..', 'openapi', 'models.json');
const OUTPUT_PATH = path.resolve(
  __dirname,
  '..',
  'src',
  'app',
  'shared',
  'constants',
  'input-limits.ts',
);

// ── Read OpenAPI spec ──────────────────────────────────────
if (!fs.existsSync(OPENAPI_PATH)) {
  console.error(`✖  OpenAPI spec not found at ${OPENAPI_PATH}`);
  process.exit(1);
}

const spec = JSON.parse(fs.readFileSync(OPENAPI_PATH, 'utf8'));
const schemas = spec.components?.schemas ?? {};

// ── Extract maxLength per schema → property ────────────────
// Result: { SchemaName: { propertyName: maxLength, ... }, ... }
const limits = {};

for (const [schemaName, schema] of Object.entries(schemas)) {
  const props = schema.properties;
  if (!props) continue;

  for (const [propName, propDef] of Object.entries(props)) {
    if (typeof propDef.maxLength === 'number') {
      limits[schemaName] ??= {};
      limits[schemaName][propName] = propDef.maxLength;
    }
  }
}

if (Object.keys(limits).length === 0) {
  console.warn('⚠  No maxLength constraints found in the OpenAPI spec.');
  console.warn('   Make sure DTOs have [MaxLength] attributes and the spec is up to date.');
}

// ── Generate TypeScript ────────────────────────────────────
const lines = [
  '/**',
  ' * Auto-generated from the OpenAPI spec — DO NOT EDIT manually.',
  ' *',
  ' * Source of truth: [MaxLength] attributes on C# DTOs →',
  ' *   Backend/app/Core/Models/DTO/*.cs',
  ' *',
  ' * Re-generate: npm run refresh:models  (or npm run api:sync)',
  ' */',
  '',
  'export const INPUT_LIMITS = {',
];

for (const [schemaName, props] of Object.entries(limits).sort(([a], [b]) => a.localeCompare(b))) {
  const entries = Object.entries(props)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');
  lines.push(`  ${schemaName}: { ${entries} },`);
}

lines.push('} as const;');
lines.push('');

// ── Convenience type for consumers ─────────────────────────
lines.push('/** Helper: extract the limits object for a given DTO name. */');
lines.push(
  'export type LimitsFor<T extends keyof typeof INPUT_LIMITS> = (typeof INPUT_LIMITS)[T];',
);
lines.push('');

const content = lines.join('\n');

// ── Write file ─────────────────────────────────────────────
const outputDir = path.dirname(OUTPUT_PATH);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(OUTPUT_PATH, content, 'utf8');

const count = Object.values(limits).reduce((sum, obj) => sum + Object.keys(obj).length, 0);
console.log(
  `  ✔  input-limits.ts generated — ${Object.keys(limits).length} schemas, ${count} constraints`,
);
