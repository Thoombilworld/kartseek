import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, TreeRepository, ILike, In, MoreThanOrEqual, IsNull } from 'typeorm';
import { RedisService } from '@app/redis';
import { KafkaProducerService, KAFKA_TOPICS } from '@app/kafka';
import {
  assertInMarket as assertInMarketShared,
  marketPredicate,
  refuseUnattributable as refuseUnattributableShared,
} from '@app/common';
import { Product } from '../entities/product.entity';
import { Seller } from '../entities/seller.entity';
import { Category } from '../entities/category.entity';
import { Brand } from '../entities/brand.entity';
import { Review } from '../entities/review.entity';
import { MarketplaceOrder } from '../entities/marketplace-order.entity';
import { ReturnRequest } from '../entities/return-request.entity';
import { SellerPromotion } from '../entities/seller-promotion.entity';
import { ProductAttribute, type AttributeOption } from '../entities/product-attribute.entity';
import { ProductQuestion } from '../entities/product-qa.entity';
import { MarketplaceNotification } from '../entities/marketplace-notification.entity';
import {
  FlashDeal,
  FlashDealNomination,
  type FlashDealStatus,
} from '../entities/flash-deal.entity';
import { BankOffer } from '../entities/bank-offer.entity';
import { ExchangeOffer } from '../entities/exchange-offer.entity';
import { MarketplaceHomeCacheService } from '../catalog/home-cache.service';
import { getRegionConfig, DEFAULT_REGION } from '@app/region';

/**
 * MarketplaceAdminService — back-office governance for the Marketplace module.
 *
 * Catalogue taxonomy, seller and product moderation, banners, flash deals,
 * campaigns, promotions, commissions, payouts, review/QA moderation, settings,
 * SEO, HSN/tax and compliance.
 *
 * Split out of MarketplaceService because it is a different audience and a
 * different risk profile from the storefront: every method here is an
 * administrative mutation that emits an event, and none of it is on the customer
 * request path. Separating it keeps the hot read path small and gives the
 * privileged operations one place to be reviewed and guarded.
 *
 * Home banners and home-cache invalidation are delegated to
 * MarketplaceHomeCacheService, which the storefront path shares.
 */
@Injectable()
export class MarketplaceAdminService {
  private readonly logger = new Logger(MarketplaceAdminService.name);

  // The flash-deal pipeline's two Redis keys are gone — `flash_deals` and
  // `flash_deal_nominations` are tables now. Nothing should reintroduce a
  // TTL'd cache as the system of record for a campaign.

  constructor(
    private readonly redis: RedisService,
    private readonly kafka: KafkaProducerService,
    private readonly home: MarketplaceHomeCacheService,
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    @InjectRepository(Seller) private readonly sellerRepo: Repository<Seller>,
    @InjectRepository(BankOffer) private readonly bankOfferRepo: Repository<BankOffer>,
    @InjectRepository(ExchangeOffer) private readonly exchangeOfferRepo: Repository<ExchangeOffer>,
    @InjectRepository(Category) private readonly categoryRepo: TreeRepository<Category>,
    @InjectRepository(Brand) private readonly brandRepo: Repository<Brand>,
    @InjectRepository(Review) private readonly reviewRepo: Repository<Review>,
    @InjectRepository(MarketplaceOrder) private readonly orderRepo: Repository<MarketplaceOrder>,
    @InjectRepository(ReturnRequest) private readonly returnRepo: Repository<ReturnRequest>,
    @InjectRepository(ProductAttribute)
    private readonly attributeRepo: Repository<ProductAttribute>,
    @InjectRepository(ProductQuestion) private readonly questionRepo: Repository<ProductQuestion>,
    @InjectRepository(MarketplaceNotification)
    private readonly notificationRepo: Repository<MarketplaceNotification>,
    @InjectRepository(FlashDeal) private readonly flashDealRepo: Repository<FlashDeal>,
    @InjectRepository(FlashDealNomination)
    private readonly nominationRepo: Repository<FlashDealNomination>,
    @InjectRepository(SellerPromotion)
    private readonly sellerPromotionRepo: Repository<SellerPromotion>,
  ) {}

  async updateCategory(id: string, dto: any) {
    const cat = await this.categoryRepo.findOne({ where: { id } });
    if (!cat) throw new NotFoundException(`Category ${id} not found`);
    const update: Partial<Category> = {};
    if (dto.name !== undefined) update.name = dto.name;
    if (dto.slug !== undefined) update.slug = dto.slug;
    if (dto.icon !== undefined) update.icon = dto.icon;
    if (dto.image !== undefined) update.image = dto.image;
    if (dto.sortOrder !== undefined || dto.sort_order !== undefined)
      update.sort_order = dto.sortOrder ?? dto.sort_order;
    if (dto.isActive !== undefined || dto.is_active !== undefined)
      update.is_active = dto.isActive ?? dto.is_active;
    if (dto.seoTitle !== undefined || dto.seo_title !== undefined)
      update.seo_title = dto.seoTitle ?? dto.seo_title;
    if (dto.seoDescription !== undefined || dto.seo_description !== undefined)
      update.seo_description = dto.seoDescription ?? dto.seo_description;
    if (dto.translations !== undefined) update.translations = dto.translations;
    await this.categoryRepo.update(id, update);
    // Re-parent if requested
    if (dto.parentId !== undefined) {
      const parent = dto.parentId
        ? await this.categoryRepo.findOne({ where: { id: dto.parentId } })
        : null;
      const updated = await this.categoryRepo.findOne({ where: { id } });
      if (updated) {
        updated.parent = parent as any;
        await this.categoryRepo.save(updated);
      }
    }
    await this.redis.del('marketplace:categories');
    await this.kafka.publish('category.updated', { id, ...dto });
    this.logger.log(`Category updated: ${id}`);
    return { success: true, id };
  }

  async createCategory(dto: any) {
    const slug =
      dto.slug ||
      dto.name
        ?.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    const existing = await this.categoryRepo.findOne({ where: { slug } });
    if (existing) throw new BadRequestException(`Category with slug '${slug}' already exists`);
    const entity = this.categoryRepo.create({
      name: dto.name,
      slug,
      icon: dto.icon,
      image: dto.image,
      sort_order: dto.sortOrder || dto.sort_order || 0,
      is_active: dto.isActive ?? true,
      seo_title: dto.seoTitle || dto.seo_title,
      seo_description: dto.seoDescription || dto.seo_description,
      translations: dto.translations,
    });
    // Assign parent if provided
    if (dto.parentId) {
      const parent = await this.categoryRepo.findOne({ where: { id: dto.parentId } });
      if (parent) entity.parent = parent;
    }
    const saved = await this.categoryRepo.save(entity);
    await this.redis.del('marketplace:categories');
    await this.kafka.publish('category.created', {
      id: saved.id,
      name: saved.name,
      slug: saved.slug,
    });
    this.logger.log(`Category created: ${saved.name} (${saved.id})`);
    return { success: true, id: saved.id, name: saved.name, slug: saved.slug };
  }

  /**
   * The marketplace dashboard, confined to one market when asked for one.
   *
   * `country` used to name the cache key and nothing else: every count and sum
   * below was platform-wide, so a region-locked admin opening their dashboard
   * read India's seller count and the platform's revenue as though they were
   * their own market's. Sellers and orders carry `region_code`; products carry
   * no market, so they are counted through the seller join.
   *
   * Brands are deliberately left platform-wide — catalogue taxonomy is one tree
   * shared by every market, the same reason their admin routes are
   * `@GlobalEntity` reads.
   */
  async getAdminDashboard(country?: string) {
    const region = country?.trim() ? country.trim().toUpperCase() : undefined;
    const cacheKey = `admin:dashboard:${region || 'all'}`;
    const cached = await this.redis.getJson(cacheKey);
    if (cached) return cached;

    // Aggregate real data from repositories
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const inRegion = region ? { regionCode: region } : {};
    const [sellerTotal, sellerActive, sellerPending, sellerSuspended] = await Promise.all([
      this.sellerRepo.count({ where: { ...inRegion } }),
      this.sellerRepo.count({ where: { ...inRegion, verificationStatus: 'VERIFIED' } }),
      this.sellerRepo.count({ where: { ...inRegion, verificationStatus: 'PENDING' } }),
      this.sellerRepo.count({ where: { ...inRegion, verificationStatus: 'SUSPENDED' } }),
    ]);

    const productCount = (status?: string) => {
      const qb = this.adminProductQuery(region);
      if (status) qb.andWhere('p.approval_status = :status', { status });
      return qb.getCount();
    };
    const [productTotal, productApproved, productPending, productRejected] = await Promise.all([
      productCount(),
      productCount('APPROVED'),
      productCount('PENDING'),
      productCount('REJECTED'),
    ]);

    const [brandTotal, brandApproved] = await Promise.all([
      this.brandRepo.count(),
      this.brandRepo.count({ where: { isVerified: true } }),
    ]);

    // Order stats
    const ordersSince = (since: Date) => {
      const qb = this.orderRepo.createQueryBuilder('o').where('o.createdAt >= :since', { since });
      if (region) qb.andWhere('o.region_code = :region', { region });
      return qb;
    };
    const todayOrders = await ordersSince(todayStart).getCount();
    const weekOrders = await ordersSince(weekStart).getCount();
    const monthOrders = await ordersSince(monthStart).getCount();
    const pendingOrders = await this.orderRepo.count({
      where: { ...inRegion, status: 'PENDING' },
    });

    // Revenue stats
    const revenueSince = (since: Date) =>
      ordersSince(since)
        .select('COALESCE(SUM(o.grandTotal), 0)', 'sum')
        .andWhere('o.paymentStatus = :paid', { paid: 'PAID' })
        .getRawOne();
    const todayRevenue = await revenueSince(todayStart);
    const monthRevenue = await revenueSince(monthStart);

    const result = {
      sellers: {
        total: sellerTotal,
        active: sellerActive,
        pending: sellerPending,
        suspended: sellerSuspended,
        blocked: 0,
      },
      products: {
        total: productTotal,
        approved: productApproved,
        pending: productPending,
        rejected: productRejected,
        unpublished: 0,
      },
      brands: {
        total: brandTotal,
        approved: brandApproved,
        pendingApproval: brandTotal - brandApproved,
        rejected: 0,
      },
      campaigns: { active: 0, scheduled: 0, pending: 0, paused: 0, expired: 0 },
      orders: {
        today: todayOrders,
        thisWeek: weekOrders,
        thisMonth: monthOrders,
        pending: pendingOrders,
      },
      returns: { open: 0, resolved: 0 },
      refunds: { pending: 0, processed: 0, amount: 0 },
      revenue: {
        today: parseFloat(todayRevenue?.sum || '0'),
        thisWeek: 0,
        thisMonth: parseFloat(monthRevenue?.sum || '0'),
        commission: 0,
      },
      payouts: { pending: 0, processed: 0 },
      country: region ?? null,
    };
    await this.redis.setJson(cacheKey, result, 60);
    return result;
  }

  async createSubcategory(dto: any) {
    if (!dto.parentId) throw new BadRequestException('parentId is required for subcategories');
    const parent = await this.categoryRepo.findOne({ where: { id: dto.parentId } });
    if (!parent) throw new NotFoundException(`Parent category ${dto.parentId} not found`);
    const slug =
      dto.slug ||
      dto.name
        ?.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    const entity = this.categoryRepo.create({
      name: dto.name,
      slug,
      icon: dto.icon,
      image: dto.image,
      sort_order: dto.sortOrder || 0,
      is_active: dto.isActive ?? true,
      seo_title: dto.seoTitle,
      seo_description: dto.seoDescription,
      translations: dto.translations,
      parent,
    });
    const saved = await this.categoryRepo.save(entity);
    await this.redis.del('marketplace:categories');
    await this.kafka.publish('subcategory.created', {
      id: saved.id,
      name: saved.name,
      parentId: dto.parentId,
    });
    this.logger.log(`Subcategory created: ${saved.name} under ${parent.name}`);
    return { success: true, id: saved.id, name: saved.name, parentId: dto.parentId };
  }

  async updateSubcategory(id: string, dto: any) {
    return this.updateCategory(id, dto);
  }

  async deleteSubcategory(id: string) {
    const sub = await this.categoryRepo.findOne({ where: { id } });
    if (!sub) throw new NotFoundException(`Subcategory ${id} not found`);
    // Check for products before deleting
    const productCount = await this.productRepo.count({ where: { category: { id } } });
    if (productCount > 0) {
      // Soft-delete: deactivate instead
      await this.categoryRepo.update(id, { is_active: false });
      await this.kafka.publish('subcategory.deactivated', { id });
      this.logger.log(`Subcategory ${id} deactivated (has ${productCount} products)`);
      return { success: true, id, action: 'deactivated', reason: `${productCount} products exist` };
    }
    await this.categoryRepo.remove(sub);
    await this.redis.del('marketplace:categories');
    await this.kafka.publish('subcategory.deleted', { id });
    this.logger.log(`Subcategory ${id} deleted`);
    return { success: true, id };
  }

  async deleteCategory(id: string) {
    const cat = await this.categoryRepo.findOne({ where: { id } });
    if (!cat) throw new NotFoundException(`Category ${id} not found`);
    // Check for child categories
    const children = await this.categoryRepo.findDescendants(cat);
    const childCount = children.filter((c) => c.id !== id).length;
    if (childCount > 0) {
      throw new BadRequestException(
        `Cannot delete category with ${childCount} subcategories. Delete them first.`,
      );
    }
    // Check for products
    const productCount = await this.productRepo.count({ where: { category: { id } } });
    if (productCount > 0) {
      await this.categoryRepo.update(id, { is_active: false });
      await this.redis.del('marketplace:categories');
      await this.kafka.publish('category.deactivated', { id });
      this.logger.log(`Category ${id} deactivated (has ${productCount} products)`);
      return { success: true, id, action: 'deactivated', reason: `${productCount} products exist` };
    }
    await this.categoryRepo.remove(cat);
    await this.redis.del('marketplace:categories');
    await this.kafka.publish('category.deleted', { id });
    this.logger.log(`Category ${id} deleted`);
    return { success: true, id };
  }

  /** `slug`-safe form of a label: the machine value stored on a variant. */
  private static slugify(value: string): string {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  /**
   * Normalise whatever the caller sent as `options` into `AttributeOption[]`.
   *
   * The admin panel posts objects; attributes seeded or scripted earlier hold
   * bare strings. Storing both shapes would push the branch into every reader —
   * the seller form, the storefront filters and the variant matrix all index
   * these — so it is resolved once, here, on the way in.
   */
  private static normaliseOptions(options: any): AttributeOption[] | undefined {
    if (options === undefined || options === null) return undefined;
    if (!Array.isArray(options)) return [];
    return options
      .map((opt: any): AttributeOption | null => {
        if (typeof opt === 'string') {
          const label = opt.trim();
          return label ? { label, value: MarketplaceAdminService.slugify(label) } : null;
        }
        const label = String(opt?.label ?? opt?.name ?? opt?.value ?? '').trim();
        if (!label) return null;
        const value = MarketplaceAdminService.slugify(opt?.value ?? opt?.slug ?? label) || label;
        // Only a syntactically valid CSS colour is kept — a stray value would be
        // painted straight into a `background-color`, where it silently renders
        // as transparent and looks like a missing swatch.
        const hex =
          typeof opt?.hex === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(opt.hex.trim())
            ? opt.hex.trim().toLowerCase()
            : undefined;
        return hex ? { label, value, hex } : { label, value };
      })
      .filter((opt): opt is AttributeOption => opt !== null);
  }

  async getAttributes(category?: string) {
    const cacheKey = `admin:attributes:${category || 'all'}`;
    const cached = await this.redis.getJson(cacheKey);
    if (cached) return cached;
    const where: any = { isActive: true };
    if (category) where.categoryId = category;
    const [data, total] = await this.attributeRepo.findAndCount({
      where,
      relations: { category: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
    const result = { data, total, category };
    await this.redis.setJson(cacheKey, result, 120);
    return result;
  }

  async createAttribute(dto: any) {
    const slug = dto.slug || MarketplaceAdminService.slugify(dto.name);
    if (!slug) throw new BadRequestException('An attribute name is required.');
    // Scoped to the category, not global: "Size" belongs to Fashion *and* to
    // Footwear with different values, and a platform-wide unique slug made the
    // second one impossible to create — the admin panel reported "already
    // exists" for a category that had no attributes at all.
    const existing = await this.attributeRepo.findOne({
      where: { slug, categoryId: dto.categoryId ?? null },
    });
    if (existing) {
      throw new BadRequestException(`An attribute '${slug}' already exists for this category`);
    }
    const entity = this.attributeRepo.create({
      name: dto.name,
      slug,
      type: dto.type || 'TEXT',
      options: MarketplaceAdminService.normaliseOptions(dto.options),
      unit: dto.unit,
      isRequired: dto.isRequired ?? true,
      isFilterable: dto.isFilterable ?? true,
      isSearchable: dto.isSearchable ?? false,
      isVariantAxis: dto.isVariantAxis ?? false,
      sortOrder: dto.sortOrder || 0,
      categoryId: dto.categoryId,
    });
    const saved = await this.attributeRepo.save(entity);
    await this.invalidateAttributeCaches(dto.categoryId);
    await this.kafka.publish('attribute.created', { id: saved.id, name: saved.name });
    this.logger.log(`Attribute created: ${saved.name} (${saved.id})`);
    return { success: true, id: saved.id, name: saved.name, slug: saved.slug };
  }

  async updateAttribute(id: string, dto: any) {
    const attr = await this.attributeRepo.findOne({ where: { id } });
    if (!attr) throw new NotFoundException(`Attribute ${id} not found`);
    const update: any = {};
    if (dto.name !== undefined) update.name = dto.name;
    if (dto.slug !== undefined) update.slug = dto.slug;
    if (dto.type !== undefined) update.type = dto.type;
    if (dto.options !== undefined)
      update.options = MarketplaceAdminService.normaliseOptions(dto.options);
    if (dto.unit !== undefined) update.unit = dto.unit;
    if (dto.isRequired !== undefined) update.isRequired = dto.isRequired;
    if (dto.isFilterable !== undefined) update.isFilterable = dto.isFilterable;
    if (dto.isSearchable !== undefined) update.isSearchable = dto.isSearchable;
    if (dto.isVariantAxis !== undefined) update.isVariantAxis = dto.isVariantAxis;
    if (dto.isActive !== undefined) update.isActive = dto.isActive;
    if (dto.sortOrder !== undefined) update.sortOrder = dto.sortOrder;
    if (dto.categoryId !== undefined) update.categoryId = dto.categoryId;
    if (Object.keys(update).length === 0) {
      throw new BadRequestException('No updatable attribute fields were supplied.');
    }
    await this.attributeRepo.update(id, update);
    await this.invalidateAttributeCaches(attr.categoryId, update.categoryId);
    await this.kafka.publish('attribute.updated', { id, ...dto });
    this.logger.log(`Attribute updated: ${id}`);
    return { success: true, id };
  }

  async deleteAttribute(id: string) {
    const attr = await this.attributeRepo.findOne({ where: { id } });
    if (!attr) throw new NotFoundException(`Attribute ${id} not found`);
    await this.attributeRepo.update(id, { isActive: false });
    await this.invalidateAttributeCaches(attr.categoryId);
    await this.kafka.publish('attribute.deleted', { id });
    this.logger.log(`Attribute soft-deleted: ${id}`);
    return { success: true, id };
  }

  /**
   * Drop every cached view of an attribute set.
   *
   * Three readers cache these — the admin list, the storefront's public
   * per-category read, and the seller product form — so clearing only the admin
   * key left a seller's variant options stale for the cache's lifetime after an
   * admin changed them. `categoryIds` takes both the old and the new category
   * when an attribute is moved between them, since the row leaves one set and
   * joins another.
   */
  private async invalidateAttributeCaches(...categoryIds: (string | null | undefined)[]) {
    const keys = new Set<string>(['admin:attributes:all', 'marketplace:category-attributes:all']);
    for (const categoryId of categoryIds) {
      if (!categoryId) continue;
      keys.add(`admin:attributes:${categoryId}`);
      keys.add(`marketplace:category-attributes:${categoryId}`);
    }
    await Promise.all(
      [...keys].map((key) => this.redis.del(key).catch((): undefined => undefined)),
    );
  }

  async createBrand(dto: any) {
    const slug =
      dto.slug ||
      dto.name
        ?.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    const existing = await this.brandRepo.findOne({ where: { slug } });
    if (existing) throw new BadRequestException(`Brand with slug '${slug}' already exists`);
    const entity = this.brandRepo.create({
      name: dto.name,
      slug,
      logoUrl: dto.logoUrl || dto.logo,
      isVerified: dto.isVerified ?? false,
    });
    const saved = await this.brandRepo.save(entity);
    await this.redis.del('marketplace:brands:top');
    await this.kafka.publish('brand.created', { id: saved.id, name: saved.name, slug: saved.slug });
    this.logger.log(`Brand created: ${saved.name} (${saved.id})`);
    return { success: true, id: saved.id, name: saved.name, slug: saved.slug };
  }

  async updateBrand(id: string, dto: any) {
    const brand = await this.brandRepo.findOne({ where: { id } });
    if (!brand) throw new NotFoundException(`Brand ${id} not found`);
    const update: any = {};
    if (dto.name !== undefined) update.name = dto.name;
    if (dto.slug !== undefined) update.slug = dto.slug;
    if (dto.logoUrl !== undefined || dto.logo !== undefined)
      update.logoUrl = dto.logoUrl ?? dto.logo;
    if (dto.isVerified !== undefined) update.isVerified = dto.isVerified;
    await this.brandRepo.update(id, update);
    await this.redis.del('marketplace:brands:top');
    await this.kafka.publish('brand.updated', { id, ...dto });
    this.logger.log(`Brand updated: ${id}`);
    return { success: true, id };
  }

  async deleteBrand(id: string) {
    const brand = await this.brandRepo.findOne({ where: { id } });
    if (!brand) throw new NotFoundException(`Brand ${id} not found`);
    // Check for products before deleting
    const productCount = await this.productRepo.count({ where: { brand: { id } } });
    if (productCount > 0) {
      await this.brandRepo.update(id, { isVerified: false });
      await this.redis.del('marketplace:brands:top');
      await this.kafka.publish('brand.deactivated', { id });
      this.logger.log(`Brand ${id} deactivated (has ${productCount} products)`);
      return { success: true, id, action: 'deactivated', reason: `${productCount} products exist` };
    }
    await this.brandRepo.remove(brand);
    await this.redis.del('marketplace:brands:top');
    await this.kafka.publish('brand.deleted', { id });
    this.logger.log(`Brand ${id} deleted`);
    return { success: true, id };
  }

  async rejectBrand(brandId: string, adminId: string, reason: string) {
    const brand = await this.brandRepo.findOne({ where: { id: brandId } });
    if (!brand) throw new NotFoundException(`Brand ${brandId} not found`);
    await this.brandRepo.update(brandId, { isVerified: false });
    await this.kafka.publish('brand.rejected', { id: brandId, rejectedBy: adminId, reason });
    this.logger.log(`Brand ${brandId} rejected by ${adminId}: ${reason}`);
    return { success: true, brandId, reason };
  }

  async suspendBrand(brandId: string, adminId: string) {
    const brand = await this.brandRepo.findOne({ where: { id: brandId } });
    if (!brand) throw new NotFoundException(`Brand ${brandId} not found`);
    await this.brandRepo.update(brandId, { isVerified: false });
    await this.kafka.publish('brand.suspended', { id: brandId, suspendedBy: adminId });
    this.logger.log(`Brand ${brandId} suspended by ${adminId}`);
    return { success: true, brandId };
  }

  /**
   * Block a seller.
   *
   * This used to publish `seller.blocked` and return `{ success: true }` without
   * touching the row — so the seller kept trading, and the console reported the
   * block as done. The status write is the block; the event only notifies.
   * Verifying the row first also means a bad id fails instead of being reported
   * as a successful block of a seller that does not exist.
   */
  async blockSeller(sellerId: string, adminId: string, scope?: string) {
    if (!sellerId) throw new BadRequestException('A seller id is required.');
    const seller = await this.sellerRepo.findOne({ where: { id: sellerId } });
    if (!seller) throw new NotFoundException(`Seller ${sellerId} not found`);
    // Asserted before the write and before the event: a refused block leaves
    // the seller trading and announces nothing.
    this.assertInMarket(seller.regionCode, scope, 'seller');

    seller.verificationStatus = 'SUSPENDED';
    seller.isActive = false;
    await this.sellerRepo.save(seller);

    await this.kafka.publish('seller.blocked', {
      id: sellerId,
      blockedBy: adminId,
      regionCode: seller.regionCode,
    });
    this.logger.log(`Seller ${sellerId} blocked by ${adminId}`);
    return { success: true, sellerId, status: 'SUSPENDED', regionCode: seller.regionCode };
  }

  /**
   * The market a seller trades in, or null when the row has none.
   *
   * Used to attribute records that have no market column of their own — a
   * product, an offer — to the seller who owns them, so the gateway has a field
   * to refuse on.
   */
  async sellerMarket(sellerId: string): Promise<string | null> {
    if (!sellerId) return null;
    const seller = await this.sellerRepo.findOne({
      where: { id: sellerId },
      select: ['id', 'regionCode'],
    });
    return seller?.regionCode ?? null;
  }

  async getPendingSellers(scope?: string) {
    const where: Record<string, unknown> = { verificationStatus: 'PENDING' };
    if (scope) where.regionCode = scope.toUpperCase();
    const [data, total] = await this.sellerRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
    });
    return { data, total };
  }

  /**
   * Products joined to their seller, so the market predicate applies to every
   * admin product list.
   *
   * The join goes through the `Seller` entity class rather than a bare
   * `'sellers'` table name: the marketplace database carries `public.*` copies
   * of these tables shadowing the real ones, and a string table name resolves
   * against the search path — the decoy — while the entity resolves against the
   * schema TypeORM was configured with.
   *
   * Both columns are `uuid` (`Product.seller_id` is `@Column({ type: 'uuid' })`),
   * so the comparison is a plain `s.id = p.seller_id` and the index on
   * `products.seller_id` is usable. A cast on either side would make it
   * unindexable, which the product entity warns about in its own comment.
   *
   * LEFT, not INNER. `seller_id` is nullable, and an inner join silently drops
   * every product with no seller — so an orphaned product awaiting approval
   * would never appear in the queue for anyone, including a global admin, and
   * the moderation gate would have a hole in it nobody could see. The market
   * predicate below already excludes orphans for a scoped caller, which is the
   * fail-closed behaviour: unattributable, therefore not a regional admin's.
   */
  private adminProductQuery(region?: string) {
    const qb = this.productRepo.createQueryBuilder('p').leftJoin(Seller, 's', 's.id = p.seller_id');
    if (region) qb.andWhere('s.region_code = :region', { region: region.toUpperCase() });
    return qb;
  }

  async getProductsForAdmin(
    opts: { region?: string; status?: string; page?: number; limit?: number } = {},
  ) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
    const qb = this.adminProductQuery(opts.region);
    if (opts.status)
      qb.andWhere('p.approval_status = :status', { status: opts.status.toUpperCase() });
    const [data, total] = await qb
      .orderBy('p.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { data, total, page, limit, region: opts.region ?? null, hasMore: total > page * limit };
  }

  async getPendingProducts(scope?: string) {
    const region = scope?.toUpperCase();
    const products = await this.adminProductQuery(region)
      .andWhere("p.approval_status = 'PENDING'")
      .getMany();
    const count = (status: string) =>
      this.adminProductQuery(region).andWhere('p.approval_status = :status', { status }).getCount();
    const stats = {
      pending: products.length,
      approved: await count('APPROVED'),
      rejected: await count('REJECTED'),
      correctionRequested: await count('CORRECTION_REQUESTED'),
    };
    return { data: products, count: products.length, stats };
  }

  async getSellerHealth(sellerId: string) {
    const orders = await this.orderRepo.count({ where: { sellerId } });
    const reviewStats = await this.sellerReviewStats(sellerId);
    const avgRating = reviewStats.avgRating;
    const returns = await this.returnRepo.count({ where: { sellerId } as any });
    const returnRate = orders > 0 ? Math.round((returns / orders) * 100) : 0;
    const acceptanceRate = orders > 0 ? Math.max(85, 100 - returnRate) : 0;
    const overallScore = Math.round(
      acceptanceRate * 0.3 + avgRating * 20 * 0.3 + (100 - returnRate) * 0.2 + 80 * 0.2,
    );
    return {
      sellerId,
      acceptanceRate,
      shippingSLA: 92,
      reviewScore: Math.round(avgRating * 10) / 10,
      returnRate,
      overallScore,
      totalOrders: orders,
      totalReviews: reviewStats.count,
    };
  }

  /**
   * The banners an admin has created.
   *
   * This read `admin:banners:<type>:<country>` — a key nothing has ever
   * written. `saveBanner` stores under `marketplace:<type>-banners`, so the
   * lookup always missed and the method returned `{ data: [], total: 0 }`: an
   * admin could create a banner, receive `{ success: true }`, and never see it
   * in the list again. Reads the actual store now.
   *
   * No region argument is passed to `getBanners` on purpose — the editor has to
   * see banners for every market, not just the one it happens to be viewing.
   */
  async getAdminBanners(type?: string, country?: string) {
    const types = type ? [type] : ['hero', 'campaign'];
    const collected = (
      await Promise.all(
        types.map((t) =>
          this.home.getBanners(t).then((rows) => rows.map((b) => ({ ...b, type: t }))),
        ),
      )
    ).flat();

    const data = country
      ? collected.filter((b) => {
          const regions = Array.isArray(b.regions) ? b.regions : [];
          // No region list means the banner runs everywhere, so it belongs in
          // every market's view rather than none.
          return (
            regions.length === 0 ||
            regions
              .map(String)
              .map((r) => r.toUpperCase())
              .includes(country.toUpperCase())
          );
        })
      : collected;

    return { data, total: data.length };
  }

  /**
   * Reject a banner with nothing to show.
   *
   * `createAdminBanner` stored whatever it was handed and answered
   * `{ success: true }`. Two rows carrying only an id and a timestamp reached
   * the live storefront that way, and because the hero carousel prefers feed
   * banners over its fallback whenever the array is non-empty, they replaced
   * the entire hero with blank slides above the fold.
   */
  /**
   * Refuse a record outside the caller's market. `scope` is the market a
   * region-locked admin is confined to (undefined for a global admin); a
   * record with no market of its own — a platform-wide campaign — is not a
   * locked admin's either. Logged so a Qatari admin reaching for an Indian
   * campaign is visible, not just refused.
   */
  private assertInMarket(
    recordRegion: string | null | undefined,
    scope: string | undefined,
    what: string,
  ): void {
    assertInMarketShared(recordRegion, scope, what, this.logger);
  }

  /**
   * Refuse a record this service cannot place in a market at all.
   *
   * Some rows still have no market column and no owner to join to — a blocked
   * customer, for instance, is a platform identity with no marketplace row that
   * carries a region. A regional admin acting on one of those would be acting
   * platform-wide, so it is refused rather than allowed through: "we could not
   * work out whose this is" must never read as "yours". A global admin (no
   * scope) is unaffected. Plan C adds the columns that make these resolvable.
   */
  private refuseUnattributable(scope: string | undefined, what: string): void {
    refuseUnattributableShared(scope, what, this.logger);
  }

  /**
   * The market a review belongs to: its product's seller's.
   *
   * `Review` carries only `product_id` and `customer_id`; the product carries
   * only `seller_id`. So the path is two reads, and a review whose product or
   * seller has gone is unattributable rather than global.
   */
  private async reviewMarket(reviewId: string): Promise<string | null> {
    const review = await this.reviewRepo.findOne({
      where: { id: reviewId },
      select: ['id', 'productId'],
    });
    if (!review?.productId) return null;
    const product = await this.productRepo.findOne({
      where: { id: review.productId },
      select: ['id', 'seller_id'],
    });
    if (!product?.seller_id) return null;
    return this.sellerMarket(product.seller_id);
  }

  /** The one market a banner is scoped to; null when it runs in several or everywhere. */
  private static bannerMarket(banner: any): string | null {
    const regions = Array.isArray(banner?.regions) ? banner.regions : [];
    return regions.length === 1 ? String(regions[0]).toUpperCase() : null;
  }

  /** A locked admin's banner runs in their market only; other markets named are refused. */
  private scopeBanner(dto: any, scope?: string) {
    if (!scope) return dto;
    const named: string[] = Array.isArray(dto?.regions)
      ? dto.regions.map((r: unknown) => String(r).toUpperCase())
      : [];
    for (const r of named) this.assertInMarket(r, scope, 'banner');
    return { ...dto, regions: [scope.toUpperCase()] };
  }

  /** The one market an exchange offer runs in; null when it runs in several or everywhere. */
  private static soleCountry(list: unknown): string | null {
    return Array.isArray(list) && list.length === 1 ? String(list[0]).toUpperCase() : null;
  }

  private static assertRenderableBanner(dto: any): void {
    if (!dto || typeof dto !== 'object') {
      throw new BadRequestException('A banner payload is required.');
    }
    if (!MarketplaceHomeCacheService.hasRenderableContent(dto)) {
      throw new BadRequestException(
        'A banner needs an image (`imageUrl`) or text (`headline`) — otherwise it renders as an empty slide.',
      );
    }
    for (const field of ['startsAt', 'endsAt'] as const) {
      if (dto[field] && Number.isNaN(Date.parse(dto[field]))) {
        throw new BadRequestException(`\`${field}\` must be a valid ISO 8601 date-time.`);
      }
    }
    if (dto.startsAt && dto.endsAt && Date.parse(dto.startsAt) >= Date.parse(dto.endsAt)) {
      throw new BadRequestException('`startsAt` must be before `endsAt`.');
    }
  }

  async createAdminBanner(dto: any, scope?: string) {
    MarketplaceAdminService.assertRenderableBanner(dto);
    const id = `banner-${Date.now()}`;
    await this.home.saveBanner(dto.type || 'hero', id, this.scopeBanner(dto, scope));
    return { success: true, id };
  }

  async updateAdminBanner(id: string, dto: any, scope?: string) {
    MarketplaceAdminService.assertRenderableBanner(dto);
    const type = dto.type || 'hero';
    const existing = (await this.home.getBanners(type)).find((b) => b.id === id);
    if (existing)
      this.assertInMarket(MarketplaceAdminService.bannerMarket(existing), scope, 'banner');
    await this.home.saveBanner(type, id, this.scopeBanner(dto, scope));
    return { success: true, id };
  }

  async deleteAdminBanner(id: string, scope?: string, type = 'hero') {
    const existing = (await this.home.getBanners(type)).find((b) => b.id === id);
    if (existing)
      this.assertInMarket(MarketplaceAdminService.bannerMarket(existing), scope, 'banner');
    await this.home.deleteBanner(type, id);
    return { success: true, id };
  }

  // ══ Flash deals ═══════════════════════════════════════════════════════════
  //
  // Campaigns and nominations are rows in `flash_deals` / `flash_deal_nominations`.
  // They used to be two JSON blobs in Redis under a 24-hour TTL, which meant a
  // campaign an admin created expired overnight, concurrent seller nominations
  // overwrote each other, and — the part that made the whole feature inert — the
  // customer query read neither key. See flash-deal.entity.ts for the full note.

  /** Campaigns for the admin console, newest window first. */
  async getAdminFlashDeals(status?: string, region?: string) {
    const where = {
      ...(status && status !== 'all' ? { status: status.toUpperCase() as FlashDealStatus } : {}),
      // One market's campaigns; a global admin without a market sees them all.
      ...(region ? { regionCode: region.toUpperCase() } : {}),
    };
    const [data, total] = await this.flashDealRepo.findAndCount({
      where,
      order: { windowStart: 'DESC' },
    });
    return { data, total };
  }

  async createFlashDeal(dto: any) {
    const windowStart = new Date(dto?.windowStart ?? dto?.start);
    const windowEnd = new Date(dto?.windowEnd ?? dto?.end);
    if (Number.isNaN(windowStart.getTime()) || Number.isNaN(windowEnd.getTime())) {
      throw new BadRequestException('A flash deal needs a valid start and end time.');
    }
    if (windowEnd <= windowStart) {
      throw new BadRequestException('The flash deal window must end after it starts.');
    }

    const deal = await this.flashDealRepo.save(
      this.flashDealRepo.create({
        name: dto?.name,
        description: dto?.description ?? null,
        status: (dto?.status?.toUpperCase() as FlashDealStatus) ?? 'SCHEDULED',
        windowStart,
        windowEnd,
        minDiscountPercent: Number(dto?.minDiscountPercent ?? dto?.minDiscount ?? 0),
        stockLimit: Number(dto?.stockLimit ?? 0),
        priority: Number(dto?.priority ?? 5),
        regionCode: dto?.regionCode ?? dto?.country ?? null,
        createdBy: dto?.createdBy ?? null,
      }),
    );

    await this.kafka.publish(KAFKA_TOPICS.FLASH_DEAL_CREATED, { ...deal });
    return { success: true, id: deal.id, deal };
  }

  async updateFlashDeal(id: string, dto: any, scope?: string) {
    const deal = await this.flashDealRepo.findOne({ where: { id } });
    if (!deal) throw new NotFoundException(`Flash deal ${id} not found`);
    this.assertInMarket(deal.regionCode, scope, 'flash deal');

    if (dto?.name !== undefined) deal.name = dto.name;
    if (dto?.description !== undefined) deal.description = dto.description;
    if (dto?.status !== undefined)
      deal.status = String(dto.status).toUpperCase() as FlashDealStatus;
    if (dto?.windowStart ?? dto?.start) deal.windowStart = new Date(dto.windowStart ?? dto.start);
    if (dto?.windowEnd ?? dto?.end) deal.windowEnd = new Date(dto.windowEnd ?? dto.end);
    if (dto?.minDiscountPercent !== undefined)
      deal.minDiscountPercent = Number(dto.minDiscountPercent);
    if (dto?.stockLimit !== undefined) deal.stockLimit = Number(dto.stockLimit);
    if (dto?.priority !== undefined) deal.priority = Number(dto.priority);
    if (dto?.regionCode !== undefined)
      deal.regionCode = dto.regionCode ? String(dto.regionCode).toUpperCase() : null;
    if (deal.windowEnd <= deal.windowStart) {
      throw new BadRequestException('The flash deal window must end after it starts.');
    }

    const saved = await this.flashDealRepo.save(deal);
    await this.kafka.publish(KAFKA_TOPICS.FLASH_DEAL_UPDATED, { ...saved });
    return { success: true, id, deal: saved };
  }

  /**
   * Cancel a campaign.
   *
   * A hard delete would orphan the nominations sellers submitted against it and
   * erase the record of a campaign that may already have taken orders, so this
   * moves it to CANCELLED — which `isLive()` treats as off-storefront
   * immediately.
   */
  async deleteFlashDeal(id: string, scope?: string) {
    const deal = await this.flashDealRepo.findOne({ where: { id } });
    if (!deal) throw new NotFoundException(`Flash deal ${id} not found`);
    this.assertInMarket(deal.regionCode, scope, 'flash deal');

    deal.status = 'CANCELLED';
    await this.flashDealRepo.save(deal);
    await this.kafka.publish('flash-deal.deleted', { id });
    return { success: true, id };
  }

  /** Campaigns this seller has a nomination in, with that nomination attached. */
  async getSellerFlashDeals(sellerId: string) {
    const nominations = await this.nominationRepo.find({
      where: { sellerId },
      relations: ['deal'],
      order: { submittedAt: 'DESC' },
    });
    const data = nominations
      .filter((n) => n.deal)
      .map((n) => ({ ...n.deal, nomination: { ...n, deal: undefined as unknown } }));
    return { data, total: data.length };
  }

  /** Campaigns still open to nomination that this seller has not joined. */
  async getAvailableDeals(sellerId: string) {
    const joined = await this.nominationRepo.find({
      where: { sellerId },
      select: ['dealId'],
    });
    const joinedIds = joined.map((n) => n.dealId);

    const qb = this.flashDealRepo
      .createQueryBuilder('d')
      .where('d.status IN (:...open)', { open: ['SCHEDULED', 'ACTIVE'] })
      .andWhere('d.window_end > :now', { now: new Date() })
      .orderBy('d.priority', 'ASC')
      // Property name — see the note in `catalog.getFlashDeals`; the column
      // form throws inside TypeORM's ORDER BY metadata lookup.
      .addOrderBy('d.windowStart', 'ASC');
    if (joinedIds.length) qb.andWhere('d.id NOT IN (:...joinedIds)', { joinedIds });

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  /**
   * Offer one product into a campaign.
   *
   * Validated rather than accepted: the campaign has to exist and still be open,
   * and the discount has to clear the campaign's floor. None of that was checked
   * before — any payload became a pending row, and an admin was left to catch
   * ineligible offers by eye.
   */
  async submitNomination(
    sellerId: string,
    dto: {
      dealId: string;
      productId: string;
      dealPrice?: number;
      proposedDiscount?: number;
      stockAllocated?: number;
      note?: string;
    },
  ) {
    if (!sellerId) throw new BadRequestException('sellerId is required');
    if (!dto?.dealId || !dto?.productId)
      throw new BadRequestException('dealId and productId are required');

    const deal = await this.flashDealRepo.findOne({ where: { id: dto.dealId } });
    if (!deal) throw new NotFoundException(`Flash deal ${dto.dealId} not found`);
    if (deal.status === 'ENDED' || deal.status === 'CANCELLED' || deal.windowEnd <= new Date()) {
      throw new BadRequestException('That flash deal has already closed.');
    }

    const product = await this.productRepo.findOne({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException(`Product ${dto.productId} not found`);

    const discount = Number(dto.proposedDiscount ?? 0);
    if (discount < deal.minDiscountPercent) {
      throw new BadRequestException(
        `This deal requires at least ${deal.minDiscountPercent}% off; you offered ${discount}%.`,
      );
    }

    const existing = await this.nominationRepo.findOne({
      where: { dealId: dto.dealId, sellerId, productId: dto.productId },
    });
    if (existing && existing.status !== 'WITHDRAWN') {
      throw new BadRequestException('You have already nominated this product for this deal.');
    }

    const row =
      existing ??
      this.nominationRepo.create({
        dealId: dto.dealId,
        sellerId,
        productId: dto.productId,
      });
    row.dealPrice = Number(dto.dealPrice ?? 0);
    row.proposedDiscountPercent = discount;
    row.stockAllocated = Number(dto.stockAllocated ?? 0);
    row.sellerNote = dto.note ?? null;
    row.status = 'PENDING';
    row.decidedAt = null;
    row.decidedBy = null;
    row.decisionReason = null;

    const nomination = await this.nominationRepo.save(row);
    await this.kafka.publish(KAFKA_TOPICS.FLASH_DEAL_NOMINATION_SUBMITTED, { ...nomination });
    return { success: true, id: nomination.id, nomination };
  }

  async getSellerNominations(sellerId: string) {
    const [data, total] = await this.nominationRepo.findAndCount({
      where: { sellerId },
      relations: ['deal', 'product'],
      order: { submittedAt: 'DESC' },
    });
    return { data, total };
  }

  /**
   * Every nomination, for the admin review queue.
   *
   * This used to seed eight invented nominations — named sellers, named
   * products, specific prices — on first call, so an admin's queue was populated
   * with offers nobody had made.
   */
  async getAllNominations(status?: string, region?: string) {
    const where: any = {
      ...(status && status !== 'all'
        ? { status: status.toUpperCase() as FlashDealNomination['status'] }
        : {}),
      // Through the campaign: a nomination belongs to the market its deal runs in.
      ...(region ? { deal: { regionCode: region.toUpperCase() } } : {}),
    };
    const [data, total] = await this.nominationRepo.findAndCount({
      where,
      relations: ['deal', 'product', 'seller'],
      order: { submittedAt: 'DESC' },
    });
    return { data, total };
  }

  async approveNomination(nominationId: string, adminId?: string, scope?: string) {
    const nomination = await this.nominationRepo.findOne({
      where: { id: nominationId },
      relations: ['deal'],
    });
    if (!nomination) throw new NotFoundException(`Flash deal nomination ${nominationId} not found`);
    this.assertInMarket(nomination.deal?.regionCode, scope, 'flash deal nomination');
    if (nomination.status === 'WITHDRAWN') {
      throw new BadRequestException('That nomination was withdrawn by the seller.');
    }

    nomination.status = 'APPROVED';
    nomination.decidedAt = new Date();
    nomination.decidedBy = adminId ?? null;
    const saved = await this.nominationRepo.save(nomination);

    await this.kafka.publish(KAFKA_TOPICS.FLASH_DEAL_NOMINATION_APPROVED, { ...saved });
    return { success: true, nominationId, nomination: saved };
  }

  async rejectNomination(nominationId: string, reason?: string, adminId?: string, scope?: string) {
    const nomination = await this.nominationRepo.findOne({
      where: { id: nominationId },
      relations: ['deal'],
    });
    if (!nomination) throw new NotFoundException(`Flash deal nomination ${nominationId} not found`);
    this.assertInMarket(nomination.deal?.regionCode, scope, 'flash deal nomination');

    nomination.status = 'REJECTED';
    nomination.decisionReason = reason || 'Does not meet flash deal criteria';
    nomination.decidedAt = new Date();
    nomination.decidedBy = adminId ?? null;
    const saved = await this.nominationRepo.save(nomination);

    await this.kafka.publish(KAFKA_TOPICS.FLASH_DEAL_NOMINATION_REJECTED, { ...saved });
    return { success: true, nominationId, nomination: saved };
  }

  /**
   * Pull out of a campaign.
   *
   * Marked WITHDRAWN rather than deleted: the row is the audit trail for a deal
   * price that may already have been shown to shoppers, and keeping it lets the
   * seller re-nominate the same product later without tripping the unique index.
   */
  async withdrawFromDeal(sellerId: string, dealId: string) {
    const rows = await this.nominationRepo.find({ where: { sellerId, dealId } });
    if (rows.length === 0) {
      throw new NotFoundException(`No nomination found for seller ${sellerId} on deal ${dealId}`);
    }
    for (const row of rows) row.status = 'WITHDRAWN';
    await this.nominationRepo.save(rows);
    return { success: true, sellerId, dealId, withdrawn: rows.length };
  }

  async getAdminCampaigns(status?: string) {
    return { data: [] as unknown[], total: 0, status };
  }

  async createCampaign(dto: any) {
    const id = `camp-${Date.now()}`;
    await this.kafka.publish('campaign.created', { id, ...dto });
    return { success: true, id };
  }

  /**
   * A campaign is a Kafka event with no row and no market column, so nothing
   * can say whose it is. A scoped admin editing one would be editing every
   * market's, which is why this fails closed rather than passing silently.
   */
  async updateCampaign(id: string, dto: any, scope?: string) {
    this.refuseUnattributable(scope, 'campaign');
    await this.kafka.publish('campaign.updated', { id, ...dto });
    return { success: true, id };
  }

  async deleteCampaign(id: string) {
    await this.kafka.publish('campaign.deleted', { id });
    return { success: true, id };
  }

  /**
   * Promotions sellers run on their own listings, for the admin console —
   * real rows, scoped to a market through the seller who owns them. This
   * used to return a fabricated four-item catalogue ("Summer Sale 2026",
   * "Diwali Mega Sale") cached for five minutes, so the console reported
   * campaigns nobody had created and no market could tell from another.
   */
  async getAdminPromotions(region?: string) {
    const qb = this.sellerPromotionRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.seller', 's')
      .orderBy('p.createdAt', 'DESC');
    if (region) qb.andWhere('s.regionCode = :region', { region: region.toUpperCase() });
    const rows = await qb.getMany();
    const data = rows.map((p) => MarketplaceAdminService.promotionRow(p));
    return { data, total: data.length };
  }

  private static promotionRow(p: SellerPromotion) {
    const seller: any = (p as any).seller ?? null;
    return {
      id: p.id,
      name: p.name,
      code: p.code,
      type: p.type,
      discountValue: Number(p.value) || 0,
      maxDiscount: p.maxDiscount == null ? null : Number(p.maxDiscount),
      minOrderValue: Number(p.minOrderValue) || 0,
      usageCount: p.usageCount,
      usageLimit: p.usageLimit,
      status: p.status,
      startDate: p.startDate,
      endDate: p.endDate,
      sellerId: p.sellerId,
      sellerName: seller?.businessName ?? null,
      regionCode: seller?.regionCode ?? null,
    };
  }

  /**
   * Promotions belong to sellers and are created from the seller portal; a
   * platform-wide offer is a coupon. This used to publish a Kafka event and
   * answer success with an invented id — a "created" promotion that existed
   * nowhere.
   */
  async createPromotion(_dto: any) {
    throw new BadRequestException(
      'Promotions are created by sellers from their portal. For a platform-wide offer, create a coupon (POST /marketplace/coupons).',
    );
  }

  /** Status and terms of a seller promotion, within the caller's market. */
  async updatePromotion(id: string, dto: any, scope?: string) {
    const promo = await this.sellerPromotionRepo.findOne({ where: { id }, relations: ['seller'] });
    if (!promo) throw new NotFoundException(`Promotion ${id} not found`);
    const sellerRegion = (promo as any).seller?.regionCode ?? null;
    this.assertInMarket(sellerRegion, scope, 'promotion');

    if (dto?.status !== undefined) promo.status = String(dto.status).toLowerCase();
    if (dto?.name !== undefined) promo.name = String(dto.name);
    if (dto?.value !== undefined || dto?.discountValue !== undefined)
      promo.value = Number(dto.value ?? dto.discountValue) || 0;
    if (dto?.maxDiscount !== undefined)
      promo.maxDiscount = dto.maxDiscount == null ? null : Number(dto.maxDiscount);
    if (dto?.minOrderValue !== undefined) promo.minOrderValue = Number(dto.minOrderValue) || 0;
    if (dto?.endDate !== undefined) promo.endDate = dto.endDate ? new Date(dto.endDate) : null;
    const saved = await this.sellerPromotionRepo.save(promo);
    await this.kafka.publish('promotion.updated', {
      id,
      sellerId: saved.sellerId,
      status: saved.status,
      regionCode: sellerRegion,
    });
    return { success: true, id, promotion: MarketplaceAdminService.promotionRow(saved) };
  }

  async getCommissions() {
    const cacheKey = 'admin:commissions';
    const cached = await this.redis.getJson(cacheKey);
    if (cached) return cached;
    // Per-category commission rates
    const categories = await this.categoryRepo.find();
    const commissions = categories.map((c) => ({
      id: `comm-${c.id}`,
      categoryId: c.id,
      categoryName: c.name,
      commissionRate: Number((c as any).commissionRate) || this._defaultCommission(c.name),
      flatFee: 0,
      effectiveDate: new Date(Date.now() - 90 * 86400000).toISOString(),
      status: 'active',
    }));
    const result = { data: commissions, total: commissions.length };
    await this.redis.setJson(cacheKey, result, 600);
    return result;
  }

  private _defaultCommission(name: string): number {
    const map: Record<string, number> = {
      electronics: 8,
      fashion: 15,
      books: 5,
      home: 12,
      beauty: 18,
      sports: 10,
      grocery: 3,
    };
    return map[name?.toLowerCase()] || 10;
  }

  async createCommission(dto: any) {
    await this.kafka.publish('commission.created', dto);
    return { success: true, id: `comm-${Date.now()}` };
  }

  /** Same shape as a campaign: an event, no row, no market. */
  async updateCommission(id: string, dto: any, scope?: string) {
    this.refuseUnattributable(scope, 'commission rule');
    await this.kafka.publish('commission.updated', { id, ...dto });
    return { success: true, id };
  }

  async getAdminPayouts(status?: string) {
    const sellers = await this.sellerRepo.find();
    const payouts = await Promise.all(
      sellers.map(async (s) => {
        // `marketplace_orders_status_enum` is upper-case. Postgres rejects a
        // lower-case literal outright — `invalid input value for enum ... "delivered"`
        // — so this did not return zero rows, it made the whole request 500.
        const orders = await this.orderRepo.find({
          where: { sellerId: s.id, status: 'DELIVERED' as any },
        });
        const totalRevenue = orders.reduce((sum, o) => sum + Number(o.grandTotal || 0), 0);
        const commission = Math.round(totalRevenue * 0.1);
        const payout = totalRevenue - commission;
        // Amounts are real (from delivered orders); paid/pending status is owned by
        // payout-service, so default to 'pending' here rather than fabricating it.
        const payoutStatus = payout > 0 ? 'pending' : 'no_orders';
        return {
          id: `pay-${s.id}`,
          sellerId: s.id,
          sellerName: s.businessName || 'Seller',
          totalRevenue,
          commission,
          payoutAmount: payout,
          status: payoutStatus,
          period: 'weekly',
          lastPaidAt: null as unknown,
        };
      }),
    );
    const filtered = status ? payouts.filter((p) => p.status === status) : payouts;
    return {
      data: filtered,
      total: filtered.length,
      summary: {
        totalPending: filtered
          .filter((p) => p.status === 'pending')
          .reduce((s, p) => s + p.payoutAmount, 0),
        totalProcessed: filtered
          .filter((p) => p.status === 'processed')
          .reduce((s, p) => s + p.payoutAmount, 0),
      },
    };
  }

  /**
   * NOT a completed operation — emits the event only.
   *
   * Payouts are owned by payout-service (`PAYOUT_TCP_PORT`), and this module has
   * no payout repository, so there is nothing here to mark as processed. The
   * `{ success: true }` below therefore means "the request was accepted for
   * processing", not "the money moved" — and the admin console currently renders
   * it as the latter.
   *
   * To finish this: give the gateway's admin controller the PAYOUT_SERVICE client
   * it already registers and call payout-service directly, rather than routing an
   * operation through a module that cannot perform it.
   */
  async processPayout(id: string) {
    await this.kafka.publish('payout.processed', { id });
    return { success: true, id, note: 'queued — settlement is owned by payout-service' };
  }

  async getAdminReviews(status?: string, rating?: number) {
    const where: any = {};
    if (status) where.status = status;
    if (rating) where.rating = rating;
    const [reviews, total] = await this.reviewRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: 50,
      relations: ['product'] as any,
    });
    return {
      data: reviews.map((r) => ({
        ...r,
        productName: (r as any).product?.name || 'Product',
        status: (r as any).status || 'published',
      })),
      total,
      filters: { status, rating },
    };
  }

  // Both of these previously emitted an event and returned success without
  // changing `review.status`, so a flagged or hidden review stayed publicly
  // visible. `status` is what the storefront read filters on.

  async flagReview(id: string, reason: string, scope?: string) {
    const review = await this.reviewRepo.findOne({ where: { id } });
    if (!review) throw new NotFoundException(`Review ${id} not found`);
    if (scope) this.assertInMarket(await this.reviewMarket(id), scope, 'review');
    review.status = 'FLAGGED';
    await this.reviewRepo.save(review);

    await this.kafka.publish('review.flagged', { id, reason });
    return { success: true, id, status: 'FLAGGED' };
  }

  async hideReview(id: string, scope?: string) {
    const review = await this.reviewRepo.findOne({ where: { id } });
    if (!review) throw new NotFoundException(`Review ${id} not found`);
    if (scope) this.assertInMarket(await this.reviewMarket(id), scope, 'review');
    review.status = 'HIDDEN';
    await this.reviewRepo.save(review);

    await this.kafka.publish('review.hidden', { id });
    return { success: true, id, status: 'HIDDEN' };
  }

  async getComplaints(status?: string, scope?: string) {
    const region = scope?.toUpperCase();
    // Keyed by market as well as status: one shared key served a Qatari admin's
    // complaints list to an Indian one for the rest of its 60-second TTL.
    const cacheKey = `admin:complaints:${region ?? 'all'}:${status || 'all'}`;
    const cached = await this.redis.getJson(cacheKey);
    if (cached) return cached;
    // Aggregate from returns and support tickets
    const returnWhere: any = {};
    if (status === 'open') returnWhere.status = In(['REQUESTED', 'APPROVED', 'PICKUP_SCHEDULED']);
    else if (status === 'resolved') returnWhere.status = In(['REFUND_COMPLETED', 'CLOSED']);
    if (region) returnWhere.regionCode = region;
    const returns = await this.returnRepo.find({
      where: returnWhere,
      order: { createdAt: 'DESC' },
      take: 30,
    });
    const complaints = returns.map((r) => ({
      id: r.id,
      type: 'return',
      orderId: (r as any).orderId,
      customerId: (r as any).customerId,
      reason: (r as any).reason || 'Product issue',
      status: r.status,
      priority: (r as any).reason?.includes('defective') ? 'high' : 'medium',
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
    const result = { data: complaints, total: complaints.length, status, region: region ?? null };
    await this.redis.setJson(cacheKey, result, 60);
    return result;
  }

  async updateComplaint(id: string, dto: any, scope?: string) {
    // A complaint is a return request, and a return carries its own market.
    if (scope) {
      const request = await this.returnRepo.findOne({ where: { id } });
      if (!request) throw new NotFoundException(`Complaint ${id} not found`);
      this.assertInMarket(request.regionCode, scope, 'complaint');
    }
    await this.kafka.publish('complaint.updated', { id, ...dto });
    return { success: true, id };
  }

  async getAdminNotifications(scope?: string) {
    // `MarketplaceNotification` carries no market column, so this list is the
    // platform's. Refused for a scoped admin rather than relabelled as theirs.
    this.refuseUnattributable(scope, 'platform notification');
    // `MarketplaceNotification` has no `targetRole` — the `as any` hid that from
    // the compiler and TypeORM threw at runtime ("Property \"targetRole\" was not
    // found"), so the admin notifications screen answered 500 rather than a list.
    // The entity scopes by `userId` and `type`; admin-facing rows are the ones
    // with no user attached.
    const notifications = await this.notificationRepo.find({
      where: { userId: IsNull() },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    if (notifications.length > 0) return { data: notifications, total: notifications.length };
    // If no DB records, return system-generated admin notifications
    const systemNotifs = [
      {
        id: 'sn-1',
        title: 'New Seller Registration',
        message: '3 new sellers awaiting approval',
        type: 'seller_approval',
        priority: 'high',
        isRead: false,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 'sn-2',
        title: 'Low Stock Alert',
        message: '12 products below reorder threshold',
        type: 'inventory',
        priority: 'medium',
        isRead: false,
        createdAt: new Date(Date.now() - 7200000).toISOString(),
      },
      {
        id: 'sn-3',
        title: 'Return Spike Detected',
        message: 'Return rate increased 15% in Electronics category',
        type: 'analytics',
        priority: 'high',
        isRead: true,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: 'sn-4',
        title: 'Payout Batch Ready',
        message: 'Weekly payout batch of ₹2.3L ready for processing',
        type: 'payout',
        priority: 'medium',
        isRead: true,
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
    ];
    return { data: systemNotifs, total: systemNotifs.length };
  }

  async sendNotification(dto: any, scope?: string) {
    this.refuseUnattributable(scope, 'platform notification');
    await this.kafka.publish('notification.sent', dto);
    return { success: true, id: `notif-${Date.now()}` };
  }

  async getMarketplaceSettings() {
    const cached = await this.redis.getJson('admin:settings');
    // The defaults used to name India's currency and timezone, so a fresh
    // install of the admin panel presented Asia/Kolkata and INR as the
    // platform's settings. They come from the home market's registry entry now.
    const home = getRegionConfig(DEFAULT_REGION);
    return (
      cached || {
        currency: home?.currencyCode ?? null,
        timezone: home?.timezone ?? null,
        autoCancel: 24,
        returnWindow: 7,
        payoutFrequency: 'weekly',
        minPayout: 500,
      }
    );
  }

  /** One platform-wide settings record — mirrors `updateLoyaltyConfig`. */
  async updateMarketplaceSettings(dto: any, scope?: string) {
    this.refuseUnattributable(scope, 'marketplace settings record');
    await this.redis.setJson('admin:settings', dto, 0);
    await this.kafka.publish('settings.updated', dto);
    return { success: true };
  }

  async getAuditLogs(params: { action?: string; actor?: string; page: number; limit: number }) {
    return { data: [] as unknown[], total: 0, ...params };
  }

  async getReports(params: { type?: string; period?: string; country?: string }) {
    return { data: [] as unknown[], summary: {}, ...params };
  }

  async getPageLayout(country?: string) {
    const cacheKey = `admin:page-layout:${country || 'default'}`;
    const cached = await this.redis.getJson(cacheKey);
    return cached || { sections: [], country };
  }

  async updatePageLayout(dto: any) {
    await this.redis.setJson(`admin:page-layout:${dto.country || 'default'}`, dto, 0);
    await this.home.invalidateHomeCache();
    await this.kafka.publish('page-layout.updated', dto);
    return { success: true };
  }

  async getSeoSettings() {
    const cached = await this.redis.getJson('admin:seo');
    return (
      cached || {
        metaTitle: '',
        metaDescription: '',
        keywords: '',
        ogImage: '',
        robotsTxt: '',
        sitemapEnabled: true,
      }
    );
  }

  /** One platform-wide SEO record — mirrors `updateLoyaltyConfig`. */
  async updateSeoSettings(dto: any, scope?: string) {
    this.refuseUnattributable(scope, 'SEO settings record');
    await this.redis.setJson('admin:seo', dto, 0);
    await this.kafka.publish('seo.updated', dto);
    return { success: true };
  }

  async getHsnCodes(search?: string) {
    // HSN (Harmonized System of Nomenclature) master data for GST compliance
    const hsnMaster = [
      {
        id: 'hsn-1',
        code: '8517',
        description: 'Telephone sets; smartphones',
        gstRate: 18,
        category: 'Electronics',
      },
      {
        id: 'hsn-2',
        code: '8471',
        description: 'Computers and peripherals',
        gstRate: 18,
        category: 'Electronics',
      },
      {
        id: 'hsn-3',
        code: '6109',
        description: 'T-shirts, singlets, vests',
        gstRate: 5,
        category: 'Fashion',
      },
      {
        id: 'hsn-4',
        code: '6203',
        description: 'Suits, ensembles, jackets',
        gstRate: 12,
        category: 'Fashion',
      },
      {
        id: 'hsn-5',
        code: '4901',
        description: 'Printed books, brochures',
        gstRate: 0,
        category: 'Books',
      },
      {
        id: 'hsn-6',
        code: '3304',
        description: 'Beauty, make-up preparations',
        gstRate: 28,
        category: 'Beauty',
      },
      {
        id: 'hsn-7',
        code: '9401',
        description: 'Seats and furniture',
        gstRate: 18,
        category: 'Home',
      },
      {
        id: 'hsn-8',
        code: '9506',
        description: 'Sports equipment',
        gstRate: 12,
        category: 'Sports',
      },
      {
        id: 'hsn-9',
        code: '8528',
        description: 'Monitors, projectors, TVs',
        gstRate: 18,
        category: 'Electronics',
      },
      { id: 'hsn-10', code: '6404', description: 'Footwear', gstRate: 12, category: 'Fashion' },
      {
        id: 'hsn-11',
        code: '0402',
        description: 'Milk and cream',
        gstRate: 5,
        category: 'Grocery',
      },
      {
        id: 'hsn-12',
        code: '8523',
        description: 'Discs, tapes, storage media',
        gstRate: 18,
        category: 'Electronics',
      },
    ];
    const filtered = search
      ? hsnMaster.filter(
          (h) =>
            h.code.includes(search) ||
            h.description.toLowerCase().includes(search.toLowerCase()) ||
            h.category.toLowerCase().includes(search.toLowerCase()),
        )
      : hsnMaster;
    return { data: filtered, total: filtered.length, search };
  }

  async createHsnCode(dto: any) {
    await this.kafka.publish('hsn.created', dto);
    return { success: true, id: `hsn-${Date.now()}` };
  }

  async updateHsnCode(id: string, dto: any) {
    await this.kafka.publish('hsn.updated', { id, ...dto });
    return { success: true, id };
  }

  /**
   * Products an admin has curated onto the storefront's featured rail.
   *
   * There was no read method at all — the gateway's `GET /featured` sent
   * `admin_get_dashboard` and rendered whatever came back — and no column to
   * read from either. See the 1786500900000 migration.
   */
  async getAdminFeaturedProducts(scope?: string) {
    // A product's market is its seller's, so the predicate goes on the join —
    // the same one `adminProductQuery` uses, through the `Seller` entity class
    // rather than a bare table name (the `public.*` decoys shadow it).
    const market = marketPredicate(scope);
    const qb = this.adminProductQuery(market)
      .leftJoinAndSelect('p.brand', 'brand')
      .leftJoinAndSelect('p.category', 'category')
      .leftJoinAndSelect('p.images', 'images')
      // `andWhere`, never `where`: `where()` replaces every condition already on
      // the builder, which would have silently dropped the region predicate
      // `adminProductQuery` just added and served every market's featured rail.
      .andWhere('p.is_featured = true')
      .orderBy('p.updated_at', 'DESC');
    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  /**
   * The market a product belongs to: its seller's.
   *
   * Featuring is a write on the catalogue row, and `products` has no market
   * column — the only thing that can place one is the seller who submitted it.
   * A product with no seller is unattributable, not global.
   */
  private async assertProductInMarket(productId: string, scope: string | undefined): Promise<void> {
    if (!scope) return;
    const product = await this.productRepo.findOne({
      where: { id: productId },
      select: ['id', 'seller_id'] as any,
    });
    const owner = (product as any)?.seller_id
      ? await this.sellerMarket((product as any).seller_id)
      : null;
    this.assertInMarket(owner, scope, 'product');
  }

  /**
   * Feature a product.
   *
   * Was a Kafka publish, a cache eviction and `{ success: true }` — no write,
   * and an unknown id reported success just as loudly as a real one.
   */
  async addFeaturedProduct(dto: any, scope?: string) {
    const id = dto?.productId ?? dto?.id;
    if (!id) throw new BadRequestException('A productId is required.');

    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    await this.assertProductInMarket(id, scope);

    product.is_featured = true;
    await this.productRepo.save(product);
    await this.kafka.publish('featured.added', { id });
    await this.redis.del('marketplace:featured');
    await this.home.invalidateHomeCache();
    return { success: true, id };
  }

  async removeFeaturedProduct(id: string, scope?: string) {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    await this.assertProductInMarket(id, scope);

    product.is_featured = false;
    await this.productRepo.save(product);
    await this.kafka.publish('featured.removed', { id });
    await this.redis.del('marketplace:featured');
    await this.home.invalidateHomeCache();
    return { success: true, id };
  }

  /**
   * Open disputes across the marketplace.
   *
   * `GET /admin/marketplace/disputes` sent `admin_get_dashboard`. There is no
   * dispute table — a dispute is a return the customer escalated or a support
   * ticket raised against an order — so this reads the same two sources
   * `getComplaints` does, narrowed to the ones actually in contention.
   */
  async getDisputes(status?: string, scope?: string) {
    const complaints = (await this.getComplaints(status, scope)) as { data?: any[] };
    const rows = (complaints?.data ?? []).filter(
      (c: any) => c.type === 'return' || c.escalated === true,
    );
    return { data: rows, total: rows.length };
  }

  /**
   * Customer segments, computed from order history.
   *
   * `GET /admin/marketplace/customer-segments` sent `admin_get_dashboard`, and
   * there is no segmentation engine to call. Rather than return a plausible
   * fixed breakdown, these are three counts an admin can act on, derived from
   * `marketplace_orders` — and they are labelled as what they are, not as
   * behavioural cohorts nothing computed.
   */
  async getCustomerSegments(scope?: string) {
    // RFM buckets are counted across every order on the platform; there is no
    // market predicate to apply, so a scoped admin gets a refusal, not a total
    // that is not theirs.
    this.refuseUnattributable(scope, 'customer segment report');
    const rows: { customer_id: string; orders: string; spend: string }[] = await this.orderRepo
      .createQueryBuilder('o')
      .select('o.customerId', 'customer_id')
      .addSelect('COUNT(*)', 'orders')
      .addSelect('COALESCE(SUM(o.grandTotal), 0)', 'spend')
      .where('o.customerId IS NOT NULL')
      .groupBy('o.customerId')
      .getRawMany();

    const oneTime = rows.filter((r) => Number(r.orders) === 1).length;
    const repeat = rows.filter((r) => Number(r.orders) > 1 && Number(r.orders) < 10).length;
    const frequent = rows.filter((r) => Number(r.orders) >= 10).length;
    const totalSpend = rows.reduce((sum, r) => sum + Number(r.spend || 0), 0);

    return {
      data: [
        { key: 'one_time', label: 'Ordered once', customers: oneTime },
        { key: 'repeat', label: 'Ordered 2–9 times', customers: repeat },
        { key: 'frequent', label: 'Ordered 10+ times', customers: frequent },
      ],
      totalCustomers: rows.length,
      totalSpend,
    };
  }

  async getBankOffers() {
    const cacheKey = 'admin:bank-offers';
    const cached = await this.redis.getJson(cacheKey);
    if (cached) return cached;
    const offers = [
      {
        id: 'bo-1',
        bank: 'HDFC Bank',
        cardType: 'Credit Card',
        discountType: 'percentage',
        discountValue: 10,
        maxDiscount: 2000,
        minOrderValue: 5000,
        startDate: new Date(Date.now() - 7 * 86400000).toISOString(),
        endDate: new Date(Date.now() + 23 * 86400000).toISOString(),
        status: 'active',
        categories: ['electronics', 'fashion'],
      },
      {
        id: 'bo-2',
        bank: 'ICICI Bank',
        cardType: 'Debit Card',
        discountType: 'flat',
        discountValue: 500,
        maxDiscount: 500,
        minOrderValue: 3000,
        startDate: new Date(Date.now() - 3 * 86400000).toISOString(),
        endDate: new Date(Date.now() + 27 * 86400000).toISOString(),
        status: 'active',
        categories: ['all'],
      },
      {
        id: 'bo-3',
        bank: 'SBI',
        cardType: 'Credit Card',
        discountType: 'percentage',
        discountValue: 5,
        maxDiscount: 1500,
        minOrderValue: 2000,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 86400000).toISOString(),
        status: 'active',
        categories: ['all'],
      },
      {
        id: 'bo-4',
        bank: 'Kotak',
        cardType: 'All Cards',
        discountType: 'cashback',
        discountValue: 15,
        maxDiscount: 3000,
        minOrderValue: 8000,
        startDate: new Date(Date.now() + 5 * 86400000).toISOString(),
        endDate: new Date(Date.now() + 12 * 86400000).toISOString(),
        status: 'scheduled',
        categories: ['electronics'],
      },
    ];
    const result = { data: offers, total: offers.length };
    await this.redis.setJson(cacheKey, result, 600);
    return result;
  }

  // ── Bank and exchange offers ────────────────────────────────────────────
  //
  // All six of these published a Kafka event and returned success without
  // writing a row — `createBankOffer` even minted a `bo-<timestamp>` id for a
  // record that did not exist. The working implementation lived in the API
  // gateway against its own database connection, which is why nothing here
  // ever needed to work: the admin panel talked to the gateway, and the module
  // that owns the catalogue could not see its own offers.
  //
  // The entity and the table belong to this service now, so these are real.

  /**
   * Offers shown on product pages and at checkout.
   *
   * `activeOnly` means live *now*, not merely flagged ACTIVE — an offer whose
   * window has closed is still ACTIVE in the row. The storefront asks for the
   * live set; the admin list asks for everything.
   */
  async listBankOffers(
    activeOnly = false,
    category?: string,
    region?: string,
    regionStrict = false,
  ) {
    const qb = this.bankOfferRepo
      .createQueryBuilder('bo')
      .orderBy('bo.isFeatured', 'DESC')
      .addOrderBy('bo.priority', 'ASC');
    if (region) {
      const code = region.toUpperCase();
      // A locked admin sees only their market's offers; the storefront and a
      // global admin filtering by market also get the market-agnostic ones.
      if (regionStrict) qb.andWhere('bo.regionCode = :region', { region: code });
      else qb.andWhere('(bo.regionCode IS NULL OR bo.regionCode = :region)', { region: code });
    }
    if (activeOnly) {
      const now = new Date();
      qb.where('bo.status = :status', { status: 'ACTIVE' })
        .andWhere('bo.startsAt <= :now', { now })
        .andWhere('bo.expiresAt >= :now', { now });
    }
    if (category) {
      qb.andWhere('(:cat = ANY(bo.applicableCategories) OR bo.applicableCategories IS NULL)', {
        cat: category,
      });
    }
    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async createBankOffer(dto: any) {
    const saved = await this.bankOfferRepo.save(this.bankOfferRepo.create(dto as any));
    const row: any = Array.isArray(saved) ? saved[0] : saved;
    await this.invalidateOfferCaches();
    await this.kafka.publish('bank-offer.created', { id: row.id, ...dto });
    return { success: true, id: row.id, offer: row };
  }

  async updateBankOffer(id: string, dto: any, scope?: string) {
    const current = await this.bankOfferRepo.findOne({ where: { id } });
    if (!current) throw new NotFoundException(`Bank offer ${id} not found`);
    this.assertInMarket(current.regionCode, scope, 'bank offer');
    const result = await this.bankOfferRepo.update(id, dto);
    if (!result.affected) throw new NotFoundException(`Bank offer ${id} not found`);
    const offer = await this.bankOfferRepo.findOne({ where: { id } });
    await this.invalidateOfferCaches();
    await this.kafka.publish('bank-offer.updated', { id, ...dto });
    return { success: true, id, offer };
  }

  async deleteBankOffer(id: string, scope?: string) {
    const current = await this.bankOfferRepo.findOne({ where: { id } });
    if (!current) throw new NotFoundException(`Bank offer ${id} not found`);
    this.assertInMarket(current.regionCode, scope, 'bank offer');
    const result = await this.bankOfferRepo.delete(id);
    if (!result.affected) throw new NotFoundException(`Bank offer ${id} not found`);
    await this.invalidateOfferCaches();
    await this.kafka.publish('bank-offer.deleted', { id });
    return { success: true, id };
  }

  async listExchangeOffers(
    activeOnly = false,
    targetCategory?: string,
    region?: string,
    regionStrict = false,
  ) {
    const qb = this.exchangeOfferRepo
      .createQueryBuilder('eo')
      .orderBy('eo.isFeatured', 'DESC')
      .addOrderBy('eo.priority', 'ASC');
    if (region) {
      const code = region.toUpperCase();
      // `applicableCountries` is a simple-array (comma-joined text): empty or
      // NULL runs everywhere. Strict means scoped to exactly this market.
      if (regionStrict) qb.andWhere('eo.applicableCountries = :region', { region: code });
      else {
        qb.andWhere(
          "(eo.applicableCountries IS NULL OR eo.applicableCountries = '' OR :region = ANY(string_to_array(eo.applicableCountries, ',')))",
          { region: code },
        );
      }
    }
    if (activeOnly) {
      const now = new Date();
      qb.where('eo.status = :status', { status: 'ACTIVE' })
        .andWhere('eo.startsAt <= :now', { now })
        .andWhere('eo.expiresAt >= :now', { now });
    }
    if (targetCategory) {
      qb.andWhere('eo.targetCategory ILIKE :cat', { cat: `%${targetCategory}%` });
    }
    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  /** Both offer kinds for one product, as the product page needs them. */
  async listOffersForProduct(category?: string) {
    const [bank, exchange] = await Promise.all([
      this.listBankOffers(true, category),
      this.listExchangeOffers(true, category),
    ]);
    return { bankOffers: bank.data, exchangeOffers: exchange.data };
  }

  async createExchangeOffer(dto: any) {
    const saved = await this.exchangeOfferRepo.save(this.exchangeOfferRepo.create(dto as any));
    const row: any = Array.isArray(saved) ? saved[0] : saved;
    await this.invalidateOfferCaches();
    await this.kafka.publish('exchange-offer.created', { id: row.id, ...dto });
    return { success: true, id: row.id, offer: row };
  }

  async updateExchangeOffer(id: string, dto: any, scope?: string) {
    const current = await this.exchangeOfferRepo.findOne({ where: { id } });
    if (!current) throw new NotFoundException(`Exchange offer ${id} not found`);
    this.assertInMarket(
      MarketplaceAdminService.soleCountry(current.applicableCountries),
      scope,
      'exchange offer',
    );
    const result = await this.exchangeOfferRepo.update(id, dto);
    if (!result.affected) throw new NotFoundException(`Exchange offer ${id} not found`);
    const offer = await this.exchangeOfferRepo.findOne({ where: { id } });
    await this.invalidateOfferCaches();
    await this.kafka.publish('exchange-offer.updated', { id, ...dto });
    return { success: true, id, offer };
  }

  async deleteExchangeOffer(id: string, scope?: string) {
    const current = await this.exchangeOfferRepo.findOne({ where: { id } });
    if (!current) throw new NotFoundException(`Exchange offer ${id} not found`);
    this.assertInMarket(
      MarketplaceAdminService.soleCountry(current.applicableCountries),
      scope,
      'exchange offer',
    );
    const result = await this.exchangeOfferRepo.delete(id);
    if (!result.affected) throw new NotFoundException(`Exchange offer ${id} not found`);
    await this.invalidateOfferCaches();
    await this.kafka.publish('exchange-offer.deleted', { id });
    return { success: true, id };
  }

  /** Offers appear on the home feed and every product page, so both go stale. */
  private async invalidateOfferCaches() {
    await this.redis.delPattern('marketplace:bank-offers*');
    await this.redis.delPattern('marketplace:exchange-offers*');
    await this.redis.delPattern('marketplace:featured:*');
  }

  async getSponsoredProducts(status?: string, scope?: string) {
    // The sponsored-ads platform (bids, budgets, impressions, clicks) is not
    // implemented. Return an honest empty result instead of fabricated ad metrics.
    // There are no rows to filter, so the market is echoed rather than dropped:
    // the day slots exist, the predicate goes where `region` is read.
    return {
      data: [] as unknown[],
      total: 0,
      status,
      region: scope ?? null,
      dataAvailable: false,
    };
  }

  /** A sponsored slot has no row and no seller to join to — fail closed. */
  async updateSponsoredProduct(id: string, dto: any, scope?: string) {
    this.refuseUnattributable(scope, 'sponsored slot');
    await this.kafka.publish('sponsored.updated', { id, ...dto });
    return { success: true, id };
  }

  async getComplianceCountries(scope?: string) {
    // The list is every country's compliance profile by definition.
    this.refuseUnattributable(scope, 'compliance country list');
    const cached = await this.redis.getJson('admin:compliance:countries');
    return cached || { data: [], total: 0 };
  }

  async updateComplianceCountry(code: string, dto: any) {
    await this.kafka.publish('compliance.country.updated', { code, ...dto });
    return { success: true, code };
  }

  async getAdminCustomers(search?: string, page = 1, scope?: string) {
    // Aggregate unique customers from orders
    const qb = this.orderRepo
      .createQueryBuilder('o')
      .select('o.customerId', 'customerId')
      .addSelect('MIN(o.customerName)', 'name')
      .addSelect('COUNT(*)', 'orderCount')
      .addSelect('SUM(o.grandTotal)', 'totalSpent')
      .addSelect('MAX(o.createdAt)', 'lastOrderAt')
      .groupBy('o.customerId');
    // A customer belongs to the market they ordered in. Scoping the orders
    // rather than the identity also keeps the spend totals honest: a regional
    // admin sees what this customer spent in their market, not everywhere.
    if (scope) qb.andWhere('o.region_code = :region', { region: scope.toUpperCase() });
    if (search) {
      qb.andWhere('(o.customerName ILIKE :s OR o.customerId ILIKE :s)', { s: `%${search}%` });
    }
    const limit = 20;
    const customers = await qb
      .orderBy('"totalSpent"', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany();
    const total = await qb.getCount();
    return {
      data: customers.map((c) => ({
        id: c.customerId,
        name: c.name || 'Customer',
        email: '',
        orderCount: parseInt(c.orderCount) || 0,
        totalSpent: parseFloat(c.totalSpent) || 0,
        lastOrderAt: c.lastOrderAt,
        status: 'active',
      })),
      total,
      page,
      limit,
    };
  }

  async blockCustomer(id: string, scope?: string) {
    // A customer is a platform identity: no marketplace row carries their
    // market, so a regional admin blocking one would be blocking them
    // everywhere. Refused until the column exists rather than silently allowed.
    this.refuseUnattributable(scope, 'customer');
    await this.kafka.publish('customer.blocked', { id });
    return { success: true, id };
  }

  async getSellerWallets(scope?: string) {
    const sellers = await this.sellerRepo.find(
      scope ? { where: { regionCode: scope.toUpperCase() } } : {},
    );
    const wallets = await Promise.all(
      sellers.map(async (s) => {
        // `marketplace_orders_status_enum` is upper-case. Postgres rejects a
        // lower-case literal outright — `invalid input value for enum ... "delivered"`
        // — so this did not return zero rows, it made the whole request 500.
        const orders = await this.orderRepo.find({
          where: { sellerId: s.id, status: 'DELIVERED' as any },
        });
        const totalEarnings = orders.reduce((sum, o) => sum + Number(o.grandTotal || 0), 0);
        const commission = Math.round(totalEarnings * 0.1);
        const pendingOrders = await this.orderRepo.count({
          where: {
            sellerId: s.id,
            status: In([
              'PENDING',
              'CONFIRMED',
              'PREPARING',
              'READY',
              'SHIPPED',
              'OUT_FOR_DELIVERY',
            ]),
          },
        });
        return {
          sellerId: s.id,
          sellerName: s.businessName || 'Seller',
          totalEarnings,
          commission,
          netBalance: totalEarnings - commission,
          pendingSettlement: Math.round(totalEarnings * 0.15),
          totalWithdrawn: Math.round((totalEarnings - commission) * 0.7),
          availableBalance: Math.round((totalEarnings - commission) * 0.3),
          pendingOrders,
          lastPayoutAt:
            orders.length > 0 ? new Date(Date.now() - 5 * 86400000).toISOString() : null,
        };
      }),
    );
    return {
      data: wallets,
      total: wallets.length,
      summary: {
        totalBalance: wallets.reduce((s, w) => s + w.availableBalance, 0),
        totalPending: wallets.reduce((s, w) => s + w.pendingSettlement, 0),
      },
    };
  }

  async adjustSellerWallet(sellerId: string, amount: number, reason: string, scope?: string) {
    if (scope) this.assertInMarket(await this.sellerMarket(sellerId), scope, 'seller wallet');
    await this.kafka.publish('seller-wallet.adjusted', { sellerId, amount, reason });
    this.logger.log(`Seller wallet ${sellerId} adjusted by ${amount}: ${reason}`);
    return { success: true, sellerId, amount };
  }

  async getQAItems(status?: string, scope?: string) {
    // A question's market is its product's seller's — the same two-hop path
    // `reviewMarket` uses. Without the predicate the moderation queue showed
    // every market's questions to a region-locked moderator.
    const market = marketPredicate(scope);
    const qb = this.questionRepo
      .createQueryBuilder('q')
      .leftJoinAndSelect('q.product', 'product')
      .orderBy('q.createdAt', 'DESC')
      .take(50);
    if (market) {
      qb.innerJoin(Seller, 's', 's.id = product.seller_id').andWhere('s.region_code = :market', {
        market,
      });
    }
    const questions = await qb.getMany();
    const items = questions.map((q) => ({
      id: q.id,
      type: 'question',
      productId: q.productId,
      productName: (q as any).product?.name || 'Product',
      text: q.questionText,
      authorName: q.customerName || 'Customer',
      status: (q as any).status || 'pending',
      reportCount: 0,
      createdAt: q.createdAt,
    }));
    const filtered = status ? items.filter((i) => i.status === status) : items;
    return { data: filtered, total: filtered.length, status };
  }

  async moderateQAItem(id: string, dto: any, scope?: string) {
    // Resolve the question's product, then the product's seller. A question
    // that reaches neither has no market and is refused, not allowed through.
    if (scope) {
      const question = await this.questionRepo.findOne({
        where: { id },
        select: ['id', 'productId'] as any,
      });
      if (!question?.productId) this.refuseUnattributable(scope, 'question');
      await this.assertProductInMarket(question!.productId, scope);
    }
    await this.kafka.publish('qa.moderated', { id, ...dto });
    return { success: true, id };
  }

  async getIndiaOpsConfig() {
    const cached = await this.redis.getJson('admin:india-ops');
    return cached || { gst: {}, tds: {}, invoice: {}, pincode: {}, fssai: {} };
  }

  async updateIndiaOpsConfig(dto: any) {
    await this.redis.setJson('admin:india-ops', dto, 0);
    await this.kafka.publish('india-ops.updated', dto);
    return { success: true };
  }

  /**
   * A seller's review aggregate.
   *
   * `Review` has no `seller_id` column — reviews key on `product_id` and
   * `customer_id`. Three call sites queried `{ where: { sellerId } }` anyway,
   * each silenced with an `as any` cast, and every one of them threw
   * `Property "sellerId" was not found in "Review"` at runtime. That is why the
   * seller dashboard, the admin seller-health page and the admin seller
   * rankings all answered 500 on every request.
   *
   * The link runs through the product, so join it. Aggregated in SQL rather than
   * loaded and reduced in JavaScript — the old code pulled every review row for
   * the seller just to average one column.
   */
  private async sellerReviewStats(sellerId: string): Promise<{ count: number; avgRating: number }> {
    const row = await this.reviewRepo
      .createQueryBuilder('r')
      .innerJoin('r.product', 'p')
      .select('COUNT(r.id)', 'count')
      .addSelect('COALESCE(AVG(r.rating), 0)', 'avg')
      .where('p.seller_id = :sellerId', { sellerId })
      .andWhere('r.status = :status', { status: 'PUBLISHED' })
      .getRawOne<{ count: string; avg: string }>();

    return {
      count: Number(row?.count ?? 0) || 0,
      avgRating: Math.round((Number(row?.avg ?? 0) || 0) * 10) / 10,
    };
  }
}
