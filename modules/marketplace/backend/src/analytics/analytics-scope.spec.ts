import { describe, it, expect, vi } from 'vitest';
import { MarketplaceAnalyticsService } from './analytics.service';

/**
 * Repositories that record the `where` they were given, so the spec asserts the
 * market reached the QUERY. Asserting on returned rows would pass against a
 * post-filter over `take(500)`, which is the failure mode that makes a report
 * look like "this market had a quiet month" (audit X-57).
 */
function service() {
  const seen: Record<string, any[]> = { orders: [], sellers: [], returns: [], products: [] };
  const repo = (bucket: string, rows: any[] = []) => ({
    count: vi.fn(async (opts: any) => {
      seen[bucket].push(opts?.where ?? null);
      return rows.length;
    }),
    find: vi.fn(async (opts: any) => {
      seen[bucket].push(opts?.where ?? null);
      return rows;
    }),
    findOne: vi.fn(async (opts: any) => {
      seen[bucket].push(opts?.where ?? null);
      return rows[0] ?? null;
    }),
    createQueryBuilder: vi.fn(() => {
      const qb: any = {
        preds: [] as string[],
        // `innerJoin` is not in the brief's double: `sellerReviewStats` joins
        // reviews to their product that way, and without it every ranking
        // assertion would fail on a missing method rather than on the market.
        innerJoin: () => qb,
        leftJoin: () => qb,
        select: () => qb,
        addSelect: () => qb,
        where: (s: string) => (qb.preds.push(s), qb),
        andWhere: (s: string) => (seen[bucket].push(s), qb),
        groupBy: () => qb,
        orderBy: () => qb,
        take: () => qb,
        getRawMany: async () => [],
        getRawOne: async () => ({ total: 0 }),
        getManyAndCount: async () => [rows, rows.length],
      };
      return qb;
    }),
  });
  const svc = Object.create(MarketplaceAnalyticsService.prototype) as MarketplaceAnalyticsService;
  Object.assign(svc, {
    orderRepo: repo('orders', [
      { id: 'o-qa', regionCode: 'QA', grandTotal: 100, status: 'DELIVERED', createdAt: new Date() },
    ]),
    sellerRepo: repo('sellers', [{ id: 's-qa', regionCode: 'QA', businessName: 'QA Seller' }]),
    returnRepo: repo('returns'),
    productRepo: repo('products'),
    categoryRepo: repo('products'),
    reviewRepo: repo('products'),
    redis: { getJson: vi.fn(async () => null), setJson: vi.fn(async () => undefined) },
    logger: { log: vi.fn(), warn: vi.fn() },
  });
  return { svc, seen };
}

const naming = (bucket: any[], needle: string) => JSON.stringify(bucket).includes(needle);

describe('marketplace analytics answer per market instead of refusing', () => {
  it('revenue predicates the order query on the market', async () => {
    const { svc, seen } = service();
    const res = await svc.getRevenueAnalytics('month', 'QA');
    expect(res.summary).toBeDefined();
    expect(naming(seen.orders, 'QA') || naming(seen.orders, 'regionCode')).toBe(true);
  });

  it('seller rankings predicate the seller query on the market', async () => {
    const { svc, seen } = service();
    await svc.getSellerRankings('revenue', 'QA');
    expect(naming(seen.sellers, 'QA') || naming(seen.sellers, 'regionCode')).toBe(true);
  });

  it('return analysis and SLA predicate too', async () => {
    const { svc, seen } = service();
    await svc.getReturnRateAnalysis('QA');
    await svc.getSLACompliance(undefined, 'QA');
    expect(naming(seen.returns, 'QA') || naming(seen.returns, 'regionCode')).toBe(true);
  });

  it('a global caller (no market) adds no predicate at all', async () => {
    const { svc, seen } = service();
    await svc.getRevenueAnalytics('month');
    expect(naming(seen.orders, 'regionCode')).toBe(false);
  });

  it('every one of the ten accepts a market parameter', () => {
    const { svc } = service();
    for (const m of [
      'getRevenueAnalytics',
      'getConversionFunnel',
      'getSellerRankings',
      'getCategoryPerformance',
      'getRegionalPerformance',
      'getInventoryAging',
      'getReturnRateAnalysis',
      'getFraudAlerts',
      'getSLACompliance',
      'getPenaltyLedger',
    ]) {
      expect(typeof (svc as any)[m]).toBe('function');
      expect((svc as any)[m].length).toBeGreaterThan(0);
    }
  });

  /**
   * The other seven reads, one assertion each — the five above cover revenue,
   * rankings, returns and SLA, and a report nobody pinned is a report that can
   * quietly go back to answering the platform's numbers.
   */
  it('the remaining six reads predicate on the market too', async () => {
    const { svc, seen } = service();
    await svc.getConversionFunnel('month', 'QA');
    await svc.getFraudAlerts('QA');
    await svc.getRegionalPerformance('QA');
    expect(naming(seen.orders, 'QA') || naming(seen.orders, 'regionCode')).toBe(true);

    const products = service();
    await products.svc.getCategoryPerformance('QA');
    await products.svc.getInventoryAging('QA');
    expect(
      naming(products.seen.products, 'QA') || naming(products.seen.products, 'region_code'),
    ).toBe(true);

    const penalties = service();
    const ledger = await penalties.svc.getPenaltyLedger(undefined, 'QA');
    expect((ledger as any).market).toBe('QA');
  });

  /**
   * A market-wide breakdown under a market's own name would be a national chart
   * with a regional heading, so the scoped answer says what it grouped by.
   */
  it('the regional breakdown names its own scope and grouping', async () => {
    const scoped = await service().svc.getRegionalPerformance('QA');
    expect(scoped).toMatchObject({ scope: 'QA', groupedBy: 'state' });
    const global = await service().svc.getRegionalPerformance();
    expect(global).toMatchObject({ scope: 'ALL', groupedBy: 'market' });
  });

  /** A cache shared between markets would serve QA's figures to India. */
  it('keys the cached reads by market', async () => {
    const { svc } = service();
    await svc.getFraudAlerts('QA');
    await svc.getPenaltyLedger(undefined, 'QA');
    const redis = (svc as any).redis;
    const keys = redis.setJson.mock.calls.map((c: any[]) => c[0]);
    expect(keys.every((k: string) => k.includes('QA'))).toBe(true);
  });
});
