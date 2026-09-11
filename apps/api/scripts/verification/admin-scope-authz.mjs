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
const listOf = (j) => {
  const r = j?.data?.data ?? j?.data;
  return Array.isArray(r) ? r : null;
};
/** A 'sees only <market>' proof: fails closed on a non-200 or a missing list; an empty list is reported, not counted as proof. */
const onlyMarket = (name, res, pick, market) => {
  const list = listOf(res.json);
  if (res.status !== 200 || !list)
    return ok(name, false, `status ${res.status}, no list in the envelope`);
  if (list.length === 0) {
    skipped++;
    console.log(`  ○ ${name} — empty list, nothing to prove`);
    return;
  }
  ok(
    name,
    list.every((r) => (pick(r) ?? '').toUpperCase() === market),
    `saw ${[...new Set(list.map(pick))].join(',') || 'nothing'}`,
  );
};

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
  onlyMarket('QA admin sees only QA users', qaUsers, (u) => u.country, 'QA');
  const inUsers = await call(g, 'GET', '/admin/users?country=IN&limit=1');
  const inUser = listOf(inUsers.json)?.[0];
  if (inUser)
    ok(
      'QA admin cannot ban an IN user',
      (await call(qa, 'PUT', `/admin/users/${inUser.id}/ban`, { reason: 'probe' })).status === 403,
    );
  else skip('QA admin cannot ban an IN user', 'no IN user seeded');

  console.log('marketplace sellers / products');
  ok(
    'QA admin refused IN sellers by query',
    (await call(qa, 'GET', '/admin/marketplace/sellers?country=IN')).status === 403,
  );
  const qaSellers = await call(qa, 'GET', '/admin/marketplace/sellers?limit=50');
  onlyMarket(
    'QA admin sees only QA sellers',
    qaSellers,
    (s) => s.regionCode ?? s.region_code,
    'QA',
  );
  const inSeller = listOf(
    (await call(g, 'GET', '/admin/marketplace/sellers?country=IN&limit=1')).json,
  )?.[0];
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
  } else {
    skip('QA admin refused IN seller detail', 'no IN seller seeded');
    skip('QA admin refused approving an IN seller', 'no IN seller seeded');
    skip('IN seller unchanged after refused approve', 'no IN seller seeded');
    skip('IN admin may read their own seller', 'no IN seller seeded');
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
  onlyMarket('QA admin sees only QA drivers', qaDrivers, (d) => d.countryCode, 'QA');
  ok(
    'global admin may read IN rate cards',
    (await call(g, 'GET', '/admin/taxi/rates?countryCode=IN')).status === 200,
  );

  console.log('grocery');
  ok(
    'QA admin refused IN stores by query',
    (await call(qa, 'GET', '/admin/grocery/stores?regionCode=IN')).status === 403,
  );
  const inStore = listOf(
    (await call(g, 'GET', '/admin/grocery/stores?regionCode=IN&limit=1')).json,
  )?.[0];
  if (inStore)
    ok(
      'QA admin refused suspending an IN store',
      (await call(qa, 'PATCH', `/admin/grocery/stores/${inStore.id}/suspend`, { reason: 'probe' }))
        .status === 403,
    );
  else skip('QA admin refused suspending an IN store', 'no IN grocery store seeded');
  const qaOrders = await call(qa, 'GET', '/admin/grocery/orders?limit=50');
  onlyMarket('QA admin sees only QA grocery orders', qaOrders, (o) => o.store?.regionCode, 'QA');

  console.log('security');
  ok(
    'IN admin may read the security board (role, not market)',
    (await call(ind, 'GET', '/admin/security/status')).status === 200,
  );

  console.log(`\n${pass} passed, ${fail} failed, ${skipped} skipped or empty`);
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(2);
});
