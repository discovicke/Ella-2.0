/**
 * Shared console UI primitives for all ELLA CLI scripts.
 *
 * Usage:
 *   const ui = require('./lib/ella-ui');
 *   ui.header('npm start');
 *   ui.section('Docker');
 *   ui.ok('Container running');
 *   ui.info('Building frontend...');
 *   ui.warn('Cache stale');
 *   ui.fail('Connection refused');
 *   ui.hint('Run npm run setup first');
 *   ui.detail('Provider: Postgres');
 *   ui.link('https://dbdocs.io/...');
 *   ui.done('Setup complete!');
 *   ui.footer();
 */

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  white: "\x1b[37m",
};

const BRAND = `${c.cyan}${c.bold}ELLA${c.reset}`;
const LINE = "─".repeat(48);
const DIV = `  ${c.dim}${LINE}${c.reset}`;

// ── Public API ──────────────────────────────────────────────

/** Print the top banner for a pipeline phase. */
function header(phase) {
  console.log("");
  console.log(`  ${c.dim}${LINE}${c.reset}`);
  console.log(`  ${BRAND}  ${c.dim}${phase}${c.reset}`);
  console.log(`  ${c.dim}${LINE}${c.reset}`);
}

/** Section heading inside a phase. */
function section(title) {
  console.log("");
  console.log(`  ${c.bold}${title}${c.reset}`);
  console.log(DIV);
}

/** Success line. */
function ok(msg) {
  console.log(`  ${c.green}✔${c.reset}  ${msg}`);
}

/** Informational action line (something in progress). */
function info(msg) {
  console.log(`  ${c.cyan}◆${c.reset}  ${msg}`);
}

/** Warning line (non-fatal). */
function warn(msg) {
  console.log(`  ${c.yellow}▲${c.reset}  ${msg}`);
}

/** Error/failure line. */
function fail(msg) {
  console.error(`  ${c.red}✖${c.reset}  ${msg}`);
}

/** Sub-detail (indented, dimmed). */
function hint(msg) {
  console.log(`     ${c.dim}${msg}${c.reset}`);
}

/** Sub-detail with arrow (for key:value info). */
function detail(msg) {
  console.log(`     ${c.dim}▸${c.reset} ${c.dim}${msg}${c.reset}`);
}

/** Highlighted link line. */
function link(url) {
  console.log(`     ${c.cyan}→${c.reset} ${c.cyan}${url}${c.reset}`);
}

/** Completion message (bold green). */
function done(msg) {
  console.log("");
  console.log(DIV);
  console.log(`  ${c.green}${c.bold}${msg}${c.reset}`);
  console.log(DIV);
}

/** Simple blank + divider footer. */
function footer() {
  console.log("");
}

/** Prompt label (for questions). */
function prompt(msg) {
  return `  ${c.yellow}?${c.reset}  ${msg}`;
}

/** Menu item for numbered lists. */
function menuItem(n, label) {
  console.log(`     ${c.bold}${n}${c.reset}  ${label}`);
}

module.exports = {
  c,
  header,
  section,
  ok,
  info,
  warn,
  fail,
  hint,
  detail,
  link,
  done,
  footer,
  prompt,
  menuItem,
  DIV,
  LINE,
};
