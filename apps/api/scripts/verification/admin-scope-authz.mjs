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

/**
 * Signs in, completing the staff second factor when one is demanded.
 *
 * A staff login answers with a challenge and no token; the gateway echoes the
 * code only when it is not in production and one of DEV_MFA_ECHO /
 * DEV_AUTH_BYPASS is on. Without that echo there is no way for a script to read
 * the mailbox, so it says so rather than reporting every check as a failure.
 */
async function login({ email, password }) {
  const r = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  let j = await r.json();
  if (j.requires2FA) {
    if (!j.devCode)
      throw new Error(`MFA required for ${email}; run the fleet with DEV_MFA_ECHO=true`);
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
    // non-JSON body
  }
  return { status: r.status, json };
}
/**
 * The rows in a gateway envelope.
 *
 * Normally `json.data.data`, but a handler that returns `{ data: result }`
 * around a service result that is itself `{ data, total }` nests them one
 * level deeper (`listings/pending` does). Walk down `.data` until an array
 * turns up; still null — fail closed — when none does.
 */
const listOf = (j) => {
  let node = j?.data;
  for (let depth = 0; depth < 4 && node && !Array.isArray(node); depth++) node = node.data;
  return Array.isArray(node) ? node : null;
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

  // ── The fix wave: handlers that used to drop the scope the gateway sent ────
  console.log('marketplace moderation, finance and platform writes');
  // A product's market is its seller's, and the refusal must come from the
  // marketplace handler (`This product belongs to <X>, not to the <Y> market.`),
  // not only from the gateway — that is the hole this wave closes. Probed with
  // whichever market actually has a product: IN against the QA admin, else QA
  // against the IN admin. The pair is symmetric, so either proves the same path.
  const crossProduct = async () => {
    const inRow = listOf(
      (await call(g, 'GET', '/admin/marketplace/products?country=IN&limit=1')).json,
    )?.[0];
    if (inRow) return { row: inRow, actor: qa, owner: 'IN', caller: 'QA' };
    const qaRow = listOf(
      (await call(g, 'GET', '/admin/marketplace/products?country=QA&limit=1')).json,
    )?.[0];
    if (qaRow) return { row: qaRow, actor: ind, owner: 'QA', caller: 'IN' };
    return null;
  };
  const probe = await crossProduct();
  if (probe) {
    const active = (j) => j?.data?.data?.is_active ?? j?.data?.is_active;
    const before = active(
      (await call(g, 'GET', `/admin/marketplace/products/${probe.row.id}`)).json,
    );
    const denied = await call(
      probe.actor,
      'PATCH',
      `/admin/marketplace/products/${probe.row.id}/unpublish`,
      { reason: 'probe' },
    );
    ok(
      `${probe.caller} admin refused unpublishing the ${probe.owner} product`,
      denied.status === 403,
      `status ${denied.status}`,
    );
    ok(
      'the refusal came from the marketplace handler, not just the gateway',
      String(denied.json?.message ?? '').includes(`belongs to ${probe.owner}`),
      `message ${JSON.stringify(denied.json?.message)}`,
    );
    const after = active(
      (await call(g, 'GET', `/admin/marketplace/products/${probe.row.id}`)).json,
    );
    ok(
      `the ${probe.owner} product is unchanged after the refused unpublish`,
      before !== undefined && before === after,
      `is_active ${before} -> ${after}`,
    );
  } else {
    skip('cross-market product unpublish is refused', 'no IN or QA product seeded');
    skip(
      'the refusal came from the marketplace handler, not just the gateway',
      'no product seeded',
    );
    skip('the product is unchanged after the refused unpublish', 'no product seeded');
  }
  // refund-service reads no market, so this is refused at the gateway before any
  // RPC — the id need not exist, and a 404 here would mean the RPC went out.
  ok(
    'QA admin refused approving a refund, before any RPC',
    (
      await call(
        qa,
        'POST',
        '/admin/marketplace/refunds/00000000-0000-4000-8000-000000000001/approve',
        { remarks: 'probe' },
      )
    ).status === 403,
  );
  ok(
    'QA admin refused writing platform marketplace settings',
    (await call(qa, 'PATCH', '/admin/marketplace/settings', {})).status === 403,
  );
  onlyMarket(
    'QA admin sees only QA offers in the moderation queue',
    await call(qa, 'GET', '/admin/marketplace/listings/pending?limit=50'),
    (l) => l.seller?.regionCode ?? l.seller?.region_code,
    'QA',
  );

  // Q&A carries no region column: its market is its product's seller's, which
  // only the backend predicate can apply. Two scoped queues that together fit
  // inside the global one is what a real predicate looks like from outside.
  const qaCount = async (token) =>
    (listOf((await call(token, 'GET', '/admin/marketplace/qa-moderation')).json) ?? []).length;
  const [qaAll, qaQa, qaIn] = [await qaCount(g), await qaCount(qa), await qaCount(ind)];
  if (qaAll === 0) skip('the Q&A moderation queue is split by market', 'no questions seeded');
  else
    ok(
      'the Q&A moderation queue is split by market',
      qaQa + qaIn <= qaAll && (qaQa < qaAll || qaIn < qaAll),
      `global ${qaAll}, QA ${qaQa}, IN ${qaIn}`,
    );
  ok(
    'platform settings stay readable in every market',
    (await call(qa, 'GET', '/admin/marketplace/settings')).status === 200 &&
      (await call(qa, 'GET', '/admin/marketplace/seo')).status === 200,
  );
  for (const [name, path] of [
    ['the refund queue', '/admin/marketplace/refunds'],
    ['the payout queue', '/admin/marketplace/payouts'],
    ['commission earnings', '/admin/marketplace/commissions'],
    ['customer segments', '/admin/marketplace/customer-segments'],
    ['the compliance country list', '/admin/marketplace/compliance/countries'],
    ['the wallet ledger', '/admin/marketplace/wallet/transactions'],
  ]) {
    const scoped = await call(qa, 'GET', path);
    const global = await call(g, 'GET', path);
    ok(
      `QA admin refused ${name}, global admin still reads it`,
      scoped.status === 403 && global.status === 200,
      `qa ${scoped.status}, global ${global.status}`,
    );
  }

  console.log('hotel');
  ok(
    'QA admin refused IN hotels by query',
    (await call(qa, 'GET', '/admin/hotel/hotels?countryCode=IN')).status === 403,
  );
  const inHotel = listOf(
    (await call(g, 'GET', '/admin/hotel/hotels?countryCode=IN&limit=1')).json,
  )?.[0];
  if (inHotel)
    ok(
      'QA admin refused suspending an IN hotel',
      (await call(qa, 'PATCH', `/admin/hotel/hotels/${inHotel.id}/suspend`, { reason: 'probe' }))
        .status === 403,
    );
  else skip('QA admin refused suspending an IN hotel', 'no IN hotel seeded');

  console.log('restaurant');
  ok(
    'QA admin refused IN restaurants by query',
    (await call(qa, 'GET', '/admin/restaurant/restaurants?countryCode=IN')).status === 403,
  );
  const inRestaurant = listOf(
    (await call(g, 'GET', '/admin/restaurant/restaurants?countryCode=IN&limit=1')).json,
  )?.[0];
  if (inRestaurant)
    ok(
      'QA admin refused suspending an IN restaurant',
      (
        await call(qa, 'PATCH', `/admin/restaurant/restaurants/${inRestaurant.id}/suspend`, {
          reason: 'probe',
        })
      ).status === 403,
    );
  else skip('QA admin refused suspending an IN restaurant', 'no IN restaurant seeded');

  console.log('pharmacy');
  ok(
    'QA admin refused IN pharmacy stores by query',
    (await call(qa, 'GET', '/admin/pharmacy/stores?countryCode=IN')).status === 403,
  );

  console.log('doctor');
  ok(
    'QA admin refused IN clinics by query',
    (await call(qa, 'GET', '/admin/doctor/clinics?countryCode=IN')).status === 403,
  );
  // Doctors carry no market at all, so a scoped admin is refused outright
  // rather than shown every market's practitioners.
  ok(
    'QA admin refused the unattributable doctor directory',
    (await call(qa, 'GET', '/admin/doctor/doctors')).status === 403,
  );

  console.log('notifications');
  // Plan B (B7a): the notification feed is the signed-in admin's own inbox,
  // scoped by user rather than market, so a locked admin reads it too; a
  // foreign `?country=` is still refused by `scopeOf`.
  ok(
    'QA admin reads their own notification inbox (personal, not market-scoped); global admin too',
    (await call(qa, 'GET', '/admin/marketplace/notifications')).status === 200 &&
      (await call(g, 'GET', '/admin/marketplace/notifications')).status === 200,
  );
  ok(
    'QA admin ?country=IN on notifications → 403',
    (await call(qa, 'GET', '/admin/marketplace/notifications?country=IN')).status === 403,
  );

  console.log('security');
  // Plan B (B4): `/admin/security/*` requires the `security.manage` permission,
  // which neither seeded `admin` nor `regional_admin` holds — only SUPER_ADMIN
  // or a custom role granted the key. Both admins are refused by the
  // permission half of the guard, not by the market lock.
  const inSec = await call(ind, 'GET', '/admin/security/status');
  ok(
    'IN admin (regional_admin, no security.manage) is refused the security board',
    inSec.status === 403 && /security\.manage/.test(JSON.stringify(inSec.json ?? '')),
    `status ${inSec.status}`,
  );
  ok(
    'global admin (seeded admin role, no security.manage) is refused the security board',
    (await call(g, 'GET', '/admin/security/status')).status === 403,
  );

  console.log(`\n${pass} passed, ${fail} failed, ${skipped} skipped or empty`);
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(2);
});
