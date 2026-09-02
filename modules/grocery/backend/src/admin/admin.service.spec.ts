// ══════════════════════════════════════════════════════════════════════════
// GROCERY ADMIN SERVICE — UNIT TESTS
//
// Covers the sixteen `admin.grocery.*` commands that had no handler at all and
// answered 503 for the entire super-admin grocery section.
// ══════════════════════════════════════════════════════════════════════════

import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { type Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { GroceryAdminService } from './admin.service';
import { RedisService } from '@app/redis';
import { KafkaProducerService } from '@app/kafka';
import { GroceryStore } from '../entities/grocery-store.entity';
import { GroceryItem } from '../entities/grocery-item.entity';
import { GroceryOrder } from '../entities/grocery-order.entity';
import { GroceryFlashDeal, FlashDealStatus } from '../entities/grocery-flash-deal.entity';
import { GroceryDeliveryZone } from '../entities/grocery-delivery-zone.entity';
import { GrocerySetting, GROCERY_SETTING_DEFAULTS } from '../entities/grocery-setting.entity';

describe('GroceryAdminService', () => {
  let service: GroceryAdminService;
  let storeRepo: jest.Mocked<Repository<GroceryStore>>;
  let orderRepo: jest.Mocked<Repository<GroceryOrder>>;
  let flashDealRepo: jest.Mocked<Repository<GroceryFlashDeal>>;
  let zoneRepo: jest.Mocked<Repository<GroceryDeliveryZone>>;
  let settingRepo: jest.Mocked<Repository<GrocerySetting>>;
  let kafka: jest.Mocked<KafkaProducerService>;

  const qb = () => ({
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue(undefined),
    getRawMany: jest.fn().mockResolvedValue([]),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  });

  const mockRepoFactory = () => ({
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    findAndCount: jest.fn().mockResolvedValue([[], 0]),
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockImplementation((e) => Promise.resolve({ id: 'mock-uuid', ...e })),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    createQueryBuilder: jest.fn().mockImplementation(qb),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroceryAdminService,
        { provide: RedisService, useValue: { del: jest.fn().mockResolvedValue(1) } },
        { provide: KafkaProducerService, useValue: { publish: jest.fn().mockResolvedValue(undefined) } },
        { provide: getRepositoryToken(GroceryStore), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(GroceryItem), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(GroceryOrder), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(GroceryFlashDeal), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(GroceryDeliveryZone), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(GrocerySetting), useFactory: mockRepoFactory },
      ],
    }).compile();

    service = module.get(GroceryAdminService);
    storeRepo = module.get(getRepositoryToken(GroceryStore));
    orderRepo = module.get(getRepositoryToken(GroceryOrder));
    flashDealRepo = module.get(getRepositoryToken(GroceryFlashDeal));
    zoneRepo = module.get(getRepositoryToken(GroceryDeliveryZone));
    settingRepo = module.get(getRepositoryToken(GrocerySetting));
    kafka = module.get(KafkaProducerService);
  });

  // ── Dashboard ─────────────────────────────────────────────────────────────

  describe('getDashboard', () => {
    it('returns store, product, order and moderation counters', async () => {
      storeRepo.count
        .mockResolvedValueOnce(11)  // total
        .mockResolvedValueOnce(8)   // approved
        .mockResolvedValueOnce(2)   // pending
        .mockResolvedValueOnce(1);  // suspended
      const builder = qb();
      builder.getRawOne.mockResolvedValue({ revenue: '48250.50', orders: '96' });
      builder.getRawMany.mockResolvedValue([{ status: 'PLACED', count: '4' }]);
      orderRepo.createQueryBuilder.mockReturnValue(builder as any);
      orderRepo.count.mockResolvedValue(410);
      flashDealRepo.count.mockResolvedValue(3);

      const result = await service.getDashboard();

      expect(result.stores).toEqual({ total: 11, approved: 8, pending: 2, suspended: 1 });
      expect(result.revenue.last30Days).toBe(48250.5);
      expect(result.orders.byStatus).toEqual({ PLACED: 4 });
      expect(result.moderation.pendingFlashDeals).toBe(3);
    });
  });

  // ── Store lifecycle ───────────────────────────────────────────────────────

  describe('setStoreStatus', () => {
    const store = { id: 's-1', name: 'FreshMart', status: 'PENDING_KYC', isOnline: true, ownerId: 'owner-1' };

    it('approves a store and notifies the owner', async () => {
      storeRepo.findOne.mockResolvedValue({ ...store } as any);

      const result = await service.setStoreStatus('s-1', 'APPROVED', undefined, 'admin-9');

      expect(result.success).toBe(true);
      expect(result.previousStatus).toBe('PENDING_KYC');
      expect(storeRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'APPROVED' }));
      expect(kafka.publish).toHaveBeenCalledWith(
        'grocery.store.status_changed',
        expect.objectContaining({ storeId: 's-1', newStatus: 'APPROVED', actorId: 'admin-9' }),
      );
    });

    /** A suspended store that stays online keeps appearing in the customer list. */
    it('takes a suspended store offline', async () => {
      storeRepo.findOne.mockResolvedValue({ ...store, status: 'APPROVED' } as any);

      await service.setStoreStatus('s-1', 'SUSPENDED', 'repeated quality complaints');

      expect(storeRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'SUSPENDED', isOnline: false }),
      );
    });

    it('rejects a status the lifecycle does not define', async () => {
      await expect(service.setStoreStatus('s-1', 'BLOCKED' as any)).rejects.toThrow(BadRequestException);
      expect(storeRepo.save).not.toHaveBeenCalled();
    });

    it('404s on an unknown store', async () => {
      storeRepo.findOne.mockResolvedValue(null);
      await expect(service.setStoreStatus('nope', 'APPROVED')).rejects.toThrow(NotFoundException);
    });
  });

  // ── Flash-deal moderation ─────────────────────────────────────────────────

  describe('listFlashDeals', () => {
    /**
     * Regression: the gateway routed this to `get_store_flash_deals`, which
     * returns ACTIVE deals only, so `?status=pending` never produced a queue and
     * no submitted deal could be approved.
     */
    it('filters by the requested status', async () => {
      await service.listFlashDeals({ status: 'pending' });

      expect(flashDealRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: FlashDealStatus.PENDING } }),
      );
    });

    it('rejects an unknown status rather than silently listing everything', async () => {
      await expect(service.listFlashDeals({ status: 'almost-live' })).rejects.toThrow(BadRequestException);
    });

    it('treats "All" as no status filter', async () => {
      await service.listFlashDeals({ status: 'All', storeId: 's-1' });

      expect(flashDealRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { storeId: 's-1' } }),
      );
    });
  });

  // ── Delivery zones ────────────────────────────────────────────────────────

  describe('createDeliveryZone', () => {
    it('normalises a comma-separated pincode list', async () => {
      await service.createDeliveryZone({ name: 'Bandra West', pincodes: '400050, 400051 ,' } as any);

      expect(zoneRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ pincodes: ['400050', '400051'] }),
      );
    });

    it('requires a name', async () => {
      await expect(service.createDeliveryZone({} as any)).rejects.toThrow(BadRequestException);
    });
  });

  // ── Settings ──────────────────────────────────────────────────────────────

  describe('settings', () => {
    it('merges stored values over the shipped defaults', async () => {
      settingRepo.find.mockResolvedValue([
        { key: 'commissionPercent', value: 18, updatedAt: new Date('2026-08-01') },
      ] as any);

      const result = await service.getSettings();

      expect(result.settings.commissionPercent).toBe(18);
      expect(result.settings.minOrderAmount).toBe(GROCERY_SETTING_DEFAULTS.minOrderAmount);
      expect(result.overridden).toEqual(['commissionPercent']);
    });

    it('rejects an unknown key instead of storing it', async () => {
      await expect(service.updateSettings({ comissionPercent: 15 })).rejects.toThrow(/Unknown setting/);
      expect(settingRepo.save).not.toHaveBeenCalled();
    });

    it('rejects a value of the wrong type', async () => {
      await expect(service.updateSettings({ commissionPercent: '15' })).rejects.toThrow(/must be a number/);
    });

    it('persists a valid change and announces it', async () => {
      settingRepo.find.mockResolvedValue([]);

      await service.updateSettings({ commissionPercent: 15, autoApproveStores: true }, 'admin-9');

      expect(settingRepo.save).toHaveBeenCalledTimes(2);
      expect(kafka.publish).toHaveBeenCalledWith(
        'grocery.settings.updated',
        expect.objectContaining({ keys: ['commissionPercent', 'autoApproveStores'], actorId: 'admin-9' }),
      );
    });
  });

  // ── Reports ───────────────────────────────────────────────────────────────

  describe('getReports', () => {
    it('derives the cancellation rate from the period totals', async () => {
      const builder = qb();
      builder.getRawOne.mockResolvedValue({ orders: '200', revenue: '90000', aov: '450', cancelled: '14', delivered: '170' });
      builder.getRawMany.mockResolvedValue([]);
      orderRepo.createQueryBuilder.mockReturnValue(builder as any);

      const result = await service.getReports('30d');

      expect(result.summary.orders).toBe(200);
      expect(result.summary.averageOrderValue).toBe(450);
      expect(result.summary.cancellationRate).toBe(7); // 14 / 200
    });

    it('does not divide by zero on a period with no orders', async () => {
      const result = await service.getReports('7d');
      expect(result.summary.cancellationRate).toBe(0);
    });
  });
});
