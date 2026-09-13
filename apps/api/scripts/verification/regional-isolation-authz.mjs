/* global process, console, fetch */
import pg from 'pg';

import { createRequire } from 'node:module';

// The database password comes from the environment (or apps/api/.env, which
// this helper loads) or the script stops — there is no built-in default
// (AUD2-074). `createRequire` because the helper is CommonJS, shared with the
// CommonJS maintenance and seed scripts.
const { requireDbPassword } = createRequire(import.meta.url)('../lib/db-password.js');
// Overridable so the checks can be pointed at a gateway on another port, the
// way admin-scope-authz.mjs already allows.
const API = process.env.API_BASE ?? 'http://127.0.0.1:3001/api/v1';
/**
 * Signs in, completing the staff second factor when one is demanded. Every
 * account below is staff, so without the gateway's dev echo of the code there
 * is no token at all — hence the explicit failure rather than 36 confusing 401s.
 */
const login = async (email, password) => {
  const r = await fetch(API + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  let j = await r.json();
  if (j.requires2FA) {
    if (!j.devCode)
      throw new Error(`MFA required for ${email}; run the fleet with DEV_MFA_ECHO=true`);
    const v = await fetch(API + '/auth/mfa/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeToken: j.challengeToken, code: j.devCode }),
    });
    j = await v.json();
  }
  if (!j.accessToken)
    throw new Error(`login failed for ${email}: ${JSON.stringify(j).slice(0, 200)}`);
  return j.accessToken;
};
const qa = await login('qa-admin@kartseek.com', 'AdminPass123!');
const global = await login('admin@kartseek.com', 'AdminPass123!');
const india = await login('india-admin@kartseek.com', 'AdminPass123!');
const call = async (token, method, path, body, extra = {}) => {
  const r = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...extra },
    body: body ? JSON.stringify(body) : undefined,
  });
  let j;
  const t = await r.text();
  try {
    j = JSON.parse(t);
  } catch {
    j = t;
  }
  return { status: r.status, j };
};
const rows = (j) => {
  const d = j?.data?.data ?? j?.data ?? j;
  return Array.isArray(d) ? d : [];
};
const results = [];
const check = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};

// The marketplace database, from the environment like every other script's —
// it used to be a fully hardcoded connection, password included.
const c = new pg.Client({
  host: process.env.MARKETPLACE_DB_HOST || '127.0.0.1',
  port: Number(process.env.MARKETPLACE_DB_PORT || 5433),
  user: process.env.MARKETPLACE_DB_USER || 'marketplace_user',
  password: requireDbPassword('MARKETPLACE_DB_PASSWORD'),
  database: process.env.MARKETPLACE_DB_NAME || 'kartseek_marketplace',
});
await c.connect();
const deals = Object.fromEntries(
  (
    await c.query(`SELECT region_code, id FROM marketplace.flash_deals WHERE created_by='seed'`)
  ).rows.map((r) => [r.region_code, r.id]),
);
const inNom = (
  await c.query(
    `SELECT n.id FROM marketplace.flash_deal_nominations n WHERE n.deal_id=$1 LIMIT 1`,
    [deals.IN],
  )
).rows[0].id;
const coupons = Object.fromEntries(
  (
    await c.query(
      `SELECT code, id FROM marketplace.coupons WHERE code IN ('SAVE50QA','SAVE500IN','WELCOME10')`,
    )
  ).rows.map((r) => [r.code, r.id]),
);

// ── Flash deals ──
let r = await call(qa, 'GET', '/admin/marketplace/flash-deals');
check(
  'QA admin lists only QA flash deals',
  rows(r.j).length === 1 && rows(r.j).every((d) => d.regionCode === 'QA'),
  `${rows(r.j).length} rows: ${rows(r.j)
    .map((d) => d.regionCode)
    .join(',')}`,
);
r = await call(qa, 'GET', '/admin/marketplace/flash-deals?country=IN');
check('QA admin ?country=IN on flash deals → 403', r.status === 403, `status ${r.status}`);
r = await call(qa, 'GET', '/admin/marketplace/flash-deals', undefined, { 'X-Region-Code': 'IN' });
check(
  'QA admin with X-Region-Code: IN header still sees only QA',
  rows(r.j).every((d) => d.regionCode === 'QA') && rows(r.j).length === 1,
  `${rows(r.j)
    .map((d) => d.regionCode)
    .join(',')}`,
);
r = await call(qa, 'PATCH', `/admin/marketplace/flash-deals/${deals.IN}`, { priority: 2 });
check(
  'QA admin PATCH India deal (path id) → 403',
  r.status === 403,
  `status ${r.status} ${JSON.stringify(r.j).slice(0, 120)}`,
);
r = await call(qa, 'PATCH', `/admin/marketplace/flash-deals/${deals.QA}`, { regionCode: 'IN' });
check(
  'QA admin moving own deal to IN (body regionCode) → 403',
  r.status === 403,
  `status ${r.status}`,
);
r = await call(qa, 'PATCH', `/admin/marketplace/flash-deals/${deals.QA}`, { priority: 1 });
check('QA admin PATCH own deal → 200', r.status === 200 || r.status === 201, `status ${r.status}`);
r = await call(qa, 'DELETE', `/admin/marketplace/flash-deals/${deals.IN}`);
check('QA admin cancel India deal → 403', r.status === 403, `status ${r.status}`);
const win = {
  name: 'QA admin probe',
  windowStart: new Date(Date.now() + 86400000).toISOString(),
  windowEnd: new Date(Date.now() + 2 * 86400000).toISOString(),
  minDiscountPercent: 10,
};
r = await call(qa, 'POST', '/admin/marketplace/flash-deals', { ...win, regionCode: 'IN' });
check('QA admin create deal for IN → 403', r.status === 403, `status ${r.status}`);
r = await call(qa, 'POST', '/admin/marketplace/flash-deals', win);
const created = r.j?.data?.deal ?? r.j?.deal ?? r.j?.data;
check(
  'QA admin create deal without market → forced to QA',
  (r.status === 201 || r.status === 200) && created?.regionCode === 'QA',
  `status ${r.status} region=${created?.regionCode}`,
);
if (created?.id) await c.query(`DELETE FROM marketplace.flash_deals WHERE id=$1`, [created.id]);
r = await call(qa, 'GET', '/admin/marketplace/flash-deals/nominations');
check(
  'QA admin lists only QA nominations',
  rows(r.j).length === 8 && rows(r.j).every((n) => n.deal?.regionCode === 'QA'),
  `${rows(r.j).length} rows`,
);
r = await call(qa, 'PATCH', `/admin/marketplace/flash-deals/nominations/${inNom}/approve`);
check('QA admin approve India nomination → 403', r.status === 403, `status ${r.status}`);
r = await call(qa, 'PATCH', `/admin/marketplace/flash-deals/nominations/${inNom}/reject`, {
  reason: 'x',
});
check('QA admin reject India nomination → 403', r.status === 403, `status ${r.status}`);

// ── Coupons ──
r = await call(qa, 'GET', '/admin/marketplace/coupons');
// Hardened past a fixed row count: a coupon carries region_code null only when
// it is platform-wide by design (fulfillment.service.ts's getCoupons — a
// locked admin's regionStrict query excludes those too), so every row here
// must be QA or explicitly global, and the two cross-market codes must never
// leak in regardless of how many rows are seeded on either side of them.
const qaCouponRows = rows(r.j);
const qaCouponCodes = qaCouponRows.map((x) => x.code);
check(
  'QA admin coupon list is QA-only (no WELCOME10, no SAVE500IN)',
  qaCouponRows.every((x) => {
    const region = (x.regionCode ?? x.region_code ?? '').toUpperCase();
    return region === 'QA' || region === '';
  }) &&
    !qaCouponCodes.includes('WELCOME10') &&
    !qaCouponCodes.includes('SAVE500IN'),
  qaCouponCodes.join(','),
);
r = await call(qa, 'GET', '/admin/marketplace/coupons?country=IN');
check('QA admin ?country=IN on coupons → 403', r.status === 403, `status ${r.status}`);
r = await call(qa, 'PUT', `/marketplace/coupons/${coupons.SAVE500IN}`, { description: 'tampered' });
check('QA admin edit India coupon → 403', r.status === 403, `status ${r.status}`);
r = await call(qa, 'PUT', `/marketplace/coupons/${coupons.WELCOME10}`, { description: 'tampered' });
check('QA admin edit global coupon → 403', r.status === 403, `status ${r.status}`);
r = await call(qa, 'DELETE', `/marketplace/coupons/${coupons.SAVE500IN}`);
check('QA admin deactivate India coupon → 403', r.status === 403, `status ${r.status}`);
const cpn = {
  code: 'QAPROBE1',
  title: 'probe',
  discountType: 'FLAT',
  discountValue: 5,
  minOrderValue: 0,
  usageLimit: 0,
  usageLimitPerUser: 1,
  validFrom: new Date().toISOString(),
  validUntil: new Date(Date.now() + 86400000).toISOString(),
  isActive: true,
};
r = await call(qa, 'POST', '/marketplace/coupons', { ...cpn, regionCode: 'IN' });
check('QA admin issue coupon for IN → 403', r.status === 403, `status ${r.status}`);
r = await call(qa, 'POST', '/marketplace/coupons', cpn);
const cc = r.j?.data ?? r.j;
check(
  'QA admin issue coupon without market → QA',
  (r.status === 201 || r.status === 200) && cc?.regionCode === 'QA',
  `status ${r.status} region=${cc?.regionCode}`,
);
await c.query(`DELETE FROM marketplace.coupons WHERE code='QAPROBE1'`);
const sqlIN = (await c.query(`SELECT description FROM marketplace.coupons WHERE code='SAVE500IN'`))
  .rows[0].description;
check('India coupon untouched after the refused edits', !/tampered/.test(sqlIN));

// ── Banners (Redis, typed route) ──
r = await call(qa, 'GET', '/admin/marketplace/banners/hero');
const hero = rows(r.j);
check(
  'QA admin hero banners: QA only, none from IN/AE/SA',
  hero.length === 2 && hero.every((b) => (b.regions ?? []).includes('QA')),
  hero.map((b) => `${b.id}[${(b.regions || []).join('')}]${b.editable ? '✎' : ''}`).join(' '),
);
r = await call(qa, 'GET', '/admin/marketplace/banners/hero?country=IN');
check('QA admin ?country=IN on banners → 403', r.status === 403, `status ${r.status}`);
r = await call(qa, 'POST', '/admin/marketplace/banners/hero', {
  id: 'hero-IN-local',
  headline: 'HACKED',
});
check('QA admin overwrite India banner by id → 403', r.status === 403, `status ${r.status}`);
r = await call(qa, 'POST', '/admin/marketplace/banners/hero', { headline: 'x', regions: ['IN'] });
check('QA admin create banner for IN → 403', r.status === 403, `status ${r.status}`);
r = await call(qa, 'POST', '/admin/marketplace/banners/hero/hero-IN-flash/delete');
check('QA admin delete India banner → 403', r.status === 403, `status ${r.status}`);
r = await call(qa, 'POST', '/admin/marketplace/banners/hero', {
  id: 'hero-QA-probe',
  headline: 'QA PROBE',
  subheadline: 'probe',
  cta: 'x',
  ctaHref: '/',
  gradient: 'from-slate-900 to-slate-800',
});
check(
  'QA admin create banner without market → regions [QA]',
  (r.status === 200 || r.status === 201) && JSON.stringify(r.j).includes('"regions":["QA"]'),
  JSON.stringify(r.j).slice(0, 120),
);
r = await call(qa, 'POST', '/admin/marketplace/banners/hero/hero-QA-probe/delete');
check(
  'QA admin delete own banner → ok',
  r.status === 200 || r.status === 201,
  `status ${r.status}`,
);

// ── Promotions / offers ──
r = await call(qa, 'GET', '/admin/marketplace/promotions?country=IN');
check('QA admin ?country=IN on promotions → 403', r.status === 403, `status ${r.status}`);
r = await call(qa, 'GET', '/admin/marketplace/promotions');
check(
  'QA admin promotions list answers (real rows, QA only)',
  r.status === 200 && rows(r.j).every((p) => p.regionCode === 'QA'),
  `${rows(r.j).length} rows`,
);
r = await call(qa, 'GET', '/admin/marketplace/bank-offers?country=IN');
check('QA admin ?country=IN on bank offers → 403', r.status === 403, `status ${r.status}`);
r = await call(qa, 'POST', '/admin/marketplace/bank-offers', {
  bankName: 'Probe',
  discountType: 'PERCENTAGE',
  discountValue: 5,
  startsAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 86400000).toISOString(),
  regionCode: 'IN',
});
check('QA admin create bank offer for IN → 403', r.status === 403, `status ${r.status}`);

// ── The other side, and the global admin ──
r = await call(india, 'GET', '/admin/marketplace/flash-deals');
check(
  'India admin lists only IN flash deals',
  rows(r.j).length === 1 && rows(r.j)[0]?.regionCode === 'IN',
  rows(r.j)
    .map((d) => d.regionCode)
    .join(','),
);
r = await call(india, 'PATCH', `/admin/marketplace/flash-deals/${deals.QA}`, { priority: 2 });
check('India admin PATCH Qatar deal → 403', r.status === 403, `status ${r.status}`);
r = await call(global, 'GET', '/admin/marketplace/flash-deals');
check(
  'Global admin sees every market',
  rows(r.j).length === 4,
  `${rows(r.j)
    .map((d) => d.regionCode)
    .join(',')}`,
);
r = await call(global, 'GET', '/admin/marketplace/flash-deals?country=IN');
check(
  'Global admin ?country=IN narrows to IN',
  rows(r.j).length === 1 && rows(r.j)[0]?.regionCode === 'IN',
  `${rows(r.j).length}`,
);
r = await call(global, 'GET', '/admin/marketplace/coupons?country=IN');
check(
  'Global admin coupons ?country=IN → IN + global',
  rows(r.j)
    .map((x) => x.code)
    .sort()
    .join(',') === 'SAVE500IN,WELCOME10',
  rows(r.j)
    .map((x) => x.code)
    .join(','),
);

await c.end();
const failed = results.filter((x) => !x.ok);
console.log(`\n${results.length - failed.length}/${results.length} authorization checks passed`);
if (failed.length) process.exitCode = 1;
