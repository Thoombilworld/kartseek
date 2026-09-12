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
    expect(sql).toContain('bo.regionCode = :region');
    expect(sql).toContain('bo.status = :status');
    expect(bank.calls.findIndex((c) => c.sql.includes('regionCode'))).toBeLessThan(
      bank.calls.findIndex((c) => c.sql.includes('status')),
    );
  });

  it('keeps the strict market clause alongside the activeOnly clauses (exchange offers)', async () => {
    const { svc, exchange } = service();
    await svc.listExchangeOffers(true, 'phones', 'QA', true);
    const sql = exchange.calls.map((c) => c.sql);
    expect(sql).toContain('eo.applicableCountries = :region');
    expect(sql).toContain('eo.status = :status');
  });

  it('still filters by market when no status filter is asked for', async () => {
    const { svc, bank } = service();
    await svc.listBankOffers(false, undefined, 'QA', true);
    expect(bank.calls.map((c) => c.sql)).toEqual(['bo.regionCode = :region']);
  });
});
