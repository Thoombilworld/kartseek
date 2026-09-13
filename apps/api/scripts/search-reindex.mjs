#!/usr/bin/env node
/**
 * Rebuild the marketplace search index from the marketplace database.
 *
 *   node apps/api/scripts/search-reindex.mjs [--dry-run]
 *   cd apps/api && npm run search:reindex -- --dry-run
 *
 * AUD2-032: the index held 60 documents against 178 active products, so every
 * search result was a 34% sample of the catalogue — and search-service reported
 * `elasticsearch: connected`, because a connection is all it was measuring.
 * IN1's readiness check now states the document count; this makes that count
 * correct.
 *
 * Reads the catalogue directly rather than through search-service, because the
 * point is to establish the truth the service then maintains incrementally.
 *
 * ── What it does, and why it is not an in-place upsert ──────────────────────
 *
 * It builds a fresh `<prefix>marketplace_<timestamp>` index with an explicit
 * mapping, bulks every active product into it, checks the count, then moves the
 * `<prefix>marketplace` **alias** onto it in a single atomic `_aliases` call and
 * deletes the index the alias used to point at. Searches see the old index
 * until the swap and the new one after it; there is no half-built state in
 * between, and a failure before the swap changes nothing at all.
 *
 * Upserting by id into the live index — the obvious version — never removes the
 * document of a product that has since been withdrawn, so the storefront keeps
 * offering it; and it makes the script's own success test unsatisfiable, since
 * the live count then permanently exceeds the row count. See the long note in
 * `search-reindex.lib.mjs`.
 *
 * ── The one-time migration ─────────────────────────────────────────────────
 *
 * An Elasticsearch alias may not share a name with a concrete index. Today
 * `kartseek_marketplace` IS a concrete index (search-service created it by
 * writing documents to it), so the first run has to delete it to free the name
 * before the alias can be created. The script detects this, says so, and does
 * it only after the replacement index is built and verified — but that one step
 * is not atomic, so the first run is the one to do at a quiet moment. Every run
 * after it is a clean swap.
 *
 * ── The price is the buy-box price ─────────────────────────────────────────
 *
 * `products.mrp` is the list price and is not what anyone pays. The payable
 * price is the winning listing's `sellingPrice`, so that is what is indexed and
 * what the `price_asc` / `price_desc` sorts then order by; `mrp` is carried in
 * `metadata` for display beside it.
 */
import 'dotenv/config';
import { Client } from 'pg';
import { ALIAS, esEndpoint, runReindex, COUNTRY_ANY } from './search-reindex.lib.mjs';

const dryRun = process.argv.includes('--dry-run');
const alias = ALIAS();
const { origin: NODE, headers: AUTH } = esEndpoint();

const json = { 'Content-Type': 'application/json', ...AUTH };

/** The `fetch`-backed client `runReindex` drives. Mocked wholesale in the spec. */
const es = {
  async getAlias(name) {
    const res = await fetch(`${NODE}/_alias/${name}`, { headers: AUTH });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`GET _alias/${name}: ${res.status} ${await res.text()}`);
    return res.json();
  },
  async indexExists(name) {
    return (await fetch(`${NODE}/${name}`, { method: 'HEAD', headers: AUTH })).ok;
  },
  async createIndex(name, body) {
    const res = await fetch(`${NODE}/${name}`, {
      method: 'PUT',
      headers: json,
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`PUT ${name}: ${res.status} ${await res.text()}`);
  },
  async bulk(ndjson) {
    const res = await fetch(`${NODE}/_bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-ndjson', ...AUTH },
      body: ndjson,
    });
    if (!res.ok) throw new Error(`_bulk: ${res.status} ${await res.text()}`);
    return res.json();
  },
  async refresh(name) {
    await fetch(`${NODE}/${name}/_refresh`, { method: 'POST', headers: AUTH });
  },
  async count(name) {
    const res = await fetch(`${NODE}/${name}/_count`, { headers: AUTH });
    return res.ok ? (await res.json()).count : 0;
  },
  async updateAliases(actions) {
    const res = await fetch(`${NODE}/_aliases`, {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ actions }),
    });
    if (!res.ok) throw new Error(`_aliases: ${res.status} ${await res.text()}`);
  },
  async deleteIndex(name) {
    const res = await fetch(`${NODE}/${name}`, { method: 'DELETE', headers: AUTH });
    if (!res.ok && res.status !== 404) {
      throw new Error(`DELETE ${name}: ${res.status} ${await res.text()}`);
    }
  },
};

const pg = new Client({
  host: process.env.MARKETPLACE_DB_HOST || process.env.DB_HOST,
  port: Number(process.env.MARKETPLACE_DB_PORT || process.env.DB_PORT || 5432),
  user: process.env.MARKETPLACE_DB_USER || process.env.DB_USER,
  password: process.env.MARKETPLACE_DB_PASSWORD || process.env.DB_PASSWORD,
  database: process.env.MARKETPLACE_DB_NAME || process.env.DB_NAME,
});

await pg.connect();

/**
 * `marketplace.*`, never a bare table name: `public` holds shadow copies of
 * these tables, and an unqualified `products` resolves to the wrong one.
 *
 * `status = 'ACTIVE' AND is_active` is the pair the catalogue read uses — a
 * product can be ACTIVE and soft-deleted, and indexing one puts a result in
 * front of a shopper that 404s when they click it.
 */
const { rows } = await pg.query(`
  SELECT p.id,
         p.name,
         COALESCE(p.short_description, p.long_description, '')       AS description,
         p.slug,
         p.mrp,
         p."averageRating"                                           AS rating,
         p."reviewCount"                                             AS review_count,
         p.created_at,
         b.name                                                      AS brand,
         c.name                                                      AS category,
         sc.name                                                     AS subcategory,
         img.url                                                     AS image_url,
         price.selling_price                                         AS price,
         markets.codes                                               AS countries
  FROM marketplace.products p
  LEFT JOIN marketplace.brands     b  ON b.id  = p.brand_id
  LEFT JOIN marketplace.categories c  ON c.id  = p.category_id
  LEFT JOIN marketplace.categories sc ON sc.id = p.subcategory_id
  LEFT JOIN LATERAL (
    SELECT i.url FROM marketplace.product_images i
    WHERE i.product_id = p.id
    ORDER BY i."isPrimary" DESC, i."sortOrder" ASC
    LIMIT 1
  ) img ON true
  LEFT JOIN LATERAL (
    -- The buy-box winner first, then the cheapest live listing. Both must be
    -- active and approved: an unapproved listing is not purchasable, and its
    -- price is not the one to sort the catalogue by.
    SELECT l."sellingPrice" AS selling_price
    FROM marketplace.product_listings l
    WHERE l.product_id = p.id
      AND l."isActive"
      AND l."approvalStatus" = 'APPROVED'
    ORDER BY l."isBuyBoxWinner" DESC, l."sellingPrice" ASC
    LIMIT 1
  ) price ON true
  LEFT JOIN LATERAL (
    -- The markets this product is offered in, by the same two paths
    -- CatalogService.regionPredicate() uses: a seller with an approved live
    -- listing on it, or the product's own seller (the single-seller case, where
    -- no listing row exists). A seller with a NULL region_code is available
    -- everywhere, and there is no way to say that in a term filter — so it is
    -- written down as '*', which the search filter asks for alongside the
    -- market the shopper is in.
    SELECT array_agg(DISTINCT COALESCE(code, '${COUNTRY_ANY}')) AS codes
    FROM (
      SELECT sl.region_code AS code
      FROM marketplace.product_listings pl
      JOIN marketplace.sellers sl ON sl.id = pl.seller_id
      WHERE pl.product_id = p.id AND pl."isActive" AND pl."approvalStatus" = 'APPROVED'
      UNION
      SELECT sp.region_code AS code
      FROM marketplace.sellers sp
      WHERE sp.id = p.seller_id
    ) m
  ) markets ON true
  WHERE p.status = 'ACTIVE' AND p.is_active
  ORDER BY p.created_at`);

console.log(`${rows.length} active product(s) in ${pg.database}`);

try {
  const before = await es.count(alias).catch(() => 0);
  console.log(`${before} document(s) in ${alias} before`);

  const result = await runReindex({ es, rows, alias, dryRun });
  await pg.end();

  if (result.planned) process.exit(0);

  console.log(`${result.indexed} document(s) in ${result.newIndex}; ${alias} now points at it`);
  process.exit(0);
} catch (err) {
  console.error(String(err?.message ?? err));
  await pg.end();
  // Non-zero because "it ran" and "the index is right" are different claims,
  // and only the second one is worth anything to a readiness probe.
  process.exit(1);
}
