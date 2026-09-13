/**
 * The reindex, as logic a spec can drive.
 *
 * Split from `search-reindex.mjs` so the sequencing below — build, bulk, swap,
 * only then delete — can be exercised against a mocked Elasticsearch instead of
 * only against a live one. The CLI is the thin half: environment, Postgres, and
 * a `fetch`-backed client.
 */

/** The index the storefront searches. `SearchService` reads this name. */
export const ALIAS = (env = process.env) =>
  `${env.ELASTICSEARCH_INDEX_PREFIX ?? 'kartseek_'}marketplace`;

/**
 * Elasticsearch runs with security enabled, and the documented way to carry
 * credentials is userinfo in `ELASTICSEARCH_NODE`. Node's `fetch` refuses such a
 * URL outright — `TypeError: Request cannot be constructed from a URL that
 * includes credentials` — so the userinfo is split into a Basic header, exactly
 * as `apps/search-service/src/elasticsearch-endpoint.ts` does it.
 */
export function esEndpoint(env = process.env) {
  const url = new URL(env.ELASTICSEARCH_NODE ?? 'http://localhost:9200');
  const user = decodeURIComponent(url.username) || env.ELASTICSEARCH_USERNAME || '';
  const pass = decodeURIComponent(url.password) || env.ELASTICSEARCH_PASSWORD || '';
  url.username = '';
  url.password = '';
  return {
    origin: url.toString().replace(/\/+$/, ''),
    headers: user
      ? { Authorization: `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}` }
      : {},
  };
}

/**
 * The mapping the query needs.
 *
 * `queryElasticsearch` runs `term` filters on `metadata.country` and
 * `metadata.category` and sorts on `price`, `rating` and `metadata.createdAt`.
 * Under a dynamic mapping those first two become `text` and every `term` filter
 * silently matches nothing — a market filter that quietly returns the whole
 * catalogue. Stating the mapping is the point of building a fresh index.
 */
export const MAPPING = {
  mappings: {
    properties: {
      title: { type: 'text' },
      description: { type: 'text' },
      module: { type: 'keyword' },
      price: { type: 'double' },
      rating: { type: 'double' },
      imageUrl: { type: 'keyword', index: false },
      url: { type: 'keyword', index: false },
      metadata: {
        properties: {
          slug: { type: 'keyword' },
          brand: { type: 'keyword' },
          category: { type: 'keyword' },
          subcategory: { type: 'keyword' },
          country: { type: 'keyword' },
          mrp: { type: 'double' },
          reviewCount: { type: 'integer' },
          createdAt: { type: 'date' },
        },
      },
    },
  },
};

/** The shape `SearchService.esIndexDocument` writes. */
export const toDocument = (r) => ({
  id: r.id,
  title: r.name ?? '',
  description: r.description ?? '',
  module: 'marketplace',
  // `numeric` comes back from pg as a string; indexed as text, every range
  // filter and price sort would fail silently.
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

export const bulkBody = (rows, index) =>
  rows
    .flatMap((r) => [{ index: { _index: index, _id: r.id } }, toDocument(r)])
    .map((o) => JSON.stringify(o))
    .join('\n') + '\n';

/**
 * What `<prefix>marketplace` is today.
 *
 * `alias`     — the steady state this script maintains.
 * `concrete`  — a real index under that name, which is what exists before this
 *               script has ever run. An alias cannot share a name with an
 *               index, so that case needs a one-time migration.
 * `absent`    — nothing there yet.
 */
export async function resolveTarget(es, alias) {
  const aliased = await es.getAlias(alias);
  if (aliased && Object.keys(aliased).length > 0) {
    return { kind: 'alias', indices: Object.keys(aliased) };
  }
  if (await es.indexExists(alias)) return { kind: 'concrete', indices: [alias] };
  return { kind: 'absent', indices: [] };
}

/**
 * Rebuild the catalogue index and cut over to it atomically.
 *
 * ── Why a new index and an alias swap, rather than upserting in place ───────
 *
 * The first version bulk-upserted by product id into the live index. Two things
 * are wrong with that, and the second hides the first:
 *
 *   1. **Nothing is ever removed.** A product that goes `status != 'ACTIVE'`,
 *      `is_active = false`, or is deleted outright keeps its document for ever,
 *      so the storefront keeps offering it and the shopper 404s on the click.
 *   2. **The script could then never report success.** Its completion test was
 *      `after === rows.length`, and `after` includes those stale documents — so
 *      one withdrawn product meant `INCOMPLETE` and exit 1 for ever, with a
 *      message pointing at the wrong thing. Today's state (60 documents against
 *      178 products) hides it, because the index is a subset rather than a
 *      superset.
 *
 * Building a fresh index makes both go away: the new index contains exactly the
 * rows the database returned, `count === rows.length` is a true test, and the
 * storefront moves from the old index to the new one in a single atomic
 * `_aliases` call — no window in which a search sees a half-built index.
 *
 * Order matters and is the thing the spec pins: **build, bulk, verify, swap,
 * and only then delete.** A failure at any step before the swap leaves the live
 * alias exactly where it was and deletes nothing.
 */
export async function runReindex({
  es,
  rows,
  alias,
  now = Date.now(),
  dryRun = false,
  log = console.log,
}) {
  const target = await resolveTarget(es, alias);
  const newIndex = `${alias}_${now}`;

  if (dryRun) {
    log(`plan: create ${newIndex} with an explicit mapping`);
    log(`plan: bulk ${rows.length} document(s) into it`);
    if (target.kind === 'alias') {
      log(`plan: move the alias ${alias} from ${target.indices.join(', ')} to ${newIndex}`);
      log(`plan: delete ${target.indices.join(', ')} once the swap succeeds`);
    } else if (target.kind === 'concrete') {
      log(`plan: ONE-TIME MIGRATION — ${alias} is a concrete index, not an alias.`);
      log(`plan:   delete the concrete index ${alias}, then create the alias onto ${newIndex}`);
      log(`plan:   (an alias cannot share a name with an index, so this step is not atomic)`);
    } else {
      log(`plan: create the alias ${alias} pointing at ${newIndex} (nothing exists today)`);
    }
    return { planned: true, newIndex, target, indexed: 0 };
  }

  await es.createIndex(newIndex, MAPPING);

  if (rows.length > 0) {
    const result = await es.bulk(bulkBody(rows, newIndex));
    if (result?.errors) {
      const first = (result.items ?? [])
        .filter((i) => i.index?.error)
        .slice(0, 3)
        .map((i) => `${i.index._id}: ${i.index.error.reason}`);
      // Deliberately no cleanup call here: the live alias has not moved, no old
      // index has been touched, and `newIndex` is named in the error so it can
      // be dropped by hand after the cause is understood.
      throw new Error(
        `bulk failed; ${alias} is untouched and still serving. Partial index ${newIndex} left in place.\n` +
          first.join('\n'),
      );
    }
  }

  await es.refresh(newIndex);
  const indexed = await es.count(newIndex);
  if (indexed !== rows.length) {
    throw new Error(
      `${newIndex} holds ${indexed} document(s) for ${rows.length} row(s); refusing to swap ` +
        `${alias} onto an index that does not match the catalogue.`,
    );
  }

  if (target.kind === 'concrete') {
    // An alias may not share a name with an index, so the concrete one has to
    // go before the alias can be created. This is the only non-atomic path and
    // it runs once, ever — see the runbook note in the script header.
    log(`one-time migration: ${alias} is a concrete index; deleting it to free the name`);
    await es.deleteIndex(alias);
    await es.updateAliases([{ add: { index: newIndex, alias } }]);
  } else {
    // One call, so there is never a moment with no alias or two of them.
    await es.updateAliases([
      ...target.indices.map((index) => ({ remove: { index, alias } })),
      { add: { index: newIndex, alias } },
    ]);
    // Only now, and only the indices the alias actually pointed at.
    for (const old of target.indices) await es.deleteIndex(old);
  }

  return { planned: false, newIndex, target, indexed };
}
