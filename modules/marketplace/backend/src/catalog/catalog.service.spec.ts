import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CatalogService } from './catalog.service';
import { MarketplaceFulfillmentService } from '../fulfillment/fulfillment.service';
import { RedisService } from '@app/redis';
import { Product } from '../entities/product.entity';
import { Seller } from '../entities/seller.entity';
import { Category } from '../entities/category.entity';
import { Brand } from '../entities/brand.entity';
import { ProductListing } from '../entities/product-listing.entity';
import { ProductImage } from '../entities/product-image.entity';
import { Review } from '../entities/review.entity';
import { ProductVariant } from '../entities/product-variant.entity';
import { ProductAttribute } from '../entities/product-attribute.entity';
import { FlashDealNomination } from '../entities/flash-deal.entity';
import { ForbiddenException } from '@nestjs/common';

/**
 * Catalogue read tests. These moved here with the methods when CatalogService was
 * split out of MarketplaceService — same assertions, now against the smaller unit.
 */
describe('CatalogService', () => {
  let service: CatalogService;
  let redis: jest.Mocked<RedisService>;
  let productRepo: any;
  let categoryRepo: any;
  let brandRepo: any;
  let sellerRepo: any;
  let reviewRepo: any;
  let variantRepo: any;
  let nominationRepo: any;

  /**
   * Schema-qualified table names, as TypeORM's metadata reports them.
   *
   * The service builds its region predicates from `tablePath` rather than
   * hard-coding table names, because a bare name in raw SQL resolves against the
   * session `search_path` (`public`) instead of the marketplace schema — which
   * silently emptied every region-scoped listing. The mock has to model that
   * metadata for the predicate assertions below to mean anything.
   */
  const TABLE_PATHS: Record<string, string> = {
    Product: 'marketplace.products',
    Seller: 'marketplace.sellers',
    Category: 'marketplace.categories',
    Brand: 'marketplace.brands',
    ProductListing: 'marketplace.product_listings',
    ProductImage: 'marketplace.product_images',
    Review: 'marketplace.reviews',
  };

  const mockConnection = {
    getMetadata: jest.fn((entity: any) => ({
      tablePath: TABLE_PATHS[entity?.name] ?? String(entity?.name ?? 'unknown').toLowerCase(),
    })),
  };

  /**
   * Conditional-update chain, shared by the transaction manager and the repos.
   *
   * `execute` is the interesting end of it: `reserveListingStock` reads
   * `affected` to decide whether it won the race for the stock, so a test sets
   * `updateExecute` to `{ affected: 0 }` to model losing it.
   */
  let updateExecute: jest.Mock;

  const updateChain = () => ({
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    setParameter: jest.fn().mockReturnThis(),
    execute: updateExecute,
  });

  const transactionManager = {
    createQueryBuilder: jest.fn(() => updateChain()),
  };

  const mockRepoFactory = () => ({
    manager: {
      connection: mockConnection,
      // `reserveListingStock` takes every line in one transaction. The mock runs
      // the callback against a manager that behaves like the repository itself,
      // so a test can drive the conditional update through `createQueryBuilder`.
      transaction: jest.fn((cb: any) => cb(transactionManager)),
    },
    // `categoryProductCounts` counts products per category in one grouped
    // statement. Repository.query is a real method the mock was missing, so
    // `getCategories` threw "this.productRepo.query is not a function".
    query: jest.fn().mockResolvedValue([]),
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
      // `releaseListingStock` drives the update form of the builder.
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      execute: jest.fn().mockImplementation(() => updateExecute()),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      setParameter: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      clone: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
      getMany: jest.fn().mockResolvedValue([]),
      getCount: jest.fn().mockResolvedValue(0),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      getRawOne: jest.fn().mockResolvedValue({}),
      getRawMany: jest.fn().mockResolvedValue([]),
    }),
  });

  beforeEach(async () => {
    // Wins the race by default; the oversell tests override it.
    updateExecute = jest.fn().mockResolvedValue({ affected: 1 });

    const redisMock: Partial<jest.Mocked<RedisService>> = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      getJson: jest.fn().mockResolvedValue(null),
      setJson: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogService,
        { provide: RedisService, useValue: redisMock },
        // `recomputeBuyBox` now checks price-drop alerts — that is the single
        // point where the payable price can change, so the sweep lives there
        // rather than at each of its seven call sites. The spec only needs it
        // to exist; a resolved promise keeps the fire-and-forget call quiet.
        {
          provide: MarketplaceFulfillmentService,
          useValue: {
            sweepPriceAlerts: jest.fn().mockResolvedValue({ checked: 0, notified: 0, alerts: [] }),
          },
        },
        { provide: getRepositoryToken(Product), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(Seller), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(Category), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(Brand), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(ProductListing), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(ProductImage), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(Review), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(ProductVariant), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(ProductAttribute), useFactory: mockRepoFactory },
        { provide: getRepositoryToken(FlashDealNomination), useFactory: mockRepoFactory },
      ],
    }).compile();

    service = module.get<CatalogService>(CatalogService);
    redis = module.get(RedisService);
    productRepo = module.get(getRepositoryToken(Product));
    categoryRepo = module.get(getRepositoryToken(Category));
    brandRepo = module.get(getRepositoryToken(Brand));
    sellerRepo = module.get(getRepositoryToken(Seller));
    reviewRepo = module.get(getRepositoryToken(Review));
    variantRepo = module.get(getRepositoryToken(ProductVariant));
    nominationRepo = module.get(getRepositoryToken(FlashDealNomination));
  });

  describe('getCategories', () => {
    it('should return cached categories', async () => {
      const cached = { data: [{ id: 'c1', name: 'Electronics' }], total: 1, tree: [] as unknown[] };
      redis.getJson.mockResolvedValue(cached);
      const result = await service.getCategories();
      expect(result).toEqual(cached);
    });

    it('should query DB and cache when not cached', async () => {
      redis.getJson.mockResolvedValue(null);
      categoryRepo.find.mockResolvedValue([{ id: 'c1', name: 'Electronics' }]);
      categoryRepo.findTrees.mockResolvedValue([]);
      const result: any = await service.getCategories();
      expect(result.data).toHaveLength(1);
      expect(redis.setJson).toHaveBeenCalled();
    });
  });

  describe('getCategoryById', () => {
    it('should throw NotFoundException for missing category', async () => {
      categoryRepo.findOne.mockResolvedValue(null);
      await expect(service.getCategoryById('missing')).rejects.toThrow();
    });

    it('should return category with subcategories and product count', async () => {
      categoryRepo.findOne.mockResolvedValue({ id: 'c1', name: 'Electronics' });
      categoryRepo.findDescendants.mockResolvedValue([
        { id: 'c1', name: 'Electronics' },
        { id: 'c2', name: 'Phones' },
      ]);
      productRepo.count.mockResolvedValue(42);
      const result = await service.getCategoryById('c1');
      expect(result.subcategories).toHaveLength(1);
      expect(result.productCount).toBe(42);
    });

    it('looks up by slug when given a non-UUID', async () => {
      const uuid = '3f1b9c42-5d6e-4a8b-9c0d-1e2f3a4b5c6d';
      categoryRepo.findOne.mockResolvedValue({
        id: uuid,
        name: 'Electronics',
        slug: 'electronics',
      });
      categoryRepo.findDescendants.mockResolvedValue([{ id: uuid, name: 'Electronics' }]);
      productRepo.count.mockResolvedValue(7);

      // The gateway's category-list/:slug alias forwards slugs to this method.
      const result = await service.getCategoryById('electronics');

      expect(categoryRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { slug: 'electronics' } }),
      );
      // `parent` must be loaded, not just the row: /marketplace/category/:slug
      // addresses both tree levels, and a subcategory reached that way has to be
      // filtered by `subcategory_id`. Without the relation every slug looks
      // top-level and a subcategory listing matches no product at all.
      expect(categoryRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ relations: { parent: true } }),
      );
      expect(result.productCount).toBe(7);
      // A root category counts on `category_id`, and off the resolved row's id
      // rather than the slug it was addressed by.
      expect(productRepo.count).toHaveBeenCalledWith({ where: { category: { id: uuid } } });
      expect(result.isSubcategory).toBe(false);
    });

    // The storefront addresses subcategories by slug (`/marketplace/subcategory/
    // laptops`) — it has no UUID to hand. A UUID-only lookup 404'd on every real
    // request, so the page lost its name, its parent breadcrumb and its count.
    it('resolves a subcategory by slug and counts against subcategory_id', async () => {
      const subId = '7a1b9c42-5d6e-4a8b-9c0d-1e2f3a4b5c6d';
      categoryRepo.findOne.mockResolvedValue({
        id: subId,
        name: 'Laptops',
        slug: 'laptops',
        parent: { id: 'parent-id', name: 'Electronics', slug: 'electronics' },
      });
      productRepo.count.mockResolvedValue(3);

      const result = await service.getSubcategoryById('laptops');

      expect(categoryRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { slug: 'laptops' } }),
      );
      // Products of a subcategory hang off `subcategory_id`; counting
      // `category_id` reported 0 for every subcategory.
      expect(productRepo.count).toHaveBeenCalledWith({ where: { subcategory: { id: subId } } });
      expect(result.productCount).toBe(3);
      // The breadcrumb links by slug, so the parent id it exposes must be one.
      expect(result.parentCategoryId).toBe('electronics');
    });

    it('lists root categories with IsNull, not an undefined relation match', async () => {
      await service.getSubcategories();

      // `{ parent: { id: undefined } }` is not "parent is null" — TypeORM drops a
      // relation condition whose fields are all undefined, which returned the
      // entire flat category list instead of the roots.
      const where = categoryRepo.find.mock.calls.at(-1)![0].where;
      expect(where.parent).toBeDefined();
      expect(where.parent).not.toEqual({ id: undefined });
    });

    it('looks up by id when given a UUID', async () => {
      const uuid = '3f1b9c42-5d6e-4a8b-9c0d-1e2f3a4b5c6d';
      categoryRepo.findOne.mockResolvedValue({
        id: uuid,
        name: 'Electronics',
        slug: 'electronics',
      });
      categoryRepo.findDescendants.mockResolvedValue([{ id: uuid, name: 'Electronics' }]);

      await service.getCategoryById(uuid);

      expect(categoryRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: uuid } }),
      );
    });

    // A subcategory reached through /marketplace/category/:slug must be reported
    // as one, and counted on the column its products actually populate.
    it('flags a subcategory and counts it on subcategory_id', async () => {
      const subId = '9a1b9c42-5d6e-4a8b-9c0d-1e2f3a4b5c6d';
      categoryRepo.findOne.mockResolvedValue({
        id: subId,
        name: 'Laptops',
        slug: 'laptops',
        parent: { id: 'p1', name: 'Electronics', slug: 'electronics' },
      });
      categoryRepo.findDescendants.mockResolvedValue([{ id: subId, name: 'Laptops' }]);
      productRepo.count.mockResolvedValue(3);

      const result = await service.getCategoryById('laptops');

      expect(result.isSubcategory).toBe(true);
      expect(result.parent).toEqual({ id: 'p1', name: 'Electronics', slug: 'electronics' });
      expect(productRepo.count).toHaveBeenCalledWith({ where: { subcategory: { id: subId } } });
    });
  });

  // The storefront's colour/size picker renders `metadata.variantDimensions`.
  // Nothing ever populated that field, so the selector was dead UI even for a
  // product with variant rows — the two halves were never wired together.
  describe('variant dimensions', () => {
    const uuid = '5c1b9c42-5d6e-4a8b-9c0d-1e2f3a4b5c6d';

    beforeEach(() => {
      redis.getJson.mockResolvedValue(null);
      productRepo.findOne.mockResolvedValue({ id: uuid, name: 'Tee', slug: 'tee', metadata: null });
    });

    it('groups variant rows into one axis per attribute, in first-seen order', async () => {
      variantRepo.find.mockResolvedValue([
        { sku: 'A', attributes: { Size: 'S', Colour: 'Black' } },
        { sku: 'B', attributes: { Size: 'M', Colour: 'Black' } },
        { sku: 'C', attributes: { Size: 'L', Colour: 'Navy' } },
      ]);

      const result: any = await service.getProductById('tee');

      expect(result.metadata.variantDimensions).toEqual([
        // First-seen order, not alphabetical — otherwise a size run reads L/M/S.
        { variantName: 'Size', variantOptions: ['S', 'M', 'L'] },
        { variantName: 'Colour', variantOptions: ['Black', 'Navy'] },
      ]);
      expect(result.variants).toHaveLength(3);
    });

    it('keeps a hand-authored metadata copy when the product has no variant rows', async () => {
      const authored = [{ variantName: 'Length', variantOptions: ['30', '32'] }];
      productRepo.findOne.mockResolvedValue({
        id: uuid,
        name: 'Jeans',
        slug: 'jeans',
        metadata: { variantDimensions: authored },
      });
      variantRepo.find.mockResolvedValue([]);

      const result: any = await service.getProductById('jeans');

      expect(result.metadata.variantDimensions).toEqual(authored);
    });

    it('leaves dimensions undefined when there is nothing to pick', async () => {
      variantRepo.find.mockResolvedValue([]);

      const result: any = await service.getProductById('tee');

      expect(result.metadata.variantDimensions).toBeUndefined();
    });
  });

  describe('getProducts', () => {
    it('filters by subcategory through a joined alias', async () => {
      redis.getJson.mockResolvedValue(null);
      const qb = productRepo.createQueryBuilder();

      await service.getProducts(1, 20, { subcategory: 'smartphones' });

      expect(qb.leftJoin).toHaveBeenCalledWith('p.subcategory', 'subcategory');
      const clauses = qb.andWhere.mock.calls.map((c: any[]) => c[0]);
      expect(clauses).toContain('subcategory.slug = :subSlug');
      // Regression guard: `subcategory` is a relation, so referencing it as a
      // property path never resolves and the whole query fails.
      expect(clauses).not.toContain('p.subcategory.slug = :subSlug');
    });

    it('does not join subcategory when the filter is absent', async () => {
      redis.getJson.mockResolvedValue(null);
      const qb = productRepo.createQueryBuilder();

      await service.getProducts(1, 20, { category: 'electronics' });

      // Keeps the common listing query working on schemas without subcategory_id
      expect(qb.leftJoin).not.toHaveBeenCalledWith('p.subcategory', 'subcategory');
      expect(qb.andWhere.mock.calls.map((c: any[]) => c[0])).toContain('category.slug = :catSlug');
    });
  });

  describe('getProductById', () => {
    const uuid = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

    it('looks a product up by id when given a UUID', async () => {
      redis.getJson.mockResolvedValue(null);
      productRepo.findOne.mockResolvedValue({ id: uuid, name: 'Phone', slug: 'phone' });

      await service.getProductById(uuid);

      expect(productRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: uuid } }),
      );
    });

    it('looks a product up by slug when given a non-UUID', async () => {
      // The storefront's SEO metadata and share links address products by slug;
      // these used to be rejected outright and rendered "Product Not Found".
      redis.getJson.mockResolvedValue(null);
      productRepo.findOne.mockResolvedValue({ id: uuid, name: 'Phone', slug: 'iphone-15-pro' });

      const result: any = await service.getProductById('iphone-15-pro');

      expect(productRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { slug: 'iphone-15-pro' } }),
      );
      expect(result.id).toBe(uuid);
    });

    it('keys related rows on the resolved id, not the route parameter', async () => {
      redis.getJson.mockResolvedValue(null);
      productRepo.findOne.mockResolvedValue({ id: uuid, name: 'Phone', slug: 'iphone-15-pro' });

      await service.getProductById('iphone-15-pro');

      // Reviews are filtered by productId — passing the slug here returned a
      // product with no reviews, listings or images (so a ₹0 price, no buy box).
      expect(reviewRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { productId: uuid, status: 'PUBLISHED' } }),
      );
    });

    it('rejects an id that is neither a UUID nor a plausible slug', async () => {
      redis.getJson.mockResolvedValue(null);

      // Guards Postgres against "invalid input syntax for type uuid".
      await expect(service.getProductById('../../etc/passwd')).rejects.toThrow();
      expect(productRepo.findOne).not.toHaveBeenCalled();
    });

    it('throws NotFound when the product does not exist', async () => {
      redis.getJson.mockResolvedValue(null);
      productRepo.findOne.mockResolvedValue(null);

      await expect(service.getProductById(uuid)).rejects.toThrow();
    });
  });

  // ── Region scoping ────────────────────────────────────────────────────────
  //
  // The storefront is localised: a customer in Doha must be shown products a
  // Qatari seller can actually fulfil, with those sellers ranked ahead of
  // cross-border ones. Losing either half is silent — the page still renders,
  // just with the wrong catalogue.

  describe('region scoping', () => {
    /** The query builder the service composed on this call. */
    function lastQb() {
      return productRepo.createQueryBuilder.mock.results.at(-1)!.value;
    }

    beforeEach(() => {
      redis.getJson.mockResolvedValue(null);
    });

    // Regression: the listings join condition names `:regionCode`. Product
    // queries bind it through `scopeToRegion`; the flash-deal query never went
    // through that, so the parameter reached Postgres unbound — "syntax error
    // at or near ':'" — and the gateway answered "Marketplace service
    // unavailable" for every market's flash deals (only the unscoped call worked).
    it('binds the seller-region parameter on the flash-deal listings join', async () => {
      await service.getFlashDeals('IN');

      const qb = nominationRepo.createQueryBuilder.mock.results.at(-1)!.value;
      const join = qb.leftJoinAndSelect.mock.calls.find(
        ([prop]: [string]) => prop === 'p.listings',
      );
      expect(join).toBeDefined();
      expect(join![2]).toContain(':regionCode');
      expect(join![3]).toEqual({ regionCode: 'IN' });
      // The deal itself is scoped to the market too.
      const dealScope = qb.andWhere.mock.calls.find(
        ([, params]: [string, any]) => params?.region === 'IN',
      );
      expect(dealScope).toBeDefined();
      expect(dealScope![0]).toContain('deal.region_code');
    });

    it('restricts the catalogue to sellers in the requested region', async () => {
      await service.getProducts(1, 20, { country: 'QA' });

      const regionCall = lastQb().andWhere.mock.calls.find(
        ([, params]: [string, any]) => params?.regionCode === 'QA',
      );
      expect(regionCall).toBeDefined();
      // Products offered by a seller in the region, or whose own seller is there.
      expect(regionCall![0]).toContain('product_listings');
      expect(regionCall![0]).toContain('sellers');
    });

    // Regression: every raw table name in the region predicates was bare
    // (`FROM product_listings`). TypeORM qualifies the tables *it* generates with
    // the connection's `marketplace` schema, but a hand-written subquery is
    // passed through verbatim and resolves against the session `search_path`,
    // which is still `public`. Both EXISTS clauses therefore probed empty
    // `public` tables, matched nothing, and filtered out the whole catalogue —
    // and since the gateway always resolves a region, that was every storefront
    // listing request. `toContain('product_listings')` alone cannot catch this:
    // it passes just as happily on the broken bare name.
    it('names every table in the region predicate with its schema', async () => {
      await service.getProducts(1, 20, { country: 'QA' });

      const qb = lastQb();
      const predicate: string = qb.andWhere.mock.calls.find(
        ([, params]: [string, any]) => params?.regionCode === 'QA',
      )![0];
      const ranking: string = qb.addSelect.mock.calls.find(
        ([, alias]: [string, string]) => alias === 'is_local',
      )![0];

      for (const sql of [predicate, ranking]) {
        expect(sql).toContain('marketplace.product_listings');
        expect(sql).toContain('marketplace.sellers');
        // No bare occurrence left behind by a partial edit.
        expect(sql).not.toMatch(/(FROM|JOIN)\s+(product_listings|sellers)\b/);
      }
    });

    it('normalises the region code to upper case', async () => {
      await service.getProducts(1, 20, { country: 'qa' });

      expect(
        lastQb().andWhere.mock.calls.some(
          ([, params]: [string, any]) => params?.regionCode === 'QA',
        ),
      ).toBe(true);
    });

    it('ranks local sellers above cross-border ones', async () => {
      await service.getProducts(1, 20, { country: 'QA' });

      const qb = lastQb();
      // `is_local` must be the *first* sort key — a later one would let a
      // higher-rated foreign listing outrank every local seller.
      expect(qb.addSelect).toHaveBeenCalledWith(
        expect.stringContaining('product_listings'),
        'is_local',
      );
      expect(qb.orderBy).toHaveBeenCalledWith('is_local', 'DESC');
    });

    it('keeps the requested sort as a secondary key when a region is set', async () => {
      await service.getProducts(1, 20, { country: 'QA', sort: 'price_asc' });

      const qb = lastQb();
      expect(qb.orderBy).toHaveBeenCalledWith('is_local', 'DESC');
      // addOrderBy, not orderBy — orderBy would discard the local-first ranking.
      //
      // `payable_price`, not `p.mrp`: the sort has to run on the buy-box
      // listing's sellingPrice, which is what checkout charges. Ordering by mrp
      // produced a "price: low to high" list that did not match the prices on
      // the cards, because discount depth varies per listing.
      expect(qb.addOrderBy).toHaveBeenCalledWith('payable_price', 'ASC');
      expect(qb.addSelect).toHaveBeenCalledWith(
        expect.stringContaining('"sellingPrice"'),
        'payable_price',
      );
    });

    it('leaves the catalogue unscoped when no region is given', async () => {
      await service.getProducts(1, 20, { sort: 'price_asc' });

      const qb = lastQb();
      expect(
        qb.andWhere.mock.calls.some(
          ([, params]: [string, any]) => params?.regionCode !== undefined,
        ),
      ).toBe(false);
      // Admin catalogue views want the requested sort as the primary key.
      expect(qb.orderBy).toHaveBeenCalledWith('payable_price', 'ASC');
    });

    it('scopes search results to the region', async () => {
      await service.searchProducts('phone', 1, 20, 'QA');

      expect(
        lastQb().andWhere.mock.calls.some(
          ([, params]: [string, any]) => params?.regionCode === 'QA',
        ),
      ).toBe(true);
    });

    it('caches each region separately', async () => {
      // A shared key would serve one market's feed to every other market.
      await service.getFeaturedProducts('QA');
      await service.getFeaturedProducts('IN');

      // The market is the key's own segment (`marketplace:v2:<market>:featured`),
      // so a wildcard over one market can never reach another's entries.
      const keys = redis.setJson.mock.calls.map((call) => call[0]);
      expect(keys).toContain('marketplace:v2:QA:featured');
      expect(keys).toContain('marketplace:v2:IN:featured');
    });

    it('includes sellers whose region is not yet backfilled', async () => {
      // `sellers.region_code` is nullable pending backfill. Matching strictly
      // would empty the storefront rather than filter it.
      await service.getProducts(1, 20, { country: 'QA' });

      const regionCall = lastQb().andWhere.mock.calls.find(
        ([, params]: [string, any]) => params?.regionCode === 'QA',
      );
      expect(regionCall![0]).toContain('region_code IS NULL');
    });
  });

  describe('getSellersForAdmin', () => {
    /** The seller query builder composed on this call. */
    function lastSellerQb() {
      return sellerRepo.createQueryBuilder.mock.results.at(-1)!.value;
    }

    it('filters by market and status', async () => {
      await service.getSellersForAdmin({ region: 'qa', status: 'pending' });

      const qb = lastSellerQb();
      expect(qb.andWhere).toHaveBeenCalledWith('s.region_code = :__market', { __market: 'QA' });
      expect(qb.andWhere).toHaveBeenCalledWith('s.verificationStatus = :status', {
        status: 'PENDING',
      });
    });

    it('excludes unassigned sellers when a market is named', async () => {
      // Unlike the storefront reads, an approval decision applies one market's
      // requirements — a seller with no market has not been shown to meet them.
      await service.getSellersForAdmin({ region: 'QA' });

      const regionCall = lastSellerQb().andWhere.mock.calls.find(([sql]: [string]) =>
        sql.includes('region_code'),
      );
      expect(regionCall![0]).not.toContain('IS NULL');
    });

    /**
     * The approvals queue is the worst place for this to fail open.
     *
     * `marketplace.controller.ts` collapses the two slots — `region:
     * data?.scope ?? this.payloadRegion(data)` — so a region-locked admin's
     * market lands in the FILTER slot, where an unreadable value is ignored.
     * Ignored means no predicate, so a QA-confined admin would have been handed
     * every market's pending sellers to approve (N1).
     */
    it('refuses an unreadable market rather than queueing every market', async () => {
      for (const bad of ['NOT-A-COUNTRY', 'ZZ', 'QAT']) {
        await expect(service.getSellersForAdmin({ region: bad })).rejects.toThrow(
          ForbiddenException,
        );
      }
    });

    it('queues every market only when no market is named at all', async () => {
      await service.getSellersForAdmin({});
      const regionCall = lastSellerQb().andWhere.mock.calls.find(([sql]: [string]) =>
        sql.includes('region_code'),
      );
      expect(regionCall).toBeUndefined();
    });

    it('returns the oldest applications first', async () => {
      await service.getSellersForAdmin({ status: 'PENDING' });

      expect(lastSellerQb().orderBy).toHaveBeenCalledWith('s.createdAt', 'ASC');
    });
  });

  /**
   * Stock reservation.
   *
   * These exist because the previous decrement was unreachable and nothing
   * noticed: it was keyed on a `listingId` the gateway never sent, so every
   * order left stock untouched and a seller with one unit sold it without limit.
   * The tests assert the two properties that make the replacement safe — the
   * decrement is conditional, and a basket reserves whole or not at all.
   */
  describe('reserveListingStock', () => {
    const BASKET = [
      { listingId: 'listing-b', productId: 'prod-2', quantity: 2 },
      { listingId: 'listing-a', productId: 'prod-1', quantity: 1 },
    ];

    it('takes every line and reports what it holds', async () => {
      const result = await service.reserveListingStock(BASKET);

      expect(result.ok).toBe(true);
      expect(result.reserved).toEqual([
        { listingId: 'listing-a', quantity: 1 },
        { listingId: 'listing-b', quantity: 2 },
      ]);
      expect(updateExecute).toHaveBeenCalledTimes(2);
    });

    it('locks listings in a stable order so two baskets cannot deadlock', async () => {
      // Passed b-then-a above; taken a-then-b. Two customers holding the same
      // pair in opposite orders would otherwise each hold one row and wait on
      // the other.
      const result = await service.reserveListingStock(BASKET);

      expect(result.reserved.map((r) => r.listingId)).toEqual(['listing-a', 'listing-b']);
    });

    it('refuses the basket when a line has already sold out', async () => {
      // `affected: 0` is the WHERE "stockQuantity" >= :quantity predicate
      // failing — someone else took the last unit between pricing and here.
      updateExecute.mockResolvedValueOnce({ affected: 1 }).mockResolvedValueOnce({ affected: 0 });

      const result = await service.reserveListingStock(BASKET);

      expect(result.ok).toBe(false);
      expect(result.reason).toContain('Not enough stock');
      // Nothing is reported as held: the throw rolls the transaction back, so
      // the line that did succeed is not left holding units for an order that
      // will never be placed.
      expect(result.reserved).toEqual([]);
    });

    it('is a no-op for lines that carry no listing', async () => {
      const result = await service.reserveListingStock([
        { productId: 'prod-1', quantity: 1 } as any,
      ]);

      expect(result.ok).toBe(true);
      expect(updateExecute).not.toHaveBeenCalled();
    });
  });

  describe('releaseListingStock', () => {
    it('puts every held line back', async () => {
      const result = await service.releaseListingStock([
        { listingId: 'listing-a', quantity: 1 },
        { listingId: 'listing-b', quantity: 2 },
      ]);

      expect(result.released).toBe(2);
    });

    it('never throws — it runs on a path that is already failing', async () => {
      updateExecute.mockRejectedValue(new Error('connection reset'));

      await expect(
        service.releaseListingStock([{ listingId: 'listing-a', quantity: 1 }]),
      ).resolves.toEqual({ released: 0 });
    });
  });

  describe('priceOrderItems with variants', () => {
    const PID = '2b3c706d-185e-4b7e-86e2-00b29682c552';
    const VID = '810a6dba-5f4b-4903-8001-47da6e9f1aa8';
    const product = {
      id: PID,
      name: 'iPhone 15 Pro',
      mrp: '5850.00',
      is_active: true,
      approval_status: 'APPROVED',
    };
    const listing = {
      id: 'L1',
      sellingPrice: '5050.00',
      stockQuantity: 335,
      isBuyBoxWinner: true,
      product: { id: PID },
      seller: { id: 'S1', verificationStatus: 'VERIFIED', isActive: true },
    };
    const variant = {
      id: VID,
      productId: PID,
      variantName: '128GB / Midnight Black',
      sellingPrice: '115900.00',
      mrp: '134900.00',
      stockQuantity: 24,
      isActive: true,
    };
    let listingRepo: any;

    beforeEach(() => {
      listingRepo = (service as any).listingRepo;
      productRepo.find.mockResolvedValue([product]);
      listingRepo.find.mockResolvedValue([listing]);
    });

    it('charges the variant price and keeps the listing for seller attribution', async () => {
      variantRepo.find.mockResolvedValue([variant]);
      const res = await service.priceOrderItems([{ productId: PID, quantity: 1, variantId: VID }]);
      expect(res.ok).toBe(true);
      expect(res.items[0]).toMatchObject({
        unitPrice: 115900,
        variantId: VID,
        listingId: 'L1',
        sellerId: 'S1',
        name: 'iPhone 15 Pro — 128GB / Midnight Black',
      });
      expect(res.subtotal).toBe(115900);
    });

    it('refuses a variant product ordered without a variant', async () => {
      variantRepo.find.mockResolvedValue([variant]);
      const res = await service.priceOrderItems([{ productId: PID, quantity: 1 }]);
      expect(res.ok).toBe(false);
      expect(res.reason).toMatch(/choose an option/i);
    });

    it('refuses an option that does not belong to the product', async () => {
      variantRepo.find.mockResolvedValue([variant]);
      const res = await service.priceOrderItems([
        { productId: PID, quantity: 1, variantId: '00000000-0000-4000-8000-000000000000' },
      ]);
      expect(res.ok).toBe(false);
      expect(res.reason).toMatch(/not available/i);
    });

    it('refuses more units than the variant holds', async () => {
      variantRepo.find.mockResolvedValue([{ ...variant, stockQuantity: 1 }]);
      const res = await service.priceOrderItems([{ productId: PID, quantity: 2, variantId: VID }]);
      expect(res.ok).toBe(false);
      expect(res.reason).toMatch(/Only 1 left/);
    });

    it('still prices a product with no variants from its buy-box listing', async () => {
      variantRepo.find.mockResolvedValue([]);
      const res = await service.priceOrderItems([{ productId: PID, quantity: 2 }]);
      expect(res.ok).toBe(true);
      expect(res.items[0]).toMatchObject({ unitPrice: 5050, variantId: null });
      expect(res.subtotal).toBe(10100);
    });
  });

  describe('suspended sellers', () => {
    const SP = '11111111-2222-4333-8444-555555555555';
    it('refuses to price a line whose only listing belongs to a suspended seller', async () => {
      productRepo.find.mockResolvedValue([
        { id: SP, name: 'X', mrp: '10', is_active: true, approval_status: 'APPROVED' },
      ]);
      (service as any).listingRepo.find.mockResolvedValue([
        {
          id: 'L',
          sellingPrice: '10',
          stockQuantity: 5,
          product: { id: SP },
          seller: { id: 'S', verificationStatus: 'SUSPENDED', isActive: true },
        },
      ]);
      variantRepo.find.mockResolvedValue([]);
      const res = await service.priceOrderItems([{ productId: SP, quantity: 1 }]);
      expect(res.ok).toBe(false);
      expect(res.reason).toMatch(/seller/i);
    });

    it('prices from the next live listing when the buy box belongs to a suspended seller', async () => {
      productRepo.find.mockResolvedValue([
        { id: SP, name: 'X', mrp: '10', is_active: true, approval_status: 'APPROVED' },
      ]);
      (service as any).listingRepo.find.mockResolvedValue([
        {
          id: 'L1',
          sellingPrice: '8',
          stockQuantity: 5,
          isBuyBoxWinner: true,
          product: { id: SP },
          seller: { id: 'S1', verificationStatus: 'SUSPENDED', isActive: true },
        },
        {
          id: 'L2',
          sellingPrice: '9',
          stockQuantity: 5,
          product: { id: SP },
          seller: { id: 'S2', verificationStatus: 'VERIFIED', isActive: true },
        },
      ]);
      variantRepo.find.mockResolvedValue([]);
      const res = await service.priceOrderItems([{ productId: SP, quantity: 1 }]);
      expect(res.ok).toBe(true);
      expect(res.items[0]).toMatchObject({ unitPrice: 9, listingId: 'L2', sellerId: 'S2' });
    });
  });

  describe('flash deals at checkout', () => {
    const PID = '7e1d1c2a-3b4c-4d5e-8f60-71829a3b4c5d';
    const seller = { id: 'S-QA', verificationStatus: 'VERIFIED', isActive: true, regionCode: 'QA' };
    const product = {
      id: PID,
      name: 'Dash cam',
      mrp: '430.00',
      is_active: true,
      approval_status: 'APPROVED',
    };
    const offer = {
      id: 'L-QA',
      sellingPrice: '300.00',
      mrp: '430.00',
      stockQuantity: 10,
      isBuyBoxWinner: true,
      product: { id: PID },
      seller,
    };

    beforeEach(() => {
      productRepo.find.mockResolvedValue([product]);
      (service as any).listingRepo.find.mockResolvedValue([offer]);
      variantRepo.find.mockResolvedValue([]);
    });

    // The deal page shows `deal_price`; until this the cart charged the offer
    // price regardless, so the "flash deal" was a countdown next to the
    // ordinary price. The pricer now reads the same live nominations the page does.
    it('charges the live deal price from the offer’s own seller', async () => {
      nominationRepo
        .createQueryBuilder()
        .getMany.mockResolvedValue([
          { id: 'N1', productId: PID, sellerId: 'S-QA', dealPrice: '255.00' },
        ]);
      const res = await service.priceOrderItems([{ productId: PID, quantity: 2 }], 'QA');
      expect(res.ok).toBe(true);
      expect(res.items[0]).toMatchObject({
        unitPrice: 255,
        offerPrice: 300,
        lineTotal: 510,
        dealNominationId: 'N1',
        mrp: 430,
      });
      expect(res.subtotal).toBe(510);
      // Scoped to the market the basket is priced in.
      const qb = nominationRepo.createQueryBuilder.mock.results.at(-1)!.value;
      expect(qb.andWhere.mock.calls.some(([, p]: [string, any]) => p?.region === 'QA')).toBe(true);
    });

    it('ignores another seller’s deal on the same product', async () => {
      nominationRepo
        .createQueryBuilder()
        .getMany.mockResolvedValue([
          { id: 'N2', productId: PID, sellerId: 'S-OTHER', dealPrice: '100.00' },
        ]);
      const res = await service.priceOrderItems([{ productId: PID, quantity: 1 }], 'QA');
      expect(res.ok).toBe(true);
      expect(res.items[0]).toMatchObject({ unitPrice: 300, dealNominationId: null });
    });

    it('never raises the price: a deal above the offer is not applied', async () => {
      nominationRepo
        .createQueryBuilder()
        .getMany.mockResolvedValue([
          { id: 'N3', productId: PID, sellerId: 'S-QA', dealPrice: '350.00' },
        ]);
      const res = await service.priceOrderItems([{ productId: PID, quantity: 1 }], 'QA');
      expect(res.items[0]).toMatchObject({ unitPrice: 300, dealNominationId: null });
    });

    it('counts a deal line against the deal allocation when reserving, and refuses a sold-out deal', async () => {
      // Listing decrement wins, the nomination increment finds no allocation left.
      updateExecute.mockResolvedValueOnce({ affected: 1 }).mockResolvedValueOnce({ affected: 0 });
      const res = await service.reserveListingStock([
        { listingId: 'L-QA', productId: PID, quantity: 1, dealNominationId: 'N1' },
      ]);
      expect(res.ok).toBe(false);
      expect(res.reason).toMatch(/sold out/i);
    });

    it('returns the deal on the reserved line so a release can hand the unit back', async () => {
      const res = await service.reserveListingStock([
        { listingId: 'L-QA', productId: PID, quantity: 1, dealNominationId: 'N1' },
      ]);
      expect(res.ok).toBe(true);
      expect(res.reserved[0]).toMatchObject({
        listingId: 'L-QA',
        quantity: 1,
        dealNominationId: 'N1',
      });
    });
  });

  describe('pricing per market', () => {
    const PID = '2b3c706d-185e-4b7e-86e2-00b29682c552';
    const QA_SELLER = {
      id: 'S-QA',
      verificationStatus: 'VERIFIED',
      isActive: true,
      regionCode: 'QA',
    };
    const IN_SELLER = {
      id: 'S-IN',
      verificationStatus: 'VERIFIED',
      isActive: true,
      regionCode: 'IN',
    };
    const product = {
      id: PID,
      name: 'iPhone 15 Pro',
      mrp: '5850.00',
      is_active: true,
      approval_status: 'APPROVED',
    };
    const qaOffer = {
      id: 'L-QA',
      sellingPrice: '5050.00',
      mrp: '5850.00',
      stockQuantity: 10,
      isBuyBoxWinner: true,
      product: { id: PID },
      seller: QA_SELLER,
    };
    const inOffer = {
      id: 'L-IN',
      sellingPrice: '115650.00',
      mrp: '133965.00',
      stockQuantity: 10,
      isBuyBoxWinner: true,
      product: { id: PID },
      seller: IN_SELLER,
    };
    const qaVariant = {
      id: 'V-QA',
      productId: PID,
      sellerId: 'S-QA',
      variantName: '128GB / Black',
      sellingPrice: '5061.00',
      mrp: '5890.00',
      stockQuantity: 5,
      isActive: true,
    };
    const inVariant = {
      id: 'V-IN',
      productId: PID,
      sellerId: 'S-IN',
      variantName: '128GB / Black',
      sellingPrice: '115900.00',
      mrp: '134900.00',
      stockQuantity: 5,
      isActive: true,
    };

    beforeEach(() => {
      productRepo.find.mockResolvedValue([product]);
      (service as any).listingRepo.find.mockResolvedValue([qaOffer, inOffer]);
      variantRepo.find.mockResolvedValue([qaVariant, inVariant]);
    });

    it("prices an Indian basket from the Indian seller's offer, not the Qatari one", async () => {
      const res = await service.priceOrderItems(
        [{ productId: PID, quantity: 1, variantId: 'V-IN' }],
        'IN',
      );
      expect(res.ok).toBe(true);
      expect(res.items[0]).toMatchObject({
        unitPrice: 115900,
        listingId: 'L-IN',
        sellerId: 'S-IN',
        mrp: 134900,
      });
    });

    it('refuses a Qatari SKU in an Indian basket even though the product is offered there', async () => {
      const res = await service.priceOrderItems(
        [{ productId: PID, quantity: 1, variantId: 'V-QA' }],
        'IN',
      );
      expect(res.ok).toBe(false);
      expect(res.reason).toMatch(/not available/i);
    });

    it('uses the offer list price for the discount base', async () => {
      const res = await service.priceOrderItems(
        [{ productId: PID, quantity: 1, variantId: 'V-QA' }],
        'QA',
      );
      expect(res.ok).toBe(true);
      expect(res.items[0]).toMatchObject({ unitPrice: 5061, listingId: 'L-QA', mrp: 5890 });
    });

    it('refuses a market nobody serves', async () => {
      const res = await service.priceOrderItems([{ productId: PID, quantity: 1 }], 'SA');
      expect(res.ok).toBe(false);
      expect(res.reason).toMatch(/seller/i);
    });
  });
});
