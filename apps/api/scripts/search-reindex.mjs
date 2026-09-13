#!/usr/bin/env node
/**
 * Rebuild the marketplace search index from the marketplace database.
 *
 *   node apps/api/scripts/search-reindex.mjs [--dry-run]
 *   npm run search:reindex -w kartseek-api -- --dry-run
 *
 * AUD2-032: the index held 60 documents against 178 active products, so every
 * search result was a 34% sample of the catalogue — and search-service reported
 * `elasticsearch: connected`, because a connection is all it was measuring.
 * IN1's readiness check now states the document count; this makes that count
 * correct.
 *
 * Reads the catalogue directly rather than through search-service, because the
 * point is to establish the truth the service then maintains incrementally.
 * Idempotent: documents are upserted by product id, so running it twice leaves
 * the same index.
 *
 * ── The document shape is search-service's, not the table's ─────────────────
 *
 * `SearchService.esIndexDocument` PUTs a `SearchResult` — `{ id, title,
 * description, module, price, rating, imageUrl, url, metadata }` — and
 * `queryElasticsearch` searches `title^3`, `description^2`,
 * `metadata.category`, `metadata.brand`, filters on `metadata.country` and
 * sorts on `price` / `rating` / `metadata.createdAt`. A bulk load of raw
 * `marketplace.products` rows would index documents with no `title` and no
 * `description`: every one of them invisible to the query that is supposed to
 * find them, while `_count` climbed to 178 and looked repaired. So this script
 * builds the same shape the service builds, and a reindexed document is
 * indistinguishable from an incrementally indexed one.
 *
 * ── The price is the buy-box price ──────────────────────────────────────────
 *
 * `products.mrp` is the list price and is not what anyone pays. The payable
 * price is the winning listing's `sellingPrice`, so that is what is indexed and
 * what the `price_asc` / `price_desc` sorts then order by; `mrp` is carried in
 * `metadata` for display alongside it. Indexing `mrp` as `price` would sort the
 * catalogue by a number no order ever uses.
 */
import 'dotenv/config';
import { Client } from 'pg';

const dryRun = process.argv.includes('--dry-run');

/**
 * Elasticsearch runs with security enabled, and the documented way to carry
 * credentials is userinfo in `ELASTICSEARCH_NODE`. Node's `fetch` refuses such
 * a URL outright — `TypeError: Request cannot be constructed from a URL that
 * includes credentials` — so the userinfo is split out into a Basic header
 * exactly as `apps/search-service/src/elasticsearch-endpoint.ts` does it.
 */
function elasticsearch() {
  const raw = process.env.ELASTICSEARCH_NODE ?? 'http://localhost:9200';
  const url = new URL(raw);
  const user = decodeURIComponent(url.username) || process.env.ELASTICSEARCH_USERNAME || '';
  const pass = decodeURIComponent(url.password) || process.env.ELASTICSEARCH_PASSWORD || '';
  url.username = '';
  url.password = '';
  const origin = url.toString().replace(/\/+$/, '');
  const headers = user
    ? { Authorization: `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}` }
    : {};
  return { origin, headers };
}

const { origin: NODE, headers: AUTH } = elasticsearch();
const INDEX = `${process.env.ELASTICSEARCH_INDEX_PREFIX ?? 'kartseek_'}marketplace`;

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
 * `status = 'ACTIVE' AND is_active` is the same pair the catalogue read uses —
 * a product can be ACTIVE and soft-deleted, and indexing one puts a result in
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
         price.selling_price                                         AS price
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
  WHERE p.status = 'ACTIVE' AND p.is_active
  ORDER BY p.created_at`);

console.log(`${rows.length} active products in ${pg.database}`);

const count = async () => {
  const res = await fetch(`${NODE}/${INDEX}/_count`, { headers: AUTH });
  return res.ok ? (await res.json()).count : 0;
};

const before = await count();
console.log(`${before} documents in ${INDEX} before`);

if (dryRun) {
  console.log(`--dry-run: ${rows.length - before} document(s) would be added or updated`);
  await pg.end();
  process.exit(0);
}

/** The shape `SearchService.esIndexDocument` writes. */
const toDocument = (r) => ({
  id: r.id,
  title: r.name ?? '',
  description: r.description ?? '',
  module: 'marketplace',
  // `numeric` comes back from pg as a string; ES would then index it as text
  // and every range filter and price sort would fail silently.
  price: r.price == null ? undefined : Number(r.price),
  rating: r.rating == null ? undefined : Number(r.rating),
  imageUrl: r.image_url ?? undefined,
  url: `/marketplace/${r.slug ?? r.id}`,
  metadata: {
    slug: r.slug,
    brand: r.brand ?? undefined,
    category: r.category ?? undefined,
    subcategory: r.subcategory ?? undefined,
    mrp: r.mrp == null ? undefined : Number(r.mrp),
    reviewCount: r.review_count ?? 0,
    createdAt: r.created_at,
  },
});

const body =
  rows
    .flatMap((r) => [{ index: { _index: INDEX, _id: r.id } }, toDocument(r)])
    .map((o) => JSON.stringify(o))
    .join('\n') + '\n';

const res = await fetch(`${NODE}/_bulk`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-ndjson', ...AUTH },
  body,
});

if (!res.ok) {
  console.error(`Elasticsearch refused the bulk request: ${res.status} ${await res.text()}`);
  await pg.end();
  process.exit(1);
}

const result = await res.json();
if (result.errors) {
  console.error(
    result.items
      .filter((i) => i.index?.error)
      .slice(0, 3)
      .map((i) => `${i.index._id}: ${i.index.error.reason}`)
      .join('\n'),
  );
  await pg.end();
  process.exit(1);
}

await fetch(`${NODE}/${INDEX}/_refresh`, { method: 'POST', headers: AUTH });
const after = await count();
console.log(`${after} documents after — ${after === rows.length ? 'complete' : 'INCOMPLETE'}`);
await pg.end();

// A non-zero exit when the index does not match the catalogue: the whole point
// of this script is that "it ran" and "the index is right" are different claims.
process.exit(after === rows.length ? 0 : 1);
