import { applyMarketFilter, normaliseMarket, refuseUnattributable } from '@app/common';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository, In } from 'typeorm';
import { RedisService } from '@app/redis';
import { KafkaProducerService } from '@app/kafka';
import { EncryptionService } from '@app/security';
import { getRegionConfig, isSupportedRegion, DEFAULT_REGION } from '@app/region';
import { CatalogService } from '../catalog/catalog.service';
import { CatalogCache } from '../catalog/catalog-cache';
import { AttributeValuesService, type AttributeInput } from '../catalog/attribute-values.service';
import { Seller } from '../entities/seller.entity';
import { Product } from '../entities/product.entity';
import { ProductListing } from '../entities/product-listing.entity';
import { MarketplaceOrder } from '../entities/marketplace-order.entity';
import { Review } from '../entities/review.entity';
import { ReturnRequest } from '../entities/return-request.entity';
import { ProductImage } from '../entities/product-image.entity';
import { ProductVariant } from '../entities/product-variant.entity';
import { ProductQuestion, ProductAnswer } from '../entities/product-qa.entity';
import { MarketplaceNotification } from '../entities/marketplace-notification.entity';
import { SellerBankAccount } from '../entities/seller-bank-account.entity';
import { SellerSettings } from '../entities/seller-settings.entity';
import { SellerKyc } from '../entities/seller-kyc.entity';
import { SellerStaff } from '../entities/seller-staff.entity';
import { SellerPromotion } from '../entities/seller-promotion.entity';
import { SellerSupportTicket } from '../entities/seller-support-ticket.entity';

/**
 * KARTSEEK Seller Service — Multi-Regional Architecture
 *
 * All seller profiles and inventory are strictly segmented by country code.
 * Sellers registered in India (IN) are only visible to customers in India;
 * those in Qatar (QA) only serve customers in Qatar, etc.
 *
 * Redis key pattern: `region:{countryCode}:seller:{sellerId}`
 * This ensures complete data isolation between operational regions.
 */
/**
 * Masks a tax identifier (PAN, GSTIN) to its last 4 characters, e.g.
 * "27AAPFU0939F1ZV" → "•••••••••••1ZV". Returns '' for an absent value so callers
 * can still distinguish "not on file" from "on file but redacted".
 */
function maskTaxId(value: string): string {
  if (!value) return '';
  const tail = value.slice(-4);
  return `${'•'.repeat(Math.max(0, value.length - 4))}${tail}`;
}

@Injectable()
export class SellerService {
  private readonly logger = new Logger(SellerService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly kafka: KafkaProducerService,
    @InjectRepository(Seller) private readonly sellerRepo: Repository<Seller>,
    @InjectRepository(SellerSettings) private readonly settingsRepo: Repository<SellerSettings>,
    @InjectRepository(SellerKyc) private readonly kycRepo: Repository<SellerKyc>,
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductListing) private readonly listingRepo: Repository<ProductListing>,
    @InjectRepository(MarketplaceOrder) private readonly orderRepo: Repository<MarketplaceOrder>,
    @InjectRepository(Review) private readonly reviewRepo: Repository<Review>,
    @InjectRepository(ReturnRequest) private readonly returnRepo: Repository<ReturnRequest>,
    @InjectRepository(ProductImage) private readonly imageRepo: Repository<ProductImage>,
    @InjectRepository(ProductVariant) private readonly variantRepo: Repository<ProductVariant>,
    @InjectRepository(ProductQuestion) private readonly questionRepo: Repository<ProductQuestion>,
    @InjectRepository(ProductAnswer) private readonly answerRepo: Repository<ProductAnswer>,
    @InjectRepository(MarketplaceNotification)
    private readonly notificationRepo: Repository<MarketplaceNotification>,
    @InjectRepository(SellerBankAccount)
    private readonly bankAccountRepo: Repository<SellerBankAccount>,
    private readonly encryption: EncryptionService,
    @InjectRepository(SellerStaff) private readonly staffRepo: Repository<SellerStaff>,
    @InjectRepository(SellerPromotion) private readonly promotionRepo: Repository<SellerPromotion>,
    @InjectRepository(SellerSupportTicket)
    private readonly supportRepo: Repository<SellerSupportTicket>,
    // Registration writes four tables and must not leave a partial account behind.
    @InjectDataSource() private readonly dataSource: DataSource,
    // Owns the buy box. Every listing mutation here has to hand it back so the
    // winner is recalculated — the flag decides which seller's price the
    // storefront quotes and checkout charges. One-directional: CatalogService
    // knows nothing about this class.
    private readonly catalog: CatalogService,
    private readonly attributeValues: AttributeValuesService,
  ) {}

  private catalogCacheInstance?: CatalogCache;

  /** The catalogue's cache — dropped after every price, stock or image write below. */
  private get catalogCache(): CatalogCache {
    return (this.catalogCacheInstance ??= new CatalogCache(this.redis, this.logger));
  }

  /**
   * Turn a placed customer order into one fulfilment record per seller.
   *
   * THE GAP THIS CLOSES: checkout writes to order-service (`order.orders`), and
   * every seller-facing surface — the orders queue, the dashboard KPIs, returns,
   * shipment tracking, commission — reads `marketplace.marketplace_orders`.
   * Nothing ever wrote to the latter. A customer could pay, order-service would
   * record it, and the seller responsible for shipping it never saw the order at
   * all. `marketplace_orders` was empty on a system with a live catalogue.
   *
   * One row per seller, not per order, because a single basket can span sellers
   * and each has its own fulfilment lifecycle, tracking id and payout. That is
   * what the table's `seller_id` + `@Index(['sellerId','status'])` were always
   * shaped for.
   *
   * Idempotent on `orderNumber`: checkout retries and at-least-once event
   * delivery must not create a second copy of the same seller order. Stock is
   * decremented in the same pass, floored at zero, so an oversell cannot drive a
   * listing negative.
   */
  async createSellerOrders(dto: {
    orderId: string;
    orderNumber?: string;
    customerId: string;
    customerName?: string;
    items: Array<{
      productId: string;
      listingId?: string;
      sellerId?: string;
      name?: string;
      quantity: number;
      price: number;
      variantId?: string;
      variantName?: string;
    }>;
    shippingAddress?: unknown;
    paymentMethod?: string;
    paymentStatus?: string;
    discount?: number;
    deliveryFee?: number;
    taxAmount?: number;
    regionCode?: string;
  }) {
    const lines = Array.isArray(dto?.items) ? dto.items : [];
    if (!dto?.orderId || lines.length === 0) {
      return {
        success: false,
        reason: 'An order id and at least one item are required',
        orders: [] as unknown[],
      };
    }

    // Lines whose seller could not be resolved cannot be fulfilled by anyone.
    // Reported rather than silently dropped, so a pricing regression surfaces
    // here instead of as a seller quietly missing orders.
    const orphaned = lines.filter((l) => !l?.sellerId);
    const bySeller = new Map<string, typeof lines>();
    for (const line of lines) {
      if (!line?.sellerId) continue;
      const bucket = bySeller.get(line.sellerId) ?? [];
      bucket.push(line);
      bySeller.set(line.sellerId, bucket);
    }

    if (bySeller.size === 0) {
      this.logger.error(`Order ${dto.orderId}: no line carried a sellerId — nothing to fulfil`);
      return { success: false, reason: 'No line could be attributed to a seller', orders: [] };
    }

    // Proportional split of order-level money across sellers, by item value, so
    // the seller rows always sum back to what the customer was charged.
    const grossTotal = lines.reduce(
      (sum, l) => sum + Number(l.price ?? 0) * Number(l.quantity ?? 0),
      0,
    );
    const share = (sellerTotal: number, amount: number) =>
      grossTotal > 0 ? Math.round(amount * (sellerTotal / grossTotal) * 100) / 100 : 0;

    const created: MarketplaceOrder[] = [];

    for (const [sellerId, sellerLines] of bySeller) {
      const orderNumber = `${dto.orderNumber ?? dto.orderId}-${sellerId.slice(0, 8)}`;

      const existing = await this.orderRepo.findOne({ where: { orderNumber } });
      if (existing) {
        created.push(existing);
        continue;
      }

      const items = sellerLines.map((l) => ({
        productId: l.productId,
        listingId: l.listingId ?? '',
        name: l.name ?? '',
        // The SKU the seller has to pick — its label doubles as the sellerSku
        // slot the portal renders; the id is what stock and returns key on.
        variantId: l.variantId ?? '',
        sellerSku: l.variantName ?? '',
        quantity: Number(l.quantity ?? 0),
        unitPrice: Number(l.price ?? 0),
        subtotal: Math.round(Number(l.price ?? 0) * Number(l.quantity ?? 0) * 100) / 100,
      }));

      const itemTotal = items.reduce((sum, i) => sum + i.subtotal, 0);
      const discountAmount = share(itemTotal, Number(dto.discount ?? 0));
      const deliveryFee = share(itemTotal, Number(dto.deliveryFee ?? 0));
      const taxAmount = share(itemTotal, Number(dto.taxAmount ?? 0));

      const order = this.orderRepo.create({
        orderNumber,
        customerId: dto.customerId,
        customerName: dto.customerName ?? '',
        sellerId,
        items,
        itemTotal,
        deliveryFee,
        taxAmount,
        discountAmount,
        grandTotal: Math.round((itemTotal + deliveryFee + taxAmount - discountAmount) * 100) / 100,
        status: 'PENDING',
        paymentMethod: (dto.paymentMethod ?? 'ONLINE').toUpperCase() === 'COD' ? 'COD' : 'ONLINE',
        paymentStatus: (dto.paymentStatus ?? 'PENDING').toUpperCase(),
        shippingAddress: (dto.shippingAddress ?? null) as any,
        regionCode: dto.regionCode ?? null,
      } as Partial<MarketplaceOrder>);

      const saved = await this.orderRepo.save(order);
      created.push(saved);

      // Stock is NOT taken here.
      //
      // It used to be, as `GREATEST("stockQuantity" - n, 0)` — after the order
      // row was already committed, and gated on `line.listingId`, which the
      // gateway never sent. So it never ran; and had it run, the `GREATEST`
      // clamp would have absorbed an oversell into a silent zero instead of
      // refusing the order.
      //
      // The gateway now reserves conditionally through
      // `CatalogService.reserveListingStock` *before* `place_order`, which is
      // the only point where losing the race can still refuse the checkout.
      // This projection runs after the order exists and must not decrement
      // again — doing so would double-count every line.

      // Drives the seller portal's live "new order" toast and badge.
      await this.kafka.publish('marketplace.order.placed', {
        orderId: saved.id,
        orderNumber: saved.orderNumber,
        sellerId,
        customerId: dto.customerId,
        amount: Number(saved.grandTotal),
        items: items.map((i) => ({ name: i.name, quantity: i.quantity })),
        placedAt: new Date().toISOString(),
      });

      this.logger.log(
        `📦 Seller order ${saved.orderNumber} → seller ${sellerId} (${items.length} line(s))`,
      );
    }

    // Invalidate the cached dashboard so the new order shows immediately.
    await this.invalidateDashboard(...bySeller.keys());

    return {
      success: true,
      orders: created.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        sellerId: o.sellerId,
        grandTotal: Number(o.grandTotal),
      })),
      orphanedLines: orphaned.length,
    };
  }

  /**
   * Resolves a seller's owning auth user. Used by the API Gateway's ownership guard:
   * the gateway holds no seller repository, so it asks Marketplace who owns a seller
   * before forwarding a `/sellers/:sellerId/*` request.
   *
   * Returns `ownerId: null` for an unknown seller as well as an un-backfilled one —
   * the caller must treat both as "deny", never as "no restriction".
   */
  /**
   * The seller account this user owns, if any.
   *
   * Needed because a seller's own id is not in their JWT — the token carries the
   * *user* id, and the two differ. Sign-in sends an unapproved seller to watch
   * their application, and without this there was no way to say which
   * application that is.
   *
   * Lifecycle fields only, matching `get_seller_profile`'s shape closely enough
   * that the gateway can return either.
   */
  async getSellerByOwner(ownerId: string) {
    if (!ownerId) return null;
    const seller = await this.sellerRepo.findOne({
      where: { ownerId } as any,
      select: [
        'id',
        'businessName',
        'storeSlug',
        'regionCode',
        'verificationStatus',
        'kycStatus',
        'createdAt',
      ],
    });
    if (!seller) return null;
    return {
      id: seller.id,
      businessName: seller.businessName ?? null,
      storeSlug: seller.storeSlug ?? null,
      countryCode: seller.regionCode ?? null,
      status: seller.verificationStatus ?? null,
      kycStatus: seller.kycStatus ?? null,
      joinedAt: (seller as any).createdAt ?? null,
    };
  }

  /**
   * The owner and the market of one seller, for the gateway's
   * SellerOwnershipGuard.
   *
   * `regionCode` is here because the guard short-circuits for any ADMIN role
   * and had nothing to check a market against: a QA-locked admin could read and
   * write an Indian seller's orders, wallet, bank accounts, staff and products
   * across 111 routes. Read-only, no PII.
   */
  async getSellerOwner(
    sellerId: string,
  ): Promise<{ sellerId: string; ownerId: string | null; regionCode: string | null }> {
    if (!sellerId) return { sellerId, ownerId: null, regionCode: null };
    const seller = await this.sellerRepo.findOne({
      where: { id: sellerId },
      select: ['id', 'ownerId', 'regionCode'],
    });
    return {
      sellerId,
      ownerId: seller?.ownerId ?? null,
      regionCode: seller?.regionCode ?? null,
    };
  }

  /**
   * The account state the gateway needs to decide whether this seller may trade.
   *
   * Approval used to live only in the browser: the portal's `SellerRoleGuard`
   * read `users.status`, and nothing on the server ever looked at
   * `sellers.verificationStatus`. An admin suspending or rejecting a seller in
   * the super-admin console changed that column and nothing else, so the
   * suspended seller kept full access to every seller API — orders, payouts,
   * price changes — for as long as their token lasted. `SellerApprovalGuard`
   * consumes this.
   *
   * A missing seller returns `found: false`, which the guard must treat as a
   * denial rather than as "nothing to check".
   */
  async getSellerAccountStatus(sellerId: string): Promise<{
    sellerId: string;
    found: boolean;
    verificationStatus: string | null;
    isActive: boolean;
  }> {
    if (!sellerId) return { sellerId, found: false, verificationStatus: null, isActive: false };
    const seller = await this.sellerRepo.findOne({
      where: { id: sellerId },
      select: ['id', 'verificationStatus', 'isActive'],
    });
    if (!seller) return { sellerId, found: false, verificationStatus: null, isActive: false };
    return {
      sellerId,
      found: true,
      verificationStatus: seller.verificationStatus ?? null,
      isActive: seller.isActive !== false,
    };
  }

  async healthCheck() {
    return {
      service: 'marketplace-service:seller',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  // ── Region-Scoped Seller Operations ─────────────────────────────────────

  async getSellerProfile(sellerId: string, countryCode: string) {
    const key = this.regionKey(countryCode, 'seller', sellerId);
    const cached = await this.redis.getJson<any>(key);
    if (cached) return cached;

    const seller = await this.sellerRepo.findOne({ where: { id: sellerId } });
    if (!seller) throw new NotFoundException(`Seller ${sellerId} not found`);

    const kyc = await this.kycRepo.findOne({ where: { sellerId } });
    const orderCount = await this.orderRepo.count({ where: { sellerId } });

    const profile = {
      id: seller.id,
      businessName: seller.businessName,
      storeSlug: seller.storeSlug,
      status: seller.verificationStatus,
      kycStatus: kyc?.status || 'PENDING',
      countryCode: seller.regionCode || countryCode,
      rating: seller.sellerRating,
      totalOrders: orderCount,
      joinedAt: seller.createdAt,
    };

    await this.redis.setJson(key, profile, 300);
    return profile;
  }

  async updateSellerProfile(
    sellerId: string,
    countryCode: string,
    dto: Partial<Record<string, unknown>>,
  ) {
    const seller = await this.sellerRepo.findOne({ where: { id: sellerId } });
    if (!seller) throw new NotFoundException(`Seller ${sellerId} not found`);

    if (dto.businessName) seller.businessName = dto.businessName as string;
    if (dto.storeSlug) seller.storeSlug = dto.storeSlug as string;
    await this.sellerRepo.save(seller);

    // Invalidate cache
    await this.redis.del(this.regionKey(countryCode, 'seller', sellerId));

    return { ...seller, updatedAt: new Date().toISOString() };
  }

  /** Every period variant of one seller's cached dashboard. */
  private dashboardKeys(sellerId: string) {
    return (['today', 'week', 'month'] as const).map((p) => `seller:dashboard:${sellerId}:${p}`);
  }

  /**
   * Drop a seller's cached dashboard.
   *
   * Must clear *all three* period variants. Every caller used to delete the bare
   * `seller:dashboard:<id>` key, which stopped matching anything once the period
   * was folded into the key — so a seller who had just been paid watched the
   * live "new order" toast appear over a pipeline that still showed the old
   * counts, for up to the 120s cache life.
   */
  private async invalidateDashboard(...sellerIds: string[]) {
    await Promise.all(
      sellerIds
        .filter(Boolean)
        .flatMap((id) => this.dashboardKeys(id))
        .map((key) => this.redis.del(key).catch((): undefined => undefined)),
    );
  }

  /**
   * Seller dashboard KPIs.
   *
   * `period` selects the window the headline sales figure covers. It used to be
   * accepted by the route and then dropped: the portal's Today / This Week /
   * This Month buttons re-fetched, re-rendered, and showed the identical number
   * every time, because the response only ever carried today's revenue under the
   * headline. The cache key now carries the period too — without that the first
   * period fetched would have been served back for the other two for 120s.
   */
  async getSellerDashboard(
    sellerId: string,
    countryCode: string,
    period: 'today' | 'week' | 'month' = 'today',
  ) {
    const window: 'today' | 'week' | 'month' =
      period === 'week' || period === 'month' ? period : 'today';
    const cacheKey = `seller:dashboard:${sellerId}:${window}`;
    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodStart =
      window === 'month' ? monthStart : window === 'week' ? weekStart : todayStart;

    const [
      todayOrders,
      pendingOrders,
      weeklyRevResult,
      monthlyRevResult,
      totalProducts,
      lowStockProducts,
    ] = await Promise.all([
      this.orderRepo
        .createQueryBuilder('o')
        .where('o.sellerId = :sellerId', { sellerId })
        .andWhere('o.createdAt >= :todayStart', { todayStart })
        .getCount(),
      this.orderRepo.count({ where: { sellerId, status: 'PENDING' } }),
      this.orderRepo
        .createQueryBuilder('o')
        .select('COALESCE(SUM(o.grandTotal), 0)', 'sum')
        .where('o.sellerId = :sellerId', { sellerId })
        .andWhere('o.createdAt >= :weekStart', { weekStart })
        .andWhere('o.paymentStatus = :paid', { paid: 'PAID' })
        .getRawOne(),
      this.orderRepo
        .createQueryBuilder('o')
        .select('COALESCE(SUM(o.grandTotal), 0)', 'sum')
        .where('o.sellerId = :sellerId', { sellerId })
        .andWhere('o.createdAt >= :monthStart', { monthStart })
        .andWhere('o.paymentStatus = :paid', { paid: 'PAID' })
        .getRawOne(),
      this.listingRepo.count({ where: { seller: { id: sellerId }, isActive: true } }),
      this.listingRepo
        .createQueryBuilder('l')
        .where('l.seller_id = :sellerId', { sellerId })
        .andWhere('l.stockQuantity < 5')
        .andWhere('l.isActive = true')
        .getCount(),
    ]);

    const paidSum = (from?: Date) => {
      const qb = this.orderRepo
        .createQueryBuilder('o')
        .select('COALESCE(SUM(o.grandTotal), 0)', 'sum')
        .addSelect('COUNT(*)', 'count')
        .where('o.sellerId = :sellerId', { sellerId })
        .andWhere('o.paymentStatus = :paid', { paid: 'PAID' });
      if (from) qb.andWhere('o.createdAt >= :from', { from });
      return qb.getRawOne();
    };

    // `lifetime` is what "Total Revenue" is supposed to mean. The dashboard used
    // to show monthly revenue under both "Monthly Sales" and "Total Revenue" —
    // two tiles side by side, always identical, one of them lying.
    const [todayRevResult, periodRevResult, lifetimeRevResult] = await Promise.all([
      paidSum(todayStart),
      window === 'today' ? Promise.resolve(null) : paidSum(periodStart),
      paidSum(),
    ]);

    // Get avg rating
    const seller = await this.sellerRepo.findOne({ where: { id: sellerId } });

    // ── The order pipeline ───────────────────────────────────────────────────
    // One grouped query rather than nine counts. The portal's pipeline strip
    // (Pending → Accepted → Packed → Shipped → Delivered → Cancelled → Returns)
    // had nothing behind it at all: only `pendingOrders` was ever computed, so
    // every other stage read zero however many orders were moving through it.
    const byStatus = await this.orderRepo
      .createQueryBuilder('o')
      .select('o.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('o.sellerId = :sellerId', { sellerId })
      .groupBy('o.status')
      .getRawMany();

    const stage = (...statuses: string[]) =>
      byStatus
        .filter((r) => statuses.includes(String(r.status)))
        .reduce((sum, r) => sum + Number(r.count ?? 0), 0);

    const totalOrders = byStatus.reduce((sum, r) => sum + Number(r.count ?? 0), 0);
    const deliveredOrders = stage('DELIVERED');
    const cancelledOrders = stage('CANCELLED');
    const returnedOrders = stage('RETURN_REQUESTED', 'RETURNED');

    // Listings still awaiting moderation, and those the moderators refused.
    const [approvalPending, rejectedProducts, outOfStockProducts] = await Promise.all([
      this.productRepo
        .createQueryBuilder('p')
        .where('p.seller_id = :sellerId', { sellerId })
        .andWhere('p.approval_status = :s', { s: 'PENDING' })
        .getCount()
        .catch(() => 0),
      this.productRepo
        .createQueryBuilder('p')
        .where('p.seller_id = :sellerId', { sellerId })
        .andWhere('p.approval_status = :s', { s: 'REJECTED' })
        .getCount()
        .catch(() => 0),
      this.listingRepo
        .createQueryBuilder('l')
        .where('l.seller_id = :sellerId', { sellerId })
        .andWhere('l.stockQuantity = 0')
        .andWhere('l.isActive = true')
        .getCount()
        .catch(() => 0),
    ]);

    /**
     * Account health, 0–100.
     *
     * A blend of the things a marketplace actually penalises: cancellations and
     * returns against delivered volume, plus the seller's own rating. A seller
     * with no order history scores 100 rather than 0 — nothing has gone wrong
     * yet, and showing a brand-new seller "0% health" is both wrong and alarming.
     */
    const settled = deliveredOrders + cancelledOrders + returnedOrders;
    const faultRate = settled > 0 ? (cancelledOrders + returnedOrders) / settled : 0;
    const ratingScore =
      Number(seller?.sellerRating ?? 0) > 0 ? Math.min(Number(seller!.sellerRating) / 5, 1) : 1;
    const healthScore = Math.round(((1 - faultRate) * 0.6 + ratingScore * 0.4) * 100);

    const periodRaw = periodRevResult ?? todayRevResult;

    const result = {
      sellerId,
      countryCode,
      period: window,
      todayOrders,
      todayRevenue: parseFloat(todayRevResult?.sum || '0'),
      // The figure the headline tile shows, for whichever window is selected.
      periodRevenue: parseFloat(periodRaw?.sum || '0'),
      periodOrders: Number(periodRaw?.count ?? 0),
      lifetimeRevenue: parseFloat(lifetimeRevResult?.sum || '0'),
      pendingOrders,
      weeklyRevenue: parseFloat(weeklyRevResult?.sum || '0'),
      monthlyRevenue: parseFloat(monthlyRevResult?.sum || '0'),
      totalProducts,
      lowStockProducts,
      outOfStockProducts,
      avgRating: seller?.sellerRating || 0,
      // Pipeline. `CONFIRMED` is what acceptOrder sets, `PREPARING`/`READY` are
      // the packed stages — mapped onto the labels the portal renders.
      acceptedOrders: stage('CONFIRMED'),
      packedOrders: stage('PREPARING', 'READY'),
      shippedOrders: stage('SHIPPED', 'OUT_FOR_DELIVERY'),
      deliveredOrders,
      cancelledOrders,
      returnRequests: stage('RETURN_REQUESTED'),
      refundRequests: stage('REFUNDED'),
      approvalPending,
      rejectedProducts,
      totalOrders,
      healthScore,
      topProducts: [] as unknown[],
      recentOrders: [] as unknown[],
    };

    await this.redis.setJson(cacheKey, result, 120);
    return result;
  }

  async getSellersByRegion(countryCode: string, page = 1, limit = 20) {
    // The market is the whole question this method asks, so an unreadable one is
    // a refusal rather than "every seller": `applyMarketFilter` adds no clause
    // for an absent market, and reaching `getManyAndCount` with no predicate
    // here would return the platform's entire seller list under one market's
    // heading. The predicate itself is `andWhere` — this was the only remaining
    // `.where(` market clause in the module, and `where` REPLACES the clause,
    // so the next person to add a filter above it would have deleted it.
    const market = normaliseMarket(countryCode);
    if (!market)
      refuseUnattributable(
        countryCode,
        'market',
        undefined,
        `${countryCode} is not a market this platform operates in.`,
      );
    const qb = this.sellerRepo
      .createQueryBuilder('s')
      .orderBy('s.sellerRating', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    applyMarketFilter(qb, 's.regionCode', market);

    const [data, total] = await qb.getManyAndCount();
    return { countryCode: market, data, total, page, limit };
  }

  async getSellerOrders(
    sellerId: string,
    countryCode: string,
    status?: string,
    page = 1,
    limit = 20,
  ) {
    const qb = this.orderRepo
      .createQueryBuilder('o')
      .where('o.sellerId = :sellerId', { sellerId })
      .orderBy('o.createdAt', 'DESC');

    if (status) qb.andWhere('o.status = :status', { status });
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { sellerId, countryCode, data, total, page, limit };
  }

  async getSellerInventory(sellerId: string, countryCode: string, page = 1, limit = 30) {
    const [data, total] = await this.listingRepo.findAndCount({
      where: { seller: { id: sellerId } },
      relations: ['product'],
      order: { stockQuantity: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { sellerId, countryCode, data, total, page, limit };
  }

  /**
   * List a new product.
   *
   * A `Product` on its own is **not sellable**: the price a customer pays and the
   * stock they buy against live on `ProductListing`, and `priceOrderItems`
   * refuses any line whose product has no active listing. This used to create
   * only the product row, so every item a seller added through the portal was
   * unbuyable — checkout answered "Product has no active seller listing" — and
   * it wrote the *selling* price into `mrp`, which is the list price shown struck
   * through, not what is charged.
   *
   * Both rows are created together, and the slug is made unique: two sellers
   * listing "Cotton T-Shirt" collided on a unique constraint and the second one
   * failed with a 500.
   */
  async addProduct(sellerId: string, countryCode: string, dto: Record<string, any>) {
    const name = String(dto.name ?? '').trim();
    if (!name) throw new BadRequestException('A product name is required.');

    const sellingPrice = Number(dto.sellingPrice ?? dto.price ?? 0);
    if (!Number.isFinite(sellingPrice) || sellingPrice <= 0) {
      throw new BadRequestException('A selling price greater than zero is required.');
    }

    // MRP is the list price. It may be higher than the selling price (that is
    // what produces a discount badge) but never lower.
    const mrp = Number(dto.mrp ?? 0) || sellingPrice;
    if (mrp < sellingPrice) {
      throw new BadRequestException('The list price (MRP) cannot be below the selling price.');
    }

    const stock = Math.max(Math.trunc(Number(dto.stock ?? dto.stockQuantity ?? 0)), 0);

    // Unique slug. `name.toLowerCase().replace(…)` alone collides across sellers.
    const base =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'product';
    let slug = base;
    for (let n = 2; await this.productRepo.findOne({ where: { slug }, select: ['id'] }); n++) {
      slug = `${base}-${n}`;
    }

    /**
     * `globalTradeItemNumber` (ASIN/GTIN/UPC) is NOT NULL **and** unique, and
     * nothing was setting it — so every product a seller submitted through the
     * portal violated the constraint and the insert failed. A seller supplying a
     * real GTIN keeps it; otherwise a stable internal identifier is minted, the
     * way a marketplace assigns its own catalogue number to an item that has no
     * manufacturer barcode.
     */
    const gtin =
      String(dto.gtin ?? dto.globalTradeItemNumber ?? '').trim() ||
      `KS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const clash = await this.productRepo.findOne({
      where: { globalTradeItemNumber: gtin },
      select: ['id'],
    });
    if (clash) throw new BadRequestException(`A product with identifier ${gtin} already exists.`);

    // A seller-supplied SKU is checked against this seller's own listings before
    // anything is written. `product_listings` now carries a unique
    // `(seller, sellerSku)` index, and the listing is inserted *after* the
    // product — so without this the constraint fires on the second insert and
    // leaves an orphaned catalogue row behind, reported to the seller as an
    // opaque 500 rather than "you already use that SKU".
    const requestedSku = String(dto.sku ?? '').trim();
    if (requestedSku) {
      const skuClash = await this.listingRepo.findOne({
        where: { seller: { id: sellerId }, sellerSku: requestedSku },
        select: ['id'],
      });
      if (skuClash) {
        throw new BadRequestException(`You already have a listing with SKU ${requestedSku}.`);
      }
    }

    // Built as a single entity — a spread of conditional keys makes TypeScript
    // resolve `create()` to its array overload.
    // Attributes are validated against the category's schema BEFORE any row
    // is written, so a refused submission leaves nothing half-created. The
    // errors are addressed by attribute slug so the form can mark the field.
    const attributeRows = await this.validateAttributesOrThrow(
      [dto.subcategoryId, dto.categoryId],
      dto.attributes,
      { requireAll: true },
    );

    const product: Product = this.productRepo.create({
      globalTradeItemNumber: gtin,
      name,
      slug,
      short_description: dto.description ?? dto.short_description ?? null,
      long_description: dto.longDescription ?? dto.long_description ?? null,
      seller_id: sellerId,
      mrp,
      // New listings are moderated before they go live — see the admin
      // approvals queue. `is_active` follows approval, not the seller.
      status: dto.status === 'DRAFT' ? 'DRAFT' : 'ACTIVE',
      approval_status: 'PENDING',
      is_active: false,
    });
    if (dto.categoryId) (product as any).category = { id: dto.categoryId };
    // The leaf category was never stored: the form sends both, and the product
    // page breadcrumb and the category schema both read `subcategory`.
    if (dto.subcategoryId) (product as any).subcategory = { id: dto.subcategoryId };
    if (dto.brandId) (product as any).brand = { id: dto.brandId };

    const saved = await this.productRepo.save(product);
    if (attributeRows) await this.attributeValues.replaceForProduct(saved.id, attributeRows);

    // The listing is what makes it buyable.
    const sku = requestedSku || `${slug.slice(0, 24)}-${saved.id.slice(0, 6)}`;
    const listing = this.listingRepo.create({
      product: { id: saved.id } as any,
      seller: { id: sellerId } as any,
      sellerSku: sku,
      sellingPrice,
      stockQuantity: stock,
      condition: dto.condition ?? 'NEW',
      // Not assumed. Even as the only offer on a brand-new product this is
      // false until the listing is approved and in stock, because the buy box
      // means "what a customer is quoted" — and an unapproved offer must not be
      // quoted. `recomputeBuyBox` sets it at approval.
      isBuyBoxWinner: false,
      approvalStatus: 'PENDING',
      // Held back until the product is approved; otherwise an unmoderated item
      // would be purchasable the moment it was created.
      isActive: false,
    });
    const savedListing = await this.listingRepo.save(listing);

    await this.invalidateDashboard(sellerId);
    await this.kafka.publish('seller.product.created', {
      id: saved.id,
      listingId: savedListing.id,
      sellerId,
      countryCode,
      name,
      sellingPrice,
      stock,
    });

    this.logger.log(`🆕 Product listed: ${name} by seller ${sellerId} — awaiting approval`);
    return {
      success: true,
      productId: saved.id,
      listingId: savedListing.id,
      status: 'PENDING_APPROVAL',
      message: 'Submitted for review. It goes on sale once an admin approves it.',
      product: saved,
    };
  }

  /**
   * Offer on a product that is already in the catalogue.
   *
   * THE GAP THIS CLOSES — this is what made the platform multi-*shop* rather
   * than multi-*vendor*. `addProduct` was the only way to create a listing, and
   * it always inserted a **new** `products` row: a new slug, a freshly minted
   * GTIN, `seller_id` set to the submitter. So five sellers of the same phone
   * produced five catalogue entries, five product pages, five review pools, all
   * competing against each other in search. `product_listings` carried a
   * `(product, seller)` unique key and an `isBuyBoxWinner` flag for competing
   * offers that nothing could ever create.
   *
   * Here the seller names an item that already exists — by product id, or by the
   * GTIN/EAN printed on the box, which is how a real seller identifies stock they
   * did not author — and supplies only what is theirs to decide: price, stock,
   * condition, SKU, fulfilment. The catalogue content (title, images, category,
   * description) belongs to the product and is not theirs to restate.
   *
   * The offer lands PENDING. Product approval is not listing approval: the
   * product was cleared once, but this seller's price, stock and condition have
   * never been reviewed.
   */
  async addListing(sellerId: string, dto: Record<string, any>) {
    const sellingPrice = Number(dto?.sellingPrice ?? dto?.price ?? 0);
    if (!Number.isFinite(sellingPrice) || sellingPrice <= 0) {
      throw new BadRequestException('A selling price greater than zero is required.');
    }
    const stock = Math.max(Math.trunc(Number(dto?.stock ?? dto?.stockQuantity ?? 0)), 0);

    const condition = String(dto?.condition ?? 'NEW').toUpperCase();
    if (!['NEW', 'REFURBISHED', 'USED'].includes(condition)) {
      throw new BadRequestException('Condition must be one of NEW, REFURBISHED or USED.');
    }

    // Addressed by catalogue id or by the barcode on the box. A seller listing
    // someone else's product has the second and not the first.
    const productId = String(dto?.productId ?? '').trim();
    const gtin = String(dto?.gtin ?? dto?.globalTradeItemNumber ?? '').trim();
    if (!productId && !gtin) {
      throw new BadRequestException('Name the product to offer on, by productId or GTIN.');
    }

    const product = await this.productRepo.findOne({
      where: productId ? { id: productId } : { globalTradeItemNumber: gtin },
    });
    if (!product) {
      throw new NotFoundException(
        'No catalogue product matches that identifier. If it is not listed yet, create it instead.',
      );
    }

    // Only onto items that have cleared moderation. Offering on a PENDING or
    // REJECTED product would let a second seller attach stock to an entry that
    // may never go live — or that was rejected precisely because it should not.
    if (product.approval_status !== 'APPROVED') {
      throw new BadRequestException(
        'That product has not been approved for sale yet, so it cannot take new offers.',
      );
    }

    const existing = await this.listingRepo.findOne({
      where: { product: { id: product.id }, seller: { id: sellerId } },
    });
    if (existing) {
      // The `(product, seller)` unique index would refuse this anyway; saying so
      // plainly beats a constraint violation, and points at the edit route.
      throw new ConflictException(
        'You already offer this product. Update your existing listing instead of creating a second one.',
      );
    }

    const requestedSku = String(dto?.sku ?? dto?.sellerSku ?? '').trim();
    if (requestedSku) {
      const skuClash = await this.listingRepo.findOne({
        where: { seller: { id: sellerId }, sellerSku: requestedSku },
        select: ['id'],
      });
      if (skuClash) {
        throw new BadRequestException(`You already have a listing with SKU ${requestedSku}.`);
      }
    }

    const saved = await this.listingRepo.save(
      this.listingRepo.create({
        product: { id: product.id } as any,
        seller: { id: sellerId } as any,
        sellerSku: requestedSku || `${product.slug.slice(0, 24)}-${sellerId.slice(0, 6)}`,
        sellingPrice,
        stockQuantity: stock,
        condition,
        isFulfilledByKartseek: dto?.isFulfilledByKartseek === true,
        isBuyBoxWinner: false,
        approvalStatus: 'PENDING',
        isActive: false,
      }),
    );

    await this.invalidateDashboard(sellerId);
    await this.kafka.publish('seller.listing.created', {
      listingId: saved.id,
      productId: product.id,
      sellerId,
      sellingPrice,
      stock,
      condition,
    });

    this.logger.log(
      `🆕 Offer on existing product ${product.id} by seller ${sellerId} at ${sellingPrice} — awaiting approval`,
    );
    return {
      success: true,
      listingId: saved.id,
      productId: product.id,
      productName: product.name,
      status: 'PENDING_APPROVAL',
      message: 'Offer submitted for review. It goes on sale once an admin approves it.',
    };
  }

  /**
   * Change the price, stock, condition or availability of one of this seller's
   * offers.
   *
   * Approval is deliberately NOT in the accepted set: a seller may switch their
   * own offer off and on, but only an admin moves it between PENDING, APPROVED
   * and REJECTED. `isActive` is accepted, but re-activating is refused while the
   * listing is unapproved — otherwise the seller's own switch would be a way
   * around moderation.
   *
   * Every path here recomputes the buy box: a price cut is exactly the moment the
   * winner should change, and that was the one event nothing responded to.
   */
  async updateListing(sellerId: string, listingId: string, dto: Record<string, any>) {
    const listing = await this.listingRepo.findOne({
      where: { id: listingId, seller: { id: sellerId } },
      relations: ['product'],
    });
    if (!listing) throw new NotFoundException('No listing of yours matches that id.');

    if (dto?.sellingPrice !== undefined || dto?.price !== undefined) {
      const price = Number(dto.sellingPrice ?? dto.price);
      if (!Number.isFinite(price) || price <= 0) {
        throw new BadRequestException('A selling price greater than zero is required.');
      }
      listing.sellingPrice = price;
    }

    if (dto?.stockQuantity !== undefined || dto?.stock !== undefined) {
      const quantity = Math.trunc(Number(dto.stockQuantity ?? dto.stock));
      if (!Number.isFinite(quantity) || quantity < 0) {
        throw new BadRequestException('Stock must be a whole number of units, zero or more.');
      }
      listing.stockQuantity = quantity;
    }

    if (dto?.condition !== undefined) {
      const condition = String(dto.condition).toUpperCase();
      if (!['NEW', 'REFURBISHED', 'USED'].includes(condition)) {
        throw new BadRequestException('Condition must be one of NEW, REFURBISHED or USED.');
      }
      listing.condition = condition;
    }

    if (dto?.isActive !== undefined) {
      const wanted = !!dto.isActive;
      if (wanted && listing.approvalStatus !== 'APPROVED') {
        throw new BadRequestException(
          'This listing is still awaiting approval, so it cannot be switched on yet.',
        );
      }
      listing.isActive = wanted;
    }

    await this.listingRepo.save(listing);

    const productId = (listing as any).product?.id;
    if (productId) {
      await this.catalog.recomputeBuyBox(productId);
      // A price or stock edit changes the card and the detail page at once;
      // until this line only the admin approval path dropped these caches, so
      // a seller's new price stayed invisible for up to two minutes.
      await this.catalogCache.invalidateProductAndListings(productId);
    }

    await this.invalidateDashboard(sellerId);
    await this.kafka.publish('seller.listing.updated', { listingId, sellerId, productId });

    return { success: true, listingId, productId };
  }

  /**
   * Every offer this seller has, with the product each one attaches to.
   *
   * Distinct from `getSellerProducts`, which lists the catalogue entries a seller
   * authored. A seller who only ever offers on other people's products owns no
   * products at all and would see an empty portal without this.
   */
  async getSellerListings(sellerId: string, status?: string, page = 1, limit = 20) {
    const take = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

    const qb = this.listingRepo
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.product', 'product')
      .where('l.seller_id = :sellerId', { sellerId })
      .orderBy('l.createdAt', 'DESC')
      .skip(skip)
      .take(take);

    if (status) {
      qb.andWhere('l.approvalStatus = :status', { status: String(status).toUpperCase() });
    }

    const [data, total] = await qb.getManyAndCount();
    return { sellerId, data, total, page: Number(page) || 1, limit: take };
  }

  /**
   * Set the stock on one of this seller's listings.
   *
   * Two defects lived here. The lookup only matched on `product.id`, but
   * `getSellerInventory` returns **listing** rows — so the id the portal sends
   * back from the row it is editing matched nothing. And when nothing matched,
   * the method still returned `{ success: true, productId, stock }`: the portal
   * showed the new figure, the database kept the old one, and the seller
   * oversold. `id` is now accepted as either the listing or the product, and a
   * miss is an error rather than a cheerful lie.
   */
  async updateInventory(sellerId: string, countryCode: string, productId: string, stock: number) {
    const quantity = Math.trunc(Number(stock));
    if (!Number.isFinite(quantity) || quantity < 0) {
      throw new BadRequestException('Stock must be a whole number of units, zero or more.');
    }

    const listing = await this.listingRepo.findOne({
      where: [
        { id: productId, seller: { id: sellerId } },
        { product: { id: productId }, seller: { id: sellerId } },
      ],
      relations: ['product'],
    });

    if (!listing) {
      throw new NotFoundException('No listing of yours matches that product.');
    }

    listing.stockQuantity = quantity;
    await this.listingRepo.save(listing);

    // Running out — or restocking — changes who should hold the buy box. An
    // out-of-stock winner keeps the product advertising a price that
    // `priceOrderItems` then refuses at checkout.
    const listingProductId = (listing as any).product?.id;
    if (listingProductId) {
      await this.catalog.recomputeBuyBox(listingProductId);
      await this.catalogCache.invalidateProductAndListings(listingProductId);
    }

    await this.kafka.publish('inventory.updated', {
      sellerId,
      countryCode,
      listingId: listing.id,
      productId: listingProductId ?? productId,
      stock: quantity,
    });

    // The dashboard's low-stock and out-of-stock counts are derived from this.
    await this.invalidateDashboard(sellerId);

    return {
      success: true,
      listingId: listing.id,
      productId: (listing as any).product?.id ?? productId,
      stock: quantity,
    };
  }

  /**
   * Flatten the several shapes a registration payload arrives in.
   *
   * The onboarding wizard, `RegisterSellerDto` and the older TCP callers each
   * name the same fields differently, and the gateway forwards over TCP —
   * `{cmd:'register_seller'}` lands on a bare @MessagePattern, so the DTO never
   * runs and unrecognised keys are simply read as `undefined`.
   *
   * That silence was the whole bug. The wizard sends `countryCode`, the service
   * read `country ?? regionCode`, and the fallback `'IN'` meant every seller in
   * every market was filed under India. `businessEmail`/`businessPhone` went the
   * same way, and `ownerName` — which `seller_kyc.ownerFullName` requires NOT
   * NULL — was never sent at all, so the KYC insert threw and registration
   * failed outright.
   *
   * Accepting every spelling here, rather than picking one and breaking the
   * others, keeps the Flutter clients and the web wizard working off one code
   * path. Validation below then insists on the fields that actually matter.
   */
  private static normaliseRegistration(dto: Record<string, any>) {
    const str = (...candidates: unknown[]): string => {
      for (const c of candidates) {
        if (typeof c === 'string' && c.trim()) return c.trim();
      }
      return '';
    };

    const bank = (dto?.bankDetails ?? {}) as Record<string, any>;

    return {
      businessName: str(dto?.businessName, dto?.legalBusinessName, dto?.storeDisplayName),
      ownerName: str(dto?.ownerName, dto?.accountHolderName, bank?.accountHolderName, dto?.name),
      email: str(dto?.email, dto?.businessEmail, dto?.ownerEmail),
      phone: str(dto?.phone, dto?.businessPhone, dto?.ownerPhone),
      businessType: str(dto?.businessType),
      // No `'IN'` fallback. An applicant who sends nothing is a bug to surface,
      // not a business to file under India — `regionCode` scopes the seller's
      // listings, tax and payouts, so guessing it silently puts a Qatari grocer
      // in the Indian market. Validated by the caller.
      countryCode: str(dto?.countryCode, dto?.country, dto?.regionCode).toUpperCase(),
      taxId: str(dto?.taxId, dto?.gstNumber, dto?.taxRegistrationNumber),
      vatNumber: str(dto?.vatNumber),
      storeName: str(
        dto?.storeDisplayName,
        dto?.storeName,
        dto?.businessName,
        dto?.legalBusinessName,
      ),
      storeDescription: str(dto?.storeDescription, dto?.description),
      stateRegion: str(dto?.stateRegion, dto?.state),
      registeredAddress: str(dto?.registeredAddress, dto?.address),
      bank: {
        accountHolderName: str(bank?.accountHolderName, dto?.accountHolderName),
        bankName: str(bank?.bankName, dto?.bankName),
        accountNumber: str(bank?.accountNumber, dto?.accountNumber).replace(/\s+/g, ''),
        bankCode: str(bank?.bankCode, bank?.ifscCode, dto?.bankCode),
      },
    };
  }

  /**
   * A store slug nobody else holds.
   *
   * `storeSlug` is UNIQUE, and the slug was derived from the business name with
   * no collision handling — so the second business called "Metro Traders" got a
   * duplicate-key 500. Worse, because registration was not transactional, a
   * failed attempt left its seller row behind still holding the slug, and every
   * retry by that same applicant hit the same 500 forever.
   *
   * Runs inside the caller's transaction so the check and the insert cannot be
   * interleaved by a concurrent registration.
   */
  private static async uniqueStoreSlug(mgr: EntityManager, businessName: string): Promise<string> {
    const base =
      businessName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || 'seller';

    const repo = mgr.getRepository(Seller);
    for (let attempt = 0; attempt < 50; attempt++) {
      const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
      const taken = await repo.findOne({ where: { storeSlug: candidate }, select: ['id'] });
      if (!taken) return candidate;
    }
    // Sequential suffixes exhausted — fall back to something that cannot collide.
    return `${base}-${Date.now().toString(36)}`;
  }

  /**
   * Register a business as a marketplace seller.
   *
   * @param ownerId Auth user that will own this seller. Required: it is the only
   *   thing SellerOwnershipGuard can authorise against, so a seller created
   *   without one is unreachable by its own owner (and correctly denied).
   *
   * All four writes — seller, KYC, settings, payout destination — happen in one
   * transaction. Previously they were independent saves in sequence, so when the
   * KYC insert failed the seller row survived without KYC or settings: an account
   * that exists, cannot be reviewed, and blocks its own owner from trying again.
   */
  async registerSeller(dto: Record<string, any>, ownerId?: string) {
    if (!ownerId) {
      throw new BadRequestException(
        'Cannot register a seller without an authenticated owner. ' +
          'Sign in first — the seller account is bound to your user id.',
      );
    }

    const input = SellerService.normaliseRegistration(dto ?? {});

    // Checked here rather than left to the database. `seller_kyc.ownerFullName`
    // is NOT NULL, so a missing owner name used to surface as an opaque 500 that
    // the gateway then reported as "registration temporarily unavailable" — an
    // outage message for a form the applicant could have fixed in ten seconds.
    const missing = (['businessName', 'ownerName', 'email', 'phone'] as const).filter(
      (field) => !input[field],
    );
    if (missing.length) {
      throw new BadRequestException(
        `Missing required registration details: ${missing.join(', ')}.`,
      );
    }

    // `regionCode` decides which market's listings, tax rules and payout rails
    // this seller belongs to, and it was written straight from the request with
    // no check at all: `ZZ`, `NOT-A-COUNTRY` and `<script>alert(1)</script>`
    // were all stored verbatim. A seller filed under a code no region config
    // describes is invisible to every region-scoped query — including
    // `getSellersByRegion`, which is how the storefront finds them — so this is
    // a rejection rather than a fallback.
    if (!isSupportedRegion(input.countryCode)) {
      throw new BadRequestException(
        input.countryCode
          ? `Unsupported country code "${input.countryCode}". KARTSEEK does not operate in that market.`
          : 'A country code is required to register a seller.',
      );
    }

    // Bounded so a single field cannot carry an unbounded payload into the
    // seller record. The wizard caps these client-side; this is the same limit
    // enforced where it cannot be bypassed.
    const LIMITS: Record<string, number> = {
      businessName: 200,
      ownerName: 150,
      email: 254,
      phone: 30,
      storeName: 120,
      storeDescription: 1000,
      stateRegion: 120,
      registeredAddress: 300,
      taxId: 64,
      vatNumber: 64,
    };
    for (const [field, max] of Object.entries(LIMITS)) {
      const value = (input as Record<string, unknown>)[field];
      if (typeof value === 'string' && value.length > max) {
        throw new BadRequestException(
          `${field} is too long (${value.length} characters, maximum ${max}).`,
        );
      }
    }

    // One seller account per user. Without this a single sign-in could mint
    // unlimited pending sellers, each one landing in the admin approval queue.
    const existing = await this.sellerRepo.findOne({
      where: { ownerId } as any,
      select: ['id', 'businessName'],
    });
    if (existing) {
      throw new ConflictException(
        `You already have a seller account (${existing.businessName}). ` +
          'Contact support if you need to register a second business.',
      );
    }

    const savedSeller = await this.dataSource.transaction(async (mgr) => {
      const storeSlug = await SellerService.uniqueStoreSlug(mgr, input.businessName);

      const seller = await mgr.getRepository(Seller).save(
        mgr.getRepository(Seller).create({
          businessName: input.businessName,
          storeSlug,
          ownerId,
          // Contact details were never written at all, so the seller portal
          // showed a blank profile and admins reviewing an application had no
          // way to reach the applicant.
          ownerName: input.ownerName,
          email: input.email,
          phone: input.phone,
          description: input.storeDescription || null,
          gstNumber: input.taxId || input.vatNumber || null,
          address: input.registeredAddress
            ? ({
                line1: input.registeredAddress,
                city: '',
                state: input.stateRegion,
                postalCode: '',
                country: input.countryCode,
              } as any)
            : null,
          verificationStatus: 'PENDING',
          kycStatus: 'PENDING',
          sellerRating: 0,
          regionCode: input.countryCode,
        }),
      );

      await mgr.getRepository(SellerKyc).save(
        mgr.getRepository(SellerKyc).create({
          sellerId: seller.id,
          ownerFullName: input.ownerName,
          ownerEmail: input.email,
          ownerPhone: input.phone,
          businessType: input.businessType || null,
          taxRegistrationNumber: input.taxId || null,
          countryCode: input.countryCode,
          status: 'PENDING',
        }),
      );

      await mgr.getRepository(SellerSettings).save(
        mgr.getRepository(SellerSettings).create({
          sellerId: seller.id,
          storeName: input.storeName,
          storeDescription: input.storeDescription || null,
          taxId: input.taxId || null,
          // A new seller is offline until they are approved and have listed
          // something — going live is their decision, not a side effect of
          // filling in a form.
          isOnline: false,
        }),
      );

      // Payout destination, encrypted. The wizard collects an account number and
      // it used to be dropped on the floor — the applicant supplied their bank
      // details and the Payouts page still showed "no account on file".
      //
      // Deliberately NOT written to `seller_settings.bankDetails`, which is a
      // plaintext jsonb column: `seller_bank_accounts` encrypts the number at
      // rest and only ever renders its last four digits.
      if (/^\d{6,20}$/.test(input.bank.accountNumber)) {
        await mgr.getRepository(SellerBankAccount).save(
          mgr.getRepository(SellerBankAccount).create({
            sellerId: seller.id,
            accountHolderName: input.bank.accountHolderName || input.ownerName,
            bankName: input.bank.bankName || 'Bank',
            accountNumberLast4: input.bank.accountNumber.slice(-4),
            accountNumberEnc: this.encryption.encrypt(input.bank.accountNumber),
            bankCode: input.bank.bankCode || null,
            method: 'bank',
            isDefault: true,
            // Verified by an admin against the KYC documents, never on the
            // applicant's say-so.
            isVerified: false,
          }),
        );
      }

      return seller;
    });

    await this.kafka.publish('seller.registered', {
      id: savedSeller.id,
      businessName: savedSeller.businessName,
      email: input.email,
      countryCode: input.countryCode,
    });

    this.logger.log(
      `🏪 Seller registered: ${savedSeller.businessName} (${savedSeller.storeSlug}) → Region: ${input.countryCode}`,
    );
    return { success: true, seller: savedSeller };
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private regionKey(countryCode: string, ...parts: string[]): string {
    return `region:${countryCode}:${parts.join(':')}`;
  }

  // ── Products CRUD ─────────────────────────────────────────────

  async getSellerProducts(
    sellerId: string,
    countryCode: string,
    status?: string,
    search?: string,
    page = 1,
    limit = 20,
  ) {
    const qb = this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.brand', 'brand')
      .leftJoinAndSelect('p.category', 'category')
      .where('p.seller_id = :sellerId', { sellerId });

    if (status) qb.andWhere('p.status = :status', { status });
    if (search) qb.andWhere('p.name ILIKE :search', { search: `%${search}%` });
    qb.orderBy({ 'p.created_at': 'DESC', 'p.id': 'ASC' })
      .skip((page - 1) * limit)
      .take(limit);

    const [rows, total] = await qb.getManyAndCount();

    // The seller's own offer on each row. The portal's list read
    // `p.price` / `p.stock` / `p.sku` off the bare catalogue row and rendered
    // NaN; price, stock and SKU live on the seller's listing, which is one
    // query for the page rather than one per row.
    const listings = rows.length
      ? ((await this.listingRepo.find({
          where: { product: { id: In(rows.map((p) => p.id)) }, seller: { id: sellerId } },
          relations: { product: true },
        })) ?? [])
      : [];
    const listingByProduct = new Map<string, ProductListing>();
    for (const l of listings) {
      const pid = (l as any).product?.id;
      if (pid && !listingByProduct.has(pid)) listingByProduct.set(pid, l);
    }
    const data = rows.map((p) => {
      const l = listingByProduct.get(p.id);
      return {
        ...p,
        category: p.category
          ? { id: p.category.id, name: p.category.name, slug: p.category.slug }
          : null,
        approvalStatus: p.approval_status,
        isActive: p.is_active,
        listing: l
          ? {
              id: l.id,
              sellingPrice: l.sellingPrice,
              mrp: l.mrp,
              stockQuantity: l.stockQuantity,
              sellerSku: l.sellerSku,
              condition: l.condition,
              isActive: l.isActive,
              approvalStatus: l.approvalStatus,
            }
          : null,
      };
    });
    return { sellerId, countryCode, data, total, page, limit };
  }

  /**
   * One of the seller's products, with everything the edit form pre-fills:
   * the category objects, the images, the seller's own offer, and the typed
   * attribute values in the same row shape the public page reads.
   */
  async getProductById(sellerId: string, productId: string) {
    const product = await this.productRepo.findOne({
      where: { id: productId, seller_id: sellerId },
      relations: { brand: true, category: true, subcategory: true },
    });
    if (!product)
      throw new NotFoundException(`Product ${productId} not found for seller ${sellerId}`);
    const [images, listing, attributeRows] = await Promise.all([
      this.imageRepo.find({
        where: { product: { id: productId } },
        order: { sortOrder: 'ASC', id: 'ASC' },
      }),
      this.listingRepo.findOne({
        where: { product: { id: productId }, seller: { id: sellerId } },
        order: { isBuyBoxWinner: 'DESC', id: 'ASC' },
      }),
      this.attributeValues.forProducts([productId]),
    ]);
    const attributes = (attributeRows.get(productId) ?? []).filter(
      (row): row is NonNullable<typeof row> => row !== null,
    );
    return {
      ...product,
      images,
      listing: listing
        ? {
            id: listing.id,
            sellingPrice: listing.sellingPrice,
            mrp: listing.mrp,
            stockQuantity: listing.stockQuantity,
            sellerSku: listing.sellerSku,
            condition: listing.condition,
            isActive: listing.isActive,
            approvalStatus: listing.approvalStatus,
            isBuyBoxWinner: listing.isBuyBoxWinner,
          }
        : null,
      attributes,
      approvalStatus: product.approval_status,
      isActive: product.is_active,
    };
  }

  /**
   * Confirm a product belongs to this seller before touching anything hanging
   * off it. Images, variants and Q&A all key on `product_id`, which the client
   * supplies — without this a seller could edit the photographs on somebody
   * else's listing by naming its id.
   */
  private async assertOwnsProduct(sellerId: string, productId: string): Promise<void> {
    const owned = await this.productRepo.findOne({
      where: { id: productId, seller_id: sellerId },
      select: ['id'],
    });
    if (!owned) throw new NotFoundException('No product of yours matches that id.');
  }

  // ── Product images ────────────────────────────────────────────────────────
  //
  // `product_images` has existed all along; nothing seller-facing ever read or
  // wrote it, so the Images page had no backend and a seller could not put a
  // photograph on their own listing — the single most important thing a
  // marketplace listing needs.

  async getProductImages(sellerId: string, productId: string) {
    await this.assertOwnsProduct(sellerId, productId);
    const images = await this.imageRepo.find({
      where: { product: { id: productId } },
      order: { isPrimary: 'DESC', sortOrder: 'ASC' },
    });
    return { productId, data: images, total: images.length };
  }

  // ── 360° spin frames ──────────────────────────────────────────────────────
  //
  // Stored on `product.metadata.spin360Urls` rather than in `product_images`:
  // these are not gallery photographs and must never appear in the thumbnail
  // rail — a 36-frame capture would bury the six real product shots. The
  // storefront renders the 360° control only when this array is present, so a
  // product without a capture never advertises a rotation it does not have.

  /** Frames currently configured for a listing. */
  async getProductSpin360(sellerId: string, productId: string) {
    await this.assertOwnsProduct(sellerId, productId);
    const product = await this.productRepo.findOne({ where: { id: productId } });
    const urls = (product as any)?.metadata?.spin360Urls;
    const data = Array.isArray(urls) ? urls.filter((u: unknown) => typeof u === 'string') : [];
    return { productId, data, total: data.length };
  }

  /**
   * Replace a listing's 360° frame sequence.
   *
   * Writes one key of `metadata` and copies the rest through untouched. The
   * blob also holds `richDescriptionHtml`, which is rendered by an SSR'd server
   * component — replacing the whole object from a seller payload would be a
   * stored-XSS surface, so only this key is writable and only as URLs.
   */
  async setProductSpin360(sellerId: string, productId: string, urls: unknown) {
    await this.assertOwnsProduct(sellerId, productId);
    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) throw new NotFoundException(`Product ${productId} not found`);

    const list = Array.isArray(urls) ? urls : [];
    const clean: string[] = [];
    for (const raw of list) {
      const value = String(raw ?? '').trim();
      if (!value) continue;
      // http(s) only. A `javascript:` or `data:` URL here would end up in an
      // <img src> on the storefront.
      let parsed: URL;
      try {
        parsed = new URL(value);
      } catch {
        throw new BadRequestException(`Not a valid URL: ${value}`);
      }
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new BadRequestException('360° frames must be http(s) image URLs.');
      }
      clean.push(parsed.toString());
    }
    // A rotation needs enough frames to read as one; the cap keeps a single
    // listing from asking a shopper's browser for hundreds of images.
    if (clean.length > 0 && clean.length < 8) {
      throw new BadRequestException(
        'A 360° view needs at least 8 frames. Add more, or clear them all.',
      );
    }
    if (clean.length > 72) throw new BadRequestException('A 360° view can hold at most 72 frames.');

    const metadata: Record<string, unknown> = { ...((product as any).metadata ?? {}) };
    if (clean.length === 0) delete metadata.spin360Urls;
    else metadata.spin360Urls = clean;
    (product as any).metadata = metadata;
    await this.productRepo.save(product);

    // The storefront caches the product detail response by id *and* by slug,
    // one copy per market (`product:<key>:<market>`).
    await this.redis.delPattern(`product:${productId}:*`).catch((): number => 0);
    if ((product as any).slug)
      await this.redis.delPattern(`product:${(product as any).slug}:*`).catch((): number => 0);

    return { success: true, productId, total: clean.length };
  }

  async addProductImage(
    sellerId: string,
    productId: string,
    dto: { url: string; altText?: string; isPrimary?: boolean },
  ) {
    await this.assertOwnsProduct(sellerId, productId);

    const url = String(dto?.url ?? '').trim();
    if (!url) throw new BadRequestException('An image URL is required.');

    const existing = await this.imageRepo.count({ where: { product: { id: productId } } });
    if (existing >= 12) throw new BadRequestException('A listing can carry at most 12 images.');

    // First image is primary by default — a listing with no primary renders
    // blank in search results.
    const makePrimary = dto?.isPrimary === true || existing === 0;
    if (makePrimary) {
      await this.imageRepo.update({ product: { id: productId } }, { isPrimary: false });
    }

    const saved = await this.imageRepo.save(
      this.imageRepo.create({
        product: { id: productId } as any,
        url,
        altText: dto?.altText ?? '',
        sortOrder: existing,
        isPrimary: makePrimary,
      }),
    );

    // Images are embedded in every cached card and detail for this product.
    await this.catalogCache.invalidateProductAndListings(productId);
    return { success: true, image: saved };
  }

  async setPrimaryProductImage(sellerId: string, productId: string, imageId: string) {
    await this.assertOwnsProduct(sellerId, productId);
    const image = await this.imageRepo.findOne({
      where: { id: imageId, product: { id: productId } },
    });
    if (!image) throw new NotFoundException('No such image on that listing.');

    await this.imageRepo.update({ product: { id: productId } }, { isPrimary: false });
    image.isPrimary = true;
    await this.imageRepo.save(image);
    await this.catalogCache.invalidateProductAndListings(productId);
    return { success: true, imageId };
  }

  /** Persist a drag-and-drop reorder. `imageIds` is the new order, front first. */
  async reorderProductImages(sellerId: string, productId: string, imageIds: string[]) {
    await this.assertOwnsProduct(sellerId, productId);
    const ids = Array.isArray(imageIds) ? imageIds : [];
    if (ids.length === 0)
      throw new BadRequestException('An ordered list of image ids is required.');

    const owned = await this.imageRepo.find({ where: { product: { id: productId } } });
    const ownedIds = new Set(owned.map((i) => i.id));
    if (ids.some((id) => !ownedIds.has(id))) {
      throw new BadRequestException('That order names an image that is not on this listing.');
    }

    await Promise.all(ids.map((id, index) => this.imageRepo.update({ id }, { sortOrder: index })));
    await this.catalogCache.invalidateProductAndListings(productId);
    return { success: true, productId, ordered: ids.length };
  }

  async deleteProductImage(sellerId: string, productId: string, imageId: string) {
    await this.assertOwnsProduct(sellerId, productId);
    const image = await this.imageRepo.findOne({
      where: { id: imageId, product: { id: productId } },
    });
    if (!image) throw new NotFoundException('No such image on that listing.');

    await this.imageRepo.delete({ id: imageId });

    // Never leave a listing with images but no primary.
    if (image.isPrimary) {
      const next = await this.imageRepo.findOne({
        where: { product: { id: productId } },
        order: { sortOrder: 'ASC' },
      });
      if (next) {
        next.isPrimary = true;
        await this.imageRepo.save(next);
      }
    }

    await this.catalogCache.invalidateProductAndListings(productId);
    return { success: true, imageId };
  }

  // ── Product variants ──────────────────────────────────────────────────────

  async getProductVariants(sellerId: string, productId: string) {
    await this.assertOwnsProduct(sellerId, productId);
    const variants = await this.variantRepo.find({
      where: { productId },
      order: { createdAt: 'ASC' },
    });
    return {
      productId,
      data: variants.map((v) => ({
        ...v,
        mrp: Number(v.mrp),
        sellingPrice: Number(v.sellingPrice),
      })),
      total: variants.length,
    };
  }

  async createProductVariant(sellerId: string, productId: string, dto: any) {
    await this.assertOwnsProduct(sellerId, productId);

    const sku = String(dto?.sku ?? '').trim();
    if (!sku) throw new BadRequestException('A variant SKU is required.');
    const sellingPrice = Number(dto?.sellingPrice ?? 0);
    if (!Number.isFinite(sellingPrice) || sellingPrice <= 0) {
      throw new BadRequestException('A variant needs a selling price greater than zero.');
    }

    // Scoped to this product, matching the unique index. Checking globally
    // rejected a seller's own valid SKU because a different seller — whose
    // catalogue this one cannot see — had used the same string, and the message
    // ("already in use") named a conflict they had no way to find or resolve.
    const clash = await this.variantRepo.findOne({ where: { productId, sku } });
    if (clash)
      throw new BadRequestException(
        `SKU ${sku} is already used by another variant of this product.`,
      );

    const saved = await this.variantRepo.save(
      this.variantRepo.create({
        productId,
        sku,
        barcode: dto?.barcode ?? null,
        // e.g. `{ "Colour": "Blue", "Size": "M" }` — what distinguishes this one.
        attributes: dto?.attributes ?? {},
        variantName: dto?.variantName ?? Object.values(dto?.attributes ?? {}).join(' / '),
        mrp: Number(dto?.mrp ?? sellingPrice),
        sellingPrice,
        stockQuantity: Math.max(Math.trunc(Number(dto?.stockQuantity ?? 0)), 0),
        lowStockThreshold: Math.max(Math.trunc(Number(dto?.lowStockThreshold ?? 5)), 0),
        isActive: dto?.isActive !== false,
      }),
    );

    return { success: true, variantId: saved.id, variant: saved };
  }

  async updateProductVariant(sellerId: string, productId: string, variantId: string, dto: any) {
    await this.assertOwnsProduct(sellerId, productId);
    const variant = await this.variantRepo.findOne({ where: { id: variantId, productId } });
    if (!variant) throw new NotFoundException('No such variant on that listing.');

    if (dto?.sellingPrice !== undefined) variant.sellingPrice = Number(dto.sellingPrice);
    if (dto?.mrp !== undefined) variant.mrp = Number(dto.mrp);
    if (dto?.stockQuantity !== undefined)
      variant.stockQuantity = Math.max(Math.trunc(Number(dto.stockQuantity)), 0);
    if (dto?.lowStockThreshold !== undefined)
      variant.lowStockThreshold = Math.max(Math.trunc(Number(dto.lowStockThreshold)), 0);
    if (dto?.attributes !== undefined) variant.attributes = dto.attributes;
    if (dto?.variantName !== undefined) variant.variantName = dto.variantName;
    if (dto?.isActive !== undefined) variant.isActive = !!dto.isActive;

    await this.variantRepo.save(variant);
    return { success: true, variantId, variant };
  }

  async deleteProductVariant(sellerId: string, productId: string, variantId: string) {
    await this.assertOwnsProduct(sellerId, productId);
    const result = await this.variantRepo.delete({ id: variantId, productId });
    if (!result.affected) throw new NotFoundException('No such variant on that listing.');
    return { success: true, variantId };
  }

  // ── Customer questions ────────────────────────────────────────────────────

  /**
   * Questions customers have asked on this seller's listings.
   *
   * `product_questions` / `product_answers` both existed; nothing seller-facing
   * used them, so the Q&A page had no backend and customer questions went
   * unanswered because the seller never saw them.
   */
  async getSellerQuestions(sellerId: string, status?: string, page = 1, limit = 20) {
    const productIds = await this.productRepo
      .createQueryBuilder('p')
      .select('p.id', 'id')
      .where('p.seller_id = :sellerId', { sellerId })
      .getRawMany()
      .then((rows) => rows.map((r) => r.id));

    if (productIds.length === 0) return { sellerId, data: [], total: 0, page, limit };

    // The answered/unanswered split is applied in SQL, not to the page after it
    // has been fetched: filtering afterwards makes `total` count questions the
    // caller cannot see and returns short pages, so "12 unanswered" could arrive
    // as 3 rows.
    // `q.productId` is the entity property, which TypeORM maps to the
    // `product_id` column. Naming the physical column here instead happens to
    // work — unrecognised paths are passed through verbatim — but it silently
    // stops being checked against the entity.
    const qb = this.questionRepo
      .createQueryBuilder('q')
      .where('q.productId IN (:...productIds)', { productIds });

    // Raw subquery, so the table IS named physically and MUST stay
    // schema-qualified: an unqualified `product_answers` resolves against the
    // session search_path and would silently match the empty `public` copy.
    const hasAnswer =
      'EXISTS (SELECT 1 FROM marketplace.product_answers a WHERE a.question_id = q.id)';
    if (status === 'unanswered') qb.andWhere(`NOT ${hasAnswer}`);
    else if (status === 'answered') qb.andWhere(hasAnswer);

    const [rows, total] = await qb
      .orderBy('q.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    // `ProductQuestion` declares no `answers` relation — only `ProductAnswer`
    // points back at it — so the answers are fetched in one extra query rather
    // than joined. A `leftJoinAndSelect('q.answers', …)` here throws, and the
    // gateway's fallback turned that into an empty list, which is why the Q&A
    // page looked like it had no questions when it had several.
    const answers = rows.length
      ? await this.answerRepo.find({
          where: { questionId: In(rows.map((q) => q.id)) },
          order: { createdAt: 'ASC' },
        })
      : [];

    const byQuestion = new Map<string, typeof answers>();
    for (const a of answers) {
      const bucket = byQuestion.get(a.questionId) ?? [];
      bucket.push(a);
      byQuestion.set(a.questionId, bucket);
    }

    const mapped = rows.map((q) => {
      const own = byQuestion.get(q.id) ?? [];
      return {
        id: q.id,
        productId: q.productId,
        customerName: q.customerName ?? 'Customer',
        questionText: q.questionText,
        upvoteCount: q.upvoteCount,
        askedAt: q.createdAt,
        answers: own.map((a) => ({
          id: a.id,
          authorName: a.authorName,
          authorRole: a.authorRole,
          answerText: a.answerText,
          answeredAt: a.createdAt,
        })),
        answered: own.length > 0,
      };
    });

    return { sellerId, data: mapped, total, page, limit };
  }

  async answerQuestion(sellerId: string, questionId: string, answerText: string) {
    const body = String(answerText ?? '').trim();
    if (!body) throw new BadRequestException('An answer is required.');

    const question = await this.questionRepo.findOne({ where: { id: questionId } });
    if (!question) throw new NotFoundException('No such question.');

    // The question has to be on one of this seller's own listings.
    await this.assertOwnsProduct(
      sellerId,
      (question as any).productId ?? (question as any).product_id,
    );

    const seller = await this.sellerRepo.findOne({ where: { id: sellerId } });
    // Built as a single entity rather than passing an object literal straight to
    // `save`, whose array overload TypeScript otherwise selects.
    const answer: ProductAnswer = this.answerRepo.create({
      questionId,
      authorId: sellerId,
      authorName: seller?.businessName ?? 'Seller',
      // Marks the reply as coming from the seller rather than another shopper,
      // which is what the storefront badges.
      authorRole: 'SELLER',
      answerText: body,
      status: 'PUBLISHED',
    });
    const saved = await this.answerRepo.save(answer);

    await this.kafka.publish('marketplace.qa.answer_posted', {
      sellerId,
      questionId,
      answerId: saved.id,
    });
    return { success: true, questionId, answerId: saved.id, answer: saved };
  }

  // ── Bank accounts ─────────────────────────────────────────────────────────
  //
  // Payouts had no destination: `POST /sellers/:id/payouts` took a
  // `bankAccountId` that referred to nothing, and this page had no backend at
  // all. A seller could ask to be paid with nowhere for the money to go.

  /** Never returns the full account number — only the last four digits. */
  private presentBankAccount(a: SellerBankAccount) {
    return {
      id: a.id,
      accountHolderName: a.accountHolderName,
      bankName: a.bankName,
      accountNumberMasked: `••••${a.accountNumberLast4}`,
      bankCode: a.bankCode,
      upiId: a.upiId,
      method: a.method,
      isDefault: a.isDefault,
      isVerified: a.isVerified,
      addedAt: a.createdAt,
    };
  }

  async getBankAccounts(sellerId: string) {
    const accounts = await this.bankAccountRepo.find({
      where: { sellerId },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
    return {
      sellerId,
      data: accounts.map((a) => this.presentBankAccount(a)),
      total: accounts.length,
    };
  }

  async addBankAccount(sellerId: string, dto: any) {
    const holder = String(dto?.accountHolderName ?? '').trim();
    const bankName = String(dto?.bankName ?? '').trim();
    const accountNumber = String(dto?.accountNumber ?? '').replace(/\s+/g, '');
    const method = dto?.method === 'upi' ? 'upi' : 'bank';

    if (method === 'bank') {
      if (!holder || !bankName)
        throw new BadRequestException('Account holder name and bank name are required.');
      if (!/^\d{6,20}$/.test(accountNumber)) {
        throw new BadRequestException('Enter a valid account number (6–20 digits).');
      }
    } else if (!String(dto?.upiId ?? '').includes('@')) {
      throw new BadRequestException('Enter a valid UPI ID.');
    }

    const existing = await this.bankAccountRepo.count({ where: { sellerId } });

    const account = this.bankAccountRepo.create({
      sellerId,
      accountHolderName: holder || 'Account holder',
      bankName: bankName || 'UPI',
      accountNumberLast4: accountNumber ? accountNumber.slice(-4) : '0000',
      // Encrypted at rest. The plaintext never leaves this method.
      accountNumberEnc: accountNumber ? this.encryption.encrypt(accountNumber) : '',
      bankCode: dto?.bankCode ?? null,
      upiId: dto?.upiId ?? null,
      method,
      // The first account a seller adds is where their money goes.
      isDefault: existing === 0,
      isVerified: false,
    });

    const saved = await this.bankAccountRepo.save(account);
    await this.kafka.publish('seller.bank_account.added', {
      sellerId,
      accountId: saved.id,
      method,
    });
    return { success: true, accountId: saved.id, account: this.presentBankAccount(saved) };
  }

  async setDefaultBankAccount(sellerId: string, accountId: string) {
    const account = await this.bankAccountRepo.findOne({ where: { id: accountId, sellerId } });
    if (!account) throw new NotFoundException('No such bank account.');

    // Cleared first: the partial unique index allows only one default per seller.
    await this.bankAccountRepo.update({ sellerId }, { isDefault: false });
    account.isDefault = true;
    await this.bankAccountRepo.save(account);
    return { success: true, accountId };
  }

  async deleteBankAccount(sellerId: string, accountId: string) {
    const account = await this.bankAccountRepo.findOne({ where: { id: accountId, sellerId } });
    if (!account) throw new NotFoundException('No such bank account.');

    await this.bankAccountRepo.delete({ id: accountId, sellerId });

    // Don't leave a seller with accounts but no default to pay into.
    if (account.isDefault) {
      const next = await this.bankAccountRepo.findOne({
        where: { sellerId },
        order: { createdAt: 'ASC' },
      });
      if (next) {
        next.isDefault = true;
        await this.bankAccountRepo.save(next);
      }
    }

    return { success: true, accountId };
  }

  // ── Notifications ─────────────────────────────────────────────────────────

  /**
   * Real notifications from `marketplace_notifications`.
   *
   * The previous implementation read a Redis key nothing ever wrote
   * (`seller:<id>:notifications`) and so always returned an empty list, while
   * `markNotifRead` / `markAllNotifRead` returned `{ success: true }` without
   * touching anything.
   */
  async getNotifications(sellerId: string, type?: string, page = 1, limit = 30) {
    const where: any = { userId: sellerId };
    if (type && type !== 'all') where.type = type.toUpperCase();

    const [rows, total] = await this.notificationRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const unread = await this.notificationRepo.count({
      where: { userId: sellerId, isRead: false },
    });

    return {
      sellerId,
      data: rows.map((n) => ({
        id: n.id,
        type: String(n.type).toLowerCase(),
        title: n.title,
        body: n.message,
        read: n.isRead,
        actionUrl: n.actionUrl ?? undefined,
        createdAt: n.createdAt,
      })),
      total,
      unread,
      page,
      limit,
    };
  }

  async markNotifRead(sellerId: string, notifId: string) {
    const result = await this.notificationRepo.update(
      { id: notifId, userId: sellerId },
      { isRead: true },
    );
    if (!result.affected) throw new NotFoundException('No such notification.');
    return { success: true, notifId };
  }

  async markAllNotifRead(sellerId: string) {
    const result = await this.notificationRepo.update(
      { userId: sellerId, isRead: false },
      { isRead: true },
    );
    return { success: true, marked: result.affected ?? 0 };
  }

  async saveDraft(sellerId: string, countryCode: string, dto: Record<string, unknown>) {
    return this.addProduct(sellerId, countryCode, { ...dto, status: 'DRAFT' });
  }

  /**
   * Edit the catalogue content of a product this seller authored.
   *
   * Only the listed fields are writable. This was `Object.assign(product, dto)`
   * over the whole request body, which let a seller set **any** column on their
   * own product row — including the ones that decide whether it is on sale:
   *
   *     PUT /seller/products/:id  { "approval_status": "APPROVED", "is_active": true }
   *
   * That is self-approval. It made the entire moderation queue advisory: a
   * seller could submit an item, approve it themselves, and skip review — and
   * `seller_id` was writable too, so a product could be reassigned to another
   * merchant. Nothing about the old signature (`Record<string, unknown>`) hinted
   * at it; the mass assignment was the bug.
   *
   * Moderation state moves only through the admin routes, and only for admins.
   */
  private static readonly SELLER_EDITABLE_PRODUCT_FIELDS = [
    'name',
    'short_description',
    'long_description',
    'mrp',
    // `specifications` and `highlights` used to sit here. Neither is a column
    // on Product, so `product.specifications = …` was silently dropped by the
    // save and the seller's specification table never existed. Specifications
    // are typed attribute values now (`attributes[]`, validated against the
    // category schema); highlights are derived from them on the read side.
  ] as const;

  /**
   * Apply price and stock edits to several of the seller's products at once.
   *
   * The portal's Bulk Edit page called `POST /sellers/:id/products/bulk-edit`,
   * which no controller declared. Its inputs were uncontrolled `defaultValue`
   * fields and its "Save All Changes" button had no handler, so nothing reached
   * this layer anyway — the page was inert end to end.
   *
   * Built on `updateProduct` rather than a bulk `UPDATE`: that method owns the
   * ownership check and the editable-field allowlist, and a bulk path that
   * skipped either would let a seller write fields (or other sellers' rows)
   * that the single-product path refuses.
   *
   * Partial success is reported honestly. A run where three of ten rows fail
   * returns those three with their reasons rather than a single boolean, because
   * "some of your edits did not apply" is the only useful thing to tell a seller
   * looking at a half-updated table.
   */
  async bulkEditProducts(
    sellerId: string,
    edits: { productId: string; [field: string]: unknown }[],
  ) {
    if (!sellerId) throw new BadRequestException('sellerId is required');
    if (!Array.isArray(edits) || edits.length === 0) {
      throw new BadRequestException('Provide at least one product edit.');
    }
    if (edits.length > 500) {
      throw new BadRequestException('Bulk edit is limited to 500 products per request.');
    }

    const updated: string[] = [];
    const failed: { productId: string; reason: string }[] = [];

    for (const edit of edits) {
      const { productId, ...dto } = edit ?? ({} as any);
      if (!productId) {
        failed.push({ productId: '(missing)', reason: 'No productId supplied' });
        continue;
      }
      try {
        await this.updateProduct(sellerId, String(productId), dto);
        updated.push(String(productId));
      } catch (err: any) {
        failed.push({ productId: String(productId), reason: err?.message ?? 'Update failed' });
      }
    }

    return { success: failed.length === 0, updated: updated.length, failed, updatedIds: updated };
  }

  async updateProduct(sellerId: string, productId: string, dto: Record<string, unknown>) {
    const product = await this.productRepo.findOne({
      where: { id: productId, seller_id: sellerId },
      relations: { category: true, subcategory: true },
    });
    if (!product) throw new NotFoundException(`Product ${productId} not found`);

    const applied: Record<string, unknown> = {};
    for (const field of SellerService.SELLER_EDITABLE_PRODUCT_FIELDS) {
      if (dto?.[field] !== undefined) {
        (product as any)[field] = dto[field];
        applied[field] = dto[field];
      }
    }
    // Aliases the forms send; same allowlist semantics.
    if (dto?.description !== undefined && dto?.short_description === undefined) {
      product.short_description = dto.description as string | null;
      applied.short_description = dto.description;
    }
    if (dto?.longDescription !== undefined && dto?.long_description === undefined) {
      product.long_description = dto.longDescription as string | null;
      applied.long_description = dto.longDescription;
    }
    for (const [key, relation] of [
      ['categoryId', 'category'],
      ['subcategoryId', 'subcategory'],
      ['brandId', 'brand'],
    ] as const) {
      if (dto?.[key] !== undefined) {
        (product as any)[relation] = dto[key] ? { id: dto[key] } : null;
        applied[key] = dto[key];
      }
    }

    // Attributes: validated against the (possibly new) category before the
    // save; an omitted `attributes` leaves the stored values alone, a sent one
    // replaces them and must satisfy the required set.
    const categoryIds = [
      (dto?.subcategoryId as string) ?? (product as any).subcategory?.id,
      (dto?.categoryId as string) ?? (product as any).category?.id,
    ];
    const attributeRows = await this.validateAttributesOrThrow(categoryIds, dto?.attributes, {
      requireAll: true,
    });

    const known = new Set<string>([
      ...SellerService.SELLER_EDITABLE_PRODUCT_FIELDS,
      'description',
      'longDescription',
      'categoryId',
      'subcategoryId',
      'brandId',
      'attributes',
    ]);
    const rejected = Object.keys(dto ?? {}).filter((k) => !known.has(k));
    if (rejected.length) {
      // Logged rather than thrown: portals send read-only fields back with the
      // form, and failing the edit for that would be unhelpful. But a seller
      // reaching for `approval_status` is worth seeing in the log.
      this.logger.warn(
        `Seller ${sellerId} sent non-editable product field(s) on ${productId}: ${rejected.join(', ')}`,
      );
    }

    // Content that moderation approved is being changed. Without a revision
    // table the only honest state is "not approved any more": the product
    // leaves public view until an admin re-approves it. Price and stock never
    // come through here, so a listing edit does not trigger this.
    const contentChanged = Object.keys(applied).length > 0 || attributeRows !== null;
    let reReview = false;
    if (contentChanged && product.approval_status !== 'PENDING') {
      product.approval_status = 'PENDING';
      reReview = true;
    }

    await this.dataSource.transaction(async (m) => {
      await m.getRepository(Product).save(product);
      if (attributeRows) await this.attributeValues.replaceForProduct(productId, attributeRows, m);
    });
    if (contentChanged)
      await this.catalogCache.invalidateProductAndListings(productId, product.slug);
    await this.invalidateDashboard(sellerId);
    await this.kafka.publish('seller.product.updated', {
      sellerId,
      productId,
      ...applied,
      attributesReplaced: attributeRows !== null,
      reReview,
    });
    return {
      success: true,
      productId,
      updated: [...Object.keys(applied), ...(attributeRows ? ['attributes'] : [])],
      approvalStatus: product.approval_status,
      reReview,
      message: reReview
        ? 'Saved. These changes take the product off sale until an admin re-approves it.'
        : 'Saved.',
    };
  }

  /**
   * Validate `attributes[]` against the schema of the given categories (leaf
   * first) and return the rows to store — or `null` when the field was not
   * sent at all, which an update treats as "leave the values alone".
   *
   * Throws the structured 400 the forms read: `{ message, errors: [{ slug,
   * message }] }`.
   */
  private async validateAttributesOrThrow(
    categoryIds: (string | undefined | null)[],
    attributes: unknown,
    options: { requireAll: boolean },
  ) {
    if (attributes === undefined || attributes === null) return null;
    if (!Array.isArray(attributes)) {
      throw new BadRequestException({
        message: 'attributes must be a list of { attributeId or slug, value }.',
        errors: [],
      });
    }
    const definitions = await this.attributeValues.definitionsForCategories(
      categoryIds.filter((id): id is string => typeof id === 'string' && id.length > 0),
    );
    const { rows, errors } = AttributeValuesService.validate(
      definitions,
      attributes as AttributeInput[],
      options,
    );
    if (errors.length) {
      throw new BadRequestException({
        message: `${errors.length} attribute${errors.length === 1 ? '' : 's'} could not be saved.`,
        errors,
      });
    }
    return rows;
  }

  async deleteProduct(sellerId: string, productId: string) {
    const product = await this.productRepo.findOne({
      where: { id: productId, seller_id: sellerId },
    });
    if (!product) throw new NotFoundException(`Product ${productId} not found`);
    product.is_active = false;
    product.status = 'DELETED';
    await this.productRepo.save(product);
    await this.kafka.publish('seller.product.deleted', { sellerId, productId });
    return { success: true, productId };
  }

  async bulkUpload(sellerId: string, countryCode: string, products: any[]) {
    const count = products?.length || 0;
    let created = 0;
    let errors = 0;

    for (const p of products || []) {
      try {
        await this.addProduct(sellerId, countryCode, p);
        created++;
      } catch {
        errors++;
      }
    }

    this.logger.log(`📦 Bulk upload: ${created}/${count} products for seller ${sellerId}`);
    await this.kafka.publish('seller.products.bulk_created', {
      sellerId,
      countryCode,
      count: created,
    });
    return { success: true, totalProcessed: count, created, errors };
  }

  // ── Inventory Extended ─────────────────────────────────────────────

  async getLowStock(sellerId: string, countryCode: string) {
    const data = await this.listingRepo
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.product', 'product')
      .where('l.seller_id = :sellerId', { sellerId })
      .andWhere('l.stockQuantity < 5')
      .andWhere('l.isActive = true')
      .orderBy('l.stockQuantity', 'ASC')
      .getMany();

    return { sellerId, countryCode, data, total: data.length };
  }

  async setLowStockThreshold(sellerId: string, productId: string, threshold: number) {
    // Store threshold in Redis for now (can be moved to a dedicated column later)
    await this.redis.setJson(`seller:${sellerId}:threshold:${productId}`, { threshold }, 0);
    return { success: true, productId, threshold };
  }

  // ── Order Lifecycle ───────────────────────────────────────────────

  async getOrderById(sellerId: string, orderId: string) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, sellerId },
    });
    if (!order) {
      const byNumber = await this.orderRepo.findOne({ where: { orderNumber: orderId, sellerId } });
      if (!byNumber)
        throw new NotFoundException(`Order ${orderId} not found for seller ${sellerId}`);
      return byNumber;
    }
    return order;
  }

  async acceptOrder(sellerId: string, orderId: string) {
    const order = await this.getOrderById(sellerId, orderId);
    order.status = 'CONFIRMED';
    await this.orderRepo.save(order);
    await this.kafka.publish('order.accepted', { sellerId, orderId });
    this.logger.log(`✅ Order ${orderId} accepted by seller ${sellerId}`);
    return { success: true, orderId, status: 'Accepted' };
  }

  async rejectOrder(sellerId: string, orderId: string, reason: string) {
    const order = await this.getOrderById(sellerId, orderId);
    order.status = 'CANCELLED';
    order.cancellationReason = reason;
    await this.orderRepo.save(order);
    await this.kafka.publish('order.rejected', { sellerId, orderId, reason });
    this.logger.log(`❌ Order ${orderId} rejected: ${reason}`);
    return { success: true, orderId, status: 'Cancelled', reason };
  }

  async markPacked(sellerId: string, orderId: string) {
    const order = await this.getOrderById(sellerId, orderId);
    order.status = 'READY';
    await this.orderRepo.save(order);
    await this.kafka.publish('order.packed', { sellerId, orderId });
    return { success: true, orderId, status: 'Packed' };
  }

  async shipOrder(sellerId: string, orderId: string, dto: any) {
    const order = await this.getOrderById(sellerId, orderId);
    order.status = 'SHIPPED';
    order.trackingId = dto.trackingId;
    order.courierName = dto.courier;
    await this.orderRepo.save(order);
    await this.kafka.publish('order.shipped', { sellerId, orderId, ...dto });
    return { success: true, orderId, status: 'Shipped' };
  }

  /**
   * Confirm delivery — the point at which the money is actually earned.
   *
   * Returns the figures the caller needs to settle the order (total, category,
   * payment method) because commission lives in another service and the gateway
   * is what orchestrates across the two. Marking an already-delivered order
   * delivered again is refused, so a retried webhook cannot pay a seller twice.
   */
  async markDelivered(sellerId: string, orderId: string) {
    const order = await this.getOrderById(sellerId, orderId);

    if (order.status === 'DELIVERED') {
      throw new BadRequestException('This order is already marked delivered.');
    }
    if (!['SHIPPED', 'OUT_FOR_DELIVERY', 'READY', 'PREPARING'].includes(order.status)) {
      throw new BadRequestException(`An order cannot go from ${order.status} to DELIVERED.`);
    }

    order.status = 'DELIVERED';
    // Cash on delivery is collected at the door; that is the moment it is paid.
    if (order.paymentMethod === 'COD') order.paymentStatus = 'PAID';
    await this.orderRepo.save(order);

    await this.invalidateDashboard(sellerId);
    await this.kafka.publish('marketplace.order.delivered', {
      sellerId,
      orderId,
      orderNumber: order.orderNumber,
      amount: Number(order.grandTotal),
    });

    // The first line's category drives the referral rate — commission-service
    // resolves a category rate card the way Amazon and Flipkart do.
    const firstProductId =
      Array.isArray(order.items) && order.items[0] ? (order.items[0] as any).productId : null;
    let category: string | undefined;
    if (firstProductId) {
      const product = await this.productRepo
        .findOne({
          where: { id: firstProductId },
          relations: ['category'],
        })
        .catch((): null => null);
      category = (product as any)?.category?.name ?? undefined;
    }

    return {
      success: true,
      orderId,
      // The settlement path writes a ledger reason of the form
      // `Order <ref> settled`, preferring this over the uuid. Omitting it — as
      // this used to — is why every wallet and payout row in the seller's
      // Transactions list read "Order 1ff455d2-68d7-… settled".
      orderNumber: order.orderNumber,
      status: 'DELIVERED',
      settlement: {
        orderTotal: Number(order.grandTotal),
        category,
        paymentStatus: order.paymentStatus,
      },
    };
  }

  // ── Returns & Refunds ─────────────────────────────────────────────

  /**
   * Resolve a batch of order uuids to the `orderNumber` a seller recognises.
   *
   * `return_requests.order_id` stores the marketplace order's **uuid** — the
   * customer's return is created by looking the order up by `id`
   * (`MarketplaceFulfillmentService.createReturnRequest`) — while every other
   * seller-facing page identifies an order by `orderNumber`. Handing the uuid
   * to the portal gave the seller a 36-character string that matched nothing on
   * their own Orders page, so the two screens could not be cross-referenced.
   *
   * Returned as a map rather than joined per row so a page of returns costs one
   * query. Ids with no matching order are simply absent, which lets callers
   * fall back rather than print a uuid.
   */
  private async orderNumbersByIdInternal(orderIds: (string | null | undefined)[]) {
    const ids = [...new Set(orderIds.filter((id): id is string => Boolean(id)))];
    if (ids.length === 0) return new Map<string, string>();

    const orders = await this.orderRepo.find({
      where: { id: In(ids) },
      select: ['id', 'orderNumber'],
    });
    return new Map(orders.map((o) => [o.id, o.orderNumber]));
  }

  /**
   * Seller-scoped uuid → `orderNumber` lookup for callers outside this service.
   *
   * commission-service records an order by the uuid the delivery route was
   * called with, so the portal's Commissions ledger had a column of uuids in it.
   * It has no way to resolve them itself — `marketplace_orders` lives here — so
   * the gateway asks for the mapping and renders the reference instead.
   *
   * Scoped by `sellerId` deliberately: an unscoped lookup would let one seller
   * turn another's order uuid into a real order number.
   */
  async resolveOrderNumbers(sellerId: string, orderIds: string[]) {
    const ids = [...new Set((orderIds ?? []).filter(Boolean))];
    if (ids.length === 0) return {};

    const orders = await this.orderRepo.find({
      where: { id: In(ids), sellerId },
      select: ['id', 'orderNumber'],
    });
    return Object.fromEntries(orders.map((o) => [o.id, o.orderNumber]));
  }

  /**
   * The seller's return queue.
   *
   * Reads `marketplace.return_requests` — the table the customer's return
   * actually creates, carrying the reason, the photos, the items and the refund
   * amount. This used to query `marketplace_orders` for orders whose *status*
   * was RETURN_REQUESTED and hand those back as though they were returns, so the
   * page had no reason, no return number, no refund figure and no way to tell
   * two returns on one order apart.
   */
  async getReturns(sellerId: string, status?: string, page = 1, limit = 20) {
    const where: any = { sellerId };
    if (status && status !== 'all') where.status = status.toUpperCase();

    const [rows, total] = await this.returnRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const orderNumbers = await this.orderNumbersByIdInternal(rows.map((r) => r.orderId));

    return {
      sellerId,
      data: rows.map((r) => ({
        id: r.id,
        returnNumber: r.returnNumber,
        orderId: r.orderId,
        // The seller-facing reference for the order this return belongs to.
        // Null rather than the uuid when the order cannot be resolved — the
        // portal renders a dash, which is honest, where a uuid is not.
        orderNumber: orderNumbers.get(r.orderId) ?? null,
        customerName: r.customerName ?? '',
        items: r.items ?? [],
        reason: r.reason,
        reasonDetail: r.reasonDetail ?? '',
        status: r.status,
        resolutionType: r.resolutionType,
        refundAmount: Number(r.refundAmount ?? 0),
        rejectionReason: r.rejectionReason ?? null,
        requestedAt: r.createdAt,
        refundedAt: r.refundedAt ?? null,
      })),
      total,
      page,
      limit,
    };
  }

  /**
   * Approve a return.
   *
   * Scoped by seller as well as return id — `updateReturnStatus` on the
   * fulfilment service takes an id alone and would let any seller approve
   * anybody's return.
   */
  async acceptReturn(sellerId: string, returnId: string) {
    const ret = await this.returnRepo.findOne({ where: { id: returnId, sellerId } });
    if (!ret) throw new NotFoundException('No such return request.');
    if (ret.status !== 'REQUESTED') {
      throw new BadRequestException(
        `This return is already ${ret.status.toLowerCase().replace(/_/g, ' ')}.`,
      );
    }

    ret.status = 'APPROVED';
    await this.returnRepo.save(ret);

    await this.kafka.publish('return.approved', {
      sellerId,
      returnId,
      returnNumber: ret.returnNumber,
      orderId: ret.orderId,
      refundAmount: Number(ret.refundAmount ?? 0),
    });
    await this.invalidateDashboard(sellerId);

    return { success: true, returnId, returnNumber: ret.returnNumber, status: 'APPROVED' };
  }

  /**
   * Refuse a return.
   *
   * This used to write nothing at all — it published a Kafka event and returned
   * `{ success: true }`, leaving the request sitting in REQUESTED forever. The
   * seller saw the same return again on every reload, and the customer was never
   * told. The order is put back to DELIVERED, since it was never returned.
   */
  async rejectReturn(sellerId: string, returnId: string, reason: string) {
    const detail = String(reason ?? '').trim();
    if (!detail) throw new BadRequestException('A reason is required to refuse a return.');

    const ret = await this.returnRepo.findOne({ where: { id: returnId, sellerId } });
    if (!ret) throw new NotFoundException('No such return request.');
    if (ret.status !== 'REQUESTED') {
      throw new BadRequestException(
        `This return is already ${ret.status.toLowerCase().replace(/_/g, ' ')}.`,
      );
    }

    ret.status = 'REJECTED';
    ret.rejectionReason = detail;
    await this.returnRepo.save(ret);

    // The goods were never returned, so the order goes back to delivered rather
    // than being left in RETURN_REQUESTED limbo.
    await this.orderRepo.update({ id: ret.orderId, sellerId }, { status: 'DELIVERED' });

    await this.kafka.publish('return.rejected', {
      sellerId,
      returnId,
      returnNumber: ret.returnNumber,
      orderId: ret.orderId,
      reason: detail,
    });
    await this.invalidateDashboard(sellerId);

    return {
      success: true,
      returnId,
      returnNumber: ret.returnNumber,
      status: 'REJECTED',
      reason: detail,
    };
  }

  /**
   * Refunds owed and paid on this seller's returns.
   *
   * A refund is a stage of a return, not a separate object, so this reads the
   * same `return_requests` table rather than looking for orders whose status
   * happens to be REFUNDED — which missed every refund still in flight and
   * carried no refund amount, reason or customer.
   */
  async getRefunds(sellerId: string, status?: string, page = 1, limit = 20) {
    const qb = this.returnRepo
      .createQueryBuilder('r')
      .where('r.seller_id = :sellerId', { sellerId })
      // Everything from "we owe this" through to "paid".
      .andWhere('r.status IN (:...statuses)', {
        statuses: ['APPROVED', 'PICKUP_ASSIGNED', 'PICKED_UP', 'RECEIVED', 'QC_PASSED', 'REFUNDED'],
      })
      .orderBy('r.updatedAt', 'DESC');

    if (status && status !== 'all') {
      // The portal filters in its own vocabulary: pending / processing / completed.
      const map: Record<string, string[]> = {
        pending: ['APPROVED', 'PICKUP_ASSIGNED'],
        processing: ['PICKED_UP', 'RECEIVED', 'QC_PASSED'],
        completed: ['REFUNDED'],
      };
      const mapped = map[status.toLowerCase()] ?? [status.toUpperCase()];
      qb.andWhere('r.status IN (:...filtered)', { filtered: mapped });
    }

    qb.skip((page - 1) * limit).take(limit);
    const [rows, total] = await qb.getManyAndCount();

    const refunded = rows.filter((r) => r.status === 'REFUNDED');
    const orderNumbers = await this.orderNumbersByIdInternal(rows.map((r) => r.orderId));

    return {
      sellerId,
      data: rows.map((r) => ({
        id: r.id,
        returnId: r.returnNumber,
        orderId: r.orderId,
        // See `orderNumbersByIdInternal` — `orderId` is a uuid, not the
        // reference the seller's Orders page shows.
        orderNumber: orderNumbers.get(r.orderId) ?? null,
        customerName: r.customerName ?? '',
        productName: Array.isArray(r.items) && r.items[0] ? ((r.items[0] as any).name ?? '') : '',
        amount: Number(r.refundAmount ?? 0),
        reason: r.reasonDetail || r.reason,
        status:
          r.status === 'REFUNDED'
            ? 'completed'
            : ['PICKED_UP', 'RECEIVED', 'QC_PASSED'].includes(r.status)
              ? 'processing'
              : 'pending',
        requestedAt: r.createdAt,
        processedAt: r.refundedAt ?? null,
      })),
      total,
      page,
      limit,
      totalRefunded: refunded.reduce((sum, r) => sum + Number(r.refundAmount ?? 0), 0),
      pendingTotal: rows
        .filter((r) => r.status !== 'REFUNDED')
        .reduce((sum, r) => sum + Number(r.refundAmount ?? 0), 0),
    };
  }

  // ── Finance ───────────────────────────────────────────────────────

  /**
   * What this seller has sold, and what it is worth to them.
   *
   * The previous version reported `SUM(grandTotal)` over PAID orders as
   * `balance` — gross order value, labelled as money the seller could withdraw.
   * Nothing was deducted: not commission, not refunds on returned orders, not
   * payouts already taken. It also hard-coded `currency: 'INR'` for every
   * market, so a Qatari seller's takings were announced in rupees.
   *
   * The honest figures are named for what they are. `grossSales` and
   * `estimatedNet` are derived here; the **spendable balance is payout-service's
   * to state**, and this service cannot see its ledger, so `balance` is null
   * with `dataAvailable: false` rather than a number that looks authoritative.
   *
   * Commission is charged at delivery, so it is estimated against delivered
   * orders only, at the seller's configured rate.
   */
  async getWallet(sellerId: string) {
    const sum = async (predicate: (qb: any) => any) => {
      const row = await predicate(
        this.orderRepo
          .createQueryBuilder('o')
          .select('COALESCE(SUM(o.grandTotal), 0)', 'total')
          .where('o.sellerId = :sellerId', { sellerId }),
      ).getRawOne();
      return parseFloat(row?.total ?? '0') || 0;
    };

    const [grossSales, awaitingPayment, delivered, refunded, settings, seller] = await Promise.all([
      sum((qb) => qb.andWhere('o.paymentStatus = :s', { s: 'PAID' })),
      sum((qb) => qb.andWhere('o.paymentStatus = :s', { s: 'PENDING' })),
      sum((qb) =>
        qb
          .andWhere('o.paymentStatus = :p', { p: 'PAID' })
          .andWhere('o.status = :d', { d: 'DELIVERED' }),
      ),
      sum((qb) => qb.andWhere('o.paymentStatus = :s', { s: 'REFUNDED' })),
      this.settingsRepo.findOne({ where: { sellerId } }),
      this.sellerRepo.findOne({
        where: { id: sellerId },
        select: ['id', 'regionCode', 'commissionRate'],
      }),
    ]);

    const commissionRate = Number(seller?.commissionRate ?? settings?.commissionRate ?? 10);
    const commission = Math.round(delivered * (commissionRate / 100) * 100) / 100;

    return {
      sellerId,
      grossSales,
      awaitingPayment,
      refunded,
      commissionRate,
      commission,
      estimatedNet: Math.round((grossSales - refunded - commission) * 100) / 100,
      // Withdrawable balance is the payout ledger's answer, not a subtraction we
      // can do from orders — it also has to account for payouts already made.
      balance: null as unknown,
      dataAvailable: false,
      // Never hard-coded: the seller's market decides the currency. The
      // fallback used to be a literal 'IN', so a seller with no region on
      // record was quoted a wallet balance in rupees.
      currency: getRegionConfig(seller?.regionCode ?? DEFAULT_REGION)?.currencyCode ?? null,
    };
  }

  async getWalletTransactions(sellerId: string, type?: string, page = 1) {
    const qb = this.orderRepo
      .createQueryBuilder('o')
      .where('o.sellerId = :sellerId', { sellerId })
      .andWhere('o.paymentStatus IN (:...statuses)', { statuses: ['PAID', 'REFUNDED'] })
      .orderBy('o.updatedAt', 'DESC')
      .skip((page - 1) * 20)
      .take(20);

    const [data, total] = await qb.getManyAndCount();
    return { sellerId, data, total, page };
  }

  /**
   * Payout history.
   *
   * Owned by payout-service, which the gateway reads directly. This returns an
   * empty list with `dataAvailable: false` rather than a bare `[]`, so a caller
   * can tell "this seller has no payouts" from "this service does not know".
   * The distinction matters: the portal previously rendered the empty array as a
   * settled fact next to a payout it had just claimed to create.
   */
  async getPayouts(sellerId: string, status?: string, page = 1) {
    return {
      sellerId,
      data: [] as unknown[],
      total: 0,
      page,
      dataAvailable: false,
      owner: 'payout-service',
    };
  }

  /**
   * Request a payout.
   *
   * This used to mint a `PAY-<timestamp>` reference, publish an event and return
   * `{ success: true, status: 'processing', eta: '2 business days' }` — with no
   * balance check, no persistence and no validation that the bank account
   * belonged to the seller. Nothing consumed the event, and `getPayouts` returns
   * an empty list, so the seller was told their money was on the way and then
   * shown no record of it, forever.
   *
   * Rather than keep fabricating a receipt, this now does the two things it can
   * do honestly — validate the request, and confirm the destination is really
   * this seller's — and then refuses, because the ledger that would make it real
   * lives in payout-service and nothing here is wired to it.
   *
   * Returning 501 is the point: a seller finding out that payouts are not
   * connected is strictly better than a seller believing they are.
   */
  async requestPayout(sellerId: string, amount: number, bankAccountId?: string) {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Enter a payout amount greater than zero.');
    }

    const accounts = await this.bankAccountRepo.count({ where: { sellerId } });
    if (accounts === 0) {
      throw new BadRequestException('Add a bank account before requesting a payout.');
    }
    if (bankAccountId) {
      const owned = await this.bankAccountRepo.findOne({ where: { id: bankAccountId, sellerId } });
      if (!owned) throw new NotFoundException('No such bank account.');
    }

    this.logger.warn(
      `Payout requested by ${sellerId} for ${amount} — no payout backend is wired to this route`,
    );
    throw new NotImplementedException(
      'Payout requests are not yet connected to the payout service. ' +
        'Your balance and bank details are saved; please contact support to withdraw.',
    );
  }

  /**
   * The seller's own commission rate.
   *
   * Only the rate — the commission *records* live in commission-service and the
   * gateway reads them from there. This used to return `data: []` alongside a
   * hard-coded `10`, which is why the Commissions page showed an empty ledger
   * and a rate that had nothing to do with what was actually charged.
   */
  async getCommissionRate(sellerId: string) {
    const settings = await this.settingsRepo.findOne({ where: { sellerId } });
    return { sellerId, commissionRate: Number(settings?.commissionRate ?? 10) };
  }

  // ── Marketing ─────────────────────────────────────────────────────

  // ── Campaigns ─────────────────────────────────────────────────────
  //
  // There is no campaigns table. All six of these returned `success: true` with
  // an invented `CMP-<timestamp>` id and stored nothing, so a seller could
  // "create" an ad campaign, be given a reference, and find an empty list the
  // moment they navigated away — with `getCampaigns` reporting `[]` as though
  // that were the truth.
  //
  // Kept as explicit refusals until the table exists. `SellerPromotion` is the
  // real, persisted marketing surface and is what the portal should use in the
  // meantime; see `getPromotions` / `createPromotion` below.

  private static campaignsUnavailable(): never {
    throw new NotImplementedException(
      'Ad campaigns are not available yet. Use Promotions to discount your listings.',
    );
  }

  async getCampaigns(sellerId: string, status?: string, page = 1) {
    // A read can answer honestly without throwing: nothing exists, and the
    // caller is told that the absence is a missing feature, not an empty list.
    return { sellerId, data: [] as unknown[], total: 0, page, dataAvailable: false };
  }

  async createCampaign(sellerId: string, dto: any) {
    return SellerService.campaignsUnavailable();
  }

  async updateCampaign(sellerId: string, campaignId: string, dto: any) {
    return SellerService.campaignsUnavailable();
  }

  async pauseCampaign(sellerId: string, campaignId: string) {
    return SellerService.campaignsUnavailable();
  }

  async resumeCampaign(sellerId: string, campaignId: string) {
    return SellerService.campaignsUnavailable();
  }

  async deleteCampaign(sellerId: string, campaignId: string) {
    return SellerService.campaignsUnavailable();
  }

  /**
   * Seller promotions.
   *
   * Was `createPromotion` → `PROMO-<timestamp>` stored nowhere, with
   * `getPromotions` → `[]`. A seller could launch a 20%-off campaign, be told it
   * was live, and nothing existed — not in the portal, not at checkout.
   */
  async getPromotions(sellerId: string, status?: string) {
    const where: any = { sellerId };
    if (status && status !== 'all') where.status = status;
    const [data, total] = await this.promotionRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
    });

    // `expired` is derived from the end date rather than stored, so a promotion
    // does not need a scheduled job to stop looking active.
    const now = Date.now();
    return {
      sellerId,
      data: data.map((p) => ({
        ...p,
        value: Number(p.value),
        minOrderValue: Number(p.minOrderValue),
        status: p.endDate && new Date(p.endDate).getTime() < now ? 'expired' : p.status,
      })),
      total,
    };
  }

  async createPromotion(sellerId: string, dto: any) {
    const name = String(dto?.name ?? '').trim();
    if (!name) throw new BadRequestException('A promotion name is required.');

    const value = Number(dto?.value ?? 0);
    if (!Number.isFinite(value) || value <= 0) {
      throw new BadRequestException('A promotion needs a discount greater than zero.');
    }
    if (dto?.type === 'percentage' && value > 100) {
      throw new BadRequestException('A percentage discount cannot exceed 100%.');
    }

    const code = dto?.code ? String(dto.code).trim().toUpperCase() : null;
    if (code) {
      const clash = await this.promotionRepo
        .createQueryBuilder('p')
        .where('p.seller_id = :sellerId', { sellerId })
        .andWhere('UPPER(p.code) = :code', { code })
        .getOne();
      if (clash)
        throw new BadRequestException(`You already have a promotion with the code ${code}.`);
    }

    const saved = await this.promotionRepo.save(
      this.promotionRepo.create({
        sellerId,
        name,
        code,
        type: ['percentage', 'flat', 'bogo', 'freebie'].includes(dto?.type)
          ? dto.type
          : 'percentage',
        value,
        maxDiscount: dto?.maxDiscount != null ? Number(dto.maxDiscount) : null,
        minOrderValue: Number(dto?.minOrderValue ?? 0),
        usageLimit: dto?.usageLimit != null ? Number(dto.usageLimit) : null,
        status:
          dto?.startDate && new Date(dto.startDate).getTime() > Date.now() ? 'scheduled' : 'active',
        startDate: dto?.startDate ? new Date(dto.startDate) : null,
        endDate: dto?.endDate ? new Date(dto.endDate) : null,
        applicableProducts: Array.isArray(dto?.applicableProducts) ? dto.applicableProducts : null,
      }),
    );

    await this.kafka.publish('seller.promotion.created', { sellerId, promotionId: saved.id, code });
    return { success: true, promotionId: saved.id, promotion: saved };
  }

  async getSponsored(sellerId: string) {
    return { sellerId, data: [] as unknown[], total: 0 };
  }

  async sponsorProduct(sellerId: string, dto: any) {
    return { success: true, sponsorId: `SPO-${Date.now()}` };
  }

  async getBrand(sellerId: string) {
    const settings = await this.settingsRepo.findOne({ where: { sellerId } });
    return {
      sellerId,
      brandName: settings?.storeName || '',
      tagline: settings?.storeDescription || '',
      logo: settings?.logoUrl || '',
      banner: settings?.bannerUrl || '',
    };
  }

  async updateBrand(sellerId: string, dto: any) {
    let settings = await this.settingsRepo.findOne({ where: { sellerId } });
    if (!settings) {
      settings = this.settingsRepo.create({ sellerId });
    }
    if (dto.brandName) settings.storeName = dto.brandName;
    if (dto.tagline) settings.storeDescription = dto.tagline;
    if (dto.logo) settings.logoUrl = dto.logo;
    if (dto.banner) settings.bannerUrl = dto.banner;
    await this.settingsRepo.save(settings);
    return { success: true };
  }

  // ── Store ─────────────────────────────────────────────────────────

  async getStorefront(sellerId: string) {
    const seller = await this.sellerRepo.findOne({ where: { id: sellerId } });
    const settings = await this.settingsRepo.findOne({ where: { sellerId } });
    return {
      sellerId,
      slug: seller?.storeSlug || '',
      storeName: settings?.storeName || seller?.businessName || '',
      description: settings?.storeDescription || '',
      logo: settings?.logoUrl || '',
      banner: settings?.bannerUrl || '',
      isOnline: settings?.isOnline ?? true,
      sections: [] as unknown[],
      theme: {},
    };
  }

  /**
   * Save the storefront.
   *
   * `Object.assign(settings, dto)` looked like it worked and saved almost
   * nothing: `getStorefront` presents `description` / `logo` / `banner`, while
   * the entity's columns are `storeDescription` / `logoUrl` / `bannerUrl`. The
   * mismatched keys were assigned to a TypeORM entity as plain properties, which
   * it ignores on write — so every edit a seller made to their storefront was
   * accepted, reported as saved, and discarded. Mapped explicitly, and only
   * known fields are written.
   */
  async updateStorefront(sellerId: string, dto: any) {
    let settings = await this.settingsRepo.findOne({ where: { sellerId } });
    if (!settings) settings = this.settingsRepo.create({ sellerId });

    if (dto.storeName !== undefined) settings.storeName = dto.storeName;
    // Accept the name the read side uses as well as the column's own name.
    if (dto.description !== undefined) settings.storeDescription = dto.description;
    if (dto.storeDescription !== undefined) settings.storeDescription = dto.storeDescription;
    if (dto.logo !== undefined) settings.logoUrl = dto.logo;
    if (dto.logoUrl !== undefined) settings.logoUrl = dto.logoUrl;
    if (dto.banner !== undefined) settings.bannerUrl = dto.banner;
    if (dto.bannerUrl !== undefined) settings.bannerUrl = dto.bannerUrl;
    if (dto.isOnline !== undefined) settings.isOnline = !!dto.isOnline;

    await this.settingsRepo.save(settings);

    // The slug lives on the seller record, not on settings.
    if (typeof dto.slug === 'string' && dto.slug.trim()) {
      const slug = dto.slug
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-');
      const clash = await this.sellerRepo.findOne({ where: { storeSlug: slug } });
      if (clash && clash.id !== sellerId) {
        throw new BadRequestException('That store address is already taken.');
      }
      await this.sellerRepo.update({ id: sellerId }, { storeSlug: slug });
    }

    return { success: true };
  }

  async getReviews(sellerId: string, page = 1) {
    // Get all product IDs for this seller
    const productIds = await this.listingRepo
      .createQueryBuilder('l')
      .select('l.product_id', 'productId')
      .where('l.seller_id = :sellerId', { sellerId })
      .getRawMany();

    if (!productIds.length) return { sellerId, data: [], total: 0, page };

    const ids = productIds.map((p) => p.productId);
    const [data, total] = await this.reviewRepo
      .createQueryBuilder('r')
      .where('r.productId IN (:...ids)', { ids })
      .andWhere('r.status = :status', { status: 'PUBLISHED' })
      .orderBy('r.createdAt', 'DESC')
      .skip((page - 1) * 20)
      .take(20)
      .getManyAndCount();

    return { sellerId, data, total, page };
  }

  async replyReview(sellerId: string, reviewId: string, reply: string) {
    const review = await this.reviewRepo.findOne({ where: { id: reviewId } });
    if (review) {
      review.sellerReply = reply;
      review.sellerRepliedAt = new Date();
      await this.reviewRepo.save(review);
    }
    this.logger.log(`💬 Reply to review ${reviewId}: "${reply.slice(0, 50)}..."`);
    return { success: true, reviewId };
  }

  // ── Analytics & Reporting ─────────────────────────────────────────

  async getAnalytics(sellerId: string, period: string = '7d') {
    const days = period === '30d' ? 30 : period === '90d' ? 90 : 7;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [orderCount, revenueResult, avgRatingResult] = await Promise.all([
      this.orderRepo.count({ where: { sellerId } }),
      this.orderRepo
        .createQueryBuilder('o')
        .select('COALESCE(SUM(o.grandTotal), 0)', 'sum')
        .where('o.sellerId = :sellerId', { sellerId })
        .andWhere('o.createdAt >= :since', { since })
        .andWhere('o.paymentStatus = :paid', { paid: 'PAID' })
        .getRawOne(),
      this.sellerRepo.findOne({ where: { id: sellerId }, select: ['sellerRating'] }),
    ]);

    return {
      sellerId,
      period,
      totalOrders: orderCount,
      revenue: parseFloat(revenueResult?.sum || '0'),
      avgRating: avgRatingResult?.sellerRating || 0,
      conversionRate: 0,
      viewsToOrders: 0,
      topProducts: [] as unknown[],
      chartData: [] as unknown[],
    };
  }

  async getPerformance(sellerId: string) {
    const seller = await this.sellerRepo.findOne({ where: { id: sellerId } });
    const totalOrders = await this.orderRepo.count({ where: { sellerId } });
    const cancelledOrders = await this.orderRepo.count({
      where: { sellerId, status: 'CANCELLED' },
    });
    const returnedOrders = await this.orderRepo.count({ where: { sellerId, status: 'RETURNED' } });

    return {
      sellerId,
      rating: seller?.sellerRating || 0,
      totalOrders,
      cancellationRate: totalOrders > 0 ? ((cancelledOrders / totalOrders) * 100).toFixed(1) : '0',
      returnRate: totalOrders > 0 ? ((returnedOrders / totalOrders) * 100).toFixed(1) : '0',
      responseTime: '< 2 hrs',
      dispatchSla: '95%',
      healthScore: 'Good',
    };
  }

  async getMessages(sellerId: string) {
    // Messages are stored in a separate messaging service; return from cache for now
    const cached = await this.redis.getJson(`seller:${sellerId}:messages`);
    return { sellerId, data: cached || [], total: (cached as any[])?.length || 0 };
  }

  /**
   * Disputes — not backed by anything yet.
   *
   * This used to query `marketplace_orders` for statuses `DISPUTE_OPEN`,
   * `DISPUTE_ESCALATED` and `DISPUTE_RESOLVED`. None of the three exists: the
   * `status` column is a Postgres enum that does not declare them, and no code
   * anywhere in the monorepo ever writes them. So the query did not return an
   * empty list — it raised `invalid input value for enum`, the gateway's
   * `catch` turned that into `{ data: [] }`, and the portal presented a failing
   * endpoint as "this seller has no disputes".
   *
   * Worse, had it ever returned rows, they would have been raw `MarketplaceOrder`
   * entities handed to a page expecting a `Dispute` — the order's uuid rendered
   * as the dispute reference, and `productName` / `orderId` / `amount` / `type`
   * all undefined.
   *
   * There is no dispute table and no dispute service, so there is nothing
   * honest to return. `dataAvailable: false` says exactly that, matching
   * `getPayouts` and `getPenaltyLedger`, and the portal renders it as
   * "unavailable" rather than as an empty queue a seller might trust.
   */
  async getDisputes(sellerId: string) {
    return {
      sellerId,
      data: [] as unknown[],
      total: 0,
      dataAvailable: false,
      owner: null as unknown,
    };
  }

  /**
   * GST / tax registration summary.
   *
   * PAN and GSTIN are government tax identifiers. This is a dashboard read used to
   * confirm *which* identifier is on file, not to retrieve it, so both are masked to
   * their last 4 characters — enough to recognise, not enough to reuse or leak in a
   * log, screenshot, or cached response. Full values stay in the KYC record and are
   * released only through the KYC/compliance path.
   */
  async getGst(sellerId: string) {
    const kyc = await this.kycRepo.findOne({ where: { sellerId } });
    const gstin = (kyc as any)?.gstin || '';
    const panNumber = (kyc as any)?.panNumber || '';

    return {
      sellerId,
      gstin: maskTaxId(gstin),
      panNumber: maskTaxId(panNumber),
      gstStatus: gstin ? 'Active' : 'Not Registered',
      filingHistory: [] as unknown[],
      invoices: [] as unknown[],
    };
  }

  async getShipping(sellerId: string) {
    const settings = await this.settingsRepo.findOne({ where: { sellerId } });
    return {
      sellerId,
      fulfillmentMode: settings?.fulfillmentMode || 'SELF',
      rates: settings?.shippingRates || [],
      dispatchSla: settings?.dispatchSla || 2,
      freeDeliveryThreshold: settings?.freeDeliveryThreshold || 0,
      deliveryRadius: settings?.deliveryRadius || 0,
    };
  }

  async updateShipping(sellerId: string, dto: any) {
    let settings = await this.settingsRepo.findOne({ where: { sellerId } });
    if (!settings) settings = this.settingsRepo.create({ sellerId });
    if (dto.fulfillmentMode) settings.fulfillmentMode = dto.fulfillmentMode;
    if (dto.rates) settings.shippingRates = dto.rates;
    if (dto.dispatchSla !== undefined) settings.dispatchSla = dto.dispatchSla;
    if (dto.freeDeliveryThreshold !== undefined)
      settings.freeDeliveryThreshold = dto.freeDeliveryThreshold;
    if (dto.deliveryRadius !== undefined) settings.deliveryRadius = dto.deliveryRadius;
    await this.settingsRepo.save(settings);
    return { success: true };
  }

  // ── Shipping configuration ────────────────────────────────────────────────
  //
  // Zones and couriers are seller-level configuration and live in
  // `seller_settings`, alongside the rates that were already stored there. The
  // gateway had routes for all of this and sent `get_seller_shipping_zones` /
  // `get_seller_couriers` / `get_seller_shipment_tracking`, but no handler
  // existed, so the Shipping & Logistics page could neither read nor save
  // anything — it showed its own placeholder zones and silently discarded every
  // edit.

  /** The regions this seller ships to, with their rates. */
  async getShippingZones(sellerId: string) {
    const settings = await this.settingsRepo.findOne({ where: { sellerId } });
    const rates = settings?.shippingRates ?? [];
    return {
      sellerId,
      data: rates.map((r: any, i: number) => ({
        id: r.id ?? `zone-${i}`,
        region: r.region,
        baseRate: Number(r.rate ?? 0),
        perKgRate: Number(r.perKgRate ?? 0),
        freeAbove: Number(r.freeAbove ?? settings?.freeDeliveryThreshold ?? 0),
        isActive: r.isActive !== false,
      })),
      total: rates.length,
    };
  }

  async updateShippingZone(sellerId: string, zoneId: string, dto: any) {
    let settings = await this.settingsRepo.findOne({ where: { sellerId } });
    if (!settings) settings = this.settingsRepo.create({ sellerId });

    const rates: any[] = Array.isArray(settings.shippingRates) ? [...settings.shippingRates] : [];
    const index = rates.findIndex((r: any, i: number) => (r.id ?? `zone-${i}`) === zoneId);

    const patch = {
      ...(dto.region !== undefined ? { region: dto.region } : {}),
      ...(dto.baseRate !== undefined ? { rate: Number(dto.baseRate) } : {}),
      ...(dto.perKgRate !== undefined ? { perKgRate: Number(dto.perKgRate) } : {}),
      ...(dto.freeAbove !== undefined ? { freeAbove: Number(dto.freeAbove) } : {}),
      ...(dto.isActive !== undefined ? { isActive: !!dto.isActive } : {}),
    };

    if (index >= 0) {
      rates[index] = { ...rates[index], ...patch, id: zoneId };
    } else {
      // A zone the seller is configuring for the first time.
      rates.push({ id: zoneId, region: dto.region ?? zoneId, rate: 0, ...patch });
    }

    settings.shippingRates = rates;
    await this.settingsRepo.save(settings);
    return { success: true, zoneId, zones: rates.length };
  }

  async getShippingRates(sellerId: string) {
    const settings = await this.settingsRepo.findOne({ where: { sellerId } });
    return {
      sellerId,
      data: settings?.shippingRates ?? [],
      dispatchSla: settings?.dispatchSla ?? 2,
      freeDeliveryThreshold: Number(settings?.freeDeliveryThreshold ?? 0),
    };
  }

  /**
   * Courier partners this seller has enabled.
   *
   * The available list is platform-level (which carriers KARTSEEK has contracts
   * with); which of them a seller uses is their own setting, stored under
   * `businessHours`-style JSON on `seller_settings.notifications`' sibling —
   * here kept in `shippingRates`' own record so no schema change is needed:
   * couriers are persisted in Redis per seller, which is durable enough for a
   * preference and avoids a migration for a list of four strings.
   */
  async getCouriers(sellerId: string) {
    const enabled =
      (await this.redis.getJson<{ defaultCourier?: string; enabledCouriers?: string[] }>(
        `seller:${sellerId}:couriers`,
      )) ?? {};
    const available = ['Delhivery', 'BlueDart', 'Ekart', 'XpressBees', 'India Post'];
    return {
      sellerId,
      data: available.map((name) => ({
        name,
        enabled: enabled.enabledCouriers ? enabled.enabledCouriers.includes(name) : true,
        isDefault: enabled.defaultCourier === name,
      })),
      defaultCourier: enabled.defaultCourier ?? null,
    };
  }

  async updateCouriers(
    sellerId: string,
    dto: { defaultCourier?: string; enabledCouriers?: string[] },
  ) {
    const current = (await this.redis.getJson<any>(`seller:${sellerId}:couriers`)) ?? {};
    const next = {
      defaultCourier: dto.defaultCourier ?? current.defaultCourier ?? null,
      enabledCouriers: dto.enabledCouriers ?? current.enabledCouriers ?? null,
    };
    await this.redis.setJson(`seller:${sellerId}:couriers`, next);
    return { success: true, ...next };
  }

  /**
   * Shipments in flight, derived from the seller's own orders.
   *
   * Built from `marketplace_orders` rather than a separate store so it can never
   * disagree with the Orders page about what has shipped.
   */
  async getShipmentTracking(sellerId: string, status?: string, page = 1, limit = 20) {
    const qb = this.orderRepo
      .createQueryBuilder('o')
      .where('o.sellerId = :sellerId', { sellerId })
      .andWhere('o.status IN (:...shipped)', {
        shipped: ['SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'],
      })
      .orderBy('o.updatedAt', 'DESC');

    if (status) qb.andWhere('o.status = :status', { status: status.toUpperCase() });
    qb.skip((page - 1) * limit).take(limit);

    const [orders, total] = await qb.getManyAndCount();
    return {
      sellerId,
      data: orders.map((o) => ({
        orderId: o.id,
        orderNumber: o.orderNumber,
        trackingId: o.trackingId ?? null,
        courierName: o.courierName ?? null,
        status: o.status,
        customerName: o.customerName ?? '',
        items: Array.isArray(o.items) ? o.items.length : 0,
        amount: Number(o.grandTotal),
        updatedAt: o.updatedAt,
      })),
      total,
      page,
      limit,
    };
  }

  async getFlashDeals(sellerId: string) {
    return { sellerId, available: [] as unknown[], joined: [] as unknown[] };
  }

  async joinFlashDeal(sellerId: string, dto: any) {
    await this.kafka.publish('seller.flash_deal.joined', { sellerId, dealId: dto.dealId });
    return { success: true, dealId: dto.dealId };
  }

  async updatePromotion(sellerId: string, promoId: string, dto: any) {
    // Scoped by seller as well as id: one seller must not be able to edit
    // another's campaign by guessing an id.
    const promo = await this.promotionRepo.findOne({ where: { id: promoId, sellerId } });
    if (!promo) throw new NotFoundException('No such promotion.');

    if (dto?.name !== undefined) promo.name = String(dto.name);
    if (dto?.value !== undefined) promo.value = Number(dto.value);
    if (dto?.minOrderValue !== undefined) promo.minOrderValue = Number(dto.minOrderValue);
    if (dto?.maxDiscount !== undefined)
      promo.maxDiscount = dto.maxDiscount == null ? null : Number(dto.maxDiscount);
    if (dto?.usageLimit !== undefined)
      promo.usageLimit = dto.usageLimit == null ? null : Number(dto.usageLimit);
    if (dto?.endDate !== undefined) promo.endDate = dto.endDate ? new Date(dto.endDate) : null;
    if (
      dto?.status !== undefined &&
      ['active', 'paused', 'scheduled', 'expired'].includes(dto.status)
    ) {
      promo.status = dto.status;
    }

    await this.promotionRepo.save(promo);
    return { success: true, promoId, promotion: promo };
  }

  async deletePromotion(sellerId: string, promoId: string) {
    const result = await this.promotionRepo.delete({ id: promoId, sellerId });
    if (!result.affected) throw new NotFoundException('No such promotion.');
    return { success: true, promoId };
  }

  async pauseSponsored(sellerId: string, sponsoredId: string) {
    return { success: true, sponsoredId, status: 'paused' };
  }

  async resumeSponsored(sellerId: string, sponsoredId: string) {
    return { success: true, sponsoredId, status: 'active' };
  }

  async getReports(sellerId: string, type?: string) {
    const period = 'last_30_days';
    const monthStart = new Date();
    monthStart.setDate(monthStart.getDate() - 30);

    const [orderCount, revenueResult] = await Promise.all([
      this.orderRepo.count({ where: { sellerId } }),
      this.orderRepo
        .createQueryBuilder('o')
        .select('COALESCE(SUM(o.grandTotal), 0)', 'sum')
        .where('o.sellerId = :sellerId', { sellerId })
        .andWhere('o.createdAt >= :monthStart', { monthStart })
        .getRawOne(),
    ]);

    return {
      sellerId,
      type: type || 'overview',
      period,
      data: { totalOrders: orderCount, revenue: parseFloat(revenueResult?.sum || '0') },
    };
  }

  async exportReport(sellerId: string, type?: string) {
    return { success: true, downloadUrl: `/exports/${sellerId}_${type || 'overview'}.csv` };
  }

  // Notifications moved up next to the other real-table reads. The versions that
  // stood here read a Redis key nothing wrote and acknowledged reads without
  // recording them.

  // ── Staff ─────────────────────────────────────────────────────────
  //
  // Was: `addStaff` returning `STF-<timestamp>`, `getStaff` returning `[]`, and
  // update/remove echoing back whatever id they were handed. A seller could add
  // a colleague, see "invited", and no record existed anywhere.

  private static readonly STAFF_ROLES = ['admin', 'manager', 'catalog', 'finance', 'support'];

  async getStaff(sellerId: string) {
    const [data, total] = await this.staffRepo.findAndCount({
      where: { sellerId },
      order: { createdAt: 'DESC' },
    });
    return { sellerId, data, total };
  }

  async addStaff(sellerId: string, dto: any) {
    const email = String(dto?.email ?? '')
      .trim()
      .toLowerCase();
    const name = String(dto?.name ?? '').trim();
    if (!name || !email) throw new BadRequestException('A name and an email address are required.');

    const role = SellerService.STAFF_ROLES.includes(dto?.role) ? dto.role : 'support';

    const existing = await this.staffRepo
      .createQueryBuilder('s')
      .where('s.seller_id = :sellerId', { sellerId })
      .andWhere('LOWER(s.email) = :email', { email })
      .getOne();
    if (existing) throw new BadRequestException('That email is already on your team.');

    const saved = await this.staffRepo.save(
      this.staffRepo.create({
        sellerId,
        name,
        email,
        phone: dto?.phone ?? null,
        role,
        status: 'active',
      }),
    );

    await this.kafka.publish('seller.staff.invited', { sellerId, staffId: saved.id, email, role });
    return { success: true, staffId: saved.id, staff: saved };
  }

  async updateStaff(sellerId: string, staffId: string, dto: any) {
    // Scoped by seller as well as id, so one seller cannot edit another's team.
    const staff = await this.staffRepo.findOne({ where: { id: staffId, sellerId } });
    if (!staff) throw new NotFoundException('No such team member.');

    if (dto?.name !== undefined) staff.name = String(dto.name);
    if (dto?.phone !== undefined) staff.phone = dto.phone;
    if (dto?.role !== undefined && SellerService.STAFF_ROLES.includes(dto.role))
      staff.role = dto.role;
    if (dto?.status !== undefined) staff.status = dto.status === 'inactive' ? 'inactive' : 'active';

    await this.staffRepo.save(staff);
    return { success: true, staffId, staff };
  }

  async removeStaff(sellerId: string, staffId: string) {
    const result = await this.staffRepo.delete({ id: staffId, sellerId });
    if (!result.affected) throw new NotFoundException('No such team member.');
    return { success: true, staffId };
  }

  // ── Settings ──────────────────────────────────────────────────────

  async getSettings(sellerId: string) {
    const settings = await this.settingsRepo.findOne({ where: { sellerId } });
    const kyc = await this.kycRepo.findOne({ where: { sellerId } });

    return {
      sellerId,
      store: {
        name: settings?.storeName || '',
        description: settings?.storeDescription || '',
        logo: settings?.logoUrl || '',
        isOnline: settings?.isOnline ?? true,
        autoAcceptOrders: settings?.autoAcceptOrders ?? false,
        deliveryRadius: settings?.deliveryRadius || 0,
        minimumOrder: settings?.minimumOrder || 0,
        freeDeliveryThreshold: settings?.freeDeliveryThreshold || 0,
        businessHours: settings?.businessHours || null,
      },
      // Payout destinations come from `seller_bank_accounts`, masked. This
      // returned the plaintext `settings.bankDetails` jsonb in full.
      bank: await this.getBankAccounts(sellerId)
        .then((r) => r.data)
        .catch((): unknown[] => []),
      shipping: {
        fulfillmentMode: settings?.fulfillmentMode || 'SELF',
        rates: settings?.shippingRates || [],
        dispatchSla: settings?.dispatchSla || 2,
      },
      notifications: settings?.notifications || {
        email: true,
        sms: true,
        push: true,
        orderAlerts: true,
        lowStockAlerts: true,
      },
      security: {
        twoFactorEnabled: settings?.twoFactorEnabled ?? false,
      },
      kyc: {
        status: kyc?.status || 'PENDING',
        ownerName: kyc?.ownerFullName || '',
        businessType: kyc?.businessType || '',
      },
    };
  }

  async updateSettings(sellerId: string, dto: any) {
    let settings = await this.settingsRepo.findOne({ where: { sellerId } });
    if (!settings) settings = this.settingsRepo.create({ sellerId });

    // Map nested DTO to flat entity
    if (dto.store) {
      if (dto.store.name) settings.storeName = dto.store.name;
      if (dto.store.description) settings.storeDescription = dto.store.description;
      if (dto.store.logo) settings.logoUrl = dto.store.logo;
      if (dto.store.isOnline !== undefined) settings.isOnline = dto.store.isOnline;
      if (dto.store.autoAcceptOrders !== undefined)
        settings.autoAcceptOrders = dto.store.autoAcceptOrders;
      if (dto.store.deliveryRadius !== undefined)
        settings.deliveryRadius = dto.store.deliveryRadius;
      if (dto.store.minimumOrder !== undefined) settings.minimumOrder = dto.store.minimumOrder;
      if (dto.store.freeDeliveryThreshold !== undefined)
        settings.freeDeliveryThreshold = dto.store.freeDeliveryThreshold;
      if (dto.store.businessHours) settings.businessHours = dto.store.businessHours;
    }
    // `dto.bank` is deliberately NOT written.
    //
    // `seller_settings.bankDetails` is a plaintext jsonb column, and this wrote
    // whatever the client sent into it verbatim while `getSettings` handed it
    // straight back — a second, unencrypted copy of the seller's account number
    // sitting alongside `seller_bank_accounts`, which encrypts it at rest and
    // only ever renders the last four digits. Payout destinations go through
    // `addBankAccount`; there is no reason for a second store.
    if (dto.shipping) {
      if (dto.shipping.fulfillmentMode) settings.fulfillmentMode = dto.shipping.fulfillmentMode;
      if (dto.shipping.rates) settings.shippingRates = dto.shipping.rates;
      if (dto.shipping.dispatchSla) settings.dispatchSla = dto.shipping.dispatchSla;
    }
    if (dto.notifications) settings.notifications = dto.notifications;
    if (dto.security?.twoFactorEnabled !== undefined)
      settings.twoFactorEnabled = dto.security.twoFactorEnabled;

    await this.settingsRepo.save(settings);
    return { success: true };
  }

  /**
   * Change the seller's sign-in password.
   *
   * This returned `{ success: true }` after publishing an event that nothing
   * consumes. It never verified the current password and never changed
   * anything — a seller who believed they had rotated a compromised credential
   * had not, and had been told they had. `ChangePasswordDto` collects
   * `currentPassword` precisely so it can be checked, and the check never ran.
   *
   * The credential lives in `users`, which is auth-service's table, not this
   * module's — so this cannot be done correctly from here. It fails loudly and
   * points at the route that works, instead of quietly succeeding.
   */
  async changePassword(sellerId: string, dto: any) {
    this.logger.warn(`Seller ${sellerId} attempted a password change on the marketplace route`);
    throw new NotImplementedException(
      'Change your password from Account settings — it is managed by the sign-in service, not the seller portal.',
    );
  }

  // ── Support ───────────────────────────────────────────────────────

  /**
   * Support tickets.
   *
   * Previously `createTicket` handed back a `TKT-<timestamp>` reference and
   * stored nothing, while `getSupport` answered `{ tickets: [] }` — so a seller
   * reporting a missing payout was given a case number that referred to nothing
   * and could never be followed up.
   */
  async getSupport(sellerId: string, status?: string) {
    const where: any = { sellerId };
    if (status) where.status = status;
    const [tickets, total] = await this.supportRepo.findAndCount({
      where,
      order: { updatedAt: 'DESC' },
    });
    return { sellerId, tickets, total, faq: [] as unknown[] };
  }

  async createTicket(sellerId: string, dto: any) {
    const subject = String(dto?.subject ?? '').trim();
    if (!subject) throw new BadRequestException('A subject is required.');

    const reference = `TKT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const now = new Date().toISOString();

    const ticket = await this.supportRepo.save(
      this.supportRepo.create({
        reference,
        sellerId,
        subject,
        category: dto?.category ?? 'general',
        priority: ['low', 'medium', 'high', 'urgent'].includes(dto?.priority)
          ? dto.priority
          : 'medium',
        status: 'open',
        messages: dto?.message ? [{ sender: 'seller', body: String(dto.message), at: now }] : [],
      }),
    );

    await this.kafka.publish('seller.support.ticket_created', {
      sellerId,
      ticketId: ticket.id,
      reference,
      subject,
      priority: ticket.priority,
    });
    this.logger.log(`🎫 Support ticket ${reference} opened by seller ${sellerId}`);
    return { success: true, ticketId: ticket.id, reference, status: ticket.status, ticket };
  }

  async replyTicket(sellerId: string, ticketId: string, message: string) {
    const body = String(message ?? '').trim();
    if (!body) throw new BadRequestException('A message is required.');

    const ticket = await this.supportRepo.findOne({ where: { id: ticketId, sellerId } });
    if (!ticket) throw new NotFoundException('No such ticket.');

    ticket.messages = [
      ...(ticket.messages ?? []),
      { sender: 'seller', body, at: new Date().toISOString() },
    ];
    // A seller replying to a resolved ticket reopens it.
    if (ticket.status === 'resolved' || ticket.status === 'closed') ticket.status = 'open';
    await this.supportRepo.save(ticket);

    return {
      success: true,
      ticketId,
      reference: ticket.reference,
      messages: ticket.messages.length,
    };
  }
}
