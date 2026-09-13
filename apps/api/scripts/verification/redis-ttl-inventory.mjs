#!/usr/bin/env node
/**
 * Every Redis key this platform writes without an expiry.
 *
 *   node apps/api/scripts/verification/redis-ttl-inventory.mjs            # table
 *   node apps/api/scripts/verification/redis-ttl-inventory.mjs --json     # machine-readable
 *   node apps/api/scripts/verification/redis-ttl-inventory.mjs --all      # TTL'd writes too
 *
 * AUD2-031 / dispatch addendum item 11. `redis` runs `--maxmemory-policy
 * volatile-lru`, which evicts ONLY keys that carry a TTL. So a key written
 * without one is protected from eviction — correct for a record — and is also
 * what fills `--maxmemory` toward the OOM that `infra/docker/README.md`
 * documents. Knowing which keys those are is the whole point.
 *
 * ── Why this is a script and not a grep ────────────────────────────────────
 *
 * The first inventory was taken by hand with a regex that asked "was a third
 * argument passed?", and it was wrong by a factor of four (review I1). Three
 * things defeat that question:
 *
 *   1. `RedisService.set` (libs/redis/src/redis.service.ts:174) is
 *      `if (ttlSeconds) setex(...) else set(...)`, so `setJson(key, value, 0)`
 *      passes a third argument and writes a key with NO EXPIRY. That idiom is
 *      used deliberately — `admin-marketplace.controller.ts` even comments it
 *      "No TTL — persistent config" — and 23 writes use it.
 *   2. Most write methods on `RedisService` take no TTL parameter AT ALL
 *      (`hset`, `sadd`, `zadd`, `rpush`, `incr`, …). Every key they create is
 *      permanent unless someone calls `expire()` on it separately, which is a
 *      different statement and often a different line.
 *   3. A TTL passed as a variable or an expression can be anything, including
 *      zero, so it cannot be classified by reading the call alone.
 *
 * So the rule here is the ruling's: **a write is TTL-less when the ttl argument
 * is absent, or is literally falsy, or the method has no ttl parameter and no
 * `expire()` for the same key appears in the same file.**
 *
 * Case 3 is reported separately as `dynamic` rather than guessed at.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..', '..');

const ROOTS = [
  path.join(REPO, 'apps', 'api', 'apps'),
  path.join(REPO, 'apps', 'api', 'libs'),
  path.join(REPO, 'modules'),
];

/**
 * Every method on `RedisService` that can create or extend a key, and whether
 * it accepts a TTL. Read off the class; keep in step with it.
 *
 * `setSession` is omitted deliberately: its signature is `(id, data, ttl =
 * 86400)`, so it cannot write without one.
 */
const TTL_METHODS = new Set(['set', 'setJson', 'setJSON']);
const NO_TTL_METHODS = new Set([
  'hset',
  'hmset',
  'sadd',
  'lpush',
  'rpush',
  'zadd',
  'zincrby',
  'incr',
  'incrBy',
  'decr',
  'geoadd',
]);
const WRITE_METHODS = new Set([...TTL_METHODS, ...NO_TTL_METHODS]);

/** A receiver that is plausibly a RedisService. */
const RECEIVER = /(redis|redisService|cache|cacheManager|client)\s*!?\??\.$/i;

const BACKSLASH = String.fromCharCode(92);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', 'dist', '.next', 'build', 'coverage'].includes(entry.name)) continue;
      walk(full, out);
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) {
      out.push(full);
    }
  }
  return out;
}

/** Split a call's argument list at top level, respecting strings and nesting. */
function splitArgs(src, openIndex) {
  const args = [];
  let depth = 1;
  let inStr = null;
  let prev = '';
  let start = openIndex + 1;
  let i = start;
  for (; i < src.length; i++) {
    const c = src[i];
    if (inStr) {
      if (c === inStr && prev !== BACKSLASH) inStr = null;
    } else if (c === '"' || c === "'" || c === '`') {
      inStr = c;
    } else if ('([{'.includes(c)) {
      depth++;
    } else if (')]}'.includes(c)) {
      depth--;
      if (depth === 0) {
        args.push(src.slice(start, i));
        break;
      }
    } else if (c === ',' && depth === 1) {
      args.push(src.slice(start, i));
      start = i + 1;
    }
    prev = c;
  }
  return { args: args.map((a) => a.trim()).filter((a) => a.length > 0), end: i };
}

/**
 * Comments stripped before scanning.
 *
 * Several files EXPLAIN a former Redis write in prose — `order.service.ts:118`
 * records that orders used to live in `redis.setJson(..., 86400)` — and a
 * scanner that counts those is reporting the repository's history as its
 * current state. The first inventory did exactly that.
 */
const stripComments = (src) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/.*$/gm, (m, p1) => p1 + ' '.repeat(m.length - p1.length));

/** `'admin:settings'` / `` `user:${id}` `` → a readable key shape. */
function keyShape(expr, consts) {
  if (!expr) return '(unknown)';
  const trimmed = expr.trim();
  const quoted = /^(['"`])([\s\S]*)\1$/.exec(trimmed);
  if (quoted) return quoted[2].replace(/\$\{[^}]*\}/g, '<var>');
  // A key held in a local or a module constant — resolve it where the file
  // declares it, so the table names the KEY rather than the variable.
  if (consts && /^[A-Za-z_$][\w$]*$/.test(trimmed) && consts.has(trimmed)) {
    return consts.get(trimmed);
  }
  return trimmed.replace(/\s+/g, ' ').slice(0, 60);
}

/** `const FOO = 'bar:baz'` / `` const k = `a:${b}` `` declared in this file. */
function constKeys(src) {
  const out = new Map();
  for (const m of src.matchAll(
    /(?:const|let)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*(`[^`]*`|'[^']*'|"[^"]*")/g,
  )) {
    out.set(m[1], keyShape(m[2]));
  }
  return out;
}

/**
 * Is the ttl argument definitely absent or falsy?
 *
 * `undefined`, `0`, `null`, `''` and `false` all reach
 * `if (ttlSeconds)` as false and write a key with no expiry.
 */
function ttlVerdict(method, args) {
  if (!TTL_METHODS.has(method)) return 'method-has-no-ttl';
  const ttl = args[2];
  if (ttl === undefined) return 'absent';
  if (/^(0|null|undefined|false|''|""|``)$/.test(ttl)) return 'falsy';
  if (/^\d+$/.test(ttl) || /^\d[\d_]*\s*\*/.test(ttl)) return 'has-ttl';
  return 'dynamic';
}

const findings = [];
const withTtl = [];
const dynamic = [];

/** The implementation of `RedisService` itself — it calls ioredis, not itself. */
const SELF = path.join(REPO, 'apps', 'api', 'libs', 'redis', 'src', 'redis.service.ts');

for (const root of ROOTS) {
  for (const file of walk(root)) {
    if (path.resolve(file) === SELF) continue;
    const src = stripComments(fs.readFileSync(file, 'utf8'));
    const consts = constKeys(src);
    // Which keys does this file give an explicit expiry to afterwards? A
    // `incr` followed by `expire` is a TTL'd key written in two statements,
    // and counting it as permanent would be the mirror of the bug this script
    // exists to fix.
    const expired = new Set(
      [...src.matchAll(/\.expire\(\s*(`[^`]*`|'[^']*'|"[^"]*"|[A-Za-z_$][\w$]*)/g)].map((m) =>
        keyShape(m[1], consts),
      ),
    );

    const call = /\.([A-Za-z]+)\(/g;
    let m;
    while ((m = call.exec(src))) {
      const method = m[1];
      if (!WRITE_METHODS.has(method)) continue;
      const before = src.slice(Math.max(0, m.index - 40), m.index + 1);
      if (!RECEIVER.test(before)) continue;

      const { args } = splitArgs(src, m.index + m[0].length - 1);
      const verdict = ttlVerdict(method, args);
      const rel = path.relative(REPO, file).replace(/\\/g, '/');
      const line = src.slice(0, m.index).split('\n').length;
      const key = keyShape(args[0], consts);
      const row = { rel, line, method, key, verdict, ttl: args[2] ?? '' };

      if (verdict === 'has-ttl') {
        withTtl.push(row);
      } else if (verdict === 'dynamic') {
        dynamic.push(row);
      } else if (verdict === 'method-has-no-ttl') {
        // Permanent unless this file also expires the same key.
        if (expired.has(key)) withTtl.push({ ...row, verdict: 'expired-separately' });
        else findings.push(row);
      } else {
        findings.push(row);
      }
    }
  }
}

const byKey = new Map();
for (const f of findings) {
  const list = byKey.get(f.key) ?? [];
  list.push(f);
  byKey.set(f.key, list);
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ findings, withTtl, dynamic }, null, 2));
  process.exit(0);
}

const total = findings.length + withTtl.length + dynamic.length;
console.log(`Redis write calls examined: ${total}`);
console.log(`  with a TTL (literal, or expired separately): ${withTtl.length}`);
console.log(`  TTL from a variable or expression (unclassifiable here): ${dynamic.length}`);
console.log(`  WITHOUT a TTL: ${findings.length}  across ${byKey.size} key shapes`);
console.log('');

const pad = (s, n) => String(s).padEnd(n);
console.log(`${pad('key', 42)}${pad('writes', 8)}where`);
console.log('-'.repeat(110));
for (const [key, rows] of [...byKey.entries()].sort()) {
  const where = [...new Set(rows.map((r) => `${r.rel}:${r.line}`))];
  console.log(`${pad(key, 42)}${pad(rows.length, 8)}${where[0]}`);
  for (const w of where.slice(1)) console.log(`${pad('', 50)}${w}`);
}

if (dynamic.length && process.argv.includes('--all')) {
  console.log('\nTTL from a variable — read each call site:');
  for (const d of dynamic) console.log(`  ${d.rel}:${d.line}  ${d.key}  ttl=${d.ttl}`);
}
