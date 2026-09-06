import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  type EntityTarget,
  Repository,
  TreeRepository,
  ILike,
  In,
  IsNull,
  MoreThanOrEqual,
  SelectQueryBuilder,
} from 'typeorm';
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
import { MarketplaceFulfillmentService } from '../fulfillment/fulfillment.service';
import { PUBLIC_SELLER_FIELDS, INVOICE_SELLER_FIELDS } from '../entities/seller.public-fields';
import { type ProductFilter } from '../types/marketplace.types';

/**
 * CatalogService — public, read-only view of the Marketplace catalogue.
 *
 * This is the module's highest-traffic surface (storefront browse, search, product
 * pages) and the exact set of operations marketplace.proto exposes over gRPC, so it
 * is kept separate from the write/admin paths: it can be reasoned about, cached and
 * scaled on its own, and MarketplaceGrpcController maps onto it one-to-one.
 *
 * Everything here is a read. Catalogue mutations (create/approve/suspend) stay with
 * the admin surface, which owns the events those changes emit.
 */
@Injectable()
export class CatalogService {
  private readonly logger = new Logger(CatalogService.name);

  constructor(
    private readonly redis: RedisService,
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    @InjectRepository(Seller) private readonly sellerRepo: Repository<Seller>,
    @InjectRepository(Category) private readonly categoryRepo: TreeRepository<Category>,
    @InjectRepository(Brand) private readonly brandRepo: Repository<Brand>,
    @InjectRepository(ProductListing) private readonly listingRepo: Repository<ProductListing>,
    @InjectRepository(ProductImage) private readonly imageRepo: Repository<ProductImage>,
    @InjectRepository(Review) private readonly reviewRepo: Repository<Review>,
    @InjectRepository(ProductVariant) private readonly variantRepo: Repository<ProductVariant>,
    @InjectRepository(ProductAttribute)
    private readonly attributeRepo: Repository<ProductAttribute>,
    @InjectRepository(FlashDealNomination)
    private readonly nominationRepo: Repository<FlashDealNomination>,
    /**
     * Price-drop alerts are checked from inside `recomputeBuyBox` — see the note
     * there. Injected lazily because both services live in this module and the
     * direction (catalogue reaching a post-purchase service) would otherwise be
     * resolved before the fulfilment provider exists.
     */
    @Inject(forwardRef(() => MarketplaceFulfillmentService))
    private readonly fulfillment: MarketplaceFulfillmentService,
  ) {}

  // ── Category attributes ─────────────────────────────────────────────────────

  /**
   * The attribute schema a category's products are described and varied by.
   *
   * This is the contract between the three surfaces that must agree on what a
   * variant *is*: the admin panel authors it, the seller portal renders the
   * product form and the variant matrix from it, and the storefront draws the
   * pickers, swatches and filter facets from it. Before this existed each of the
   * three carried its own hard-coded copy, so a colour an admin added never
   * reached a seller, and a size a seller typed never became a filter.
   *
   * Attributes with no `categoryId` are global and apply to every category, and a
   * subcategory inherits its ancestors' — otherwise every child of "Fashion"
   * would have to re-declare Size and Colour.
   */
  async getCategoryAttributes(idOrSlug?: string) {
    let categoryIds: string[] = [];
    let category: Category | null = null;

    if (idOrSlug) {
      const byId = CatalogService.UUID_RE.test(idOrSlug);
      category = await this.categoryRepo.findOne({
        where: byId ? { id: idOrSlug } : { slug: idOrSlug },
      });
      if (!category) throw new NotFoundException(`Category ${idOrSlug} not found`);
    }

    // Keyed on the resolved id, never on the caller's identifier. This route is
    // addressable by uuid *and* by slug, so keying on the parameter gave one
    // category two independent cache entries — and the admin path can only
    // invalidate by id, so a schema change made from the panel stayed invisible
    // to every slug-addressed reader (which is all of them) until the TTL ran
    // out.
    const cacheKey = `marketplace:category-attributes:${category?.id ?? 'all'}`;
    const cached = await this.redis.getJson(cacheKey);
    if (cached) return cached;

    if (category) {
      // Ancestors included so a subcategory inherits the parent's schema. The
      // tree call is wrapped because the closure table is absent on deployments
      // that never ran a tree sync — inheriting nothing is recoverable, a 500
      // on every product form is not.
      const ancestors = await this.categoryRepo.findAncestors(category).catch(() => [category!]);
      categoryIds = ancestors.map((c) => c.id);
    }

    const rows = await this.attributeRepo.find({
      where: categoryIds.length
        ? // `IsNull()` is the global set — attributes that apply everywhere.
          [
            { isActive: true, categoryId: In(categoryIds) },
            { isActive: true, categoryId: IsNull() },
          ]
        : { isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });

    // A child's own definition wins over the one it inherited: "Size" on
    // Footwear should replace, not duplicate, "Size" on Fashion. Sorted
    // most-specific-last so the later write is the more specific one.
    const bySlug = new Map<string, ProductAttribute>();
    const depth = (a: ProductAttribute) =>
      a.categoryId ? categoryIds.indexOf(a.categoryId) : Number.MAX_SAFE_INTEGER;
    for (const attr of [...rows].sort((a, b) => depth(b) - depth(a))) {
      bySlug.set(attr.slug, attr);
    }
    const data = [...bySlug.values()].sort(
      (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
    );

    const result = {
      category: category ? { id: category.id, name: category.name, slug: category.slug } : null,
      data,
      total: data.length,
      variantAxes: data.filter((a) => a.isVariantAxis).map((a) => a.slug),
    };
    await this.redis.setJson(cacheKey, result, 300);
    return result;
  }

  // ── Region scoping ──────────────────────────────────────────────────────────

  /**
   * Schema-qualified table name for an entity, e.g. `marketplace.sellers`.
   *
   * Raw SQL fragments must never name a table bare. TypeORM qualifies the tables
   * it generates with the connection's configured `schema` (`marketplace`), but a
   * hand-written subquery is passed through verbatim and resolves against the
   * session `search_path` — which is still `"$user", public`. Every region
   * predicate below therefore probed the empty `public.product_listings` /
   * `public.sellers` tables instead of the marketplace ones, matched nothing, and
   * filtered out the entire catalogue on any region-scoped request. Since the
   * gateway always resolves a region, that was every storefront listing request.
   */
  private tableOf(entity: EntityTarget<any>): string {
    return this.productRepo.manager.connection.getMetadata(entity).tablePath;
  }

  /**
   * SQL predicate matching products offered in a region.
   *
   * A product belongs to a region when a seller registered there has an active
   * listing on it, or when the product's own seller is registered there (the
   * single-seller case, where no listing row is created).
   *
   * Sellers whose `region_code` is NULL are treated as available everywhere.
   * That column is nullable precisely so existing rows could be backfilled, and
   * a strict match would make the storefront look empty on any deployment where
   * the backfill has not run — an outage, not a filter.
   *
   * Identifiers are quoted because TypeORM's default naming strategy keeps
   * entity property casing, and Postgres folds unquoted names to lower case:
   * `pl.isActive` would reach the planner as `pl.isactive` and error.
   */
  private regionPredicate(): string {
    const listings = this.tableOf(ProductListing);
    const sellers = this.tableOf(Seller);
    return `(
    EXISTS (
      SELECT 1 FROM ${listings} pl
      JOIN ${sellers} sl ON sl.id = pl.seller_id
      WHERE pl.product_id = p.id
        AND pl."isActive" = true
        AND pl."approvalStatus" = 'APPROVED'
        AND (sl.region_code = :regionCode OR sl.region_code IS NULL)
    )
    OR EXISTS (
      SELECT 1 FROM ${sellers} sp
      WHERE sp.id = p.seller_id
        AND (sp.region_code = :regionCode OR sp.region_code IS NULL)
    )
  )`;
  }

  /**
   * True when the product is offered by a seller registered in the region.
   *
   * Selected as a sort key so local sellers rank above cross-border ones —
   * `ORDER BY is_local DESC` puts a Doha seller's listing ahead of an identical
   * imported one before any relevance or rating tie-break is applied.
   */
  private localSellerExpr(): string {
    return `(
    EXISTS (
      SELECT 1 FROM ${this.tableOf(ProductListing)} pll
      JOIN ${this.tableOf(Seller)} sll ON sll.id = pll.seller_id
      WHERE pll.product_id = p.id AND pll."isActive" = true AND pll."approvalStatus" = 'APPROVED'
        AND sll."isActive" = true AND sll."verificationStatus" <> 'SUSPENDED'
        AND sll.region_code = :regionCode
    )
  )`;
  }

  /** Restrict a product query to one region. No-op when no region is given. */
  private scopeToRegion(
    qb: SelectQueryBuilder<Product>,
    region?: string,
  ): SelectQueryBuilder<Product> {
    if (!region) return qb;
    return qb.andWhere(this.regionPredicate(), { regionCode: region.toUpperCase() });
  }

  /**
   * Rank products from local sellers first.
   *
   * Must be called before any other `orderBy`, since the first sort key wins.
   * Returns the caller's builder so ordering reads in priority order.
   */
  private rankLocalFirst(
    qb: SelectQueryBuilder<Product>,
    region?: string,
  ): SelectQueryBuilder<Product> {
    if (!region) return qb;
    return qb
      .addSelect(this.localSellerExpr(), 'is_local')
      .setParameter('regionCode', region.toUpperCase())
      .orderBy('is_local', 'DESC');
  }

  /** Region suffix for a cache key. Without it one region's feed is served to another. */
  private regionKey(region?: string): string {
    return region ? region.toUpperCase() : 'global';
  }

  /**
   * SQL for the price a customer would actually pay for a product.
   *
   * The buy-box listing's `sellingPrice`, falling back to `mrp` for a product
   * with no active listing yet (which still belongs in the catalogue, it just
   * has no offer on it).
   *
   * A correlated subquery rather than the joined `listings` alias: `p.listings`
   * is one-to-many, so ordering or filtering on the joined column would compare
   * against whichever row the planner happened to produce and multiply the
   * result set. This collapses to exactly one price per product, chosen by the
   * same rule `priceOrderItems` uses at checkout — buy-box winner first, then
   * cheapest.
   */
  private payablePriceExpr(): string {
    return `COALESCE(
      (SELECT pl2."sellingPrice"
         FROM ${this.tableOf(ProductListing)} pl2
        WHERE pl2.product_id = p.id
          AND pl2."isActive" = true
          AND pl2."approvalStatus" = 'APPROVED'
        ORDER BY pl2."isBuyBoxWinner" DESC, pl2."sellingPrice" ASC
        LIMIT 1),
      p.mrp
    )`;
  }

  /**
   * The predicate that makes one seller's offer visible and buyable.
   *
   * Both halves are required and they mean different things: `isActive` is the
   * seller's own switch, `approvalStatus` is the platform's decision. Every read
   * used to test only the first, which was safe only while listings could not
   * exist without a product approval behind them. Now that a second seller can
   * offer on an already-approved product, an unmoderated offer would otherwise be
   * priced, sorted and sold like any other.
   *
   * Query-builder path syntax (`alias.property`), for join conditions and
   * `andWhere`. The raw-SQL form is inlined in {@link payablePriceExpr}, which
   * runs as a correlated subquery outside the builder's alias map.
   */
  private static liveListing(alias: string): string {
    return `${alias}.isActive = true AND ${alias}.approvalStatus = 'APPROVED'`;
  }

  /** Object form of {@link liveListing}, for repository `where` clauses. */
  private static readonly LIVE_LISTING = { isActive: true, approvalStatus: 'APPROVED' } as const;

  /**
   * Real product/review/rating figures for a set of sellers.
   *
   * `sellers.total_products`, `total_reviews`, `total_orders` and `seller_rating`
   * are denormalised columns that **nothing in the codebase ever writes** — they
   * hold whatever the seed inserted and drift from that moment on. The seed store
   * advertised 40 products and 1 250 reviews at 4.8★ while its catalogue actually
   * held 178 live listings and no reviews at all, and those columns are what the
   * storefront's seller cards and store pages render. Shoppers were reading
   * invented social proof.
   *
   * Computed here at read time rather than backfilled, because a backfill would
   * be stale again after the next order: nothing maintains the columns, so no
   * one-off correction survives. Two grouped queries cover any number of sellers,
   * so the list endpoints stay a fixed cost rather than N+1.
   */
  private async sellerStats(
    sellerIds: string[],
  ): Promise<Map<string, { products: number; reviews: number; rating: number }>> {
    const stats = new Map<string, { products: number; reviews: number; rating: number }>();
    if (!sellerIds.length) return stats;

    // `isActive` and `approvalStatus` are quoted camelCase columns while the
    // foreign keys are snake_case, so these are referenced through the entity
    // properties (`l.isActive`) and TypeORM quotes them correctly. Writing them
    // as `l.is_active` raises "column does not exist" — and an earlier draft of
    // this method swallowed that with a `.catch(() => [])`, which turned a broken
    // query into a confident zero on every seller card. No catch here on purpose:
    // if this query breaks, the request should fail loudly rather than quietly
    // report that every store has nothing in it.
    const [productRows, reviewRows] = await Promise.all([
      this.listingRepo
        .createQueryBuilder('l')
        .select('l.seller_id', 'sellerId')
        .addSelect('COUNT(DISTINCT l.product_id)', 'products')
        .where('l.seller_id IN (:...ids)', { ids: sellerIds })
        .andWhere('l.isActive = true')
        .andWhere("l.approvalStatus = 'APPROVED'")
        .groupBy('l.seller_id')
        .getRawMany(),
      this.reviewRepo
        .createQueryBuilder('r')
        .select('l.seller_id', 'sellerId')
        .addSelect('COUNT(DISTINCT r.id)', 'reviews')
        .addSelect('AVG(r.rating)', 'rating')
        .innerJoin(ProductListing, 'l', 'l.product_id = r.product_id')
        .where('l.seller_id IN (:...ids)', { ids: sellerIds })
        .andWhere('l.isActive = true')
        .andWhere("l.approvalStatus = 'APPROVED'")
        .andWhere("r.status = 'PUBLISHED'")
        .groupBy('l.seller_id')
        .getRawMany(),
    ]);

    for (const id of sellerIds) stats.set(id, { products: 0, reviews: 0, rating: 0 });
    for (const row of productRows) {
      const s = stats.get(row.sellerId);
      if (s) s.products = Number(row.products ?? 0);
    }
    for (const row of reviewRows) {
      const s = stats.get(row.sellerId);
      if (!s) continue;
      s.reviews = Number(row.reviews ?? 0);
      s.rating = Math.round(Number(row.rating ?? 0) * 10) / 10;
    }
    return stats;
  }

  /** Overwrite the unmaintained counters on a seller row with {@link sellerStats}. */
  private async withRealCounters<T extends { id: string }>(sellers: T[]): Promise<T[]> {
    const stats = await this.sellerStats(sellers.map((s) => s.id));
    return sellers.map((s) => {
      const st = stats.get(s.id);
      if (!st) return s;
      return {
        ...s,
        totalProducts: st.products,
        totalReviews: st.reviews,
        sellerRating: st.rating,
      };
    });
  }

  // ── Categories ──────────────────────────────────────────────────────────────
  /**
   * The full category list, with each row's place in the tree attached.
   *
   * `find()` on a tree entity loads neither `parent` nor `children`, so every
   * row came back with no way to tell a top-level category from a subcategory.
   * The storefront consumes this list for its header rail and its "Shop by
   * Category" grid, and with the hierarchy missing both rendered all 113 rows
   * flat — "Mobiles & Tablets" sitting beside "Smartphones", "Cases & Covers"
   * and "Diapers" as though they were peers, under a heading that claimed 20.
   * The data was never the problem: 93 of the 113 rows have a `parent_id`.
   *
   * `productCount` is counted on the column products actually populate for that
   * level — `category_id` for a root, `subcategory_id` for a child — because
   * counting the wrong one reports 0 for half the tree.
   */
  async getCategories() {
    const cached = await this.redis.getJson('marketplace:categories');
    if (cached) return cached;

    const trees = await this.categoryRepo.findTrees({ relations: ['children'] });
    const flat = await this.categoryRepo.find({
      where: { is_active: true },
      order: { sort_order: 'ASC' },
      relations: { parent: true },
    });

    const counts = await this.categoryProductCounts();
    const data = flat.map(({ parent, ...c }) => ({
      ...c,
      parentId: parent?.id ?? null,
      parentSlug: parent?.slug ?? null,
      isSubcategory: !!parent,
      imageUrl: c.image ?? null,
      productCount: counts.get(c.id) ?? 0,
    }));

    const result = { data, total: data.length, tree: trees };
    await this.redis.setJson('marketplace:categories', result, 300);
    return result;
  }

  /** Live product count per category id, across both levels of the tree. */
  private async categoryProductCounts(): Promise<Map<string, number>> {
    const products = this.tableOf(Product);
    const rows: Array<{ id: string; count: string }> = await this.productRepo
      .query(
        `
      SELECT id, SUM(count)::bigint AS count FROM (
        SELECT category_id    AS id, COUNT(*) AS count FROM ${products} WHERE category_id    IS NOT NULL GROUP BY category_id
        UNION ALL
        SELECT subcategory_id AS id, COUNT(*) AS count FROM ${products} WHERE subcategory_id IS NOT NULL GROUP BY subcategory_id
      ) t GROUP BY id
    `,
      )
      .catch((e: unknown) => {
        // A counting failure must not take the category navigation down with it.
        this.logger.warn(`Category product counts unavailable: ${(e as Error)?.message}`);
        return [] as Array<{ id: string; count: string }>;
      });
    return new Map(rows.map((r) => [r.id, Number(r.count) || 0]));
  }

  async getCategoryById(idOrSlug: string) {
    // Resolved with its parent loaded: the storefront addresses *both* levels of
    // the tree through /marketplace/category/:slug, and a subcategory reached
    // that way has to be filtered by `subcategory_id`. Without `parent` in the
    // response the caller cannot tell the two apart and filtered every slug as a
    // top-level category — which matches no product, since products carry the
    // parent in `category_id` and the child in `subcategory_id`.
    const category = await this.resolveCategory(idOrSlug);
    if (!category) throw new NotFoundException(`Category ${idOrSlug} not found`);
    const children = await this.categoryRepo.findDescendants(category);
    const isSubcategory = !!category.parent;
    // Count on the column the products actually populate for this level.
    const productCount = await this.productRepo.count({
      where: isSubcategory
        ? { subcategory: { id: category.id } }
        : { category: { id: category.id } },
    });
    return {
      ...category,
      subcategories: children.filter((c) => c.id !== category.id),
      isSubcategory,
      parent: category.parent
        ? { id: category.parent.id, name: category.parent.name, slug: category.parent.slug }
        : null,
      productCount,
    };
  }

  // ── Subcategories ───────────────────────────────────────────────────────────
  async getSubcategories(categoryIdOrSlug?: string) {
    if (!categoryIdOrSlug) {
      // `{ parent: { id: undefined } }` is not "parent is null" — TypeORM drops a
      // relation condition whose every field is undefined, so this returned the
      // whole flat category list, subcategories included. Roots need IsNull().
      const all = await this.categoryRepo
        .find({ where: { parent: IsNull() }, order: { sort_order: 'ASC' } })
        .catch((): unknown[] => []);
      return { data: all, total: all.length };
    }
    const parent = await this.resolveCategory(categoryIdOrSlug);
    if (!parent) return { data: [], total: 0, categoryId: categoryIdOrSlug };
    const children = await this.categoryRepo.findDescendants(parent);
    const subs = children.filter((c) => c.id !== parent.id);
    return { data: subs, total: subs.length, categoryId: parent.id };
  }

  /** A category addressed by either its UUID or its unique `slug`. */
  private resolveCategory(idOrSlug: string) {
    const byId = CatalogService.UUID_RE.test(idOrSlug);
    return this.categoryRepo.findOne({
      where: byId ? { id: idOrSlug } : { slug: idOrSlug },
      relations: { parent: true },
    });
  }

  async getSubcategoryById(idOrSlug: string) {
    // Storefront URLs are slugs (`/marketplace/subcategory/laptops`), never UUIDs,
    // so a UUID-only lookup 404'd on every real request and the page fell back to
    // a title de-slugged from the URL with no parent breadcrumb.
    const sub = await this.resolveCategory(idOrSlug);
    if (!sub) throw new NotFoundException(`Subcategory ${idOrSlug} not found`);
    // Products of a subcategory hang off `subcategory_id`; counting `category_id`
    // reported 0 for every subcategory.
    const productCount = await this.productRepo.count({ where: { subcategory: { id: sub.id } } });
    return {
      ...sub,
      parentCategoryId: sub.parent?.slug || sub.parent?.id || '',
      parent: sub.parent
        ? { id: sub.parent.id, name: sub.parent.name, slug: sub.parent.slug }
        : null,
      productCount,
    };
  }

  /**
   * The seller account a signed-in user owns, if any.
   *
   * Resolution is strictly on `owner_id` — deliberately not on a matching email.
   * The seller portal needs to turn "who is signed in" into "which seller row",
   * and it previously did so with a hard-coded `SLR-9201` demo id, so every
   * portal request asked for a seller that does not exist and was refused by
   * `SellerOwnershipGuard`.
   *
   * Returns `null` rather than throwing: having no seller account is a normal
   * state for a customer, not an error. A row whose `owner_id` was never
   * populated is unreachable by design — the guard fails closed on it too — and
   * needs the backfill in `scripts/maintenance/backfill-seller-owner.ts`.
   */
  async getSellerByOwner(ownerId: string) {
    if (!ownerId || !CatalogService.UUID_RE.test(ownerId)) return null;
    const seller = await this.sellerRepo.findOne({
      select: {
        ...CatalogService.PUBLIC_SELLER_FIELDS,
        // The owner's own account, so contact details are theirs to see. Still
        // no bank or tax columns: the portal has a dedicated settings read for
        // those and this response reaches every page of it.
        email: true,
        phone: true,
        ownerName: true,
        kycStatus: true,
      },
      where: { ownerId } as any,
    });
    return seller ?? null;
  }

  // ── Order pricing ───────────────────────────────────────────────────────────

  /**
   * Resolve the authoritative unit price for a set of order lines.
   *
   * Checkout must never price an order from numbers the client sent — the old
   * order path computed `subtotal` from `items[].price` straight off the request
   * body, so anyone posting `price: 1` bought an iPhone for one rupee. The price
   * a customer actually pays is the **buy-box listing's** `sellingPrice`, not the
   * product's `mrp` (which is the list price and is usually higher), so that is
   * what is resolved here.
   *
   * Every line is checked, not just priced: an unknown product, an inactive
   * product, one with no active listing, or one with insufficient stock comes
   * back as `ok: false` with a reason, and the caller refuses the order. Callers
   * must treat a partially-priced result as a failure — never as "price what we
   * can and continue".
   */
  async priceOrderItems(items: Array<{ productId: string; quantity: number; variantId?: string }>) {
    const lines = Array.isArray(items) ? items : [];
    if (lines.length === 0) {
      return { ok: false, reason: 'No items to price', items: [], subtotal: 0 };
    }

    const ids = [...new Set(lines.map((l) => String(l?.productId ?? '')))].filter((id) =>
      CatalogService.UUID_RE.test(id),
    );
    const products = ids.length ? await this.productRepo.find({ where: { id: In(ids) } }) : [];
    const byId = new Map(products.map((p) => [p.id, p]));

    // One query for every line's listings rather than per-line round trips.
    const listings = ids.length
      ? await this.listingRepo.find({
          where: { product: { id: In(ids) }, ...CatalogService.LIVE_LISTING },
          // `seller` is a lazy ManyToOne, so without it here `listing.seller` is
          // undefined and the `sellerId` returned below was always null — which
          // meant a placed order could not be attributed to the seller who has to
          // fulfil it. It is the join key for the whole seller order projection.
          relations: ['product', 'seller'],
          order: { isBuyBoxWinner: 'DESC', sellingPrice: 'ASC' },
        })
      : [];
    const buyBox = new Map<string, ProductListing>();
    for (const listing of listings) {
      // A suspended or deactivated seller keeps its rows but may not trade:
      // the storefront hides them and checkout must not price them either.
      const seller = (listing as any).seller;
      if (seller && (seller.verificationStatus === 'SUSPENDED' || seller.isActive === false))
        continue;
      // Ordered buy-box-first, so the first listing seen for a product wins.
      const pid = (listing as any).product?.id;
      if (pid && !buyBox.has(pid)) buyBox.set(pid, listing);
    }

    // Every active variant of every product in the basket, one query. A product
    // that has variants must be ordered *by* variant: the parent listing's price
    // is not what any SKU sells for — the cart and the order used to charge it
    // regardless (QR 5,050 for a QR 115,900 iPhone configuration).
    const variants = ids.length
      ? await this.variantRepo.find({ where: { productId: In(ids), isActive: true } })
      : [];
    const variantsByProduct = new Map<string, ProductVariant[]>();
    for (const v of variants) {
      const bucket = variantsByProduct.get(v.productId) ?? [];
      bucket.push(v);
      variantsByProduct.set(v.productId, bucket);
    }

    let subtotal = 0;
    const priced = lines.map((line) => {
      const productId = String(line?.productId ?? '');
      const quantity = Math.trunc(Number(line?.quantity ?? 0));
      const product = byId.get(productId);
      const listing = buyBox.get(productId);

      const fail = (reason: string) => ({ productId, quantity, ok: false as const, reason });
      if (!Number.isFinite(quantity) || quantity <= 0) return fail('Invalid quantity');
      if (!product) return fail('Product not found');
      if (product.is_active === false) return fail('Product is not available');
      if (product.approval_status !== 'APPROVED') return fail('Product is not available');
      if (!listing) return fail('This seller is not accepting orders right now');

      const variantId = String(line?.variantId ?? '');
      const productVariants = variantsByProduct.get(productId) ?? [];
      let variant: ProductVariant | undefined;
      if (variantId) {
        variant = productVariants.find((v) => v.id === variantId);
        if (!variant) return fail('Selected option is not available');
      } else if (productVariants.length > 0) {
        return fail('Please choose an option (size, colour…) for this product');
      }

      const unitPrice = Number(variant ? variant.sellingPrice : listing.sellingPrice);
      if (!Number.isFinite(unitPrice) || unitPrice <= 0) return fail('Product has no valid price');
      const available = variant ? Number(variant.stockQuantity) : listing.stockQuantity;
      if (available < quantity) {
        return fail(`Only ${available} left in stock`);
      }

      const lineTotal = Math.round(unitPrice * quantity * 100) / 100;
      subtotal += lineTotal;
      return {
        productId,
        quantity,
        ok: true as const,
        unitPrice,
        lineTotal,
        listingId: listing.id,
        sellerId: (listing as any).seller?.id ?? null,
        name: variant?.variantName ? `${product.name} — ${variant.variantName}` : product.name,
        mrp: Number(variant?.mrp ?? product.mrp) || 0,
        variantId: variant?.id ?? null,
        variantName: variant?.variantName ?? null,
      };
    });

    const bad = priced.find((l): l is Extract<typeof l, { ok: false }> => !l.ok);
    return {
      ok: !bad,
      reason: bad ? `${bad.reason} (${bad.productId})` : null,
      items: priced,
      subtotal: Math.round(subtotal * 100) / 100,
    };
  }

  /**
   * Take the stock a checkout is about to sell, atomically.
   *
   * Two defects made this necessary.
   *
   * **Stock never moved at all.** The only decrement in the module lived in
   * `SellerService.createSellerOrders`, guarded by `if (!line.listingId) continue`
   * — and the gateway built its `items` array without `listingId`, so the loop
   * skipped every line of every order. A seller with one unit sold it without
   * limit and the low-stock dashboards never left their seeded values.
   *
   * **The check and the decrement were in different places.** `priceOrderItems`
   * verifies `stockQuantity >= quantity`; the decrement then ran later, after the
   * order row was already committed, as `GREATEST(stock - n, 0)` — a clamp that
   * turns an oversell into a silent zero rather than a refusal. Two customers
   * racing for the last unit both got an order.
   *
   * So the reservation is conditional (`WHERE "stockQuantity" >= :quantity`) and
   * happens *before* the order is placed. Losing the race means `affected === 0`,
   * which fails the checkout with nothing written. Every line is taken in one
   * transaction, so a basket either reserves whole or not at all — a partial
   * reservation would leave the customer's other items held against an order that
   * was never created.
   *
   * Lines are ordered by listing id before locking. Two baskets holding the same
   * two listings in opposite orders would otherwise deadlock on the second row.
   */
  async reserveListingStock(
    lines: Array<{ listingId?: string; productId?: string; quantity: number; variantId?: string }>,
  ): Promise<{
    ok: boolean;
    reason: string | null;
    reserved: Array<{ listingId: string; quantity: number; variantId?: string }>;
  }> {
    const wanted = (Array.isArray(lines) ? lines : [])
      .map((l) => ({
        listingId: String(l?.listingId ?? ''),
        productId: String(l?.productId ?? ''),
        variantId: String(l?.variantId ?? ''),
        quantity: Math.trunc(Number(l?.quantity ?? 0)),
      }))
      .filter((l) => l.listingId && l.quantity > 0)
      .sort((a, b) => a.listingId.localeCompare(b.listingId));

    if (wanted.length === 0) {
      // Not an error: a basket whose lines carry no listing id has nothing to
      // hold. It still cannot be priced, so `priceOrderItems` has already
      // refused it — this is only reached by callers that skipped pricing.
      return { ok: true, reason: null, reserved: [] };
    }

    try {
      const result = await this.listingRepo.manager.transaction(async (mgr) => {
        const reserved: Array<{ listingId: string; quantity: number; variantId?: string }> = [];

        for (const line of wanted) {
          const result = await mgr
            .createQueryBuilder()
            .update(ProductListing)
            .set({ stockQuantity: () => `"stockQuantity" - :quantity` })
            .where('id = :id', { id: line.listingId })
            .andWhere('"isActive" = true')
            .andWhere('"stockQuantity" >= :quantity')
            .setParameter('quantity', line.quantity)
            .execute();

          if (!result.affected) {
            // Throwing rolls back the lines already taken in this transaction.
            throw new BadRequestException(
              `Not enough stock for product ${line.productId || line.listingId}`,
            );
          }
          // The SKU holds its own count. Taking only the listing's aggregate let
          // a sold-out colour keep selling while the parent still showed stock.
          if (line.variantId) {
            const variantResult = await mgr
              .createQueryBuilder()
              .update(ProductVariant)
              .set({ stockQuantity: () => `"stockQuantity" - :quantity` })
              .where('id = :vid', { vid: line.variantId })
              .andWhere('"isActive" = true')
              .andWhere('"stockQuantity" >= :quantity')
              .setParameter('quantity', line.quantity)
              .execute();
            if (!variantResult.affected) {
              throw new BadRequestException(
                `Not enough stock for the selected option of ${line.productId || line.listingId}`,
              );
            }
          }
          reserved.push({
            listingId: line.listingId,
            quantity: line.quantity,
            ...(line.variantId ? { variantId: line.variantId } : {}),
          });
        }

        return { ok: true, reason: null as string | null, reserved };
      });

      // A sale that empties a listing has to surrender the buy box, or the
      // product keeps advertising a price that checkout will then refuse. Done
      // after the commit and best-effort: the stock is correctly taken either
      // way, and a stale flag self-corrects on the next recompute.
      await this.recomputeBuyBoxForSoldOut(result.reserved.map((r) => r.listingId));

      return result;
    } catch (e) {
      const reason = e instanceof BadRequestException ? e.message : 'Could not reserve stock';
      this.logger.warn(`Stock reservation refused: ${reason}`);
      return { ok: false, reason, reserved: [] };
    }
  }

  /** Recompute the buy box for any of these listings that just hit zero stock. */
  private async recomputeBuyBoxForSoldOut(listingIds: string[]): Promise<void> {
    if (listingIds.length === 0) return;

    try {
      const emptied = await this.listingRepo.find({
        where: { id: In(listingIds), stockQuantity: 0 },
        relations: ['product'],
      });

      const productIds = [
        ...new Set(emptied.map((l) => (l as any).product?.id).filter(Boolean) as string[]),
      ];
      for (const productId of productIds) await this.recomputeBuyBox(productId);
    } catch (e) {
      this.logger.error(`Post-sale buy-box recompute failed: ${(e as Error)?.message}`);
    }
  }

  /**
   * Decide which of a product's offers wins the buy box.
   *
   * The winner is the offer a customer gets when they press Add to Cart without
   * choosing a seller — `priceOrderItems` charges it, the cart quotes it, and
   * `payablePriceExpr` sorts and filters on it. It is therefore the single most
   * consequential field on this table, and until now nothing ever recalculated
   * it: `addProduct` wrote `isBuyBoxWinner: true` on creation and no code path
   * touched it again. A seller could raise their price, deactivate the offer or
   * sell out entirely and still hold the buy box.
   *
   * Eligibility is exactly buyability — approved, active, and actually in stock.
   * Selling out has to surrender the box, or the product keeps advertising a
   * price that `priceOrderItems` will refuse at checkout.
   *
   * Ranking, in order:
   *
   *   1. lowest selling price — the customer's interest, and what every
   *      marketplace leads with
   *   2. fulfilled by KartSeek — we control the delivery promise
   *   3. seller rating — a tie on price goes to the better-performing merchant
   *   4. oldest listing — a stable, arbitrary tie-break so the winner does not
   *      oscillate between two identical offers on every recompute
   *
   * Runs in one statement per outcome rather than a read-then-write loop: two
   * concurrent recomputes (a price change racing a stock update) would otherwise
   * interleave and leave either two winners or none.
   */
  async recomputeBuyBox(
    productId: string,
  ): Promise<{ productId: string; winnerId: string | null }> {
    if (!productId) return { productId, winnerId: null };

    const listings = this.tableOf(ProductListing);
    const sellers = this.tableOf(Seller);

    try {
      const [winner]: Array<{ id: string }> = await this.listingRepo.query(
        `SELECT pl.id
           FROM ${listings} pl
           LEFT JOIN ${sellers} s ON s.id = pl.seller_id
          WHERE pl.product_id = $1
            AND pl."isActive" = true
            AND pl."approvalStatus" = 'APPROVED'
            AND pl."stockQuantity" > 0
          ORDER BY pl."sellingPrice" ASC,
                   pl."isFulfilledByKartseek" DESC,
                   COALESCE(s."sellerRating", 0) DESC,
                   pl."createdAt" ASC
          LIMIT 1`,
        [productId],
      );

      const winnerId = winner?.id ?? null;

      // Clear first, then set — never the other way round. A crash between the
      // two statements leaves the product with no buy box (it falls back to
      // `mrp` and reads as "no offer"), which is recoverable. The reverse order
      // would leave two winners, and every read takes the first row it sees.
      await this.listingRepo.query(
        `UPDATE ${listings} SET "isBuyBoxWinner" = false
          WHERE product_id = $1 AND "isBuyBoxWinner" = true${winnerId ? ' AND id <> $2' : ''}`,
        winnerId ? [productId, winnerId] : [productId],
      );

      if (winnerId) {
        await this.listingRepo.query(
          `UPDATE ${listings} SET "isBuyBoxWinner" = true WHERE id = $1 AND "isBuyBoxWinner" = false`,
          [winnerId],
        );
      }

      /**
       * Price-drop alerts are checked here, not at the call sites.
       *
       * This method is the single chokepoint for "the price a shopper would pay
       * may have changed" — seven places across three services call it after a
       * listing edit, a stock change, a sale or an approval. Hooking each of
       * them would mean the next one added silently stops firing alerts, which
       * is the same reasoning the ownership checks give for living in the
       * service rather than the gateway.
       *
       * Deliberately not awaited into the caller's failure path: a shopper's
       * notification must never be the reason a seller's price edit fails.
       */
      void this.fulfillment
        .sweepPriceAlerts(productId)
        .catch((e: unknown) =>
          this.logger.error(
            `Price-alert sweep failed for product ${productId}: ${(e as Error)?.message}`,
          ),
        );

      return { productId, winnerId };
    } catch (e) {
      // A recompute failure must not fail the price change or stock update that
      // triggered it — the listing edit itself is already committed and correct.
      // The stale flag is visible and self-corrects on the next recompute.
      this.logger.error(
        `Buy-box recompute failed for product ${productId} — the winner may be stale: ${(e as Error)?.message}`,
      );
      return { productId, winnerId: null };
    }
  }

  /**
   * Hand reserved stock back.
   *
   * The compensating half of {@link reserveListingStock}, for when the order the
   * stock was held for does not survive — order-service refusing it, or the
   * gateway unwinding a checkout whose gift card could not be debited. Without
   * this the units are held against an order nobody can buy or cancel.
   *
   * Deliberately best-effort and never throwing: it runs on a path that is
   * already failing, and turning a release error into the customer's error would
   * replace an honest "we could not place your order" with a confusing one. A
   * failure here leaves stock understated, which is safe — it under-sells rather
   * than over-sells — and is logged loudly so it can be reconciled.
   */
  async releaseListingStock(
    lines: Array<{ listingId?: string; quantity: number; variantId?: string }>,
  ): Promise<{ released: number }> {
    let released = 0;

    for (const line of Array.isArray(lines) ? lines : []) {
      const listingId = String(line?.listingId ?? '');
      const variantId = String(line?.variantId ?? '');
      const quantity = Math.trunc(Number(line?.quantity ?? 0));
      if (!listingId || quantity <= 0) continue;

      try {
        await this.listingRepo
          .createQueryBuilder()
          .update(ProductListing)
          .set({ stockQuantity: () => `"stockQuantity" + :quantity` })
          .where('id = :id', { id: listingId })
          .setParameter('quantity', quantity)
          .execute();
        if (variantId) {
          await this.variantRepo
            .createQueryBuilder()
            .update(ProductVariant)
            .set({ stockQuantity: () => `"stockQuantity" + :quantity` })
            .where('id = :id', { id: variantId })
            .setParameter('quantity', quantity)
            .execute();
        }
        released += 1;
      } catch (e) {
        this.logger.error(
          `Could not release ${quantity} unit(s) on listing ${listingId} — stock is understated until reconciled: ${(e as Error)?.message}`,
        );
      }
    }

    return { released };
  }

  // ── Products ────────────────────────────────────────────────────────────────
  async getProducts(page = 1, limit = 20, filter?: ProductFilter) {
    const region = filter?.country;
    const cacheKey = `products:${JSON.stringify(filter || {})}:${page}:${limit}`;
    const cached = await this.redis.getJson(cacheKey);
    if (cached) return cached;

    const qb = this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.brand', 'brand')
      .leftJoinAndSelect('p.category', 'category')
      .leftJoinAndSelect('p.images', 'images')
      // Left, not inner: a product with no active listing still belongs in the
      // catalogue, it just has no selling price to show yet.
      .leftJoinAndSelect('p.listings', 'listings', CatalogService.liveListing('listings'))
      .where('p.is_active = :active', { active: true })
      .andWhere('p.approval_status = :approved', { approved: 'APPROVED' });

    // Only products a seller in this region actually offers.
    this.scopeToRegion(qb, region);

    if (filter?.category) qb.andWhere('category.slug = :catSlug', { catSlug: filter.category });
    if (filter?.subcategory) {
      // `subcategory` is a ManyToOne relation, not an embedded column, so its
      // columns are unreachable until it is joined — 'p.subcategory.slug' does
      // not resolve and breaks the query. Joined only when the filter is
      // actually supplied, so the common listing path is unchanged on schemas
      // missing subcategory_id (see the fallback in getProductById).
      qb.leftJoin('p.subcategory', 'subcategory').andWhere('subcategory.slug = :subSlug', {
        subSlug: filter.subcategory,
      });
    }
    if (filter?.brand) qb.andWhere('brand.slug = :brandSlug', { brandSlug: filter.brand });
    if (filter?.seller) qb.andWhere('p.seller_id = :sellerId', { sellerId: filter.seller });

    // Price filters and price sorting run against what the customer actually
    // pays, not `mrp`.
    //
    // `mrp` is the struck-through list price; the payable figure is the buy-box
    // listing's `sellingPrice`, which is what `priceOrderItems` charges at
    // checkout. Filtering on `mrp` excluded products that are inside the
    // requested range — a product at mrp 210 / payable 178 was dropped by
    // `maxPrice=200` — and `sort=price_asc` returned an order that did not match
    // the prices on the cards, because discount depth varies per listing.
    const payable = this.payablePriceExpr();
    if (filter?.minPrice) qb.andWhere(`${payable} >= :minPrice`, { minPrice: filter.minPrice });
    if (filter?.maxPrice) qb.andWhere(`${payable} <= :maxPrice`, { maxPrice: filter.maxPrice });

    // Sorting. Local sellers rank first, then the requested order — a customer
    // asking for "price: low to high" still sees the cheapest *local* offers at
    // the top rather than a page of cross-border listings.
    this.rankLocalFirst(qb, region);
    const addOrder = region
      ? (field: string, dir: 'ASC' | 'DESC') => qb.addOrderBy(field, dir)
      : (field: string, dir: 'ASC' | 'DESC') => qb.orderBy(field, dir);

    // Selected under a name so ORDER BY can reference it — orderBy() parses a
    // raw expression as a property path and fails with '"(COALESCE" alias was
    // not found'.
    if (filter?.sort === 'price_asc' || filter?.sort === 'price_desc') {
      qb.addSelect(payable, 'payable_price');
    }

    switch (filter?.sort) {
      case 'price_asc':
        addOrder('payable_price', 'ASC');
        break;
      case 'price_desc':
        addOrder('payable_price', 'DESC');
        break;
      case 'rating':
        addOrder('p.averageRating', 'DESC');
        break;
      case 'newest':
        addOrder('p.created_at', 'DESC');
        break;
      // Volume-led, for the best-sellers feed. Reviews are only written against
      // verified purchases, so review count is the catalogue's closest standing
      // proxy for units sold; rating breaks the ties. Distinct from the default,
      // which leads on rating and would rank a single 5★ product above a
      // consistently-bought 4.5★ one.
      case 'popular':
        addOrder('p.reviewCount', 'DESC');
        qb.addOrderBy('p.averageRating', 'DESC');
        break;
      // Recent arrivals that have already picked up traction, for the trending
      // feed — a product added last year is not trending however well it sells.
      case 'trending':
        addOrder('p.created_at', 'DESC');
        qb.addOrderBy('p.reviewCount', 'DESC');
        break;
      default:
        addOrder('p.averageRating', 'DESC');
        qb.addOrderBy('p.reviewCount', 'DESC');
    }

    qb.skip((page - 1) * limit).take(limit);
    const [data, total] = await qb.getManyAndCount();
    await this.attachVariantAxes(data);
    const result = {
      data,
      total,
      page,
      limit,
      hasMore: total > page * limit,
      region: region ?? null,
    };
    await this.redis.setJson(cacheKey, result, 60);
    return result;
  }

  /**
   * Add `variantAxes` to listing rows so cards can show colour/size availability.
   *
   * Fetched as ONE query keyed on the page's product ids, not per row — the grid
   * asks for 48 products at a time and a per-product lookup would turn one
   * listing request into 49. Products with no variants are simply left without
   * the field rather than carrying an empty array around.
   *
   * Mutates in place: `data` holds the entity instances the caller is about to
   * serialise, so returning copies would drop the relations already joined.
   */
  async attachVariantAxes(data: any[]): Promise<void> {
    const ids = data.map((p) => p?.id).filter(Boolean);
    if (ids.length === 0) return;

    const variants = await this.variantRepo
      .find({ where: { productId: In(ids), isActive: true }, select: ['productId', 'attributes'] })
      .catch(() => [] as any[]);
    if (variants.length === 0) return;

    const byProduct = new Map<string, any[]>();
    for (const v of variants) {
      const list = byProduct.get(v.productId) ?? [];
      list.push(v);
      byProduct.set(v.productId, list);
    }
    for (const product of data) {
      const rows = byProduct.get(product.id);
      if (rows?.length) product.variantAxes = CatalogService.variantDimensions(rows);
    }
  }

  /** Route params that can address a product: its UUID or its unique `slug`. */
  private static readonly UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  private static readonly SLUG_RE = /^[a-z0-9][a-z0-9._-]{0,127}$/i;

  async getProductById(idOrSlug: string) {
    // The product detail route is addressable by slug as well as by UUID — the
    // storefront's own SEO metadata and share links are built from `product.slug`
    // — but every non-UUID used to be rejected here, so those URLs 400'd and the
    // page rendered "Product Not Found". Resolve by slug instead. The format
    // check stays: it is what keeps a malformed id from reaching Postgres as an
    // "invalid input syntax for type uuid" 500.
    const byId = CatalogService.UUID_RE.test(idOrSlug);
    if (!byId && !CatalogService.SLUG_RE.test(idOrSlug)) {
      throw new BadRequestException(`Invalid product ID format: ${idOrSlug}`);
    }
    const where = byId ? { id: idOrSlug } : { slug: idOrSlug };

    const cached = await this.redis.getJson(`product:${idOrSlug}`);
    if (cached) return cached;

    // Try with subcategory first; fall back without it if the relation doesn't exist
    let product = await this.productRepo
      .findOne({
        where,
        relations: { brand: true, category: true, subcategory: true },
      })
      .catch((): null => null);

    if (!product) {
      product = await this.productRepo.findOne({
        where,
        relations: { brand: true, category: true },
      });
    }

    if (!product) throw new NotFoundException(`Product ${idOrSlug} not found`);

    // Related rows are keyed on the resolved UUID, never on the route parameter —
    // the two differ whenever the product was addressed by slug, which would
    // otherwise return a product with no images, listings or reviews (and so a
    // ₹0 price and no buy box).
    const productId = product.id;

    // Fetch related data in parallel — individual failures don't crash the response
    let images: any[] = [];
    let listings: any[] = [];
    let reviews: any[] = [];
    let variants: any[] = [];
    try {
      [images, listings, reviews, variants] = await Promise.all([
        this.imageRepo
          .find({ where: { product: { id: productId } }, order: { sortOrder: 'ASC' } })
          .catch((): unknown[] => []),
        // Every seller offering this product, buy-box winner first — this is the
        // "Other Sellers on KartSeek" panel's data. Unapproved offers are
        // excluded: a listing awaiting moderation must not be shown, or quoted.
        this.listingRepo
          .find({
            where: { product: { id: productId }, ...CatalogService.LIVE_LISTING },
            relations: ['seller'],
            order: { isBuyBoxWinner: 'DESC', sellingPrice: 'ASC' },
          })
          .catch((): unknown[] => []),
        this.reviewRepo
          .find({
            where: { productId, status: 'PUBLISHED' },
            order: { createdAt: 'DESC' },
            take: 10,
          })
          .catch((): unknown[] => []),
        this.variantRepo
          .find({ where: { productId, isActive: true }, order: { sellingPrice: 'ASC' } })
          .catch((): unknown[] => []),
      ]);
    } catch {
      this.logger.warn(`Failed to fetch related data for product ${productId}`);
    }

    // `variantDimensions` is what the storefront's selector renders. It was only
    // ever read off `metadata`, which nothing populates — so colour and size
    // pickers never appeared even once variants existed as rows. Derive it from
    // the real table (the one carrying SKU, price and stock) and keep any
    // hand-authored `metadata` copy as the fallback, so products configured the
    // old way keep working.
    const metadata: any = (product as any).metadata ?? {};
    const derived = CatalogService.variantDimensions(variants);
    const result = {
      ...product,
      images,
      listings,
      reviews,
      variants,
      metadata: {
        ...metadata,
        variantDimensions: derived.length ? derived : metadata.variantDimensions,
      },
      reviewCount: product.reviewCount,
      averageRating: product.averageRating,
    };
    await this.redis.setJson(`product:${idOrSlug}`, result, 120);
    return result;
  }

  /**
   * Collapse variant rows into the pickable axes the product page shows.
   *
   * Each row carries its own `attributes` map (`{ Colour: 'Black', Size: 'M' }`);
   * the UI wants one group per attribute with its distinct options, in first-seen
   * order so a size run stays S/M/L rather than being alphabetised into L/M/S.
   */
  private static variantDimensions(
    variants: any[],
  ): { variantName: string; variantOptions: string[] }[] {
    const axes = new Map<string, string[]>();
    for (const v of variants) {
      const attrs = v?.attributes;
      if (!attrs || typeof attrs !== 'object') continue;
      for (const [name, value] of Object.entries(attrs)) {
        if (value == null || value === '') continue;
        const option = String(value);
        const options = axes.get(name) ?? [];
        if (!options.includes(option)) options.push(option);
        axes.set(name, options);
      }
    }
    return [...axes.entries()].map(([variantName, variantOptions]) => ({
      variantName,
      variantOptions,
    }));
  }

  async getFeaturedProducts(region?: string) {
    const cacheKey = `marketplace:featured:${this.regionKey(region)}`;
    const cached = await this.redis.getJson(cacheKey);
    if (cached) return cached;

    const qb = this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.brand', 'brand')
      .leftJoinAndSelect('p.category', 'category')
      .leftJoinAndSelect('p.images', 'images')
      .leftJoinAndSelect('p.listings', 'listings', CatalogService.liveListing('listings'))
      .where('p.is_active = true')
      .andWhere('p.approval_status = :s', { s: 'APPROVED' });

    this.scopeToRegion(qb, region);
    this.rankLocalFirst(qb, region);
    (region ? qb.addOrderBy('p.averageRating', 'DESC') : qb.orderBy('p.averageRating', 'DESC'))
      .addOrderBy('p.reviewCount', 'DESC')
      .take(20);

    const data = await qb.getMany();
    await this.attachVariantAxes(data);
    const result = { data, total: data.length };
    await this.redis.setJson(cacheKey, result, 120);
    return result;
  }

  async getDeals(region?: string) {
    const cacheKey = `marketplace:deals:${this.regionKey(region)}`;
    const cached = await this.redis.getJson(cacheKey);
    if (cached) return cached;
    // Genuinely discounted products, ordered by how deep the discount is.
    //
    // This comment already claimed "active listings where sellingPrice < MRP",
    // but the query did none of it — it returned the top-rated products with
    // `mrp > 0`, so the deals feed was not a deals feed and, with no listing
    // joined, carried no selling price to discount against.
    const dealsQb = this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.brand', 'brand')
      .leftJoinAndSelect('p.category', 'category')
      .leftJoinAndSelect('p.images', 'images')
      .innerJoinAndSelect('p.listings', 'listings', CatalogService.liveListing('listings'))
      .where('p.is_active = true')
      .andWhere('p.approval_status = :s', { s: 'APPROVED' })
      .andWhere('p.mrp > 0')
      .andWhere('listings.sellingPrice < p.mrp')
      // orderBy() parses its argument as a property path, so a raw expression is
      // read as an alias ('"(p" alias was not found'). Select it under a name and
      // order by that instead.
      .addSelect('(p.mrp - listings.sellingPrice) / p.mrp', 'discount_ratio');

    this.scopeToRegion(dealsQb, region);
    this.rankLocalFirst(dealsQb, region);
    (region
      ? dealsQb.addOrderBy('discount_ratio', 'DESC')
      : dealsQb.orderBy('discount_ratio', 'DESC')
    )
      // take(), not limit(): limit() caps *raw joined rows*, and the images join
      // multiplies them, so `limit(20)` returned only 9 products.
      .take(20);

    const data = await dealsQb.getMany();
    await this.attachVariantAxes(data);
    const result = { data, total: data.length };
    await this.redis.setJson(cacheKey, result, 120);
    return result;
  }

  /**
   * Products on a flash deal right now, with the real deal price and window.
   *
   * This used to rank products by review count and stamp `now + 4h` on the
   * response, under a comment saying so — meaning there were no deals, the
   * "discount" was whatever the product already cost, and the countdown reset
   * every time the cache lapsed instead of counting down. A campaign an admin
   * created never appeared here, because it lived in a Redis key this query did
   * not read.
   *
   * Now it joins the approved nominations of every live campaign. `expiresAt` is
   * the soonest real `windowEnd`, so the countdown a shopper sees is the one
   * that actually applies. The cache TTL is clamped to that window: a 5-minute
   * cache on a deal ending in 90 seconds would keep selling it after it closed.
   */
  async getFlashDeals(region?: string) {
    const cacheKey = `marketplace:flash-deals:${this.regionKey(region)}`;
    const cached = await this.redis.getJson(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const qb = this.nominationRepo
      .createQueryBuilder('n')
      .innerJoinAndSelect('n.deal', 'deal')
      .innerJoinAndSelect('n.product', 'p')
      .leftJoinAndSelect('p.brand', 'brand')
      .leftJoinAndSelect('p.category', 'category')
      .leftJoinAndSelect('p.images', 'images')
      .leftJoinAndSelect('p.listings', 'listings', CatalogService.liveListing('listings'))
      .where('n.status = :approved', { approved: 'APPROVED' })
      .andWhere('deal.status IN (:...live)', { live: ['SCHEDULED', 'ACTIVE'] })
      .andWhere('deal.window_start <= :now', { now })
      .andWhere('deal.window_end > :now', { now })
      .andWhere('p.is_active = true')
      .andWhere('p.approval_status = :s', { s: 'APPROVED' })
      // A campaign scoped to a region is only offered there; an unscoped one runs everywhere.
      .andWhere(region ? '(deal.region_code IS NULL OR deal.region_code = :region)' : '1=1', {
        region,
      })
      // Sold-out allocations drop off rather than lingering as a dead tile.
      .andWhere('(n.stock_allocated = 0 OR n.stock_sold < n.stock_allocated)')
      .orderBy('deal.priority', 'ASC')
      // Property name, not column name. TypeORM resolves an ORDER BY through
      // entity metadata, so `deal.window_end` found no property, handed back
      // undefined and threw `Cannot read properties of undefined (reading
      // 'databaseName')`. WHERE clauses are passed through to SQL and so accept
      // the column name, which is why the rest of this query looks inconsistent
      // but works.
      .addOrderBy('deal.windowEnd', 'ASC')
      .take(24);

    const rows = await qb.getMany();

    const data = rows.map((n) => ({
      ...n.product,
      dealId: n.deal.id,
      dealName: n.deal.name,
      dealPrice: Number(n.dealPrice),
      dealDiscountPercent: n.proposedDiscountPercent,
      dealStartedAt: n.deal.windowStart.toISOString(),
      dealEndsAt: n.deal.windowEnd.toISOString(),
      stockRemaining: n.stockAllocated === 0 ? null : n.stockAllocated - n.stockSold,
    }));
    await this.attachVariantAxes(data as any);

    const soonestEnd = rows.length
      ? rows.reduce(
          (min, n) => (n.deal.windowEnd < min ? n.deal.windowEnd : min),
          rows[0].deal.windowEnd,
        )
      : null;
    const result = {
      data,
      total: data.length,
      expiresAt: soonestEnd?.toISOString() ?? null,
    };

    const secondsLeft = soonestEnd
      ? Math.floor((soonestEnd.getTime() - now.getTime()) / 1000)
      : 300;
    await this.redis.setJson(cacheKey, result, Math.max(15, Math.min(300, secondsLeft)));
    return result;
  }

  // ── Search ──────────────────────────────────────────────────────────────────
  async searchProducts(query: string, page = 1, limit = 20, region?: string) {
    this.logger.log(`Search: "${query}" page=${page} region=${region ?? 'global'}`);
    if (!query || query.trim().length === 0) return { data: [], total: 0, query, page, limit };

    const cacheKey = `search:${this.regionKey(region)}:${query}:${page}:${limit}`;
    const cached = await this.redis.getJson(cacheKey);
    if (cached) return cached;

    // PostgreSQL full-text search with ts_rank for relevance scoring.
    //
    // `websearch_to_tsquery`, not `to_tsquery`. The old code took the raw input,
    // split it on whitespace and joined it with `&` — handing user text straight
    // to a parser that reads `&`, `|`, `!`, `(` and `)` as operators. Searching
    // "shoes!" or "(vintage" was a syntax error, which surfaced as a 500 on the
    // storefront's search box: `syntax error in tsquery: "shoes!"`.
    //
    // `websearch_to_tsquery` is built for exactly this input — it takes what a
    // person types, understands quoted phrases and `or`/`-`, and never raises on
    // punctuation. It also ANDs bare terms, which is what the manual `&` join was
    // reaching for.
    const searchTerm = query.trim();
    const rankExpr = `ts_rank(
      to_tsvector('english', COALESCE(p.name, '') || ' ' || COALESCE(p.short_description, '')),
      websearch_to_tsquery('english', :tsQuery)
    )`;
    const qb = this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.brand', 'brand')
      .leftJoinAndSelect('p.category', 'category')
      // Search results are product cards like any other: without images and the
      // buy-box listing they render with no picture and at MRP.
      .leftJoinAndSelect('p.images', 'images')
      .leftJoinAndSelect('p.listings', 'listings', CatalogService.liveListing('listings'))
      .addSelect(rankExpr, 'rank')
      .where('p.is_active = :active', { active: true })
      .andWhere('p.approval_status = :approved', { approved: 'APPROVED' })
      .andWhere(
        `(to_tsvector('english', COALESCE(p.name, '') || ' ' || COALESCE(p.short_description, ''))
            @@ websearch_to_tsquery('english', :tsQuery)
         OR p.name ILIKE :like)`,
        // `%` and `_` are wildcards to LIKE, so a query containing them would
        // otherwise match far more than the customer asked for.
        { tsQuery: searchTerm, like: `%${searchTerm.replace(/[\\%_]/g, '\\$&')}%` },
      );

    // Scoped before ranking so a Doha search never returns a product no local
    // seller can ship, and local offers lead the results that remain.
    this.scopeToRegion(qb, region);
    this.rankLocalFirst(qb, region);
    (region ? qb.addOrderBy('rank', 'DESC') : qb.orderBy('rank', 'DESC'))
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    const result = {
      data,
      total,
      query,
      page,
      limit,
      hasMore: total > page * limit,
      region: region ?? null,
    };
    await this.redis.setJson(cacheKey, result, 30);
    return result;
  }

  // ── Brands ──────────────────────────────────────────────────────────────────
  async getBrands() {
    const cached = await this.redis.getJson('marketplace:brands');
    if (cached) return cached;
    const [data, total] = await this.brandRepo.findAndCount({ order: { name: 'ASC' } });
    const result = { data, total };
    await this.redis.setJson('marketplace:brands', result, 300);
    return result;
  }

  async getTopBrands() {
    const cached = await this.redis.getJson('marketplace:brands:top');
    if (cached) return cached;
    const data = await this.brandRepo.find({
      where: { isVerified: true },
      order: { name: 'ASC' },
      take: 20,
    });
    const result = { data, total: data.length };
    await this.redis.setJson('marketplace:brands:top', result, 300);
    return result;
  }

  async getBrandById(id: string) {
    const brand = await this.brandRepo.findOne({ where: { id } });
    if (!brand) throw new NotFoundException(`Brand ${id} not found`);
    const productCount = await this.productRepo.count({ where: { brand: { id } } });
    return { ...brand, productCount };
  }

  // ── Seller directory (public reads) ─────────────────────────────────────────

  /**
   * Columns the storefront may see.
   *
   * These three reads are reachable unauthenticated (`GET /marketplace/sellers`,
   * `/verified`, `/sellers/:id` carry no guard — the seller directory is public
   * by design).
   *
   * The list now lives in `entities/seller.public-fields.ts` and is shared: the
   * order, return and coupon reads each joined the seller entity without a
   * projection and returned the whole row, so having one definition per call
   * site was itself the bug.
   */
  private static readonly INVOICE_SELLER_FIELDS = INVOICE_SELLER_FIELDS;
  private static readonly PUBLIC_SELLER_FIELDS = PUBLIC_SELLER_FIELDS;

  /**
   * Sellers a customer in this region can buy from.
   *
   * NULL `region_code` is included for the same reason as the catalogue scope:
   * the column is nullable pending backfill, and excluding those rows would
   * empty the seller directory rather than filter it.
   */
  async getSellers(region?: string) {
    const [rows, total] = await this.sellerRepo.findAndCount({
      select: CatalogService.PUBLIC_SELLER_FIELDS,
      where: region ? [{ regionCode: region.toUpperCase() }, { regionCode: IsNull() }] : undefined,
    });
    // Sorted after the counters are corrected, not by the stale `seller_rating`
    // column — otherwise the directory is ordered by one rating and displays another.
    const data = (await this.withRealCounters(rows)).sort(
      (a: any, b: any) => (b.sellerRating ?? 0) - (a.sellerRating ?? 0),
    );
    return { data, total, region: region ?? null };
  }

  async getVerifiedSellers(region?: string) {
    const cacheKey = `marketplace:verified-sellers:${this.regionKey(region)}`;
    const cached = await this.redis.getJson(cacheKey);
    if (cached) return cached;

    const [rows, total] = await this.sellerRepo.findAndCount({
      select: CatalogService.PUBLIC_SELLER_FIELDS,
      where: region
        ? [
            { verificationStatus: 'VERIFIED', regionCode: region.toUpperCase() },
            { verificationStatus: 'VERIFIED', regionCode: IsNull() },
          ]
        : { verificationStatus: 'VERIFIED' },
      take: 20,
    });
    const data = (await this.withRealCounters(rows)).sort(
      (a: any, b: any) => (b.sellerRating ?? 0) - (a.sellerRating ?? 0),
    );
    const result = { data, total, region: region ?? null };
    await this.redis.setJson(cacheKey, result, 300);
    return result;
  }

  /**
   * One seller's public profile, addressable by uuid **or** by `storeSlug`.
   *
   * Both are needed: the seller directory links with the uuid, while store
   * links and shared URLs use the slug. A bare `where: { id }` on a slug reaches
   * Postgres as an invalid uuid and 500s, so the key is classified first.
   */
  /**
   * The merchant's details as they must appear on a tax invoice.
   *
   * Separate from `getSellerById` because the projections differ: an invoice
   * names the registered address and tax registration of the party that sold
   * the goods, and a catalogue read must not. See `INVOICE_SELLER_FIELDS`.
   *
   * Returns null rather than throwing — a missing seller row should leave the
   * invoice showing what it does know, not make the document unavailable.
   */
  async getSellerForInvoice(sellerId: string) {
    if (!sellerId) return null;
    const seller = await this.sellerRepo.findOne({
      select: CatalogService.INVOICE_SELLER_FIELDS,
      where: { id: sellerId },
    });
    return seller ?? null;
  }

  async getSellerById(idOrSlug: string) {
    if (!idOrSlug) throw new NotFoundException('Seller not found');
    const byId = CatalogService.UUID_RE.test(idOrSlug);
    const seller = await this.sellerRepo.findOne({
      select: CatalogService.PUBLIC_SELLER_FIELDS,
      where: byId ? { id: idOrSlug } : { storeSlug: idOrSlug },
    });
    if (!seller) throw new NotFoundException(`Seller ${idOrSlug} not found`);
    const [corrected] = await this.withRealCounters([seller]);
    // `productCount` is kept alongside the corrected `totalProducts` because the
    // storefront already reads it by that name.
    return {
      ...corrected,
      verified: seller.verificationStatus === 'VERIFIED',
      productCount: (corrected as any).totalProducts ?? 0,
    };
  }

  /**
   * Seller directory for admin review, filtered by market and status.
   *
   * Unlike the storefront reads above, a NULL `region_code` is *excluded* when a
   * market is named: an admin approving Qatari sellers is applying Qatar's
   * requirements, and a seller whose market is unknown has not been shown to
   * meet them. Those rows surface in the unfiltered view instead, where they can
   * be assigned a market.
   */
  async getSellersForAdmin(
    opts: { region?: string; status?: string; page?: number; limit?: number } = {},
  ) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(200, Math.max(1, opts.limit ?? 50));

    const qb = this.sellerRepo.createQueryBuilder('s');
    if (opts.region) qb.andWhere('s.region_code = :region', { region: opts.region.toUpperCase() });
    if (opts.status)
      qb.andWhere('s.verificationStatus = :status', { status: opts.status.toUpperCase() });

    qb.orderBy('s.createdAt', 'ASC') // oldest application first — it has waited longest
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      total,
      page,
      limit,
      region: opts.region ?? null,
      status: opts.status ?? null,
      hasMore: total > page * limit,
    };
  }

  /** Count of sellers awaiting a decision, per market. Drives the admin badge. */
  async getPendingSellerCounts(): Promise<Record<string, number>> {
    const rows = await this.sellerRepo
      .createQueryBuilder('s')
      .select("COALESCE(s.region_code, 'UNASSIGNED')", 'region')
      .addSelect('COUNT(*)', 'count')
      .where('s.verificationStatus = :status', { status: 'PENDING' })
      .groupBy("COALESCE(s.region_code, 'UNASSIGNED')")
      .getRawMany<{ region: string; count: string }>();

    return rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.region] = Number(row.count) || 0;
      return acc;
    }, {});
  }
}
