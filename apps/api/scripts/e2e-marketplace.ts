/**
 * KARTSEEK Marketplace — end-to-end integration test
 * ══════════════════════════════════════════════════
 * Drives the Seller → Admin → Customer workflow through the real stack and
 * reports, per step, what actually happened at every layer:
 *
 *   Frontend  →  API Gateway  →  microservice  →  Postgres
 *                                       ↘  Redis cache
 *                                       ↘  Kafka  →  search index
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register scripts/e2e-marketplace.ts
 *   npx ts-node -r tsconfig-paths/register scripts/e2e-marketplace.ts --json
 *
 * Every assertion is checked against the layer that owns the answer, not
 * against the HTTP status of the call that caused it. This platform's gateway
 * answers 200 in several places without asking a service, so a passing status
 * proves only that a route exists. A write is confirmed by reading the row back
 * out of Postgres; a cache invalidation by reading the key out of Redis; an
 * index update by reading the document out of the search index.
 *
 * The test creates one product, moves it through approval, and leaves it
 * approved and visible — it is a demo-data-shaped artefact, deliberately named
 * so, and re-running replaces it.
 */

import { DataSource } from 'typeorm';
import Redis from 'ioredis';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Credentials come from the API's own .env, never from literals in here — the
// first version hardcoded the Redis password, which is both wrong to commit and
// wrong the moment the environment changes.
// quiet: dotenv's banner goes to stdout and corrupts --json output.
dotenv.config({ path: path.resolve(__dirname, '../.env'), quiet: true });

// 127.0.0.1, not localhost. Node's fetch resolves localhost to ::1 first and
// the gateway binds IPv4, so every request failed with a bare "fetch failed"
// while curl to the same URL returned 200 — curl falls back to IPv4, fetch
// does not.
const GATEWAY = process.env.E2E_GATEWAY ?? 'http://127.0.0.1:3001/api/v1';
const SHELL = process.env.E2E_SHELL ?? 'http://127.0.0.1:3000';
const JSON_OUT = process.argv.includes('--json');

// ── Reporting ───────────────────────────────────────────────────────────────

type Status = 'pass' | 'fail' | 'skip';
interface Check { layer: string; what: string; status: Status; detail: string }
const checks: Check[] = [];

function record(layer: string, what: string, status: Status, detail = '') {
  checks.push({ layer, what, status, detail });
  if (!JSON_OUT) {
    const mark = status === 'pass' ? 'PASS' : status === 'fail' ? 'FAIL' : 'SKIP';
    console.log(`  ${mark}  ${layer.padEnd(11)} ${what}${detail ? `\n            ${detail}` : ''}`);
  }
}
const ok = (l: string, w: string, d = '') => record(l, w, 'pass', d);
const bad = (l: string, w: string, d = '') => record(l, w, 'fail', d);
const skip = (l: string, w: string, d = '') => record(l, w, 'skip', d);

function section(title: string) {
  if (!JSON_OUT) console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 62 - title.length))}`);
}

// ── Transport ───────────────────────────────────────────────────────────────

async function call(method: string, path: string, body?: unknown) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 30_000);
  try {
    const res = await fetch(GATEWAY + path, {
      method,
      signal: ctl.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Region-Code': 'QA',
        // DEV_AUTH_BYPASS makes an unauthenticated caller SUPER_ADMIN locally.
        // Stated rather than relied on silently: on an environment without it
        // the admin steps below return 401 and are reported as failures, which
        // is the correct result for a test of admin behaviour.
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* not json */ }
    return { status: res.status, json, text };
  } catch (e) {
    return { status: 0, json: null, text: String((e as Error).message) };
  } finally { clearTimeout(timer); }
}

/** The gateway wraps payloads; list rows sit at data.data, single rows at data. */
const unwrap = (j: any) => (j?.data?.data !== undefined ? j.data.data : j?.data !== undefined ? j.data : j);

/**
 * Poll until a condition holds, or give up.
 *
 * Indexing is event-driven: approval publishes to Kafka and search-service
 * consumes it. Asserting the index the instant the approval returns tests the
 * broker's latency, not the wiring — the first version of this file failed on
 * exactly that and reported a working consumer as missing.
 */
async function eventually<T>(
  what: () => Promise<T>,
  holds: (v: T) => boolean,
  { attempts = 20, delayMs = 500 } = {},
): Promise<{ value: T; waitedMs: number }> {
  let value = await what();
  let waited = 0;
  for (let i = 0; i < attempts && !holds(value); i++) {
    await new Promise((r) => setTimeout(r, delayMs));
    waited += delayMs;
    value = await what();
  }
  return { value, waitedMs: waited };
}

// ── Infrastructure handles ──────────────────────────────────────────────────

const db = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: +(process.env.DB_PORT || 5432),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'kartseek123',
  database: process.env.MARKETPLACE_DB_NAME ?? 'kartseek_marketplace',
  schema: 'marketplace',
  synchronize: false,
  logging: false,
});

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: +(process.env.REDIS_PORT || 6379),
  // The dev Redis requires auth. Without a password every cache and index
  // check reported "unreachable", which reads like a broken cache rather than
  // an unconfigured harness.
  password: process.env.REDIS_PASSWORD || undefined,
  lazyConnect: true,
  maxRetriesPerRequest: 1,
});
redis.on('error', () => { /* reported through the checks, not the console */ });

const STAMP = process.env.E2E_STAMP ?? 'e2e';
const PRODUCT_NAME = `E2E Integration Probe ${STAMP}`;

async function main() {
  if (!JSON_OUT) {
    console.log('KARTSEEK Marketplace — end-to-end integration test');
    console.log(`gateway ${GATEWAY}`);
    console.log(`shell   ${SHELL}\n`);
  }

  // ── 0. Infrastructure ─────────────────────────────────────────────────────
  section('Infrastructure');

  try {
    await db.initialize();
    const [{ n }] = await db.query('SELECT count(*)::int AS n FROM marketplace.products');
    ok('database', 'Postgres reachable, marketplace schema readable', `${n} products`);
  } catch (e) {
    bad('database', 'Postgres unreachable', String((e as Error).message));
  }

  let redisUp = false;
  try {
    await redis.connect();
    await redis.ping();
    redisUp = true;
    ok('cache', 'Redis reachable');
  } catch (e) {
    bad('cache', 'Redis unreachable', String((e as Error).message));
  }

  // No /marketplace/health route exists — a catalogue read is the honest probe.
  const health = await call('GET', '/marketplace/products?limit=1');
  if (health.status === 200) ok('gateway', 'API gateway reachable');
  else bad('gateway', 'API gateway unreachable', `status ${health.status}`);

  // ── 1. Gateway routing ────────────────────────────────────────────────────
  section('Gateway routing and path forwarding');

  const list = await call('GET', '/marketplace/products?limit=3');
  const rows = unwrap(list.json);
  if (list.status === 200 && Array.isArray(rows) && rows.length)
    ok('gateway', 'GET /marketplace/products returns rows from the service', `${rows.length} returned`);
  else
    bad('gateway', 'GET /marketplace/products did not return rows', `status ${list.status}`);

  const doubled = await call('GET', '/marketplace/marketplace/products');
  if (doubled.status === 404)
    ok('gateway', 'a doubled path prefix is rejected', '/marketplace/marketplace/products -> 404');
  else
    bad('gateway', 'a doubled path prefix was accepted', `status ${doubled.status}`);

  const doubledApi = await fetch(`${SHELL}/api/v1/api/v1/marketplace/products`).then(r => r.status).catch(() => 0);
  if (doubledApi === 404) ok('gateway', 'a doubled /api/v1 prefix is rejected');
  else bad('gateway', 'a doubled /api/v1 prefix was accepted', `status ${doubledApi}`);

  // ── 2. Seller submits a product ───────────────────────────────────────────
  section('Seller: submit a product');

  const sellerRow = await db.query(
    // camelCase: only some columns on this table carry an explicit name.
    `SELECT id, "businessName" FROM marketplace.sellers
      WHERE "verificationStatus" = 'VERIFIED' ORDER BY "createdAt" LIMIT 1`,
  ).catch(() => []);
  const seller = sellerRow[0];

  if (!seller) {
    bad('database', 'no verified seller to submit as');
    return finish();
  }
  ok('database', 'verified seller resolved', `${seller.businessName}`);

  // Clear any product left by a previous run so the test is repeatable.
  await db.query(
    `DELETE FROM marketplace.product_listings
      WHERE product_id IN (SELECT id FROM marketplace.products WHERE name = $1)`, [PRODUCT_NAME]);
  await db.query('DELETE FROM marketplace.products WHERE name = $1', [PRODUCT_NAME]);

  const submit = await call('POST', `/sellers/${seller.id}/products`, {
    name: PRODUCT_NAME,
    description: 'Created by the marketplace end-to-end integration test.',
    price: 199.5,
    mrp: 249,
    stockQuantity: 25,
    sku: `E2E-${STAMP}`,
    brand: 'KARTSEEK E2E',
  });

  let productId: string | null = null;
  if (submit.status >= 200 && submit.status < 300) {
    const created = unwrap(submit.json);
    productId = created?.id ?? created?.productId ?? created?.product?.id ?? null;
    ok('gateway', 'POST /sellers/:id/products accepted', `status ${submit.status}`);
  } else {
    bad('gateway', 'POST /sellers/:id/products rejected', `status ${submit.status} ${submit.text.slice(0, 120)}`);
  }

  // The row is the proof, not the status. A gateway route that answers without
  // asking a service returns 201 just as happily.
  const dbRow = await db.query(
    'SELECT id, approval_status, is_active, status, seller_id FROM marketplace.products WHERE name = $1',
    [PRODUCT_NAME],
  );
  if (dbRow.length === 1) {
    productId = dbRow[0].id;
    ok('database', 'product row written to Postgres', `id ${productId}, approval ${dbRow[0].approval_status}`);
  } else {
    bad('database', 'no product row was written', `${dbRow.length} rows matched — the 2xx above wrote nothing`);
    return finish();
  }

  const listingRows = await db.query(
    'SELECT id, "isActive", "approvalStatus" FROM marketplace.product_listings WHERE product_id = $1',
    [productId],
  );
  if (listingRows.length)
    ok('database', 'a sellable listing was created with it', `${listingRows.length} listing(s)`);
  else
    bad('database', 'no listing created — the product exists but nothing is for sale');

  // ── 3. Product is invisible to customers before approval ──────────────────
  section('Customer: unapproved product must not be visible');

  const beforeSearch = await call('GET', `/marketplace/search?q=${encodeURIComponent(PRODUCT_NAME)}`);
  const beforeRows = unwrap(beforeSearch.json);
  const visibleBefore = Array.isArray(beforeRows) && beforeRows.some((p: any) => p?.id === productId);
  if (!visibleBefore) ok('gateway', 'pending product is not returned to customers');
  else bad('gateway', 'pending product is already visible to customers', 'approval gate is not enforced');

  // ── 4. Admin approves ─────────────────────────────────────────────────────
  section('Admin: approve the product');

  const approve = await call('PATCH', `/admin/marketplace/products/${productId}/approve`, {});
  if (approve.status >= 200 && approve.status < 300)
    ok('gateway', 'PATCH /admin/marketplace/products/:id/approve accepted', `status ${approve.status}`);
  else
    bad('gateway', 'admin approve rejected', `status ${approve.status} ${approve.text.slice(0, 120)}`);

  const afterRow = await db.query(
    'SELECT approval_status, is_active, status FROM marketplace.products WHERE id = $1', [productId]);
  if (afterRow[0]?.approval_status === 'APPROVED' && afterRow[0]?.is_active === true)
    ok('database', 'approval persisted', `approval_status APPROVED, is_active true, status ${afterRow[0].status}`);
  else
    bad('database', 'approval did not persist',
      `approval_status ${afterRow[0]?.approval_status}, is_active ${afterRow[0]?.is_active} — the 2xx above wrote nothing`);

  const afterListings = await db.query(
    'SELECT "isActive", "approvalStatus" FROM marketplace.product_listings WHERE product_id = $1', [productId]);
  if (afterListings.some((l: any) => l.isActive && l.approvalStatus === 'APPROVED'))
    ok('database', "the submitting seller's offer went live with it");
  else
    bad('database', 'no listing was activated — the product is approved but unbuyable',
      JSON.stringify(afterListings));

  // ── 5. Cache and search index ─────────────────────────────────────────────
  section('Cache invalidation and search index');

  if (redisUp) {
    const stale = await redis.get('marketplace:featured');
    if (!stale) ok('cache', 'marketplace:featured cleared, so the storefront re-reads');
    else bad('cache', 'marketplace:featured still cached after approval',
      'the customer home page can serve a list that predates the approval');

    const idxKey = `search:index:marketplace:${productId}`;
    const idx = await eventually(() => redis.get(idxKey), (v) => !!v);
    if (idx.value)
      ok('search', 'approved product indexed via product.approved',
        `arrived after ${idx.waitedMs}ms — Kafka -> search-service -> index`);
    else
      bad('search', 'approved product never reached the search index',
        `${idxKey} still unset after ${idx.waitedMs}ms`);
  } else {
    skip('cache', 'cache and index checks skipped — Redis unreachable');
  }

  // ── 6. Customer sees it ───────────────────────────────────────────────────
  section('Customer: approved product must be visible');

  // Full-text search — /marketplace/search, not a `search` param on /products.
  // The browse endpoint takes category/brand/price filters and drops anything
  // it does not declare, so querying it was always going to look like a miss.
  // The pre-approval search above cached an empty result under
  // `search:<region>:<query>:...`. If approval does not clear it, a customer
  // who looked before the product went live keeps being told it does not exist.
  const searched = await eventually(
    async () => unwrap((await call('GET', `/marketplace/search?q=${encodeURIComponent(PRODUCT_NAME)}`)).json),
    (rows: any) => Array.isArray(rows) && rows.some((p: any) => p?.id === productId),
  );
  if (Array.isArray(searched.value) && searched.value.some((p: any) => p?.id === productId))
    ok('gateway', 'approved product returned by customer search',
      searched.waitedMs ? `after ${searched.waitedMs}ms` : 'immediately');
  else
    bad('gateway', 'approved product not returned by customer search',
      `${Array.isArray(searched.value) ? searched.value.length : 0} rows after ${searched.waitedMs}ms — ` +
      'the stale search cache was not invalidated on approval');

  // Paginate. The catalogue holds ~180 products and the page size is clamped to
  // 100, so checking page one only proved the probe does not sort into the first
  // hundred — which is not the same as it being absent.
  const findInBrowse = async () => {
    for (let page = 1; page <= 5; page++) {
      const res = await call('GET', `/marketplace/products?limit=100&page=${page}`);
      const rows = unwrap(res.json);
      if (!Array.isArray(rows) || !rows.length) return { found: false, pages: page };
      if (rows.some((p: any) => p?.id === productId)) return { found: true, pages: page };
    }
    return { found: false, pages: 5 };
  };
  const browsed = await eventually(findInBrowse, (r) => r.found);
  if (browsed.value.found)
    ok('gateway', 'approved product appears in the customer browse listing',
      `page ${browsed.value.pages}${browsed.waitedMs ? `, after ${browsed.waitedMs}ms` : ''}`);
  else
    bad('gateway', 'approved product missing from the browse listing',
      `not found across ${browsed.value.pages} page(s) of 100`);

  const detail = await call('GET', `/marketplace/products/${productId}`);
  if (detail.status === 200 && unwrap(detail.json)?.id === productId)
    ok('gateway', 'product detail endpoint serves the approved product');
  else
    bad('gateway', 'product detail endpoint does not serve it', `status ${detail.status}`);

  // The storefront page, through the shell — the surface a customer actually uses.
  const page = await fetch(`${SHELL}/marketplace/product/${productId}`, {
    headers: { 'X-Region-Code': 'QA' },
  }).then(async r => ({ status: r.status, body: r.status === 200 ? await r.text() : '' }))
    .catch(() => ({ status: 0, body: '' }));

  if (page.status === 200 && page.body.includes(PRODUCT_NAME))
    ok('frontend', 'storefront product page renders the approved product');
  else if (page.status === 200)
    bad('frontend', 'storefront page rendered without the product name',
      'the page served, but the product it was asked for is not in the markup');
  else
    bad('frontend', 'storefront product page did not render', `status ${page.status}`);

  // ── 7. Rejection is honoured too ──────────────────────────────────────────
  section('Admin: rejection writes a real state change');

  const reject = await call('PATCH', `/admin/marketplace/products/${productId}/reject`, { reason: 'e2e probe' });
  const rejectedRow = await db.query(
    'SELECT approval_status, is_active FROM marketplace.products WHERE id = $1', [productId]);
  if (rejectedRow[0]?.approval_status === 'REJECTED')
    ok('database', 'rejection persisted', `is_active now ${rejectedRow[0].is_active}`);
  else
    bad('database', 'rejection did not persist',
      `status ${reject.status}, approval_status ${rejectedRow[0]?.approval_status}`);

  if (redisUp) {
    const gone = await eventually(
      () => redis.get(`search:index:marketplace:${productId}`), (v) => !v);
    if (!gone.value) ok('search', 'rejected product removed from the search index',
      gone.waitedMs ? `after ${gone.waitedMs}ms` : 'immediately');
    else bad('search', 'rejected product still findable in the search index');
  }

  // ── 8. Admin: category management ─────────────────────────────────────────
  section('Admin: category management writes to the catalogue');

  const CAT_NAME = `E2E Category ${STAMP}`;
  await db.query('DELETE FROM marketplace.categories WHERE name = $1', [CAT_NAME]);

  const catCreate = await call('POST', '/admin/marketplace/categories', {
    name: CAT_NAME,
    slug: `e2e-category-${STAMP}`,
    description: 'Created by the marketplace end-to-end integration test.',
    isActive: true,
  });

  const catRow = await db.query(
    'SELECT id, name, slug, is_active FROM marketplace.categories WHERE name = $1', [CAT_NAME]);
  if (catRow.length === 1)
    ok('database', 'admin category create wrote a row', `id ${catRow[0].id}`);
  else
    bad('database', 'admin category create wrote nothing',
      `status ${catCreate.status}, ${catRow.length} rows matched`);

  const categoryId = catRow[0]?.id;
  if (categoryId) {
    // The category list is cached under marketplace:categories; creating one has
    // to clear it or the storefront menu keeps the old set.
    if (redisUp) {
      const cached = await redis.get('marketplace:categories');
      if (!cached) ok('cache', 'marketplace:categories cleared by the write');
      else bad('cache', 'marketplace:categories still cached after a create',
        'the storefront category menu can serve a set that predates it');
    }

    const RENAMED = `${CAT_NAME} renamed`;
    await call('PATCH', `/admin/marketplace/categories/${categoryId}`, { name: RENAMED });
    const afterUpdate = await db.query(
      'SELECT name FROM marketplace.categories WHERE id = $1', [categoryId]);
    if (afterUpdate[0]?.name === RENAMED)
      ok('database', 'admin category update persisted');
    else
      bad('database', 'admin category update did not persist',
        `name is still "${afterUpdate[0]?.name}"`);

    // The PUT alias must reach the same implementation as the PATCH. Both are
    // declared because the admin client sends PUT, and stacking two verb
    // decorators on one handler registers only the last.
    await call('PUT', `/admin/marketplace/categories/${categoryId}`, { name: CAT_NAME });
    const afterPut = await db.query(
      'SELECT name FROM marketplace.categories WHERE id = $1', [categoryId]);
    if (afterPut[0]?.name === CAT_NAME)
      ok('database', 'the PUT alias writes as the PATCH does');
    else
      bad('database', 'the PUT alias did not write', `name is "${afterPut[0]?.name}"`);

    const del = await call('DELETE', `/admin/marketplace/categories/${categoryId}`);
    const afterDelete = await db.query(
      'SELECT is_active FROM marketplace.categories WHERE id = $1', [categoryId]);
    // Deleting a category that has products deactivates rather than removes it;
    // either outcome is a real write, and an unchanged active row is not.
    if (afterDelete.length === 0 || afterDelete[0]?.is_active === false)
      ok('database', 'admin category delete removed or deactivated it',
        afterDelete.length === 0 ? 'row removed' : 'deactivated (products reference it)');
    else
      bad('database', 'admin category delete changed nothing', `status ${del.status}`);
  }

  // ── 9. Admin: flash deals ─────────────────────────────────────────────────
  section('Admin: flash deals write to the catalogue');

  // The column is `name`, not `title`, and the discount is
  // `min_discount_percent` — this table is snake_case throughout.
  const DEAL_TITLE = `E2E Flash Deal ${STAMP}`;
  await db.query('DELETE FROM marketplace.flash_deals WHERE name = $1', [DEAL_TITLE]).catch(() => undefined);

  const now = Date.now();
  const dealCreate = await call('POST', '/admin/marketplace/flash-deals', {
    name: DEAL_TITLE,
    description: 'Created by the marketplace end-to-end integration test.',
    minDiscountPercent: 25,
    windowStart: new Date(now - 60_000).toISOString(),
    windowEnd: new Date(now + 3_600_000).toISOString(),
    status: 'ACTIVE',
    regionCode: 'QA',
  });

  const dealRow = await db.query(
    'SELECT id, name FROM marketplace.flash_deals WHERE name = $1', [DEAL_TITLE]).catch(() => []);
  if (dealRow.length === 1)
    ok('database', 'admin flash deal create wrote a row', `id ${dealRow[0].id}`);
  else
    bad('database', 'admin flash deal create wrote nothing',
      `status ${dealCreate.status} ${dealCreate.text.slice(0, 100)}`);

  if (dealRow[0]?.id) {
    const dealId = dealRow[0].id;
    await call('PATCH', `/admin/marketplace/flash-deals/${dealId}`, { minDiscountPercent: 40 });
    const afterDeal = await db.query(
      'SELECT * FROM marketplace.flash_deals WHERE id = $1', [dealId]).catch(() => []);
    const pct = afterDeal[0]?.min_discount_percent;
    if (Number(pct) === 40) ok('database', 'admin flash deal update persisted');
    else bad('database', 'admin flash deal update did not persist', `discount is ${pct}`);

    // DELETE cancels rather than removes — the route is labelled "Cancel flash
    // deal" and the service sets status CANCELLED, keeping the row for the
    // sellers whose nominations reference it. Asserting the row had vanished
    // reported a working soft delete as a no-op.
    const dealDel = await call('DELETE', `/admin/marketplace/flash-deals/${dealId}`);
    const cancelled = await db.query(
      'SELECT status FROM marketplace.flash_deals WHERE id = $1', [dealId]).catch(() => []);
    if (cancelled[0]?.status === 'CANCELLED')
      ok('database', 'admin flash deal delete cancelled the campaign', 'status CANCELLED, row retained');
    else
      bad('database', 'admin flash deal delete changed nothing',
        `status ${dealDel.status}, deal status ${cancelled[0]?.status}`);

    // Clean up the probe campaign so re-running starts from the same place.
    await db.query('DELETE FROM marketplace.flash_deals WHERE id = $1', [dealId]).catch(() => undefined);
  }

  // Leave the probe approved so the artefact it creates is a coherent one.
  await call('PATCH', `/admin/marketplace/products/${productId}/approve`, {});

  await finish();
}

async function finish() {
  const pass = checks.filter(c => c.status === 'pass').length;
  const fail = checks.filter(c => c.status === 'fail').length;
  const skipped = checks.filter(c => c.status === 'skip').length;

  if (JSON_OUT) {
    console.log(JSON.stringify({ pass, fail, skipped, checks }, null, 2));
  } else {
    console.log(`\n${'═'.repeat(68)}`);
    console.log(`  ${pass} passed   ${fail} failed   ${skipped} skipped`);
    if (fail) {
      console.log('\n  Failures:');
      checks.filter(c => c.status === 'fail')
        .forEach(c => console.log(`    ${c.layer.padEnd(11)} ${c.what}${c.detail ? ` — ${c.detail}` : ''}`));
    }
    console.log('═'.repeat(68));
  }

  try { await db.destroy(); } catch { /* already closed */ }
  try { redis.disconnect(); } catch { /* already closed */ }
  process.exit(fail ? 1 : 0);
}

main().catch(async (err) => {
  bad('harness', 'the test itself failed', String(err?.message ?? err));
  await finish();
});
