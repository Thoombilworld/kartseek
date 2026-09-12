import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException, NotImplementedException } from '@nestjs/common';
import { AdminService } from './admin.service';

/** Minimal doubles: a Redis with the pending-KYC keys, an EntityManager whose
 *  query builder records the predicates it was given, a Kafka that swallows.
 *
 *  `userRegion` is what the `users` row hands back as its market on a ban/unban
 *  check; `index` seeds `admin:users:index` and `dbDown` switches the database
 *  off (`em: null`), which is the only way to reach the Redis fallback. */
function makeService(
  overrides: {
    userRegion?: string | null;
    kyc?: Record<string, any>;
    index?: any[];
    rows?: any[];
    dbDown?: boolean;
  } = {},
) {
  const store = new Map<string, any>(Object.entries(overrides.kyc ?? {}));
  if (overrides.index) store.set('admin:users:index', overrides.index);
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
  const selects: string[] = [];
  const qb: any = {
    select: (s: string) => {
      selects.push(s);
      return qb;
    },
    addSelect: (s: string, alias?: string) => {
      selects.push(alias ? `${s} AS ${alias}` : s);
      return qb;
    },
    from: () => qb,
    andWhere: (s: string) => {
      where.push(s);
      return qb;
    },
    where: (s: string) => {
      where.push(s);
      return qb;
    },
    clone: () => qb,
    orderBy: () => qb,
    offset: () => qb,
    limit: () => qb,
    getRawMany: async () => overrides.rows ?? [],
    // The service's own aliases: `u_total` for the count, and the two columns
    // `userMarket` asks for. The names matter — a metadata-less alias returns
    // exactly the aliases the SQL names, which is what the `u_`-prefixed read
    // used to get wrong.
    getRawOne: async () => ({
      total: String((overrides.rows ?? []).length),
      u_id: 'user-1',
      u_region_code: overrides.userRegion ?? null,
    }),
  };
  // Every `em.query` the service issues, so a spec can assert what a moderation
  // action actually wrote — and that a refused one wrote nothing.
  const queries: { sql: string; params: unknown[] }[] = [];
  const em: any = {
    createQueryBuilder: () => qb,
    query: vi.fn(async (sql: string, params: unknown[] = []) => {
      queries.push({ sql, params });
      return [{ id: 'user-1' }];
    }),
  };
  // Constructor order as of 2026-09-11: (redis, kafka, layoutRepo, em).
  const svc = new AdminService(redis as any, kafka as any, {} as any, overrides.dbDown ? null : em);
  return { svc, where, selects, kafka, store, queries };
}

describe('AdminService market scope', () => {
  // The two `it`s that used to open this block — "adds the scope predicate to
  // the users list" and "refuses to ban a user from another market" — asserted
  // the predicate and the ban check against `u.country`. Both are superseded by
  // the `u.region_code` block at the bottom of this file, which covers the same
  // two cases plus the NULL one; keeping them would have asserted the very
  // column audit V6 says must not be read.

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

  it('adds a market predicate to the dashboard aggregate and keys the cache by scope', async () => {
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
    // region_code, not country: the counter under a market's name has to count
    // the same rows the users list under that market shows.
    expect(usersCall?.[0]).toEqual(expect.stringContaining('region_code = $2'));
    expect(usersCall?.[0]).not.toEqual(expect.stringContaining('country = $2'));
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
              { id: 'u-qa', regionCode: 'QA' },
              { id: 'u-in', regionCode: 'IN' },
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

describe('AdminService scopes users on the market the claim is minted from', () => {
  it('narrows the users list on u.region_code, not on u.country', async () => {
    const { svc, where } = makeService();
    await svc.getUsersList(1, 20, undefined, undefined, undefined, 'QA');
    expect(where.some((w) => w.includes('u.region_code = :scope'))).toBe(true);
    // `users.country` defaults to 'IN' on every row, so scoping on it handed an
    // IN admin every customer on the platform and a QA admin none (audit V6).
    expect(where.some((w) => w.includes('u.country'))).toBe(false);
  });

  it('ignores a conflicting ?country= filter when the caller is locked', async () => {
    const { svc, where } = makeService();
    await svc.getUsersList(1, 20, undefined, 'IN', undefined, 'QA');
    expect(where.filter((w) => w.includes('region_code'))).toEqual(['u.region_code = :scope']);
  });

  it('lets a global admin filter by market without a scope predicate', async () => {
    const { svc, where } = makeService();
    await svc.getUsersList(1, 20, undefined, 'in', undefined, undefined);
    expect(where).toContain('u.region_code = :market');
    expect(where.some((w) => w.includes(':scope'))).toBe(false);
  });

  it('refuses to ban a user whose region_code is another market, and one with none at all', async () => {
    for (const region of ['IN', null]) {
      const { svc, kafka } = makeService({ userRegion: region });
      await expect(svc.banUser('user-1', 'fraud', 'admin-qa', 'QA')).rejects.toThrow(
        ForbiddenException,
      );
      expect(kafka.publish).not.toHaveBeenCalled();
    }
  });

  it('bans a user in the same market — the control', async () => {
    const { svc, kafka } = makeService({ userRegion: 'QA' });
    await expect(svc.banUser('user-1', 'fraud', 'admin-qa', 'QA')).resolves.toBeDefined();
    expect(kafka.publish).toHaveBeenCalled();
  });

  it('excludes an unattributable user from the Redis fallback list rather than showing them', async () => {
    const { svc } = makeService({
      index: [
        { id: 'a', regionCode: 'QA' },
        { id: 'b', regionCode: 'IN' },
        { id: 'c', regionCode: null, country: 'IN' },
      ],
      dbDown: true,
    });
    const res = await svc.getUsersList(1, 20, undefined, undefined, undefined, 'QA');
    expect(res.data.map((u: any) => u.id)).toEqual(['a']);
  });
});

/**
 * The two faults the live probe of this change found, both older than it.
 *
 * Neither is about which column is read, which is why the scope specs above
 * passed throughout: the users list could not return a row at all, and the
 * ban check could not read a market at all. The first made every market's list
 * empty; the second refused a locked admin every ban, including in their own
 * market, and said the account "belongs to every market" while doing it.
 */
describe('AdminService reads a table it has no entity metadata for', () => {
  it('returns the rows the database gave it instead of falling through to Redis', async () => {
    const { svc } = makeService({
      rows: [
        { id: 'a', email: 'a@x.test', region_code: 'QA' },
        { id: 'b', email: 'b@x.test', region_code: 'QA' },
      ],
    });
    const res = await svc.getUsersList(1, 20, undefined, undefined, undefined, 'QA');
    // `getManyAndCount()` threw on every call ("Cannot get entity metadata for
    // the given alias u"), so this used to be [] with total 0 for everybody.
    expect(res.data.map((u: any) => u.id)).toEqual(['a', 'b']);
    expect(res.total).toBe(2);
  });

  it('never selects passwordHash or refreshToken into a list response', async () => {
    const { svc, selects } = makeService({ rows: [] });
    await svc.getUsersList(1, 20);
    const columns = selects.join(' ');
    expect(columns).toContain('u.region_code');
    expect(columns).not.toContain('passwordHash');
    expect(columns).not.toContain('refreshToken');
  });

  it('searches the columns the table has, not a u.name that does not exist', async () => {
    const { svc, where } = makeService({ rows: [] });
    await svc.getUsersList(1, 20, undefined, undefined, 'ali');
    const search = where.find((w) => w.includes('ILIKE'));
    expect(search).toBeDefined();
    expect(search).toContain('u."firstName"');
    expect(search).not.toContain('u.name ');
  });

  it('aliases the market column so the ban check can actually read it', async () => {
    const { svc, selects } = makeService({ userRegion: 'QA' });
    await svc.banUser('user-1', 'fraud', 'admin-qa', 'QA');
    // Without the explicit alias the raw row comes back as { id, region_code }
    // and `u_region_code` is undefined — which reads as "no market" and fails
    // closed on every ban a locked admin attempts.
    expect(selects).toContain('u.region_code AS u_region_code');
  });
});

/**
 * A ban is a record, not just a flag.
 *
 * `banned_reason` did not exist on `public.users`, so the UPDATE behind every
 * ban failed with 42703 and `applyUserStatus` turned that into a 500: no ban
 * had ever persisted, for any administrator, scoped or global. The column pair
 * arrives with `1786502000000-UserBanColumns`; these specs are what say the
 * moderation action writes the reason and the moment, clears them again on an
 * unban, and writes nothing at all when the market check refuses it.
 *
 * The status strings are the platform's own vocabulary (`AppStatus`), not the
 * 'BANNED'/'ACTIVE' this code used to write: nothing in the platform reads
 * those, and an unban that set 'ACTIVE' left the account uncounted by every
 * `status = 'active'` filter, the dashboard's own included.
 */
describe('AdminService records a ban', () => {
  const updateOf = (queries: { sql: string; params: unknown[] }[]) =>
    queries.find((q) => /UPDATE users/i.test(q.sql));

  it('writes the reason and the moment for a user in the caller’s own market', async () => {
    const { svc, queries } = makeService({ userRegion: 'QA' });
    const res = await svc.banUser('user-1', 'fraud', 'admin-qa', 'QA');

    const update = updateOf(queries);
    expect(update).toBeDefined();
    expect(update!.sql).toMatch(/banned_reason = \$/);
    expect(update!.sql).toMatch(/banned_at = \$/);
    expect(update!.sql).toMatch(/status = 'suspended'/);
    // reason, the timestamp, then the id — one timestamp for the row, the
    // Redis marker and the Kafka event, so the record and the event agree.
    expect(update!.params[0]).toBe('fraud');
    expect(String(update!.params[1])).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(update!.params[2]).toBe('user-1');
    expect(res.status).toBe('suspended');
  });

  it('clears both on an unban', async () => {
    const { svc, queries } = makeService({ userRegion: 'QA' });
    const res = await svc.unbanUser('user-1', 'admin-qa', 'QA');

    const update = updateOf(queries);
    expect(update!.sql).toMatch(/banned_reason = NULL/);
    expect(update!.sql).toMatch(/banned_at = NULL/);
    expect(update!.sql).toMatch(/status = 'active'/);
    expect(res.status).toBe('active');
  });

  it('writes nothing at all when the market check refuses the ban', async () => {
    const { svc, queries, kafka } = makeService({ userRegion: 'IN' });
    await expect(svc.banUser('user-1', 'fraud', 'admin-qa', 'QA')).rejects.toThrow(
      ForbiddenException,
    );
    expect(queries.some((q) => /UPDATE users/i.test(q.sql))).toBe(false);
    expect(kafka.publish).not.toHaveBeenCalled();
  });
});
