/**
 * The database password for a maintenance, seed or verification script — or a
 * refusal (AUD2-074).
 *
 * Nineteen scripts in this tree closed the line with
 * `process.env.DB_PASSWORD || '<the real development password>'`. That literal
 * was the only copy of the credential in the repository, which is what defeated
 * the `.env` gitignore, and it made every one of these scripts silently
 * connectable: run one against a staging shell with the variable unset and it
 * did not fail, it connected somewhere.
 *
 * There is no built-in default now. A script reads the environment or stops.
 *
 * Because most of these scripts never loaded a `.env` of their own — the
 * literal is what made them work from a bare shell — this module loads
 * `apps/api/.env` on first use. dotenv does not overwrite a variable that is
 * already set, so an explicit `DB_PASSWORD=… npm run …` still wins, and a
 * missing file is not an error: it simply leaves the refusal below to fire.
 *
 * Plain CommonJS, and deliberately a `.js`: it is required both by the `.ts`
 * scripts (run through ts-node in CommonJS mode) and by the plain-node
 * `maintenance/marketplace-catalog/*.js` ones, and a `.ts` helper would be
 * unreachable from the second group.
 */
const path = require('node:path');

/** `apps/api/.env` — this file is `apps/api/scripts/lib/db-password.js`. */
const API_ENV = path.resolve(__dirname, '..', '..', '.env');

let loaded = false;
function loadApiEnvOnce() {
  if (loaded) return;
  loaded = true;
  try {
    require('dotenv').config({ path: API_ENV, quiet: true });
  } catch {
    // dotenv unresolvable (a script run outside the workspace): the environment
    // is whatever the shell provides, and the refusal below still applies.
  }
}

/**
 * @param {...string} preferred  Module-specific variables to try first, e.g.
 *                               'GROCERY_DB_PASSWORD'. `DB_PASSWORD` and
 *                               `DB_PASS` are always tried after them.
 * @returns {string}
 */
function requireDbPassword(...preferred) {
  loadApiEnvOnce();
  const keys = [...preferred, 'DB_PASSWORD', 'DB_PASS'];
  for (const key of keys) {
    const value = process.env[key];
    if (value) return value;
  }
  throw new Error(
    `${keys.join(' or ')} is not set. This script reads the database password from ` +
      `the environment — copy apps/api/.env.example to apps/api/.env and set DB_PASSWORD, ` +
      `or export it for this run. There is no built-in default.`,
  );
}

module.exports = { requireDbPassword };
