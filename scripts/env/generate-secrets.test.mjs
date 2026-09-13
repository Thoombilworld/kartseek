import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  fillMissing,
  fillSecrets,
  generateEnvFile,
  generateSecret,
  parseAssignments,
  repoRoot,
  SECRET_BYTES,
} from './generate-secrets.mjs';

function tmpdir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kartseek-env-'));
}

test('a value that is already set is never rewritten', () => {
  // Postgres bakes its superuser password into the data directory at first
  // init, so regenerating one that a running stack is using would leave the
  // service unable to authenticate to its own database.
  const dir = tmpdir();
  const examplePath = path.join(dir, '.env.example');
  const envPath = path.join(dir, '.env');
  fs.writeFileSync(examplePath, 'POSTGRES_PASSWORD=\n');

  const mine = 'POSTGRES_PASSWORD=the-one-the-running-stack-already-uses\n';
  fs.writeFileSync(envPath, mine);

  const result = generateEnvFile({ examplePath, envPath });

  assert.equal(result.created, false);
  assert.equal(result.updated, false, 'nothing was missing, so nothing was written');
  assert.deepEqual(result.filled, []);
  assert.deepEqual(result.appended, []);
  assert.equal(fs.readFileSync(envPath, 'utf8'), mine, '.env was modified');
});

test('a key the example gained is added, and the rest of the file is left alone', () => {
  const dir = tmpdir();
  const examplePath = path.join(dir, '.env.example');
  const envPath = path.join(dir, '.env');
  fs.writeFileSync(examplePath, '# Header\nPOSTGRES_PASSWORD=\nJWT_SECRET=\nAPP_BIND=127.0.0.1\n');

  const mine = '# my own note\nPOSTGRES_PASSWORD=already-set\nSOMETHING_OF_MINE=keep\n';
  fs.writeFileSync(envPath, mine);

  const result = generateEnvFile({ examplePath, envPath });

  assert.equal(result.updated, true);
  assert.deepEqual(result.filled, [], 'nothing was present-but-empty');
  assert.deepEqual(result.appended, ['JWT_SECRET', 'APP_BIND']);

  const after = fs.readFileSync(envPath, 'utf8');
  assert.ok(after.startsWith(mine), 'the original content is still there, byte for byte');
  assert.match(after, /^JWT_SECRET=[0-9a-f]{48}$/m, 'a blank example key becomes a secret');
  assert.match(
    after,
    /^APP_BIND=127\.0\.0\.1$/m,
    "an example key with a value keeps the example's",
  );
  assert.match(after, /^SOMETHING_OF_MINE=keep$/m, 'a key the example does not declare survives');
});

test('a key that is present but EMPTY is filled in place', () => {
  // Safe precisely because Compose's `${VAR:?…}` refuses to start on an empty
  // value: nothing can be running on the secret that is not there.
  const { text, filled, appended } = fillMissing(
    'A=keep\nENCRYPTION_KEY=\nB=also-keep\n',
    'A=\nENCRYPTION_KEY=\nB=\n',
  );
  assert.deepEqual(filled, ['ENCRYPTION_KEY']);
  assert.deepEqual(appended, []);
  assert.match(text, /^A=keep$/m);
  assert.match(text, /^B=also-keep$/m);
  assert.ok(!/Added by/.test(text), 'an in-place fill needs no appended block');
  // 32 bytes, not the default 24: AES-256-GCM, and Joi requires hex length 64.
  assert.match(text, /^ENCRYPTION_KEY=[0-9a-f]{64}$/m);
});

test('an empty .env gets every declared key', () => {
  const dir = tmpdir();
  const examplePath = path.join(dir, '.env.example');
  const envPath = path.join(dir, '.env');
  fs.writeFileSync(examplePath, 'POSTGRES_PASSWORD=\n');
  fs.writeFileSync(envPath, '');

  const result = generateEnvFile({ examplePath, envPath });
  assert.equal(result.created, false, 'the file existed, so this is the update path');
  assert.deepEqual(result.appended, ['POSTGRES_PASSWORD']);
  assert.match(fs.readFileSync(envPath, 'utf8'), /^POSTGRES_PASSWORD=[0-9a-f]{48}$/m);
});

test('parseAssignments reads keys and ignores comments', () => {
  const m = parseAssignments('# A=commented\nA=1\nB=\n\nnot a line\nC=x=y\n');
  assert.deepEqual(
    [...m.entries()],
    [
      ['A', '1'],
      ['B', ''],
      ['C', 'x=y'],
    ],
  );
});

test('every emptied key gets a distinct value, and nothing else changes', () => {
  const example = [
    '# A comment',
    'POSTGRES_USER=postgres',
    'POSTGRES_PASSWORD=',
    '',
    '# REDIS_PASSWORD= is a commented suggestion, not a required value',
    'REDIS_PASSWORD=',
    'NGINX_BIND=127.0.0.1',
    '',
  ].join('\n');

  const { text, filled } = fillSecrets(example);

  assert.deepEqual(filled, ['POSTGRES_PASSWORD', 'REDIS_PASSWORD']);

  const lines = text.split('\n');
  assert.equal(lines[0], '# A comment');
  assert.equal(lines[1], 'POSTGRES_USER=postgres', 'a key with a value was rewritten');
  assert.equal(lines[3], '', 'a blank line was lost');
  assert.equal(
    lines[4],
    '# REDIS_PASSWORD= is a commented suggestion, not a required value',
    'a commented-out key was filled in',
  );
  assert.equal(lines[6], 'NGINX_BIND=127.0.0.1');

  const values = filled.map((k) => new RegExp(`^${k}=(.+)$`, 'm').exec(text)[1]);
  for (const v of values) assert.match(v, /^[0-9a-f]{48}$/);
  assert.equal(new Set(values).size, values.length, 'the same secret was reused');
});

test('no empty assignment survives the fill', () => {
  const { text } = fillSecrets(['A=', 'B=', 'C=keep'].join('\n'));
  assert.equal(/^[A-Za-z_][A-Za-z0-9_]*=$/m.test(text), false);
});

test('the real .env.example leaves every secret empty, and all of them get filled', () => {
  // The two halves of AUD2-022 in one assertion: the tracked example carries no
  // usable password, and `npm run env:init` still produces a file that starts
  // the stack. If someone puts a literal back into .env.example, the first half
  // fails here.
  const examplePath = path.join(repoRoot, '.env.example');
  const example = fs.readFileSync(examplePath, 'utf8');

  // Any key that names itself a secret must have NO value. Written as a shape
  // rather than a match on one placeholder string, so the next well-meant
  // `POSTGRES_PASSWORD=dev-only-really` fails here too.
  const withValues = example
    .split('\n')
    .map((l) => /^([A-Za-z_][A-Za-z0-9_]*(?:PASSWORD|SECRET|TOKEN|_KEY))=(.+)$/.exec(l))
    .filter(Boolean)
    .map((m) => m[1]);

  assert.deepEqual(
    withValues,
    [],
    `.env.example ships a value for: ${withValues.join(', ')} — secrets must be empty`,
  );

  const { text, filled } = fillSecrets(example);
  assert.ok(filled.length >= 14, `expected at least 14 secrets, filled ${filled.length}`);
  for (const key of ['POSTGRES_PASSWORD', 'REDIS_PASSWORD', 'ELASTIC_PASSWORD']) {
    assert.ok(filled.includes(key), `${key} was not among the filled secrets`);
  }
  assert.equal(/^[A-Za-z_][A-Za-z0-9_]*=$/m.test(text), false, 'a secret was left empty');
});

test('generateSecret returns 48 shell-safe hex characters, or the size asked for', () => {
  const s = generateSecret();
  assert.match(s, /^[0-9a-f]{48}$/);
  assert.notEqual(s, generateSecret());
  assert.match(generateSecret(SECRET_BYTES.ENCRYPTION_KEY), /^[0-9a-f]{64}$/);
});

test('a hex secret can never spell one of the gateway’s weak patterns', () => {
  // env.validation.ts refuses a production JWT_SECRET containing dev, test,
  // change, example or placeholder. Every one of those needs a letter past `f`,
  // so hex is structurally safe — this asserts the property rather than
  // trusting it.
  for (const pattern of ['dev', 'test', 'change', 'example', 'placeholder'])
    assert.ok(/[g-z]/.test(pattern), `${pattern} is spellable in hex`);
  const { text } = fillSecrets('JWT_SECRET=\n');
  const value = /^JWT_SECRET=(.+)$/m.exec(text)[1];
  assert.match(value, /^[0-9a-f]{48}$/);
});

test('the real .env.example carries the two secrets the container stack needs', () => {
  // Without these the generated compose file's `${JWT_SECRET:?…}` refuses to
  // start, and with a value copied from apps/api/.env the gateway throws at
  // boot instead (review C1).
  const example = fs.readFileSync(path.join(repoRoot, '.env.example'), 'utf8');
  const keys = parseAssignments(example);
  for (const key of ['JWT_SECRET', 'ENCRYPTION_KEY'])
    assert.equal(keys.get(key), '', `${key} must be declared and EMPTY in .env.example`);
  const { text } = fillSecrets(example);
  assert.match(text, /^ENCRYPTION_KEY=[0-9a-f]{64}$/m, 'AES-256-GCM needs exactly 32 bytes');
});
