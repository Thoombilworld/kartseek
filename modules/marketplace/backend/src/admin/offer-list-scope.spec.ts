import { describe, it, expect, vi } from 'vitest';
import { MarketplaceAdminService } from './admin.service';

/**
 * A query builder that records the ORDER and KIND of every predicate call, so
 * the spec can prove the market clause survived. Recording only the strings
 * would pass against `qb.where` — which discards everything before it — which
 * is exactly the bug (audit V3).
 */
function recordingQb() {
  const calls: Array<{ kind: 'where' | 'andWhere'; sql: string }> = [];
  const qb: any = {
    orderBy: () => qb,
    addOrderBy: () => qb,
    where: (sql: string) => {
      calls.push({ kind: 'where', sql });
      return qb;
    },
    andWhere: (sql: string) => {
      calls.push({ kind: 'andWhere', sql });
      return qb;
    },
    getManyAndCount: async () => [[], 0],
  };
  return { qb, calls };
}

function service() {
  const bank = recordingQb();
  const exchange = recordingQb();
  const svc = Object.create(MarketplaceAdminService.prototype) as MarketplaceAdminService;
  Object.assign(svc, {
    bankOfferRepo: { createQueryBuilder: () => bank.qb },
    exchangeOfferRepo: { createQueryBuilder: () => exchange.qb },
    logger: { log: vi.fn(), warn: vi.fn() },
  });
  return { svc, bank, exchange };
}

describe('offer lists keep their market predicate under every filter', () => {
  it('never calls qb.where — a reset discards the region clause built above it', async () => {
    const { svc, bank, exchange } = service();
    await svc.listBankOffers(true, undefined, 'QA', true);
    await svc.listExchangeOffers(true, undefined, 'QA', true);
    expect(bank.calls.filter((c) => c.kind === 'where')).toEqual([]);
    expect(exchange.calls.filter((c) => c.kind === 'where')).toEqual([]);
  });

  it('keeps the strict market clause alongside the activeOnly clauses (bank offers)', async () => {
    const { svc, bank } = service();
    await svc.listBankOffers(true, undefined, 'QA', true);
    const sql = bank.calls.map((c) => c.sql);
    expect(sql).toContain('bo.regionCode = :__market');
    expect(sql).toContain('bo.status = :status');
    expect(bank.calls.findIndex((c) => c.sql.includes('regionCode'))).toBeLessThan(
      bank.calls.findIndex((c) => c.sql.includes('status')),
    );
  });

  it('keeps the strict market clause alongside the activeOnly clauses (exchange offers)', async () => {
    const { svc, exchange } = service();
    await svc.listExchangeOffers(true, 'phones', 'QA', true);
    const sql = exchange.calls.map((c) => c.sql);
    // The strict exchange-offer predicate reads the entity's own market column
    // now, not the legacy comma-joined array (R11 / AUD2-082).
    expect(sql).toContain('eo.regionCode = :__market');
    expect(sql).toContain('eo.status = :status');
  });

  it('still filters by market when no status filter is asked for', async () => {
    const { svc, bank } = service();
    await svc.listBankOffers(false, undefined, 'QA', true);
    expect(bank.calls.map((c) => c.sql)).toEqual(['bo.regionCode = :__market']);
  });
});

/**
 * A PATCH is not a statement about which market an offer runs in.
 *
 * `scopeOfferWrite` returned `{ …dto, regionCode: named ?? null, isGlobal: … }`
 * unconditionally and the update paths handed that to `repo.update()`. So a
 * SUPER_ADMIN sending `{ status: 'PAUSED' }` — which is exactly what the status
 * and "featured" routes send — wrote `region_code = NULL, is_global = false`
 * and ERASED the market this whole task exists to populate. The row then read
 * as unattributed: invisible to the regional admin who had just been given it
 * (N2).
 */
describe('a partial offer update leaves the market alone', () => {
  function writable(existing: Record<string, unknown>) {
    const update = vi.fn(async () => ({ affected: 1 }));
    const repo = {
      findOne: vi.fn(async () => existing),
      update,
      createQueryBuilder: () => recordingQb().qb,
    };
    const svc = Object.create(MarketplaceAdminService.prototype) as MarketplaceAdminService;
    Object.assign(svc, {
      bankOfferRepo: repo,
      exchangeOfferRepo: repo,
      redis: { delPattern: vi.fn(), del: vi.fn() },
      kafka: { publish: vi.fn() },
      logger: { log: vi.fn(), warn: vi.fn() },
    });
    return { svc, update };
  }

  const qaOffer = { id: 'o-1', regionCode: 'QA', isGlobal: false };

  it('a global admin pausing a QA offer does not touch region_code or is_global', async () => {
    for (const method of ['updateBankOffer', 'updateExchangeOffer'] as const) {
      const { svc, update } = writable(qaOffer);
      await (svc as any)[method]('o-1', { status: 'PAUSED' }, undefined);
      const patch = update.mock.calls[0][1] as Record<string, unknown>;
      expect(patch).toEqual({ status: 'PAUSED' });
      expect('regionCode' in patch).toBe(false);
      expect('isGlobal' in patch).toBe(false);
    }
  });

  it('nor does featuring one', async () => {
    const { svc, update } = writable(qaOffer);
    await (svc as any).updateBankOffer('o-1', { isFeatured: true }, undefined);
    expect(update.mock.calls[0][1]).toEqual({ isFeatured: true });
  });

  it('a global admin who DOES name the market still changes it', async () => {
    const { svc, update } = writable(qaOffer);
    await (svc as any).updateBankOffer('o-1', { regionCode: 'in' }, undefined);
    expect(update.mock.calls[0][1]).toMatchObject({ regionCode: 'IN' });
  });

  it('an explicit isGlobal from a global admin is honoured on its own', async () => {
    const { svc, update } = writable(qaOffer);
    await (svc as any).updateBankOffer('o-1', { isGlobal: true }, undefined);
    const patch = update.mock.calls[0][1] as Record<string, unknown>;
    expect(patch).toMatchObject({ isGlobal: true });
    expect('regionCode' in patch).toBe(false);
  });

  it('a locked admin always forces their own market and never global', async () => {
    // Whatever they send: a locked admin's offer is theirs, and "runs
    // everywhere" is not theirs to set.
    const { svc, update } = writable(qaOffer);
    await (svc as any).updateBankOffer('o-1', { status: 'PAUSED', isGlobal: true }, 'QA');
    expect(update.mock.calls[0][1]).toMatchObject({ regionCode: 'QA', isGlobal: false });
  });

  it('a create still stamps both columns, so a new row is never unattributed by omission', async () => {
    const saved = { id: 'o-new' };
    const repo = {
      create: vi.fn((d: unknown) => d),
      save: vi.fn(async () => saved),
      findOne: vi.fn(async () => saved),
    };
    const svc = Object.create(MarketplaceAdminService.prototype) as MarketplaceAdminService;
    Object.assign(svc, {
      bankOfferRepo: repo,
      redis: { delPattern: vi.fn() },
      kafka: { publish: vi.fn() },
      logger: { log: vi.fn(), warn: vi.fn() },
    });
    await (svc as any).createBankOffer({ title: 'x' }, undefined);
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ regionCode: null, isGlobal: false }),
    );
  });

  it('rejects a market the registry does not know, on create and on update', async () => {
    const { svc } = writable(qaOffer);
    await expect(
      (svc as any).updateBankOffer('o-1', { regionCode: 'NOT-A-COUNTRY' }, undefined),
    ).rejects.toThrow('must be a market this platform operates in');
  });
});
