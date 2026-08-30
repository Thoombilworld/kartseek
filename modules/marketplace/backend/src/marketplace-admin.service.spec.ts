import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MarketplaceAdminService } from './marketplace-admin.service';
import { MarketplaceHomeCacheService } from './marketplace-home-cache.service';
import { RedisService } from '@app/redis';
import { KafkaProducerService } from '@app/kafka';
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
import { FlashDeal, FlashDealNomination } from './entities/flash-deal.entity';

/**
 * Admin governance tests. Moved here with the methods when MarketplaceAdminService
 * was split out of MarketplaceService.
 */
describe('MarketplaceAdminService', () => {
  let service: MarketplaceAdminService;
  let redis: jest.Mocked<RedisService>;
  let kafka: jest.Mocked<KafkaProducerService>;
  let categoryRepo: any;
  let productRepo: any;
  let sellerRepo: any;
  let orderRepo: any;

  const mockRepoFactory = () => ({
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    findAndCount: jest.fn().mockResolvedValue([[], 0]),
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn().mockImplementation((dto: any) => dto),
    save: jest.fn().mockImplementation((e: any) => Promise.resolve({ id: 'mock-id', ...e })),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    findTrees: jest.fn().mockResolvedValue([]),
    findDescendants: jest.fn().mockResolvedValue([]),
    createQueryBuilder: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(), leftJoin: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(), setParameter: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(), addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(), take: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(), clone: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null), getMany: jest.fn().mockResolvedValue([]),
      getCount: jest.fn().mockResolvedValue(0), getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      getRawOne: jest.fn().mockResolvedValue({}), getRawMany: jest.fn().mockResolvedValue([]),
    }),
  });

  beforeEach(async () => {
    const redisMock: Partial<jest.Mocked<RedisService>> = {
      get: jest.fn().mockResolvedValue(null), set: jest.fn().mockResolvedValue('OK'),
      getJson: jest.fn().mockResolvedValue(null), setJson: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
    };
    const kafkaMock: Partial<jest.Mocked<KafkaProducerService>> = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketplaceAdminService,
        { provide: RedisService, useValue: redisMock },
        { provide: KafkaProducerService, useValue: kafkaMock },
        { provide: MarketplaceHomeCacheService, useValue: {
          saveBanner: jest.fn().mockResolvedValue({ success: true }),
          deleteBanner: jest.fn().mockResolvedValue({ success: true }),
          invalidateHomeCache: jest.fn().mockResolvedValue(undefined),
        } },
        { provide: getRepositoryToken(Product), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(Seller), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(Category), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(Brand), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(Review), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(MarketplaceOrder), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(ReturnRequest), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(ProductAttribute), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(ProductQuestion), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(MarketplaceNotification), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(FlashDeal), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(FlashDealNomination), useFactory: mockRepoFactory },
      ],
    }).compile();

    service = module.get<MarketplaceAdminService>(MarketplaceAdminService);
    redis = module.get(RedisService);
    kafka = module.get(KafkaProducerService);
    categoryRepo = module.get(getRepositoryToken(Category));
    productRepo = module.get(getRepositoryToken(Product));
    sellerRepo = module.get(getRepositoryToken(Seller));
    orderRepo = module.get(getRepositoryToken(MarketplaceOrder));
  });

  describe('createCategory', () => {
    it('should create category with auto-slug', async () => {
      categoryRepo.findOne.mockResolvedValue(null); // no duplicate
      categoryRepo.create.mockImplementation((dto: any) => dto);
      categoryRepo.save.mockResolvedValue({ id: 'c1', name: 'Smart Home', slug: 'smart-home' });
      const result = await service.createCategory({ name: 'Smart Home' });
      expect(result.success).toBe(true);
      expect(result.slug).toBe('smart-home');
      expect(kafka.publish).toHaveBeenCalledWith('category.created', expect.any(Object));
    });

    it('should reject duplicate slug', async () => {
      categoryRepo.findOne.mockResolvedValue({ id: 'existing' });
      await expect(service.createCategory({ name: 'Existing' })).rejects.toThrow();
    });
  });

  describe('getAdminDashboard', () => {
    it('should return aggregated admin stats', async () => {
      redis.getJson.mockResolvedValue(null);
      const result: any = await service.getAdminDashboard('IN');
      expect(result.sellers).toBeDefined();
      expect(result.products).toBeDefined();
      expect(result.orders).toBeDefined();
      expect(result.revenue).toBeDefined();
      expect(result.country).toBe('IN');
    });

    it('should return cached stats', async () => {
      const cached = { sellers: { total: 100 } };
      redis.getJson.mockResolvedValue(cached);
      const result: any = await service.getAdminDashboard();
      expect(result.sellers.total).toBe(100);
    });
  });
});
