import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { PaymentOrchestratorService } from '../payment.service';

/**
 * The payments dashboard and the module-revenue read both took a COLLAPSED lock
 * through `normaliseMarket` alone.
 *
 * `countryCode` on these two methods is, in the docstring's own words, "the
 * market the gateway resolved for the caller — their own when they are
 * region-locked". `normaliseMarket` returns `undefined` for a code the registry
 * cannot read, `applyMarketFilter` then adds no predicate, and a region-locked
 * admin's dashboard totalled every market. Reachable by any direct TCP caller;
 * refused over HTTP since `resolveMarket` started refusing at source (R3-1).
 */
function build() {
  const qb: any = {
    select: () => qb,
    addSelect: () => qb,
    where: () => qb,
    andWhere: vi.fn(() => qb),
    groupBy: () => qb,
    orderBy: () => qb,
    limit: () => qb,
    take: () => qb,
    leftJoinAndSelect: () => qb,
    clone: () => qb,
    skip: () => qb,
    offset: () => qb,
    getManyAndCount: async () => [[], 0],
    getRawOne: async () => ({}),
    getRawMany: async () => [],
    getMany: async () => [],
    getCount: async () => 0,
  };
  const paymentRepo = { createQueryBuilder: vi.fn(() => qb), find: vi.fn(async () => []) };
  const svc = Object.create(PaymentOrchestratorService.prototype) as PaymentOrchestratorService;
  Object.assign(svc, { paymentRepo, logger: { warn: vi.fn(), log: vi.fn(), error: vi.fn() } });
  return { svc, qb, paymentRepo };
}

describe('an unreadable market refuses on the payment reads', () => {
  it('getPaymentsDashboard refuses ZZ, QAT and NOT-A-COUNTRY before any query', async () => {
    for (const bad of ['ZZ', 'QAT', 'NOT-A-COUNTRY']) {
      const { svc, paymentRepo } = build();
      await expect((svc as any).getPaymentsDashboard({ countryCode: bad })).rejects.toThrow(
        ForbiddenException,
      );
      expect(paymentRepo.createQueryBuilder).not.toHaveBeenCalled();
    }
  });

  it('getModuleRevenue refuses the same', async () => {
    for (const bad of ['ZZ', 'QAT', 'NOT-A-COUNTRY']) {
      const { svc, paymentRepo } = build();
      await expect(
        (svc as any).getModuleRevenue('marketplace', '2026-09-01', '2026-09-30', bad),
      ).rejects.toThrow(ForbiddenException);
      expect(paymentRepo.createQueryBuilder).not.toHaveBeenCalled();
    }
  });

  it('puts a readable market in the predicate', async () => {
    const { svc, qb } = build();
    await (svc as any).getPaymentsDashboard({ countryCode: 'qa' });
    expect(qb.andWhere).toHaveBeenCalledWith('p.countryCode = :__market', { __market: 'QA' });
  });

  it('adds no predicate at all when no market is given', async () => {
    const { svc, qb } = build();
    await (svc as any).getPaymentsDashboard({});
    const marketCalls = qb.andWhere.mock.calls.filter((c: unknown[]) =>
      String(c[0]).includes('countryCode'),
    );
    expect(marketCalls).toEqual([]);
  });
});
