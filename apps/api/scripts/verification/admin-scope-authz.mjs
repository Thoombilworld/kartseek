/* global process, console, fetch */
// Live proof that a regional admin is confined on the admin API. Run with the
// fleet up: `npm run verify:admin-scope` from apps/api. Every request carries a
// bearer so DEV_AUTH_BYPASS never applies.
const BASE = process.env.API_BASE ?? 'http://localhost:3001/api/v1';
const ACCOUNTS = {
  qa: { email: 'qa-admin@kartseek.com', password: 'AdminPass123!' },
  in: { email: 'india-admin@kartseek.com', password: 'AdminPass123!' },
  global: {
    email: process.env.SUPER_ADMIN_EMAIL ?? 'admin@kartseek.com',
    password: process.env.SUPER_ADMIN_PASSWORD ?? 'AdminPass123!',
  },
};
let pass = 0,
  fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.log(`  ✗ ${name} ${detail}`);
  }
};

async function login({ email, password }) {
  const r = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const j = await r.json();
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
    // non-JSON body
  }
  return { status: r.status, json };
}
const rows = (j) => j?.data?.data ?? j?.data ?? [];

(async () => {
  const qa = await login(ACCOUNTS.qa),
    ind = await login(ACCOUNTS.in),
    g = await login(ACCOUNTS.global);

  console.log('users');
  ok(
    'QA admin refused IN users by query',
    (await call(qa, 'GET', '/admin/users?country=IN')).status === 403,
  );
  const qaUsers = await call(qa, 'GET', '/admin/users?limit=50');
  ok(
    'QA admin sees only QA users',
    qaUsers.status === 200 &&
      rows(qaUsers.json).every((u) => (u.country ?? 'QA').toUpperCase() === 'QA'),
  );
  const inUsers = await call(g, 'GET', '/admin/users?country=IN&limit=1');
  const inUser = rows(inUsers.json)[0];
  if (inUser)
    ok(
      'QA admin cannot ban an IN user',
      (await call(qa, 'PUT', `/admin/users/${inUser.id}/ban`, { reason: 'probe' })).status === 403,
    );

  console.log('marketplace sellers / products');
  ok(
    'QA admin refused IN sellers by query',
    (await call(qa, 'GET', '/admin/marketplace/sellers?country=IN')).status === 403,
  );
  const qaSellers = await call(qa, 'GET', '/admin/marketplace/sellers?limit=50');
  ok(
    'QA admin sees only QA sellers',
    qaSellers.status === 200 &&
      rows(qaSellers.json).every((s) => (s.regionCode ?? s.region_code) === 'QA'),
  );
  const inSeller = rows(
    (await call(g, 'GET', '/admin/marketplace/sellers?country=IN&limit=1')).json,
  )[0];
  if (inSeller) {
    const before = (await call(g, 'GET', `/admin/marketplace/sellers/${inSeller.id}`)).json;
    ok(
      'QA admin refused IN seller detail',
      (await call(qa, 'GET', `/admin/marketplace/sellers/${inSeller.id}`)).status === 403,
    );
    ok(
      'QA admin refused approving an IN seller',
      (await call(qa, 'PATCH', `/admin/marketplace/sellers/${inSeller.id}/approve`)).status === 403,
    );
    const after = (await call(g, 'GET', `/admin/marketplace/sellers/${inSeller.id}`)).json;
    ok(
      'IN seller unchanged after refused approve',
      JSON.stringify(before?.data?.verificationStatus) ===
        JSON.stringify(after?.data?.verificationStatus),
    );
    ok(
      'IN admin may read their own seller',
      (await call(ind, 'GET', `/admin/marketplace/sellers/${inSeller.id}`)).status === 200,
    );
  }
  const p2 = await call(g, 'GET', '/admin/marketplace/products?page=2&limit=5');
  ok(
    'global admin product list honours page and limit',
    p2.json?.data?.page === 2 && p2.json?.data?.limit === 5,
  );
  ok(
    'QA admin refused IN pending products',
    (await call(qa, 'GET', '/admin/marketplace/products/pending?country=IN')).status === 403,
  );

  console.log('taxi');
  ok(
    'QA admin refused IN rate cards',
    (await call(qa, 'GET', '/admin/taxi/rates?countryCode=IN')).status === 403,
  );
  ok(
    'QA admin refused writing IN config',
    (await call(qa, 'PUT', '/admin/taxi/config/IN', { currency: 'INR' })).status === 403,
  );
  ok(
    'QA admin refused IN drivers by query',
    (await call(qa, 'GET', '/admin/taxi/drivers?countryCode=IN')).status === 403,
  );
  const qaDrivers = await call(qa, 'GET', '/admin/taxi/drivers');
  ok(
    'QA admin sees only QA drivers',
    qaDrivers.status === 200 && rows(qaDrivers.json).every((d) => d.countryCode === 'QA'),
  );
  ok(
    'global admin may read IN rate cards',
    (await call(g, 'GET', '/admin/taxi/rates?countryCode=IN')).status === 200,
  );

  console.log('grocery');
  ok(
    'QA admin refused IN stores by query',
    (await call(qa, 'GET', '/admin/grocery/stores?regionCode=IN')).status === 403,
  );
  const inStore = rows(
    (await call(g, 'GET', '/admin/grocery/stores?regionCode=IN&limit=1')).json,
  )[0];
  if (inStore)
    ok(
      'QA admin refused suspending an IN store',
      (await call(qa, 'PATCH', `/admin/grocery/stores/${inStore.id}/suspend`, { reason: 'probe' }))
        .status === 403,
    );
  const qaOrders = await call(qa, 'GET', '/admin/grocery/orders?limit=50');
  ok(
    'QA admin sees only QA grocery orders',
    qaOrders.status === 200 &&
      rows(qaOrders.json).every((o) => (o.store?.regionCode ?? 'QA') === 'QA'),
  );

  console.log('security');
  ok(
    'IN admin may read the security board (role, not market)',
    (await call(ind, 'GET', '/admin/security/status')).status === 200,
  );

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(2);
});
