import { Test, type TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { SellerService } from './seller.service';
import { RedisService } from '@app/redis';
import { KafkaProducerService } from '@app/kafka';
import { EncryptionService } from '@app/security';
import { Seller } from '../entities/seller.entity';
import { Product } from '../entities/product.entity';
import { ProductListing } from '../entities/product-listing.entity';
import { MarketplaceOrder } from '../entities/marketplace-order.entity';
import { Review } from '../entities/review.entity';
import { SellerSettings } from '../entities/seller-settings.entity';
import { SellerKyc } from '../entities/seller-kyc.entity';
import { ReturnRequest } from '../entities/return-request.entity';
import { ProductImage } from '../entities/product-image.entity';
import { ProductVariant } from '../entities/product-variant.entity';
import { ProductQuestion, ProductAnswer } from '../entities/product-qa.entity';
import { MarketplaceNotification } from '../entities/marketplace-notification.entity';
import { SellerBankAccount } from '../entities/seller-bank-account.entity';
import { SellerStaff } from '../entities/seller-staff.entity';
import { SellerPromotion } from '../entities/seller-promotion.entity';
import { SellerSupportTicket } from '../entities/seller-support-ticket.entity';
import { CatalogService } from '../catalog/catalog.service';
import { AttributeValuesService } from '../catalog/attribute-values.service';

describe('SellerService', () => {
  let service: SellerService;
  let redis: jest.Mocked<RedisService>;
  let kafka: jest.Mocked<KafkaProducerService>;
  let sellerRepo: any;
  let productRepo: any;
  let orderRepo: any;
  let kycRepo: any;
  let settingsRepo: any;
  let bankRepo: any;
  let dataSource: any;
  let listingRepo: any;
  let catalogMock: { recomputeBuyBox: jest.Mock };

  /** Entity → mock repository, shared between DI and the transaction manager. */
  const repoByEntity = new Map<unknown, any>();
  const entityManagerMock = {
    getRepository: (entity: unknown) => {
      const repo = repoByEntity.get(entity);
      if (!repo)
        throw new Error(`No mock repository registered for ${String((entity as any)?.name)}`);
      return repo;
    },
  };

  const mockRepoFactory = () => ({
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    findAndCount: jest.fn().mockResolvedValue([[], 0]),
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockImplementation((e) => Promise.resolve({ id: 'mock-uuid', ...e })),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    createQueryBuilder: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      // The dashboard's order pipeline is one grouped query — see
      // `getSellerDashboard`. Without this the mock chain ends at `.where()`.
      groupBy: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
      getCount: jest.fn().mockResolvedValue(0),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      getRawMany: jest.fn().mockResolvedValue([]),
      getRawOne: jest.fn().mockResolvedValue({ avg: '4.5', count: '10', sum: '50000' }),
    }),
  });

  beforeEach(async () => {
    const redisMock: Partial<jest.Mocked<RedisService>> = {
      setJson: jest.fn().mockResolvedValue('OK'),
      getJson: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
      // Price, stock and image writes drop the storefront's catalogue caches.
      delPattern: jest.fn().mockResolvedValue(0),
    };
    const kafkaMock: Partial<jest.Mocked<KafkaProducerService>> = {
      publish: jest.fn().mockResolvedValue(undefined),
    };
    catalogMock = {
      recomputeBuyBox: jest.fn().mockResolvedValue({ productId: 'p1', winnerId: 'l1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SellerService,
        { provide: RedisService, useValue: redisMock },
        { provide: KafkaProducerService, useValue: kafkaMock },
        // Attribute values: the product write path validates against the
        // category schema and stores rows through this service. An empty
        // schema accepts an empty submission, which is what these cases send.
        {
          provide: AttributeValuesService,
          useValue: {
            definitionsForCategories: async () => [],
            replaceForProduct: async () => undefined,
            forProducts: async () => new Map(),
          },
        },
        { provide: getRepositoryToken(Seller), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(Product), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(ProductListing), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(MarketplaceOrder), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(Review), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(SellerSettings), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(SellerKyc), useFactory: mockRepoFactory },
        // Seller returns and refunds now read the real return_requests table.
        { provide: getRepositoryToken(ReturnRequest), useFactory: mockRepoFactory },
        // Product media, variants, Q&A, notifications and payout destinations.
        // All five read real tables now; each previously had no backend at all.
        { provide: getRepositoryToken(ProductImage), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(ProductVariant), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(ProductQuestion), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(ProductAnswer), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(MarketplaceNotification), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(SellerBankAccount), useFactory: mockRepoFactory },
        {
          provide: EncryptionService,
          useValue: {
            encrypt: jest.fn((v: string) => `enc:${v}`),
            decrypt: jest.fn((v: string) => v),
          },
        },
        // Staff, promotions and support tickets are real tables now, rather than
        // the fabricated `STF-`/`PROMO-`/`TKT-` ids the service used to invent.
        { provide: getRepositoryToken(SellerStaff), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(SellerPromotion), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(SellerSupportTicket), useFactory: mockRepoFactory },
        // Registration writes seller + KYC + settings + payout destination in one
        // transaction. `getRepository` resolves to the SAME mocks registered
        // above, so assertions can be written against `sellerRepo`/`kycRepo`
        // whether the call went through the injected repository or the
        // transaction's EntityManager.
        {
          provide: getDataSourceToken(),
          useFactory: () => ({
            transaction: jest.fn(async (cb: any) => cb(entityManagerMock)),
          }),
        },
        // Owns the buy box. Every listing mutation hands it back so the winning
        // offer is recalculated — see the listing tests below, which assert that
        // it is actually called rather than that it produces a particular winner
        // (choosing the winner is CatalogService's own test's job).
        { provide: CatalogService, useValue: catalogMock },
      ],
    }).compile();

    service = module.get<SellerService>(SellerService);
    redis = module.get(RedisService);
    kafka = module.get(KafkaProducerService);
    sellerRepo = module.get(getRepositoryToken(Seller));
    productRepo = module.get(getRepositoryToken(Product));
    orderRepo = module.get(getRepositoryToken(MarketplaceOrder));
    kycRepo = module.get(getRepositoryToken(SellerKyc));
    dataSource = module.get(getDataSourceToken());

    // Wire the transaction's manager to the resolved mocks.
    repoByEntity.set(Seller, sellerRepo);
    repoByEntity.set(SellerKyc, kycRepo);
    repoByEntity.set(SellerSettings, module.get(getRepositoryToken(SellerSettings)));
    repoByEntity.set(SellerBankAccount, module.get(getRepositoryToken(SellerBankAccount)));
    // Product content edits and their attribute values commit together.
    repoByEntity.set(Product, productRepo);
    settingsRepo = repoByEntity.get(SellerSettings);
    bankRepo = repoByEntity.get(SellerBankAccount);
    listingRepo = module.get(getRepositoryToken(ProductListing));
  });

  describe('healthCheck', () => {
    it('should return ok', async () => {
      const result = await service.healthCheck();
      expect(result.service).toBe('marketplace-service:seller');
      expect(result.status).toBe('ok');
    });
  });

  describe('getSellerProfile', () => {
    it('should return cached profile', async () => {
      const cached = { id: 's1', name: 'Super Seller' };
      redis.getJson.mockResolvedValue(cached);
      const result = await service.getSellerProfile('s1', 'IN');
      expect(result).toEqual(cached);
    });

    it('should throw when seller not found', async () => {
      redis.getJson.mockResolvedValue(null);
      sellerRepo.findOne.mockResolvedValue(null);
      await expect(service.getSellerProfile('missing', 'IN')).rejects.toThrow();
    });

    it('should query DB and cache when not cached', async () => {
      redis.getJson.mockResolvedValue(null);
      sellerRepo.findOne.mockResolvedValue({
        id: 's1',
        businessName: 'Super Seller',
        countryCode: 'IN',
      });
      kycRepo.findOne.mockResolvedValue({ sellerId: 's1', status: 'VERIFIED' });
      orderRepo.count.mockResolvedValue(42);
      const result = await service.getSellerProfile('s1', 'IN');
      expect(result.id).toBe('s1');
      expect(redis.setJson).toHaveBeenCalled();
    });
  });

  describe('getSellerProducts', () => {
    it('should return paginated products', async () => {
      productRepo
        .createQueryBuilder()
        .getManyAndCount.mockResolvedValue([[{ id: 'p1', name: 'Widget' }], 1]);
      const result = await service.getSellerProducts('s1', 'IN');
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('getSellerOrders', () => {
    it('should return seller orders', async () => {
      orderRepo
        .createQueryBuilder()
        .getManyAndCount.mockResolvedValue([[{ id: 'o1', status: 'PENDING' }], 1]);
      const result = await service.getSellerOrders('s1', 'IN');
      expect(result.data).toHaveLength(1);
    });
  });

  describe('getSellerDashboard', () => {
    it('should return dashboard metrics', async () => {
      redis.getJson.mockResolvedValue(null);
      const result = await service.getSellerDashboard('s1', 'IN');
      expect(result).toBeDefined();
      expect(result.sellerId).toBe('s1');
    });

    /**
     * The portal's Today / Last 7 Days / This Month buttons used to be inert:
     * `period` was accepted by the route, never passed to this method, and the
     * headline tile always showed today's revenue. The buttons re-fetched and
     * re-rendered the identical number.
     */
    it('reports back the window it actually measured', async () => {
      redis.getJson.mockResolvedValue(null);
      for (const period of ['today', 'week', 'month'] as const) {
        await expect(service.getSellerDashboard('s1', 'IN', period)).resolves.toMatchObject({
          period,
        });
      }
    });

    it('falls back to today when handed a period it does not recognise', async () => {
      redis.getJson.mockResolvedValue(null);
      const result = await service.getSellerDashboard('s1', 'IN', 'quarter' as any);
      expect(result.period).toBe('today');
    });

    /**
     * A shared cache key would have served the first period fetched back for the
     * other two for its whole 120s life — the buttons would look wired for one
     * click and then freeze.
     */
    it('caches each period separately', async () => {
      redis.getJson.mockResolvedValue(null);
      await service.getSellerDashboard('s1', 'IN', 'week');
      await service.getSellerDashboard('s1', 'IN', 'month');

      const keys = redis.setJson.mock.calls.map((c: any[]) => c[0]);
      expect(keys).toContain('seller:dashboard:s1:week');
      expect(keys).toContain('seller:dashboard:s1:month');
      expect(redis.getJson).toHaveBeenCalledWith('seller:dashboard:s1:week');
      expect(redis.getJson).toHaveBeenCalledWith('seller:dashboard:s1:month');
    });

    /**
     * "Total Revenue" and "Monthly Sales" sat side by side on the dashboard
     * showing the same `monthlyRevenue` value — one of the two was always wrong.
     */
    it('reports lifetime revenue separately from the monthly figure', async () => {
      redis.getJson.mockResolvedValue(null);
      const result = await service.getSellerDashboard('s1', 'IN');
      expect(result).toHaveProperty('lifetimeRevenue');
      expect(result).toHaveProperty('periodRevenue');
      expect(result).toHaveProperty('periodOrders');
    });

    /**
     * Cache invalidation must clear every period variant, not just one.
     *
     * When the period moved into the cache key, the six call sites that dropped
     * the dashboard still deleted the old bare `seller:dashboard:<id>` — a key
     * nothing writes any more. A seller watched the live "new order" toast
     * appear over a pipeline that still showed the previous counts.
     */
    it('a new seller order clears every cached period for that seller', async () => {
      orderRepo.findOne.mockResolvedValue(null);
      orderRepo.save.mockImplementation((o: any) => Promise.resolve({ id: 'o-1', ...o }));

      await service.createSellerOrders({
        orderId: 'ord-1',
        orderNumber: 'ORD-1',
        customerId: 'c-1',
        items: [{ productId: 'p-1', sellerId: 's1', quantity: 1, price: 100 }],
      });

      const deleted = redis.del.mock.calls.map((c: any[]) => c[0]);
      expect(deleted).toEqual(
        expect.arrayContaining([
          'seller:dashboard:s1:today',
          'seller:dashboard:s1:week',
          'seller:dashboard:s1:month',
        ]),
      );
    });

    it('clears the same keys the dashboard actually writes', async () => {
      redis.getJson.mockResolvedValue(null);
      redis.setJson.mockClear();
      redis.del.mockClear();

      for (const p of ['today', 'week', 'month'] as const) {
        await service.getSellerDashboard('s1', 'IN', p);
      }
      const written = redis.setJson.mock.calls.map((c: any[]) => c[0]);

      orderRepo.findOne.mockResolvedValue(null);
      orderRepo.save.mockImplementation((o: any) => Promise.resolve({ id: 'o-2', ...o }));
      await service.createSellerOrders({
        orderId: 'ord-2',
        orderNumber: 'ORD-2',
        customerId: 'c-1',
        items: [{ productId: 'p-1', sellerId: 's1', quantity: 1, price: 100 }],
      });
      const deleted = redis.del.mock.calls.map((c: any[]) => c[0]);

      for (const key of written) expect(deleted).toContain(key);
    });
  });

  describe('registerSeller', () => {
    const canonical = {
      businessName: 'New Store',
      ownerName: 'Jane Doe',
      email: 'seller@test.com',
      phone: '+91982345678',
      country: 'IN',
    };

    beforeEach(() => {
      sellerRepo.create.mockImplementation((dto: any) => dto);
      sellerRepo.save.mockImplementation((e: any) => Promise.resolve({ id: 's-new', ...e }));
      // No existing seller for this owner, and the slug is free.
      sellerRepo.findOne.mockResolvedValue(null);
    });

    it('binds the new seller to the authenticated owner', async () => {
      const result = await service.registerSeller(canonical, 'user-42');

      expect(result.success).toBe(true);
      expect(sellerRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ ownerId: 'user-42' }),
      );
      expect(kafka.publish).toHaveBeenCalled();
    });

    it('refuses to create an ownerless seller — it would be unreachable by its owner', async () => {
      await expect(service.registerSeller({ ...canonical })).rejects.toThrow(
        /authenticated owner/i,
      );
      expect(sellerRepo.save).not.toHaveBeenCalled();
    });

    it('accepts regionCode in place of country without throwing', async () => {
      await service.registerSeller(
        {
          businessName: 'Region Store',
          ownerName: 'R',
          email: 'r@test.com',
          phone: '+91982345678',
          regionCode: 'qa',
        },
        'user-42',
      );

      expect(sellerRepo.create).toHaveBeenCalledWith(expect.objectContaining({ regionCode: 'QA' }));
    });

    // The web onboarding wizard posts none of the canonical field names. Reading
    // only `country ?? regionCode` meant the market fell through to the 'IN'
    // default for every seller in every market, and the contact columns were
    // never written at all.
    it('reads the onboarding wizard field names, not just the canonical ones', async () => {
      await service.registerSeller(
        {
          businessName: 'Wizard Co',
          countryCode: 'QA',
          accountHolderName: 'Wiz Owner',
          businessEmail: 'wiz@test.com',
          businessPhone: '+97455512345',
          taxId: 'QA-TAX-1',
          storeDisplayName: 'Wizard Store',
          stateRegion: 'Doha',
        },
        'user-42',
      );

      expect(sellerRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          regionCode: 'QA',
          ownerName: 'Wiz Owner',
          email: 'wiz@test.com',
          phone: '+97455512345',
        }),
      );
      expect(kycRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ ownerFullName: 'Wiz Owner', countryCode: 'QA' }),
      );
      expect(settingsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ storeName: 'Wizard Store' }),
      );
    });

    // `seller_kyc.ownerFullName` is NOT NULL, so an absent owner name used to
    // surface as a duplicate-key-adjacent 500 that the gateway reported as an
    // outage — after the seller row had already been written.
    it('rejects a payload with no owner details before writing anything', async () => {
      await expect(
        service.registerSeller({ businessName: 'Nameless Ltd' }, 'user-42'),
      ).rejects.toThrow(/ownerName, email, phone/);
      expect(sellerRepo.save).not.toHaveBeenCalled();
    });

    it('writes seller, KYC, settings and payout destination in ONE transaction', async () => {
      await service.registerSeller(
        {
          ...canonical,
          bankDetails: {
            accountHolderName: 'Jane Doe',
            bankName: 'HDFC',
            accountNumber: '123456789',
          },
        },
        'user-42',
      );

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(sellerRepo.save).toHaveBeenCalled();
      expect(kycRepo.save).toHaveBeenCalled();
      expect(settingsRepo.save).toHaveBeenCalled();
      expect(bankRepo.save).toHaveBeenCalled();
    });

    // The payout destination belongs in `seller_bank_accounts`, encrypted — never
    // in the plaintext `seller_settings.bankDetails` jsonb column.
    it('encrypts the account number and never stores it in settings', async () => {
      await service.registerSeller(
        {
          ...canonical,
          bankDetails: {
            accountHolderName: 'Jane Doe',
            bankName: 'HDFC',
            accountNumber: '123456789',
          },
        },
        'user-42',
      );

      expect(bankRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ accountNumberLast4: '6789', accountNumberEnc: 'enc:123456789' }),
      );
      const settingsArg = settingsRepo.create.mock.calls[0][0];
      expect(settingsArg).not.toHaveProperty('bankDetails');
      expect(JSON.stringify(settingsArg)).not.toContain('123456789');
    });

    it('refuses a second seller account for the same owner', async () => {
      sellerRepo.findOne.mockResolvedValue({ id: 's-existing', businessName: 'First Store' });

      await expect(service.registerSeller(canonical, 'user-42')).rejects.toThrow(
        /already have a seller account/i,
      );
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    // Two businesses with the same name must both be able to register. The slug
    // is UNIQUE, and a collision used to be a 500.
    it('suffixes the store slug when the derived one is taken', async () => {
      const taken = new Set(['metro-traders', 'metro-traders-2']);
      // First call is the one-account-per-owner check; the rest are slug probes.
      sellerRepo.findOne.mockImplementation(async ({ where }: any) =>
        where?.storeSlug ? (taken.has(where.storeSlug) ? { id: 'x' } : null) : null,
      );

      await service.registerSeller({ ...canonical, businessName: 'Metro Traders' }, 'user-42');

      expect(sellerRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ storeSlug: 'metro-traders-3' }),
      );
    });
  });

  describe('getGst', () => {
    it('masks PAN and GSTIN down to their last 4 characters', async () => {
      kycRepo.findOne.mockResolvedValue({
        sellerId: 's1',
        gstin: '27AAPFU0939F1ZV',
        panNumber: 'AAPFU0939F',
      });

      const result = await service.getGst('s1');

      expect(result.gstin).toBe('•'.repeat(11) + 'F1ZV');
      expect(result.panNumber).toBe('•'.repeat(6) + '939F');
      expect(result.gstin).not.toContain('27AAPFU');
      expect(result.panNumber).not.toContain('AAPFU');
      expect(result.gstStatus).toBe('Active');
    });

    it('returns empty strings when nothing is on file, not a row of dots', async () => {
      kycRepo.findOne.mockResolvedValue({ sellerId: 's1' });

      const result = await service.getGst('s1');

      expect(result.gstin).toBe('');
      expect(result.panNumber).toBe('');
      expect(result.gstStatus).toBe('Not Registered');
    });
  });

  /**
   * Offering on a product someone else authored — the capability that makes this
   * a marketplace rather than a collection of independent shops. Before it,
   * `addProduct` was the only way to create a listing and it always minted a new
   * catalogue entry, so `product_listings`' `(product, seller)` unique key and
   * its buy-box flag described a situation nothing could produce.
   */
  describe('addListing', () => {
    const APPROVED_PRODUCT = {
      id: 'prod-1',
      name: 'Wireless Earbuds',
      slug: 'wireless-earbuds',
      approval_status: 'APPROVED',
      mrp: 2999,
    };

    beforeEach(() => {
      productRepo.findOne.mockResolvedValue(APPROVED_PRODUCT);
      listingRepo.findOne.mockResolvedValue(null);
      listingRepo.save.mockImplementation((l: any) => Promise.resolve({ id: 'listing-new', ...l }));
    });

    it('attaches a second seller’s offer to an existing product', async () => {
      const result = await service.addListing('seller-2', {
        productId: 'prod-1',
        sellingPrice: 2499,
        stock: 10,
      });

      expect(result.success).toBe(true);
      expect(result.productId).toBe('prod-1');
      // No new catalogue entry: the whole point is that both sellers land on the
      // same product page.
      expect(productRepo.save).not.toHaveBeenCalled();
    });

    it('lands PENDING and inactive — product approval is not offer approval', async () => {
      await service.addListing('seller-2', { productId: 'prod-1', sellingPrice: 2499, stock: 10 });

      expect(listingRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          approvalStatus: 'PENDING',
          isActive: false,
          isBuyBoxWinner: false,
        }),
      );
    });

    it('finds the product by the barcode on the box', async () => {
      // A seller listing stock they did not author has the GTIN, not our id.
      await service.addListing('seller-2', { gtin: '8901234567890', sellingPrice: 2499, stock: 4 });

      expect(productRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { globalTradeItemNumber: '8901234567890' } }),
      );
    });

    it('refuses to offer on a product that has not been approved', async () => {
      productRepo.findOne.mockResolvedValue({ ...APPROVED_PRODUCT, approval_status: 'PENDING' });

      await expect(
        service.addListing('seller-2', { productId: 'prod-1', sellingPrice: 2499, stock: 1 }),
      ).rejects.toThrow(/not been approved/i);
    });

    it('refuses a second offer from the same seller on the same product', async () => {
      listingRepo.findOne.mockResolvedValue({ id: 'listing-existing' });

      await expect(
        service.addListing('seller-2', { productId: 'prod-1', sellingPrice: 2499, stock: 1 }),
      ).rejects.toThrow(/already offer this product/i);
    });

    it('refuses a price of zero', async () => {
      await expect(
        service.addListing('seller-2', { productId: 'prod-1', sellingPrice: 0, stock: 1 }),
      ).rejects.toThrow(/greater than zero/i);
    });

    it('requires the seller to name a product at all', async () => {
      await expect(
        service.addListing('seller-2', { sellingPrice: 2499, stock: 1 }),
      ).rejects.toThrow(/productId or GTIN/i);
    });
  });

  describe('updateListing', () => {
    beforeEach(() => {
      listingRepo.findOne.mockResolvedValue({
        id: 'listing-1',
        approvalStatus: 'APPROVED',
        isActive: true,
        sellingPrice: 2499,
        stockQuantity: 5,
        product: { id: 'prod-1' },
      });
    });

    it('recomputes the buy box after a price change', async () => {
      // The event the buy box most needs to respond to, and the one nothing
      // responded to: `isBuyBoxWinner` was written once at creation and never
      // revisited, so undercutting a rival changed nothing.
      await service.updateListing('seller-2', 'listing-1', { sellingPrice: 1999 });

      expect(catalogMock.recomputeBuyBox).toHaveBeenCalledWith('prod-1');
    });

    it('refuses to switch an unapproved offer on', async () => {
      listingRepo.findOne.mockResolvedValue({
        id: 'listing-1',
        approvalStatus: 'PENDING',
        isActive: false,
        product: { id: 'prod-1' },
      });

      await expect(
        service.updateListing('seller-2', 'listing-1', { isActive: true }),
      ).rejects.toThrow(/awaiting approval/i);
    });

    it('will not edit another seller’s offer', async () => {
      listingRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateListing('seller-9', 'listing-1', { sellingPrice: 1 }),
      ).rejects.toThrow(/No listing of yours/i);
    });
  });

  describe('updateProduct', () => {
    beforeEach(() => {
      productRepo.findOne.mockResolvedValue({
        id: 'prod-1',
        seller_id: 'seller-1',
        name: 'Old name',
        approval_status: 'PENDING',
        is_active: false,
      });
    });

    it('writes the catalogue fields a seller owns', async () => {
      await service.updateProduct('seller-1', 'prod-1', { name: 'New name' });

      expect(productRepo.save).toHaveBeenCalledWith(expect.objectContaining({ name: 'New name' }));
    });

    it('ignores moderation fields — this was `Object.assign(product, dto)`', async () => {
      // Self-approval. The old mass assignment let a seller PUT
      // `{approval_status: 'APPROVED', is_active: true}` onto their own product
      // and skip review entirely, which made the whole approvals queue advisory.
      await service.updateProduct('seller-1', 'prod-1', {
        name: 'New name',
        approval_status: 'APPROVED',
        is_active: true,
      });

      expect(productRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ approval_status: 'PENDING', is_active: false }),
      );
    });

    it('ignores an attempt to hand the product to another seller', async () => {
      await service.updateProduct('seller-1', 'prod-1', { seller_id: 'seller-9' });

      expect(productRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ seller_id: 'seller-1' }),
      );
    });

    it('sends an approved product back to review when its content changes', async () => {
      // There is no revision table, so the previously approved content cannot
      // stay live next to the edit: the product leaves public view until an
      // admin re-approves it, and the reply says so.
      productRepo.findOne.mockResolvedValue({
        id: 'prod-1',
        seller_id: 'seller-1',
        name: 'Old name',
        slug: 'old-name',
        approval_status: 'APPROVED',
        is_active: true,
      });

      const result = await service.updateProduct('seller-1', 'prod-1', { name: 'New name' });

      expect(productRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New name', approval_status: 'PENDING' }),
      );
      expect(result).toMatchObject({ reReview: true, approvalStatus: 'PENDING' });
      expect(result.message).toMatch(/off sale until an admin re-approves/);
    });

    it('refuses attribute values that fail the category schema, by field', async () => {
      // The mocked schema is empty, so any slug is "not an attribute of this
      // category". Nothing is written when validation fails.
      await expect(
        service.updateProduct('seller-1', 'prod-1', {
          attributes: [{ slug: 'ram', value: 'hello' }],
        }),
      ).rejects.toMatchObject({
        status: 400,
        response: { errors: [{ slug: 'ram', message: expect.stringMatching(/not an attribute/) }] },
      });
      expect(productRepo.save).not.toHaveBeenCalled();
    });

    it('leaves stored attribute values alone when the field is not sent', async () => {
      const result = await service.updateProduct('seller-1', 'prod-1', { name: 'Renamed' });

      expect(result.updated).toEqual(['name']);
    });
  });
});
