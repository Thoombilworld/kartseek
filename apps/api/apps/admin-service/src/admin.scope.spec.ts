import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException, NotImplementedException } from '@nestjs/common';
import { AdminService } from './admin.service';

/** Minimal doubles: a Redis with the pending-KYC keys, an EntityManager whose
 *  query builder records the predicates it was given, a Kafka that swallows. */
function makeService(overrides: { userCountry?: string | null; kyc?: Record<string, any> } = {}) {
  const store = new Map<string, any>(Object.entries(overrides.kyc ?? {}));
  const redis = {
    keys: vi.fn(async (pattern: string) =>
      [...store.keys()].filter((k) => k.startsWith(pattern.replace('*', ''))),
    ),
    getJson: vi.fn(async (k: string) => store.get(k) ?? null),
    setJson: vi.fn(async () => undefined),
    get: vi.fn(async () => '0'),
    set: vi.fn(async () => undefined),
    del: vi.fn(async (k: string) => {
      store.delete(k);
    }),
  };
  const kafka = { publish: vi.fn(async () => undefined) };
  const where: string[] = [];
  const qb: any = {
    select: () => qb,
    from: () => qb,
    andWhere: (s: string) => {
      where.push(s);
      return qb;
    },
    where: (s: string) => {
      where.push(s);
      return qb;
    },
    orderBy: () => qb,
    skip: () => qb,
    take: () => qb,
    getManyAndCount: async () => [[], 0],
    getRawOne: async () => ({ u_id: 'user-1', u_country: overrides.userCountry ?? 'IN' }),
  };
  const em: any = { createQueryBuilder: () => qb, query: vi.fn(async () => [{ id: 'user-1' }]) };
  // Constructor order as of 2026-09-11: (redis, kafka, layoutRepo, em).
  const svc = new AdminService(redis as any, kafka as any, {} as any, em);
  return { svc, where, kafka, store };
}

describe('AdminService market scope', () => {
  it('adds the scope predicate to the users list and ignores a conflicting country', async () => {
    const { svc, where } = makeService();
    await svc.getUsersList(1, 20, undefined, 'IN', undefined, 'QA');
    expect(where.some((w) => w.includes('u.country = :scope'))).toBe(true);
    expect(where.some((w) => w.includes('u.country = :country'))).toBe(false);
  });

  it('refuses to ban a user from another market', async () => {
    const { svc, kafka } = makeService({ userCountry: 'IN' });
    await expect(svc.banUser('user-1', 'fraud', 'admin-qa', 'QA')).rejects.toThrow(
      ForbiddenException,
    );
    expect(kafka.publish).not.toHaveBeenCalled();
  });

  it("lists only the scoped market's pending KYC records", async () => {
    const { svc } = makeService({
      kyc: {
        'admin:kyc:pending:seller:a': { id: 'a', country: 'QA', submittedAt: '2026-09-01' },
        'admin:kyc:pending:seller:b': { id: 'b', country: 'IN', submittedAt: '2026-09-02' },
      },
    });
    const res = await svc.getPendingKyc(1, 20, 'QA');
    expect(res.data.map((r: any) => r.id)).toEqual(['a']);
    expect(res.total).toBe(1);
  });

  it('refuses to approve a KYC record from another market and leaves it pending', async () => {
    const { svc, store } = makeService({
      kyc: { 'admin:kyc:pending:seller:b': { id: 'b', country: 'IN', submittedAt: '2026-09-02' } },
    });
    await expect(svc.approveKyc('b', 'seller', 'admin-qa', 'QA')).rejects.toThrow(
      ForbiddenException,
    );
    expect(store.has('admin:kyc:pending:seller:b')).toBe(true);
  });

  it('adds a country predicate to the dashboard aggregate and keys the cache by scope', async () => {
    const query = vi.fn(async () => [{}]);
    const redis = {
      keys: vi.fn(async () => []),
      getJson: vi.fn(async () => null),
      setJson: vi.fn(async () => undefined),
      get: vi.fn(async () => '0'),
      set: vi.fn(async () => undefined),
      del: vi.fn(async () => undefined),
    };
    const kafka = { publish: vi.fn(async () => undefined) };
    const em: any = { query };
    const svc = new AdminService(redis as any, kafka as any, {} as any, em);
    const today = new Date().toISOString().slice(0, 10);

    await svc.getDashboardStats('QA');

    const usersCall = query.mock.calls.find((c) => String(c[0]).includes('public.users'));
    expect(usersCall?.[0]).toEqual(expect.stringContaining('country = $2'));
    expect(usersCall?.[1]).toEqual([today, 'QA']);

    const ordersCall = query.mock.calls.find((c) => String(c[0]).includes('order".orders'));
    expect(ordersCall?.[0]).toEqual(expect.stringContaining('region_code = $2'));
    expect(ordersCall?.[1]).toEqual([today, 'QA']);
  });

  it('refuses a scoped revenue report — not tracked per market yet', async () => {
    const { svc } = makeService();
    await expect(svc.getRevenueReport('2026-09-01', '2026-09-02', 'day', 'QA')).rejects.toThrow(
      NotImplementedException,
    );
  });

  it('keeps the users list market-scoped when it falls back to the Redis index', async () => {
    // isDbActive() is false with em: null, so getUsersList never reaches the
    // query builder and must filter admin:users:index itself.
    const redis = {
      keys: vi.fn(async () => []),
      getJson: vi.fn(async (k: string) =>
        k === 'admin:users:index'
          ? [
              { id: 'u-qa', country: 'QA' },
              { id: 'u-in', country: 'IN' },
            ]
          : null,
      ),
      setJson: vi.fn(async () => undefined),
      get: vi.fn(async () => '0'),
      set: vi.fn(async () => undefined),
      del: vi.fn(async () => undefined),
    };
    const kafka = { publish: vi.fn(async () => undefined) };
    const svc = new AdminService(redis as any, kafka as any, {} as any, null);

    const res = await svc.getUsersList(1, 20, undefined, undefined, undefined, 'QA');

    expect(res.data.map((u: any) => u.id)).toEqual(['u-qa']);
    expect(res.total).toBe(1);
  });
});
