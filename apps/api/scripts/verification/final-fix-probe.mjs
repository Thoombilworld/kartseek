/* global process, console, fetch, FormData, Blob, Buffer, setTimeout */
/**
 * Live proof for the final fix wave of the regional-integrity plan.
 *
 * One question per assertion, all of them about routes that answered 200 to a
 * customer token before this wave:
 *
 *   • `/hotels/admin/*`  — seven routes with no `@Roles` at all (four deleted
 *     in favour of their scoped `/admin/hotel/*` twins, three role-gated and
 *     market-scoped)
 *   • `/geo/admin/*`     — six routes with no `@Roles`, two of them writes
 *     (a geo rule rewrite and an arbitrary IP whitelist)
 *   • `/payments/refund` and the four invoice routes — no `@Roles` under a
 *     class that binds `RolesGuard`, so the guard was a no-op for them
 *   • `GET /admin/marketplace/orders/:id` — invented `{id, status:'PENDING'}`
 *   • `POST /upload/kyc-document` — reported an object it never wrote
 *
 * Run against a temp gateway so nothing else on the machine is disturbed:
 *   API_BASE=http://localhost:3099/api/v1 node scripts/verification/final-fix-probe.mjs
 *
 * Every request carries a bearer, so `DEV_AUTH_BYPASS` never applies — an
 * anonymous request is SUPER_ADMIN locally and would prove nothing.
 */
const BASE = process.env.API_BASE ?? 'http://localhost:3099/api/v1';
const PASSWORD = 'AdminPass123!';

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

async function login(email, password = PASSWORD, attempt = 0) {
  const r = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  // `/auth/login` is rate limited, and a re-run of this script inside the
  // window is a 429 that reads exactly like a credential failure. Back off and
  // retry rather than reporting every downstream assertion as broken.
  if (r.status === 429 && attempt < 6) {
    await sleep(15000);
    return login(email, password, attempt + 1);
  }
  let j = await r.json();
  if (j.requires2FA) {
    if (!j.devCode) throw new Error(`MFA without an echoed code for ${email}`);
    const v = await fetch(`${BASE}/auth/mfa/verify`, {
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

async function call(token, method, path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await r.json();
  } catch {
    /* non-JSON */
  }
  return { status: r.status, json };
}

/**
 * A throwaway SELLER, so the KYC route can be exercised by a caller it admits.
 *
 * `POST /auth/seller/register` creates a real `users` row with `role: seller`
 * and `status: 'pending'` — the account cannot open a portal until an admin
 * approves it, which is exactly the state a KYC document is uploaded in.
 */
async function makeSeller() {
  const email = `probe.kyc.${Date.now()}@kartseek.test`;
  const password = 'SellerPass123!';
  const r = await fetch(`${BASE}/auth/seller/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'KYC Probe',
      email,
      phone: `+9745${String(Date.now()).slice(-6)}`,
      businessName: 'KYC Probe Store',
      sellerType: 'marketplace',
      password,
    }),
  });
  if (r.status !== 201 && r.status !== 200) {
    return {
      email,
      error: `register → ${r.status} ${JSON.stringify(await r.json().catch(() => null)).slice(0, 160)}`,
    };
  }
  try {
    return { email, token: await login(email, password) };
  } catch (err) {
    return { email, error: String(err.message ?? err).slice(0, 200) };
  }
}

/** A throwaway customer, so the "any authenticated caller" claim is tested with one. */
async function makeCustomer() {
  const email = `probe.finalfix.${Date.now()}@kartseek.test`;
  const r = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password: 'CustomerPass123!',
      name: 'Probe Customer',
      phone: `+9745${String(Date.now()).slice(-6)}`,
    }),
  });
  const j = await r.json();
  const token = j?.accessToken ?? j?.data?.accessToken;
  if (token) return { email, token };
  return { email, error: JSON.stringify(j).slice(0, 200) };
}

// Serial, not Promise.all: four simultaneous logins trip the sign-in rate
// limiter on their own and the 429 reads as a credential failure.
const qa = await login('qa-admin@kartseek.com');
const india = await login('india-admin@kartseek.com');
const superAdmin = await login('superadmin@kartseek.com');
const globalAdmin = await login('admin@kartseek.com');
const customer = await makeCustomer();
if (!customer.token) throw new Error(`could not create a customer: ${customer.error}`);

console.log('\n── 1. /hotels/admin/* — a customer token used to read all of it ──');
for (const path of [
  '/hotels/admin/fraud/flags',
  '/hotels/admin/compliance',
  '/hotels/admin/onboarding',
]) {
  const r = await call(customer.token, 'GET', path);
  ok(`customer GET ${path} → 403 (was 200)`, r.status === 403, `got ${r.status}`);
}
for (const [method, path] of [
  ['GET', '/hotels/admin/hotels'],
  ['PUT', '/hotels/admin/hotels/htl-001/approve'],
  ['PUT', '/hotels/admin/hotels/htl-001/suspend'],
  ['GET', '/hotels/admin/revenue'],
]) {
  const r = await call(
    customer.token,
    method,
    path,
    method === 'PUT' ? { reason: 'probe' } : undefined,
  );
  ok(
    `${method} ${path} is gone (404) — use the scoped /admin/hotel twin`,
    r.status === 404,
    `got ${r.status}`,
  );
}
{
  const own = await call(qa, 'GET', '/hotels/admin/fraud/flags');
  ok(
    'qa-admin GET /hotels/admin/fraud/flags → 200 in their own market',
    own.status === 200,
    `got ${own.status}`,
  );
  const foreign = await call(qa, 'GET', '/hotels/admin/fraud/flags?countryCode=IN');
  ok('qa-admin asking for IN → 403', foreign.status === 403, `got ${foreign.status}`);
  ok(
    'and the refusal names the market rule',
    /restricted to the QA market/.test(JSON.stringify(foreign.json ?? {})),
    JSON.stringify(foreign.json ?? {}).slice(0, 160),
  );
  const global = await call(globalAdmin, 'GET', '/hotels/admin/compliance');
  ok(
    'global admin GET /hotels/admin/compliance → 200',
    global.status === 200,
    `got ${global.status}`,
  );
}

console.log('\n── 2. /geo/admin/* — a customer token used to rewrite the geo policy ──');
for (const path of [
  '/geo/admin/events',
  '/geo/admin/rules',
  '/geo/admin/whitelist',
  '/geo/admin/stats',
]) {
  const r = await call(customer.token, 'GET', path);
  ok(`customer GET ${path} → 403 (was 200)`, r.status === 403, `got ${r.status}`);
}
for (const [path, body] of [
  ['/geo/admin/rules', { ruleKey: 'vpn_policy', ruleValue: 'allow' }],
  ['/geo/admin/whitelist', { ip: '203.0.113.7', reason: 'probe' }],
]) {
  const r = await call(customer.token, 'POST', path, body);
  ok(`customer POST ${path} → 403 (was 200 and it PERSISTED)`, r.status === 403, `got ${r.status}`);
}
{
  const asAdmin = await call(globalAdmin, 'GET', '/geo/admin/rules');
  ok(
    'a global ADMIN without SUPER_ADMIN is refused too → 403',
    asAdmin.status === 403,
    `got ${asAdmin.status}`,
  );
  const asSuper = await call(superAdmin, 'GET', '/geo/admin/rules');
  ok('superadmin GET /geo/admin/rules → 200', asSuper.status === 200, `got ${asSuper.status}`);
  const stats = await call(superAdmin, 'GET', '/geo/admin/stats');
  ok('superadmin GET /geo/admin/stats → 200', stats.status === 200, `got ${stats.status}`);
}

console.log('\n── 3. /payments/refund and the invoice routes ──');
{
  const refund = await call(customer.token, 'POST', '/payments/refund', {
    paymentId: 'pay-probe',
    amount: 1,
    reason: 'probe',
  });
  ok(
    'customer POST /payments/refund → 403 (was 200 and refunded)',
    refund.status === 403,
    `got ${refund.status}`,
  );
  for (const [method, path] of [
    ['GET', '/payments/invoices/00000000-0000-4000-8000-000000000000'],
    ['GET', '/payments/invoices/payment/pay-probe'],
    ['POST', '/payments/invoices/00000000-0000-4000-8000-000000000000/pdf'],
    ['POST', '/payments/invoices/00000000-0000-4000-8000-000000000000/void'],
  ]) {
    const r = await call(
      customer.token,
      method,
      path,
      method === 'POST' ? { reason: 'probe' } : undefined,
    );
    ok(`customer ${method} ${path} → 403 (was 200)`, r.status === 403, `got ${r.status}`);
  }
  // A gated caller gets past the guard and is answered by the service, not by
  // the guard: a 404 here is the invoice being absent, which is the proof the
  // role gate is not the thing refusing.
  const asAdmin = await call(
    globalAdmin,
    'GET',
    '/payments/invoices/00000000-0000-4000-8000-000000000000',
  );
  ok(
    'global admin reaches the handler (404/503 from the service, not 403)',
    asAdmin.status !== 403,
    `got ${asAdmin.status}`,
  );
}

console.log('\n── 4. GET /admin/marketplace/orders/:id reads the order ──');
{
  const inOrder = process.env.PROBE_IN_ORDER;
  if (!inOrder) {
    skip('order detail', 'PROBE_IN_ORDER not set');
  } else {
    const real = await call(globalAdmin, 'GET', `/admin/marketplace/orders/${inOrder}`);
    // The gateway wraps the handler's `{ data: … }` and the global response
    // interceptor wraps that again, so the record sits at `json.data.data`.
    // Reading `json.data.length`/`json.data.status` is the documented way to
    // miss it and conclude the page is on demo data.
    const record = real.json?.data?.data ?? real.json?.data;
    const status = record?.status;
    ok(`global admin reads ${inOrder} → 200`, real.status === 200, `got ${real.status}`);
    ok(
      `and its status is the stored one, not the invented PENDING (${status})`,
      real.status === 200 && typeof status === 'string' && status !== 'PENDING',
      JSON.stringify(real.json ?? {}).slice(0, 200),
    );
    ok(
      'the row carries its own market',
      record?.regionCode === 'IN',
      `regionCode=${record?.regionCode}`,
    );
    console.log(`      status from the order table: ${status}  market: ${record?.regionCode}`);
    const foreign = await call(qa, 'GET', `/admin/marketplace/orders/${inOrder}`);
    ok('qa-admin reading an IN order → 403', foreign.status === 403, `got ${foreign.status}`);
    const own = await call(india, 'GET', `/admin/marketplace/orders/${inOrder}`);
    ok('india-admin reading the same IN order → 200', own.status === 200, `got ${own.status}`);
    const missing = await call(globalAdmin, 'GET', '/admin/marketplace/orders/ORD-does-not-exist');
    ok(
      'a missing order → 404, not an invented PENDING',
      missing.status === 404,
      `got ${missing.status}`,
    );
  }
}

console.log('\n── 5. POST /upload/kyc-document stores what it reports ──');
{
  // A customer is refused whatever the storage does — the route is SELLER/DRIVER.
  const asCustomer = await fetch(`${BASE}/upload/kyc-document`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${customer.token}` },
    body: (() => {
      const fd = new FormData();
      fd.append(
        'document',
        new Blob([Buffer.from('%PDF-1.7 probe')], { type: 'application/pdf' }),
        'id.pdf',
      );
      return fd;
    })(),
  });
  ok(
    'a customer cannot upload a KYC document → 403',
    asCustomer.status === 403,
    `got ${asCustomer.status}`,
  );

  const seller = await makeSeller();
  if (!seller.token) {
    skip('KYC upload as a seller', seller.error ?? 'no seller token');
  } else {
    const sellerToken = seller.token;
    const fd = new FormData();
    fd.append(
      'document',
      new Blob([Buffer.from('%PDF-1.7 probe')], { type: 'application/pdf' }),
      'id.pdf',
    );
    const r = await fetch(`${BASE}/upload/kyc-document`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sellerToken}` },
      body: fd,
    });
    const raw = await r.json().catch(() => null);
    // The same envelope as everywhere else: the global response interceptor
    // wraps the handler's return under `data`.
    const j = raw?.data ?? raw;
    ok(
      `seller upload → 201/200 (got ${r.status})`,
      r.status === 201 || r.status === 200,
      JSON.stringify(raw ?? {}).slice(0, 200),
    );
    ok(
      'the reply no longer claims "securely uploaded to object storage"',
      !/securely uploaded to object storage/.test(JSON.stringify(raw ?? {})),
      JSON.stringify(raw ?? {}).slice(0, 200),
    );
    ok(
      'the reply carries the stored key under kyc/',
      typeof j?.filename === 'string' && /^kyc\//.test(j.filename),
      `filename=${j?.filename}`,
    );
    console.log(`      stored key: ${j?.filename}`);
    console.log(`      message:    ${j?.message}`);
  }
}

console.log(`\n${pass} passed / ${fail} failed / ${skipped} skipped`);
process.exit(fail ? 1 : 0);
