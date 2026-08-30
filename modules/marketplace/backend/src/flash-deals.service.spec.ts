import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MarketplaceAdminService } from './marketplace-admin.service';
import { MarketplaceHomeCacheService } from './marketplace-home-cache.service';
import { RedisService } from '@app/redis';
import { KafkaProducerService } from '@app/kafka';
import { FlashDeal, FlashDealNomination } from './entities/flash-deal.entity';
import { Product } from './entities/product.entity';
import { Seller } from './entities/seller.entity';
import { Category } from './entities/category.entity';
import { Brand } from './entities/brand.entity';
import { Review } from './entities/review.entity';
import { MarketplaceOrder } from './entities/marketplace-order.entity';
import { ReturnRequest } from './entities/return-request.entity';
import { ProductAttribute } from './entities/product-attribute.entity';
import { ProductQuestion } from './entities/product-qa.entity';
import { MarketplaceNotification } from './entities/marketplace-notification.entity';

/**
 * Flash-deal pipeline regressions.
 *
 * Each test here pins a behaviour that used to be wrong while reporting success,
 * which is the failure mode that made the feature look finished:
 *
 *   • approve/reject/update/delete returned `{ success: true }` for ids that
 *     matched nothing, so an expired campaign and an approved one were
 *     indistinguishable from the admin console;
 *   • a nomination below the campaign's discount floor, or into a closed
 *     campaign, was accepted as pending;
 *   • the same product could be nominated twice into the same campaign;
 *   • `getAdminFlashDeals` seeded eight invented campaigns with invented
 *     revenue on first call.
 *
 * The repositories are mocked — these assert the service's decisions, not
 * Postgres. Schema-level guarantees (the unique index, the window CHECK) are
 * covered by the 1786500800000 migration.
 */
describe('MarketplaceAdminService — flash deals', () => {
  let service: MarketplaceAdminService;
  let flashDealRepo: any;
  let nominationRepo: any;
  let productRepo: any;

  const repoStub = () => ({
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    findAndCount: jest.fn().mockResolvedValue([[], 0]),
    create: jest.fn((v: any) => ({ ...v })),
    save: jest.fn(async (v: any) => (Array.isArray(v) ? v : { id: 'generated-id', ...v })),
    count: jest.fn().mockResolvedValue(0),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    })),
  });

  /** A campaign that is open right now, so "closed" is never why a test fails. */
  const openDeal = (over: Partial<FlashDeal> = {}) => ({
    id: 'deal-1',
    name: 'Weekend Electronics',
    status: 'ACTIVE',
    windowStart: new Date(Date.now() - 3600_000),
    windowEnd: new Date(Date.now() + 3600_000),
    minDiscountPercent: 20,
    stockLimit: 0,
    unitsSold: 0,
    priority: 1,
    ...over,
  }) as FlashDeal;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketplaceAdminService,
        { provide: RedisService, useValue: { getJson: jest.fn().mockResolvedValue(null), setJson: jest.fn(), del: jest.fn() } },
        { provide: KafkaProducerService, useValue: { publish: jest.fn().mockResolvedValue(undefined) } },
        { provide: MarketplaceHomeCacheService, useValue: { deleteBanner: jest.fn(), invalidate: jest.fn() } },
        { provide: getRepositoryToken(FlashDeal), useValue: repoStub() },
        { provide: getRepositoryToken(FlashDealNomination), useValue: repoStub() },
        { provide: getRepositoryToken(Product), useValue: repoStub() },
        { provide: getRepositoryToken(Seller), useValue: repoStub() },
        { provide: getRepositoryToken(Category), useValue: repoStub() },
        { provide: getRepositoryToken(Brand), useValue: repoStub() },
        { provide: getRepositoryToken(Review), useValue: repoStub() },
        { provide: getRepositoryToken(MarketplaceOrder), useValue: repoStub() },
        { provide: getRepositoryToken(ReturnRequest), useValue: repoStub() },
        { provide: getRepositoryToken(ProductAttribute), useValue: repoStub() },
        { provide: getRepositoryToken(ProductQuestion), useValue: repoStub() },
        { provide: getRepositoryToken(MarketplaceNotification), useValue: repoStub() },
      ],
    }).compile();

    service = module.get(MarketplaceAdminService);
    flashDealRepo = module.get(getRepositoryToken(FlashDeal));
    nominationRepo = module.get(getRepositoryToken(FlashDealNomination));
    productRepo = module.get(getRepositoryToken(Product));
  });

  describe('an empty pipeline', () => {
    it('returns nothing rather than seeding invented campaigns', async () => {
      const result = await service.getAdminFlashDeals();
      expect(result).toEqual({ data: [], total: 0 });
      // The old version wrote eight campaigns to Redis on first read.
      expect(flashDealRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('mutating a campaign that does not exist', () => {
    it('rejects an update instead of confirming it', async () => {
      await expect(service.updateFlashDeal('missing', { name: 'x' }))
        .rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects a cancel instead of confirming it', async () => {
      await expect(service.deleteFlashDeal('missing'))
        .rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects an approval instead of confirming it', async () => {
      await expect(service.approveNomination('missing'))
        .rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects a rejection instead of confirming it', async () => {
      await expect(service.rejectNomination('missing', 'no'))
        .rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('creating a campaign', () => {
    it('refuses a window that ends before it starts', async () => {
      await expect(service.createFlashDeal({
        name: 'Backwards',
        windowStart: new Date(Date.now() + 7200_000).toISOString(),
        windowEnd: new Date(Date.now() + 3600_000).toISOString(),
      })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses a missing window rather than storing an invalid date', async () => {
      await expect(service.createFlashDeal({ name: 'No window' }))
        .rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('nominating a product', () => {
    beforeEach(() => {
      flashDealRepo.findOne.mockResolvedValue(openDeal());
      productRepo.findOne.mockResolvedValue({ id: 'prod-1' });
    });

    it('accepts an offer that clears the campaign floor', async () => {
      const res = await service.submitNomination('seller-1', {
        dealId: 'deal-1', productId: 'prod-1', dealPrice: 7999, proposedDiscount: 25, stockAllocated: 40,
      });
      expect(res.success).toBe(true);
      expect(nominationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'PENDING', dealPrice: 7999, proposedDiscountPercent: 25 }),
      );
    });

    it('refuses a discount below the campaign floor', async () => {
      await expect(service.submitNomination('seller-1', {
        dealId: 'deal-1', productId: 'prod-1', proposedDiscount: 5,
      })).rejects.toBeInstanceOf(BadRequestException);
      expect(nominationRepo.save).not.toHaveBeenCalled();
    });

    it('refuses a campaign whose window has closed', async () => {
      flashDealRepo.findOne.mockResolvedValue(openDeal({
        windowStart: new Date(Date.now() - 7200_000),
        windowEnd: new Date(Date.now() - 3600_000),
      }));
      await expect(service.submitNomination('seller-1', {
        dealId: 'deal-1', productId: 'prod-1', proposedDiscount: 50,
      })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses a second offer for a product already nominated', async () => {
      nominationRepo.findOne.mockResolvedValue({ id: 'nom-1', status: 'PENDING' });
      await expect(service.submitNomination('seller-1', {
        dealId: 'deal-1', productId: 'prod-1', proposedDiscount: 25,
      })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lets a seller re-enter a product they had withdrawn', async () => {
      nominationRepo.findOne.mockResolvedValue({ id: 'nom-1', status: 'WITHDRAWN' });
      const res = await service.submitNomination('seller-1', {
        dealId: 'deal-1', productId: 'prod-1', dealPrice: 6999, proposedDiscount: 30,
      });
      expect(res.success).toBe(true);
      expect(nominationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'nom-1', status: 'PENDING' }),
      );
    });

    it('refuses a product that does not exist', async () => {
      productRepo.findOne.mockResolvedValue(null);
      await expect(service.submitNomination('seller-1', {
        dealId: 'deal-1', productId: 'ghost', proposedDiscount: 25,
      })).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('deciding a nomination', () => {
    it('records who approved it and when', async () => {
      nominationRepo.findOne.mockResolvedValue({ id: 'nom-1', status: 'PENDING' });
      await service.approveNomination('nom-1', 'admin-7');
      expect(nominationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'APPROVED', decidedBy: 'admin-7' }),
      );
    });

    it('will not approve one the seller has withdrawn', async () => {
      nominationRepo.findOne.mockResolvedValue({ id: 'nom-1', status: 'WITHDRAWN' });
      await expect(service.approveNomination('nom-1'))
        .rejects.toBeInstanceOf(BadRequestException);
    });

    it('keeps the reason a rejection was given', async () => {
      nominationRepo.findOne.mockResolvedValue({ id: 'nom-1', status: 'PENDING' });
      await service.rejectNomination('nom-1', 'Seller rating below 4.0');
      expect(nominationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'REJECTED', decisionReason: 'Seller rating below 4.0' }),
      );
    });
  });

  describe('withdrawing', () => {
    it('marks the row withdrawn rather than deleting the audit trail', async () => {
      nominationRepo.find.mockResolvedValue([{ id: 'nom-1', status: 'APPROVED' }]);
      const res = await service.withdrawFromDeal('seller-1', 'deal-1');
      expect(res).toMatchObject({ success: true, withdrawn: 1 });
      expect(nominationRepo.save).toHaveBeenCalledWith([
        expect.objectContaining({ status: 'WITHDRAWN' }),
      ]);
    });

    it('reports when there was nothing to withdraw', async () => {
      nominationRepo.find.mockResolvedValue([]);
      await expect(service.withdrawFromDeal('seller-1', 'deal-1'))
        .rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('isLive()', () => {
    it('keeps a campaign off the storefront once its window closes, whatever the stored status says', () => {
      const stale = Object.assign(new FlashDeal(), openDeal({
        status: 'ACTIVE',
        windowStart: new Date(Date.now() - 7200_000),
        windowEnd: new Date(Date.now() - 60_000),
      }));
      expect(stale.isLive()).toBe(false);
    });

    it('keeps a cancelled campaign off the storefront inside its window', () => {
      const cancelled = Object.assign(new FlashDeal(), openDeal({ status: 'CANCELLED' }));
      expect(cancelled.isLive()).toBe(false);
    });

    it('shows a campaign inside its window', () => {
      const live = Object.assign(new FlashDeal(), openDeal());
      expect(live.isLive()).toBe(true);
    });
  });
});
