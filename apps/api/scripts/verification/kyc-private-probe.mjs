/* global process, console, fetch, FormData, Blob, Buffer, setTimeout */
/**
 * Live proof for round 2 of the final fix wave — RF-1 / RF-2.
 *
 * RF-1 (Critical): the fix wave routed KYC identity documents through
 * `StorageService.upload`, the platform's PUBLIC seam — GCS `public: true`,
 * a CDN-domain URL contract, no signing — and every provider caught a failed
 * write and returned a plausible CDN URL anyway, so the applicant-facing false
 * success the fix was raised to remove survived one layer down. There was also
 * no read path and no approval-queue row, so a stored document was invisible.
 *
 * What this proves against a live gateway:
 *
 *   1. a seller upload answers 201 with an opaque KEY and no URL of any kind;
 *   2. the bytes are really on disk, under the private directory;
 *   3. the approval queue `GET /admin/kyc/pending` reads has the row;
 *   4. `GET /admin/kyc/documents/:key` streams it to an authorised admin, as an
 *      uncached attachment;
 *   5. anonymous → 401;
 *   6. a region-locked admin cannot read a document from another market (or an
 *      unattributed one), with the platform's fixed denial wording;
 *   7. with the private store pointed at an unusable path, the upload answers
 *      502 and records nothing — the case that used to answer 201.
 *
 * Run against a temp gateway so the dev fleet is not disturbed:
 *   API_BASE=http://localhost:3099/api/v1 \
 *   STORAGE_PRIVATE_DIR=<the temp gateway's private dir> \
 *   node scripts/verification/kyc-private-probe.mjs
 *
 * Step 6's own-market half needs a SELLER whose token carries a region lock,
 * which nothing writes today (that is RF-2): with DB_* in the environment the
 * script locks its own throwaway seller to QA directly, proves both directions,
 * and deletes the row again. Without DB_* it says so and skips.
 *
 * Every request carries a bearer (or deliberately none, for the 401), so
 * `DEV_AUTH_BYPASS` never decides an outcome — start the temp gateway with
 * DEV_AUTH_BYPASS=false so the anonymous case is a real 401.
 *
 * `BREAK_STORE=1` runs step 7 only: point the gateway's STORAGE_PRIVATE_DIR at
 * an unusable path, start it, run with this flag, then restart it clean.
 */
import { createRequire } from 'module';
import * as fs from 'fs';
import * as path from 'path';
import { pacedFetch } from './probe-pacing.mjs';

const require = createRequire(import.meta.url);
const BASE = process.env.API_BASE ?? 'http://localhost:3099/api/v1';
const PRIVATE_DIR = process.env.STORAGE_PRIVATE_DIR ?? '';
const PRIVATE_PREFIX = process.env.STORAGE_PRIVATE_PREFIX ?? 'private/';
const PASSWORD = 'AdminPass123!';
const SELLER_PASSWORD = 'SellerPass123!';
const PDF = Buffer.from('%PDF-1.7 round-2 probe identity document');

let pass = 0,
  fail = 0,
  skipped = 0;
const ok = (name, cond, detail = '') => {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.log(`  ✗ ${name} ${detail}`);
  }
};
const skip = (name, why) => {
  skipped++;
  console.log(`  ○ ${name} — skipped: ${why}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b64 = (s) => Buffer.from(s, 'utf8').toString('base64url');

async function login(email, password = PASSWORD, attempt = 0) {
  const r = await pacedFetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (r.status === 429 && attempt < 6) {
    await sleep(15000);
    return login(email, password, attempt + 1);
  }
  let j = await r.json();
  if (j.requires2FA) {
    if (!j.devCode) throw new Error(`MFA without an echoed code for ${email}`);
    const v = await pacedFetch(`${BASE}/auth/mfa/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeToken: j.challengeToken, code: j.devCode }),
    });
    j = await v.json();
  }
  if (!j.accessToken)
    throw new Error(`login failed for ${email}: ${JSON.stringify(j).slice(0, 200)}`);
  return j.accessToken;
}

async function makeSeller() {
  const email = `probe.kycpriv.${Date.now()}@kartseek.test`;
  const r = await pacedFetch(`${BASE}/auth/seller/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'KYC Private Probe',
      email,
      phone: `+9745${String(Date.now()).slice(-6)}`,
      businessName: 'KYC Private Probe Store',
      sellerType: 'marketplace',
      password: SELLER_PASSWORD,
    }),
  });
  if (r.status !== 201 && r.status !== 200) {
    return { email, error: `register → ${r.status}` };
  }
  return { email, token: await login(email, SELLER_PASSWORD) };
}

async function uploadKyc(token) {
  const fd = new FormData();
  fd.append('document', new Blob([PDF], { type: 'application/pdf' }), 'national_id.pdf');
  const r = await pacedFetch(`${BASE}/upload/kyc-document`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  });
  const raw = await r.json().catch(() => null);
  return { status: r.status, raw, body: raw?.data ?? raw };
}

async function fetchDoc(token, key) {
  const r = await pacedFetch(`${BASE}/admin/kyc/documents/${b64(key)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const type = r.headers.get('content-type') ?? '';
  if (type.includes('application/pdf') || type.includes('octet-stream')) {
    return { status: r.status, headers: r.headers, bytes: Buffer.from(await r.arrayBuffer()) };
  }
  return { status: r.status, headers: r.headers, json: await r.json().catch(() => null) };
}

// ── Step 7 alone, against a deliberately broken store ────────────────────────
if (process.env.BREAK_STORE) {
  console.log('\n── 7. the private store is unusable — the upload must NOT report success ──');
  const seller = await makeSeller();
  if (!seller.token) {
    console.log(`  ✗ could not create a seller: ${seller.error}`);
    process.exit(1);
  }
  const res = await uploadKyc(seller.token);
  ok(
    `upload → 5xx (got ${res.status}); this answered 201 with a CDN URL before`,
    res.status >= 500 && res.status < 600,
    JSON.stringify(res.raw ?? {}).slice(0, 200),
  );
  ok(
    'and the message names the storage failure',
    /document store did not accept/i.test(JSON.stringify(res.raw ?? {})),
    JSON.stringify(res.raw ?? {}).slice(0, 240),
  );
  ok(
    'no key is returned for an object that does not exist',
    !res.body?.filename,
    `filename=${res.body?.filename}`,
  );
  console.log(`      probe seller: ${seller.email}`);
  console.log(`\n${pass} passed / ${fail} failed / ${skipped} skipped`);
  process.exit(fail ? 1 : 0);
}

// ── The main run ─────────────────────────────────────────────────────────────
const superAdmin = await login('superadmin@kartseek.com');
const qa = await login('qa-admin@kartseek.com');
const india = await login('india-admin@kartseek.com');

const created = { keys: [], sellers: [] };

console.log('\n── 1. POST /upload/kyc-document stores privately, and says so ──');
const seller = await makeSeller();
if (!seller.token) throw new Error(`could not create a seller: ${seller.error}`);
created.sellers.push(seller.email);
const up = await uploadKyc(seller.token);
ok(`seller upload → 201/200 (got ${up.status})`, up.status === 201 || up.status === 200);
const key = up.body?.filename;
created.keys.push(key);
ok(
  'the reply carries an opaque key under kyc/<user>/<uuid>',
  typeof key === 'string' && /^kyc\/[^/]+\/[0-9a-f-]{36}\.pdf$/.test(key),
  `filename=${key}`,
);
ok(
  'no url of any kind in the reply (RF-1: this used to be a CDN contract)',
  !/https?:|cdn/i.test(JSON.stringify(up.raw ?? {})),
  JSON.stringify(up.raw ?? {}).slice(0, 200),
);
ok(
  'no market segment in the key (RF-2: kyc/<market>/… was unreachable)',
  typeof key === 'string' && !/^kyc\/[A-Z]{2}\//.test(key),
  `filename=${key}`,
);
console.log(`      stored key: ${key}`);

console.log('\n── 2. the bytes are really there, under the private directory ──');
if (!PRIVATE_DIR) {
  skip('the object is on disk', 'STORAGE_PRIVATE_DIR not passed to this script');
} else {
  const onDisk = path.join(PRIVATE_DIR, PRIVATE_PREFIX, key);
  ok(`${onDisk} exists`, fs.existsSync(onDisk));
  if (fs.existsSync(onDisk)) {
    ok('and holds the bytes that were uploaded', fs.readFileSync(onDisk).equals(PDF));
  }
}

console.log('\n── 3. the approval queue has the row (there was none at all) ──');
{
  const r = await pacedFetch(`${BASE}/admin/kyc/pending?limit=100`, {
    headers: { Authorization: `Bearer ${superAdmin}` },
  });
  const j = await r.json().catch(() => null);
  const rows = j?.data?.data ?? j?.data ?? [];
  const mine = rows.find((row) => (row.documents ?? []).some((d) => d.key === key));
  ok(`GET /admin/kyc/pending → 200 (got ${r.status})`, r.status === 200);
  ok('the uploaded document is in the queue', !!mine, `${rows.length} rows, none carrying the key`);
  if (mine) {
    const doc = mine.documents.find((d) => d.key === key);
    ok('the row names the applicant', !!mine.entityId && !!mine.entityType);
    ok(
      'the document pointer is the authenticated gateway route, not a CDN url',
      doc.url === `/admin/kyc/documents/${b64(key)}`,
      `url=${doc.url}`,
    );
  }
}

console.log('\n── 4. an admin streams it, uncached, as an attachment ──');
{
  const r = await fetchDoc(superAdmin, key);
  ok(`GET /admin/kyc/documents/:key → 200 (got ${r.status})`, r.status === 200);
  ok('the bytes come back unchanged', !!r.bytes && r.bytes.equals(PDF));
  ok(
    'Content-Disposition: attachment',
    (r.headers.get('content-disposition') ?? '').startsWith('attachment;'),
    r.headers.get('content-disposition') ?? '(none)',
  );
  ok(
    'Cache-Control: no-store',
    /no-store/.test(r.headers.get('cache-control') ?? ''),
    r.headers.get('cache-control') ?? '(none)',
  );
}

console.log('\n── 5. anonymous, and a bad key ──');
{
  const anon = await fetchDoc(null, key);
  ok(`anonymous → 401 (got ${anon.status})`, anon.status === 401);
  const bad = await fetchDoc(superAdmin, 'kyc/../../etc/passwd');
  ok(`a traversal key → 400 (got ${bad.status})`, bad.status === 400);
  const missing = await fetchDoc(superAdmin, 'kyc/u-nope/8f1c0c1e-5b3a-4f0e-9a1d-6a2b7c8d9e0f.pdf');
  ok(`an unknown key → 404 (got ${missing.status})`, missing.status === 404);
}

console.log('\n── 6. market scope on the document ──');
{
  // The seller carries no lock, so this document belongs to no market — a
  // locked admin is refused, which is the fail-closed direction.
  const locked = await fetchDoc(qa, key);
  ok(
    `a region-locked admin reading an unattributed document → 403 (got ${locked.status})`,
    locked.status === 403,
  );
  // admin-service's `assertInMarket` refuses first — it holds the record, and
  // the gateway's own `assertRecordInScope` is the second line behind it. Both
  // are the platform's fixed unattributable wording; this is the one a client
  // sees on this path.
  ok(
    'and the refusal is the platform’s fixed wording',
    /belongs to every market, not to the QA market/.test(JSON.stringify(locked.json ?? {})),
    JSON.stringify(locked.json ?? {}).slice(0, 200),
  );
}

if (!process.env.DB_PASSWORD) {
  skip('own-market read / foreign-market refusal', 'DB_* not in the environment');
} else {
  const { Client } = require('pg');
  const db = new Client({
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: +(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME ?? 'kartseek_db',
  });
  await db.connect();
  // RF-2's root cause, made temporarily false: give this throwaway seller the
  // region lock no seller account carries, so the document it uploads is
  // attributed and BOTH directions of the market assert are live-provable.
  await db.query(
    `UPDATE public.users SET region_code = 'QA', region_locked = true WHERE email = $1`,
    [seller.email],
  );
  const lockedSeller = await login(seller.email, SELLER_PASSWORD);
  const up2 = await uploadKyc(lockedSeller);
  const key2 = up2.body?.filename;
  created.keys.push(key2);
  ok(
    `a locked seller's upload → 201 (got ${up2.status})`,
    up2.status === 201 || up2.status === 200,
  );
  ok('still no market in the key', !/^kyc\/QA\//.test(String(key2)), `filename=${key2}`);

  const own = await fetchDoc(qa, key2);
  ok(`the QA admin reads the QA document → 200 (got ${own.status})`, own.status === 200);
  ok('with the same bytes', !!own.bytes && own.bytes.equals(PDF));

  const foreign = await fetchDoc(india, key2);
  ok(`the IN admin reading the QA document → 403 (got ${foreign.status})`, foreign.status === 403);
  ok(
    'refused with the fixed denial copy naming both markets',
    /identity document belongs to QA, not to the IN market/.test(
      JSON.stringify(foreign.json ?? {}),
    ),
    JSON.stringify(foreign.json ?? {}).slice(0, 240),
  );

  const queue = await pacedFetch(`${BASE}/admin/kyc/pending?limit=100`, {
    headers: { Authorization: `Bearer ${qa}` },
  });
  const qj = await queue.json().catch(() => null);
  const qrows = qj?.data?.data ?? qj?.data ?? [];
  ok(
    'and the QA admin sees the applicant in their own queue',
    qrows.some((row) => (row.documents ?? []).some((d) => d.key === key2)),
    `${qrows.length} rows`,
  );
  await db.end();
}

console.log('\n── cleanup ──');
{
  // Redis rows, the objects on disk, and the throwaway account: this probe
  // leaves nothing behind (fixture debt E-2).
  let redisCleaned = 0;
  try {
    const Redis = require('ioredis');
    const redis = new Redis({
      host: process.env.REDIS_HOST ?? '127.0.0.1',
      port: +(process.env.REDIS_PORT ?? 6379),
      password: process.env.REDIS_PASSWORD,
      lazyConnect: true,
    });
    await redis.connect();
    for (const k of created.keys.filter(Boolean)) {
      redisCleaned += await redis.del(`admin:kyc:document:${k}`);
    }
    for (const type of ['seller', 'driver']) {
      const owner = created.keys.filter(Boolean)[0]?.split('/')[1];
      if (owner) redisCleaned += await redis.del(`admin:kyc:pending:${type}:${owner}`);
    }
    await redis.quit();
  } catch (err) {
    console.log(`  ! redis cleanup skipped: ${String(err.message ?? err).slice(0, 120)}`);
  }
  console.log(`  removed ${redisCleaned} redis key(s)`);

  let files = 0;
  if (PRIVATE_DIR) {
    for (const k of created.keys.filter(Boolean)) {
      for (const suffix of ['', '.type']) {
        const f = path.join(PRIVATE_DIR, PRIVATE_PREFIX, k) + suffix;
        if (fs.existsSync(f)) {
          fs.unlinkSync(f);
          files++;
        }
      }
    }
  }
  console.log(`  removed ${files} private object file(s)`);

  if (process.env.DB_PASSWORD) {
    const { Client } = require('pg');
    const db = new Client({
      host: process.env.DB_HOST ?? '127.0.0.1',
      port: +(process.env.DB_PORT ?? 5432),
      user: process.env.DB_USER ?? 'postgres',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME ?? 'kartseek_db',
    });
    await db.connect();
    const r = await db.query(`DELETE FROM public.users WHERE email = ANY($1::text[])`, [
      created.sellers,
    ]);
    console.log(`  removed ${r.rowCount} probe user row(s)`);
    await db.end();
  } else {
    console.log(`  probe account left in place (no DB_*): ${created.sellers.join(', ')}`);
  }
}

console.log(`\n${pass} passed / ${fail} failed / ${skipped} skipped`);
process.exit(fail ? 1 : 0);
