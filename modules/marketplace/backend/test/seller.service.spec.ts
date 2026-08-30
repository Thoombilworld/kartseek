import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { RedisService } from '@app/redis';
import { KafkaProducerService } from '@app/kafka';
import { EncryptionService } from '@app/security';
import { SellerService } from '../src/seller/seller.service';
import { CatalogService } from '../src/catalog/catalog.service';
import { Seller } from '../src/entities/seller.entity';
import { SellerSettings } from '../src/entities/seller-settings.entity';
import { SellerKyc } from '../src/entities/seller-kyc.entity';
import { Product } from '../src/entities/product.entity';
import { ProductListing } from '../src/entities/product-listing.entity';
import { MarketplaceOrder } from '../src/entities/marketplace-order.entity';
import { Review } from '../src/entities/review.entity';
import { ReturnRequest } from '../src/entities/return-request.entity';
import { ProductImage } from '../src/entities/product-image.entity';
import { ProductVariant } from '../src/entities/product-variant.entity';
import { ProductQuestion, ProductAnswer } from '../src/entities/product-qa.entity';
import { MarketplaceNotification } from '../src/entities/marketplace-notification.entity';
import { SellerBankAccount } from '../src/entities/seller-bank-account.entity';
import { SellerStaff } from '../src/entities/seller-staff.entity';
import { SellerPromotion } from '../src/entities/seller-promotion.entity';
import { SellerSupportTicket } from '../src/entities/seller-support-ticket.entity';

// ── Mocks ──────────────────────────────────────────────────────────────────
const mockRedis = {
  getJson: jest.fn().mockResolvedValue(null),
  setJson: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
};

const mockKafka = {
  publish: jest.fn().mockResolvedValue(undefined),
};

const mockEncryption = {
  encrypt: jest.fn().mockImplementation((v: string) => `enc:${v}`),
  decrypt: jest.fn().mockImplementation((v: string) => String(v).replace(/^enc:/, '')),
};

// Owns the buy box. Every listing mutation calls back into it, so it has to be
// present even for the tests that never assert on it.
const mockCatalog = {
  recomputeBuyBox: jest.fn().mockResolvedValue(undefined),
};

// `registerSeller` writes four tables in one transaction, and it writes through
// the transaction manager's repositories rather than the injected ones — so
// assertions about what it persisted have to target these, not `sellerRepo` &c.
const txRepos = new Map<unknown, ReturnType<typeof createMockRepo>>();
function txRepo(entity: unknown) {
  if (!txRepos.has(entity)) txRepos.set(entity, createMockRepo());
  return txRepos.get(entity)!;
}

const mockManager = {
  getRepository: jest.fn((entity: unknown) => txRepo(entity)),
};

const mockDataSource = {
  transaction: jest.fn().mockImplementation((cb: (mgr: unknown) => unknown) => cb(mockManager)),
};

function createMockRepo() {
  const qb = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    getCount: jest.fn().mockResolvedValue(0),
    getOne: jest.fn().mockResolvedValue(null),
    getRawOne: jest.fn().mockResolvedValue({ sum: '0', total: '0' }),
    getRawMany: jest.fn().mockResolvedValue([]),
  };
  return {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    findAndCount: jest.fn().mockResolvedValue([[], 0]),
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn().mockImplementation((dto) => ({ id: 'mock-id', ...dto })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'mock-id', ...entity })),
    remove: jest.fn().mockResolvedValue(undefined),
    createQueryBuilder: jest.fn(() => qb),
  };
}

describe('SellerService', () => {
  let service: SellerService;
  let sellerRepo: ReturnType<typeof createMockRepo>;
  let settingsRepo: ReturnType<typeof createMockRepo>;
  let kycRepo: ReturnType<typeof createMockRepo>;
  let productRepo: ReturnType<typeof createMockRepo>;
  let listingRepo: ReturnType<typeof createMockRepo>;
  let orderRepo: ReturnType<typeof createMockRepo>;
  let reviewRepo: ReturnType<typeof createMockRepo>;

  beforeEach(async () => {
    sellerRepo = createMockRepo();
    settingsRepo = createMockRepo();
    kycRepo = createMockRepo();
    productRepo = createMockRepo();
    listingRepo = createMockRepo();
    orderRepo = createMockRepo();
    reviewRepo = createMockRepo();
    // Fresh transaction-scoped repositories per test; `clearAllMocks` resets
    // call history but would otherwise leave the same instances in place.
    txRepos.clear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SellerService,
        { provide: RedisService, useValue: mockRedis },
        { provide: KafkaProducerService, useValue: mockKafka },
        { provide: getRepositoryToken(Seller), useValue: sellerRepo },
        { provide: getRepositoryToken(SellerSettings), useValue: settingsRepo },
        { provide: getRepositoryToken(SellerKyc), useValue: kycRepo },
        { provide: getRepositoryToken(Product), useValue: productRepo },
        { provide: getRepositoryToken(ProductListing), useValue: listingRepo },
        { provide: getRepositoryToken(MarketplaceOrder), useValue: orderRepo },
        { provide: getRepositoryToken(Review), useValue: reviewRepo },
        // The repositories below were added to SellerService after this spec was
        // written. The spec never noticed because `<rootDir>/test/` sat in
        // jest's testPathIgnorePatterns, so it had not run since. They get a
        // generic mock each: no assertion here touches them, but Nest resolves
        // the whole constructor before any test body runs.
        { provide: getRepositoryToken(ReturnRequest), useValue: createMockRepo() },
        { provide: getRepositoryToken(ProductImage), useValue: createMockRepo() },
        { provide: getRepositoryToken(ProductVariant), useValue: createMockRepo() },
        { provide: getRepositoryToken(ProductQuestion), useValue: createMockRepo() },
        { provide: getRepositoryToken(ProductAnswer), useValue: createMockRepo() },
        { provide: getRepositoryToken(MarketplaceNotification), useValue: createMockRepo() },
        { provide: getRepositoryToken(SellerBankAccount), useValue: createMockRepo() },
        { provide: getRepositoryToken(SellerStaff), useValue: createMockRepo() },
        { provide: getRepositoryToken(SellerPromotion), useValue: createMockRepo() },
        { provide: getRepositoryToken(SellerSupportTicket), useValue: createMockRepo() },
        { provide: EncryptionService, useValue: mockEncryption },
        { provide: getDataSourceToken(), useValue: mockDataSource },
        { provide: CatalogService, useValue: mockCatalog },
      ],
    }).compile();

    service = module.get<SellerService>(SellerService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('healthCheck', () => {
    it('should return ok status', async () => {
      const result = await service.healthCheck();
      expect(result.status).toBe('ok');
      expect(result.service).toBe('marketplace-service:seller');
    });
  });

  describe('getSellerProfile', () => {
    it('should return cached profile if available', async () => {
      const cached = { id: 'seller-1', businessName: 'Test' };
      mockRedis.getJson.mockResolvedValueOnce(cached);
      const result = await service.getSellerProfile('seller-1', 'IN');
      expect(result).toEqual(cached);
    });

    it('should query DB and cache when no cache hit', async () => {
      const seller = { id: 'seller-1', businessName: 'Test Store', verificationStatus: 'ACTIVE', sellerRating: 4.5, storeSlug: 'test', regionCode: 'IN', createdAt: new Date() };
      sellerRepo.findOne.mockResolvedValueOnce(seller);
      kycRepo.findOne.mockResolvedValueOnce({ status: 'APPROVED' });
      orderRepo.count.mockResolvedValueOnce(100);

      const result = await service.getSellerProfile('seller-1', 'IN');
      expect(result.businessName).toBe('Test Store');
      expect(result.kycStatus).toBe('APPROVED');
      expect(result.totalOrders).toBe(100);
      expect(mockRedis.setJson).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent seller', async () => {
      sellerRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.getSellerProfile('nonexistent', 'IN')).rejects.toThrow('not found');
    });
  });

  describe('registerSeller', () => {
    const dto = {
      businessName: 'New Store',
      ownerName: 'John Doe',
      email: 'john@test.com',
      phone: '+919800000000',
      businessType: 'LLC',
      country: 'IN',
    };

    it('should create seller, KYC, and settings records', async () => {
      const result = await service.registerSeller(dto, 'user-1');

      expect(result.success).toBe(true);
      expect(mockDataSource.transaction).toHaveBeenCalled();

      expect(txRepo(Seller).create).toHaveBeenCalledWith(
        expect.objectContaining({ businessName: 'New Store', ownerId: 'user-1', verificationStatus: 'PENDING' }),
      );
      expect(txRepo(Seller).save).toHaveBeenCalled();
      expect(txRepo(SellerKyc).create).toHaveBeenCalledWith(
        expect.objectContaining({ ownerFullName: 'John Doe', countryCode: 'IN', status: 'PENDING' }),
      );
      expect(txRepo(SellerKyc).save).toHaveBeenCalled();
      expect(txRepo(SellerSettings).create).toHaveBeenCalled();
      expect(txRepo(SellerSettings).save).toHaveBeenCalled();
      expect(mockKafka.publish).toHaveBeenCalledWith('seller.registered', expect.any(Object));
    });

    // The account is bound to the signed-in user: without an owner id a single
    // endpoint could mint unlimited pending sellers into the approval queue.
    it('should refuse to register without an authenticated owner', async () => {
      await expect(service.registerSeller(dto)).rejects.toThrow(/authenticated owner/i);
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });

    it('should refuse a second seller account for the same user', async () => {
      sellerRepo.findOne.mockResolvedValueOnce({ id: 'seller-1', businessName: 'Existing Store' });
      await expect(service.registerSeller(dto, 'user-1')).rejects.toThrow(/already have a seller account/i);
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });
  });

  describe('getSellerOrders', () => {
    it('should return paginated orders', async () => {
      const mockOrders = [{ id: 'ORD-1', status: 'PENDING' }];
      const qb = orderRepo.createQueryBuilder();
      qb.getManyAndCount.mockResolvedValueOnce([mockOrders, 1]);

      const result = await service.getSellerOrders('seller-1', 'IN', undefined, 1, 20);
      expect(result.data).toEqual(mockOrders);
      expect(result.total).toBe(1);
    });
  });

  describe('acceptOrder', () => {
    it('should update order status to CONFIRMED', async () => {
      const order = { id: 'ORD-1', sellerId: 'seller-1', status: 'PENDING', orderNumber: 'ORD-1' };
      orderRepo.findOne.mockResolvedValueOnce(order);

      const result = await service.acceptOrder('seller-1', 'ORD-1');
      expect(result.success).toBe(true);
      expect(result.status).toBe('Accepted');
      expect(orderRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'CONFIRMED' }));
      expect(mockKafka.publish).toHaveBeenCalledWith('order.accepted', expect.any(Object));
    });
  });

  describe('getSettings', () => {
    it('should return combined settings and KYC data', async () => {
      settingsRepo.findOne.mockResolvedValueOnce({ storeName: 'My Store', isOnline: true, commissionRate: 15 });
      kycRepo.findOne.mockResolvedValueOnce({ status: 'APPROVED', ownerFullName: 'John' });

      const result = await service.getSettings('seller-1');
      expect(result.store.name).toBe('My Store');
      expect(result.kyc.status).toBe('APPROVED');
    });
  });

  describe('addProduct', () => {
    // `status` is the seller's publish intent and defaults to ACTIVE; the gate
    // that keeps a new product off the storefront is `approval_status`, which is
    // always PENDING here. This spec used to assert a DRAFT default, from before
    // those two were separated.
    it('should publish as ACTIVE but withhold approval', async () => {
      const dto = { name: 'Test Product', description: 'A test', price: 1000 };

      const result = await service.addProduct('seller-1', 'IN', dto);
      expect(result.success).toBe(true);
      expect(productRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Test Product', status: 'ACTIVE', approval_status: 'PENDING' }),
      );
      expect(mockKafka.publish).toHaveBeenCalledWith('seller.product.created', expect.any(Object));
    });

    it('should honour an explicit DRAFT status', async () => {
      const dto = { name: 'Draft Product', description: 'A test', price: 1000, status: 'DRAFT' };

      await service.addProduct('seller-1', 'IN', dto);
      expect(productRepo.create).toHaveBeenCalledWith(expect.objectContaining({ status: 'DRAFT' }));
    });
  });

  describe('getWallet', () => {
    // Withdrawable balance deliberately is not derived here: it lives in the
    // payout ledger, which also knows what has already been paid out. This
    // returns the order-derived aggregates and leaves `balance` null rather than
    // reporting a subtraction that would overstate what a seller can withdraw.
    it('should aggregate order totals and defer the withdrawable balance', async () => {
      const qb = orderRepo.createQueryBuilder();
      qb.getRawOne
        .mockResolvedValueOnce({ total: '500000' }) // gross sales
        .mockResolvedValueOnce({ total: '25000' }); // awaiting payment

      const result = await service.getWallet('seller-1');
      expect(result.sellerId).toBe('seller-1');
      expect(typeof result.grossSales).toBe('number');
      expect(typeof result.commission).toBe('number');
      expect(result.balance).toBeNull();
      expect(result.dataAvailable).toBe(false);
    });
  });
});
