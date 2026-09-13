import { describe, it, expect, vi } from 'vitest';
import { SEARCH_COUNTRY_KEY } from '@app/common';
import { MarketplaceService } from './marketplace.service';

/**
 * A catalogue event carries the markets the product is sold in.
 *
 * search-service indexes with `PUT /_doc/<id>`, which REPLACES the document
 * rather than merging into it. `product.updated` published `{ id, ...dto }`, so
 * the first edit after a reindex deleted `metadata.country` — the field every
 * country-filtered search matches on — and the product fell out of its own
 * market's results until someone reindexed again. An edit that changed only a
 * price took the title with it, too.
 *
 * The event carries the same resolved payload the approval path publishes now.
 * `country` comes from the sellers offering the product, because
 * `marketplace.products` has no market column of its own.
 */
function service(rows: Array<{ code: string | null }>) {
  const product: any = {
    id: 'p-1',
    name: 'Old name',
    slug: 'old-name',
    short_description: 'desc',
    long_description: 'long desc',
    mrp: '99.50',
    seller_id: 's-1',
  };
  const kafka = { publish: vi.fn(async () => undefined) };
  const svc = Object.create(MarketplaceService.prototype) as MarketplaceService;
  Object.assign(svc, {
    productRepo: {
      findOne: vi.fn(async () => product),
      update: vi.fn(async () => ({ affected: 1 })),
    },
    // `catalogCache` is a lazy getter over the Redis client, so it is supplied
    // through the client rather than assigned over.
    catalogCacheInstance: { invalidateProductAndListings: vi.fn(async () => undefined) },
    redis: { del: vi.fn(async () => 1), delPattern: vi.fn(async () => undefined) },
    kafka,
    dataSource: {
      getMetadata: vi.fn(() => ({ tablePath: 'marketplace.t' })),
      query: vi.fn(async () => rows),
    },
    logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
  });
  return { svc, kafka, product };
}

describe('product.updated carries the search payload', () => {
  it('publishes the markets the product is sold in, not just the changed fields', async () => {
    const { svc, kafka } = service([{ code: 'QA' }, { code: 'IN' }]);
    await svc.updateProduct('p-1', { name: 'New name' });
    const [topic, payload] = kafka.publish.mock.calls[0] as [string, any];
    expect(topic).toBe('product.updated');
    expect(payload[SEARCH_COUNTRY_KEY]).toEqual(expect.arrayContaining(['QA', 'IN']));
  });

  it('carries the whole indexable document, so a full replace loses nothing', async () => {
    const { svc, kafka } = service([{ code: 'QA' }]);
    await svc.updateProduct('p-1', { mrp: 120 });
    const payload = (kafka.publish.mock.calls[0] as [string, any])[1];
    // An edit that names only a price used to publish only a price, and the
    // replace then wrote a document with no title to match on.
    expect(payload).toMatchObject({ id: 'p-1', name: 'Old name', slug: 'old-name', price: 120 });
    expect(payload.description).toBeTruthy();
  });

  it("lets the edit's own new values reach the index rather than the stale row", async () => {
    const { svc, kafka } = service([{ code: 'QA' }]);
    await svc.updateProduct('p-1', { name: 'Renamed' });
    const payload = (kafka.publish.mock.calls[0] as [string, any])[1];
    expect(payload.name).toBe('Renamed');
  });
});
