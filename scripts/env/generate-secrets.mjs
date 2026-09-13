#!/usr/bin/env node
/**
 * Create BOTH environment files a developer needs — the repository-root `.env`
 * and `apps/api/.env` — each from its own `.env.example`, filling in a fresh
 * random value for every secret the example leaves empty; and, when a file
 * already exists, adding the keys it is missing without touching the ones it
 * has.
 *
 *   npm run env:init
 *
 * It is the one onboarding command. The root file is what `docker compose`
 * reads; `apps/api/.env` is what the host dev fleet (`npm run dev`) reads, and
 * it takes its datastore passwords FROM the root file rather than generating
 * new ones, because both talk to the same Postgres and Redis. That copy used to
 * be a documented manual step ("the one value you copy by hand"), which is
 * exactly the kind of step that gets skipped.
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
 * `KEY=` with nothing after it — and nothing after it may include a carriage
 * return. A `.env` saved by a Windows editor is CRLF, `.env` is untracked so
 * `.gitattributes`'s `eol=lf` never reaches it, and without the `\r?` every key
 * in such a file silently failed to match: `env:init` reported "already has
 * every key" and filled nothing (re-review finding 17). The `\r` is captured so
 * it can be put back, or the filled line would be the one LF line in a CRLF
 * file.
 */
const EMPTY_ASSIGNMENT = /^([A-Za-z_][A-Za-z0-9_]*)=(\r?)$/;

/**
 * Fill every `KEY=` line that has an empty value, leaving everything else — the
 * comments, the blank lines, the keys that already have a value — byte for byte
 * as it was.
 */
export function fillSecrets(exampleText, makeSecret = defaultSecret, { only } = {}) {
  const filled = [];
  const lines = exampleText.split('\n');

  const out = lines.map((line) => {
    // Commented-out lines (`# KEY=`) are suggestions for an override, not
    // required values, so they stay comments.
    const m = EMPTY_ASSIGNMENT.exec(line);
    if (!m || (only && !only.has(m[1]))) return line;
    filled.push(m[1]);
    return `${m[1]}=${makeSecret(m[1])}${m[2]}`;
  });

  return { text: out.join('\n'), filled };
}

/** Every `KEY=value` assignment in a .env-shaped file, as a Map. Comments ignored. */
export function parseAssignments(text) {
  const out = new Map();
  for (const line of text.split('\n')) {
    const m = /^([A-Za-z_][A-Za-z0-9_]*)=(.*?)\r?$/.exec(line);
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
 *
 * `only` narrows that to an allow-list. The root `.env` needs none — every
 * blank there is a local datastore credential this script owns both ends of —
 * but `apps/api/.env.example` also leaves `STRIPE_SECRET_KEY`,
 * `TWILIO_AUTH_TOKEN` and a dozen more blank, and those are third-party
 * credentials a developer supplies or does without. Generating random hex for
 * one turns an honest "not configured" into a configured-looking value that
 * fails at the first call.
 */
export function fillMissing(envText, exampleText, makeSecret = defaultSecret, { only } = {}) {
  const declared = parseAssignments(exampleText);
  const present = parseAssignments(envText);
  const mine = (key) => declared.has(key) && (!only || only.has(key));
  const filled = [];
  const appended = [];
  const valueFor = (key) => {
    const fromExample = declared.get(key) ?? '';
    return fromExample === '' ? makeSecret(key) : fromExample;
  };

  const lines = envText.split('\n').map((line) => {
    const m = EMPTY_ASSIGNMENT.exec(line);
    if (!m || !mine(m[1])) return line;
    filled.push(m[1]);
    return `${m[1]}=${valueFor(m[1])}${m[2]}`;
  });

  for (const key of declared.keys()) if (!present.has(key) && mine(key)) appended.push(key);

  // Whatever the file already uses. Appending LF lines to a CRLF file would
  // leave it with two kinds of ending, which some editors then normalise into a
  // diff of the whole file.
  const crlf = /\r\n/.test(envText);
  const eol = (s) => (crlf ? s.replace(/\n/g, '\r\n') : s);

  let text = lines.join('\n');
  if (appended.length) {
    if (text !== '' && !/\n$/.test(text)) text += eol('\n');
    text += eol(
      `\n# ── Added by \`npm run env:init\` ${'─'.repeat(42)}\n` +
        '# Declared in .env.example and missing here. Nothing above was changed.\n' +
        `${appended.map((k) => `${k}=${valueFor(k)}`).join('\n')}\n`,
    );
  }
  return { text, filled, appended };
}

/**
 * Write through a sibling temp file and rename over the target.
 *
 * The update path rewrites a file that is the ONLY copy of the Postgres
 * superuser password — no volume will re-issue it — so a `writeFileSync` that
 * is interrupted half way is data loss, not an inconvenience (re-review
 * finding 20). `rename` within a directory is atomic on both NTFS and POSIX:
 * a reader sees the old file or the new one, never a truncated one.
 */
function writeAtomic(file, content) {
  const tmp = `${file}.env-init.tmp`;
  fs.writeFileSync(tmp, content, { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(tmp, file);
}

export function generateEnvFile({
  examplePath = path.join(repoRoot, '.env.example'),
  envPath = path.join(repoRoot, '.env'),
  makeSecret = defaultSecret,
  only,
} = {}) {
  const example = fs.readFileSync(examplePath, 'utf8');

  if (fs.existsSync(envPath)) {
    const current = fs.readFileSync(envPath, 'utf8');
    const { text, filled, appended } = fillMissing(current, example, makeSecret, { only });
    if (!filled.length && !appended.length)
      return { created: false, updated: false, envPath, filled: [], appended: [] };
    writeAtomic(envPath, text);
    return { created: false, updated: true, envPath, filled, appended };
  }

  const { text, filled } = fillSecrets(example, makeSecret, { only });
  // wx: fail rather than clobber, in case something created .env between the
  // check above and here.
  fs.writeFileSync(envPath, text, { encoding: 'utf8', flag: 'wx' });
  return { created: true, updated: false, envPath, filled, appended: [] };
}

/**
 * The workspace keys whose value must be the SAME as one in the root `.env`,
 * and which root key that is.
 *
 * `apps/api/.env` is what the host dev fleet reads, and it talks to the very
 * Postgres and Redis that the root `.env` configured — so a generated password
 * here is not merely different, it is wrong, and the failure is a WRONGPASS at
 * the first query rather than anything that names the two files. That mismatch
 * ("this is the one value you copy by hand") was the documented onboarding step
 * for as long as there were two files.
 *
 * `DB_PASSWORD` is the only renamed one: the root file calls the platform
 * database's superuser password `POSTGRES_PASSWORD`, and apps/api calls it
 * `DB_PASSWORD`. Every `<MODULE>_DB_PASSWORD` the root example declares is
 * mirrored under its own name, so adding a ninth module needs no edit here.
 *
 * Not mirrored, deliberately: `JWT_SECRET` and `ENCRYPTION_KEY` are generated
 * fresh for the workspace. The containers do not read them from this file —
 * compose.services.yml overrides both from the root `.env` — so the host fleet
 * having its own is one fewer place the production key is written.
 */
export function mirrorMap(rootExampleText) {
  const map = { DB_PASSWORD: 'POSTGRES_PASSWORD', REDIS_PASSWORD: 'REDIS_PASSWORD' };
  for (const key of parseAssignments(rootExampleText).keys())
    if (/^[A-Z][A-Z0-9]*_DB_PASSWORD$/.test(key)) map[key] = key;
  return map;
}

/**
 * The workspace keys this script generates a value for.
 *
 * An ALLOW-LIST, not "every blank in the example", because the two files are
 * not alike. Every blank in the root `.env.example` is a local datastore
 * credential the script configures both ends of. `apps/api/.env.example` also
 * leaves `STRIPE_SECRET_KEY`, `RAZORPAY_KEY_SECRET`, `TWILIO_AUTH_TOKEN`,
 * `AWS_SECRET_ACCESS_KEY`, `SMTP_PASS` and more blank, and those come from a
 * third party or not at all. Random hex in one of them is worse than a blank:
 * it reads as configured to anything that checks, and fails at the first call.
 *
 * So exactly two are generated here — the two the platform itself owns and the
 * two the gateway refuses to start without — and the mirrored datastore
 * passwords come from the root `.env`. Everything else in that file is the
 * developer's, and is left exactly as the example leaves it.
 */
export const API_GENERATED = ['JWT_SECRET', 'ENCRYPTION_KEY'];

/**
 * `apps/api/.env`, created or topped up from `apps/api/.env.example` under the
 * same rules as the root file, narrowed to the allow-list above plus the
 * mirrored passwords.
 *
 * Run AFTER the root file, so the values it mirrors exist.
 */
export function generateApiEnvFile({ root = repoRoot, makeSecret = defaultSecret } = {}) {
  const rootEnv = fs.existsSync(path.join(root, '.env'))
    ? parseAssignments(fs.readFileSync(path.join(root, '.env'), 'utf8'))
    : new Map();
  const mirror = mirrorMap(fs.readFileSync(path.join(root, '.env.example'), 'utf8'));

  const mirrored = [];
  const maker = (key) => {
    const from = mirror[key];
    const value = from ? rootEnv.get(from) : undefined;
    if (value) {
      mirrored.push(key);
      return value;
    }
    return makeSecret(key);
  };

  const result = generateEnvFile({
    examplePath: path.join(root, 'apps/api/.env.example'),
    envPath: path.join(root, 'apps/api/.env'),
    makeSecret: maker,
    only: new Set([...API_GENERATED, ...Object.keys(mirror)]),
  });
  return { ...result, mirrored };
}

const say = (label, keys) =>
  keys?.length && console.log(`env:init: ${label} ${keys.length}: ${keys.join(', ')}`);

function report(result, { mirrored = [] } = {}) {
  if (result.created) {
    console.log(`env:init: wrote ${result.envPath}`);
    say('generated', result.filled);
  } else if (!result.updated) {
    console.log(`env:init: ${result.envPath} already has every key its example declares.`);
  } else {
    console.log(`env:init: updated ${result.envPath} — existing values were not touched.`);
    say('filled empty', result.filled);
    say('added missing', result.appended);
  }
  say('taken from the root .env', mirrored);
}

function main() {
  const run = (fn, envPath) => {
    try {
      return fn();
    } catch (err) {
      if (err.code === 'EEXIST') return { created: false, updated: false, envPath };
      console.error(`env:init: ${err.message}`);
      process.exit(1);
    }
  };

  // The root file first: apps/api mirrors its datastore passwords.
  report(run(() => generateEnvFile(), path.join(repoRoot, '.env')));
  const api = run(() => generateApiEnvFile(), path.join(repoRoot, 'apps/api/.env'));
  report(api, api);

  console.log('env:init: values are not printed.');
  console.log(
    'env:init: `npm run infra:up` next, then `npm run dev` — see docs/guides/local-setup.md.',
  );
}

// Only when run directly, so the test can import the functions above.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
