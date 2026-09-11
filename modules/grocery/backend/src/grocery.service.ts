import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository, ILike, In, IsNull } from 'typeorm';
import { RedisService } from '@app/redis';
import { getRegionConfig } from '@app/region';
import { KafkaProducerService } from '@app/kafka';

import { GroceryCategory } from './entities/grocery-category.entity';
import { GroceryStore } from './entities/grocery-store.entity';
import { GroceryBrand } from './entities/grocery-brand.entity';
import { GroceryProductVariant } from './entities/grocery-product-variant.entity';
import {
  GroceryStockMovement,
  type StockMovementType,
} from './entities/grocery-stock-movement.entity';
import { GroceryWarehouse, type WarehouseType } from './entities/grocery-warehouse.entity';
import { GroceryVariantStock } from './entities/grocery-variant-stock.entity';
import {
  GROCERY_TAXONOMY,
  LEGACY_CATEGORY_MAP,
  ALL_MARKETS,
  taxonomyId,
} from './catalog/catalog-tree';
import { GroceryItem } from './entities/grocery-item.entity';
import {
  GroceryOrder,
  GroceryOrderStatus,
  GroceryPaymentMethod,
  GROCERY_ORDER_STATUS_TRANSITIONS,
} from './entities/grocery-order.entity';
import { GroceryFlashDeal, FlashDealStatus } from './entities/grocery-flash-deal.entity';
import { GroceryReview } from './entities/grocery-review.entity';
import { GroceryWishlist } from './entities/grocery-wishlist.entity';
import { CreateGroceryOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import {
  CreateFlashDealDto,
  RejectFlashDealDto,
  CreateReviewDto,
  AddToWishlistDto,
  ReorderDto,
  ProductTranslationDto,
} from './dto/flash-deal.dto';
import { requireId, requireUuid, assertInMarket } from '@app/common';

// ── Canonical categories — used ONLY for initial DB seeding ─────────────────
// After seeding, all reads go through the grocery_categories table.
const CANONICAL_CATEGORIES = [
  {
    id: 'fruits-vegetables',
    name: 'Fruits & Vegetables',
    emoji: '🥬',
    gradient: 'from-green-600 to-emerald-500',
    description: 'Farm-fresh produce delivered daily',
    productCount: 240,
    subcategoryCount: 2,
  },
  {
    id: 'fresh-meat',
    name: 'Fresh Meat',
    emoji: '🥩',
    gradient: 'from-red-600 to-rose-500',
    description: 'Premium quality, hygienically processed',
    productCount: 120,
    subcategoryCount: 3,
  },
  {
    id: 'fresh-fish',
    name: 'Fresh Fish',
    emoji: '🐟',
    gradient: 'from-blue-600 to-cyan-500',
    description: 'Coastal catch, delivered on ice',
    productCount: 85,
    subcategoryCount: 1,
  },
  {
    id: 'dairy-bread-eggs',
    name: 'Dairy, Bread & Eggs',
    emoji: '🥛',
    gradient: 'from-yellow-500 to-amber-400',
    description: 'Farm-fresh dairy and bakery',
    productCount: 180,
    subcategoryCount: 6,
  },
  {
    id: 'rice-flour-pulses',
    name: 'Rice, Flour & Pulses',
    emoji: '🌾',
    gradient: 'from-amber-600 to-orange-500',
    description: 'Staples for every kitchen',
    productCount: 150,
    subcategoryCount: 3,
  },
  {
    id: 'cooking-oil-ghee',
    name: 'Cooking Oil & Ghee',
    emoji: '🫒',
    gradient: 'from-lime-600 to-green-500',
    description: 'Pure oils and premium ghee',
    productCount: 65,
    subcategoryCount: 2,
  },
  {
    id: 'masala-spices',
    name: 'Masala & Spices',
    emoji: '🌶️',
    gradient: 'from-orange-600 to-red-500',
    description: 'Authentic flavors for every dish',
    productCount: 110,
    subcategoryCount: 2,
  },
  {
    id: 'snacks-packaged',
    name: 'Snacks & Packaged Food',
    emoji: '🍪',
    gradient: 'from-purple-600 to-violet-500',
    description: 'Munchies, biscuits, and namkeen',
    productCount: 320,
    subcategoryCount: 5,
  },
  {
    id: 'beverages',
    name: 'Beverages',
    emoji: '☕',
    gradient: 'from-amber-600 to-orange-500',
    description: 'Tea, coffee, juices, and more',
    productCount: 190,
    subcategoryCount: 6,
  },
  {
    id: 'frozen-food',
    name: 'Frozen Food',
    emoji: '🧊',
    gradient: 'from-cyan-600 to-sky-500',
    description: 'Ready-to-cook meals and ice cream',
    productCount: 95,
    subcategoryCount: 5,
  },
  {
    id: 'bakery',
    name: 'Bakery',
    emoji: '🥐',
    gradient: 'from-orange-500 to-amber-400',
    description: 'Fresh bread, cakes, and pastries',
    productCount: 75,
    subcategoryCount: 3,
  },
  {
    id: 'breakfast',
    name: 'Breakfast Items',
    emoji: '🥣',
    gradient: 'from-yellow-500 to-orange-400',
    description: 'Cereals, oats, cornflakes, and more',
    productCount: 80,
    subcategoryCount: 3,
  },
  {
    id: 'household-cleaning',
    name: 'Household Cleaning',
    emoji: '🧹',
    gradient: 'from-teal-600 to-emerald-500',
    description: 'Detergents, cleaners, and supplies',
    productCount: 140,
    subcategoryCount: 6,
  },
  {
    id: 'personal-care',
    name: 'Personal Care',
    emoji: '🧴',
    gradient: 'from-pink-500 to-rose-400',
    description: 'Skincare, haircare, and grooming',
    productCount: 210,
    subcategoryCount: 6,
  },
  {
    id: 'baby-care',
    name: 'Baby Care',
    emoji: '👶',
    gradient: 'from-pink-500 to-rose-400',
    description: 'Diapers, food, and essentials',
    productCount: 90,
    subcategoryCount: 4,
  },
  {
    id: 'pet-care',
    name: 'Pet Care',
    emoji: '🐾',
    gradient: 'from-amber-500 to-yellow-400',
    description: 'Food, toys, and accessories',
    productCount: 60,
    subcategoryCount: 4,
  },
  {
    id: 'organic',
    name: 'Organic Products',
    emoji: '🌱',
    gradient: 'from-emerald-600 to-green-500',
    description: 'Certified organic and natural',
    productCount: 110,
    subcategoryCount: 3,
  },
  {
    id: 'international-foods',
    name: 'International Foods',
    emoji: '🌍',
    gradient: 'from-indigo-600 to-violet-500',
    description: 'Thai, Korean, Italian, and more',
    productCount: 70,
    subcategoryCount: 3,
  },
  {
    id: 'ready-to-cook',
    name: 'Ready-to-Cook',
    emoji: '🍳',
    gradient: 'from-orange-600 to-amber-500',
    description: 'Marinated, pre-cut & ready to cook',
    productCount: 65,
    subcategoryCount: 3,
  },
  {
    id: 'dry-fruits-nuts',
    name: 'Dry Fruits & Nuts',
    emoji: '🥜',
    gradient: 'from-amber-700 to-orange-500',
    description: 'Premium almonds, cashews, walnuts & more',
    productCount: 80,
    subcategoryCount: 4,
  },
  {
    id: 'chocolates-sweets',
    name: 'Chocolates & Sweets',
    emoji: '🍫',
    gradient: 'from-yellow-800 to-amber-600',
    description: 'Cadbury, Ferrero, Indian mithai & more',
    productCount: 120,
    subcategoryCount: 3,
  },
  {
    id: 'tea-coffee-health',
    name: 'Tea, Coffee & Health Drinks',
    emoji: '🍵',
    gradient: 'from-green-800 to-emerald-600',
    description: 'Premium teas, artisan coffee & health drinks',
    productCount: 90,
    subcategoryCount: 3,
  },
  {
    id: 'health-wellness',
    name: 'Health & Wellness',
    emoji: '💊',
    gradient: 'from-teal-600 to-cyan-500',
    description: 'Vitamins, supplements & wellness products',
    productCount: 85,
    subcategoryCount: 4,
  },
];

const CACHE_TTL = {
  CATEGORIES: 300, // 5 minutes
  PRODUCTS: 120, // 2 minutes
  STORE: 180, // 3 minutes
  ORDER: 86400, // 24 hours
  // Short: a deal that lapses mid-window should leave the rail promptly.
  FLASH_DEALS: 60, // 1 minute
};

/**
 * Pagination bounds.
 *
 * Nothing clamped page or limit. `ParseIntPipe` at the gateway accepts any
 * integer, so `?page=-5` reached the query builder as `.skip(-180)` and Postgres
 * answered "OFFSET must not be negative" — surfaced to the caller as a 500 with
 * the raw database message in it. `?limit=100000` was honoured in full, letting
 * an anonymous request pull the entire catalogue in one query.
 *
 * Clamped here rather than at the gateway because the gateway is not the only
 * caller: the gRPC controller and franchise-service reach these same methods.
 *
 * Out-of-range values are corrected rather than rejected — a page past the end
 * legitimately returns an empty list, and callers should not have to know the
 * ceiling to page safely.
 */
/**
 * Brand name -> URL segment. Folds diacritics first so "Nestlé" becomes
 * `nestle` rather than `nestl-`, which is what makes the slug round-trip.
 */
function slugify(v: string): string {
  return String(v ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const MAX_PAGE_SIZE = 100;

function paginate(page?: number, limit?: number, fallbackLimit = 20) {
  const safePage = Math.max(1, Math.floor(Number(page) || 1));
  const requested = Math.floor(Number(limit) || fallbackLimit);
  const safeLimit = Math.min(MAX_PAGE_SIZE, Math.max(1, requested));
  return { page: safePage, limit: safeLimit, offset: (safePage - 1) * safeLimit };
}

@Injectable()
export class GroceryService {
  private readonly logger = new Logger(GroceryService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(GroceryCategory) private readonly categoryRepo: Repository<GroceryCategory>,
    @InjectRepository(GroceryBrand) private readonly brandRepo: Repository<GroceryBrand>,
    @InjectRepository(GroceryProductVariant)
    private readonly variantRepo: Repository<GroceryProductVariant>,
    @InjectRepository(GroceryStockMovement)
    private readonly movementRepo: Repository<GroceryStockMovement>,
    @InjectRepository(GroceryWarehouse)
    private readonly warehouseRepo: Repository<GroceryWarehouse>,
    @InjectRepository(GroceryVariantStock)
    private readonly variantStockRepo: Repository<GroceryVariantStock>,
    @InjectRepository(GroceryStore) private readonly storeRepo: Repository<GroceryStore>,
    @InjectRepository(GroceryItem) private readonly itemRepo: Repository<GroceryItem>,
    @InjectRepository(GroceryOrder) private readonly orderRepo: Repository<GroceryOrder>,
    @InjectRepository(GroceryFlashDeal)
    private readonly flashDealRepo: Repository<GroceryFlashDeal>,
    @InjectRepository(GroceryReview) private readonly reviewRepo: Repository<GroceryReview>,
    @InjectRepository(GroceryWishlist) private readonly wishlistRepo: Repository<GroceryWishlist>,
    private readonly redis: RedisService,
    private readonly kafka: KafkaProducerService,
  ) {
    // Auto-seed categories on first boot if the table is empty
    this.seedCategoriesIfEmpty().catch((err) =>
      this.logger.warn(`Category seeding skipped (DB may not be ready): ${err.message}`),
    );
  }

  // ── Health ──────────────────────────────────────────────────────────────────

  async healthCheck() {
    return { service: 'grocery-service', status: 'ok', timestamp: new Date().toISOString() };
  }

  // ── Cache helpers ───────────────────────────────────────────────────────────

  /**
   * Drop every cached product page for a store.
   *
   * The call sites used `redis.del('grocery:products:<id>:*')`. Redis DEL takes
   * literal key names — the glob was never expanded, so nothing was ever evicted
   * and a seller's create/update/delete/promote stayed invisible on the storefront
   * for the full 2-minute TTL. SCAN + DEL is the supported way to do this and, unlike
   * KEYS, does not block the server.
   */
  private async invalidateProductCache(storeId?: string) {
    const patterns = [
      `grocery:products:${storeId ?? '*'}:*`,
      // The catalogue-wide listing (admin console) is keyed on 'all'.
      'grocery:products:all:*',
    ];
    for (const pattern of patterns) {
      try {
        let cursor = '0';
        do {
          const [next, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', '200');
          cursor = next;
          for (const key of keys) await this.redis.del(key);
        } while (cursor !== '0');
      } catch (err: any) {
        this.logger.warn(`Product cache invalidation failed for ${pattern}: ${err.message}`);
      }
    }
  }

  /**
   * Keep `grocery_stores.productCount` in step with the catalogue.
   *
   * Best-effort by design: the product write has already committed by the time this
   * runs, so letting a counter failure reach the caller's catch block is what made a
   * successful bulk import report `{ uploaded: 0 }`. A drifted counter is corrected
   * on the next store-detail read, which counts the inventory directly.
   */
  private async bumpProductCount(storeId: string, delta: number) {
    if (!delta) return;
    try {
      await this.storeRepo.increment({ id: storeId }, 'productCount', delta);
    } catch (err: any) {
      this.logger.warn(`productCount bump failed for store ${storeId}: ${err.message}`);
    }
  }

  // ── Categories ──────────────────────────────────────────────────────────────

  /**
   * Returns all active grocery categories.
   * Served from Redis cache (5-min TTL) → fallback to DB → fallback to canonical list.
   */
  /**
   * The category list, optionally narrowed to what is actually buyable.
   *
   * @param regionCode  the shopper's market
   * @param stockedOnly drop categories no open shop in that market stocks
   *
   * Storefronts want the narrowed list: of 23 categories, 7 have a shop behind
   * them in Qatar, so an unfiltered grid sent shoppers to sixteen empty pages.
   * Admin tooling wants the full list, which is why this is a parameter rather
   * than the only behaviour.
   */
  async getCategories(regionCode?: string, stockedOnly = false) {
    // The cache key carries both parameters. A single `grocery:categories:all`
    // key would serve one market's narrowed list to every other market.
    const cacheKey = stockedOnly
      ? `grocery:categories:stocked:${regionCode ?? 'any'}`
      : 'grocery:categories:all';
    const cached = await this.redis.getJson(cacheKey);
    if (cached) {
      this.logger.debug('Categories served from Redis cache');
      return cached;
    }

    let categories: GroceryCategory[];
    try {
      categories = await this.categoryRepo.find({
        // `parentId: null` compiles to `"parentId" = $1` with a NULL parameter in
        // TypeORM 0.3, which matches nothing — only a FindOperator produces
        // `IS NULL`. Every call therefore found zero rows and silently served the
        // canonical list below, so seeded categories and anything an admin created
        // were invisible in all three clients.
        where: { isActive: true, parentId: IsNull() },
        order: { sortOrder: 'ASC' },
        relations: ['children'],
      });
    } catch {
      // DB not ready — fall back to canonical list
      this.logger.warn('Category DB query failed, using canonical fallback');
      const result = {
        categories: CANONICAL_CATEGORIES,
        total: CANONICAL_CATEGORIES.length,
        cachedAt: new Date().toISOString(),
        source: 'canonical',
      };
      await this.redis.setJson(cacheKey, result, CACHE_TTL.CATEGORIES);
      return result;
    }

    // If DB is empty, use canonical
    if (!categories.length) {
      const result = {
        categories: CANONICAL_CATEGORIES,
        total: CANONICAL_CATEGORIES.length,
        cachedAt: new Date().toISOString(),
        source: 'canonical',
      };
      await this.redis.setJson(cacheKey, result, CACHE_TTL.CATEGORIES);
      return result;
    }

    if (stockedOnly) {
      // One query for the whole set rather than one per category. A category
      // counts as stocked when some available item in an approved, online shop
      // in this market carries it, on either the category or subcategory field
      // — the same pair `getStores(category)` matches on.
      const rows = await this.itemRepo.query(
        `SELECT DISTINCT i.category AS id
           FROM grocery.grocery_items i
           JOIN grocery.grocery_stores s ON s.id = i."storeId"
          WHERE i."isAvailable" = true
            AND s.status = 'APPROVED'
            AND s."isOnline" = true
            AND ($1::text IS NULL OR s.region_code = $1)
          UNION
         SELECT DISTINCT i."subCategory" AS id
           FROM grocery.grocery_items i
           JOIN grocery.grocery_stores s ON s.id = i."storeId"
          WHERE i."isAvailable" = true
            AND s.status = 'APPROVED'
            AND s."isOnline" = true
            AND ($1::text IS NULL OR s.region_code = $1)`,
        [regionCode ?? null],
      );
      const stocked = new Set(rows.map((r: { id: string }) => r.id).filter(Boolean));
      categories = categories.filter((c) => stocked.has(c.id));
    }

    const result = {
      categories,
      total: categories.length,
      cachedAt: new Date().toISOString(),
      source: 'database',
    };
    await this.redis.setJson(cacheKey, result, CACHE_TTL.CATEGORIES);
    return result;
  }

  /** Returns a single category by ID with its full subcategory tree. */
  async getCategoryById(id: string) {
    const cacheKey = `grocery:category:${id}`;
    const cached = await this.redis.getJson(cacheKey);
    if (cached) return cached;

    let cat: GroceryCategory | null;
    try {
      cat = await this.categoryRepo.findOne({
        where: { id },
        relations: ['children'],
      });
    } catch {
      // DB fallback
      const fallback = CANONICAL_CATEGORIES.find((c) => c.id === id) ?? null;
      if (fallback) await this.redis.setJson(cacheKey, fallback, CACHE_TTL.CATEGORIES);
      return fallback;
    }

    if (!cat) {
      // Try canonical fallback
      const fallback = CANONICAL_CATEGORIES.find((c) => c.id === id) ?? null;
      if (fallback) await this.redis.setJson(cacheKey, fallback, CACHE_TTL.CATEGORIES);
      return fallback;
    }

    await this.redis.setJson(cacheKey, cat, CACHE_TTL.CATEGORIES);
    return cat;
  }

  /** Admin: create a new category */
  async createCategory(data: Partial<GroceryCategory>) {
    if (!data?.name?.trim()) throw new BadRequestException('Category name is required');
    // Ids are slugs (`fruits-vegetables`) and are the join key on `grocery_items.category`,
    // so derive one rather than letting the caller omit it.
    const id = (data.id ?? data.name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 64);
    if (!id)
      throw new BadRequestException(
        'Category name must contain at least one alphanumeric character',
      );

    const existing = await this.categoryRepo.findOne({ where: { id } });
    if (existing) throw new BadRequestException(`Category "${id}" already exists`);

    // The old catch returned `{ success: true, id: 'cat-<timestamp>' }` on failure, so
    // the admin console listed a category that was never stored and whose id no
    // product could ever reference.
    const cat = this.categoryRepo.create({ ...data, id, isActive: data.isActive ?? true });
    const saved = await this.categoryRepo.save(cat);
    await this.invalidateCategoryCache();
    return saved;
  }

  /** Admin: delete a category. Refuses while products still reference it. */
  async deleteCategory(id: string) {
    const cat = await this.categoryRepo.findOne({ where: { id }, relations: ['children'] });
    if (!cat) throw new NotFoundException(`Category ${id} not found`);

    const inUse = await this.itemRepo.count({ where: { category: id } });
    if (inUse > 0) {
      throw new BadRequestException(`${inUse} product(s) still use "${id}" — reassign them first`);
    }
    if (cat.children?.length) {
      throw new BadRequestException(
        `"${id}" has ${cat.children.length} subcategor(y/ies) — delete those first`,
      );
    }

    await this.categoryRepo.delete({ id });
    await this.invalidateCategoryCache();
    return { success: true, deletedId: id };
  }

  /** Admin: update an existing category */
  async updateCategory(id: string, data: Partial<GroceryCategory>) {
    await this.categoryRepo.update(id, data);
    await this.invalidateCategoryCache();
    return this.categoryRepo.findOne({ where: { id }, relations: ['children'] });
  }

  /**
   * Admin action: invalidate the category cache so all clients get fresh data.
   * Also publishes a Kafka event so mobile apps can re-fetch on next launch.
   */
  async invalidateCategoryCache() {
    await this.redis.del('grocery:categories:all');
    // Also clear per-category caches
    for (const cat of CANONICAL_CATEGORIES) {
      await this.redis.del(`grocery:category:${cat.id}`);
    }
    // Clear any DB-sourced categories too
    try {
      const dbCats = await this.categoryRepo.find({ select: ['id'] });
      for (const c of dbCats) {
        await this.redis.del(`grocery:category:${c.id}`);
      }
    } catch {
      /* DB not available — canonical keys already cleared */
    }

    await this.kafka.publish('grocery.category.updated', {
      invalidatedAt: new Date().toISOString(),
    });
    this.logger.log('Category cache invalidated and Kafka event published');
    return { success: true };
  }

  // ── Stores ──────────────────────────────────────────────────────────────────

  /**
   * Returns nearby stores, ordered by distance.
   * Uses PostGIS ST_DWithin for geospatial filtering when lat/lng provided.
   * Falls back to simple paginated listing otherwise.
   */
  async getStores(
    lat?: number,
    lng?: number,
    page = 1,
    limit = 20,
    regionCode?: string,
    category?: string,
  ) {
    let offset: number;
    ({ page, limit, offset } = paginate(page, limit, 20));

    try {
      let qb = this.storeRepo
        .createQueryBuilder('s')
        .where('s.status = :status', { status: 'APPROVED' })
        .andWhere('s.isOnline = :online', { online: true });

      // Scope to the shopper's market.
      //
      // The radius filter below only runs when coordinates are supplied, so a
      // shopper who declines the location prompt — a common case — previously
      // got every approved store on the platform ordered by rating. In Doha
      // that listed shops in Mumbai, Bangalore and Nairobi as if they could
      // deliver. Region is a property of the store row and does not depend on
      // the browser granting anything.
      if (regionCode) {
        qb = qb.andWhere('s.regionCode = :regionCode', { regionCode });
      }

      // Stores that actually stock the category.
      //
      // Browsing a category previously led to a product grid with no way to see
      // which shops carry it, and there was no endpoint to ask: the only
      // category route was `stores/:id/categories`, the inverse question.
      // EXISTS rather than a join, so a store with fifty matching items is
      // still returned once.
      if (category) {
        qb = qb.andWhere(
          `EXISTS (
             SELECT 1 FROM grocery.grocery_items i
             WHERE i."storeId" = s.id
               AND i."isAvailable" = true
               AND (i.category = :category OR i."subCategory" = :category)
           )`,
          { category },
        );
      }

      if (lat != null && lng != null) {
        // PostGIS distance calculation — Earth radius ~6371km
        // ST_DWithin requires geography columns; we use the Haversine approximation
        qb = qb
          .addSelect(
            `(6371 * acos(cos(radians(:lat)) * cos(radians(s.latitude)) * cos(radians(s.longitude) - radians(:lng)) + sin(radians(:lat)) * sin(radians(s.latitude))))`,
            'distance_km',
          )
          .setParameter('lat', lat)
          .setParameter('lng', lng)
          .andWhere(
            `(6371 * acos(cos(radians(:lat2)) * cos(radians(s.latitude)) * cos(radians(s.longitude) - radians(:lng2)) + sin(radians(:lat2)) * sin(radians(s.latitude)))) <= s."deliveryRadius"`,
          )
          .setParameter('lat2', lat)
          .setParameter('lng2', lng)
          .orderBy('distance_km', 'ASC');
      } else {
        qb = qb.orderBy('s.rating', 'DESC');
      }

      const [data, total] = await qb.skip(offset).take(limit).getManyAndCount();

      /**
       * The offer badge, from the store's live promotions.
       *
       * The storefront renders `store.offerBadge` in three places and the badge
       * only ever held a hardcoded demo string — "Mega Deals" on Carrefour, on
       * Star Bazaar — while the API mapper set it to `undefined`. So the badge
       * either lied (fixture data) or never appeared (real data).
       *
       * `grocery_flash_deals` is the one place a real promotion lives, so the
       * headline discount is derived from it: a store advertising "Up to 40% off"
       * is making a claim the catalogue can back, and it disappears on its own
       * when the last deal lapses.
       *
       * One grouped query for the page rather than a lookup per store.
       */
      const storeIds = data.map((s) => s.id);
      const offers = new Map<string, { maxDiscount: number; dealCount: number }>();
      if (storeIds.length) {
        const rows = await this.flashDealRepo
          .createQueryBuilder('d')
          .select('d.storeId', 'storeId')
          .addSelect('MAX(d.discountPercent)', 'maxDiscount')
          .addSelect('COUNT(*)', 'dealCount')
          .where('d.storeId IN (:...storeIds)', { storeIds })
          .andWhere('d.status = :status', { status: FlashDealStatus.ACTIVE })
          .andWhere('d.endTime > NOW()')
          .groupBy('d.storeId')
          .getRawMany<{ storeId: string; maxDiscount: string; dealCount: string }>();
        rows.forEach((r) =>
          offers.set(r.storeId, {
            maxDiscount: Math.round(Number(r.maxDiscount)),
            dealCount: Number(r.dealCount),
          }),
        );
      }

      const withOffers = data.map((s) => {
        const offer = offers.get(s.id);
        return Object.assign(this.toPublicStore(s), {
          offerBadge: offer && offer.maxDiscount > 0 ? `Up to ${offer.maxDiscount}% off` : null,
          // The real number. This was `pct ? 1 : 0`, so a shop running six deals
          // and a shop running one both reported "1 deal" to the storefront.
          activeDealCount: offer?.dealCount ?? 0,
        });
      });

      return { data: withOffers, total, page, limit };
    } catch (err: any) {
      // No demo fallback. This used to answer 200 with two invented stores
      // ("FreshMart", "QuickGroc") whose ids matched nothing, so a database outage
      // rendered a normal-looking storefront that 404'd on every click, and the
      // admin store list counted stores that do not exist.
      this.logger.error(`getStores failed: ${err.message}`);
      throw err;
    }
  }

  /**
   * A store as the storefront may see it.
   *
   * `ownerId` is the seller's own user id. It has no use on a shop page and was
   * being handed to anonymous callers on every store in the list, which gives
   * an attacker a confirmed, valid user id to aim at the seller and admin
   * endpoints. `phone` stays: it is the shop's published contact number and the
   * page renders it.
   */
  private toPublicStore<T extends { ownerId?: string | null }>(store: T): Omit<T, 'ownerId'> {
    const { ownerId: _ownerId, ...rest } = store;
    return rest;
  }

  async getStoreById(id: string) {
    const cacheKey = `grocery:store:${id}`;
    const cached = await this.redis.getJson(cacheKey);
    if (cached) return cached;

    try {
      const store = await this.storeRepo.findOne({
        where: { id },
        relations: ['inventory'],
      });
      if (!store) throw new NotFoundException(`Store ${id} not found`);

      const result = {
        ...this.toPublicStore(store),
        productCount: store.inventory?.length ?? 0,
        inventory: undefined as unknown[] | undefined, // Don't expose full inventory in store detail
      };
      await this.redis.setJson(cacheKey, result, CACHE_TTL.STORE);
      return result;
    } catch (err: any) {
      if (err instanceof NotFoundException) throw err;
      // Returning a stand-in "FreshMart" for any id turned a database outage into a
      // store page that looked real and had no products.
      this.logger.error(`getStoreById failed for ${id}: ${err.message}`);
      throw err;
    }
  }

  /**
   * Resolves the store a seller owns, from their auth user id.
   *
   * Nothing exposed this, so the seller portal hardcoded `storeId = 'current-store'`
   * and every screen in it queried a store that does not exist. Returns null rather
   * than throwing: a signed-in seller who has not finished onboarding has no store
   * yet, and that is a state the portal renders, not an error.
   */
  async getStoreByOwner(ownerId: string) {
    if (!ownerId) throw new BadRequestException('ownerId is required');
    const store = await this.storeRepo.findOne({ where: { ownerId }, order: { createdAt: 'ASC' } });
    if (!store) return { store: null, hasStore: false };

    const productCount = await this.itemRepo.count({ where: { storeId: store.id } });
    return { store: { ...store, productCount }, hasStore: true };
  }

  /**
   * Owner id for a store, or null when the store is unknown.
   *
   * Backs the gateway's ownership guard, which must be able to tell "not yours"
   * from "does not exist" without leaking which — hence a plain null rather than a
   * NotFoundException.
   */
  async getStoreOwner(storeId: string): Promise<{ storeId: string; ownerId: string | null }> {
    const row = await this.storeRepo.findOne({ where: { id: storeId }, select: ['id', 'ownerId'] });
    return { storeId, ownerId: row?.ownerId || null };
  }

  /** Returns the categories available in a specific store (derived from its inventory). */
  async getStoreCategoriesByStoreId(storeId: string) {
    const cacheKey = `grocery:store:${storeId}:categories`;
    const cached = await this.redis.getJson(cacheKey);
    if (cached) return cached;

    try {
      // Get distinct category IDs from this store's inventory
      const distinctCats = await this.itemRepo
        .createQueryBuilder('item')
        .select('DISTINCT item.category', 'categoryId')
        .where('item.storeId = :storeId', { storeId })
        .getRawMany();

      const categoryIds = distinctCats.map((r) => r.categoryId);

      let categories: GroceryCategory[];
      if (categoryIds.length > 0) {
        categories = await this.categoryRepo.find({
          where: { id: In(categoryIds), isActive: true },
          order: { sortOrder: 'ASC' },
        });
      } else {
        // No items yet — return all active categories
        categories = await this.categoryRepo.find({
          where: { isActive: true },
          order: { sortOrder: 'ASC' },
        });
      }

      const result = { storeId, categories, total: categories.length };
      await this.redis.setJson(cacheKey, result, CACHE_TTL.CATEGORIES);
      return result;
    } catch {
      // Fallback to canonical
      const result = {
        storeId,
        categories: CANONICAL_CATEGORIES,
        total: CANONICAL_CATEGORIES.length,
      };
      await this.redis.setJson(cacheKey, result, CACHE_TTL.CATEGORIES);
      return result;
    }
  }

  // ── Catalogue tree ─────────────────────────────────────────────────────────

  /**
   * Build (or repair) the department → category → subcategory tree.
   *
   * Idempotent: safe to run repeatedly, and it never invents a subcategory. The
   * subcategory rows come from `grocery_items.subCategory` — the values sellers
   * have actually filed products under — so the tree describes the catalogue
   * that exists rather than an aspirational one. `subcategoryCount` was a stored
   * number with no rows behind it (2–6 per category, ~78 in total, none real);
   * it is recomputed here from actual children.
   */
  async rebuildCatalogTree() {
    const stats = {
      departments: 0,
      categories: 0,
      subcategories: 0,
      updated: 0,
      productsMigrated: 0,
      pruned: 0,
    };

    // The taxonomy is ~800 nodes. Doing findOne+save per node is ~1600 round
    // trips and blew the 10s RPC timeout, leaving a half-built tree behind — so
    // the existing rows are read once and the writes are batched.
    const existingRows = await this.categoryRepo.find();
    /** Every id the current taxonomy produces — anything else is stale. */
    const wanted = new Set<string>();
    const existingById = new Map(existingRows.map((r) => [r.id, r]));
    const toSave: any[] = [];

    const upsert = (
      node: { name: string; countries?: readonly string[] },
      id: string,
      level: 'department' | 'category' | 'subcategory',
      parentId: string | null,
      sortOrder: number,
    ) => {
      const countries = node.countries ? [...node.countries] : null;
      const existing = existingById.get(id);
      if (existing) {
        const changed =
          existing.name !== node.name ||
          existing.level !== level ||
          existing.parentId !== parentId ||
          JSON.stringify(existing.countries ?? null) !== JSON.stringify(countries);
        if (!changed) return;
        Object.assign(existing, { name: node.name, level, parentId, countries, sortOrder });
        toSave.push(existing);
        stats.updated += 1;
        return;
      }
      toSave.push(
        this.categoryRepo.create({
          id,
          name: node.name,
          level,
          parentId,
          countries,
          sortOrder,
          isActive: true,
        }),
      );
      if (level === 'department') stats.departments += 1;
      else if (level === 'category') stats.categories += 1;
      else stats.subcategories += 1;
    };

    // 1. The master taxonomy, three rungs deep.
    for (const [di, dept] of GROCERY_TAXONOMY.entries()) {
      const deptId = taxonomyId(dept.name);
      wanted.add(deptId);
      upsert(dept, deptId, 'department', null, di);

      for (const [ci, cat] of (dept.children ?? []).entries()) {
        const catId = taxonomyId(cat.name, deptId);
        // A category with no countries of its own inherits its department's.
        wanted.add(catId);
        upsert(
          { name: cat.name, countries: cat.countries ?? dept.countries },
          catId,
          'category',
          deptId,
          ci,
        );

        for (const [si, sc] of (cat.children ?? []).entries()) {
          const scId = taxonomyId(sc.name, catId);
          wanted.add(scId);
          upsert(
            { name: sc.name, countries: sc.countries ?? cat.countries ?? dept.countries },
            scId,
            'subcategory',
            catId,
            si,
          );
        }
      }
    }

    for (let i = 0; i < toSave.length; i += 200) {
      await this.categoryRepo.save(toSave.slice(i, i + 200));
    }

    // 2. Move products off the previous taxonomy so none is orphaned.
    //
    // The old scheme's categories become departments here, and a product may
    // not sit on a department — `validateCategoryPath` refuses it — so every
    // legacy product has to land on a real category or it becomes unbrowsable.
    const legacy = await this.itemRepo
      .createQueryBuilder('i')
      .select(['i.id AS id', 'i.category AS category', 'i."subCategory" AS sub'])
      .getRawMany();

    for (const row of legacy) {
      const target = LEGACY_CATEGORY_MAP[`${row.category}|${row.sub}`];
      if (!target) continue;
      if (row.category === target) continue;
      await this.itemRepo.update({ id: row.id }, { category: target, subCategory: null });
      stats.productsMigrated += 1;
    }

    // 3. Prune nodes the taxonomy no longer defines, so this file is the single
    //    authority and a removed branch does not linger as a browsable dead end.
    //    Anything still holding products is kept and reported rather than
    //    deleted — losing a product's category is worse than a stale node.
    const stale = existingRows.filter((r) => !wanted.has(r.id));
    const kept: string[] = [];
    for (const node of stale) {
      const inUse = await this.itemRepo.count({ where: { category: node.id } });
      if (inUse > 0) {
        kept.push(`${node.id} (${inUse} products)`);
        continue;
      }
      await this.categoryRepo.delete({ id: node.id });
      stats.pruned += 1;
    }

    // 4. Counts from actual children, not stored guesses.
    const all = await this.categoryRepo.find();
    for (const node of all) {
      const childCount = all.filter((c) => c.parentId === node.id).length;
      if (node.subcategoryCount !== childCount) {
        node.subcategoryCount = childCount;
        await this.categoryRepo.save(node);
      }
    }

    await this.redis.del('grocery:categories:all').catch(() => undefined);
    for (const c of [...ALL_MARKETS, 'all']) {
      await this.redis.del(`grocery:categories:tree:${c}`).catch(() => undefined);
    }

    return { success: true, ...stats, staleButInUse: kept, totalNodes: all.length };
  }

  /**
   * The catalogue as a tree, for the seller's product form and the storefront's
   * navigation. Both need the same shape, so neither has to assemble it.
   */
  async getCategoryTree(regionCode?: string) {
    const market = (regionCode ?? '').toUpperCase();
    const cacheKey = `grocery:categories:tree:${market || 'all'}`;
    const cached = await this.redis.getJson(cacheKey);
    if (cached) return cached;

    const everything = await this.categoryRepo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });

    // A node with no `countries` is universal; one with a list is offered only
    // in those markets. Filtering here means a seller in the UK is never shown
    // a category they cannot list in.
    const all = market
      ? everything.filter((n) => !n.countries || n.countries.includes(market))
      : everything;

    const byParent = new Map<string | null, typeof all>();
    for (const node of all) {
      const key = node.parentId ?? null;
      if (!byParent.has(key)) byParent.set(key, [] as typeof all);
      byParent.get(key)!.push(node);
    }

    const shape = (node: (typeof all)[number]): any => ({
      id: node.id,
      name: node.name,
      emoji: node.emoji,
      level: node.level,
      productCount: node.productCount,
      children: (byParent.get(node.id) ?? []).map(shape),
    });

    const departments = (byParent.get(null) ?? [])
      .filter((n) => n.level === 'department')
      .map(shape);

    const result = { departments, total: all.length, market: market || null };
    await this.redis.setJson(cacheKey, result, 300).catch(() => undefined);
    return result;
  }

  /**
   * Is this category/subcategory pair a real place in the catalogue?
   *
   * `createProduct` accepted any string for either, so a typo filed a product
   * somewhere nothing browses — it existed, was searchable by name, and was
   * unreachable by category. Returns the reason rather than a bare false so the
   * seller is told which half is wrong.
   */
  async validateCategoryPath(
    category?: string | null,
    subCategory?: string | null,
  ): Promise<{ ok: true } | { ok: false; reason: string }> {
    if (!category) return { ok: false, reason: 'A category is required.' };

    const cat = await this.categoryRepo.findOne({ where: { id: category } });
    if (!cat) {
      return { ok: false, reason: `Unknown category "${category}".` };
    }
    if (cat.level === 'department') {
      return { ok: false, reason: `"${cat.name}" is a department — choose a category inside it.` };
    }

    if (!subCategory) return { ok: true };

    // Subcategories are matched on their display name within the parent, which
    // is how products have always stored them.
    const child = await this.categoryRepo.findOne({
      where: { parentId: category, name: subCategory },
    });
    if (!child) {
      return { ok: false, reason: `"${subCategory}" is not a sub-category of "${cat.name}".` };
    }
    return { ok: true };
  }

  // ── Brands ─────────────────────────────────────────────────────────────────

  /**
   * A seller asks for a brand; a moderator decides.
   *
   * Returning an existing approved brand rather than creating a duplicate is
   * the point of the whole change — brand was free text, so "Al Rawabi",
   * "Al-Rawabi" and "al rawabi" were three brands as far as browsing was
   * concerned.
   */
  async requestBrand(
    dto: { name?: string; manufacturer?: string; logoUrl?: string; description?: string },
    sellerId?: string,
  ) {
    const name = String(dto?.name ?? '').trim();
    if (!name) throw new BadRequestException('A brand name is required.');
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const existing = await this.brandRepo.findOne({ where: { slug } });
    if (existing) {
      if (existing.approvalStatus === 'REJECTED') {
        throw new BadRequestException(
          `"${existing.name}" was reviewed and not approved${existing.rejectionReason ? `: ${existing.rejectionReason}` : '.'}`,
        );
      }
      return { success: true, alreadyExists: true, brand: existing };
    }

    const brand = await this.brandRepo.save(
      this.brandRepo.create({
        slug,
        name,
        manufacturer: dto?.manufacturer?.trim() || null,
        logoUrl: dto?.logoUrl?.trim() || null,
        description: dto?.description?.trim() || null,
        approvalStatus: 'PENDING',
        requestedBySellerId: sellerId ?? null,
      }),
    );
    await this.kafka.publish('grocery.brand.requested', { brandId: brand.id, name, sellerId });
    return { success: true, alreadyExists: false, brand };
  }

  /** Moderation decision on a brand request. */
  async setBrandApproval(brandId: string, status: 'APPROVED' | 'REJECTED', reason?: string) {
    if (!brandId) throw new BadRequestException('A brand id is required.');
    const brand = await this.brandRepo.findOne({ where: { id: brandId } });
    if (!brand) throw new NotFoundException(`Brand ${brandId} not found`);

    brand.approvalStatus = status;
    brand.rejectionReason = status === 'REJECTED' ? (reason ?? null) : null;
    const saved = await this.brandRepo.save(brand);
    await this.kafka.publish(`grocery.brand.${status.toLowerCase()}`, {
      brandId,
      status,
      reason: reason ?? null,
    });
    return { success: true, brand: saved };
  }

  /** Brands a seller may list under. Unapproved ones are not offered. */
  async getBrands2(status?: string, page = 1, limit = 50) {
    ({ page, limit } = paginate(page, limit, 50));
    const where = status
      ? { approvalStatus: status.toUpperCase() as any }
      : { approvalStatus: 'APPROVED' as any };
    const [data, total] = await this.brandRepo.findAndCount({
      where,
      order: { name: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  // ── Variants ───────────────────────────────────────────────────────────────

  /**
   * Promote `weightVariants` jsonb into addressable rows, and mint the SKUs
   * that nothing generated before.
   *
   * Idempotent. The jsonb column stays populated — it is NOT NULL and other
   * code still reads it — so this widens the model without breaking callers
   * mid-migration.
   */
  async backfillCatalogEntities() {
    const stats = { brands: 0, variants: 0, productSkus: 0, brandsLinked: 0 };

    // 1. Brands from the free-text column.
    const rows: Array<{ brand: string }> = await this.itemRepo
      .createQueryBuilder('i')
      .select('DISTINCT i.brand', 'brand')
      .where('i.brand IS NOT NULL')
      .andWhere(`TRIM(i.brand) <> ''`)
      .getRawMany();

    for (const { brand } of rows) {
      const slug = brand
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      if (!slug) continue;
      let row = await this.brandRepo.findOne({ where: { slug } });
      if (!row) {
        row = await this.brandRepo.save(
          this.brandRepo.create({
            slug,
            name: brand,
            // Approved explicitly: these are products already trading. Leaving
            // them PENDING would pull a live catalogue out of the storefront.
            approvalStatus: 'APPROVED',
            description: 'Imported from existing listings during the brand migration.',
          }),
        );
        stats.brands += 1;
      }
      // `IsNull()`, not `undefined`. TypeORM drops an undefined condition rather
      // than matching NULL, and this silently linked nothing at all — 11 brands
      // and 420 variants created, 0 products pointed at a brand.
      const linked = await this.itemRepo.update({ brand, brandId: IsNull() } as any, {
        brandId: row.id,
      });
      stats.brandsLinked += linked.affected ?? 0;
    }

    // 2. Variants from the jsonb blob.
    const products = await this.itemRepo.find({
      select: ['id', 'name', 'sku', 'weightVariants', 'storeId'],
    });
    for (const product of products) {
      const already = await this.variantRepo.count({ where: { productId: product.id } });

      if (!product.sku) {
        product.sku = `GP-${product.id.slice(0, 8).toUpperCase()}`;
        await this.itemRepo.update({ id: product.id }, { sku: product.sku });
        stats.productSkus += 1;
      }
      if (already > 0) continue;

      const blob = Array.isArray(product.weightVariants) ? product.weightVariants : [];
      for (const [i, v] of blob.entries()) {
        const label = String((v as any)?.weight ?? (v as any)?.label ?? `Variant ${i + 1}`);
        await this.variantRepo.save(
          this.variantRepo.create({
            productId: product.id,
            sku: `${product.sku}-${String(i + 1).padStart(2, '0')}`,
            label,
            price: String(Number((v as any)?.price ?? 0)),
            mrp: String(Number((v as any)?.mrp ?? (v as any)?.price ?? 0)),
            stock: Number((v as any)?.stock ?? 0),
            isDefault: i === 0,
            isAvailable: true,
          }),
        );
        stats.variants += 1;
      }
    }

    // Re-emit every blob so products that predate the variant rows carry their
    // ids too; without this only products touched by a movement would have them.
    await this.dataSource.transaction(async (mgr) => {
      for (const product of products) {
        await this.syncVariantBlob(mgr, product.id);
      }
    });

    return { success: true, ...stats };
  }

  // ── Warehouses ─────────────────────────────────────────────────────────────

  /**
   * Give every store a default location and seat its existing balances there.
   *
   * Stock predates warehouses, so the totals on `grocery_product_variants` have
   * no location behind them. Rather than treat "no warehouse" as a permanent
   * special case in every query, each store gets a STORE_FRONT and its current
   * balance is recorded there — after which the per-location rows and the total
   * agree, and `unallocated` is a real signal rather than the normal state.
   *
   * Idempotent: a store that already has a location is left alone, and a
   * variant that already has rows is not re-seated.
   */
  async backfillWarehouses() {
    const stats = { warehouses: 0, seeded: 0, alreadyPlaced: 0 };

    const stores = await this.storeRepo.find({ select: ['id', 'name'] });
    for (const store of stores) {
      let defaultWh = await this.warehouseRepo.findOne({
        where: { storeId: store.id, isDefault: true },
      });
      if (!defaultWh) {
        defaultWh = await this.warehouseRepo.save(
          this.warehouseRepo.create({
            storeId: store.id,
            name: 'Store front',
            code: 'STORE-FRONT',
            type: 'STORE_FRONT',
            isDefault: true,
            isActive: true,
          }),
        );
        stats.warehouses += 1;
      }

      const variants = await this.variantRepo
        .createQueryBuilder('v')
        .innerJoin(GroceryItem, 'i', 'i.id = v."productId"')
        .where('i."storeId" = :storeId', { storeId: store.id })
        .select(['v.id AS id', 'v.stock AS stock'])
        .getRawMany();

      for (const v of variants) {
        const placed = await this.variantStockRepo.count({ where: { variantId: v.id } });
        if (placed > 0) {
          stats.alreadyPlaced += 1;
          continue;
        }
        await this.variantStockRepo.save(
          this.variantStockRepo.create({
            variantId: v.id,
            warehouseId: defaultWh.id,
            storeId: store.id,
            stock: Number(v.stock) || 0,
            reserved: 0,
          }),
        );
        stats.seeded += 1;
      }
    }

    return { success: true, ...stats };
  }

  /** Locations a store holds stock in. */
  async listWarehouses(storeId: string, includeInactive = false) {
    const id = requireUuid(storeId, 'store');
    const where: any = { storeId: id };
    if (!includeInactive) where.isActive = true;
    const data = await this.warehouseRepo.find({
      where,
      order: { isDefault: 'DESC', name: 'ASC' },
    });
    return { storeId: id, total: data.length, data };
  }

  async createWarehouse(
    storeId: string,
    dto: {
      name?: string;
      code?: string;
      type?: WarehouseType;
      address?: string;
      latitude?: number;
      longitude?: number;
      isDefault?: boolean;
    },
  ) {
    const id = requireUuid(storeId, 'store');
    const name = String(dto?.name ?? '').trim();
    if (!name) throw new BadRequestException('A warehouse name is required.');

    const code = String(dto?.code ?? name)
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .slice(0, 32);
    const clash = await this.warehouseRepo.findOne({ where: { storeId: id, code } });
    if (clash)
      throw new BadRequestException(`A location with code "${code}" already exists in this store.`);

    return this.dataSource.transaction(async (mgr) => {
      const repo = mgr.getRepository(GroceryWarehouse);
      // Only one default: promoting a new one demotes the old, in the same
      // transaction, so a store can never have two or none.
      if (dto?.isDefault) {
        await repo.update({ storeId: id, isDefault: true }, { isDefault: false });
      }
      const existing = await repo.count({ where: { storeId: id } });
      const warehouse = await repo.save(
        repo.create({
          storeId: id,
          name,
          code,
          type: (dto?.type ?? 'WAREHOUSE') as WarehouseType,
          address: dto?.address?.trim() || null,
          latitude: dto?.latitude !== undefined ? String(dto.latitude) : null,
          longitude: dto?.longitude !== undefined ? String(dto.longitude) : null,
          // The first location a store creates is its default whether it says so
          // or not — otherwise movements have nowhere to go.
          isDefault: dto?.isDefault === true || existing === 0,
          isActive: true,
        }),
      );
      return { success: true, warehouse };
    });
  }

  /** The location a movement belongs to when the caller does not name one. */
  private async defaultWarehouse(mgr: EntityManager, storeId: string) {
    const repo = mgr.getRepository(GroceryWarehouse);
    const preferred = await repo.findOne({ where: { storeId, isDefault: true, isActive: true } });
    if (preferred) return preferred;
    const any = await repo.findOne({ where: { storeId, isActive: true } });
    if (any) return any;
    // Every store gets a STORE_FRONT during backfill; a store created since
    // then gets one on first use rather than failing the movement.
    return repo.save(
      repo.create({
        storeId,
        name: 'Store front',
        code: 'STORE-FRONT',
        type: 'STORE_FRONT',
        isDefault: true,
        isActive: true,
      }),
    );
  }

  /**
   * Apply a delta to one location's balance and keep the variant total in step.
   *
   * Both are conditional updates, so neither the per-location figure nor the
   * total can be driven negative by a concurrent movement.
   */
  private async applyLocationDelta(
    mgr: EntityManager,
    variantId: string,
    storeId: string,
    warehouseId: string,
    qty: number,
  ) {
    const repo = mgr.getRepository(GroceryVariantStock);
    let row = await repo.findOne({ where: { variantId, warehouseId } });
    if (!row) {
      row = await repo.save(
        repo.create({ variantId, warehouseId, storeId, stock: 0, reserved: 0 }),
      );
    }

    const res = await repo
      .createQueryBuilder()
      .update(GroceryVariantStock)
      .set({ stock: () => 'stock + :qty' })
      .where('id = :id', { id: row.id })
      .andWhere('stock + :qty >= 0')
      .setParameter('qty', qty)
      .execute();

    if (!res.affected) {
      const wh = await mgr.getRepository(GroceryWarehouse).findOne({ where: { id: warehouseId } });
      throw new BadRequestException(
        `Not enough stock at ${wh?.name ?? 'that location'}: it holds ${row.stock}, cannot move ${qty}.`,
      );
    }
  }

  /**
   * Move stock between two of a seller's own locations.
   *
   * One transaction with two ledger rows — TRANSFER_OUT then TRANSFER_IN — so
   * stock is never briefly in both places or in neither. The variant total is
   * deliberately untouched: the seller still holds the same goods.
   */
  async transferStock(input: {
    variantId: string;
    fromWarehouseId: string;
    toWarehouseId: string;
    quantity: number;
    reason?: string;
    actorId?: string;
  }) {
    const variantId = requireUuid(input?.variantId, 'variant');
    const from = requireUuid(input?.fromWarehouseId, 'source warehouse');
    const to = requireUuid(input?.toWarehouseId, 'destination warehouse');
    const qty = Number(input?.quantity);

    if (from === to)
      throw new BadRequestException('Source and destination must be different locations.');
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new BadRequestException('Transfer quantity must be a positive whole number.');
    }

    return this.dataSource.transaction(async (mgr) => {
      const variant = await mgr
        .getRepository(GroceryProductVariant)
        .findOne({ where: { id: variantId } });
      if (!variant) throw new NotFoundException(`Variant ${variantId} not found`);
      const product = await mgr.getRepository(GroceryItem).findOne({
        where: { id: variant.productId },
        select: ['id', 'storeId'],
      });
      const storeId = product?.storeId as string;

      const repo = mgr.getRepository(GroceryWarehouse);
      const [src, dst] = await Promise.all([
        repo.findOne({ where: { id: from } }),
        repo.findOne({ where: { id: to } }),
      ]);
      if (!src || !dst) throw new NotFoundException('One of those locations does not exist.');
      // Both ends must belong to the store that owns the product, or a transfer
      // becomes a way to push stock into somebody else's warehouse.
      if (src.storeId !== storeId || dst.storeId !== storeId) {
        throw new BadRequestException(
          'Both locations must belong to the store that owns this product.',
        );
      }

      await this.applyLocationDelta(mgr, variantId, storeId, from, -qty);
      await this.applyLocationDelta(mgr, variantId, storeId, to, qty);

      const moveRepo = mgr.getRepository(GroceryStockMovement);
      const out = await moveRepo.save(
        moveRepo.create({
          variantId,
          productId: variant.productId,
          storeId,
          type: 'TRANSFER_OUT',
          quantity: -qty,
          stockAfter: variant.stock,
          warehouseId: from,
          reason: input.reason?.trim() || `Transfer to ${dst.name}`,
          actorId: input.actorId ?? null,
        }),
      );
      const incoming = await moveRepo.save(
        moveRepo.create({
          variantId,
          productId: variant.productId,
          storeId,
          type: 'TRANSFER_IN',
          quantity: qty,
          stockAfter: variant.stock,
          warehouseId: to,
          reason: input.reason?.trim() || `Transfer from ${src.name}`,
          actorId: input.actorId ?? null,
        }),
      );

      return { success: true, movements: [out, incoming], total: variant.stock };
    });
  }

  /** Where a variant's stock actually is. */
  async getVariantStockByLocation(variantId: string) {
    const id = requireUuid(variantId, 'variant');
    const rows = await this.variantStockRepo
      .createQueryBuilder('vs')
      .innerJoin(GroceryWarehouse, 'w', 'w.id = vs."warehouseId"')
      .select([
        'vs."warehouseId" AS "warehouseId"',
        'w.name AS "warehouseName"',
        'w.code AS "warehouseCode"',
        'w.type AS "warehouseType"',
        'vs.stock AS stock',
        'vs.reserved AS reserved',
      ])
      .where('vs."variantId" = :id', { id })
      .orderBy('w.name', 'ASC')
      .getRawMany();

    const variant = await this.variantRepo.findOne({ where: { id } });
    const located = rows.reduce((a, r) => a + Number(r.stock), 0);
    return {
      variantId: id,
      total: variant?.stock ?? 0,
      located,
      /** Non-zero means the per-location rows and the total have drifted. */
      unallocated: (variant?.stock ?? 0) - located,
      locations: rows.map((r) => ({
        ...r,
        stock: Number(r.stock),
        reserved: Number(r.reserved),
        sellable: Number(r.stock) - Number(r.reserved),
      })),
    };
  }

  /**
   * Reconcile a location against a physical count.
   *
   * The difference is written as an ADJUSTED movement with the count on it,
   * rather than the balance being overwritten — an audit that leaves no trace
   * of what it corrected is not an audit.
   */
  async auditWarehouseStock(input: {
    warehouseId: string;
    counts: Array<{ variantId: string; countedQuantity: number }>;
    actorId?: string;
    reason?: string;
  }) {
    const warehouseId = requireUuid(input?.warehouseId, 'warehouse');
    const counts = Array.isArray(input?.counts) ? input.counts : [];
    if (!counts.length)
      throw new BadRequestException('An audit needs at least one counted variant.');

    const warehouse = await this.warehouseRepo.findOne({ where: { id: warehouseId } });
    if (!warehouse) throw new NotFoundException(`Warehouse ${warehouseId} not found`);

    const adjustments: any[] = [];
    for (const entry of counts) {
      const variantId = requireUuid(entry?.variantId, 'variant');
      const counted = Number(entry?.countedQuantity);
      if (!Number.isInteger(counted) || counted < 0) {
        throw new BadRequestException(`Counted quantity for ${variantId} must be zero or more.`);
      }

      const row = await this.variantStockRepo.findOne({ where: { variantId, warehouseId } });
      const onRecord = row?.stock ?? 0;
      const delta = counted - onRecord;
      if (delta === 0) continue;

      const movement = await this.recordStockMovement({
        variantId,
        type: 'ADJUSTED',
        quantity: delta,
        warehouseId,
        actorId: input.actorId,
        reason:
          input.reason?.trim() ||
          `Stock audit at ${warehouse.name}: counted ${counted}, system had ${onRecord}`,
      });
      adjustments.push({ variantId, onRecord, counted, delta, stock: movement.stock });
    }

    return {
      success: true,
      warehouseId,
      counted: counts.length,
      adjusted: adjustments.length,
      /** Empty means the count matched the system exactly. */
      adjustments,
    };
  }

  // ── Inventory ──────────────────────────────────────────────────────────────

  /**
   * Move stock, atomically, and record why.
   *
   * The old path read the jsonb blob, changed a number and wrote the whole
   * array back — so two concurrent movements lost one of the writes, and
   * nothing said what had happened. The balance changes with a single
   * conditional UPDATE and the ledger row is written in the same transaction:
   * either both land or neither does.
   *
   * A movement that would take stock below zero is refused rather than clamped.
   * Overselling is a real event, and hiding it behind `Math.max(0, ...)` turns
   * "we owe a customer an item we do not have" into a silent zero.
   */
  async recordStockMovement(input: {
    variantId: string;
    type: StockMovementType;
    quantity: number;
    batchNumber?: string;
    expiryDate?: string;
    reason?: string;
    actorId?: string;
    orderId?: string;
    /** Where it moved. Falls back to the store's default location. */
    warehouseId?: string;
  }) {
    const variantId = requireUuid(input?.variantId, 'variant');
    const qty = Number(input?.quantity);
    if (!Number.isInteger(qty) || qty === 0) {
      throw new BadRequestException('Quantity must be a non-zero whole number.');
    }

    return this.dataSource.transaction(async (mgr) => {
      const variantRepo = mgr.getRepository(GroceryProductVariant);
      const variant = await variantRepo.findOne({ where: { id: variantId } });
      if (!variant) throw new NotFoundException(`Variant ${variantId} not found`);

      const product = await mgr.getRepository(GroceryItem).findOne({
        where: { id: variant.productId },
        select: ['id', 'storeId'],
      });

      // Conditional update: the non-negative guard is evaluated by the database,
      // so a concurrent movement cannot slip between the check and the write.
      const result = await variantRepo
        .createQueryBuilder()
        .update(GroceryProductVariant)
        .set({ stock: () => 'stock + :qty' })
        .where('id = :id', { id: variantId })
        .andWhere('stock + :qty >= 0')
        .setParameter('qty', qty)
        .execute();

      if (!result.affected) {
        throw new BadRequestException(
          `Not enough stock: ${variant.label} has ${variant.stock}, cannot move ${qty}.`,
        );
      }

      // Keep the per-location breakdown in step with the total, in the same
      // transaction — otherwise a movement could succeed while leaving the
      // locations saying something different.
      const warehouse = input.warehouseId
        ? await mgr.getRepository(GroceryWarehouse).findOne({ where: { id: input.warehouseId } })
        : await this.defaultWarehouse(mgr, product?.storeId as string);
      if (!warehouse) throw new NotFoundException('That location does not exist.');
      if (warehouse.storeId !== product?.storeId) {
        throw new BadRequestException('That location belongs to a different store.');
      }
      await this.applyLocationDelta(mgr, variantId, product?.storeId as string, warehouse.id, qty);

      const after = await variantRepo.findOne({ where: { id: variantId } });
      const movement = await mgr.getRepository(GroceryStockMovement).save(
        mgr.getRepository(GroceryStockMovement).create({
          variantId,
          productId: variant.productId,
          storeId: product?.storeId as string,
          type: input.type,
          quantity: qty,
          stockAfter: after?.stock ?? 0,
          batchNumber: input.batchNumber?.trim() || null,
          expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
          reason: input.reason?.trim() || null,
          actorId: input.actorId ?? null,
          orderId: input.orderId ?? null,
          warehouseId: warehouse.id,
        }),
      );

      // The jsonb blob is still the shape older callers read, so it is kept in
      // step with the rows rather than left to drift.
      await this.syncVariantBlob(mgr, variant.productId);

      if ((after?.stock ?? 0) <= (variant.lowStockThreshold ?? 5)) {
        await this.kafka
          .publish('grocery.inventory.low_stock', {
            variantId,
            productId: variant.productId,
            sku: variant.sku,
            stock: after?.stock ?? 0,
            threshold: variant.lowStockThreshold,
          })
          .catch(() => undefined);
      }

      return { success: true, movement, stock: after?.stock ?? 0 };
    });
  }

  /** Mirror variant rows back into the legacy jsonb column. */
  private async syncVariantBlob(mgr: EntityManager, productId: string) {
    const variants = await mgr.getRepository(GroceryProductVariant).find({
      where: { productId },
      order: { isDefault: 'DESC', label: 'ASC' },
    });
    if (!variants.length) return;
    await mgr.getRepository(GroceryItem).update(
      { id: productId },
      {
        // `variantId` and `sku` ride along so a caller reading the blob can
        // address the row behind it — without them the seller portal can see a
        // stock number but has no way to name what to move.
        weightVariants: variants.map((v) => ({
          variantId: v.id,
          sku: v.sku,
          weight: v.label,
          price: Number(v.price),
          mrp: Number(v.mrp),
          stock: v.stock,
        })) as any,
      },
    );
  }

  /**
   * Variants at or below their own threshold.
   *
   * The previous version loaded every product in the store, parsed each jsonb
   * blob in JavaScript and compared against one global number — so it ignored
   * the per-variant thresholds entirely and did work proportional to the whole
   * catalogue on every call.
   */
  async getLowStockVariants(storeId: string, threshold?: number) {
    const id = requireUuid(storeId, 'store');
    const qb = this.variantRepo
      .createQueryBuilder('v')
      .innerJoin(GroceryItem, 'i', 'i.id = v."productId"')
      .select([
        'v.id AS "variantId"',
        'v.sku AS sku',
        'v.label AS label',
        'v.stock AS stock',
        'v."lowStockThreshold" AS threshold',
        'i.id AS "productId"',
        'i.name AS "productName"',
        'i.category AS category',
      ])
      .where('i."storeId" = :storeId', { storeId: id })
      .andWhere('v."isAvailable" = true');

    // An explicit threshold overrides each variant's own, for
    // "show me everything under 20" style questions.
    if (threshold !== undefined && Number.isFinite(Number(threshold))) {
      qb.andWhere('v.stock <= :threshold', { threshold: Number(threshold) });
    } else {
      qb.andWhere('v.stock <= v."lowStockThreshold"');
    }

    const rows = await qb.orderBy('v.stock', 'ASC').addOrderBy('i.name', 'ASC').getRawMany();
    return {
      storeId: id,
      threshold: threshold ?? null,
      total: rows.length,
      items: rows.map((r) => ({ ...r, stock: Number(r.stock), threshold: Number(r.threshold) })),
    };
  }

  /** Movement history for one variant — the batch trail. */
  async getStockHistory(variantId: string, page = 1, limit = 50) {
    const id = requireUuid(variantId, 'variant');
    ({ page, limit } = paginate(page, limit, 50));
    const [data, total] = await this.movementRepo.findAndCount({
      where: { variantId: id },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { variantId: id, data, total, page, limit };
  }

  /**
   * Write off damaged or expired stock.
   *
   * A distinct entry point rather than a negative adjustment, because the
   * reason is the point: shrinkage from breakage and shrinkage from expiry are
   * different problems, and a seller reporting either needs it on the record.
   */
  async writeOffStock(input: {
    variantId: string;
    quantity: number;
    type: 'DAMAGED' | 'EXPIRED';
    reason?: string;
    batchNumber?: string;
    actorId?: string;
  }) {
    const qty = Math.abs(Number(input?.quantity));
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new BadRequestException('Write-off quantity must be a positive whole number.');
    }
    if (input.type !== 'DAMAGED' && input.type !== 'EXPIRED') {
      throw new BadRequestException('A write-off must be DAMAGED or EXPIRED.');
    }
    return this.recordStockMovement({ ...input, quantity: -qty });
  }

  // ── Products ────────────────────────────────────────────────────────────────

  /**
   * `storeId` is optional so the admin console can list the whole catalogue.
   *
   * It used to be required, and the admin command sends only `{ page, category }` —
   * so the query filtered on `storeId = undefined` and the Products screen showed
   * nothing while the database held 128 items.
   */
  async getProducts(
    storeId?: string,
    category?: string,
    page = 1,
    limit = 30,
    regionCode?: string,
    /**
     * The seller portal and the customer storefront call this same method
     * through the same public route. A store's owner has to see their own
     * pending listings — that is the whole point of a moderation queue — while
     * a shopper must not. Resolved by the caller, not by the route.
     */
    actor?: { id?: string; role?: string },
    /**
     * Narrow to one moderation state. Only meaningful for a caller allowed to
     * see unapproved rows — a shopper asking for PENDING still gets nothing,
     * because the approved-only filter is applied regardless.
     */
    approvalStatus?: string,
  ) {
    ({ page, limit } = paginate(page, limit, 30));
    // `limit` belongs in the key: without it page 1 at 30 per page and page 1 at 12
    // per page shared an entry, so whichever loaded first decided what the other saw.
    // `regionCode` belongs in it for the same reason across markets — without it
    // whichever country asked first would decide what every other country saw.
    // Whether unapproved rows are included changes the result set, so it has to
    // be part of the key — otherwise the owner's view of their own pending items
    // would be served to the next shopper who asked for the same page.
    const privileged = await this.maySeeUnapproved(storeId, actor);
    const cacheKey = `grocery:products:${regionCode ?? 'all'}:${storeId ?? 'all'}:${category ?? 'all'}:${page}:${limit}:${privileged ? 'all' : 'approved'}:${approvalStatus ?? 'any'}`;
    const cached = await this.redis.getJson(cacheKey);
    if (cached) return cached;

    // No try/catch around the query on purpose. This used to swallow the error,
    // return `{ data: [], total: 0 }` **and cache it** — so one transient database
    // failure served an empty catalogue for the whole TTL, and the screen showed
    // "no products" rather than an error. A failure here must reach the caller.
    const qb = this.itemRepo
      .createQueryBuilder('item')
      .where('item.isAvailable = :avail', { avail: true });

    // Moderation gate. `isAvailable` is the seller's stock switch; this is the
    // platform's decision about whether the listing may be shown at all.
    if (!privileged) {
      qb.andWhere('item.approvalStatus = :approved', { approved: 'APPROVED' });
    } else if (approvalStatus) {
      // A moderator narrowing the queue, e.g. "show me only what is waiting".
      qb.andWhere('item.approvalStatus = :moderation', {
        moderation: String(approvalStatus).toUpperCase(),
      });
    }

    if (storeId) {
      qb.andWhere('item.storeId = :storeId', { storeId });
    }
    if (category) {
      qb.andWhere('item.category = :category', { category });
    }

    /**
     * Scope to the caller's market.
     *
     * Without this the route answered with the platform's entire catalogue — 224
     * rows for a Qatari shopper whose own shops stock 112 — so browsing any
     * category mixed in products from India, the UAE and Saudi Arabia that the
     * shopper cannot buy. Only shops that are approved and online count, matching
     * how `getStores` decides what exists in a market.
     */
    if (regionCode) {
      qb.innerJoin(GroceryStore, 'rs', 'rs.id = item."storeId"').andWhere(
        'rs.region_code = :regionCode',
        {
          regionCode,
        },
      );
      // The storefront only ever shows approved, online shops — a shopper
      // browsing a market should not see a suspended store's catalogue. A
      // moderator scoped to the same market needs the opposite: every store in
      // that market, whatever its status, because that is what "products in my
      // market" means on the admin moderation screen.
      if (!privileged) {
        qb.andWhere("rs.status = 'APPROVED'").andWhere('rs."isOnline" = true');
      }
    }

    const [data, total] = await qb
      .orderBy('item.isPromoted', 'DESC')
      .addOrderBy('item.rating', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    /**
     * Which shop each product is sold by.
     *
     * The row carries only `storeId`, so every screen listing products across
     * shops — the category pages, "All Groceries" — labelled all of them
     * "KARTSEEK Store", a shop that does not exist, and that invented name even
     * leaked into the product URL slug. Batched for the page rather than joined,
     * so `getManyAndCount` keeps returning entities.
     */
    const storeIds = [...new Set(data.map((i) => i.storeId).filter(Boolean))];
    const names = new Map<string, string>();
    if (storeIds.length) {
      const rows = await this.storeRepo.find({
        where: { id: In(storeIds) },
        select: ['id', 'name'],
      });
      rows.forEach((r) => {
        if (r.name) names.set(r.id, r.name);
      });
    }
    const withStore = data.map((i) =>
      Object.assign(i, { storeName: names.get(i.storeId) ?? null }),
    );

    const result = {
      storeId: storeId ?? null,
      category,
      regionCode: regionCode ?? null,
      data: withStore,
      total,
      page,
      limit,
    };
    await this.redis.setJson(cacheKey, result, CACHE_TTL.PRODUCTS);
    return result;
  }

  /**
   * Brands that actually have products, with a count and a representative image.
   *
   * "Shop by Brand" on the homepage was rendering a hardcoded regional list —
   * Almarai, NADEC, LuLu, Carrefour, Nestlé — while `grocery_items.brand` holds
   * an entirely different set (Brookside, Cadbury, Nescafe, Tropicana…). The two
   * had *zero* overlap, so every brand avatar led to a search with no results.
   *
   * Brand is a free-text column rather than an entity, so this derives the list
   * from the catalogue itself: a brand exists here because something is on sale
   * under it, which is the only definition that cannot go stale.
   *
   * Scoped by region when one is given, so a market's row shows brands its own
   * shops carry.
   */
  async getBrands(regionCode?: string, limit = 40) {
    const cacheKey = `grocery:brands:${regionCode ?? 'all'}:${limit}`;
    const cached = await this.redis.getJson(cacheKey);
    if (cached) return cached;

    const qb = this.itemRepo
      .createQueryBuilder('i')
      .select('i.brand', 'brand')
      .addSelect('COUNT(*)::int', 'productCount')
      .addSelect('MIN(i."imageUrl")', 'imageUrl')
      .innerJoin(GroceryStore, 's', 's.id = i."storeId"')
      .where('i.brand IS NOT NULL')
      .andWhere("TRIM(i.brand) <> ''")
      .andWhere('i."isAvailable" = true')
      .andWhere(`i."approvalStatus" = 'APPROVED'`)
      .andWhere("s.status = 'APPROVED'")
      .andWhere('s."isOnline" = true')
      .groupBy('i.brand')
      .orderBy('COUNT(*)', 'DESC')
      .addOrderBy('i.brand', 'ASC')
      .limit(Math.min(100, Math.max(1, Number(limit) || 40)));

    if (regionCode) qb.andWhere('s.region_code = :regionCode', { regionCode });

    const rows = await qb.getRawMany<{
      brand: string;
      productCount: number;
      imageUrl: string | null;
    }>();

    const brands = rows.map((r) => ({
      // A slug the storefront can put in a URL and this service can resolve back.
      id: slugify(r.brand),
      name: r.brand,
      productCount: Number(r.productCount),
      imageUrl: r.imageUrl ?? null,
    }));

    const result = { regionCode: regionCode ?? null, brands, total: brands.length };
    await this.redis.setJson(cacheKey, result, CACHE_TTL.PRODUCTS);
    return result;
  }

  /**
   * Every product sold under one brand.
   *
   * Matched case-insensitively on the exact brand string rather than a LIKE, so
   * "Fage" does not also return "Fage Total" from another supplier.
   */
  async getProductsByBrand(brandSlug: string, regionCode?: string, page = 1, limit = 30) {
    ({ page, limit } = paginate(page, limit, 30));
    const wanted = String(brandSlug ?? '').trim();
    if (!wanted) return { brand: null, data: [], total: 0, page, limit };

    /**
     * Resolve the slug to the exact brand string first.
     *
     * Slugifying inside SQL would need `unaccent`, which is an extension this
     * database is not guaranteed to have — and a brand like "Nestlé" has to fold
     * to `nestle` for the URL to round-trip. Doing it here keeps the match exact
     * and the query portable; the brand list is small and cached.
     */
    const known = (await this.getBrands(regionCode, 100)) as {
      brands: { id: string; name: string }[];
    };
    const match = known.brands.find((b) => b.id === slugify(wanted));
    if (!match) return { brand: null, data: [], total: 0, page, limit };

    const qb = this.itemRepo
      .createQueryBuilder('i')
      .innerJoin(GroceryStore, 's', 's.id = i."storeId"')
      .where('i."isAvailable" = true')
      .andWhere("s.status = 'APPROVED'")
      .andWhere('s."isOnline" = true')
      .andWhere('i.brand = :brand', { brand: match.name });

    if (regionCode) qb.andWhere('s.region_code = :regionCode', { regionCode });

    const [data, total] = await qb
      .orderBy('i.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { brand: match.name, data, total, page, limit };
  }

  async getProductById(storeId: string, productId: string) {
    /**
     * The cache key is deliberately store-less: four call sites invalidate by
     * `grocery:product:<id>` alone (product update, delete, stock change, bulk
     * import) and none of them has a storeId to hand.
     *
     * That made the read unsound. The *query* is scoped to the store but the
     * *key* was not, so once any caller warmed the entry, the same request
     * answered 404 on a cold cache and 200 on a warm one — a product could be
     * fetched through a store that does not sell it. Verified against a running
     * instance before this guard existed.
     *
     * Re-checking the store on the way out keeps one key (so every invalidation
     * site stays correct) and restores the scoping the query always intended.
     */
    const cacheKey = `grocery:product:${productId}`;
    const cached = await this.redis.getJson<GroceryItem>(cacheKey);
    if (cached) {
      if (cached.storeId !== storeId) {
        throw new NotFoundException(`Product ${productId} not found in store ${storeId}`);
      }
      return cached;
    }

    // A missing product is a 404, not a placeholder. This used to answer 200 with
    // `{ name: 'Product', price: 0 }`, so a mistyped or deleted id rendered a real
    // product page for an item priced at zero that could be added to a basket.
    const product = await this.itemRepo.findOne({
      where: { id: productId, storeId },
    });
    if (!product) throw new NotFoundException(`Product ${productId} not found in store ${storeId}`);

    await this.redis.setJson(cacheKey, product, CACHE_TTL.PRODUCTS);
    return product;
  }

  /**
   * Looks a product up by id alone, without knowing which store sells it.
   *
   * `/grocery/product/[id]` is reached from search results, wishlists, order
   * history and shared links, none of which carry a store id — and the only
   * lookup available took `(storeId, productId)`. The page worked around it by
   * calling `searchProducts(productId)` and reading `res.data[0]`, a key that
   * response does not have (`results`), so the API result was discarded on every
   * load and the page rendered a placeholder derived from the URL slug.
   *
   * The store is returned alongside, because the page needs its name and the
   * basket needs its id.
   */
  async getProductByIdAnyStore(productId: string) {
    const product = await this.itemRepo.findOne({
      where: { id: productId },
      relations: ['store'],
    });
    if (!product) throw new NotFoundException(`Product ${productId} not found`);

    const { store, ...rest } = product as GroceryItem & { store?: GroceryStore };
    return {
      ...rest,
      storeName: store?.name ?? null,
      storeSlug: store?.slug ?? null,
      storeIsOnline: store?.isOnline ?? false,
      storeDeliveryFee: store ? Number(store.deliveryFee) : null,
      storeMinOrderAmount: store ? Number(store.minOrderAmount) : null,
    };
  }

  // ── Search ──────────────────────────────────────────────────────────────────

  /**
   * Full-text product search using PostgreSQL tsvector/tsquery.
   * Falls back to ILIKE pattern matching if tsvector column is not populated.
   */
  async searchProducts(query: string, storeId?: string, categoryId?: string, page = 1, limit = 30) {
    ({ page, limit } = paginate(page, limit, 30));
    try {
      const qb = this.itemRepo
        .createQueryBuilder('item')
        .where('item.isAvailable = :avail', { avail: true })
        // Search has no seller view — it is the shopper's entry point — so it is
        // always restricted to approved listings. A product created a second ago
        // was previously findable here immediately.
        .andWhere('item.approvalStatus = :approved', { approved: 'APPROVED' });

      if (storeId) {
        qb.andWhere('item.storeId = :storeId', { storeId });
      }
      if (categoryId) {
        qb.andWhere('item.category = :categoryId', { categoryId });
      }

      // Try tsvector search first, fall back to ILIKE
      qb.andWhere(
        '(item.name ILIKE :pattern OR item.description ILIKE :pattern OR item.brand ILIKE :pattern)',
        { pattern: `%${query}%` },
      );

      const [results, total] = await qb
        .orderBy('item.isPromoted', 'DESC')
        .addOrderBy('item.rating', 'DESC')
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();

      return { query, storeId, categoryId, results, total, page, limit };
    } catch (err: any) {
      // An empty result set and a failed query are different answers: the first
      // means "nothing matches", the second means "we could not look". Collapsing
      // them showed "No products found for X" during an outage.
      this.logger.error(`searchProducts failed for "${query}": ${err.message}`);
      throw err;
    }
  }

  // ── Orders ──────────────────────────────────────────────────────────────────

  /**
   * Generates the next order number.
   *
   * `GRO-<count + 1001>` derived from `orderRepo.count()` is not safe: two orders
   * placed in the same instant both read the same count, build the same number and
   * the second one violates the UNIQUE constraint on `orderNumber` with a 500. The
   * counter is kept — it is what appears on invoices — but the caller retries on a
   * unique violation, so a collision costs one extra round trip instead of the order.
   */
  private async nextOrderNumber(): Promise<string> {
    const count = await this.orderRepo.count();
    return `GRO-${String(count + 1001).padStart(4, '0')}`;
  }

  /**
   * Places a grocery order.
   *
   * Prices are taken from the catalogue, never from the request. The client used to
   * supply `price` per line and the total was computed straight from it, so any
   * caller could post `price: 1` and have the order — and the seller's payout and the
   * commission event that follows delivery — settle at that figure. The request now
   * only chooses *what* and *how much*; what it costs is resolved here against the
   * matching weight variant, with an approved, running flash deal taking precedence.
   *
   * Order row, stock decrement and the store's order counter go in one transaction:
   * a stock update that failed after the insert used to leave an order nobody could
   * fulfil, and the whole thing sat behind a catch that returned a Redis-only order
   * with `success: true` — the customer saw a confirmation for an order the seller
   * would never receive.
   */
  async createGroceryOrder(dto: CreateGroceryOrderDto) {
    // 0. The ids have to be uuid-shaped before they reach a uuid column.
    //    Postgres rejects a malformed one with `invalid input syntax for type
    //    uuid`, which surfaced as a 500 carrying that text — the wrong status
    //    for a bad request, and a needless disclosure of the storage type.
    const storeId = requireUuid(dto.storeId, 'store');
    for (const line of dto.items ?? []) {
      requireUuid(line.productId, 'product');
    }

    // 1. Store must exist, be approved and be open.
    const store = await this.storeRepo.findOne({ where: { id: storeId } });
    if (!store) throw new NotFoundException(`Store ${dto.storeId} not found`);
    if (store.status !== 'APPROVED')
      throw new BadRequestException(`Store ${store.name} is not accepting orders`);
    if (!store.isOnline) throw new BadRequestException(`Store ${store.name} is currently offline`);
    if (!dto.items?.length) throw new BadRequestException('An order needs at least one item');

    // 2. Load the catalogue rows for this order, scoped to the store so a product
    //    id from a different store cannot be smuggled in.
    const productIds = [...new Set(dto.items.map((i) => i.productId))];
    const products = await this.itemRepo.find({
      where: { id: In(productIds), storeId: dto.storeId },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    // 3. Active flash deals for this store, keyed by product.
    const now = new Date();
    const liveDeals = await this.flashDealRepo.find({
      where: { storeId: dto.storeId, status: FlashDealStatus.ACTIVE },
    });
    const dealByProduct = new Map(
      liveDeals
        .filter(
          (d) =>
            new Date(d.startTime) <= now && new Date(d.endTime) > now && d.soldCount < d.stockLimit,
        )
        .map((d) => [d.productId, d]),
    );

    // 4. Re-price every line and check stock.
    const pricedItems: Array<{
      productId: string;
      name: string;
      weight: string;
      price: number;
      quantity: number;
      preparationNote?: string;
      flashDealId?: string;
    }> = [];

    for (const line of dto.items) {
      const product = byId.get(line.productId);
      if (!product)
        throw new BadRequestException(`Product ${line.productId} is not sold by this store`);
      if (!product.isAvailable)
        throw new BadRequestException(`${product.name} is currently unavailable`);
      if (!Number.isInteger(line.quantity) || line.quantity < 1) {
        throw new BadRequestException(`Invalid quantity for ${product.name}`);
      }

      const variants = (product.weightVariants as any[]) ?? [];
      const variant = variants.find((v) => v.weight === line.weight);
      if (!variant) {
        throw new BadRequestException(
          `${product.name} is not sold in "${line.weight}". Available: ${variants.map((v) => v.weight).join(', ') || 'none'}`,
        );
      }
      if (Number(variant.stock ?? 0) < line.quantity) {
        throw new BadRequestException(
          `Only ${variant.stock ?? 0} × ${line.weight} left of ${product.name}`,
        );
      }

      const deal = dealByProduct.get(product.id);
      const unitPrice = deal ? Number(deal.flashPrice) : Number(variant.price);
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        throw new BadRequestException(`${product.name} has no valid price for "${line.weight}"`);
      }

      pricedItems.push({
        productId: product.id,
        // The column is `nullable: true, default: ''` — applying its own
        // default is not inventing data.
        name: product.name ?? '',
        weight: line.weight,
        price: unitPrice,
        quantity: line.quantity,
        ...(line.preparationNote ? { preparationNote: line.preparationNote } : {}),
        ...(deal ? { flashDealId: deal.id } : {}),
      });
    }

    // 5. Totals, all server-side.
    const round2 = (n: number) => Math.round(n * 100) / 100;
    const itemTotal = round2(pricedItems.reduce((sum, i) => sum + i.price * i.quantity, 0));
    if (itemTotal < Number(store.minOrderAmount)) {
      throw new BadRequestException(`Minimum order amount is ${store.minOrderAmount}`);
    }
    const deliveryFee = round2(Number(store.deliveryFee) || 0);
    const grandTotal = round2(itemTotal + deliveryFee);

    /*
     * The tax already inside that total.
     *
     * Every market's rate is inclusive, so `grandTotal` is what the customer
     * pays either way — this records what portion of it is tax so a receipt can
     * state it. Inclusive tax is `total x rate / (100 + rate)`, not
     * `total x rate`: at 15% VAT a SAR 115 order carries SAR 15 of tax, not
     * SAR 17.25.
     *
     * The rate comes from the shop's own market, not the caller's headers — a
     * shopper browsing from abroad still buys under the shop's tax regime.
     */
    const region = getRegionConfig(store.regionCode ?? '');
    const taxRate = Number(region?.tax?.rate ?? 0);
    const taxName = region?.tax?.name ?? null;
    const taxAmount = taxRate > 0 ? round2((grandTotal * taxRate) / (100 + taxRate)) : 0;

    // 6. Delivery slot for scheduled orders.
    let deliverySlot: { date: string; startTime: string; endTime: string } | null = null;
    let scheduledAt: Date | null = null;
    if (dto.scheduledAt) {
      const dt = new Date(dto.scheduledAt);
      if (Number.isNaN(dt.getTime()))
        throw new BadRequestException('scheduledAt is not a valid date');
      if (dt.getTime() < Date.now()) throw new BadRequestException('scheduledAt is in the past');
      scheduledAt = dt;
      deliverySlot = {
        date: dt.toISOString().split('T')[0],
        startTime: dt.toTimeString().slice(0, 5),
        endTime: new Date(dt.getTime() + 2 * 60 * 60 * 1000).toTimeString().slice(0, 5), // +2 hours
      };
    }

    // 7. Persist order + stock + counters atomically, retrying only the order
    //    number if two customers collided on it.
    let saved: GroceryOrder | undefined;
    for (let attempt = 0; attempt < 5 && !saved; attempt++) {
      const orderNumber = await this.nextOrderNumber();
      try {
        saved = await this.orderRepo.manager.transaction(async (mgr) => {
          const order = mgr.create(GroceryOrder, {
            orderNumber,
            customerId: dto.customerId,
            storeId: dto.storeId,
            items: pricedItems,
            itemTotal,
            deliveryFee,
            discount: 0,
            grandTotal,
            taxAmount,
            taxRate,
            taxName,
            paymentMethod: dto.paymentMethod,
            status: GroceryOrderStatus.PLACED,
            deliveryAddress: dto.deliveryAddress,
            deliverySlot,
            estimatedDeliveryAt: scheduledAt ?? new Date(Date.now() + 45 * 60 * 1000), // default 45 min
          });
          const row = await mgr.save(order);

          // Draw down the variant stock we validated above.
          for (const line of pricedItems) {
            const product = byId.get(line.productId)!;
            const variants = (product.weightVariants as any[]).map((v) =>
              v.weight === line.weight
                ? { ...v, stock: Math.max(0, Number(v.stock ?? 0) - line.quantity) }
                : v,
            );
            await mgr.update(
              GroceryItem,
              { id: line.productId },
              { weightVariants: variants as any },
            );
            product.weightVariants = variants as any;
          }

          await mgr.increment(GroceryStore, { id: dto.storeId }, 'totalOrders', 1);
          return row;
        });
      } catch (err: any) {
        // 23505 = unique_violation on `orderNumber`; anything else is a real failure.
        if (err?.code === '23505' && attempt < 4) continue;
        this.logger.error(`createGroceryOrder failed for store ${dto.storeId}: ${err.message}`);
        throw err;
      }
    }
    if (!saved) throw new BadRequestException('Could not allocate an order number, please retry');

    // 8. Flash-deal counters, cache, events.
    for (const line of pricedItems) {
      if (line.flashDealId) await this.decrementFlashDealStock(line.flashDealId, line.quantity);
    }
    await this.invalidateProductCache(dto.storeId);
    await this.redis.setJson(`grocery:order:${saved.id}`, saved, CACHE_TTL.ORDER);

    await this.kafka.publish('grocery.order.created', {
      id: saved.id,
      orderNumber: saved.orderNumber,
      storeId: dto.storeId,
      storeName: store.name ?? '',
      customerId: dto.customerId,
      grandTotal,
      itemCount: pricedItems.length,
    });

    // Notify seller
    await this.kafka.publish('notification.push', {
      userId: store.ownerId,
      title: 'New Grocery Order 🛒',
      body: `Order ${saved.orderNumber} — ${pricedItems.length} items, total ${grandTotal}`,
      data: { type: 'grocery_order', orderId: saved.id },
    });

    this.logger.log(`Order ${saved.orderNumber} created for store ${store.name}`);
    return { success: true, order: saved };
  }

  /** Roles that may read or act on any order (support, moderation, back-office). */
  private static readonly ADMIN_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'FRANCHISE_ADMIN']);

  /**
   * The caller must own the store a flash deal belongs to.
   *
   * Flash deals are addressed by *deal* id, so `GroceryStoreOwnershipGuard` —
   * which resolves `:storeId` / `:id` as a store — cannot cover them: it would
   * look up a store whose id is a deal id and deny everyone. The check
   * therefore lives here, where the deal's `storeId` is known.
   *
   * Without it, `submit`, `pause` and `resume` took nothing but a deal id and
   * mutated it, so any signed-in account could pause a competitor's live
   * promotion or push their draft into the approval queue. `create` was worse:
   * it read `storeId` straight from the request body, so a deal discounting
   * another store's product could be created outright.
   *
   * Fails closed: no actor, unknown store, or a store with no owner all deny.
   */

  /**
   * May this caller see listings that have not been approved?
   *
   * Only the store's own owner and platform moderators. Everyone else — every
   * shopper, and every other seller — sees the approved catalogue.
   */

  /**
   * Approve a listing so customers can see it.
   *
   * Moderation is a platform decision, so this takes no store owner — the
   * gateway restricts it to ADMIN / SUPER_ADMIN.
   */
  async setProductApproval(
    productId: string,
    status: 'APPROVED' | 'REJECTED',
    reason?: string,
    actor?: { actorId?: string; actorRole?: string; actorIp?: string },
  ) {
    if (!productId) throw new BadRequestException('A product id is required.');
    const product = await this.itemRepo.findOne({ where: { id: productId } });
    if (!product) throw new NotFoundException(`Product ${productId} not found`);

    // Captured before the write: the audit trail has to say what the listing was,
    // not only what it became.
    const previous = {
      approvalStatus: product.approvalStatus,
      rejectionReason: product.rejectionReason ?? null,
    };

    product.approvalStatus = status;
    product.rejectionReason = status === 'REJECTED' ? (reason ?? null) : null;
    const saved = await this.itemRepo.save(product);

    // The catalogue caches by store and category; a moderation decision changes
    // what a shopper may see, so those entries have to go.
    await this.invalidateProductCache(product.storeId).catch(() => undefined);

    await this.kafka.publish(`grocery.product.${status.toLowerCase()}`, {
      productId,
      storeId: product.storeId,
      status,
      reason: reason ?? null,
      actorId: actor?.actorId ?? null,
      previousStatus: previous.approvalStatus,
      decidedAt: new Date().toISOString(),
    });

    // Moderation is an administrative act, so it belongs in the audit trail with
    // the actor and both states. Best-effort: a broker problem must not undo a
    // decision that is already committed.
    const store = await this.storeRepo
      .findOne({ where: { id: product.storeId }, select: { id: true, regionCode: true } })
      .catch(() => null);

    await this.kafka
      .publish('audit.log', {
        actionType: `grocery.product.${status.toLowerCase()}`,
        actorId: actor?.actorId ?? 'unknown',
        actorRole: actor?.actorRole,
        actorIp: actor?.actorIp,
        entityType: 'GroceryItem',
        entityId: productId,
        oldValue: previous,
        newValue: { approvalStatus: status, rejectionReason: saved.rejectionReason ?? null },
        reason: reason ?? undefined,
        metadata: { storeId: product.storeId, productName: saved.name },
        country: store?.regionCode ?? 'UNKNOWN',
        service: 'grocery-service',
      })
      .catch((err) =>
        this.logger.warn(
          `audit publish failed for product ${productId}: ${(err as Error)?.message}`,
        ),
      );

    return { success: true, product: saved };
  }

  /** Listings awaiting a moderation decision, newest first. */
  async getPendingProducts(page = 1, limit = 30, storeId?: string) {
    ({ page, limit } = paginate(page, limit, 30));
    const qb = this.itemRepo
      .createQueryBuilder('item')
      .where('item.approvalStatus = :status', { status: 'PENDING' });
    if (storeId) qb.andWhere('item.storeId = :storeId', { storeId });

    const [data, total] = await qb
      .orderBy('item.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  private async maySeeUnapproved(
    storeId: string | undefined,
    actor?: { id?: string; role?: string },
  ): Promise<boolean> {
    if (GroceryService.ADMIN_ROLES.has(String(actor?.role ?? '').toUpperCase())) return true;
    if (!actor?.id || !storeId) return false;
    const store = await this.storeRepo.findOne({
      where: { id: storeId },
      select: ['id', 'ownerId'],
    });
    return !!store?.ownerId && store.ownerId === actor.id;
  }

  private async assertStoreActor(
    storeId: string | null | undefined,
    actor?: { id?: string; role?: string },
  ): Promise<void> {
    if (GroceryService.ADMIN_ROLES.has(String(actor?.role ?? '').toUpperCase())) return;
    if (!actor?.id) {
      throw new ForbiddenException('You must be signed in to manage this store.');
    }
    if (!storeId) {
      throw new ForbiddenException('You do not have access to this store.');
    }
    const store = await this.storeRepo.findOne({
      where: { id: storeId },
      select: ['id', 'ownerId'],
    });
    if (!store?.ownerId || store.ownerId !== actor.id) {
      throw new ForbiddenException('You do not have access to this store.');
    }
  }

  /**
   * Confirms the requester may see this order.
   *
   * Order ids are UUIDs, but "hard to guess" is not an authorisation model: the
   * order and tracking endpoints returned the full row — delivery address, phone
   * area, items, total — to anyone who presented an id. A requester is allowed if
   * they placed the order, own the store fulfilling it, or hold an admin role.
   * Callers with no requester (internal RPC from another service) are unaffected.
   */
  private assertOrderVisible(
    order: GroceryOrder & { store?: GroceryStore },
    requesterId?: string,
    requesterRole?: string,
  ) {
    if (!requesterId) return;
    if (GroceryService.ADMIN_ROLES.has(String(requesterRole ?? '').toUpperCase())) return;
    if (order.customerId === requesterId) return;
    if (order.store?.ownerId && order.store.ownerId === requesterId) return;
    // 404, not 403 — a 403 confirms the order exists.
    throw new NotFoundException(`Order ${order.id} not found`);
  }

  async getOrderById(orderId: string, requesterId?: string, requesterRole?: string) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['store'],
    });
    // The cache used to be consulted first and returned unconditionally, which both
    // bypassed the visibility check and served a stale row for up to 24 hours after
    // a status change made through any path that did not evict it.
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    this.assertOrderVisible(order, requesterId, requesterRole);
    return order;
  }

  // Both order listings let a query failure surface. Swallowing it and returning
  // `{ data: [], total: 0 }` told a customer they had never ordered and told a
  // seller their queue was empty — the two states an outage must never imitate.

  async getOrdersByCustomer(customerId: string, page = 1, limit = 20) {
    ({ page, limit } = paginate(page, limit, 20));
    const [data, total] = await this.orderRepo.findAndCount({
      where: { customerId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['store'],
    });
    return { data, total, page, limit };
  }

  async getOrdersByStore(storeId: string, status?: GroceryOrderStatus, page = 1, limit = 20) {
    ({ page, limit } = paginate(page, limit, 20));
    const where: any = { storeId };
    if (status) where.status = status;

    const [data, total] = await this.orderRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  /**
   * Updates the order status with transition validation.
   * Publishes Kafka events for cross-module integration.
   */
  async updateOrderStatus(
    orderId: string,
    dto: UpdateOrderStatusDto,
    actor?: { id?: string; role?: string },
  ) {
    const order = await this.orderRepo.findOne({ where: { id: orderId }, relations: ['store'] });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);

    // Who may move an order: the store fulfilling it, an admin, or the customer —
    // and the customer only to cancel their own. The route was anonymous and
    // unchecked, so anyone could mark any order DELIVERED, which fires the
    // commission and loyalty events further down this method.
    if (actor?.id && !GroceryService.ADMIN_ROLES.has(String(actor.role ?? '').toUpperCase())) {
      const isStoreOwner = !!order.store?.ownerId && order.store.ownerId === actor.id;
      const isCustomer = order.customerId === actor.id;
      if (!isStoreOwner && !isCustomer) {
        throw new NotFoundException(`Order ${orderId} not found`);
      }
      if (isCustomer && !isStoreOwner && dto.status !== GroceryOrderStatus.CANCELLED) {
        throw new BadRequestException('You can only cancel your own order');
      }
    }

    const currentStatus = order.status as GroceryOrderStatus;
    const allowedTransitions = GROCERY_ORDER_STATUS_TRANSITIONS[currentStatus];

    if (!allowedTransitions?.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from ${currentStatus} to ${dto.status}. Allowed: ${allowedTransitions?.join(', ') ?? 'none'}`,
      );
    }

    // Apply the status update
    order.status = dto.status;

    if (dto.status === GroceryOrderStatus.CANCELLED) {
      order.cancelReason = dto.reason ?? null;
    }
    if (dto.status === GroceryOrderStatus.DELIVERED) {
      order.deliveredAt = new Date();
    }

    await this.orderRepo.save(order);

    // Invalidate cache
    await this.redis.del(`grocery:order:${orderId}`);

    // Publish Kafka events based on status
    await this.kafka.publish('grocery.order.status_updated', {
      orderId,
      orderNumber: order.orderNumber,
      storeId: order.storeId,
      customerId: order.customerId,
      previousStatus: currentStatus,
      newStatus: dto.status,
    });

    // Special events per status transition
    if (dto.status === GroceryOrderStatus.READY_FOR_PICKUP) {
      // Trigger delivery partner assignment
      await this.kafka.publish('grocery.delivery.requested', {
        orderId,
        orderNumber: order.orderNumber,
        storeId: order.storeId,
        storeName: order.store?.name,
        pickupLat: order.store?.latitude,
        pickupLng: order.store?.longitude,
        pickupAddress: order.store?.address,
        dropLat: order.deliveryAddress?.lat,
        dropLng: order.deliveryAddress?.lng,
        dropAddress: `${order.deliveryAddress?.line1}, ${order.deliveryAddress?.city}`,
        isCod: order.paymentMethod === GroceryPaymentMethod.COD,
        codAmount: order.paymentMethod === GroceryPaymentMethod.COD ? order.grandTotal : 0,
        serviceType: 'grocery',
      });

      // Notify customer
      await this.kafka.publish('notification.push', {
        userId: order.customerId,
        title: 'Order Ready! 📦',
        body: `Your order ${order.orderNumber} is packed and ready for pickup`,
        data: { type: 'grocery_order', orderId },
      });
    }

    if (dto.status === GroceryOrderStatus.OUT_FOR_DELIVERY) {
      await this.kafka.publish('notification.push', {
        userId: order.customerId,
        title: 'On its way! 🚗',
        body: `Your order ${order.orderNumber} is out for delivery`,
        data: { type: 'grocery_tracking', orderId },
      });
    }

    if (dto.status === GroceryOrderStatus.DELIVERED) {
      // Trigger commission calculation
      await this.kafka.publish('commission.calculated', {
        orderId,
        storeId: order.storeId,
        grandTotal: order.grandTotal,
        serviceType: 'grocery',
      });

      // Trigger loyalty points
      await this.kafka.publish('loyalty.points.awarded', {
        userId: order.customerId,
        orderId,
        amount: Math.floor(Number(order.grandTotal) / 10), // 1 point per 10 currency units
        source: 'grocery_order',
      });
    }

    this.logger.log(`Order ${order.orderNumber}: ${currentStatus} → ${dto.status}`);
    return { success: true, order };
  }

  // ── Seed Helper ─────────────────────────────────────────────────────────────

  /** Auto-seeds the grocery_categories table if empty (first boot). */
  private async seedCategoriesIfEmpty() {
    const count = await this.categoryRepo.count();
    if (count > 0) {
      this.logger.debug(`Categories table has ${count} rows, skipping seed`);
      return;
    }

    this.logger.log('Seeding grocery_categories table with 23 canonical categories...');
    const entities = CANONICAL_CATEGORIES.map((cat, idx) =>
      this.categoryRepo.create({
        id: cat.id,
        name: cat.name,
        emoji: cat.emoji,
        gradient: cat.gradient,
        description: cat.description,
        productCount: cat.productCount,
        subcategoryCount: cat.subcategoryCount,
        sortOrder: idx,
        isActive: true,
      }),
    );
    await this.categoryRepo.save(entities);
    this.logger.log(`Seeded ${entities.length} categories`);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // SELLER-FACING METHODS
  // ══════════════════════════════════════════════════════════════════════════════

  /** Create a new grocery product for a store */
  async createProduct(storeId: string, data: Partial<GroceryItem>) {
    // Every new listing enters moderation. The column defaults to APPROVED so
    // that adding it to a live table did not blank the storefront; that default
    // is for pre-existing rows only, and is overridden here.
    data = { ...data, approvalStatus: 'PENDING', rejectionReason: null };

    // Checked here rather than left to the database. `weightVariants` is NOT NULL
    // with no default, so omitting it produced a Postgres constraint error whose
    // text — the entire failing row — was returned to the API caller.
    if (!String(data.name ?? '').trim()) {
      throw new BadRequestException('A product name is required.');
    }
    const variants = data.weightVariants;
    if (!Array.isArray(variants) || variants.length === 0) {
      throw new BadRequestException(
        'At least one weight variant is required, e.g. [{ "weight": "1 kg", "price": 9.99, "mrp": 12, "stock": 20 }].',
      );
    }
    // A product filed under a category that does not exist is invisible to
    // browsing — it only ever surfaces by name search. Checked here rather than
    // discovered later by a seller wondering where their listing went.
    const path = await this.validateCategoryPath(data.category, data.subCategory);
    if (!path.ok) throw new BadRequestException(path.reason);

    for (const [i, v] of variants.entries()) {
      const bad =
        !v ||
        typeof v !== 'object' ||
        !String((v as any).weight ?? '').trim() ||
        !Number.isFinite(Number((v as any).price)) ||
        Number((v as any).price) < 0;
      if (bad) {
        throw new BadRequestException(
          `Weight variant ${i + 1} needs a "weight" label and a non-negative numeric "price".`,
        );
      }
    }

    try {
      const store = await this.storeRepo.findOne({ where: { id: storeId } });
      if (!store) throw new NotFoundException(`Store ${storeId} not found`);

      const product = this.itemRepo.create({
        ...data,
        storeId,
        isAvailable: true,
        isPromoted: false,
        rating: 0,
        reviewCount: 0,
      });
      const saved = await this.itemRepo.save(product);

      await this.bumpProductCount(storeId, 1);

      // Publish Kafka event
      await this.kafka.publish('grocery.product.created', {
        productId: saved.id,
        storeId,
        name: saved.name,
        category: saved.category,
        createdAt: new Date().toISOString(),
      });

      await this.invalidateProductCache(storeId);

      return { success: true, product: saved };
    } catch (err: any) {
      if (err instanceof NotFoundException) throw err;
      // No fabricated product here. This used to return `{ id: 'PRD-<timestamp>' }`
      // with `success: true`, so the seller's Products screen listed an item under
      // an id nothing in the database had — every follow-up edit or delete then
      // 404'd against a product the UI had just shown them.
      this.logger.error(`createProduct failed for store ${storeId}: ${err.message}`);
      // A driver error carries the failing row — column values and all — and the
      // RPC filter passed that straight to the HTTP client. The detail stays in
      // the log; the caller gets something it can act on.
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException(
        'The product could not be saved. Check the submitted fields and try again.',
      );
    }
  }

  /** Update an existing grocery product */
  async updateProduct(storeId: string, productId: string, data: Partial<GroceryItem>) {
    try {
      const product = await this.itemRepo.findOne({ where: { id: productId, storeId } });
      if (!product)
        throw new NotFoundException(`Product ${productId} not found in store ${storeId}`);

      // Same check as create, but only when the edit actually moves the product.
      if (data.category !== undefined || data.subCategory !== undefined) {
        const nextCategory = data.category ?? product.category;
        const nextSub = data.subCategory !== undefined ? data.subCategory : product.subCategory;
        const path = await this.validateCategoryPath(nextCategory, nextSub);
        if (!path.ok) throw new BadRequestException(path.reason);
      }

      Object.assign(product, data);
      const saved = await this.itemRepo.save(product);

      // Check low stock after update
      await this.checkLowStock(saved);

      await this.invalidateProductCache(storeId);
      // `getProductById` caches under `grocery:product:<productId>`; this deleted
      // `grocery:product:<storeId>:<productId>`, a key nothing ever wrote, so the
      // product detail page kept serving the pre-edit price and stock.
      await this.redis.del(`grocery:product:${productId}`);

      return { success: true, product: saved };
    } catch (err: any) {
      if (err instanceof NotFoundException) throw err;
      // Reporting `success: true` for a failed write let the seller believe a price
      // or stock change had landed when it had not.
      this.logger.error(`updateProduct failed for ${storeId}/${productId}: ${err.message}`);
      throw err;
    }
  }

  /** Delete a grocery product */
  async deleteProduct(storeId: string, productId: string) {
    try {
      const product = await this.itemRepo.findOne({ where: { id: productId, storeId } });
      if (!product)
        throw new NotFoundException(`Product ${productId} not found in store ${storeId}`);

      await this.itemRepo.remove(product);
      await this.bumpProductCount(storeId, -1);
      await this.invalidateProductCache(storeId);
      await this.redis.del(`grocery:product:${productId}`);

      return { success: true, deletedId: productId };
    } catch (err: any) {
      if (err instanceof NotFoundException) throw err;
      this.logger.error(`deleteProduct failed for ${storeId}/${productId}: ${err.message}`);
      throw err;
    }
  }

  /** Bulk import products from CSV-like array */
  async bulkImportProducts(storeId: string, products: Partial<GroceryItem>[]) {
    try {
      const store = await this.storeRepo.findOne({ where: { id: storeId } });
      if (!store) throw new NotFoundException(`Store ${storeId} not found`);

      const errors: { index: number; error: string }[] = [];
      let imported = 0;

      for (let i = 0; i < products.length; i++) {
        try {
          const product = this.itemRepo.create({
            ...products[i],
            storeId,
            isAvailable: true,
            isPromoted: false,
            rating: 0,
            reviewCount: 0,
          });
          await this.itemRepo.save(product);
          imported++;
        } catch (e: any) {
          errors.push({ index: i, error: e.message ?? 'Unknown error' });
        }
      }

      await this.bumpProductCount(storeId, imported);
      await this.invalidateProductCache(storeId);

      return {
        uploaded: imported,
        errors: errors.length,
        errorDetails: errors,
        total: products.length,
      };
    } catch (err: any) {
      if (err instanceof NotFoundException) throw err;
      // Only reachable now if the store lookup itself failed — the per-row loop
      // already records its own failures. It previously also caught the
      // productCount increment, turning a fully successful import into a reported
      // `{ uploaded: 0, errors: <all rows> }`.
      this.logger.error(`bulkImportProducts failed for store ${storeId}: ${err.message}`);
      throw err;
    }
  }

  /** Get store analytics (orders, revenue, ratings) */
  async getStoreAnalytics(storeId: string, period: string = '7d') {
    try {
      const store = await this.storeRepo.findOne({ where: { id: storeId } });
      if (!store) throw new NotFoundException(`Store ${storeId} not found`);

      // Calculate date range
      const days = period === '30d' ? 30 : period === '90d' ? 90 : 7;
      const since = new Date();
      since.setDate(since.getDate() - days);

      // Aggregate order stats
      const stats = await this.orderRepo
        .createQueryBuilder('o')
        .select('COUNT(o.id)', 'totalOrders')
        .addSelect('COALESCE(SUM(o.grandTotal), 0)', 'totalRevenue')
        .addSelect('COALESCE(AVG(o.grandTotal), 0)', 'avgOrderValue')
        .addSelect(`COUNT(CASE WHEN o.status = 'DELIVERED' THEN 1 END)`, 'deliveredOrders')
        .addSelect(`COUNT(CASE WHEN o.status = 'CANCELLED' THEN 1 END)`, 'cancelledOrders')
        .where('o.storeId = :storeId', { storeId })
        .andWhere('o.createdAt >= :since', { since: since.toISOString() })
        .getRawOne();

      // Daily breakdown
      const dailyStats = await this.orderRepo
        .createQueryBuilder('o')
        .select(`DATE(o.createdAt)`, 'date')
        .addSelect('COUNT(o.id)', 'orders')
        .addSelect('COALESCE(SUM(o.grandTotal), 0)', 'revenue')
        .where('o.storeId = :storeId', { storeId })
        .andWhere('o.createdAt >= :since', { since: since.toISOString() })
        .groupBy(`DATE(o.createdAt)`)
        .orderBy(`DATE(o.createdAt)`, 'ASC')
        .getRawMany();

      // Product count
      const productCount = await this.itemRepo.count({ where: { storeId } });

      return {
        storeId,
        storeName: store.name ?? '',
        period,
        stats: {
          totalOrders: Number(stats?.totalOrders ?? 0),
          totalRevenue: Number(stats?.totalRevenue ?? 0),
          avgOrderValue: Number(Number(stats?.avgOrderValue ?? 0).toFixed(2)),
          deliveredOrders: Number(stats?.deliveredOrders ?? 0),
          cancelledOrders: Number(stats?.cancelledOrders ?? 0),
          fulfillmentRate:
            stats?.totalOrders > 0
              ? Number(((stats.deliveredOrders / stats.totalOrders) * 100).toFixed(1))
              : 0,
          productCount,
          rating: Number(store.rating),
          totalRatings: store.totalOrders,
        },
        dailyStats: dailyStats.map((d) => ({
          date: d.date,
          orders: Number(d.orders),
          revenue: Number(d.revenue),
        })),
      };
    } catch (err: any) {
      if (err instanceof NotFoundException) throw err;
      // All-zero stats are a legitimate answer for a new store, so returning them on
      // failure told a trading seller their revenue was zero. Let it fail instead.
      this.logger.error(`getStoreAnalytics failed for ${storeId}: ${err.message}`);
      throw err;
    }
  }

  /** Update store settings (hours, delivery radius, etc.) */
  async updateStoreSettings(storeId: string, settings: Partial<GroceryStore>) {
    try {
      const store = await this.storeRepo.findOne({ where: { id: storeId } });
      if (!store) throw new NotFoundException(`Store ${storeId} not found`);

      // Only allow specific fields to be updated
      const allowed = [
        'name',
        'address',
        'phone',
        'openingHours',
        'deliveryRadius',
        'minOrderAmount',
        'deliveryFee',
        'tags',
        'logoUrl',
        'bannerUrl',
      ];
      for (const key of allowed) {
        if ((settings as any)[key] !== undefined) {
          (store as any)[key] = (settings as any)[key];
        }
      }

      const saved = await this.storeRepo.save(store);
      await this.redis.del(`grocery:store:${storeId}`);

      return { success: true, store: saved };
    } catch (err: any) {
      if (err instanceof NotFoundException) throw err;
      this.logger.error(`updateStoreSettings failed for ${storeId}: ${err.message}`);
      throw err;
    }
  }

  /** Get promotions for a store */
  async getStorePromotions(storeId: string) {
    try {
      // Promotions are products with isPromoted = true
      const promoted = await this.itemRepo.find({
        where: { storeId, isPromoted: true, isAvailable: true },
        order: { name: 'ASC' },
      });

      return {
        storeId,
        promotions: promoted.map((p) => ({
          productId: p.id,
          name: p.name,
          category: p.category,
          isPromoted: p.isPromoted,
          rating: p.rating,
          reviewCount: p.reviewCount,
        })),
        total: promoted.length,
      };
    } catch (err: any) {
      this.logger.error(`getStorePromotions failed for ${storeId}: ${err.message}`);
      throw err;
    }
  }

  /** Toggle product promotion status */
  async toggleProductPromotion(storeId: string, productId: string, promoted: boolean) {
    try {
      const product = await this.itemRepo.findOne({ where: { id: productId, storeId } });
      if (!product) throw new NotFoundException(`Product ${productId} not found`);

      product.isPromoted = promoted;
      await this.itemRepo.save(product);
      await this.invalidateProductCache(storeId);
      await this.redis.del(`grocery:product:${productId}`);

      return { success: true, productId, isPromoted: promoted };
    } catch (err: any) {
      if (err instanceof NotFoundException) throw err;
      this.logger.error(
        `toggleProductPromotion failed for ${storeId}/${productId}: ${err.message}`,
      );
      throw err;
    }
  }

  /** Get low-stock items for a store */
  async getLowStockItems(storeId: string, threshold = 10) {
    try {
      // Get items whose first weight variant has stock below threshold
      const items = await this.itemRepo.find({
        where: { storeId, isAvailable: true },
        order: { name: 'ASC' },
      });

      const lowStock = items.filter((item) => {
        if (!item.weightVariants || !Array.isArray(item.weightVariants)) return false;
        return item.weightVariants.some((v: any) => v.stock !== undefined && v.stock <= threshold);
      });

      return {
        storeId,
        threshold,
        items: lowStock.map((i) => ({
          id: i.id,
          name: i.name,
          category: i.category,
          weightVariants: i.weightVariants,
          lowestStock: Math.min(
            ...(i.weightVariants as any[]).filter((v) => v.stock !== undefined).map((v) => v.stock),
          ),
        })),
        total: lowStock.length,
      };
    } catch (err: any) {
      // "No low-stock items" is exactly what a seller wants to see, so returning it
      // on failure suppressed the alert the screen exists to raise.
      this.logger.error(`getLowStockItems failed for ${storeId}: ${err.message}`);
      throw err;
    }
  }

  // ── Low Stock Alert Trigger ────────────────────────────────────────────────

  /** Checks if a product's stock is below threshold and publishes Kafka alert */
  private async checkLowStock(product: GroceryItem) {
    if (!product.weightVariants || !Array.isArray(product.weightVariants)) return;

    const lowThreshold = 5;
    const lowVariants = (product.weightVariants as any[]).filter(
      (v) => v.stock !== undefined && v.stock <= lowThreshold,
    );

    if (lowVariants.length > 0) {
      await this.kafka.publish('grocery.inventory.low_stock', {
        storeId: product.storeId,
        productId: product.id,
        productName: product.name ?? '',
        variants: lowVariants.map((v) => ({ weight: v.weight, stock: v.stock })),
        alertedAt: new Date().toISOString(),
      });
      this.logger.warn(
        `Low stock alert: ${product.name} (${product.id}) in store ${product.storeId}`,
      );
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── FLASH DEALS ─────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════

  /** Seller creates a flash deal (draft) */
  async createFlashDeal(
    dto: CreateFlashDealDto,
    actor?: { id?: string; role?: string },
    scope?: string,
  ) {
    // Validated before the lookups, not after.
    //
    // `findOne({ where: { id: undefined } })` does not match nothing — TypeORM
    // drops an undefined condition, so the query became "first row in the
    // table" and returned an unrelated product. The mismatch check below then
    // rejected it with "Product undefined does not belong to store undefined",
    // which looked like validation but was luck: had the arbitrary row happened
    // to belong to the arbitrary store, the deal would have been created
    // against a product nobody asked for.
    const productId = requireUuid(dto.productId, 'product');
    const storeId = requireUuid(dto.storeId, 'store');

    // `storeId` arrives in the request body, so it is the caller naming whose
    // store to discount. Checked before anything is created.
    await this.assertStoreActor(storeId, actor);

    const product = await this.itemRepo.findOne({ where: { id: productId } });
    if (!product) throw new NotFoundException(`Product ${productId} not found`);

    const store = await this.storeRepo.findOne({ where: { id: storeId } });
    if (!store) throw new NotFoundException(`Store ${storeId} not found`);
    // The admin console calls this too (`admin.grocery.createFlashDeal`), where a
    // market-locked admin must not be able to create a deal against a store
    // outside their own market.
    assertInMarket(store.regionCode, scope, 'store', this.logger);
    if (product.storeId !== dto.storeId) {
      throw new BadRequestException(
        `Product ${dto.productId} does not belong to store ${dto.storeId}`,
      );
    }

    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('startTime and endTime must be valid dates');
    }
    if (end <= start) throw new BadRequestException('endTime must be after startTime');

    // Guard the price before computing the discount. With no weight variants the
    // old expression produced NaN, `NaN < 30` is false so the 30% floor did not
    // fire, and the insert then failed on a NOT NULL int column with a 500.
    const originalPrice = Number((product.weightVariants as any[])?.[0]?.price);
    if (!Number.isFinite(originalPrice) || originalPrice <= 0) {
      throw new BadRequestException(`${product.name} has no priced weight variant to discount`);
    }
    if (dto.flashPrice >= originalPrice) {
      throw new BadRequestException(
        `Flash price must be below the current price of ${originalPrice}`,
      );
    }

    const discountPercent = Math.round(((originalPrice - dto.flashPrice) / originalPrice) * 100);
    if (discountPercent < 30)
      throw new BadRequestException('Flash deals require a minimum 30% discount');

    const deal = this.flashDealRepo.create({
      storeId: dto.storeId,
      storeName: store.name ?? '',
      productId: dto.productId,
      productName: product.name ?? '',
      category: product.category ?? '',
      originalPrice,
      flashPrice: dto.flashPrice,
      discountPercent,
      startTime: start,
      endTime: end,
      stockLimit: dto.stockLimit,
      soldCount: 0,
      status: FlashDealStatus.DRAFT,
    });

    const saved = await this.flashDealRepo.save(deal);
    this.logger.log(`Flash deal created: ${saved.id} for ${product.name} in ${store.name}`);
    return { success: true, flashDeal: saved };
  }

  /** Seller submits flash deal for admin approval */
  async submitFlashDeal(dealId: string, actor?: { id?: string; role?: string }) {
    const deal = await this.flashDealRepo.findOne({ where: { id: dealId } });
    if (!deal) throw new NotFoundException(`Flash deal ${dealId} not found`);
    await this.assertStoreActor(deal.storeId, actor);
    if (deal.status !== FlashDealStatus.DRAFT && deal.status !== FlashDealStatus.REJECTED) {
      throw new BadRequestException(`Can only submit deals in draft or rejected status`);
    }

    deal.status = FlashDealStatus.PENDING;
    deal.submittedAt = new Date();
    const saved = await this.flashDealRepo.save(deal);

    await this.kafka.publish('grocery.flash_deal.submitted', {
      dealId: saved.id,
      storeId: saved.storeId,
      productName: saved.productName,
    });

    return { success: true, flashDeal: saved };
  }

  /** Admin approves a flash deal */
  async approveFlashDeal(dealId: string, approvedBy?: string, scope?: string) {
    const deal = await this.flashDealRepo.findOne({ where: { id: dealId }, relations: ['store'] });
    if (!deal) throw new NotFoundException(`Flash deal ${dealId} not found`);
    assertInMarket(deal.store?.regionCode ?? null, scope, 'flash deal', this.logger);
    if (deal.status !== FlashDealStatus.PENDING) {
      throw new BadRequestException(`Can only approve deals in pending status`);
    }

    deal.status = FlashDealStatus.APPROVED;
    deal.approvedAt = new Date();
    deal.approvedBy = approvedBy;

    // Auto-activate if start time has passed
    if (new Date(deal.startTime) <= new Date()) {
      deal.status = FlashDealStatus.ACTIVE;
    }

    const saved = await this.flashDealRepo.save(deal);

    await this.kafka.publish('grocery.flash_deal.approved', {
      dealId: saved.id,
      storeId: saved.storeId,
      storeName: saved.storeName,
      productName: saved.productName,
      flashPrice: saved.flashPrice,
    });

    return { success: true, flashDeal: saved };
  }

  /** Admin rejects a flash deal */
  async rejectFlashDeal(dealId: string, dto: RejectFlashDealDto, scope?: string) {
    const deal = await this.flashDealRepo.findOne({ where: { id: dealId }, relations: ['store'] });
    if (!deal) throw new NotFoundException(`Flash deal ${dealId} not found`);
    assertInMarket(deal.store?.regionCode ?? null, scope, 'flash deal', this.logger);
    if (deal.status !== FlashDealStatus.PENDING) {
      throw new BadRequestException(`Can only reject deals in pending status`);
    }

    deal.status = FlashDealStatus.REJECTED;
    deal.rejectedReason = dto.reason;
    const saved = await this.flashDealRepo.save(deal);

    await this.kafka.publish('grocery.flash_deal.rejected', {
      dealId: saved.id,
      storeId: saved.storeId,
      productName: saved.productName,
      reason: dto.reason,
    });

    return { success: true, flashDeal: saved };
  }

  /** Pause an active flash deal */
  async pauseFlashDeal(dealId: string, actor?: { id?: string; role?: string }) {
    const deal = await this.flashDealRepo.findOne({ where: { id: dealId } });
    if (!deal) throw new NotFoundException(`Flash deal ${dealId} not found`);
    await this.assertStoreActor(deal.storeId, actor);
    if (deal.status !== FlashDealStatus.ACTIVE)
      throw new BadRequestException('Can only pause active deals');

    deal.status = FlashDealStatus.PAUSED;
    return { success: true, flashDeal: await this.flashDealRepo.save(deal) };
  }

  /** Resume a paused flash deal */
  async resumeFlashDeal(dealId: string, actor?: { id?: string; role?: string }) {
    const deal = await this.flashDealRepo.findOne({ where: { id: dealId } });
    if (!deal) throw new NotFoundException(`Flash deal ${dealId} not found`);
    await this.assertStoreActor(deal.storeId, actor);
    if (deal.status !== FlashDealStatus.PAUSED)
      throw new BadRequestException('Can only resume paused deals');

    deal.status = FlashDealStatus.ACTIVE;
    return { success: true, flashDeal: await this.flashDealRepo.save(deal) };
  }

  /** List flash deals with filters (admin/seller) */
  async getFlashDeals(filters: {
    storeId?: string;
    status?: FlashDealStatus;
    page?: number;
    limit?: number;
  }) {
    const { storeId, status } = filters;
    const { page, limit } = paginate(filters.page, filters.limit, 20);
    const where: any = {};
    if (storeId) where.storeId = storeId;
    if (status) where.status = status;

    const [data, total] = await this.flashDealRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  /** Get active flash deals for a specific store (customer-facing) */
  /**
   * Every live flash deal in one market, for the storefront's Flash Deals rail.
   *
   * The homepage was calling `list_flash_deals` — the admin/seller moderation
   * queue. That query has no region filter, so a shopper in Doha received the
   * newest twenty deals platform-wide; when none of them happened to belong to a
   * Qatari shop the section rendered nothing at all, which looked like "no deals
   * running" rather than "deals filtered out". Scoping by the store's region and
   * the deal's own window makes the rail reflect what is actually on sale here.
   */
  async getActiveFlashDeals(regionCode?: string, limit = 40) {
    const take = Math.min(100, Math.max(1, Number(limit) || 40));
    const cacheKey = `grocery:flash-deals:active:${regionCode ?? 'all'}:${take}`;
    const cached = await this.redis.getJson(cacheKey);
    if (cached) return cached;

    const qb = this.flashDealRepo
      .createQueryBuilder('d')
      .innerJoin(GroceryStore, 's', 's.id = d."storeId"')
      .where('d.status = :status', { status: FlashDealStatus.ACTIVE })
      .andWhere("s.status = 'APPROVED'")
      .andWhere('s."isOnline" = true')
      .orderBy('d.endTime', 'ASC')
      .take(take);

    if (regionCode) qb.andWhere('s.region_code = :regionCode', { regionCode });

    const deals = await qb.getMany();

    // Same expiry rule as the per-store read: an unparseable end time is treated
    // as not-yet-expired rather than silently dropped.
    const cutoff = Date.now();
    const isExpired = (d: GroceryFlashDeal) => {
      const t = new Date(d.endTime).getTime();
      return Number.isFinite(t) && t <= cutoff;
    };
    const expired = deals.filter(isExpired);
    const active = deals.filter((d) => !isExpired(d));

    if (expired.length) {
      await this.flashDealRepo.update(
        { id: In(expired.map((d) => d.id)) },
        { status: FlashDealStatus.EXPIRED },
      );
    }

    // The deal row denormalises the product's name and emoji but not its picture.
    const productIds = [...new Set(active.map((d) => d.productId).filter(Boolean))];
    const images = new Map<string, string | null>();
    if (productIds.length) {
      const rows = await this.itemRepo.find({
        where: { id: In(productIds) },
        select: ['id', 'imageUrl'],
      });
      rows.forEach((r) => images.set(r.id, r.imageUrl ?? null));
    }

    const result = {
      data: active.map((d) => ({ ...d, imageUrl: images.get(d.productId) ?? null })),
      total: active.length,
      regionCode: regionCode ?? null,
    };
    await this.redis.setJson(cacheKey, result, CACHE_TTL.FLASH_DEALS);
    return result;
  }

  async getActiveFlashDealsByStore(storeId: string) {
    const now = new Date();
    const deals = await this.flashDealRepo.find({
      where: { storeId, status: FlashDealStatus.ACTIVE },
      order: { endTime: 'ASC' },
    });

    /**
     * Auto-expire deals whose endTime has passed.
     *
     * This is a customer-facing read, and it used to issue one UPDATE per
     * expired deal inside the loop — so a store page with ten lapsed deals wrote
     * ten rows on every view, from every visitor, until the sweep caught up.
     * One statement covers the whole set.
     */
    // One predicate, and `active` is its complement — written as two independent
    // comparisons, a deal whose endTime is missing or malformed satisfies
    // neither (NaN compares false both ways) and disappears from the storefront
    // without ever being marked expired. An unparseable date is treated as
    // not-yet-expired, which is what the original loop did.
    const cutoff = now.getTime();
    const isExpired = (d: GroceryFlashDeal) => {
      const t = new Date(d.endTime).getTime();
      return Number.isFinite(t) && t <= cutoff;
    };
    const expired = deals.filter(isExpired);
    const active = deals.filter((d) => !isExpired(d));

    if (expired.length) {
      await this.flashDealRepo.update(
        { id: In(expired.map((d) => d.id)) },
        { status: FlashDealStatus.EXPIRED },
      );
    }

    /**
     * Attach each deal's product picture.
     *
     * `grocery_flash_deals` denormalises the product's name, emoji and category
     * at the time the deal is created, but not its image — so the storefront had
     * only an emoji to render for a promoted product that has a photo.
     *
     * One `IN` query for the whole set rather than a lookup per deal: this is a
     * customer read path and a store can run many promotions at once.
     */
    const productIds = [...new Set(active.map((d) => d.productId).filter(Boolean))];
    const images = new Map<string, string | null>();
    if (productIds.length) {
      const rows = await this.itemRepo.find({
        where: { id: In(productIds) },
        select: ['id', 'imageUrl'],
      });
      rows.forEach((r) => images.set(r.id, r.imageUrl ?? null));
    }
    const withImages = active.map((d) => ({
      ...d,
      imageUrl: images.get(d.productId) ?? null,
    }));

    return { storeId, deals: withImages, total: withImages.length };
  }

  /** Decrement flash deal stock on purchase */
  async decrementFlashDealStock(dealId: string, quantity = 1) {
    const deal = await this.flashDealRepo.findOne({ where: { id: dealId } });
    if (!deal) return;
    deal.soldCount = Math.min(deal.soldCount + quantity, deal.stockLimit);
    if (deal.soldCount >= deal.stockLimit) {
      deal.status = FlashDealStatus.EXPIRED;
      this.logger.log(`Flash deal ${dealId} sold out`);
    }
    await this.flashDealRepo.save(deal);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── REVIEWS ──────────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════

  /** Submit a product review */
  async submitReview(storeId: string, productId: string, dto: CreateReviewDto) {
    const product = await this.itemRepo.findOne({ where: { id: productId, storeId } });
    if (!product) throw new NotFoundException(`Product ${productId} not found in store ${storeId}`);

    // Check if customer already reviewed
    const existing = await this.reviewRepo.findOne({
      where: { productId, customerId: dto.customerId },
    });
    if (existing) throw new BadRequestException('You have already reviewed this product');

    // Check if verified purchase
    const hasOrdered = await this.orderRepo.findOne({
      where: { customerId: dto.customerId, storeId },
    });

    const review = this.reviewRepo.create({
      productId,
      storeId,
      customerId: dto.customerId,
      customerName: dto.customerName,
      rating: dto.rating,
      comment: dto.comment,
      isVerifiedPurchase: !!hasOrdered,
    });

    const saved = await this.reviewRepo.save(review);

    // Update the product's average rating and review count. `getRawOne()` can
    // resolve to undefined, so destructuring it directly threw on the happy path
    // whenever the aggregate returned no row.
    const agg = await this.reviewRepo
      .createQueryBuilder('r')
      .select('AVG(r.rating)', 'avg')
      .addSelect('COUNT(r.id)', 'count')
      .where('r.productId = :productId', { productId })
      .getRawOne<{ avg: string | null; count: string }>();

    const avg = Number(agg?.avg);
    if (Number.isFinite(avg)) {
      product.rating = Math.round(avg * 10) / 10; // column is decimal(3,1)
      // reviewCount was never maintained, so every product reported 0 reviews
      // alongside a real star rating.
      product.reviewCount = Number(agg?.count ?? 0);
      await this.itemRepo.save(product);
      await this.redis.del(`grocery:product:${productId}`);
      await this.invalidateProductCache(storeId);
    }

    return { success: true, review: saved };
  }

  /** Get reviews for a product */
  async getProductReviews(storeId: string, productId: string, page = 1, limit = 20) {
    ({ page, limit } = paginate(page, limit, 20));
    const [data, total] = await this.reviewRepo.findAndCount({
      where: { productId, storeId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  /** Get reviews for a store */
  async getStoreReviews(storeId: string, page = 1, limit = 20) {
    ({ page, limit } = paginate(page, limit, 20));
    const [data, total] = await this.reviewRepo.findAndCount({
      where: { storeId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── WISHLIST ─────────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════

  /** Add product to wishlist */
  async addToWishlist(dto: AddToWishlistDto) {
    // Same reason as `createFlashDeal`: an undefined id is not a condition
    // TypeORM narrows on, it is a condition it discards, so the "not found"
    // guard below would have been handed an arbitrary product.
    const productId = requireUuid(dto.productId, 'product');
    const customerId = requireId(dto.customerId, 'customer');

    const product = await this.itemRepo.findOne({ where: { id: productId } });
    if (!product) throw new NotFoundException(`Product ${productId} not found`);

    const existing = await this.wishlistRepo.findOne({
      where: { customerId, productId },
    });
    if (existing) return { success: true, message: 'Already in wishlist', wishlistItem: existing };

    const item = this.wishlistRepo.create({
      customerId: dto.customerId,
      productId: dto.productId,
      storeId: dto.storeId,
      productName: product.name ?? '',
    });

    return { success: true, wishlistItem: await this.wishlistRepo.save(item) };
  }

  /** Remove product from wishlist */
  async removeFromWishlist(customerId: string, productId: string) {
    const result = await this.wishlistRepo.delete({ customerId, productId });
    // `affected` is `number | null | undefined` on some drivers.
    return { success: true, deleted: (result.affected ?? 0) > 0 };
  }

  /**
   * Get a customer's wishlist, joined to the live catalogue.
   *
   * The rows on their own carry only ids and a name snapshot, so the wishlist page
   * had no price, image or stock to render and showed empty cards. Products that
   * have since been delisted are marked rather than dropped, so the customer can
   * see why something disappeared.
   */
  async getWishlist(customerId: string, page = 1, limit = 30) {
    ({ page, limit } = paginate(page, limit, 30));
    const [rows, total] = await this.wishlistRepo.findAndCount({
      where: { customerId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const products = rows.length
      ? await this.itemRepo.find({ where: { id: In(rows.map((r) => r.productId)) } })
      : [];
    const byId = new Map(products.map((p) => [p.id, p]));

    const data = rows.map((r) => {
      const p = byId.get(r.productId);
      const variant = ((p?.weightVariants as any[]) ?? [])[0];
      return {
        ...r,
        productName: p?.name ?? r.productName,
        imageUrl: p?.imageUrl ?? null,
        brand: p?.brand ?? null,
        category: p?.category ?? null,
        rating: p ? Number(p.rating) : null,
        reviewCount: p?.reviewCount ?? 0,
        weightVariants: p?.weightVariants ?? [],
        price: variant ? Number(variant.price) : null,
        mrp: variant ? Number(variant.mrp) : null,
        inStock: Number(variant?.stock ?? 0) > 0,
        available: !!p?.isAvailable,
      };
    });

    return { data, total, page, limit };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── REORDER ──────────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Clone items from a past order into a cart-ready payload.
   *
   * The comment said "check product availability" and nothing checked it — the
   * historical line was echoed back verbatim, including a price that may be months
   * old and a product that may since have been delisted. Each line is now resolved
   * against the live catalogue so the basket the customer lands on is one they can
   * actually buy, and anything that has gone is reported rather than silently kept.
   */
  async reorderFromHistory(orderId: string, dto: ReorderDto) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, customerId: dto.customerId },
    });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);

    const historical = (order.items as any[]) ?? [];
    const products = historical.length
      ? await this.itemRepo.find({
          where: {
            id: In([...new Set(historical.map((i) => i.productId))]),
            storeId: order.storeId,
          },
        })
      : [];
    const byId = new Map(products.map((p) => [p.id, p]));

    const items: any[] = [];
    const unavailable: Array<{ productId: string; name: string; reason: string }> = [];

    for (const line of historical) {
      const product = byId.get(line.productId);
      if (!product || !product.isAvailable) {
        unavailable.push({ productId: line.productId, name: line.name, reason: 'no longer sold' });
        continue;
      }
      const variant = ((product.weightVariants as any[]) ?? []).find(
        (v) => v.weight === line.weight,
      );
      if (!variant) {
        unavailable.push({
          productId: line.productId,
          name: product.name ?? '',
          reason: `"${line.weight}" discontinued`,
        });
        continue;
      }
      const stock = Number(variant.stock ?? 0);
      if (stock < 1) {
        unavailable.push({
          productId: line.productId,
          name: product.name ?? '',
          reason: 'out of stock',
        });
        continue;
      }
      items.push({
        productId: product.id,
        // The column is `nullable: true, default: ''` — applying its own
        // default is not inventing data.
        name: product.name ?? '',
        weight: line.weight,
        price: Number(variant.price),
        previousPrice: Number(line.price),
        priceChanged: Number(variant.price) !== Number(line.price),
        quantity: Math.min(Number(line.quantity) || 1, stock),
        requestedQuantity: Number(line.quantity) || 1,
      });
    }

    return {
      success: true,
      originalOrderId: orderId,
      storeId: order.storeId,
      items,
      itemCount: items.length,
      unavailable,
      message: unavailable.length
        ? `${items.length} item(s) ready — ${unavailable.length} no longer available.`
        : 'Items ready for checkout.',
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── DELIVERY PARTNER ASSIGNMENT ─────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════

  /** Auto-assign nearest delivery partner (publishes to delivery-service) */
  async assignDeliveryPartner(orderId: string) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);

    await this.kafka.publish('delivery.assign_partner', {
      orderId: order.id,
      storeId: order.storeId,
      deliveryAddress: order.deliveryAddress,
      orderType: 'grocery',
      priority: 'standard',
    });

    this.logger.log(`Delivery partner assignment requested for order ${orderId}`);
    return { success: true, orderId, message: 'Delivery partner assignment in progress' };
  }

  /**
   * Live tracking for an order.
   *
   * delivery-service publishes partner position into `grocery:tracking:<orderId>`;
   * until it does, the order's own status is the truth. The two are merged rather
   * than the cache being returned bare, because the cached blob has no status and
   * the caller needs both.
   */
  async getDeliveryTracking(orderId: string, requesterId?: string, requesterRole?: string) {
    const order = await this.orderRepo.findOne({ where: { id: orderId }, relations: ['store'] });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    this.assertOrderVisible(order, requesterId, requesterRole);

    const live = (await this.redis.getJson(`grocery:tracking:${orderId}`)) as Record<
      string,
      unknown
    > | null;

    return {
      orderId,
      orderNumber: order.orderNumber,
      status: order.status,
      estimatedDeliveryAt: order.estimatedDeliveryAt,
      deliveredAt: order.deliveredAt,
      storeName: order.store?.name ?? null,
      storeLocation: order.store
        ? { lat: Number(order.store.latitude), lng: Number(order.store.longitude) }
        : null,
      dropLocation: order.deliveryAddress
        ? { lat: order.deliveryAddress.lat, lng: order.deliveryAddress.lng }
        : null,
      partnerName: (live?.partnerName as string) ?? null,
      partnerPhone: (live?.partnerPhone as string) ?? null,
      partnerLocation: (live?.partnerLocation as unknown) ?? null,
      lastUpdated: (live?.lastUpdated as string) ?? new Date().toISOString(),
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── BULK EXPORT ──────────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Escape one CSV field.
   *
   * Two problems with the old inline `"${p.name}"`: a product name containing a
   * double quote or a comma shifted every following column, and a name beginning
   * `=`, `+`, `-` or `@` is executed as a formula when the export is opened in
   * Excel or Sheets. Prefixing with an apostrophe is the standard neutralisation.
   */
  private csvField(value: unknown): string {
    let s = value === null || value === undefined ? '' : String(value);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  }

  /** Export all products for a store as CSV */
  async exportProductsCsv(storeId: string) {
    try {
      const headers = [
        'ID',
        'Name',
        'Category',
        'SubCategory',
        'Brand',
        'Available',
        'Rating',
        'Barcode',
        'Variants',
      ];
      const products = await this.itemRepo.find({ where: { storeId } });
      if (!products.length) {
        // Header-only CSV rather than a 404 — an empty catalogue is a valid export.
        return {
          csv: headers.join(','),
          filename: `products-${storeId}-${Date.now()}.csv`,
          rowCount: 0,
        };
      }

      const rows = products.map((p) =>
        [
          p.id,
          p.name,
          p.category,
          p.subCategory || '',
          p.brand || '',
          p.isAvailable ? 'Yes' : 'No',
          p.rating?.toString() || '',
          p.barcode || '',
          JSON.stringify(p.weightVariants || []),
        ]
          .map((f) => this.csvField(f))
          .join(','),
      );

      const csv = [headers.join(','), ...rows].join('\n');
      return { csv, filename: `products-${storeId}-${Date.now()}.csv`, rowCount: products.length };
    } catch (err: any) {
      // Handing the seller an empty file is worse than an error — they would upload
      // it back as a "complete" catalogue.
      this.logger.error(`exportProductsCsv failed for ${storeId}: ${err.message}`);
      throw err;
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ── PRODUCT TRANSLATIONS ────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════

  /** Update product translation for a specific locale */
  async updateProductTranslation(storeId: string, productId: string, dto: ProductTranslationDto) {
    const product = await this.itemRepo.findOne({ where: { id: productId, storeId } });
    if (!product) throw new NotFoundException(`Product ${productId} not found`);

    const translations = (product as any).translations || {};
    translations[dto.locale] = { name: dto.name, description: dto.description };
    (product as any).translations = translations;

    const saved = await this.itemRepo.save(product);
    return { success: true, product: saved };
  }

  /** Get product with translations applied for a locale */
  async getProductTranslated(storeId: string, productId: string, locale: string) {
    const product = await this.itemRepo.findOne({ where: { id: productId, storeId } });
    if (!product) throw new NotFoundException(`Product ${productId} not found`);

    const translations = (product as any).translations;
    if (translations?.[locale]) {
      if (translations[locale].name) product.name = translations[locale].name;
      if (translations[locale].description) product.description = translations[locale].description;
    }

    return product;
  }
}
