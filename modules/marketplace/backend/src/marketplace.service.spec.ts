import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { MarketplaceService } from './marketplace.service';
import { CatalogService } from './catalog/catalog.service';
import { MarketplaceHomeCacheService } from './catalog/home-cache.service';
import { MarketplaceFulfillmentService } from './fulfillment/fulfillment.service';
import { RedisService } from '@app/redis';
import { KafkaProducerService } from '@app/kafka';
import { Product } from './entities/product.entity';
import { Seller } from './entities/seller.entity';
import { Category } from './entities/category.entity';
import { Brand } from './entities/brand.entity';
import { ProductListing } from './entities/product-listing.entity';
import { ProductImage } from './entities/product-image.entity';
import { Review } from './entities/review.entity';
import { WishlistItem } from './entities/wishlist-item.entity';
import { MarketplaceOrder } from './entities/marketplace-order.entity';
import { ReturnRequest } from './entities/return-request.entity';
import { Coupon, CouponUsage } from './entities/coupon.entity';
import { ShipmentTrackingEvent } from './entities/shipment-tracking-event.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { ProductQuestion, ProductAnswer } from './entities/product-qa.entity';
import { DeliveryAssignment } from './entities/delivery-assignment.entity';
import { ProductAttribute } from './entities/product-attribute.entity';
import { MarketplaceNotification } from './entities/marketplace-notification.entity';
import { GiftCard } from './entities/gift-card.entity';

describe('MarketplaceService', () => {
  let service: MarketplaceService;
  let redis: jest.Mocked<RedisService>;
  let kafka: jest.Mocked<KafkaProducerService>;
  let productRepo: any;
  let categoryRepo: any;
  let brandRepo: any;
  let sellerRepo: any;
  let orderRepo: any;
  let reviewRepo: any;

  const mockRepoFactory = () => ({
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    findAndCount: jest.fn().mockResolvedValue([[], 0]),
    findTrees: jest.fn().mockResolvedValue([]),
    findDescendants: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockImplementation((e) => Promise.resolve({ id: 'mock-uuid', ...e })),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    increment: jest.fn().mockResolvedValue({ affected: 1 }),
    upsert: jest.fn().mockResolvedValue(undefined),
    query: jest.fn().mockResolvedValue([]),
    createQueryBuilder: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      setParameter: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
      getCount: jest.fn().mockResolvedValue(0),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
      getRawOne: jest.fn().mockResolvedValue({ avg: '0', count: '0', sum: '0' }),
    }),
  });

  beforeEach(async () => {
    const redisMock: Partial<jest.Mocked<RedisService>> = {
      setJson: jest.fn().mockResolvedValue('OK'),
      getJson: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
    };
    const kafkaMock: Partial<jest.Mocked<KafkaProducerService>> = {
      publish: jest.fn().mockResolvedValue(undefined),
    };
    // transaction() hands the callback an EntityManager; give it one that
    // behaves like the repo mocks so transactional paths can be exercised.
    const dataSourceMock = {
      transaction: jest.fn().mockImplementation((cb: any) => cb(mockRepoFactory())),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketplaceService,
        // Catalogue reads live in CatalogService (getHome composes them);
        // stubbed here so these tests stay focused on MarketplaceService.
        {
          provide: CatalogService,
          useValue: {
            getCategories: jest.fn().mockResolvedValue({ data: [], total: 0 }),
            getFlashDeals: jest.fn().mockResolvedValue({ data: [], total: 0 }),
            getDeals: jest.fn().mockResolvedValue({ data: [], total: 0 }),
            getFeaturedProducts: jest.fn().mockResolvedValue({ data: [], total: 0 }),
            getVerifiedSellers: jest.fn().mockResolvedValue({ data: [], total: 0 }),
          },
        },
        {
          provide: MarketplaceFulfillmentService,
          useValue: {
            createReturnRequest: jest.fn().mockResolvedValue({ success: true }),
          },
        },
        {
          provide: MarketplaceHomeCacheService,
          useValue: {
            getCountryBanners: jest.fn().mockResolvedValue([]),
            getBanners: jest.fn().mockResolvedValue([]),
            invalidateHomeCache: jest.fn().mockResolvedValue(undefined),
          },
        },
        { provide: RedisService, useValue: redisMock },
        { provide: KafkaProducerService, useValue: kafkaMock },
        // The service injects a DataSource for its transactional writes. Without
        // this provider Nest cannot construct it and every test in the file
        // fails at module compile time.
        { provide: getDataSourceToken(), useValue: dataSourceMock },
        { provide: getRepositoryToken(Product), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(Seller), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(Category), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(Brand), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(ProductListing), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(ProductImage), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(Review), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(WishlistItem), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(MarketplaceOrder), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(ReturnRequest), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(Coupon), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(CouponUsage), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(ShipmentTrackingEvent), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(ProductVariant), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(ProductQuestion), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(ProductAnswer), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(DeliveryAssignment), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(ProductAttribute), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(MarketplaceNotification), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(GiftCard), useFactory: mockRepoFactory },
      ],
    }).compile();

    service = module.get<MarketplaceService>(MarketplaceService);
    redis = module.get(RedisService);
    kafka = module.get(KafkaProducerService);
    productRepo = module.get(getRepositoryToken(Product));
    categoryRepo = module.get(getRepositoryToken(Category));
    brandRepo = module.get(getRepositoryToken(Brand));
    sellerRepo = module.get(getRepositoryToken(Seller));
    orderRepo = module.get(getRepositoryToken(MarketplaceOrder));
    reviewRepo = module.get(getRepositoryToken(Review));
  });

  describe('healthCheck', () => {
    it('should return service ok', async () => {
      const result = await service.healthCheck();
      expect(result.service).toBe('marketplace-service');
      expect(result.status).toBe('ok');
    });
  });

  describe('getProductReviews', () => {
    it('should return reviews with aggregate rating', async () => {
      reviewRepo.findAndCount.mockResolvedValue([[{ id: 'r1', rating: 5 }], 1]);
      const result = await service.getProductReviews('prod-1');
      expect(result.productId).toBe('prod-1');
      expect(result.reviews).toHaveLength(1);
    });
  });

  describe('addProductReview', () => {
    it('should throw when product not found', async () => {
      productRepo.findOne.mockResolvedValue(null);
      await expect(service.addProductReview('missing', { rating: 5 })).rejects.toThrow();
    });

    it('should create review and update product rating', async () => {
      productRepo.findOne.mockResolvedValue({ id: 'p1' });
      reviewRepo.create.mockImplementation((dto: any) => dto);
      reviewRepo.save.mockResolvedValue({ id: 'r1' });
      const result = await service.addProductReview('p1', {
        customerId: 'u1',
        customerName: 'John',
        rating: 5,
        comment: 'Great!',
      });
      expect(result.success).toBe(true);
      expect(kafka.publish).toHaveBeenCalledWith('review.created', expect.any(Object));
    });
  });

  describe('getMarketplaceHome', () => {
    it('should return cached homepage', async () => {
      const cached = { categories: [] as unknown[], banners: [] as unknown[] };
      redis.getJson.mockResolvedValue(cached);
      const result = await service.getMarketplaceHome('IN');
      expect(result).toEqual(cached);
    });

    it('should build homepage from DB when not cached', async () => {
      redis.getJson.mockResolvedValue(null);
      const result: any = await service.getMarketplaceHome();
      expect(result).toBeDefined();
      expect(result.trustBadges).toBeDefined();
    });
  });

  describe('createSupportTicket', () => {
    it('should create ticket and publish event', async () => {
      const result = await service.createSupportTicket({ subject: 'Help', message: 'Need help' });
      expect(result.success).toBe(true);
      expect(result.ticketId).toMatch(/^SUP-/);
      expect(kafka.publish).toHaveBeenCalledWith('support.ticket.created', expect.any(Object));
    });
  });

  /**
   * The invoice carries the buyer's name, shipping address and line items. The
   * route's JwtAuthGuard only proves the caller is signed in, so without an
   * ownership check here any account could read any order's invoice by id.
   */
  describe('getOrderInvoice ownership', () => {
    const ORDER_ID = '11111111-1111-4111-8111-111111111111';
    const OWNER = '22222222-2222-4222-8222-222222222222';
    const STRANGER = '33333333-3333-4333-8333-333333333333';

    beforeEach(() => {
      orderRepo.findOne.mockResolvedValue({
        id: ORDER_ID,
        customerId: OWNER,
        items: [{ productName: 'Widget', quantity: 2, price: 100 }],
        status: 'DELIVERED',
        createdAt: new Date('2026-01-01'),
      });
    });

    it('returns the invoice to the customer who placed the order', async () => {
      const invoice: any = await service.getOrderInvoice(ORDER_ID, OWNER);
      expect(invoice.orderId).toBe(ORDER_ID);
      expect(invoice.items).toHaveLength(1);
    });

    it('hides the order from a different signed-in customer', async () => {
      await expect(service.getOrderInvoice(ORDER_ID, STRANGER)).rejects.toThrow(/not found/i);
    });

    it('answers 404 rather than 403 — confirming the order exists is itself a leak', async () => {
      await expect(service.getOrderInvoice(ORDER_ID, STRANGER)).rejects.toMatchObject({
        status: 404,
      });
    });

    it('still serves internal callers that pass no requester', async () => {
      const invoice: any = await service.getOrderInvoice(ORDER_ID);
      expect(invoice.orderId).toBe(ORDER_ID);
    });
  });
});
