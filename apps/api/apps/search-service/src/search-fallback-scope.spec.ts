import { describe, it, expect, vi } from 'vitest';
import { SearchService } from './search.service';

function service(docs: Array<{ id: string; country: string }>) {
  // SearchableModule has six members (marketplace, grocery, restaurant,
  // pharmacy, doctor, hotel); redisBasedSearch iterates all of them when
  // filters.serviceType is unset. In production a document lives under
  // exactly one module's index set, so this mock scopes every doc to
  // 'marketplace' and answers other modules' keys as empty — otherwise the
  // same fixture doc would appear to exist under all six namespaces and
  // this fallback would "find" it six times over.
  const redis = {
    getJson: vi.fn(async (k: string) => {
      if (k.startsWith('search:index:set:')) {
        return k === 'search:index:set:marketplace' ? docs.map((d) => d.id) : [];
      }
      if (!k.startsWith('search:index:marketplace:')) return null;
      const id = k.split(':').pop();
      const doc = docs.find((d) => d.id === id);
      return doc
        ? {
            id: doc.id,
            title: 'Widget',
            description: 'A widget',
            price: 10,
            rating: 4,
            metadata: { countryCode: doc.country },
          }
        : null;
    }),
  };
  const svc = Object.create(SearchService.prototype) as SearchService;
  Object.assign(svc, { redis, esAvailable: false, logger: { warn: vi.fn(), log: vi.fn() } });
  return svc;
}

describe('the Elasticsearch-down fallback honours the country filter', () => {
  it('returns only the asked-for market, as the ES term filter does', async () => {
    const svc = service([
      { id: 'in-1', country: 'IN' },
      { id: 'qa-1', country: 'QA' },
    ]);
    const res = await (svc as any).redisBasedSearch('widget', { country: 'QA' }, 1, 20);
    expect(res.results.map((r: any) => r.id)).toEqual(['qa-1']);
    expect(res.total).toBe(1);
  });

  it('returns every market when no country is asked for', async () => {
    const svc = service([
      { id: 'in-1', country: 'IN' },
      { id: 'qa-1', country: 'QA' },
    ]);
    const res = await (svc as any).redisBasedSearch('widget', {}, 1, 20);
    expect(res.results).toHaveLength(2);
  });

  it('excludes a document with no market when a market is asked for', async () => {
    const svc = service([{ id: 'x', country: '' }]);
    const res = await (svc as any).redisBasedSearch('widget', { country: 'QA' }, 1, 20);
    expect(res.results).toHaveLength(0);
  });

  it('matches case-insensitively — the index stores what the writer sent', async () => {
    const svc = service([{ id: 'qa-1', country: 'qa' }]);
    const res = await (svc as any).redisBasedSearch('widget', { country: 'QA' }, 1, 20);
    expect(res.results).toHaveLength(1);
  });
});
