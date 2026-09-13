#!/usr/bin/env node
/**
 * Create the repository-root `.env` from `.env.example`, filling in a fresh
 * random value for every secret the example leaves empty — and, when `.env`
 * already exists, add the keys it is missing without touching the ones it has.
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
 * It never rewrites a value that is already set. Rotating a password in that
 * file is not a no-op: Postgres bakes its superuser password into the data
 * directory at first init, so a regenerated `.env` would leave a running stack
 * unable to authenticate to its own database while every volume kept the old
 * value. If you want new secrets, delete or rename `.env` deliberately and run
 * this again.
 *
 * It does fill a key that is MISSING or EMPTY, which is a different case and a
 * safe one: Compose's `${VAR:?…}` refuses to start on either, so a stack cannot
 * already be running on a value that is not there. That is what makes
 * `npm run env:init` re-runnable when the example file gains a key — as it did
 * when the container stack needed `JWT_SECRET` and `ENCRYPTION_KEY` out of the
 * root `.env` rather than out of a developer's `apps/api/.env` (IN6).
 */
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(here, '..', '..');

/**
 * Hex, always: `[0-9a-f]` needs no shell, YAML or URL escaping anywhere, and it
 * cannot accidentally spell one of the five weak patterns the gateway's
 * `JWT_SECRET` validator refuses in production (`dev`, `test`, `change`,
 * `example`, `placeholder` — every one of them contains a letter past `f`).
 *
 * 24 bytes → 48 characters by default.
 */
export function generateSecret(bytes = 24) {
  return randomBytes(bytes).toString('hex');
}

/**
 * The keys whose consumer fixes the length, so the default 24 bytes would
 * produce a value that fails validation rather than a weak one.
 *
 * `ENCRYPTION_KEY` is the AES-256-GCM key: `env.validation.ts` requires
 * `Joi.string().hex().length(64)`, which is exactly 32 bytes. A 48-character
 * value would be refused at boot with a message about hex length, which is a
 * confusing way to learn that a generator was generic.
 *
 * Deliberately the only exception to "the example file decides": it is a
 * property of the algorithm, not of the file.
 */
export const SECRET_BYTES = { ENCRYPTION_KEY: 32 };

/** The default value-maker: a secret of the right size for that particular key. */
const defaultSecret = (key) => generateSecret(SECRET_BYTES[key] ?? 24);

/**
 * Fill every `KEY=` line that has an empty value, leaving everything else — the
 * comments, the blank lines, the keys that already have a value — byte for byte
 * as it was.
 */
export function fillSecrets(exampleText, makeSecret = defaultSecret) {
  const filled = [];
  const lines = exampleText.split('\n');

  const out = lines.map((line) => {
    // `KEY=` with nothing after it. Commented-out lines (`# KEY=`) are
    // suggestions for an override, not required values, so they stay comments.
    const m = /^([A-Za-z_][A-Za-z0-9_]*)=$/.exec(line);
    if (!m) return line;
    filled.push(m[1]);
    return `${m[1]}=${makeSecret(m[1])}`;
  });

  return { text: out.join('\n'), filled };
}

/** Every `KEY=value` assignment in a .env-shaped file, as a Map. Comments ignored. */
export function parseAssignments(text) {
  const out = new Map();
  for (const line of text.split('\n')) {
    const m = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line);
    if (m) out.set(m[1], m[2]);
  }
  return out;
}

/**
 * Bring an existing `.env` up to date with `.env.example`, and nothing more.
 *
 * Two kinds of gap, both safe to close because Compose's `${VAR:?…}` refuses to
 * start on either, so nothing can be running on the absent value:
 *
 *   filled    — the key is there with an EMPTY value; the line is filled in place
 *   appended  — the key is not there at all; it is added in a labelled block
 *
 * A key that already has a value is never touched, and neither is a key the
 * example does not declare. The example's own value is used when it has one
 * (`POSTGRES_USER=postgres`); a fresh secret when it is blank.
 */
export function fillMissing(envText, exampleText, makeSecret = defaultSecret) {
  const declared = parseAssignments(exampleText);
  const present = parseAssignments(envText);
  const filled = [];
  const appended = [];
  const valueFor = (key) => {
    const fromExample = declared.get(key) ?? '';
    return fromExample === '' ? makeSecret(key) : fromExample;
  };

  const lines = envText.split('\n').map((line) => {
    const m = /^([A-Za-z_][A-Za-z0-9_]*)=$/.exec(line);
    if (!m || !declared.has(m[1])) return line;
    filled.push(m[1]);
    return `${m[1]}=${valueFor(m[1])}`;
  });

  for (const key of declared.keys()) if (!present.has(key)) appended.push(key);

  let text = lines.join('\n');
  if (appended.length) {
    if (text !== '' && !text.endsWith('\n')) text += '\n';
    text +=
      `\n# ── Added by \`npm run env:init\` ${'─'.repeat(42)}\n` +
      '# Declared in .env.example and missing here. Nothing above was changed.\n' +
      `${appended.map((k) => `${k}=${valueFor(k)}`).join('\n')}\n`;
  }
  return { text, filled, appended };
}

export function generateEnvFile({
  examplePath = path.join(repoRoot, '.env.example'),
  envPath = path.join(repoRoot, '.env'),
  makeSecret = defaultSecret,
} = {}) {
  const example = fs.readFileSync(examplePath, 'utf8');

  if (fs.existsSync(envPath)) {
    const current = fs.readFileSync(envPath, 'utf8');
    const { text, filled, appended } = fillMissing(current, example, makeSecret);
    if (!filled.length && !appended.length)
      return { created: false, updated: false, envPath, filled: [], appended: [] };
    fs.writeFileSync(envPath, text, 'utf8');
    return { created: false, updated: true, envPath, filled, appended };
  }

  const { text, filled } = fillSecrets(example, makeSecret);
  // wx: fail rather than clobber, in case something created .env between the
  // check above and here.
  fs.writeFileSync(envPath, text, { encoding: 'utf8', flag: 'wx' });
  return { created: true, updated: false, envPath, filled, appended: [] };
}

function main() {
  let result;
  try {
    result = generateEnvFile();
  } catch (err) {
    if (err.code === 'EEXIST') {
      result = { created: false, updated: false, envPath: path.join(repoRoot, '.env') };
    } else {
      console.error(`env:init: ${err.message}`);
      process.exit(1);
    }
  }

  if (!result.created) {
    if (!result.updated) {
      console.log(`env:init: ${result.envPath} already has every key .env.example declares.`);
      console.log('env:init: nothing changed. Delete or rename it if you want new secrets.');
      return;
    }
    const say = (label, keys) =>
      keys.length && console.log(`env:init: ${label} ${keys.length}: ${keys.join(', ')}`);
    console.log(`env:init: updated ${result.envPath} — existing values were not touched.`);
    say('filled empty', result.filled);
    say('added missing', result.appended);
    console.log('env:init: values are not printed.');
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
