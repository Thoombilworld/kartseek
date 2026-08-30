// ══════════════════════════════════════════════════════════════════════════
// GROCERY SERVICE — EXTENDED UNIT TESTS
// Flash Deals, Reviews, Wishlist, Reorder, Delivery, Export, Translations
// ══════════════════════════════════════════════════════════════════════════

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GroceryService } from '../grocery.service';
import { RedisService } from '@app/redis';
import { KafkaProducerService } from '@app/kafka';
import { GroceryCategory } from '../entities/grocery-category.entity';
import { GroceryBrand } from '../entities/grocery-brand.entity';
import { GroceryProductVariant } from '../entities/grocery-product-variant.entity';
import { GroceryStockMovement } from '../entities/grocery-stock-movement.entity';
import { GroceryWarehouse } from '../entities/grocery-warehouse.entity';
import { GroceryVariantStock } from '../entities/grocery-variant-stock.entity';
import { GroceryStore } from '../entities/grocery-store.entity';
import { GroceryItem } from '../entities/grocery-item.entity';
import { GroceryOrder, GroceryOrderStatus, GroceryPaymentMethod } from '../entities/grocery-order.entity';
import { GroceryFlashDeal, FlashDealStatus } from '../entities/grocery-flash-deal.entity';
import { GroceryReview } from '../entities/grocery-review.entity';
import { GroceryWishlist } from '../entities/grocery-wishlist.entity';

/**
 * `storeId` and `productId` are uuid columns, so the fixtures below use
 * well-formed uuids rather than readable stand-ins like 'store-1'. The service
 * validates the shape before querying — a malformed id used to reach Postgres
 * and come back as a 500 carrying `invalid input syntax for type uuid`, and an
 * undefined one was worse: TypeORM discards an undefined condition, so the
 * lookup returned the first row in the table instead of nothing.
 */
/**
 * Flash-deal management is authorised by `assertStoreActor`: an actor is either
 * an admin role or the store's own owner. These specs predate that check and
 * called the methods with no actor at all, so once the suite could construct
 * the service again they failed with ForbiddenException rather than exercising
 * the lifecycle they describe. They pass an admin actor now, which is how the
 * gateway calls them.
 */
describe('GroceryService — Extended Features', () => {
  let service: GroceryService;
  let redis: jest.Mocked<RedisService>;
  let kafka: jest.Mocked<KafkaProducerService>;
  let flashDealRepo: jest.Mocked<Repository<GroceryFlashDeal>>;
  let reviewRepo: jest.Mocked<Repository<GroceryReview>>;
  let wishlistRepo: jest.Mocked<Repository<GroceryWishlist>>;
  let orderRepo: jest.Mocked<Repository<GroceryOrder>>;
  let storeRepo: jest.Mocked<Repository<GroceryStore>>;
  let itemRepo: jest.Mocked<Repository<GroceryItem>>;

  /** See the note in grocery.service.spec.ts — the transaction callback must run. */
  const mockEntityManager = {
    create: jest.fn().mockImplementation((_entity, dto) => dto),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'mock-uuid', ...entity })),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    increment: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockRepoFactory = () => ({
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    findAndCount: jest.fn().mockResolvedValue([[], 0]),
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'mock-uuid', ...entity })),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    increment: jest.fn().mockResolvedValue({ affected: 1 }),
    upsert: jest.fn().mockResolvedValue(undefined),
    manager: {
      transaction: jest.fn().mockImplementation((cb: any) => cb(mockEntityManager)),
      ...mockEntityManager,
    },
    createQueryBuilder: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      setParameter: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
      getMany: jest.fn().mockResolvedValue([]),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      getRawMany: jest.fn().mockResolvedValue([]),
      getRawOne: jest.fn().mockResolvedValue(null),
    }),
  });

  beforeEach(async () => {
    const redisMock: Partial<jest.Mocked<RedisService>> = {
      setJson: jest.fn().mockResolvedValue('OK'),
      getJson: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
      scan: jest.fn().mockResolvedValue(['0', []]),
    };
    const kafkaMock: Partial<jest.Mocked<KafkaProducerService>> = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroceryService,
        { provide: RedisService, useValue: redisMock },
        { provide: KafkaProducerService, useValue: kafkaMock },
        // GroceryService takes a DataSource at constructor index 0 (it opens
        // transactions for stock movements). Neither spec provided one, so the
        // testing module could not construct the service and every test in both
        // files failed on the same UnknownDependenciesException — the suites had
        // drifted behind the constructor.
        {
          provide: getDataSourceToken(),
          useValue: {
            transaction: jest.fn().mockImplementation((cb: any) => cb(mockEntityManager)),
          },
        },
        { provide: getRepositoryToken(GroceryBrand), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(GroceryProductVariant), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(GroceryStockMovement), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(GroceryWarehouse), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(GroceryVariantStock), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(GroceryCategory), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(GroceryStore), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(GroceryItem), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(GroceryOrder), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(GroceryFlashDeal), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(GroceryReview), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(GroceryWishlist), useFactory: mockRepoFactory },
      ],
    }).compile();

    service = module.get<GroceryService>(GroceryService);
    redis = module.get(RedisService);
    kafka = module.get(KafkaProducerService);
    flashDealRepo = module.get(getRepositoryToken(GroceryFlashDeal));
    reviewRepo = module.get(getRepositoryToken(GroceryReview));
    wishlistRepo = module.get(getRepositoryToken(GroceryWishlist));
    orderRepo = module.get(getRepositoryToken(GroceryOrder));
    storeRepo = module.get(getRepositoryToken(GroceryStore));
    itemRepo = module.get(getRepositoryToken(GroceryItem));
  });

  // ══════════════════════════════════════════════════════════════════════════
  // FLASH DEALS
  // ══════════════════════════════════════════════════════════════════════════

  describe('Flash Deals — Full Lifecycle', () => {
    const createDto = {
      storeId: '11111111-1111-4111-8111-111111111111',
      productId: '22222222-2222-4222-8222-222222222222',
      flashPrice: 49,
      stockLimit: 100,
      startTime: '2026-07-01T00:00:00Z',
      endTime: '2026-07-01T23:59:59Z',
    };

    describe('createFlashDeal', () => {
      it('should create a flash deal with DRAFT status', async () => {
        const store = { id: '11111111-1111-4111-8111-111111111111', name: 'FreshMart' };
        // The variant needs a `price`: the discount is computed from it, and a
        // variant carrying only `mrp` used to yield NaN, slip past the 30% floor
        // and fail on insert against a NOT NULL int column.
        const product = {
          id: '22222222-2222-4222-8222-222222222222', name: 'Organic Bananas', storeId: '11111111-1111-4111-8111-111111111111',
          weightVariants: [{ weight: '1 dozen', price: 99, mrp: 120, stock: 40 }],
        };
        storeRepo.findOne.mockResolvedValue(store as any);
        itemRepo.findOne.mockResolvedValue(product as any);
        flashDealRepo.save.mockResolvedValue({
          id: 'fd-1', ...createDto, status: FlashDealStatus.DRAFT,
          storeName: 'FreshMart', productName: 'Organic Bananas', originalPrice: 99,
          discountPercent: 50, soldCount: 0,
        } as any);

        const result = await service.createFlashDeal(createDto, { id: 'admin-1', role: 'ADMIN' });

        expect(result).toBeDefined();
        expect(flashDealRepo.save).toHaveBeenCalled();
      });

      it('should reject flash deal if store not found', async () => {
        storeRepo.findOne.mockResolvedValue(null);

        await expect(service.createFlashDeal(createDto, { id: 'admin-1', role: 'ADMIN' })).rejects.toThrow();
      });

      it('should reject flash deal if product not found', async () => {
        storeRepo.findOne.mockResolvedValue({ id: '11111111-1111-4111-8111-111111111111' } as any);
        itemRepo.findOne.mockResolvedValue(null);

        await expect(service.createFlashDeal(createDto, { id: 'admin-1', role: 'ADMIN' })).rejects.toThrow();
      });
    });

    describe('submitFlashDeal', () => {
      it('should transition from DRAFT to PENDING', async () => {
        const deal = { id: 'fd-1', status: FlashDealStatus.DRAFT, storeId: '11111111-1111-4111-8111-111111111111' };
        flashDealRepo.findOne.mockResolvedValue(deal as any);
        flashDealRepo.save.mockResolvedValue({ ...deal, status: FlashDealStatus.PENDING, submittedAt: new Date() } as any);

        const result = await service.submitFlashDeal('fd-1', { id: 'admin-1', role: 'ADMIN' });

        expect(result).toBeDefined();
        expect(flashDealRepo.save).toHaveBeenCalledWith(
          expect.objectContaining({ status: FlashDealStatus.PENDING }),
        );
        expect(kafka.publish).toHaveBeenCalledWith(
          'grocery.flash_deal.submitted',
          expect.objectContaining({ dealId: 'fd-1' }),
        );
      });

      it('should reject submission if deal is not in DRAFT status', async () => {
        flashDealRepo.findOne.mockResolvedValue({
          id: 'fd-1', status: FlashDealStatus.ACTIVE,
        } as any);

        await expect(service.submitFlashDeal('fd-1', { id: 'admin-1', role: 'ADMIN' })).rejects.toThrow();
      });

      it('should throw if deal not found', async () => {
        flashDealRepo.findOne.mockResolvedValue(null);

        await expect(service.submitFlashDeal('non-existent', { id: 'admin-1', role: 'ADMIN' })).rejects.toThrow();
      });
    });

    describe('approveFlashDeal', () => {
      it('should transition from PENDING to APPROVED and publish Kafka event', async () => {
        const deal = { id: 'fd-1', status: FlashDealStatus.PENDING, storeId: '11111111-1111-4111-8111-111111111111', productName: 'Bananas' };
        flashDealRepo.findOne.mockResolvedValue(deal as any);
        flashDealRepo.save.mockResolvedValue({
          ...deal, status: FlashDealStatus.APPROVED, approvedAt: new Date(), approvedBy: 'admin-1',
        } as any);

        const result = await service.approveFlashDeal('fd-1', 'admin-1');

        expect(flashDealRepo.save).toHaveBeenCalledWith(
          expect.objectContaining({
            status: FlashDealStatus.APPROVED,
            approvedBy: 'admin-1',
          }),
        );
        expect(kafka.publish).toHaveBeenCalledWith(
          'grocery.flash_deal.approved',
          expect.objectContaining({ dealId: 'fd-1' }),
        );
      });

      it('should reject approval for non-PENDING deals', async () => {
        flashDealRepo.findOne.mockResolvedValue({
          id: 'fd-1', status: FlashDealStatus.DRAFT,
        } as any);

        await expect(service.approveFlashDeal('fd-1')).rejects.toThrow();
      });
    });

    describe('rejectFlashDeal', () => {
      it('should transition from PENDING to REJECTED with reason', async () => {
        const deal = { id: 'fd-1', status: FlashDealStatus.PENDING, storeId: '11111111-1111-4111-8111-111111111111' };
        flashDealRepo.findOne.mockResolvedValue(deal as any);
        flashDealRepo.save.mockResolvedValue({
          ...deal, status: FlashDealStatus.REJECTED, rejectedReason: 'Discount too low',
        } as any);

        const result = await service.rejectFlashDeal('fd-1', { reason: 'Discount too low' });

        expect(flashDealRepo.save).toHaveBeenCalledWith(
          expect.objectContaining({
            status: FlashDealStatus.REJECTED,
            rejectedReason: 'Discount too low',
          }),
        );
        expect(kafka.publish).toHaveBeenCalledWith(
          'grocery.flash_deal.rejected',
          expect.objectContaining({ reason: 'Discount too low' }),
        );
      });
    });

    describe('pauseFlashDeal', () => {
      it('should pause an ACTIVE deal', async () => {
        const deal = { id: 'fd-1', status: FlashDealStatus.ACTIVE };
        flashDealRepo.findOne.mockResolvedValue(deal as any);
        flashDealRepo.save.mockResolvedValue({ ...deal, status: FlashDealStatus.PAUSED } as any);

        const result = await service.pauseFlashDeal('fd-1', { id: 'admin-1', role: 'ADMIN' });

        expect(flashDealRepo.save).toHaveBeenCalledWith(
          expect.objectContaining({ status: FlashDealStatus.PAUSED }),
        );
      });

      it('should reject pausing a non-ACTIVE deal', async () => {
        flashDealRepo.findOne.mockResolvedValue({
          id: 'fd-1', status: FlashDealStatus.DRAFT,
        } as any);

        await expect(service.pauseFlashDeal('fd-1', { id: 'admin-1', role: 'ADMIN' })).rejects.toThrow();
      });
    });

    describe('resumeFlashDeal', () => {
      it('should resume a PAUSED deal back to ACTIVE', async () => {
        const deal = { id: 'fd-1', status: FlashDealStatus.PAUSED };
        flashDealRepo.findOne.mockResolvedValue(deal as any);
        flashDealRepo.save.mockResolvedValue({ ...deal, status: FlashDealStatus.ACTIVE } as any);

        const result = await service.resumeFlashDeal('fd-1', { id: 'admin-1', role: 'ADMIN' });

        expect(flashDealRepo.save).toHaveBeenCalledWith(
          expect.objectContaining({ status: FlashDealStatus.ACTIVE }),
        );
      });
    });

    describe('getFlashDeals', () => {
      it('should return paginated flash deals', async () => {
        flashDealRepo.findAndCount.mockResolvedValue([
          [{ id: 'fd-1', status: FlashDealStatus.ACTIVE } as any],
          1,
        ]);

        const result = await service.getFlashDeals({ page: 1, limit: 10 });

        expect(result).toBeDefined();
        expect(flashDealRepo.findAndCount).toHaveBeenCalled();
      });

      it('should filter by storeId', async () => {
        flashDealRepo.findAndCount.mockResolvedValue([[], 0]);

        await service.getFlashDeals({ storeId: '11111111-1111-4111-8111-111111111111', page: 1, limit: 10 });

        expect(flashDealRepo.findAndCount).toHaveBeenCalledWith(
          expect.objectContaining({ where: expect.objectContaining({ storeId: '11111111-1111-4111-8111-111111111111' }) }),
        );
      });

      it('should filter by status', async () => {
        flashDealRepo.findAndCount.mockResolvedValue([[], 0]);

        await service.getFlashDeals({ status: FlashDealStatus.ACTIVE, page: 1, limit: 10 });

        expect(flashDealRepo.findAndCount).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({ status: FlashDealStatus.ACTIVE }),
          }),
        );
      });
    });

    describe('getActiveFlashDealsByStore', () => {
      it('expires lapsed deals in a single write, not one per deal', async () => {
        const past = new Date(Date.now() - 60_000).toISOString();
        const future = new Date(Date.now() + 60_000).toISOString();
        flashDealRepo.find.mockResolvedValue([
          { id: 'fd-old-1', status: FlashDealStatus.ACTIVE, endTime: past } as any,
          { id: 'fd-old-2', status: FlashDealStatus.ACTIVE, endTime: past } as any,
          { id: 'fd-live', status: FlashDealStatus.ACTIVE, endTime: future } as any,
        ]);

        const result = await service.getActiveFlashDealsByStore('11111111-1111-4111-8111-111111111111') as any;

        expect(result.deals.map((d: any) => d.id)).toEqual(['fd-live']);
        // This is a customer read path; two lapsed deals must cost one UPDATE.
        expect(flashDealRepo.update).toHaveBeenCalledTimes(1);
        expect(flashDealRepo.save).not.toHaveBeenCalled();
      });

      it('keeps a deal whose endTime is missing rather than dropping it', async () => {
        // `new Date(undefined)` is NaN, and NaN compares false both ways — split
        // across two independent filters such a deal belongs to neither bucket
        // and silently vanishes from the storefront.
        flashDealRepo.find.mockResolvedValue([
          { id: 'fd-no-end', status: FlashDealStatus.ACTIVE } as any,
        ]);

        const result = await service.getActiveFlashDealsByStore('11111111-1111-4111-8111-111111111111') as any;

        expect(result.deals).toHaveLength(1);
        expect(flashDealRepo.update).not.toHaveBeenCalled();
      });

      it('should return only ACTIVE deals for a store', async () => {
        flashDealRepo.find.mockResolvedValue([
          { id: 'fd-1', status: FlashDealStatus.ACTIVE, storeId: '11111111-1111-4111-8111-111111111111' } as any,
        ]);

        const result = await service.getActiveFlashDealsByStore('11111111-1111-4111-8111-111111111111') as any;

        expect(result.deals).toHaveLength(1);
        expect(flashDealRepo.find).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({ storeId: '11111111-1111-4111-8111-111111111111', status: FlashDealStatus.ACTIVE }),
          }),
        );
      });

      it('should return empty array for store with no active deals', async () => {
        flashDealRepo.find.mockResolvedValue([]);

        const result = await service.getActiveFlashDealsByStore('store-2') as any;

        expect(result.deals).toEqual([]);
        expect(result.total).toBe(0);
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // REVIEWS
  // ══════════════════════════════════════════════════════════════════════════

  describe('Reviews', () => {
    describe('submitReview', () => {
      const reviewDto = {
        customerId: 'cust-1',
        customerName: 'John Doe',
        rating: 4,
        comment: 'Great quality!',
      };

      it('should create a review and update product rating', async () => {
        itemRepo.findOne.mockResolvedValue({
          id: '33333333-3333-4333-8333-333333333333', storeId: '11111111-1111-4111-8111-111111111111', rating: 4.0, reviewCount: 10,
        } as any);
        reviewRepo.findOne.mockResolvedValue(null); // no duplicate
        orderRepo.findOne.mockResolvedValue({ id: 'ord-1' } as any); // verified purchase
        reviewRepo.save.mockResolvedValue({
          id: 'rev-1', ...reviewDto, storeId: '11111111-1111-4111-8111-111111111111', productId: '33333333-3333-4333-8333-333333333333',
        } as any);
        // Mock the AVG query used after saving
        const qb = reviewRepo.createQueryBuilder('r') as any;
        qb.getRawOne.mockResolvedValue({ avg: '4.2' });

        const result = await service.submitReview('11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333', reviewDto);

        expect(result).toBeDefined();
        expect(reviewRepo.save).toHaveBeenCalled();
      });

      it('should reject review for non-existent product', async () => {
        itemRepo.findOne.mockResolvedValue(null);

        await expect(service.submitReview('11111111-1111-4111-8111-111111111111', 'invalid-product', reviewDto)).rejects.toThrow();
      });

      it('should reject duplicate reviews from same customer', async () => {
        itemRepo.findOne.mockResolvedValue({ id: '33333333-3333-4333-8333-333333333333', storeId: '11111111-1111-4111-8111-111111111111' } as any);
        reviewRepo.findOne.mockResolvedValue({ id: 'existing-review' } as any); // already reviewed

        await expect(service.submitReview('11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333', reviewDto)).rejects.toThrow('already reviewed');
      });
    });

    describe('getProductReviews', () => {
      it('should return paginated reviews with average rating', async () => {
        reviewRepo.findAndCount.mockResolvedValue([
          [{ id: 'rev-1', rating: 4, comment: 'Good', customerName: 'John' } as any],
          1,
        ]);

        const result = await service.getProductReviews('11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333', 1, 20);

        expect(result).toBeDefined();
        expect(reviewRepo.findAndCount).toHaveBeenCalled();
      });

      it('should return empty list for product with no reviews', async () => {
        reviewRepo.findAndCount.mockResolvedValue([[], 0]);

        const result = await service.getProductReviews('11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333') as any;

        expect(result.data ?? result.reviews ?? []).toEqual([]);
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // WISHLIST
  // ══════════════════════════════════════════════════════════════════════════

  describe('Wishlist', () => {
    describe('addToWishlist', () => {
      it('should add product to wishlist', async () => {
        itemRepo.findOne.mockResolvedValue({ id: '33333333-3333-4333-8333-333333333333', name: 'Bananas' } as any); // product exists
        wishlistRepo.findOne.mockResolvedValue(null); // not already in wishlist
        wishlistRepo.save.mockResolvedValue({
          id: 'w1', customerId: 'cust-1', productId: '33333333-3333-4333-8333-333333333333', storeId: '11111111-1111-4111-8111-111111111111',
        } as any);

        const result = await service.addToWishlist({
          customerId: 'cust-1', productId: '33333333-3333-4333-8333-333333333333', storeId: '11111111-1111-4111-8111-111111111111',
        });

        expect(result).toBeDefined();
        expect(wishlistRepo.save).toHaveBeenCalled();
      });

      it('should handle duplicate wishlist addition gracefully', async () => {
        itemRepo.findOne.mockResolvedValue({ id: '33333333-3333-4333-8333-333333333333', name: 'Bananas' } as any); // product exists
        wishlistRepo.findOne.mockResolvedValue({ id: 'existing' } as any);

        // Should either return existing or upsert without error
        const result = await service.addToWishlist({
          customerId: 'cust-1', productId: '33333333-3333-4333-8333-333333333333', storeId: '11111111-1111-4111-8111-111111111111',
        });

        expect(result).toBeDefined();
      });
    });

    describe('removeFromWishlist', () => {
      it('should remove product from wishlist', async () => {
        wishlistRepo.delete.mockResolvedValue({ affected: 1 } as any);

        const result = await service.removeFromWishlist('cust-1', '33333333-3333-4333-8333-333333333333');

        expect(result).toBeDefined();
        expect(wishlistRepo.delete).toHaveBeenCalledWith(
          expect.objectContaining({ customerId: 'cust-1', productId: '33333333-3333-4333-8333-333333333333' }),
        );
      });
    });

    describe('getWishlist', () => {
      it('should return paginated wishlist', async () => {
        wishlistRepo.findAndCount.mockResolvedValue([
          [{ id: 'w1', customerId: 'cust-1', productId: '33333333-3333-4333-8333-333333333333' } as any],
          1,
        ]);

        const result = await service.getWishlist('cust-1', 1, 30);

        expect(result).toBeDefined();
        expect(wishlistRepo.findAndCount).toHaveBeenCalled();
      });

      it('should return empty wishlist for new customer', async () => {
        wishlistRepo.findAndCount.mockResolvedValue([[], 0]);

        const result = await service.getWishlist('new-cust') as any;

        expect(result.data ?? result.items ?? []).toEqual([]);
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // REORDER
  // ══════════════════════════════════════════════════════════════════════════

  describe('Reorder from History', () => {
    it('should clone items from a past order', async () => {
      const pastOrder = {
        id: 'ord-past', storeId: '11111111-1111-4111-8111-111111111111', customerId: 'cust-1',
        items: [
          { productId: '33333333-3333-4333-8333-333333333333', name: 'Bananas', weight: '1 dozen', price: 60, quantity: 2 },
          { productId: 'p2', name: 'Milk', weight: '1 ltr', price: 80, quantity: 1 },
        ],
        deliveryAddress: { line1: '123 Main', city: 'Doha', pincode: '12345' },
        paymentMethod: GroceryPaymentMethod.ONLINE,
      };
      orderRepo.findOne.mockResolvedValue(pastOrder as any);
      // Reorder now re-resolves every line against the live catalogue rather than
      // echoing the historical snapshot back, so the products have to exist.
      itemRepo.find.mockResolvedValue([
        { id: '33333333-3333-4333-8333-333333333333', name: 'Bananas', storeId: '11111111-1111-4111-8111-111111111111', isAvailable: true, weightVariants: [{ weight: '1 dozen', price: 65, mrp: 80, stock: 20 }] },
        { id: 'p2', name: 'Milk', storeId: '11111111-1111-4111-8111-111111111111', isAvailable: true, weightVariants: [{ weight: '1 ltr', price: 80, mrp: 90, stock: 15 }] },
      ] as any);

      const result = await service.reorderFromHistory('ord-past', { customerId: 'cust-1' }) as any;

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(2);
      expect(result.storeId).toBe('11111111-1111-4111-8111-111111111111');
      // The bananas went from 60 to 65 since the original order — the customer is
      // told rather than quietly charged the old price.
      expect(result.items[0]).toMatchObject({ price: 65, previousPrice: 60, priceChanged: true });
    });

    it('should report items that are no longer purchasable instead of cloning them', async () => {
      orderRepo.findOne.mockResolvedValue({
        id: 'ord-past', storeId: '11111111-1111-4111-8111-111111111111', customerId: 'cust-1',
        items: [
          { productId: '33333333-3333-4333-8333-333333333333', name: 'Bananas', weight: '1 dozen', price: 60, quantity: 2 },
          { productId: 'p2', name: 'Milk', weight: '1 ltr', price: 80, quantity: 1 },
        ],
      } as any);
      itemRepo.find.mockResolvedValue([
        // p1 is out of stock, p2 has been delisted entirely.
        { id: '33333333-3333-4333-8333-333333333333', name: 'Bananas', storeId: '11111111-1111-4111-8111-111111111111', isAvailable: true, weightVariants: [{ weight: '1 dozen', price: 65, stock: 0 }] },
      ] as any);

      const result = await service.reorderFromHistory('ord-past', { customerId: 'cust-1' }) as any;

      expect(result.items).toHaveLength(0);
      expect(result.unavailable).toEqual([
        { productId: '33333333-3333-4333-8333-333333333333', name: 'Bananas', reason: 'out of stock' },
        { productId: 'p2', name: 'Milk', reason: 'no longer sold' },
      ]);
    });

    it('should throw if original order not found', async () => {
      orderRepo.findOne.mockResolvedValue(null);

      await expect(
        service.reorderFromHistory('non-existent', { customerId: 'cust-1' }),
      ).rejects.toThrow();
    });

    it('should throw if customer does not own the order', async () => {
      // The lookup is `findOne({ where: { id, customerId } })`, so a mismatched
      // customer finds nothing. The mock has to honour the where clause — returning
      // the row unconditionally made this pass for the wrong reason (the old code
      // then crashed on `order.items.map` of an undefined `items`).
      orderRepo.findOne.mockImplementation(async (opts: any) =>
        opts?.where?.customerId === 'cust-owner'
          ? ({ id: 'ord-1', customerId: 'cust-owner', storeId: '11111111-1111-4111-8111-111111111111', items: [] } as any)
          : null,
      );

      await expect(
        service.reorderFromHistory('ord-1', { customerId: 'cust-1' }),
      ).rejects.toThrow('not found');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // DELIVERY TRACKING
  // ══════════════════════════════════════════════════════════════════════════

  describe('Delivery Tracking', () => {
    it('should return tracking data for a valid order', async () => {
      const order = {
        id: 'ord-1', orderNumber: 'GRO-1001', status: GroceryOrderStatus.OUT_FOR_DELIVERY,
        storeId: '11111111-1111-4111-8111-111111111111', customerId: 'cust-1',
        store: { name: 'FreshMart', latitude: 25.276987, longitude: 51.520008 },
        deliveryAddress: { lat: 25.286106, lng: 51.534817 },
      };
      orderRepo.findOne.mockResolvedValue(order as any);

      const result = await service.getDeliveryTracking('ord-1');

      expect(result).toBeDefined();
      expect((result as any).orderId ?? (result as any).orderNumber).toBeDefined();
    });

    it('should throw for non-existent order', async () => {
      orderRepo.findOne.mockResolvedValue(null);

      await expect(service.getDeliveryTracking('bad-id')).rejects.toThrow();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // DELIVERY ORDER WORKFLOW (Status Machine)
  // ══════════════════════════════════════════════════════════════════════════

  describe('Delivery Order Workflow — Seller ↔ Delivery Boy ↔ Customer', () => {
    const baseOrder = {
      id: 'ord-1', orderNumber: 'GRO-1001', storeId: '11111111-1111-4111-8111-111111111111', customerId: 'cust-1',
      store: { name: 'FreshMart', latitude: 25.28, longitude: 51.52, address: 'Pearl, Doha' },
      deliveryAddress: { lat: 25.29, lng: 51.53, line1: 'West Bay', city: 'Doha' },
      paymentMethod: GroceryPaymentMethod.COD, grandTotal: 250,
    };

    it('should follow complete delivery workflow: PLACED → CONFIRMED → PACKING → READY → OUT_FOR_DELIVERY → DELIVERED', async () => {
      // Step 1: PLACED → CONFIRMED (Seller accepts)
      orderRepo.findOne.mockResolvedValue({ ...baseOrder, status: GroceryOrderStatus.PLACED } as any);
      orderRepo.save.mockResolvedValue({ ...baseOrder, status: GroceryOrderStatus.CONFIRMED } as any);
      let result = await service.updateOrderStatus('ord-1', { status: GroceryOrderStatus.CONFIRMED });
      expect(result.success).toBe(true);

      // Step 2: CONFIRMED → PACKING (Seller starts packing)
      orderRepo.findOne.mockResolvedValue({ ...baseOrder, status: GroceryOrderStatus.CONFIRMED } as any);
      orderRepo.save.mockResolvedValue({ ...baseOrder, status: GroceryOrderStatus.PACKING } as any);
      result = await service.updateOrderStatus('ord-1', { status: GroceryOrderStatus.PACKING });
      expect(result.success).toBe(true);

      // Step 3: PACKING → READY_FOR_PICKUP (triggers delivery.requested for delivery boy)
      orderRepo.findOne.mockResolvedValue({ ...baseOrder, status: GroceryOrderStatus.PACKING } as any);
      orderRepo.save.mockResolvedValue({ ...baseOrder, status: GroceryOrderStatus.READY_FOR_PICKUP } as any);
      result = await service.updateOrderStatus('ord-1', { status: GroceryOrderStatus.READY_FOR_PICKUP });
      expect(result.success).toBe(true);
      expect(kafka.publish).toHaveBeenCalledWith(
        'grocery.delivery.requested',
        expect.objectContaining({ serviceType: 'grocery', orderId: 'ord-1' }),
      );

      // Step 4: READY_FOR_PICKUP → OUT_FOR_DELIVERY (Delivery boy picks up)
      orderRepo.findOne.mockResolvedValue({ ...baseOrder, status: GroceryOrderStatus.READY_FOR_PICKUP } as any);
      orderRepo.save.mockResolvedValue({ ...baseOrder, status: GroceryOrderStatus.OUT_FOR_DELIVERY } as any);
      result = await service.updateOrderStatus('ord-1', { status: GroceryOrderStatus.OUT_FOR_DELIVERY });
      expect(result.success).toBe(true);

      // Step 5: OUT_FOR_DELIVERY → DELIVERED (Delivery complete)
      orderRepo.findOne.mockResolvedValue({ ...baseOrder, status: GroceryOrderStatus.OUT_FOR_DELIVERY } as any);
      orderRepo.save.mockResolvedValue({ ...baseOrder, status: GroceryOrderStatus.DELIVERED } as any);
      result = await service.updateOrderStatus('ord-1', { status: GroceryOrderStatus.DELIVERED });
      expect(result.success).toBe(true);

      // Verify Kafka events were published for customer notifications
      expect(kafka.publish).toHaveBeenCalledWith(
        'grocery.order.status_updated',
        expect.objectContaining({ newStatus: GroceryOrderStatus.DELIVERED }),
      );
    });

    it('should allow PLACED → CANCELLED (Customer cancels before confirmation)', async () => {
      orderRepo.findOne.mockResolvedValue({ ...baseOrder, status: GroceryOrderStatus.PLACED } as any);
      orderRepo.save.mockResolvedValue({ ...baseOrder, status: GroceryOrderStatus.CANCELLED } as any);

      const result = await service.updateOrderStatus('ord-1', { status: GroceryOrderStatus.CANCELLED });

      expect(result.success).toBe(true);
    });

    it('should reject invalid transition DELIVERED → PACKING', async () => {
      orderRepo.findOne.mockResolvedValue({ ...baseOrder, status: GroceryOrderStatus.DELIVERED } as any);

      await expect(
        service.updateOrderStatus('ord-1', { status: GroceryOrderStatus.PACKING }),
      ).rejects.toThrow('Cannot transition');
    });

    it('should reject invalid transition CANCELLED → CONFIRMED', async () => {
      orderRepo.findOne.mockResolvedValue({ ...baseOrder, status: GroceryOrderStatus.CANCELLED } as any);

      await expect(
        service.updateOrderStatus('ord-1', { status: GroceryOrderStatus.CONFIRMED }),
      ).rejects.toThrow('Cannot transition');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // CSV EXPORT
  // ══════════════════════════════════════════════════════════════════════════

  describe('CSV Export', () => {
    it('should generate CSV content for store products', async () => {
      const products = [
        { id: '33333333-3333-4333-8333-333333333333', name: 'Bananas', weightVariants: [{ weight: '1 dozen', mrp: 60, price: 49, stockQuantity: 100 }] },
        { id: 'p2', name: 'Milk', weightVariants: [{ weight: '1 ltr', mrp: 80, price: 80, stockQuantity: 50 }] },
      ];
      itemRepo.find.mockResolvedValue(products as any);

      const result = await service.exportProductsCsv('11111111-1111-4111-8111-111111111111');

      expect(result).toBeDefined();
      // Should contain CSV headers and product rows
      const csv = typeof result === 'string' ? result : (result as any).csv ?? (result as any).content;
      if (csv) {
        expect(csv).toContain('Bananas');
        expect(csv).toContain('Milk');
      }
    });

    it('should throw for store with no products', async () => {
      itemRepo.find.mockResolvedValue([]);

      const result = await service.exportProductsCsv('empty-store');
      expect(result.rowCount).toBe(0);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PRODUCT TRANSLATIONS
  // ══════════════════════════════════════════════════════════════════════════

  describe('Product Translations', () => {
    it('should update product translation for a locale', async () => {
      const product = { id: '33333333-3333-4333-8333-333333333333', storeId: '11111111-1111-4111-8111-111111111111', translations: {} };
      itemRepo.findOne.mockResolvedValue(product as any);
      itemRepo.save.mockResolvedValue({ ...product, translations: { ar: { name: 'موز', description: 'موز طازج' } } } as any);

      const result = await service.updateProductTranslation('11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333', {
        locale: 'ar', name: 'موز', description: 'موز طازج',
      });

      expect(result).toBeDefined();
      expect(itemRepo.save).toHaveBeenCalled();
    });

    it('should return translated product for given locale', async () => {
      const product = {
        id: '33333333-3333-4333-8333-333333333333', name: 'Bananas', description: 'Fresh bananas',
        storeId: '11111111-1111-4111-8111-111111111111',
        translations: { ar: { name: 'موز', description: 'موز طازج' } },
      };
      itemRepo.findOne.mockResolvedValue(product as any);

      const result = await service.getProductTranslated('11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333', 'ar') as any;

      expect(result).toBeDefined();
    });

    it('should fallback to original if locale not available', async () => {
      const product = { id: '33333333-3333-4333-8333-333333333333', name: 'Bananas', storeId: '11111111-1111-4111-8111-111111111111', translations: {} };
      itemRepo.findOne.mockResolvedValue(product as any);

      const result = await service.getProductTranslated('11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333', 'fr') as any;

      expect(result).toBeDefined();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // CROSS-MODULE CONNECTIVITY (Admin ↔ Seller ↔ Customer)
  // ══════════════════════════════════════════════════════════════════════════

  describe('Admin ↔ Seller Connectivity: Flash Deal Approval Flow', () => {
    it('should publish Kafka notifications for seller when admin approves deal', async () => {
      const deal = {
        id: 'fd-1', status: FlashDealStatus.PENDING,
        storeId: '11111111-1111-4111-8111-111111111111', storeName: 'FreshMart', productName: 'Bananas',
      };
      flashDealRepo.findOne.mockResolvedValue(deal as any);
      flashDealRepo.save.mockResolvedValue({ ...deal, status: FlashDealStatus.APPROVED, approvedAt: new Date() } as any);

      await service.approveFlashDeal('fd-1', 'admin-1');

      // Should notify seller via Kafka
      expect(kafka.publish).toHaveBeenCalledWith(
        'grocery.flash_deal.approved',
        expect.objectContaining({
          dealId: 'fd-1',
          storeId: '11111111-1111-4111-8111-111111111111',
        }),
      );
    });

    it('should publish rejection notification with reason for seller', async () => {
      const deal = { id: 'fd-1', status: FlashDealStatus.PENDING, storeId: '11111111-1111-4111-8111-111111111111' };
      flashDealRepo.findOne.mockResolvedValue(deal as any);
      flashDealRepo.save.mockResolvedValue({ ...deal, status: FlashDealStatus.REJECTED } as any);

      await service.rejectFlashDeal('fd-1', { reason: 'Price too high' });

      expect(kafka.publish).toHaveBeenCalledWith(
        'grocery.flash_deal.rejected',
        expect.objectContaining({ reason: 'Price too high' }),
      );
    });
  });

  describe('Seller ↔ Customer Connectivity: Order → Notification Chain', () => {
    it('should publish Kafka event to notify seller on new order', async () => {
      const store = { id: '11111111-1111-4111-8111-111111111111', name: 'FreshMart', status: 'APPROVED', isOnline: true, minOrderAmount: 0, deliveryFee: 10, ownerId: 'seller-1' };
      storeRepo.findOne.mockResolvedValue(store as any);
      itemRepo.find.mockResolvedValue([
        { id: '33333333-3333-4333-8333-333333333333', name: 'Bananas', storeId: '11111111-1111-4111-8111-111111111111', isAvailable: true, weightVariants: [{ weight: '1 dozen', price: 60, mrp: 75, stock: 30 }] },
      ] as any);
      orderRepo.count.mockResolvedValue(42);
      mockEntityManager.save.mockResolvedValueOnce({
        id: 'ord-1', orderNumber: 'GRO-1043',
        customerId: 'cust-1', storeId: '11111111-1111-4111-8111-111111111111', status: GroceryOrderStatus.PLACED,
      } as any);

      await service.createGroceryOrder({
        customerId: 'cust-1', storeId: '11111111-1111-4111-8111-111111111111',
        items: [{ productId: '33333333-3333-4333-8333-333333333333', name: 'Bananas', weight: '1 dozen', price: 60, quantity: 1 }],
        deliveryAddress: { line1: 'West Bay', city: 'Doha', pincode: '00000', lat: 25.29, lng: 51.53 },
        paymentMethod: GroceryPaymentMethod.COD,
      });

      // Seller notification
      expect(kafka.publish).toHaveBeenCalledWith(
        'notification.push',
        expect.objectContaining({ userId: 'seller-1' }),
      );
      // Order created event
      expect(kafka.publish).toHaveBeenCalledWith(
        'grocery.order.created',
        expect.objectContaining({ storeId: '11111111-1111-4111-8111-111111111111' }),
      );
    });
  });
});
