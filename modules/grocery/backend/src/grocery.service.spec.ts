import { Test, type TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { type Repository } from 'typeorm';
import { GroceryService } from './grocery.service';
import { RedisService } from '@app/redis';
import { KafkaProducerService } from '@app/kafka';
import { GroceryCategory } from './entities/grocery-category.entity';
import { GroceryBrand } from './entities/grocery-brand.entity';
import { GroceryProductVariant } from './entities/grocery-product-variant.entity';
import { GroceryStockMovement } from './entities/grocery-stock-movement.entity';
import { GroceryWarehouse } from './entities/grocery-warehouse.entity';
import { GroceryVariantStock } from './entities/grocery-variant-stock.entity';
import { GroceryStore } from './entities/grocery-store.entity';
import { GroceryItem } from './entities/grocery-item.entity';
import {
  GroceryOrder,
  GroceryOrderStatus,
  GroceryPaymentMethod,
} from './entities/grocery-order.entity';
import { GroceryFlashDeal } from './entities/grocery-flash-deal.entity';
import { GroceryReview } from './entities/grocery-review.entity';
import { GroceryWishlist } from './entities/grocery-wishlist.entity';

describe('GroceryService', () => {
  let service: GroceryService;
  let redis: jest.Mocked<RedisService>;
  let kafka: jest.Mocked<KafkaProducerService>;
  let categoryRepo: jest.Mocked<Repository<GroceryCategory>>;
  let storeRepo: jest.Mocked<Repository<GroceryStore>>;
  let itemRepo: jest.Mocked<Repository<GroceryItem>>;
  let orderRepo: jest.Mocked<Repository<GroceryOrder>>;
  let flashRepo: jest.Mocked<Repository<GroceryFlashDeal>>;

  /**
   * Stand-in EntityManager for `orderRepo.manager.transaction(cb)`.
   *
   * `createGroceryOrder` writes the order row, the stock decrements and the store
   * counter in one transaction, so the mock has to run the callback rather than
   * resolve to undefined — otherwise the method returns "no order" and every
   * assertion downstream reads a value that was never produced.
   */
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
      groupBy: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      getRawMany: jest.fn().mockResolvedValue([]),
      getRawOne: jest.fn().mockResolvedValue(undefined),
      getCount: jest.fn().mockResolvedValue(0),
    }),
  });

  beforeEach(async () => {
    const redisMock: Partial<jest.Mocked<RedisService>> = {
      setJson: jest.fn().mockResolvedValue('OK'),
      getJson: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
      // Product-cache invalidation is SCAN + DEL; a missing `scan` makes every
      // catalogue write log a warning it should not be logging.
      scan: jest.fn().mockResolvedValue(['0', []]),
      // Category invalidation now purges the per-market `stocked:*` and
      // `tree:*` key patterns alongside the unscoped key (audit C §3); a
      // missing `delPattern` throws synchronously before the `.catch` on it
      // ever attaches.
      delPattern: jest.fn().mockResolvedValue(0),
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
    categoryRepo = module.get(getRepositoryToken(GroceryCategory));
    storeRepo = module.get(getRepositoryToken(GroceryStore));
    itemRepo = module.get(getRepositoryToken(GroceryItem));
    orderRepo = module.get(getRepositoryToken(GroceryOrder));
    flashRepo = module.get(getRepositoryToken(GroceryFlashDeal));
  });

  // ── healthCheck ─────────────────────────────────────────────────────────

  describe('healthCheck', () => {
    it('should return ok', async () => {
      const result = await service.healthCheck();
      expect(result.status).toBe('ok');
    });
  });

  // ── getCategories ────────────────────────────────────────────────────────

  describe('getCategories', () => {
    it('should return cached categories from Redis when available', async () => {
      const cached = { categories: [{ id: 'fruits', name: 'Fruits' }], total: 1, cachedAt: '...' };
      redis.getJson.mockResolvedValue(cached);

      const result = await service.getCategories();

      expect(result).toEqual(cached);
      expect(redis.setJson).not.toHaveBeenCalled();
    });

    it('should query DB and cache results when Redis is empty', async () => {
      redis.getJson.mockResolvedValue(null);
      const dbCats = [
        {
          id: 'fruits-vegetables',
          name: 'Fruits & Vegetables',
          isActive: true,
          children: [] as unknown[],
        },
      ];
      categoryRepo.find.mockResolvedValue(dbCats as any);

      const result = (await service.getCategories()) as any;

      expect(result.source).toBe('database');
      expect(result.categories).toEqual(dbCats);
      expect(redis.setJson).toHaveBeenCalledWith(
        'grocery:categories:all',
        expect.objectContaining({ source: 'database' }),
        300,
      );
    });

    it('should fallback to canonical categories when DB is empty', async () => {
      redis.getJson.mockResolvedValue(null);
      categoryRepo.find.mockResolvedValue([]);

      const result = (await service.getCategories()) as any;

      expect(result.source).toBe('canonical');
      expect(result.total).toBe(23);
    });
  });

  // ── getCategoryById ──────────────────────────────────────────────────────

  describe('getCategoryById', () => {
    it('should return a cached category from Redis', async () => {
      const cached = { id: 'fruits-vegetables', name: 'Fruits & Vegetables' };
      redis.getJson.mockResolvedValue(cached);

      const result = await service.getCategoryById('fruits-vegetables');
      expect(result).toEqual(cached);
    });

    it('should find category in DB and cache it', async () => {
      redis.getJson.mockResolvedValue(null);
      const dbCat = {
        id: 'dairy-bread-eggs',
        name: 'Dairy, Bread & Eggs',
        children: [] as unknown[],
      };
      categoryRepo.findOne.mockResolvedValue(dbCat as any);

      const result = (await service.getCategoryById('dairy-bread-eggs')) as any;

      expect(result?.id).toBe('dairy-bread-eggs');
      expect(redis.setJson).toHaveBeenCalledWith(
        'grocery:category:dairy-bread-eggs',
        expect.objectContaining({ id: 'dairy-bread-eggs' }),
        300,
      );
    });

    it('should fallback to canonical for unknown DB category', async () => {
      redis.getJson.mockResolvedValue(null);
      categoryRepo.findOne.mockResolvedValue(null);

      const result = (await service.getCategoryById('fruits-vegetables')) as any;
      expect(result?.id).toBe('fruits-vegetables'); // Found in canonical
    });

    it('should return null for completely unknown category', async () => {
      redis.getJson.mockResolvedValue(null);
      categoryRepo.findOne.mockResolvedValue(null);

      const result = await service.getCategoryById('non-existent-cat');
      expect(result).toBeNull();
    });
  });

  // ── invalidateCategoryCache ──────────────────────────────────────────────

  describe('invalidateCategoryCache', () => {
    it('should delete cache keys and publish Kafka event', async () => {
      categoryRepo.find.mockResolvedValue([]);
      const result = await service.invalidateCategoryCache();

      expect(result.success).toBe(true);
      // Deletes main cache + 23 canonical per-category keys = 24+ deletes
      expect(redis.del).toHaveBeenCalledWith('grocery:categories:all');
      expect(kafka.publish).toHaveBeenCalledWith(
        'grocery.category.updated',
        expect.objectContaining({ invalidatedAt: expect.any(String) }),
      );
    });
  });

  // ── createGroceryOrder ───────────────────────────────────────────────────

  describe('createGroceryOrder', () => {
    const dto = {
      customerId: 'cust-1',
      storeId: '11111111-1111-4111-8111-111111111111',
      items: [
        {
          productId: '22222222-2222-4222-8222-222222222222',
          name: 'Avocados',
          weight: '500g',
          price: 280,
          quantity: 2,
        },
      ],
      deliveryAddress: {
        line1: '123 Main St',
        city: 'Mumbai',
        pincode: '00100',
        lat: -1.29,
        lng: 36.82,
      },
      paymentMethod: GroceryPaymentMethod.ONLINE,
    };

    const openStore = {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'FreshMart',
      status: 'APPROVED',
      isOnline: true,
      minOrderAmount: 0,
      deliveryFee: 50,
      ownerId: 'seller-1',
    };

    /** A catalogue row the order can actually be priced against. */
    const catalogueProduct = (price = 280, stock = 10) => ({
      id: '22222222-2222-4222-8222-222222222222',
      name: 'Avocados',
      storeId: '11111111-1111-4111-8111-111111111111',
      isAvailable: true,
      category: 'fruits-vegetables',
      weightVariants: [{ weight: '500g', price, mrp: price + 20, stock }],
    });

    it('should create order, cache it, and publish Kafka events', async () => {
      storeRepo.findOne.mockResolvedValue(openStore as any);
      itemRepo.find.mockResolvedValue([catalogueProduct()] as any);
      orderRepo.count.mockResolvedValue(0);
      mockEntityManager.save.mockResolvedValueOnce({
        id: 'order-1',
        orderNumber: 'GRO-1001',
        ...dto,
        status: 'PLACED',
      } as any);

      const result = await service.createGroceryOrder(dto);

      expect(result.success).toBe(true);
      expect(storeRepo.findOne).toHaveBeenCalledWith({
        where: { id: '11111111-1111-4111-8111-111111111111' },
      });
      expect(redis.setJson).toHaveBeenCalledWith(
        expect.stringContaining('grocery:order:'),
        expect.objectContaining({ orderNumber: 'GRO-1001' }),
        86400,
      );
      expect(kafka.publish).toHaveBeenCalledWith(
        'grocery.order.created',
        expect.objectContaining({
          storeId: '11111111-1111-4111-8111-111111111111',
          customerId: 'cust-1',
        }),
      );
      // Notification to seller
      expect(kafka.publish).toHaveBeenCalledWith(
        'notification.push',
        expect.objectContaining({ userId: 'seller-1' }),
      );
    });

    /**
     * Regression: the client used to supply `price` and the total was computed
     * straight from it, so a caller could name their own price. The line is now
     * priced from the catalogue and the request's figure is ignored.
     */
    it('should price lines from the catalogue and ignore the price in the request', async () => {
      storeRepo.findOne.mockResolvedValue(openStore as any);
      itemRepo.find.mockResolvedValue([catalogueProduct(280)] as any);
      orderRepo.count.mockResolvedValue(0);

      await service.createGroceryOrder({
        ...dto,
        items: [{ ...dto.items[0], price: 1 }], // attacker-supplied price
      });

      const [, order] = mockEntityManager.create.mock.calls.at(-1)!;
      expect(order.items[0].price).toBe(280);
      expect(order.itemTotal).toBe(560); // 280 × 2, not 1 × 2
      expect(order.grandTotal).toBe(610); // + 50 delivery
    });

    it('should reject a product that belongs to another store', async () => {
      storeRepo.findOne.mockResolvedValue(openStore as any);
      itemRepo.find.mockResolvedValue([] as any); // scoped query finds nothing

      await expect(service.createGroceryOrder(dto)).rejects.toThrow('not sold by this store');
    });

    it('should reject an order for more stock than the variant holds', async () => {
      storeRepo.findOne.mockResolvedValue(openStore as any);
      itemRepo.find.mockResolvedValue([catalogueProduct(280, 1)] as any);

      await expect(service.createGroceryOrder(dto)).rejects.toThrow('Only 1 × 500g left');
    });

    it('should reject an unknown weight variant', async () => {
      storeRepo.findOne.mockResolvedValue(openStore as any);
      itemRepo.find.mockResolvedValue([catalogueProduct()] as any);

      await expect(
        service.createGroceryOrder({ ...dto, items: [{ ...dto.items[0], weight: '5kg' }] }),
      ).rejects.toThrow('not sold in "5kg"');
    });

    it('should reject order for offline store', async () => {
      storeRepo.findOne.mockResolvedValue({ ...openStore, isOnline: false } as any);

      await expect(service.createGroceryOrder(dto)).rejects.toThrow('currently offline');
    });

    it('should reject order for a store that is not approved', async () => {
      storeRepo.findOne.mockResolvedValue({ ...openStore, status: 'PENDING_KYC' } as any);

      await expect(service.createGroceryOrder(dto)).rejects.toThrow('not accepting orders');
    });

    it('should reject order below minimum order amount', async () => {
      storeRepo.findOne.mockResolvedValue({ ...openStore, minOrderAmount: 1000 } as any);
      itemRepo.find.mockResolvedValue([catalogueProduct()] as any);

      await expect(service.createGroceryOrder(dto)).rejects.toThrow('Minimum order');
    });
  });

  // ── updateOrderStatus ────────────────────────────────────────────────────

  describe('updateOrderStatus', () => {
    it('should allow valid status transitions', async () => {
      const order = {
        id: 'ord-1',
        orderNumber: 'GRO-1001',
        status: GroceryOrderStatus.PLACED,
        storeId: 'GRC-001',
        customerId: 'cust-1',
        store: { name: 'FreshMart' },
      };
      orderRepo.findOne.mockResolvedValue(order as any);
      orderRepo.save.mockResolvedValue({ ...order, status: GroceryOrderStatus.CONFIRMED } as any);

      const result = await service.updateOrderStatus('ord-1', {
        status: GroceryOrderStatus.CONFIRMED,
      });

      expect(result.success).toBe(true);
      expect(kafka.publish).toHaveBeenCalledWith(
        'grocery.order.status_updated',
        expect.objectContaining({
          previousStatus: GroceryOrderStatus.PLACED,
          newStatus: GroceryOrderStatus.CONFIRMED,
        }),
      );
    });

    it('should reject invalid status transitions', async () => {
      const order = { id: 'ord-1', status: GroceryOrderStatus.DELIVERED, storeId: 'GRC-001' };
      orderRepo.findOne.mockResolvedValue(order as any);

      await expect(
        service.updateOrderStatus('ord-1', { status: GroceryOrderStatus.PACKING }),
      ).rejects.toThrow('Cannot transition');
    });

    it('should publish delivery.requested when order is READY_FOR_PICKUP', async () => {
      const order = {
        id: 'ord-1',
        orderNumber: 'GRO-1001',
        status: GroceryOrderStatus.PACKING,
        storeId: 'GRC-001',
        customerId: 'cust-1',
        paymentMethod: 'COD',
        grandTotal: 500,
        store: { name: 'FreshMart', latitude: -1.29, longitude: 36.82, address: 'Andheri West' },
        deliveryAddress: { lat: -1.3, lng: 36.83, line1: '123 Main', city: 'Mumbai' },
      };
      orderRepo.findOne.mockResolvedValue(order as any);
      orderRepo.save.mockResolvedValue({
        ...order,
        status: GroceryOrderStatus.READY_FOR_PICKUP,
      } as any);

      await service.updateOrderStatus('ord-1', { status: GroceryOrderStatus.READY_FOR_PICKUP });

      expect(kafka.publish).toHaveBeenCalledWith(
        'grocery.delivery.requested',
        expect.objectContaining({ serviceType: 'grocery', orderId: 'ord-1' }),
      );
    });
  });

  // ── getProducts ──────────────────────────────────────────────────────────

  describe('getProducts', () => {
    it('should return cached products when available', async () => {
      const cached = { storeId: 'GRC-001', data: [{ id: 'p1' }], total: 1 };
      redis.getJson.mockResolvedValue(cached);

      const result = await service.getProducts('GRC-001', 'fruits-vegetables');
      expect(result).toEqual(cached);
      expect(redis.setJson).not.toHaveBeenCalled();
    });

    it('should query DB and cache when cache is empty', async () => {
      redis.getJson.mockResolvedValue(null);

      const result = (await service.getProducts('GRC-001')) as any;
      expect(result.data).toBeDefined();
      expect(redis.setJson).toHaveBeenCalled();
    });
  });

  // ── searchProducts ───────────────────────────────────────────────────────

  describe('searchProducts', () => {
    it('should return search results via ILIKE query', async () => {
      const result = await service.searchProducts('avocado');
      expect(result.query).toBe('avocado');
      expect(result.results).toBeDefined();
    });
  });
  describe('pagination bounds', () => {
    /**
     * `?page=-5` reached the query builder as `.skip(-180)`, and Postgres
     * answered "OFFSET must not be negative" — returned to the caller as a 500
     * carrying the raw database message. `?limit=100000` was honoured in full.
     * Both reproduced against a running instance.
     */
    it('never issues a negative offset', async () => {
      const qb = itemRepo.createQueryBuilder();
      redis.getJson.mockResolvedValueOnce(null as never);
      await service.getProducts(undefined, undefined, -5, 30);
      const skipArg = (qb.skip as jest.Mock).mock.calls.at(-1)?.[0];
      expect(skipArg).toBeGreaterThanOrEqual(0);
    });

    it('caps an oversized page size', async () => {
      const qb = itemRepo.createQueryBuilder();
      redis.getJson.mockResolvedValueOnce(null as never);
      await service.getProducts(undefined, undefined, 1, 100000);
      const takeArg = (qb.take as jest.Mock).mock.calls.at(-1)?.[0];
      expect(takeArg).toBeLessThanOrEqual(100);
    });

    it('reports the clamped values back, not the requested ones', async () => {
      redis.getJson.mockResolvedValueOnce(null as never);
      const res: any = await service.getProducts(undefined, undefined, -5, 100000);
      // A caller that echoes these into a pager must not be told it asked for
      // page -5 of 100000.
      expect(res.page).toBe(1);
      expect(res.limit).toBe(100);
    });
  });

  describe('getActiveFlashDeals — scoped to the caller’s market', () => {
    /**
     * The homepage used to read the moderation queue (`listFlashDeals`), which
     * has no region filter, so a shopper in Doha was served the newest deals from
     * every market — and an empty rail whenever none of them happened to be local.
     */
    it('filters by the store region and only ever lists live deals', async () => {
      const qb = flashRepo.createQueryBuilder() as unknown as Record<string, jest.Mock>;

      await service.getActiveFlashDeals('QA', 10);

      const wheres = [
        ...qb.where.mock.calls.map((c: unknown[]) => String(c[0])),
        ...qb.andWhere.mock.calls.map((c: unknown[]) => String(c[0])),
      ].join(' | ');
      expect(wheres).toContain('s.region_code = :__market');
      expect(qb.andWhere).toHaveBeenCalledWith('s.region_code = :__market', { __market: 'QA' });
      expect(wheres).toContain('d.status = :status');
      expect(qb.take).toHaveBeenCalledWith(10);
    });

    it('omits the region predicate when the caller has no market', async () => {
      const qb = flashRepo.createQueryBuilder() as unknown as Record<string, jest.Mock>;

      await service.getActiveFlashDeals(undefined, 10);

      const wheres = qb.andWhere.mock.calls.map((c: unknown[]) => String(c[0])).join(' | ');
      expect(wheres).not.toContain('region_code');
    });

    it('clamps limit to the page cap', async () => {
      const qb = flashRepo.createQueryBuilder() as unknown as Record<string, jest.Mock>;

      await service.getActiveFlashDeals('QA', 5000);

      expect(qb.take).toHaveBeenCalledWith(100);
    });
  });

  describe('getProductById — store scoping survives the cache', () => {
    /**
     * The cache key is `grocery:product:<id>` with no store in it, because the
     * four invalidation sites have only the product id. The read is scoped to a
     * store, so a warm entry used to satisfy a request from *any* store: the
     * same call answered 404 cold and 200 warm. Reproduced against a running
     * instance before the guard was added.
     */
    const PRODUCT = { id: 'prod-1', storeId: 'store-A', name: 'Salmon' };

    it('serves a cached product to the store that owns it', async () => {
      redis.getJson.mockResolvedValueOnce(PRODUCT as never);
      await expect(service.getProductById('store-A', 'prod-1')).resolves.toEqual(PRODUCT);
    });

    it('refuses a cached product to a store that does not own it', async () => {
      redis.getJson.mockResolvedValueOnce(PRODUCT as never);
      await expect(service.getProductById('store-B', 'prod-1')).rejects.toThrow(NotFoundException);
    });

    it('does not fall back to an unscoped database read on a cache miss', async () => {
      redis.getJson.mockResolvedValueOnce(null as never);
      itemRepo.findOne.mockResolvedValueOnce(null as never);
      await expect(service.getProductById('store-B', 'prod-1')).rejects.toThrow(NotFoundException);
      // The store must be part of the query, not filtered afterwards.
      expect(itemRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'prod-1', storeId: 'store-B' },
      });
    });
  });
});
