import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { GroceryAdminService } from './admin.service';
import { GroceryService } from '../grocery.service';
import { FlashDealStatus } from '../entities/grocery-flash-deal.entity';

function qbRecorder(rows: any[] = []) {
  const where: string[] = [];
  const qb: any = {
    leftJoinAndSelect: () => qb,
    leftJoin: () => qb,
    innerJoin: () => qb,
    andWhere: (s: string) => {
      where.push(s);
      return qb;
    },
    orderBy: () => qb,
    skip: () => qb,
    take: () => qb,
    getManyAndCount: async () => [rows, rows.length],
  };
  return { qb, where };
}

describe('GroceryAdminService market scope', () => {
  it('filters stores by the scoped market', async () => {
    const { qb, where } = qbRecorder();
    const svc = Object.create(GroceryAdminService.prototype) as GroceryAdminService;
    Object.assign(svc, { storeRepo: { createQueryBuilder: () => qb } });
    await svc.listStores({ regionCode: 'QA' });
    expect(where).toContain('s.regionCode = :__market');
  });

  it("filters orders through the store's market", async () => {
    const { qb, where } = qbRecorder();
    const svc = Object.create(GroceryAdminService.prototype) as GroceryAdminService;
    Object.assign(svc, { orderRepo: { createQueryBuilder: () => qb } });
    await svc.listOrders({ regionCode: 'QA' });
    expect(where).toContain('store.regionCode = :__market');
  });

  /**
   * The lock arrives in this field, so an unreadable one must refuse.
   *
   * `grocery.controller.ts` collapses the two slots — `regionCode: d?.scope ??
   * d?.regionCode` — so a region-locked admin's market lands in the FILTER
   * slot, where `applyMarketFilter` deliberately ignores a value it cannot
   * read. Ignored means no predicate: every market's stores, orders and flash
   * deals, to an admin restricted to one (N1). The gateway refuses such a lock
   * at source now; this is the service-side line for a TCP caller and for a
   * global admin's typo.
   */
  it('refuses an unreadable market filter rather than listing every market', async () => {
    for (const bad of ['NOT-A-COUNTRY', 'ZZ', 'QAT']) {
      const stores = qbRecorder();
      const svcS = Object.create(GroceryAdminService.prototype) as GroceryAdminService;
      Object.assign(svcS, {
        storeRepo: { createQueryBuilder: () => stores.qb },
        logger: { warn: vi.fn() },
      });
      await expect(svcS.listStores({ regionCode: bad })).rejects.toThrow(ForbiddenException);
      expect(stores.where).toEqual([]);

      const orders = qbRecorder();
      const svcO = Object.create(GroceryAdminService.prototype) as GroceryAdminService;
      Object.assign(svcO, {
        orderRepo: { createQueryBuilder: () => orders.qb },
        logger: { warn: vi.fn() },
      });
      await expect(svcO.listOrders({ regionCode: bad })).rejects.toThrow(ForbiddenException);
      expect(orders.where).toEqual([]);
    }
  });

  it('still lists one market for a readable filter', async () => {
    const { qb, where } = qbRecorder();
    const svc = Object.create(GroceryAdminService.prototype) as GroceryAdminService;
    Object.assign(svc, {
      storeRepo: { createQueryBuilder: () => qb },
      logger: { warn: vi.fn() },
    });
    await svc.listStores({ regionCode: 'qa' });
    expect(where).toContain('s.regionCode = :__market');
  });

  it('lists every market only when no filter is given at all', async () => {
    const { qb, where } = qbRecorder();
    const svc = Object.create(GroceryAdminService.prototype) as GroceryAdminService;
    Object.assign(svc, {
      storeRepo: { createQueryBuilder: () => qb },
      logger: { warn: vi.fn() },
    });
    await svc.listStores({});
    expect(where.filter((w) => w.includes('regionCode'))).toEqual([]);
  });

  it('refuses to change the status of a store in another market', async () => {
    const svc = Object.create(GroceryAdminService.prototype) as GroceryAdminService;
    const storeRepo = {
      findOne: vi.fn(async () => ({ id: 'st-in', regionCode: 'IN', status: 'PENDING_KYC' })),
      save: vi.fn(),
    };
    Object.assign(svc, { storeRepo, logger: { warn: vi.fn(), log: vi.fn() } });
    await expect(
      svc.setStoreStatus('st-in', 'APPROVED', undefined, 'admin-qa', 'QA'),
    ).rejects.toThrow(ForbiddenException);
    expect(storeRepo.save).not.toHaveBeenCalled();
  });

  it('refuses a locked admin write to grocery settings, which are managed globally', async () => {
    const svc = Object.create(GroceryAdminService.prototype) as GroceryAdminService;
    const settingRepo = { find: vi.fn(), save: vi.fn(), create: vi.fn() };
    Object.assign(svc, { settingRepo, logger: { warn: vi.fn(), log: vi.fn() } });
    await expect(svc.updateSettings({}, 'admin', 'QA')).rejects.toThrow(ForbiddenException);
    expect(settingRepo.save).not.toHaveBeenCalled();
  });

  it('refuses to approve a flash deal whose store belongs to another market', async () => {
    const svc = Object.create(GroceryService.prototype) as GroceryService;
    const deal = {
      id: 'deal-1',
      status: FlashDealStatus.PENDING,
      storeId: 'st-in',
      store: { id: 'st-in', regionCode: 'IN' },
    };
    const flashDealRepo = { findOne: vi.fn(async () => deal), save: vi.fn() };
    const storeRepo = { findOne: vi.fn(async () => ({ id: 'st-in', regionCode: 'IN' })) };
    const kafka = { publish: vi.fn() };
    Object.assign(svc, {
      flashDealRepo,
      storeRepo,
      kafka,
      logger: { warn: vi.fn(), log: vi.fn() },
    });

    await expect(svc.approveFlashDeal('deal-1', 'admin-qa', 'QA')).rejects.toThrow(
      ForbiddenException,
    );
    expect(flashDealRepo.save).not.toHaveBeenCalled();
    expect(kafka.publish).not.toHaveBeenCalled();
  });

  it("forces a delivery zone's region to the caller's scope even when the body asks for another", async () => {
    const svc = Object.create(GroceryAdminService.prototype) as GroceryAdminService;
    const zoneRepo = {
      findOne: vi.fn(async () => ({ id: 'z-1', regionCode: 'QA', name: 'Old name' })),
      save: vi.fn(async (z: any) => z),
    };
    Object.assign(svc, { zoneRepo, logger: { warn: vi.fn(), log: vi.fn() } });

    await svc.updateDeliveryZone('z-1', { regionCode: 'IN', name: 'x' }, 'QA');

    expect(zoneRepo.save).toHaveBeenCalledWith(expect.objectContaining({ regionCode: 'QA' }));
  });

  it('refuses to update a delivery zone in another market before saving anything', async () => {
    const svc = Object.create(GroceryAdminService.prototype) as GroceryAdminService;
    const zoneRepo = {
      findOne: vi.fn(async () => ({ id: 'z-2', regionCode: 'IN', name: 'Foo' })),
      save: vi.fn(),
    };
    Object.assign(svc, { zoneRepo, logger: { warn: vi.fn(), log: vi.fn() } });

    await expect(svc.updateDeliveryZone('z-2', { name: 'Renamed' }, 'QA')).rejects.toThrow(
      ForbiddenException,
    );
    expect(zoneRepo.save).not.toHaveBeenCalled();
  });
});

describe('GroceryService.getProducts market visibility', () => {
  function buildProductsDouble(rows: any[] = []) {
    const predicates: string[] = [];
    const qb: any = {
      where: (s: string) => {
        predicates.push(s);
        return qb;
      },
      andWhere: (s: string) => {
        predicates.push(s);
        return qb;
      },
      innerJoin: () => qb,
      orderBy: () => qb,
      addOrderBy: () => qb,
      skip: () => qb,
      take: () => qb,
      getManyAndCount: async () => [rows, rows.length],
    };
    const svc = Object.create(GroceryService.prototype) as GroceryService;
    Object.assign(svc, {
      itemRepo: { createQueryBuilder: () => qb },
      redis: { getJson: vi.fn(async () => null), setJson: vi.fn(async () => undefined) },
      storeRepo: { findOne: vi.fn(async () => null), find: vi.fn(async () => []) },
      logger: { warn: vi.fn(), log: vi.fn() },
    });
    return { svc, predicates };
  }

  it('drops the approved-store filter for a privileged (admin) actor in-market', async () => {
    const { svc, predicates } = buildProductsDouble();
    await svc.getProducts(undefined, undefined, 1, 30, 'QA', { role: 'ADMIN' });
    expect(predicates).toContain('rs.region_code = :__market');
    expect(predicates).not.toContain("rs.status = 'APPROVED'");
    expect(predicates).not.toContain('rs."isOnline" = true');
  });

  it('keeps the approved-store filter for the public storefront in the same market', async () => {
    const { svc, predicates } = buildProductsDouble();
    await svc.getProducts(undefined, undefined, 1, 30, 'QA', undefined);
    expect(predicates).toContain('rs.region_code = :__market');
    expect(predicates).toContain("rs.status = 'APPROVED'");
    expect(predicates).toContain('rs."isOnline" = true');
  });
});
