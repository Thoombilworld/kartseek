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
    expect(where).toContain('s.regionCode = :regionCode');
  });

  it("filters orders through the store's market", async () => {
    const { qb, where } = qbRecorder();
    const svc = Object.create(GroceryAdminService.prototype) as GroceryAdminService;
    Object.assign(svc, { orderRepo: { createQueryBuilder: () => qb } });
    await svc.listOrders({ regionCode: 'QA' });
    expect(where).toContain('store.regionCode = :regionCode');
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
});
