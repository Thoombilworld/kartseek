import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { SettlementEngineService } from './settlement-engine.service';

/**
 * A lock this platform cannot read must not open a seller's balance.
 *
 * `getSellerBalance` and `getFranchiseEarnings` both opened with
 * `const lock = normaliseMarket(scope); if (lock) await assertRecipientInMarket(…)`
 * — a readability gate deciding absent-vs-unreadable for itself. Once
 * `normaliseMarket` became registry-backed, a lock such as `ZZ` skipped the
 * recipient assert entirely; and the predicate on the line below took the
 * SEPARATE `market` argument, which is `undefined` for a caller who only sent a
 * scope. So any seller's balance came back, summed across every market. Before
 * the strict change the same lock filtered to a plausible wrong market
 * (R11 fix round 3 / R2-1).
 *
 * Money reads are exactly where this matters: "this seller has earned nothing"
 * and "this seller is not yours" must not look the same, and neither must "here
 * is what this seller earned everywhere".
 */
function build() {
  const raw: Array<Record<string, unknown>> = [];
  const qb: any = {
    select: () => qb,
    addSelect: () => qb,
    where: () => qb,
    andWhere: vi.fn(() => qb),
    groupBy: () => qb,
    getRawMany: async () => raw,
  };
  const settlementRepo = { createQueryBuilder: vi.fn(() => qb), findOne: vi.fn(), find: vi.fn() };
  const svc = Object.create(SettlementEngineService.prototype) as SettlementEngineService;
  Object.assign(svc, {
    settlementRepo,
    logger: { warn: vi.fn(), log: vi.fn(), error: vi.fn() },
  });
  // The recipient assert has its own spec elsewhere; here it must simply RUN.
  const assertRecipient = vi.fn(async () => undefined);
  (svc as any).assertRecipientInMarket = assertRecipient;
  return { svc, qb, settlementRepo, assertRecipient };
}

describe('an unreadable lock cannot widen a settlement read', () => {
  for (const [name, call] of [
    [
      'getSellerBalance',
      (svc: any, scope?: string) => svc.getSellerBalance('S1', undefined, scope),
    ],
    [
      'getFranchiseEarnings',
      (svc: any, scope?: string) => svc.getFranchiseEarnings('FR1', undefined, scope),
    ],
  ] as Array<[string, (svc: any, scope?: string) => Promise<unknown>]>) {
    it(`${name} refuses ZZ, QAT and NOT-A-COUNTRY before any query`, async () => {
      for (const brokenLock of ['ZZ', 'QAT', 'NOT-A-COUNTRY']) {
        const { svc, settlementRepo, assertRecipient } = build();
        await expect(call(svc, brokenLock)).rejects.toThrow(ForbiddenException);
        expect(assertRecipient).not.toHaveBeenCalled();
        expect(settlementRepo.createQueryBuilder).not.toHaveBeenCalled();
      }
    });

    it(`${name} asserts the recipient and predicates on the lock for a real market`, async () => {
      const { svc, qb, assertRecipient } = build();
      await call(svc, 'qa');
      expect(assertRecipient).toHaveBeenCalled();
      // The LOCK reaches the predicate, not just the separate `market` argument.
      expect(qb.andWhere).toHaveBeenCalledWith('s.countryCode = :__market', { __market: 'QA' });
    });

    it(`${name} stays global for a genuinely absent scope`, async () => {
      const { svc, qb, assertRecipient } = build();
      await call(svc, undefined);
      expect(assertRecipient).not.toHaveBeenCalled();
      const marketCalls = qb.andWhere.mock.calls.filter((c: unknown[]) =>
        String(c[0]).includes('countryCode'),
      );
      expect(marketCalls).toEqual([]);
    });
  }

  it('the dashboard summary refuses an unreadable market filter too', async () => {
    const { svc } = build();
    await expect((svc as any).getDashboardSummary({ countryCode: 'ZZ' })).rejects.toThrow(
      ForbiddenException,
    );
  });
});
