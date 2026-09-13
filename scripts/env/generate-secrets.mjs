#!/usr/bin/env node
/**
 * Create the repository-root `.env` from `.env.example`, filling in a fresh
 * random value for every secret the example leaves empty.
 *
 *   npm run env:init
 *
 * ── Why this exists ──────────────────────────────────────────────────────────
 *
 * `.env.example` used to ship a literal placeholder password for
 * `POSTGRES_PASSWORD` and thirteen more like it, and `docs/guides/local-setup.md`
 * said `cp .env.example .env`. Compose's `${VAR:?…}` only refuses a variable that
 * is unset or EMPTY — never a placeholder — so the documented first run brought
 * the whole stack up on a password anyone reading the repository already knew
 * (AUD2-022). Making those values empty is what turns `:?` into a real gate —
 * and then someone has to fill them in, or nothing starts at all. This is that
 * someone.
 *
 * ── What counts as a secret ──────────────────────────────────────────────────
 *
 * Any `KEY=` line in `.env.example` with an EMPTY value. That is the whole
 * rule: the example file decides, by leaving a value blank, and this script
 * never has to carry a list of key names that could drift from it. Lines that
 * already have a value (`POSTGRES_USER=postgres`, `NGINX_BIND=127.0.0.1`) are
 * copied through untouched, and so is every comment and blank line — the output
 * is the example file with blanks filled, not a generated summary of it.
 *
 * ── What it will not do ──────────────────────────────────────────────────────
 *
 * It never overwrites an existing `.env`. Rotating a password in that file is
 * not a no-op: Postgres bakes its superuser password into the data directory at
 * first init, so a regenerated `.env` would leave a running stack unable to
 * authenticate to its own database while every volume kept the old value. If
 * you want new secrets, delete or rename `.env` deliberately and run this again.
 */
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(here, '..', '..');

/** 24 bytes as hex: 48 characters from `[0-9a-f]`, so no shell, YAML or URL escaping anywhere. */
export function generateSecret() {
  return randomBytes(24).toString('hex');
}

/**
 * Fill every `KEY=` line that has an empty value, leaving everything else — the
 * comments, the blank lines, the keys that already have a value — byte for byte
 * as it was.
 */
export function fillSecrets(exampleText, makeSecret = generateSecret) {
  const filled = [];
  const lines = exampleText.split('\n');

  const out = lines.map((line) => {
    // `KEY=` with nothing after it. Commented-out lines (`# KEY=`) are
    // suggestions for an override, not required values, so they stay comments.
    const m = /^([A-Za-z_][A-Za-z0-9_]*)=$/.exec(line);
    if (!m) return line;
    filled.push(m[1]);
    return `${m[1]}=${makeSecret()}`;
  });

  return { text: out.join('\n'), filled };
}

export function generateEnvFile({
  examplePath = path.join(repoRoot, '.env.example'),
  envPath = path.join(repoRoot, '.env'),
  makeSecret = generateSecret,
} = {}) {
  if (fs.existsSync(envPath)) {
    return { created: false, reason: 'exists', envPath, filled: [] };
  }
  const { text, filled } = fillSecrets(fs.readFileSync(examplePath, 'utf8'), makeSecret);
  // wx: fail rather than clobber, in case something created .env between the
  // check above and here.
  fs.writeFileSync(envPath, text, { encoding: 'utf8', flag: 'wx' });
  return { created: true, envPath, filled };
}

function main() {
  let result;
  try {
    result = generateEnvFile();
  } catch (err) {
    if (err.code === 'EEXIST') {
      result = { created: false, reason: 'exists', envPath: path.join(repoRoot, '.env') };
    } else {
      console.error(`env:init: ${err.message}`);
      process.exit(1);
    }
  }

  if (!result.created) {
    console.log(`env:init: ${result.envPath} already exists — left untouched.`);
    console.log('env:init: delete or rename it first if you really want new secrets.');
    return;
  }

  console.log(`env:init: wrote ${result.envPath}`);
  console.log(`env:init: generated ${result.filled.length} secrets: ${result.filled.join(', ')}`);
  console.log(
    'env:init: values are not printed. Nothing else needs editing to run `npm run infra:up`.',
  );
  console.log(
    'env:init: apps/api/.env must carry the SAME DB_PASSWORD — see docs/guides/local-setup.md.',
  );
}

// Only when run directly, so the test can import the functions above.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
