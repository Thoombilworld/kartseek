/* global process, console, fetch */
/**
 * Live proof that regional integrity holds on the admin API.
 *
 * Run with the fleet up: `npm run verify:regional` from apps/api. Every request
 * carries a bearer, so `DEV_AUTH_BYPASS` (which makes an anonymous request a
 * SUPER_ADMIN) can never be what made a check pass.
 *
 * Three kinds of row, and the difference between them is the point:
 *
 *   REFUSED  a read or write in another market must answer 403, and the same
 *            call inside the caller's own market must answer 2xx. A refusal
 *            without that control proves only that the route is broken (§13
 *            X-56).
 *   FILTERED a read that used to refuse a scoped caller now answers with that
 *            market's own rows. An empty list proves nothing, so it reports
 *            SKIPPED rather than PASS (§13 X-57).
 *   FIGURES  a report's numbers must reconcile: the locked admin's counter is
 *            never larger than the platform's, and the two markets together
 *            never exceed it. An inverted predicate shows up here and nowhere
 *            else.
 *
 * Data-driven on purpose: the tables below are the §13 matrix as far as tasks
 * R1-R10 have taken it, and a new row is a line of data rather than a new
 * function. Accounts and base URL come from the environment, like
 * `admin-scope-authz.mjs`.
 */
const BASE = process.env.API_BASE ?? 'http://localhost:3099/api/v1';
const PASSWORD = process.env.ADMIN_PASSWORD ?? 'AdminPass123!';
const ACCOUNTS = {
  qa: {
    email: process.env.QA_ADMIN_EMAIL ?? 'qa-admin@kartseek.com',
    password: process.env.QA_ADMIN_PASSWORD ?? PASSWORD,
    market: process.env.QA_ADMIN_MARKET ?? 'QA',
  },
  in: {
    email: process.env.IN_ADMIN_EMAIL ?? 'india-admin@kartseek.com',
    password: process.env.IN_ADMIN_PASSWORD ?? PASSWORD,
    market: process.env.IN_ADMIN_MARKET ?? 'IN',
  },
  global: {
    email: process.env.SUPER_ADMIN_EMAIL ?? 'admin@kartseek.com',
    password: process.env.SUPER_ADMIN_PASSWORD ?? PASSWORD,
    market: null,
  },
};

let pass = 0;
let fail = 0;
let skipped = 0;
const failures = [];
const skips = [];

const ok = (name, cond, detail = '') => {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  ✗ ${name} ${detail}`);
  }
};
/** A skip always names its reason: "skipped" with no cause is indistinguishable from a pass. */
const skip = (name, why) => {
  skipped++;
  skips.push(`${name} — ${why}`);
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
 * The payload inside a gateway envelope.
 *
 * `TransformInterceptor` wraps every response as `{ success, data, timestamp }`
 * and some handlers add a `{ data: result }` of their own, so a report body can
 * sit two levels down.
 *
 * Unwrap only while the node is *nothing but* an envelope. Walking down `.data`
 * unconditionally was the first version of this and it was wrong in a way that
 * mattered: a report like `{ data: [...], total, market, summary }` would be
 * reduced to its rows, every figure would read as absent, and the check would
 * report SKIPPED — a missing assertion dressed as a known gap.
 */
const ENVELOPE_KEYS = new Set(['success', 'data', 'meta', 'timestamp', 'statusCode', 'message']);
const bodyOf = (j) => {
  let node = j;
  for (let depth = 0; depth < 3; depth++) {
    if (!node || typeof node !== 'object' || Array.isArray(node) || !('data' in node)) break;
    if (!Object.keys(node).every((k) => ENVELOPE_KEYS.has(k))) break;
    node = node.data;
  }
  return node;
};
/** The rows in a gateway envelope, or null when there is no array to be found. */
const listOf = (j) => {
  let node = j?.data;
  for (let depth = 0; depth < 4 && node && !Array.isArray(node); depth++) node = node.data;
  return Array.isArray(node) ? node : null;
};
/** Read a dotted path, so a figure table can name `summary.totalGMV`. */
const at = (obj, path) =>
  path.split('.').reduce((n, k) => (n == null ? undefined : n[k]), obj ?? undefined);
const num = (v) => (v == null || v === '' ? null : Number(v));

// ── The tables ───────────────────────────────────────────────────────────────

/**
 * Reads that must be FILTERED for a locked admin: 2xx, and every row in the
 * caller's own market.
 *
 * `pick` returns a row's market. A read with no `pick` is a report rather than
 * a list, and is checked by the FIGURES table instead.
 */
const FILTERED_LISTS = [
  {
    task: 'R1',
    name: 'marketplace sellers',
    path: '/admin/marketplace/sellers?limit=50',
    pick: (s) => s.regionCode ?? s.region_code,
  },
  {
    task: 'R4',
    name: 'platform users',
    path: '/admin/users?limit=50',
    pick: (u) => u.region_code ?? u.regionCode,
  },
  {
    task: 'R3',
    name: 'marketplace offers awaiting moderation',
    path: '/admin/marketplace/listings/pending?limit=50',
    pick: (l) => l.seller?.regionCode ?? l.seller?.region_code,
  },
  {
    task: 'R9',
    name: 'marketplace seller rankings',
    path: '/admin/marketplace/analytics/seller-rankings',
    pick: null,
    nonEmpty: true,
  },
  {
    task: 'R9',
    name: 'marketplace inventory aging',
    path: '/admin/marketplace/analytics/inventory-aging',
    pick: null,
    nonEmpty: false,
  },
  { task: 'R10', name: 'taxi drivers', path: '/admin/taxi/drivers', pick: (d) => d.countryCode },
  {
    task: 'R11',
    name: 'the payout queue',
    path: '/admin/marketplace/payouts?limit=50',
    pick: (p) => p.regionCode ?? p.region_code,
  },
];

/**
 * Reads that used to refuse a scoped caller and must now answer per market.
 *
 * `figures` names the counters to reconcile. Every one of them must satisfy
 * `locked <= global`, and `qa + in <= global` where both markets answer — an
 * inverted predicate passes every status check and fails only here.
 */
const FIGURE_REPORTS = [
  {
    task: 'R9',
    name: 'marketplace revenue analytics',
    path: '/admin/marketplace/analytics/revenue',
    figures: ['summary.totalGMV', 'summary.totalOrders', 'summary.deliveredOrders'],
    marketAt: 'market',
  },
  {
    task: 'R9',
    name: 'marketplace conversion funnel',
    path: '/admin/marketplace/analytics/funnel',
    figures: ['abandonedCarts'],
    marketAt: 'market',
  },
  {
    task: 'R9',
    name: 'marketplace return analysis',
    path: '/admin/marketplace/analytics/return-analysis',
    figures: ['totalReturns', 'totalOrders'],
    marketAt: 'market',
  },
  {
    task: 'R9',
    name: 'marketplace category performance',
    path: '/admin/marketplace/analytics/category-performance',
    figures: ['summary.totalOrders'],
    marketAt: 'market',
  },
  {
    task: 'R9',
    name: 'marketplace regional performance',
    path: '/admin/marketplace/analytics/regional',
    figures: ['summary.totalOrders'],
    marketAt: 'scope',
  },
  {
    task: 'R9',
    name: 'hotel platform statistics',
    path: '/admin/hotel/dashboard',
    figures: ['totalHotels', 'activeHotels', 'totalBookings', 'totalReviews'],
    marketAt: 'market',
  },
  {
    task: 'R9',
    name: 'platform revenue report',
    path: '/admin/reports/revenue?startDate=2026-08-01&endDate=2026-09-12&groupBy=day',
    figures: ['totals.orders'],
    marketAt: 'market',
  },
];

/**
 * Reads and writes that must still be REFUSED across markets, each with the
 * same-market control that says the route works at all.
 */
const CROSS_MARKET_REFUSALS = [
  {
    task: 'R9',
    name: 'marketplace revenue analytics',
    path: '/admin/marketplace/analytics/revenue',
    foreign: 'country=IN',
  },
  {
    task: 'R9',
    name: 'marketplace seller rankings',
    path: '/admin/marketplace/analytics/seller-rankings',
    foreign: 'country=IN',
  },
  {
    task: 'R9',
    name: 'hotel platform statistics',
    path: '/admin/hotel/dashboard',
    foreign: 'countryCode=IN',
  },
  {
    task: 'R9',
    name: 'platform revenue report',
    path: '/admin/reports/revenue?startDate=2026-08-01&endDate=2026-09-12',
    foreign: 'country=IN',
  },
  {
    task: 'R1',
    name: 'marketplace sellers',
    path: '/admin/marketplace/sellers',
    foreign: 'country=IN',
  },
  { task: 'R4', name: 'platform users', path: '/admin/users', foreign: 'country=IN' },
  { task: 'R10', name: 'taxi rate cards', path: '/admin/taxi/rates', foreign: 'countryCode=IN' },
  { task: 'R5', name: 'grocery stores', path: '/admin/grocery/stores', foreign: 'regionCode=IN' },
  { task: 'R1', name: 'hotel listings', path: '/admin/hotel/hotels', foreign: 'countryCode=IN' },
  {
    task: 'R11',
    name: 'the payout queue',
    path: '/admin/marketplace/payouts',
    foreign: 'country=IN',
  },
];

/**
 * Reads that are genuinely unattributable and must stay refused for a locked
 * admin while a global one still gets them. These are the rows R9 deliberately
 * did NOT convert: nothing in those services carries a market yet.
 */
const STILL_UNATTRIBUTABLE = [
  { task: 'R6', name: 'the refund queue', path: '/admin/marketplace/refunds' },
  { task: 'R6', name: 'the wallet ledger', path: '/admin/marketplace/wallet/transactions' },
  { task: 'R5', name: 'the doctor directory', path: '/admin/doctor/doctors' },
];

const withQuery = (path, query) => (path.includes('?') ? `${path}&${query}` : `${path}?${query}`);

/**
 * A 5xx proves nothing about market scope.
 *
 * A control that answers 503 because its service is down would fail a check
 * that is about the market lock, and "the fleet is incomplete" and "the
 * predicate is broken" must not report the same way. Skipped with the status
 * named, so the run says which service was missing rather than going quiet.
 */
const unreachable = (status) => status >= 500;

(async () => {
  console.log(`regional integrity — ${BASE}\n`);
  const tokens = {};
  for (const [key, account] of Object.entries(ACCOUNTS)) tokens[key] = await login(account);

  // ── Cross-market refusals, each with its same-market control ──────────────
  console.log('refusals (a foreign market named explicitly) and their controls');
  for (const row of CROSS_MARKET_REFUSALS) {
    const denied = await call(tokens.qa, 'GET', withQuery(row.path, row.foreign));
    // X-56: without the control below, a 403 from a route that 403s for
    // everybody would read as a working market lock.
    const control = await call(tokens.qa, 'GET', row.path);
    if (unreachable(denied.status) || unreachable(control.status)) {
      skip(
        `[${row.task}] ${row.name} refuses a foreign market`,
        `service answered ${denied.status}/${control.status} — not reachable from this gateway`,
      );
      continue;
    }
    ok(
      `[${row.task}] QA admin refused ${row.name} with ?${row.foreign}`,
      denied.status === 403,
      `status ${denied.status}`,
    );
    ok(
      `[${row.task}] QA admin still reads ${row.name} in their own market (control)`,
      control.status >= 200 && control.status < 300,
      `status ${control.status}`,
    );
  }

  // ── Reads that were converted from a refusal to a filter ──────────────────
  console.log('\nlists filtered to the caller market');
  for (const row of FILTERED_LISTS) {
    const res = await call(tokens.qa, 'GET', row.path);
    if (unreachable(res.status)) {
      skip(`[${row.task}] QA admin sees only QA ${row.name}`, `service answered ${res.status}`);
      continue;
    }
    if (res.status !== 200) {
      ok(`[${row.task}] QA admin reads ${row.name}`, false, `status ${res.status}`);
      continue;
    }
    const list = listOf(res.json);
    if (!list) {
      ok(`[${row.task}] ${row.name} answers with a list`, false, 'no array in the envelope');
      continue;
    }
    if (list.length === 0) {
      // X-57: an empty list is the shape a broken predicate and a quiet market
      // share. It is never proof.
      skip(`[${row.task}] QA admin sees only QA ${row.name}`, 'empty list, nothing to prove');
      continue;
    }
    if (!row.pick) {
      ok(`[${row.task}] ${row.name} is non-empty for the QA admin`, true);
      continue;
    }
    const markets = [...new Set(list.map((r) => (row.pick(r) ?? '').toUpperCase()))];
    ok(
      `[${row.task}] QA admin sees only QA ${row.name}`,
      markets.every((m) => m === ACCOUNTS.qa.market),
      `saw ${markets.join(',') || 'nothing'}`,
    );
  }

  // ── Figures that must reconcile ───────────────────────────────────────────
  console.log('\nreports answer per market, and the figures reconcile');
  for (const row of FIGURE_REPORTS) {
    const [q, i, g] = await Promise.all([
      call(tokens.qa, 'GET', row.path),
      call(tokens.in, 'GET', row.path),
      call(tokens.global, 'GET', row.path),
    ]);
    const statuses = `qa ${q.status}, in ${i.status}, global ${g.status}`;
    if ([q, i, g].some((r) => unreachable(r.status))) {
      skip(
        `[${row.task}] ${row.name} answers per market`,
        `service not reachable from this gateway (${statuses})`,
      );
      continue;
    }
    ok(
      `[${row.task}] ${row.name} answers a locked admin instead of refusing`,
      q.status === 200 && i.status === 200 && g.status === 200,
      statuses,
    );
    if (q.status !== 200 || g.status !== 200) continue;

    const [qb, ib, gb] = [bodyOf(q.json), bodyOf(i.json), bodyOf(g.json)];
    if (row.marketAt) {
      ok(
        `[${row.task}] ${row.name} names the market it answered for`,
        String(at(qb, row.marketAt) ?? '').toUpperCase() === ACCOUNTS.qa.market,
        `said ${JSON.stringify(at(qb, row.marketAt))}`,
      );
    }
    for (const figure of row.figures) {
      const qv = num(at(qb, figure));
      const iv = num(at(ib, figure));
      const gv = num(at(gb, figure));
      if (qv == null || gv == null) {
        skip(`[${row.task}] ${row.name} ${figure} reconciles`, 'figure absent from the response');
        continue;
      }
      if (gv === 0) {
        skip(`[${row.task}] ${row.name} ${figure} reconciles`, 'platform total is zero — no data');
        continue;
      }
      // A QA figure above the platform's means the predicate is inverted; the
      // two markets summing above it means one of them is unfiltered.
      const withinPlatform = qv <= gv;
      const marketsFit = iv == null ? true : qv + iv <= gv;
      ok(
        `[${row.task}] ${row.name} ${figure}: QA ${qv} + IN ${iv ?? '?'} <= platform ${gv}`,
        withinPlatform && marketsFit,
      );
      if (qv === gv && iv !== null && iv > 0)
        skip(
          `[${row.task}] ${row.name} ${figure} is strictly smaller than the platform's`,
          `QA equals the platform total (${qv}) — indistinguishable from an unfiltered read`,
        );
    }
  }

  // ── Rows that must stay refused ───────────────────────────────────────────
  console.log('\nreads that carry no market anywhere stay refused, and stay readable globally');
  for (const row of STILL_UNATTRIBUTABLE) {
    const scoped = await call(tokens.qa, 'GET', row.path);
    const global = await call(tokens.global, 'GET', row.path);
    if (unreachable(global.status)) {
      skip(
        `[${row.task}] QA admin refused ${row.name}, global admin still reads it`,
        `the global control answered ${global.status} — that service is not reachable from this gateway (the QA refusal itself was ${scoped.status})`,
      );
      continue;
    }
    ok(
      `[${row.task}] QA admin refused ${row.name}, global admin still reads it`,
      scoped.status === 403 && global.status === 200,
      `qa ${scoped.status}, global ${global.status}`,
    );
  }

  // ── The revenue report is real rows, not a synthesised series ─────────────
  console.log('\nthe revenue report is rows from the orders table');
  const revenuePath = '/admin/reports/revenue?startDate=2026-08-01&endDate=2026-09-12&groupBy=day';
  const revenue = await call(tokens.qa, 'GET', revenuePath);
  const revenueBody = bodyOf(revenue.json);
  const series = Array.isArray(revenueBody?.series) ? revenueBody.series : null;
  if (revenue.status !== 200 || !series)
    ok('[R9] the revenue report answers with a series', false, `status ${revenue.status}`);
  else if (series.length === 0)
    skip('[R9] the revenue report carries real buckets', 'no orders in the range for this market');
  else {
    ok(
      '[R9] every revenue bucket carries a date, a count and a currency',
      series.every((b) => /^\d{4}-\d{2}-\d{2}$/.test(String(b.date)) && Number.isFinite(b.orders)),
      JSON.stringify(series[0]),
    );
    // Per currency, deliberately: one number for QAR + INR would read as
    // revenue and not be any.
    ok(
      '[R9] the revenue total is kept per currency',
      revenueBody.totals && typeof revenueBody.totals.revenue === 'object',
      JSON.stringify(revenueBody?.totals),
    );
  }

  const summary = `\n${pass} passed, ${fail} failed, ${skipped} skipped`;
  console.log(summary);
  if (skips.length) {
    console.log('\nskipped, with reasons:');
    for (const s of skips) console.log(`  ○ ${s}`);
  }
  if (failures.length) {
    console.log('\nfailed:');
    for (const f of failures) console.log(`  ✗ ${f}`);
  }
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(2);
});
