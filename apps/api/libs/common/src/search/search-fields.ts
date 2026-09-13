/**
 * The name of the market field on a search document — declared once.
 *
 * Three places have to agree about it and all three used to disagree:
 *
 *   • `apps/api/scripts/search-reindex.lib.mjs` declared `metadata.country` in
 *     the index MAPPING and `toDocument` emitted no such key;
 *   • `search.service.ts`'s incremental writer wrote `metadata.countryCode`,
 *     from a `product.country_code` column that does not exist on
 *     `marketplace.products` — so it was always `undefined` anyway;
 *   • `search.service.ts`'s ES filter queried `metadata.country`.
 *
 * The consequence was quiet and total: `GET /search?q=…&country=QA` matched
 * zero documents on the Elasticsearch path, for every market, always. Under-
 * returning rather than leaking, but a declared field nothing populates is a
 * placeholder, and the plan's Global Constraint forbids those.
 *
 * One name now, imported by the writer and the filter. The reindex script is
 * plain ESM run by `node` and cannot import a TypeScript module, so it keeps
 * its own copy — and `search-reindex.spec.ts` imports BOTH and asserts they are
 * the same string, which is the gate that makes the second copy safe.
 */

/** The key inside a document's `metadata` object. */
export const SEARCH_COUNTRY_KEY = 'country';

/** The dotted path an Elasticsearch `term`/`terms` filter addresses it by. */
export const SEARCH_COUNTRY_FIELD = `metadata.${SEARCH_COUNTRY_KEY}`;

/**
 * "Offered in every market."
 *
 * `marketplace.sellers.region_code` is nullable — deliberately, so existing
 * rows could be backfilled — and `CatalogService.regionPredicate()` treats a
 * NULL as available everywhere rather than nowhere, because a strict match
 * would empty the storefront on any deployment where the backfill has not run.
 *
 * A `term` filter has no way to express that, so it is written down: a product
 * reachable through a seller with no region carries `*` alongside whatever
 * concrete markets it has, and a country-filtered query asks for
 * `terms: [wanted, '*']`. Without it, search would silently under-return
 * exactly the products the catalogue over-returns — the two answering
 * differently for the same shopper.
 */
export const SEARCH_COUNTRY_ANY = '*';

/**
 * Whatever a caller supplied, as the list of ISO-2 codes to index.
 *
 * Accepts a single code, an array, or a comma-separated string, because the
 * value arrives from a Kafka payload that nothing validates. Upper-cased and
 * de-duplicated; empties dropped; `*` preserved. An input with nothing usable
 * in it produces `undefined` rather than `[]`, so a document that genuinely
 * has no market is distinguishable from one whose event forgot to carry it.
 */
export function normaliseSearchCountries(value: unknown): string[] | undefined {
  const raw = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [value];
  const codes = raw
    .map((v) => (v == null ? '' : String(v).trim().toUpperCase()))
    .filter((v) => v.length > 0);
  const unique = [...new Set(codes)];
  return unique.length ? unique : undefined;
}
