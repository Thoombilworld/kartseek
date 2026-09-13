import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { fillSecrets, generateEnvFile, generateSecret, repoRoot } from './generate-secrets.mjs';

function tmpdir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'kartseek-env-'));
}

test('an existing .env is never overwritten', () => {
  const dir = tmpdir();
  const examplePath = path.join(dir, '.env.example');
  const envPath = path.join(dir, '.env');
  fs.writeFileSync(examplePath, 'POSTGRES_PASSWORD=\n');

  const mine = 'POSTGRES_PASSWORD=the-one-the-running-stack-already-uses\n';
  fs.writeFileSync(envPath, mine);

  const result = generateEnvFile({ examplePath, envPath });

  assert.equal(result.created, false);
  assert.equal(result.reason, 'exists');
  assert.equal(fs.readFileSync(envPath, 'utf8'), mine, '.env was modified');
});

test('an existing but EMPTY .env is still not overwritten', () => {
  // Postgres bakes its password into the data directory at first init, so
  // silently regenerating is worse than refusing even when the file looks
  // disposable.
  const dir = tmpdir();
  const examplePath = path.join(dir, '.env.example');
  const envPath = path.join(dir, '.env');
  fs.writeFileSync(examplePath, 'POSTGRES_PASSWORD=\n');
  fs.writeFileSync(envPath, '');

  assert.equal(generateEnvFile({ examplePath, envPath }).created, false);
  assert.equal(fs.readFileSync(envPath, 'utf8'), '');
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

test('generateSecret returns 48 shell-safe hex characters', () => {
  const s = generateSecret();
  assert.match(s, /^[0-9a-f]{48}$/);
  assert.notEqual(s, generateSecret());
});
