import { describe, it, expect, vi } from 'vitest';
// @ts-expect-error — plain ESM beside the CLI that uses it; there are no types.
import { runReindex, toDocument, MAPPING, bulkBody } from './search-reindex.lib.mjs';

/**
 * AUD2-032 — the reindex has to be able to say it succeeded, and has to be safe
 * when it does not.
 *
 * The first version bulk-upserted by product id into the live index, which
 * fails twice over: a withdrawn product's document is never removed, so the
 * storefront keeps offering it; and the completion test `after === rows.length`
 * then counts those leftovers, so one withdrawal meant `INCOMPLETE` and exit 1
 * for ever. Today's state (60 documents against 178 products) hid it, because
 * the index happens to be a subset rather than a superset.
 *
 * It now builds a fresh index and moves an alias. The ORDER is the whole
 * safety property — build, bulk, verify, swap, and only then delete — and it is
 * what these cases pin, because a live run cannot be performed here (Docker's
 * host→container proxy is down) and would be a poor place to discover it.
 */
type Call = [string, ...unknown[]];

/** A stand-in Elasticsearch that records the order it was driven in. */
function fakeEs(
  opts: {
    alias?: Record<string, unknown> | null;
    concrete?: boolean;
    bulkErrors?: boolean;
    count?: number;
  } = {},
) {
  const calls: Call[] = [];
  const es = {
    getAlias: vi.fn(async (name: string) => {
      calls.push(['getAlias', name]);
      return opts.alias ?? null;
    }),
    indexExists: vi.fn(async (name: string) => {
      calls.push(['indexExists', name]);
      return Boolean(opts.concrete);
    }),
    createIndex: vi.fn(async (name: string, body: unknown) => {
      calls.push(['createIndex', name, body]);
    }),
    bulk: vi.fn(async (ndjson: string) => {
      calls.push(['bulk', ndjson.length]);
      return opts.bulkErrors
        ? { errors: true, items: [{ index: { _id: 'p-1', error: { reason: 'mapper_parsing' } } }] }
        : { errors: false, items: [] };
    }),
    refresh: vi.fn(async (name: string) => {
      calls.push(['refresh', name]);
    }),
    count: vi.fn(async (name: string) => {
      calls.push(['count', name]);
      return opts.count ?? rows.length;
    }),
    updateAliases: vi.fn(async (actions: unknown[]) => {
      calls.push(['updateAliases', actions]);
    }),
    deleteIndex: vi.fn(async (name: string) => {
      calls.push(['deleteIndex', name]);
    }),
  };
  return { es, calls, names: () => calls.map((c) => c[0]) };
}

const rows = [
  {
    id: 'p-1',
    name: 'Kettle',
    slug: 'kettle',
    price: '19.99',
    mrp: '24.99',
    created_at: '2026-01-01',
  },
  { id: 'p-2', name: 'Toaster', slug: 'toaster', price: null, mrp: null, created_at: '2026-01-02' },
];

const ALIAS = 'kartseek_marketplace';
const NOW = 1_760_000_000_000;
const NEW = `${ALIAS}_${NOW}`;
const run = (es: unknown, extra: Record<string, unknown> = {}) =>
  runReindex({ es, rows, alias: ALIAS, now: NOW, log: () => {}, ...extra });

describe('the steady state: an alias moved onto a fresh index', () => {
  const aliased = { kartseek_marketplace_1759000000000: {} };

  it('builds a new index with an explicit mapping before writing anything', async () => {
    const { es, names } = fakeEs({ alias: aliased });
    await run(es);
    expect(names().indexOf('createIndex')).toBeLessThan(names().indexOf('bulk'));
    expect(es.createIndex).toHaveBeenCalledWith(NEW, MAPPING);
  });

  it('states the mapping rather than letting ES guess it', () => {
    // Dynamic mapping makes `metadata.country` and `metadata.category` `text`,
    // and every `term` filter in `queryElasticsearch` then matches nothing —
    // a market filter that silently returns the whole catalogue.
    expect(MAPPING.mappings.properties.metadata.properties.country.type).toBe('keyword');
    expect(MAPPING.mappings.properties.metadata.properties.category.type).toBe('keyword');
    expect(MAPPING.mappings.properties.price.type).toBe('double');
  });

  it('swaps the alias only after a successful bulk and a matching count', async () => {
    const { es, names } = fakeEs({ alias: aliased });
    await run(es);
    const order = names();
    expect(order.indexOf('bulk')).toBeLessThan(order.indexOf('updateAliases'));
    expect(order.indexOf('count')).toBeLessThan(order.indexOf('updateAliases'));
  });

  it('removes and adds in ONE call, so there is never no alias or two', async () => {
    const { es } = fakeEs({ alias: aliased });
    await run(es);
    expect(es.updateAliases).toHaveBeenCalledTimes(1);
    expect(es.updateAliases).toHaveBeenCalledWith([
      { remove: { index: 'kartseek_marketplace_1759000000000', alias: ALIAS } },
      { add: { index: NEW, alias: ALIAS } },
    ]);
  });

  it('deletes the old index only after the swap', async () => {
    const { es, names } = fakeEs({ alias: aliased });
    await run(es);
    expect(names().indexOf('updateAliases')).toBeLessThan(names().lastIndexOf('deleteIndex'));
    expect(es.deleteIndex).toHaveBeenCalledWith('kartseek_marketplace_1759000000000');
    expect(es.deleteIndex).toHaveBeenCalledTimes(1);
  });

  it('never deletes the index it just built', async () => {
    const { es } = fakeEs({ alias: aliased });
    await run(es);
    expect(es.deleteIndex).not.toHaveBeenCalledWith(NEW);
  });
});

describe('a failure before the swap changes nothing', () => {
  const aliased = { kartseek_marketplace_1759000000000: {} };

  it('leaves the live alias untouched and deletes nothing when the bulk fails', async () => {
    const { es } = fakeEs({ alias: aliased, bulkErrors: true });
    await expect(run(es)).rejects.toThrow(/bulk failed/);
    expect(es.updateAliases).not.toHaveBeenCalled();
    expect(es.deleteIndex).not.toHaveBeenCalled();
  });

  it('names the partial index in the error so it can be cleaned up by hand', async () => {
    const { es } = fakeEs({ alias: aliased, bulkErrors: true });
    await expect(run(es)).rejects.toThrow(new RegExp(NEW));
  });

  it('refuses to swap onto an index whose count does not match the catalogue', async () => {
    // The check the old script could never satisfy, now meaningful: the new
    // index holds exactly the rows the database returned, or the swap does not
    // happen.
    const { es } = fakeEs({ alias: aliased, count: 1 });
    await expect(run(es)).rejects.toThrow(/does not match the catalogue|refusing to swap/);
    expect(es.updateAliases).not.toHaveBeenCalled();
    expect(es.deleteIndex).not.toHaveBeenCalled();
  });
});

describe('the one-time migration from a concrete index', () => {
  it('detects that the name is an index rather than an alias', async () => {
    const { es } = fakeEs({ alias: null, concrete: true });
    const result = await run(es);
    expect(result.target.kind).toBe('concrete');
  });

  it('frees the name only after the replacement is built and verified', async () => {
    const { es, names } = fakeEs({ alias: null, concrete: true });
    await run(es);
    const order = names();
    // An alias may not share a name with an index, so this one step cannot be
    // atomic — which is exactly why it happens last, and once.
    expect(order.indexOf('count')).toBeLessThan(order.indexOf('deleteIndex'));
    expect(order.indexOf('deleteIndex')).toBeLessThan(order.indexOf('updateAliases'));
    expect(es.deleteIndex).toHaveBeenCalledWith(ALIAS);
  });

  it('adds the alias without trying to remove one that does not exist', async () => {
    const { es } = fakeEs({ alias: null, concrete: true });
    await run(es);
    expect(es.updateAliases).toHaveBeenCalledWith([{ add: { index: NEW, alias: ALIAS } }]);
  });

  it('creates the alias outright when nothing exists at all', async () => {
    const { es } = fakeEs({ alias: null, concrete: false });
    const result = await run(es);
    expect(result.target.kind).toBe('absent');
    expect(es.updateAliases).toHaveBeenCalledWith([{ add: { index: NEW, alias: ALIAS } }]);
    expect(es.deleteIndex).not.toHaveBeenCalled();
  });
});

describe('--dry-run', () => {
  it('prints the plan and writes nothing', async () => {
    const lines: string[] = [];
    const { es } = fakeEs({ alias: { kartseek_marketplace_1759000000000: {} } });
    const result = await run(es, { dryRun: true, log: (l: string) => lines.push(l) });

    expect(result.planned).toBe(true);
    expect(es.createIndex).not.toHaveBeenCalled();
    expect(es.bulk).not.toHaveBeenCalled();
    expect(es.updateAliases).not.toHaveBeenCalled();
    expect(es.deleteIndex).not.toHaveBeenCalled();
    expect(lines.join('\n')).toContain(`bulk ${rows.length} document(s)`);
    expect(lines.join('\n')).toContain(NEW);
  });

  it('says when the first run will have to do the one-time migration', async () => {
    const lines: string[] = [];
    const { es } = fakeEs({ alias: null, concrete: true });
    await run(es, { dryRun: true, log: (l: string) => lines.push(l) });
    expect(lines.join('\n')).toContain('ONE-TIME MIGRATION');
  });
});

describe('the document it writes is the one search-service reads', () => {
  it('carries title and description, which the query searches', () => {
    // A bulk load of raw table rows would index documents with neither, and
    // every one would be invisible to `multi_match` on `title^3`/`description^2`
    // while `_count` climbed and looked repaired.
    const doc = toDocument({ id: 'p-1', name: 'Kettle', description: 'Boils water', slug: 'k' });
    expect(doc.title).toBe('Kettle');
    expect(doc.description).toBe('Boils water');
    expect(doc.module).toBe('marketplace');
    expect(doc.url).toBe('/marketplace/k');
  });

  it('converts numerics, which pg returns as strings', () => {
    const doc = toDocument({ id: 'p-1', name: 'K', price: '19.99', rating: '4.5', mrp: '24.99' });
    expect(doc.price).toBe(19.99);
    expect(doc.rating).toBe(4.5);
    expect(doc.metadata.mrp).toBe(24.99);
  });

  it('leaves a missing price undefined rather than zero', () => {
    // `0` would sort to the top of `price_asc` — a free kettle at the front of
    // the catalogue.
    expect(toDocument({ id: 'p-2', name: 'T', price: null }).price).toBeUndefined();
  });

  it('addresses each document by product id, so a rerun is idempotent', () => {
    const body = bulkBody(rows, NEW);
    expect(body).toContain(`{"index":{"_index":"${NEW}","_id":"p-1"}}`);
    expect(body.endsWith('\n')).toBe(true);
  });
});
