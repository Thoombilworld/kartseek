import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, ILike, In, MoreThanOrEqual } from 'typeorm';
import {
  applyMarketFilter,
  assertInMarket,
  normaliseMarket,
  requireId,
  requireMarket,
} from '@app/common';
import { RedisService } from '@app/redis';
import { KafkaProducerService } from '@app/kafka';
import { Product } from '../entities/product.entity';
import { Seller } from '../entities/seller.entity';
import { PUBLIC_SELLER_FIELDS } from '../entities/seller.public-fields';
import { MarketplaceOrder } from '../entities/marketplace-order.entity';
import { ReturnRequest } from '../entities/return-request.entity';
import { Coupon, CouponUsage } from '../entities/coupon.entity';
import { ShipmentTrackingEvent } from '../entities/shipment-tracking-event.entity';
import { ProductVariant } from '../entities/product-variant.entity';
import { ProductQuestion, ProductAnswer } from '../entities/product-qa.entity';
import { DeliveryAssignment } from '../entities/delivery-assignment.entity';
import {
  ProductReport,
  type ProductReportReason,
  type ProductReportStatus,
} from '../entities/product-report.entity';
import { PriceAlert } from '../entities/price-alert.entity';
import { ProductListing } from '../entities/product-listing.entity';

/**
 * The authenticated caller, as forwarded by the API Gateway from the verified
 * JWT. `ownerId` is the token subject (`users.id`), never a client-supplied
 * value — the whole point is that it cannot be chosen by the requester.
 */
export interface Actor {
  ownerId?: string;
  role?: string;
  /** Set for a region-locked admin: the one market they may write in. */
  regionCode?: string;
}

/**
 * MarketplaceFulfillmentService — post-purchase and listing-detail concerns.
 *
 * Returns, coupons, shipment tracking, product variants, product Q&A and delivery
 * assignments. These arrived together as the "Tier 6" entity set and share a shape:
 * each owns its own table, is driven by state transitions that emit Kafka events,
 * and sits after the browse/checkout path rather than on it.
 *
 * Split out of MarketplaceService so the storefront service is not carrying the
 * post-purchase lifecycle, and so these state machines can be tested and changed
 * without touching catalogue or cart.
 */
@Injectable()
export class MarketplaceFulfillmentService {
  private readonly logger = new Logger(MarketplaceFulfillmentService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly kafka: KafkaProducerService,
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    // Resolves the caller's JWT subject to the seller they own — see `Actor`.
    @InjectRepository(Seller) private readonly sellerRepo: Repository<Seller>,
    @InjectRepository(MarketplaceOrder) private readonly orderRepo: Repository<MarketplaceOrder>,
    @InjectRepository(ReturnRequest) private readonly returnRepo: Repository<ReturnRequest>,
    @InjectRepository(Coupon) private readonly couponRepo: Repository<Coupon>,
    @InjectRepository(CouponUsage) private readonly couponUsageRepo: Repository<CouponUsage>,
    @InjectRepository(ShipmentTrackingEvent)
    private readonly trackingRepo: Repository<ShipmentTrackingEvent>,
    @InjectRepository(ProductVariant) private readonly variantRepo: Repository<ProductVariant>,
    @InjectRepository(ProductQuestion) private readonly questionRepo: Repository<ProductQuestion>,
    @InjectRepository(ProductAnswer) private readonly answerRepo: Repository<ProductAnswer>,
    @InjectRepository(DeliveryAssignment)
    private readonly deliveryAssignmentRepo: Repository<DeliveryAssignment>,
    @InjectRepository(ProductReport) private readonly reportRepo: Repository<ProductReport>,
    @InjectRepository(PriceAlert) private readonly priceAlertRepo: Repository<PriceAlert>,
    @InjectRepository(ProductListing) private readonly listingRepo: Repository<ProductListing>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  // ── Object-level authorisation ──────────────────────────────────────────────
  //
  // The routes below are reached through gateway handlers gated by
  // `@Roles(SELLER)` and nothing else. SELLER is a role every seller on the
  // platform holds, so it answers "is this a seller?" and never "is this *their*
  // listing?". The service methods took a bare id, which meant any seller could
  // rewrite another seller's variant prices and stock, set their coupon to 100%
  // off, read their coupon redemptions, mark their returns REFUNDED, or push a
  // tracking event that flipped an order they have nothing to do with to
  // DELIVERED — and commission is charged at delivery, so that last one moves
  // money.
  //
  // Enforced here rather than at the gateway on purpose: this is the layer every
  // transport shares, so a new HTTP route or message pattern cannot reintroduce
  // the gap by forgetting a guard.

  /** Who is asking. Forwarded by the gateway from the verified JWT. */
  private static readonly ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN', 'FRANCHISE_ADMIN']);

  /**
   * Resolve the caller to the seller they own.
   *
   * `null` for an admin (who is allowed everywhere) and for a caller with no
   * seller account (who is then allowed nowhere).
   */
  private async actorSellerId(actor?: Actor): Promise<string | null> {
    const ownerId = actor?.ownerId;
    if (!ownerId) return null;
    const seller = await this.sellerRepo.findOne({
      where: { ownerId } as any,
      select: ['id'],
    });
    return seller?.id ?? null;
  }

  private static isAdmin(actor?: Actor): boolean {
    return MarketplaceFulfillmentService.ADMIN_ROLES.has(String(actor?.role ?? '').toUpperCase());
  }

  /**
   * Fail unless the caller owns the resource.
   *
   * Fails closed in every ambiguous case: no actor, no seller account, or a
   * resource whose own `seller_id` was never populated. A record nobody
   * demonstrably owns is not a record anybody may edit.
   */
  /**
   * The market a new coupon is issued for, given who is issuing it: the
   * caller's own market when the gateway sent a `scope` (any other market named
   * in the body is refused); the requested one for a global admin (none = the
   * platform's, runs everywhere); a seller's own market by default.
   *
   * This used to read `actor.regionCode` and refuse through a private
   * `denyMarket` — a third spelling of a rule that already had two correct
   * implementations. One drifted copy of an authorisation rule is worse than
   * one copy in the wrong place, so the private pair is gone and this reads the
   * same `scope` every other handler reads.
   */
  private async couponMarketFor(
    actor: Actor | undefined,
    requested?: string | null,
    scope?: string,
  ): Promise<string | null> {
    // `requireMarket`, not `normaliseMarket`. The gate was `if (lock)`, so a
    // lock this platform cannot read fell through to the GLOBAL path below and
    // returned the caller's own `requested` market unchecked — a coupon scoped
    // by whatever the caller asked for, to an admin confined to one market
    // (R2-1). Present-but-unreadable is a refusal; a genuinely absent scope is
    // the documented global path that follows.
    const lock = requireMarket(scope, 'coupon', this.logger);
    const wanted = normaliseMarket(requested ?? undefined) ?? null;
    if (lock) {
      if (wanted && wanted !== lock) {
        assertInMarket(wanted, lock, 'coupon', this.logger);
      }
      return lock;
    }
    if (wanted) return wanted;
    if (MarketplaceFulfillmentService.isAdmin(actor)) return null;
    const ownerId = actor?.ownerId;
    if (!ownerId) return null;
    const seller = await this.sellerRepo.findOne({
      where: { ownerId } as any,
      select: ['id', 'regionCode'] as any,
    });
    return normaliseMarket(seller?.regionCode ?? undefined) ?? null;
  }

  private async assertOwns(
    actor: Actor | undefined,
    resourceSellerId: string | null | undefined,
    subject: string,
  ) {
    if (MarketplaceFulfillmentService.isAdmin(actor)) return;

    const callerSellerId = await this.actorSellerId(actor);
    if (callerSellerId && resourceSellerId && callerSellerId === String(resourceSellerId)) return;

    this.logger.warn(
      `Blocked cross-seller write: owner=${actor?.ownerId ?? 'anonymous'} ` +
        `seller=${callerSellerId ?? 'none'} attempted ${subject} owned by ${resourceSellerId ?? 'nobody'}`,
    );
    throw new ForbiddenException(`You do not have access to this ${subject}.`);
  }

  /** The seller who owns a variant — its own column, or the product's. */
  private async variantSellerId(
    variantId: string,
  ): Promise<{ variant: ProductVariant; sellerId: string | null }> {
    const variant = await this.variantRepo.findOne({ where: { id: variantId } });
    if (!variant) throw new NotFoundException(`Variant ${variantId} not found`);
    if (variant.sellerId) return { variant, sellerId: variant.sellerId };
    const product = await this.productRepo.findOne({
      where: { id: variant.productId },
      select: ['id', 'seller_id'],
    });
    return { variant, sellerId: product?.seller_id ?? null };
  }

  /**
   * The market a seller trades in, for the scope check on catalogue writes.
   *
   * A variant carries no market of its own; the seller who owns it does, and
   * that is the documented attribution join for the whole product tree (see
   * `admin/admin.service.ts:630-652`). `null` — an unattributed seller — is
   * refused for a scoped caller by `assertInMarket`, which is the right
   * default: a row nobody can place is not a regional admin's to edit.
   */
  private async sellerMarket(sellerId: string | null | undefined): Promise<string | null> {
    if (!sellerId) return null;
    const seller = await this.sellerRepo.findOne({
      where: { id: sellerId } as any,
      select: ['id', 'regionCode'] as any,
    });
    return seller?.regionCode ?? null;
  }

  /** The market of a reported listing: the seller who owns it. Null when unattributable. */
  private async reportMarket(productId: string | null | undefined): Promise<string | null> {
    if (!productId) return null;
    const product = await this.productRepo.findOne({
      where: { id: productId },
      select: ['id', 'seller_id'],
    });
    return this.sellerMarket(product?.seller_id);
  }

  // ── Return requests ─────────────────────────────────────────────────────────
  async createReturnRequest(dto: any) {
    const order = await this.orderRepo.findOne({ where: { id: dto.orderId } });
    if (!order) throw new NotFoundException(`Order ${dto.orderId} not found`);
    if (!['DELIVERED'].includes(order.status)) {
      throw new BadRequestException('Returns can only be requested for delivered orders');
    }
    const count = await this.returnRepo.count();
    const returnNumber = `RET-${new Date().getFullYear()}-${(count + 1).toString().padStart(4, '0')}`;
    const entity = this.returnRepo.create({ ...dto, returnNumber, status: 'REQUESTED' });
    const saved = await this.returnRepo.save(entity);
    // Update order status
    await this.orderRepo.update(dto.orderId, { status: 'RETURN_REQUESTED' });
    await this.kafka.publish('return.created', { returnNumber, orderId: dto.orderId });
    this.logger.log(`Return created: ${returnNumber} for order ${dto.orderId}`);
    return saved;
  }

  async getReturnRequests(filters: {
    customerId?: string;
    sellerId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const where: any = {};
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.sellerId) where.sellerId = filters.sellerId;
    if (filters.status) where.status = filters.status;
    const [data, total] = await this.returnRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  async getReturnRequestById(id: string) {
    const ret = await this.returnRepo.findOne({
      where: { id },
      relations: { order: true, seller: true },
      // Without this projection the joined seller arrived whole — banking, tax
      // and KYC columns included.
      select: { seller: { ...PUBLIC_SELLER_FIELDS } } as any,
    });
    if (!ret) throw new NotFoundException(`Return request ${id} not found`);
    return ret;
  }

  async updateReturnStatus(
    id: string,
    dto: { status: string; rejectionReason?: string; qcCondition?: string; qcNotes?: string },
    actor?: Actor,
    scope?: string,
  ) {
    const ret = await this.returnRepo.findOne({ where: { id } });
    if (!ret) throw new NotFoundException(`Return request ${id} not found`);
    // A seller may only decide their own returns. `REFUNDED` moves money, so an
    // unscoped transition here was a write into another seller's ledger.
    await this.assertOwns(actor, ret.sellerId, 'return request');
    // And an admin may only decide returns in their own market. The row carries
    // `region_code` itself, so this needs no join — the gateway sent `scope` and
    // this handler was dropping it, which let a QA admin refund an Indian return.
    assertInMarket(ret.regionCode, scope, 'return request', this.logger);

    const update: any = { status: dto.status };
    if (dto.status === 'REJECTED') update.rejectionReason = dto.rejectionReason;
    if (dto.status === 'QC_PASSED' || dto.status === 'QC_FAILED') {
      update.qcCondition = dto.qcCondition;
      update.qcNotes = dto.qcNotes;
    }
    if (dto.status === 'PICKED_UP') update.pickedUpAt = new Date();
    if (dto.status === 'RECEIVED') update.receivedAt = new Date();
    if (dto.status === 'REFUNDED') update.refundedAt = new Date();
    await this.returnRepo.update(id, update);
    await this.kafka.publish('return.status-updated', { id, ...dto });
    this.logger.log(`Return ${id} status → ${dto.status}`);
    return { success: true, id, status: dto.status };
  }

  /**
   * A customer withdrawing their own return request.
   *
   * `updateReturnStatus` above cannot serve this: it is scoped by `assertOwns`
   * to the *seller* who owns the return, and its gateway route is restricted to
   * SELLER/ADMIN. So the "Cancel Return Request" button the customer has been
   * shown on `/marketplace/returns` had no endpoint behind it at all — it was
   * rendered with no handler, and there was nothing to give it.
   *
   * Ownership is checked against `customerId`, and the transition is allowed
   * only while the request is still PENDING. Once a seller has approved it or a
   * courier has collected the goods, withdrawal is no longer the customer's
   * unilateral call and the return has to be resolved through support.
   */
  async cancelReturn(id: string, customerId: string) {
    if (!customerId) {
      throw new BadRequestException('A customer id is required to cancel a return.');
    }
    const ret = await this.returnRepo.findOne({ where: { id } });
    if (!ret) throw new NotFoundException(`Return request ${id} not found`);

    if (String(ret.customerId) !== String(customerId)) {
      this.logger.warn(
        `Blocked cancel of return ${id}: customer ${customerId} is not the requester`,
      );
      throw new ForbiddenException('You do not have access to this return request.');
    }

    // REQUESTED is the state a new return is created in — the enum has no
    // PENDING at all, so the original check here refused every single return,
    // including the ones this route exists to cancel. The unit tests could not
    // catch it: they mock the repository, so no enum is ever consulted.
    if (ret.status !== 'REQUESTED') {
      throw new BadRequestException(
        `This return is already ${String(ret.status).toLowerCase().replace(/_/g, ' ')} and can no longer be cancelled. Please contact support.`,
      );
    }

    await this.returnRepo.update(id, { status: 'CANCELLED' });
    await this.kafka.publish('return.status-updated', {
      id,
      status: 'CANCELLED',
      cancelledBy: 'CUSTOMER',
    });
    this.logger.log(`Return ${id} cancelled by customer ${customerId}`);
    return { success: true, id, status: 'CANCELLED' };
  }

  async assignReturnPickup(
    id: string,
    dto: { pickupPartnerId: string; pickupScheduledAt: string; scope?: string },
  ) {
    // `new Date(undefined)` is an Invalid Date, which TypeORM serialises as
    // "0NaN-NaN-NaNTNaN:NaN..." and Postgres rejects — surfacing as a 500 that
    // named the timestamp syntax rather than the missing field. Both values are
    // required to schedule a pickup, so say so.
    if (!dto?.pickupPartnerId) {
      throw new BadRequestException('pickupPartnerId is required to assign a pickup');
    }
    const scheduledAt = new Date(dto?.pickupScheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) {
      throw new BadRequestException('pickupScheduledAt must be a valid ISO 8601 date-time');
    }
    // The return's own market, against the caller's. This wrote straight to
    // `update()` without reading the row, so a regional admin scheduled pickups
    // for another market's returns — and the 404 the missing row deserves was
    // an `{ success: true }` besides.
    const ret = await this.returnRepo.findOne({
      where: { id: requireId(id, 'return request') },
      select: ['id', 'regionCode'],
    });
    if (!ret) throw new NotFoundException(`Return request ${id} not found`);
    assertInMarket(ret.regionCode, dto?.scope, 'return request', this.logger);

    await this.returnRepo.update(id, {
      pickupPartnerId: dto.pickupPartnerId,
      pickupScheduledAt: scheduledAt,
      status: 'PICKUP_ASSIGNED',
    });
    // Without `scope` — see `updateDeliveryStatus`.
    const { scope: _authorisedBy, ...event } = dto;
    await this.kafka.publish('return.pickup-assigned', { id, ...event });
    return { success: true, id };
  }

  // ── Coupons ─────────────────────────────────────────────────────────────────
  async createCoupon(dto: any, actor?: Actor, scope?: string) {
    // `_actor` and `scope` ride in the payload from the gateway: a region-locked
    // admin's coupon is issued for the market their token is locked to whatever
    // the body names, and a seller's defaults to the market their store trades
    // in. A coupon with no market is the platform's own (runs everywhere) —
    // only a global admin issues one.
    const { _actor, ...fields } = (dto ?? {}) as any;
    const who: Actor | undefined = actor ?? _actor;
    const regionCode = await this.couponMarketFor(
      who,
      fields.regionCode ?? fields.region_code,
      scope,
    );
    const existing = await this.couponRepo.findOne({ where: { code: fields.code?.toUpperCase() } });
    if (existing) throw new BadRequestException(`Coupon code '${fields.code}' already exists`);
    const entity = this.couponRepo.create({
      ...fields,
      regionCode,
      code: fields.code?.toUpperCase(),
    } as any) as unknown as Coupon;
    const saved = await this.couponRepo.save(entity);
    // Consumers key their caches by market; an event without one would have
    // to invalidate every market for a coupon that runs in one.
    await this.kafka.publish('coupon.created', {
      id: saved.id,
      code: saved.code,
      regionCode: saved.regionCode ?? null,
    });
    this.logger.log(`Coupon created: ${saved.code}`);
    return saved;
  }

  /**
   * List coupons.
   *
   * `publicOnly` is the default, and it matters: this endpoint carries no guard
   * and returns each row's `code`. With no filter it listed *every* coupon —
   * including campaigns that were deactivated, expired, or scheduled to start
   * next month — so a visitor could read the whole discount calendar and use
   * unlaunched codes the moment they went live.
   *
   * Public callers see only what is genuinely on offer right now: active, and
   * inside its validity window. A seller or admin listing their own coupons
   * passes `publicOnly: false` and gets the full set, including drafts.
   */
  async getCoupons(filters: {
    sellerId?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
    publicOnly?: boolean;
    /** Market being browsed: only its coupons and the market-agnostic ones. */
    region?: string;
    /** Only coupons issued for `region` — a region-locked admin's view. */
    regionStrict?: boolean;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const publicOnly = filters.publicOnly !== false;

    const qb = this.couponRepo
      .createQueryBuilder('c')
      .orderBy('c.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (filters.sellerId) qb.andWhere('c.sellerId = :sellerId', { sellerId: filters.sellerId });
    // A flat amount is in one currency: a "QR 50 off" code must not be offered
    // in India. Codes without a region apply everywhere.
    if (filters.region) {
      const region = filters.region.toUpperCase();
      // The strict branch is a market BOUNDARY, so it goes through the shared
      // predicate. The inclusive branch is not — it deliberately admits
      // market-agnostic codes, which is a different question from "is this row
      // mine", and `applyMarketFilter` only ever writes an equality.
      if (filters.regionStrict) applyMarketFilter(qb, 'c.regionCode', region);
      else qb.andWhere('(c.regionCode IS NULL OR c.regionCode = :region)', { region });
    }
    if (filters.isActive !== undefined)
      qb.andWhere('c.isActive = :isActive', { isActive: filters.isActive });

    if (publicOnly) {
      qb.andWhere('c.isActive = true')
        .andWhere('c.validFrom <= NOW()')
        .andWhere('c.validUntil >= NOW()');
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async getCouponById(id: string) {
    const coupon = await this.couponRepo.findOne({
      where: { id },
      relations: { seller: true },
      select: { seller: { ...PUBLIC_SELLER_FIELDS } } as any,
    });
    if (!coupon) throw new NotFoundException(`Coupon ${id} not found`);
    const usageCount = await this.couponUsageRepo.count({ where: { couponId: id } });
    return { ...coupon, usageStats: { totalRedemptions: usageCount } };
  }

  async validateCoupon(dto: {
    code: string;
    customerId: string;
    orderTotal: number;
    paymentMethod?: string;
    productIds?: string[];
    region?: string;
  }) {
    // `dto.code` was dereferenced straight into `.toUpperCase()`, so a checkout
    // that posted no coupon code answered 500 "Cannot read properties of
    // undefined" — a validation mistake reported as a server fault.
    if (!dto?.code || typeof dto.code !== 'string') {
      throw new BadRequestException('code is required to validate a coupon');
    }
    const coupon = await this.couponRepo.findOne({
      where: { code: dto.code.toUpperCase(), isActive: true },
    });
    if (!coupon) return { valid: false, reason: 'Coupon not found or inactive' };
    if (
      coupon.regionCode &&
      dto.region &&
      coupon.regionCode.toUpperCase() !== dto.region.toUpperCase()
    ) {
      return { valid: false, reason: 'This coupon is not valid in your market' };
    }

    const now = new Date();
    if (now < coupon.validFrom || now > coupon.validUntil) {
      return { valid: false, reason: 'Coupon has expired or is not yet active' };
    }
    if (coupon.minOrderValue > 0 && dto.orderTotal < coupon.minOrderValue) {
      return { valid: false, reason: `Minimum order value is ${coupon.minOrderValue}` };
    }
    if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
      return { valid: false, reason: 'Coupon usage limit reached' };
    }
    // Per-user limit
    const userUses = await this.couponUsageRepo.count({
      where: { couponId: coupon.id, customerId: dto.customerId },
    });
    if (userUses >= coupon.usageLimitPerUser) {
      return {
        valid: false,
        reason: 'You have already used this coupon the maximum number of times',
      };
    }
    // Payment method restriction
    if (
      coupon.applicablePaymentMethods?.length &&
      dto.paymentMethod &&
      !coupon.applicablePaymentMethods.includes(dto.paymentMethod)
    ) {
      return {
        valid: false,
        reason: `This coupon is only valid for ${coupon.applicablePaymentMethods.join(', ')} payments`,
      };
    }
    // Calculate discount
    let discount = 0;
    if (coupon.discountType === 'PERCENTAGE') {
      discount = dto.orderTotal * (Number(coupon.discountValue) / 100);
      if (coupon.maxDiscount && discount > Number(coupon.maxDiscount))
        discount = Number(coupon.maxDiscount);
    } else if (coupon.discountType === 'FLAT') {
      discount = Number(coupon.discountValue);
    } else if (coupon.discountType === 'FREE_SHIPPING') {
      discount = 0; // Handled at checkout level
    }
    return {
      valid: true,
      discount: Math.round(discount * 100) / 100,
      couponId: coupon.id,
      code: coupon.code,
      discountType: coupon.discountType,
    };
  }

  async redeemCoupon(dto: {
    couponId: string;
    customerId: string;
    orderId: string;
    discountApplied: number;
  }) {
    // Serialise concurrent redemptions with a row lock to enforce usage limits atomically.
    await this.dataSource.transaction(async (mgr) => {
      const couponRepo = mgr.getRepository(Coupon);
      const usageRepo = mgr.getRepository(CouponUsage);
      const coupon = await couponRepo.findOne({
        where: { id: dto.couponId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!coupon) throw new NotFoundException('Coupon not found');
      if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
        throw new BadRequestException('Coupon usage limit reached');
      }
      if (coupon.usageLimitPerUser > 0) {
        const userUses = await usageRepo.count({
          where: { couponId: coupon.id, customerId: dto.customerId },
        });
        if (userUses >= coupon.usageLimitPerUser) {
          throw new BadRequestException(
            'You have already used this coupon the maximum number of times',
          );
        }
      }
      await usageRepo.save(usageRepo.create(dto));
      await couponRepo.update(coupon.id, { usedCount: coupon.usedCount + 1 });
    });
    await this.kafka.publish('coupon.redeemed', dto);
    return { success: true };
  }

  /**
   * Columns a seller may change on a coupon.
   *
   * `code`, `sellerId` and `usedCount` are deliberately absent: renaming a code
   * breaks links already in circulation, reassigning `seller_id` is how a coupon
   * would be stolen, and `usedCount` is the ledger that enforces the redemption
   * limit — writable, it makes the limit meaningless.
   */
  // Three of these read `name`, `isAutoApply` and `isFirstOrderOnly` until the
  // R2 review: no such property exists on `Coupon` (they are `title`,
  // `autoApply`, `firstOrderOnly`), so `pick` kept the unusable key, dropped the
  // real one, and the route answered `{ success: true }` having changed nothing.
  // A whitelist of property names has to be spelled the way the entity spells
  // them or it silently whitelists nothing.
  private static readonly COUPON_WRITABLE = [
    'title',
    'description',
    'discountType',
    'discountValue',
    'maxDiscount',
    'minOrderValue',
    'usageLimit',
    'usageLimitPerUser',
    'validFrom',
    'validUntil',
    'isActive',
    'autoApply',
    'firstOrderOnly',
    'applicableProductIds',
    'applicableCategoryIds',
    'applicablePaymentMethods',
    'bankName',
  ] as const;

  /** A coupon and the seller who owns it. Platform-wide coupons are admin-only. */
  private async couponOwner(id: string): Promise<Coupon> {
    const coupon = await this.couponRepo.findOne({ where: { id } });
    if (!coupon) throw new NotFoundException(`Coupon ${id} not found`);
    return coupon;
  }

  async updateCoupon(id: string, dto: any, actor?: Actor, scope?: string) {
    const coupon = await this.couponOwner(id);
    // `sellerId` is NULL for a platform-wide coupon, so assertOwns denies it to
    // every seller and allows it only to an admin. That is the correct reading:
    // a campaign that spans the marketplace is not one seller's to edit.
    await this.assertOwns(actor, coupon.sellerId, 'coupon');
    assertInMarket(coupon.regionCode, scope, 'coupon', this.logger);
    // And it may not be moved out of that market either. `regionCode` is not in
    // COUPON_WRITABLE, so the move cannot happen — this refuses the attempt
    // rather than silently dropping the field.
    if (dto?.regionCode) {
      assertInMarket(String(dto.regionCode), scope, 'coupon', this.logger);
    }

    const patch = MarketplaceFulfillmentService.pick(
      dto,
      MarketplaceFulfillmentService.COUPON_WRITABLE,
    );
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('No updatable coupon fields were supplied.');
    }
    await this.couponRepo.update(id, patch);
    await this.kafka.publish('coupon.updated', {
      id,
      ...patch,
      regionCode: coupon.regionCode ?? null,
    });
    return { success: true, id };
  }

  async deleteCoupon(id: string, actor?: Actor, scope?: string) {
    const coupon = await this.couponOwner(id);
    await this.assertOwns(actor, coupon.sellerId, 'coupon');
    assertInMarket(coupon.regionCode, scope, 'coupon', this.logger);

    await this.couponRepo.update(id, { isActive: false });
    return { success: true, id };
  }

  async getCouponUsageStats(couponId: string, actor?: Actor, scope?: string) {
    // Redemption rows carry `customerId`, so this is a read of who bought what
    // with whose discount — scoped to the coupon's owner.
    const coupon = await this.couponOwner(couponId);
    await this.assertOwns(actor, coupon.sellerId, 'coupon');
    // And to the coupon's market. `assertOwns` short-circuits for every ADMIN
    // role, so without the line below a QA-locked admin read an Indian
    // campaign's redemption history — customer ids and amounts (review I-4).
    assertInMarket(coupon.regionCode, scope, 'coupon', this.logger);

    const usages = await this.couponUsageRepo.find({
      where: { couponId },
      order: { redeemedAt: 'DESC' },
      take: 100,
    });
    const totalDiscount = usages.reduce((sum, u) => sum + Number(u.discountApplied), 0);
    return {
      couponId,
      totalRedemptions: usages.length,
      totalDiscount,
      recentUsages: usages.slice(0, 20),
    };
  }

  // ── Shipment tracking ───────────────────────────────────────────────────────

  /**
   * Record a shipment event.
   *
   * `actor` is required for seller callers because this method **mutates the
   * order's status** — a `DELIVERED` event marks the order delivered, and
   * commission is charged at delivery. Unscoped, any seller could post an event
   * against any `orderId` and settle an order belonging to someone else.
   *
   * Drivers and admins are exempt from the seller check: a courier is not the
   * seller of the goods they are carrying, and their authorisation to touch a
   * shipment comes from the delivery assignment, not from owning the listing.
   */
  async addTrackingEvent(dto: any, actor?: Actor) {
    const order = dto?.orderId
      ? await this.orderRepo.findOne({
          where: { id: dto.orderId },
          select: ['id', 'sellerId', 'regionCode'],
        })
      : null;
    if (dto?.orderId && !order) throw new NotFoundException(`Order ${dto.orderId} not found`);

    const role = String(actor?.role ?? '').toUpperCase();
    if (role !== 'DRIVER' && !MarketplaceFulfillmentService.isAdmin(actor)) {
      await this.assertOwns(actor, order?.sellerId, 'order');
    }
    // A tracking event has no market of its own; the order it reports on does.
    // An admin passed the ownership test above unconditionally, which is what
    // let a regional admin (or a driver) push a DELIVERED event — and so settle
    // commission — against another market's order.
    const { scope, ...event } = (dto ?? {}) as { scope?: string } & Record<string, unknown>;
    assertInMarket(order?.regionCode ?? null, scope, 'order', this.logger);

    const entity = this.trackingRepo.create(event);
    const saved = await this.trackingRepo.save(entity);
    // Update order's tracking info if it's a status-changing event
    if (['DELIVERED', 'OUT_FOR_DELIVERY', 'IN_TRANSIT', 'PICKED_UP'].includes(dto.status)) {
      const statusMap: Record<string, string> = {
        PICKED_UP: 'SHIPPED',
        IN_TRANSIT: 'SHIPPED',
        OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
        DELIVERED: 'DELIVERED',
      };
      if (statusMap[dto.status]) {
        await this.orderRepo.update(dto.orderId, { status: statusMap[dto.status] });
      }
    }
    await this.kafka.publish('tracking.event-added', { orderId: dto.orderId, status: dto.status });
    this.logger.log(`Tracking event: ${dto.orderId} → ${dto.status} at ${dto.location}`);
    return saved;
  }

  async getTrackingEvents(orderId: string) {
    const events = await this.trackingRepo.find({
      where: { orderId },
      order: { timestamp: 'ASC' },
    });
    const latest = events.length > 0 ? events[events.length - 1] : null;
    return {
      orderId,
      events,
      latestStatus: latest?.status,
      latestLocation: latest?.location,
      totalEvents: events.length,
    };
  }

  async getTrackingByTrackingId(trackingId: string) {
    const events = await this.trackingRepo.find({
      where: { trackingId },
      order: { timestamp: 'ASC' },
    });
    if (events.length === 0) throw new NotFoundException(`No events for tracking ID ${trackingId}`);
    return { trackingId, events, latestStatus: events[events.length - 1]?.status };
  }

  async ingestCourierWebhook(dto: {
    trackingId: string;
    status: string;
    location: string;
    timestamp: string;
    courierName: string;
    courierEventCode?: string;
  }) {
    // Find the order by tracking ID
    const order = await this.orderRepo.findOne({ where: { trackingId: dto.trackingId } });
    if (!order) {
      this.logger.warn(`Webhook: No order found for tracking ID ${dto.trackingId}`);
      return { accepted: false, reason: 'Unknown tracking ID' };
    }
    // A courier webhook is a system caller, not a seller — it is authorised by
    // the transport it arrives on, not by owning the listing.
    //
    // NOTE: that transport currently authenticates nothing. The HTTP route this
    // used to sit behind carried no guard and verified no signature, so anyone
    // who could reach it could mark orders delivered. It is unreachable now that
    // the HTTP surface is closed (see HttpSurfaceGuard); before re-exposing it,
    // verify the courier's webhook signature here.
    return this.addTrackingEvent(
      {
        orderId: order.id,
        trackingId: dto.trackingId,
        status: dto.status,
        location: dto.location,
        timestamp: new Date(dto.timestamp),
        courierName: dto.courierName,
        courierEventCode: dto.courierEventCode,
        source: 'WEBHOOK',
      },
      { role: 'SUPER_ADMIN' },
    );
  }

  // ── Product variants ────────────────────────────────────────────────────────

  /**
   * Columns a seller may set on a variant.
   *
   * `updateVariant` passed the request body straight to `repo.update()`, so the
   * caller chose the column list: `productId` and `seller_id` were writable,
   * which let a variant be reparented onto someone else's product — or away from
   * its owner, defeating the ownership check on every subsequent request.
   */
  private static readonly VARIANT_WRITABLE = [
    'sku',
    'barcode',
    'attributes',
    'variantName',
    'mrp',
    'sellingPrice',
    'costPrice',
    'stockQuantity',
    'lowStockThreshold',
    'weightKg',
    'dimensions',
    'imageUrls',
    'isActive',
    'sortOrder',
  ] as const;

  private static pick<T extends readonly string[]>(dto: any, allowed: T): Record<string, any> {
    const out: Record<string, any> = {};
    for (const key of allowed) {
      if (dto && dto[key] !== undefined) out[key] = dto[key];
    }
    return out;
  }

  async createVariant(productId: string, dto: any, actor?: Actor, scope?: string) {
    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) throw new NotFoundException(`Product ${productId} not found`);
    await this.assertOwns(actor, product.seller_id, 'product');
    // `assertOwns` short-circuits for every ADMIN role, so it answers "may this
    // caller act on this seller's rows?" and never "is this seller in this
    // caller's market?". Without the line below a QA-locked admin created,
    // repriced, deleted and zeroed the stock of Indian listings (audit V4).
    assertInMarket(await this.sellerMarket(product.seller_id), scope, 'variant', this.logger);

    const entity = this.variantRepo.create({
      ...MarketplaceFulfillmentService.pick(dto, MarketplaceFulfillmentService.VARIANT_WRITABLE),
      productId,
      // Stamped from the product, never from the payload — this is the column
      // every later ownership check reads.
      sellerId: product.seller_id,
    } as any) as unknown as ProductVariant;
    const saved = await this.variantRepo.save(entity);
    await this.kafka.publish('variant.created', { productId, variantId: saved.id });
    return saved;
  }

  async getVariants(productId: string) {
    const variants = await this.variantRepo.find({
      where: { productId, isActive: true },
      order: { sortOrder: 'ASC' },
    });
    return { productId, variants, total: variants.length };
  }

  async getVariantById(id: string) {
    const variant = await this.variantRepo.findOne({ where: { id }, relations: { product: true } });
    if (!variant) throw new NotFoundException(`Variant ${id} not found`);
    return variant;
  }

  async updateVariant(id: string, dto: any, actor?: Actor, scope?: string) {
    const { sellerId } = await this.variantSellerId(id);
    await this.assertOwns(actor, sellerId, 'variant');
    assertInMarket(await this.sellerMarket(sellerId), scope, 'variant', this.logger);

    const patch = MarketplaceFulfillmentService.pick(
      dto,
      MarketplaceFulfillmentService.VARIANT_WRITABLE,
    );
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('No updatable variant fields were supplied.');
    }
    await this.variantRepo.update(id, patch);
    await this.kafka.publish('variant.updated', { id, ...patch });
    return { success: true, id };
  }

  async deleteVariant(id: string, actor?: Actor, scope?: string) {
    const { sellerId } = await this.variantSellerId(id);
    await this.assertOwns(actor, sellerId, 'variant');
    assertInMarket(await this.sellerMarket(sellerId), scope, 'variant', this.logger);

    await this.variantRepo.update(id, { isActive: false });
    return { success: true, id };
  }

  async updateVariantStock(
    id: string,
    dto: { quantity: number; operation: 'SET' | 'INCREMENT' | 'DECREMENT' },
    actor?: Actor,
    scope?: string,
  ) {
    const { sellerId } = await this.variantSellerId(id);
    await this.assertOwns(actor, sellerId, 'variant');
    assertInMarket(await this.sellerMarket(sellerId), scope, 'variant', this.logger);

    // Row-lock the variant so concurrent decrements can't oversell.
    const { newQty, sku, lowStockThreshold } = await this.dataSource.transaction(async (mgr) => {
      const repo = mgr.getRepository(ProductVariant);
      const variant = await repo.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!variant) throw new NotFoundException(`Variant ${id} not found`);
      let q = variant.stockQuantity;
      if (dto.operation === 'SET') q = dto.quantity;
      else if (dto.operation === 'INCREMENT') q += dto.quantity;
      else if (dto.operation === 'DECREMENT') {
        if (variant.stockQuantity < dto.quantity) {
          throw new BadRequestException(
            `Insufficient stock: have ${variant.stockQuantity}, requested ${dto.quantity}`,
          );
        }
        q = variant.stockQuantity - dto.quantity;
      }
      await repo.update(id, { stockQuantity: q });
      return { newQty: q, sku: variant.sku, lowStockThreshold: variant.lowStockThreshold };
    });
    if (newQty <= lowStockThreshold) {
      await this.kafka.publish('variant.low-stock', { id, sku, stockQuantity: newQty });
    }
    return { success: true, id, stockQuantity: newQty };
  }

  /** A seller's own low-stock variants. The id comes from the URL, so it is checked. */
  async getLowStockVariants(sellerId: string, actor?: Actor, scope?: string) {
    await this.assertOwns(actor, sellerId, 'seller account');
    // `assertOwns` returns immediately for an admin, which is what left this
    // read open across markets: a regional admin saw any seller's stock levels.
    assertInMarket(await this.sellerMarket(sellerId), scope, 'seller account', this.logger);

    const variants = await this.variantRepo
      .createQueryBuilder('v')
      .where('v.seller_id = :sellerId', { sellerId })
      .andWhere('v."isActive" = true')
      .andWhere('v."stockQuantity" <= v."lowStockThreshold"')
      .orderBy('v."stockQuantity"', 'ASC')
      .getMany();
    return { data: variants, total: variants.length };
  }

  // ── Product reports ─────────────────────────────────────────────────────────
  //
  // The storefront's "Report Counterfeit Product" control had no endpoint behind
  // it. These three methods are the whole feature: a shopper files, an admin
  // lists, an admin resolves. Nothing here unpublishes a listing — that is an
  // existing moderation action with its own audit trail, and wiring a shopper's
  // report straight through to a takedown would let one reporter delist a rival.

  private static readonly REPORT_REASONS: readonly ProductReportReason[] = [
    'COUNTERFEIT',
    'PROHIBITED',
    'MISLEADING',
    'OFFENSIVE',
    'PRICING',
    'OTHER',
  ];

  private static readonly REPORT_STATUSES: readonly ProductReportStatus[] = [
    'PENDING',
    'REVIEWING',
    'ACTIONED',
    'DISMISSED',
  ];

  /**
   * File a report against a listing.
   *
   * `reporterId` comes from the verified token, never the body — otherwise a
   * caller could file on someone else's behalf and defeat the one-per-shopper
   * constraint by inventing reporter ids.
   *
   * Re-reporting the same product updates the existing row rather than failing:
   * a shopper who reports a listing, then notices something worse about it,
   * should be able to say so. The unique index makes that an update, not a
   * duplicate queue entry.
   */
  async reportProduct(dto: {
    productId?: string;
    reporterId?: string;
    reason?: string;
    details?: string;
  }) {
    const productId = requireId(dto?.productId, 'product');
    const reporterId = requireId(dto?.reporterId, 'reporter');

    const reason = String(dto?.reason ?? 'OTHER').toUpperCase() as ProductReportReason;
    if (!MarketplaceFulfillmentService.REPORT_REASONS.includes(reason)) {
      throw new BadRequestException(
        `\`reason\` must be one of: ${MarketplaceFulfillmentService.REPORT_REASONS.join(', ')}.`,
      );
    }

    const product = await this.productRepo.findOne({ where: { id: productId }, select: ['id'] });
    if (!product) throw new NotFoundException(`Product ${productId} not found`);

    const details = typeof dto?.details === 'string' ? dto.details.trim().slice(0, 2000) : null;

    const existing = await this.reportRepo.findOne({ where: { productId, reporterId } });
    if (existing) {
      await this.reportRepo.update(existing.id, {
        reason,
        details,
        // Back to the front of the queue: the shopper has added information an
        // admin has not seen, even if the report was previously dismissed.
        status: 'PENDING',
        resolutionNote: null,
        reviewedBy: null,
        reviewedAt: null,
      });
      this.logger.log(`Product report updated: ${productId} by ${reporterId} (${reason})`);
      return { success: true, id: existing.id, updated: true };
    }

    const saved = await this.reportRepo.save(
      this.reportRepo.create({ productId, reporterId, reason, details, status: 'PENDING' }),
    );
    await this.kafka.publish('marketplace.product.reported', {
      productId,
      reportId: saved.id,
      reason,
    });
    this.logger.log(`Product report filed: ${productId} by ${reporterId} (${reason})`);
    return { success: true, id: saved.id, updated: false };
  }

  /**
   * The moderation queue. Pending first, then oldest first within a status.
   *
   * `region` is the market the gateway resolved for the caller. A report has no
   * market column: it is attributed through the reported listing to the seller
   * who owns it, the same join every admin product list uses. The join is LEFT
   * and the predicate excludes a null market, so a report on a listing with no
   * attributable seller is invisible to a regional admin and still visible to a
   * global one — unattributable, therefore not a regional admin's.
   */
  async listProductReports(
    query: {
      status?: string;
      productId?: string;
      region?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));

    const qb = this.reportRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.product', 'product')
      .leftJoin(Seller, 's', 's.id = product.seller_id');

    if (query.status) {
      const status = String(query.status).toUpperCase() as ProductReportStatus;
      if (!MarketplaceFulfillmentService.REPORT_STATUSES.includes(status)) {
        throw new BadRequestException(
          `\`status\` must be one of: ${MarketplaceFulfillmentService.REPORT_STATUSES.join(', ')}.`,
        );
      }
      qb.andWhere('r.status = :status', { status });
    }
    if (query.productId) qb.andWhere('r.productId = :productId', { productId: query.productId });
    applyMarketFilter(qb, 's.region_code', normaliseMarket(query.region));

    const [data, total] = await qb
      .orderBy('r.createdAt', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { data, total, page, limit };
  }

  /**
   * Resolve a report.
   *
   * `ACTIONED` means an admin took a moderation action as a result; it does not
   * itself take one, so the two records stay independently auditable.
   */
  async resolveProductReport(
    id: string,
    dto: { status?: string; resolutionNote?: string; scope?: string },
    adminId?: string,
  ) {
    const reportId = requireId(id, 'report');
    const status = String(dto?.status ?? '').toUpperCase() as ProductReportStatus;
    if (!MarketplaceFulfillmentService.REPORT_STATUSES.includes(status)) {
      throw new BadRequestException(
        `\`status\` must be one of: ${MarketplaceFulfillmentService.REPORT_STATUSES.join(', ')}.`,
      );
    }
    if (!adminId) {
      throw new BadRequestException('An admin id is required to resolve a report.');
    }

    const report = await this.reportRepo.findOne({ where: { id: reportId } });
    if (!report) throw new NotFoundException(`Report ${reportId} not found`);
    // Attributed through the listing to its seller, exactly as the queue read
    // above is. Nothing here read the caller's market, so a regional admin
    // could dismiss any market's report.
    assertInMarket(await this.reportMarket(report.productId), dto?.scope, 'report', this.logger);

    const settled = status === 'ACTIONED' || status === 'DISMISSED';
    await this.reportRepo.update(reportId, {
      status,
      resolutionNote:
        typeof dto?.resolutionNote === 'string' ? dto.resolutionNote.trim().slice(0, 2000) : null,
      reviewedBy: adminId,
      // Only a terminal decision stamps a review time; moving to REVIEWING is
      // picking the report up, not finishing with it.
      reviewedAt: settled ? new Date() : null,
    });
    this.logger.log(`Report ${reportId} -> ${status} by ${adminId}`);
    return { success: true, id: reportId, status };
  }

  // ── Price-drop alerts ───────────────────────────────────────────────────────
  //
  // The wishlist's "Notify for all price drops" control had no endpoint behind
  // it. These methods are the feature: a shopper subscribes, sees their
  // subscriptions, unsubscribes, and a sweep fires when a price actually falls.

  /** Live listings only — an alert must price against what a shopper could buy. */
  private static readonly LIVE_LISTING = { isActive: true, approvalStatus: 'APPROVED' } as const;

  /**
   * The payable price for a product: its buy-box listing.
   *
   * Not `products.mrp`. That is the list price and never moves, so an alert
   * comparing against it could never fire. Buy-box-winner first, then cheapest,
   * which is the same ordering the catalogue and checkout use.
   */
  private async payablePrice(productId: string): Promise<number | null> {
    const listing = await this.listingRepo.findOne({
      where: { product: { id: productId }, ...MarketplaceFulfillmentService.LIVE_LISTING } as any,
      order: { isBuyBoxWinner: 'DESC', sellingPrice: 'ASC' },
    });
    const price = Number(listing?.sellingPrice ?? 0);
    return price > 0 ? price : null;
  }

  /**
   * Watch a product for a price drop.
   *
   * Records the price at the moment of asking, because that is the only thing
   * "cheaper" can be measured against later. Re-subscribing re-arms the alert
   * against the current price rather than failing — a shopper who was notified
   * and did not buy should be able to keep waiting.
   */
  async createPriceAlert(dto: { customerId?: string; productId?: string; targetPrice?: number }) {
    const customerId = requireId(dto?.customerId, 'customer');
    const productId = requireId(dto?.productId, 'product');

    const product = await this.productRepo.findOne({
      where: { id: productId },
      select: ['id', 'is_active'],
    });
    if (!product) throw new NotFoundException(`Product ${productId} not found`);

    const price = await this.payablePrice(productId);
    if (price === null) {
      // No live listing means no price to watch. Storing the alert anyway would
      // create a row that can never fire.
      throw new BadRequestException(
        'This product has no live listing to watch for a price change.',
      );
    }

    const target =
      dto?.targetPrice === undefined || dto.targetPrice === null ? null : Number(dto.targetPrice);
    if (target !== null && (!Number.isFinite(target) || target <= 0)) {
      throw new BadRequestException('`targetPrice` must be a positive amount.');
    }
    if (target !== null && target >= price) {
      throw new BadRequestException(
        `The product already costs ${price}, which is at or below your target of ${target}.`,
      );
    }

    const existing = await this.priceAlertRepo.findOne({ where: { customerId, productId } });
    if (existing) {
      await this.priceAlertRepo.update(existing.id, {
        priceWhenSet: price,
        targetPrice: target,
        isActive: true,
        notifiedAt: null,
        notifiedPrice: null,
      });
      return { success: true, id: existing.id, watchingFrom: price, rearmed: true };
    }

    const saved = await this.priceAlertRepo.save(
      this.priceAlertRepo.create({
        customerId,
        productId,
        priceWhenSet: price,
        targetPrice: target,
        isActive: true,
      }),
    );
    this.logger.log(`Price alert set: ${productId} for ${customerId} at ${price}`);
    return { success: true, id: saved.id, watchingFrom: price, rearmed: false };
  }

  /** A customer's own alerts, newest first. */
  async listPriceAlerts(customerId?: string) {
    const id = requireId(customerId, 'customer');
    const data = await this.priceAlertRepo.find({
      where: { customerId: id },
      relations: ['product'],
      order: { createdAt: 'DESC' },
    });
    return { data, total: data.length };
  }

  /** Stop watching. Scoped to the owner so one shopper cannot delete another's. */
  async deletePriceAlert(id: string, customerId?: string) {
    const alertId = requireId(id, 'alert');
    const owner = requireId(customerId, 'customer');
    const alert = await this.priceAlertRepo.findOne({ where: { id: alertId } });
    if (!alert) throw new NotFoundException(`Price alert ${alertId} not found`);
    if (String(alert.customerId) !== String(owner)) {
      throw new ForbiddenException('You do not have access to this price alert.');
    }
    await this.priceAlertRepo.delete(alertId);
    return { success: true, id: alertId };
  }

  /**
   * Fire the alerts a price change has satisfied.
   *
   * Called with a product id when that product's price changes, or with none to
   * sweep everything (a scheduled catch-up). Returns what it notified so a
   * caller can log or test it.
   *
   * Deactivates each alert it fires. Leaving them active would re-notify on
   * every subsequent sweep while the price stayed low, which is how a useful
   * alert becomes the reason someone disables notifications.
   */
  async sweepPriceAlerts(productId?: string) {
    const where: Record<string, unknown> = { isActive: true };
    if (productId) where.productId = productId;
    const alerts = await this.priceAlertRepo.find({ where, relations: ['product'] });
    if (alerts.length === 0) return { checked: 0, notified: 0, alerts: [] as string[] };

    // One price lookup per product, not per alert.
    const prices = new Map<string, number | null>();
    for (const id of new Set(alerts.map((a) => a.productId))) {
      prices.set(id, await this.payablePrice(id));
    }

    const fired: string[] = [];
    for (const alert of alerts) {
      const now = prices.get(alert.productId);
      if (now === null || now === undefined) continue;

      const reference = Number(alert.priceWhenSet);
      const target = alert.targetPrice === null ? null : Number(alert.targetPrice);
      // With a target, only that figure counts. Without one, any real decrease.
      const hit = target !== null ? now <= target : now < reference;
      if (!hit) continue;

      await this.priceAlertRepo.update(alert.id, {
        isActive: false,
        notifiedAt: new Date(),
        notifiedPrice: now,
      });
      await this.kafka.publish('marketplace.price.dropped', {
        alertId: alert.id,
        customerId: alert.customerId,
        productId: alert.productId,
        productName: (alert as any).product?.name ?? null,
        previousPrice: reference,
        newPrice: now,
        targetPrice: target,
      });
      fired.push(alert.id);
    }

    if (fired.length)
      this.logger.log(`Price alerts fired: ${fired.length} of ${alerts.length} checked`);
    return { checked: alerts.length, notified: fired.length, alerts: fired };
  }

  // ── Product Q&A ─────────────────────────────────────────────────────────────
  async createQuestion(dto: {
    productId: string;
    customerId: string;
    customerName?: string;
    questionText: string;
  }) {
    const product = await this.productRepo.findOne({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException(`Product ${dto.productId} not found`);
    const entity = this.questionRepo.create(dto);
    const saved = await this.questionRepo.save(entity);
    await this.kafka.publish('qa.question-created', {
      productId: dto.productId,
      questionId: saved.id,
    });
    return saved;
  }

  async getQuestions(productId: string, page = 1, limit = 20) {
    const [data, total] = await this.questionRepo.findAndCount({
      where: { productId, status: 'PUBLISHED' },
      order: { upvoteCount: 'DESC', createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    // Attach answer count for each question
    const questionsWithAnswers = await Promise.all(
      data.map(async (q) => {
        const answerCount = await this.answerRepo.count({
          where: { questionId: q.id, status: 'PUBLISHED' },
        });
        return { ...q, answerCount };
      }),
    );
    return { data: questionsWithAnswers, total, page, limit };
  }

  async createAnswer(
    questionId: string,
    dto: { authorId: string; authorName?: string; authorRole?: string; answerText: string },
  ) {
    const question = await this.questionRepo.findOne({ where: { id: questionId } });
    if (!question) throw new NotFoundException(`Question ${questionId} not found`);
    const entity = this.answerRepo.create({ ...dto, questionId });
    const saved = await this.answerRepo.save(entity);
    await this.kafka.publish('qa.answer-created', { questionId, answerId: saved.id });
    return saved;
  }

  async getAnswers(questionId: string) {
    const answers = await this.answerRepo.find({
      where: { questionId, status: 'PUBLISHED' },
      order: { isAccepted: 'DESC', helpfulCount: 'DESC', createdAt: 'ASC' },
    });
    return { questionId, answers, total: answers.length };
  }

  async upvoteQuestion(id: string) {
    await this.questionRepo.increment({ id }, 'upvoteCount', 1);
    return { success: true, id };
  }

  async voteAnswerHelpful(id: string) {
    await this.answerRepo.increment({ id }, 'helpfulCount', 1);
    return { success: true, id };
  }

  async acceptAnswer(answerId: string) {
    const answer = await this.answerRepo.findOne({ where: { id: answerId } });
    if (!answer) throw new NotFoundException(`Answer ${answerId} not found`);
    // Un-accept any previously accepted answer for this question
    await this.answerRepo.update(
      { questionId: answer.questionId, isAccepted: true },
      { isAccepted: false },
    );
    await this.answerRepo.update(answerId, { isAccepted: true });
    return { success: true, answerId };
  }

  // ── Delivery assignments ────────────────────────────────────────────────────
  //
  // `delivery_assignments.region_code` has been on the table since it was
  // created and nothing ever read or wrote it (audit V12). Every method below
  // now does one of the two: the create stamps it from the order being
  // assigned, and each read and write asserts it against the caller's market.
  // The market is taken from the order rather than the request body on purpose
  // — a market the caller supplied is a market the caller chose.

  async createDeliveryAssignment(dto: any) {
    const {
      scope,
      regionCode: _ignored,
      region_code: _ignoredToo,
      ...fields
    } = (dto ?? {}) as {
      scope?: string;
      regionCode?: string;
      region_code?: string;
    } & Record<string, unknown>;

    const order = await this.orderRepo.findOne({
      where: { id: requireId(fields.orderId as string | undefined, 'order') },
      select: ['id', 'regionCode'],
    });
    if (!order) throw new NotFoundException(`Order ${fields.orderId} not found`);
    assertInMarket(order.regionCode, scope, 'order', this.logger);

    // Generate a secure 4-digit OTP for delivery verification
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const entity = this.deliveryAssignmentRepo.create({
      ...fields,
      regionCode: order.regionCode,
      deliveryOtp: otp,
      status: 'PENDING',
      offeredAt: new Date(),
    } as any) as unknown as DeliveryAssignment;
    const saved = await this.deliveryAssignmentRepo.save(entity);

    // Notify downstream services: delivery partner assignment
    await this.kafka.publish('delivery.assigned', {
      id: saved.id,
      orderId: dto.orderId,
      partnerId: dto.partnerId,
    });

    // Notify the customer of their delivery OTP (SMS/push notification)
    // This event is consumed by the notification-service to send the OTP to the customer
    await this.kafka.publish('delivery.otp.generated', {
      orderId: dto.orderId,
      assignmentId: saved.id,
      customerId: dto.customerId,
      otp, // The 4-digit code the customer must share with the delivery partner
      partnerName: dto.partnerName,
      partnerPhone: dto.partnerPhone,
    });

    // Also cache the OTP in Redis for fast lookup (24h TTL)
    await this.redis.setJson(
      `delivery:otp:${saved.id}`,
      { otp, createdAt: new Date().toISOString() },
      86400,
    );

    this.logger.log(
      `Delivery assigned: ${saved.id} → partner ${dto.partnerId}, OTP notification queued`,
    );

    // `saved` is the in-memory entity, so it still carries the OTP that was just
    // generated — `select: false` only governs what a *read* returns. The code
    // goes to the customer over their own channel; it does not go back to
    // whoever created the assignment.
    const { deliveryOtp: _withheld, ...assignment } = saved as any;
    return assignment;
  }

  async getDeliveryAssignments(filters: {
    partnerId?: string;
    orderId?: string;
    status?: string;
    region?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const where: any = {};
    if (filters.partnerId) where.partnerId = filters.partnerId;
    if (filters.orderId) where.orderId = filters.orderId;
    if (filters.status) where.status = filters.status;
    // `requireMarket`: the gateway sends the caller's resolved market in
    // `region`, which for a region-locked admin IS their lock, and
    // `normaliseMarket` alone dropped the predicate for one it could not read —
    // every market's delivery assignments, to an admin confined to one (R2-1).
    //
    // market-boundary-exempt: predicated through a `findAndCount` `where`
    // OBJECT rather than a query builder, so the uniqueness spec's
    // bare-equality test cannot see this line. Its companion test for `where`
    // object assignments does, and requires exactly the `requireMarket` call
    // above — a builder here would mean rewriting a working paginated read to
    // satisfy a grep.
    const market = requireMarket(filters.region, 'delivery assignments', this.logger);
    if (market) where.regionCode = market;
    const [data, total] = await this.deliveryAssignmentRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  async getDeliveryAssignmentById(id: string, scope?: string) {
    const assignment = await this.deliveryAssignmentRepo.findOne({
      where: { id: requireId(id, 'delivery assignment') },
      relations: { order: true },
    });
    if (!assignment) throw new NotFoundException(`Delivery assignment ${id} not found`);
    // The row carries the courier's name and phone and, through the order
    // relation, the customer's address.
    assertInMarket(assignment.regionCode, scope, 'delivery assignment', this.logger);
    return assignment;
  }

  async updateDeliveryStatus(
    id: string,
    dto: {
      status: string;
      deliveryMode?: string;
      deliveryNotes?: string;
      proofPhotos?: string[];
      deliveryCoordinates?: any;
      failureReason?: string;
      scope?: string;
    },
  ) {
    const assignment = await this.deliveryAssignmentRepo.findOne({
      where: { id: requireId(id, 'delivery assignment') },
    });
    if (!assignment) throw new NotFoundException(`Delivery assignment ${id} not found`);
    assertInMarket(assignment.regionCode, dto?.scope, 'delivery assignment', this.logger);
    const update: any = { status: dto.status };
    if (dto.status === 'ACCEPTED') update.acceptedAt = new Date();
    if (dto.status === 'PICKED_UP') update.pickedUpAt = new Date();
    if (dto.status === 'DELIVERED') {
      update.deliveredAt = new Date();
      update.deliveryMode = dto.deliveryMode;
      update.deliveryNotes = dto.deliveryNotes;
      update.proofPhotos = dto.proofPhotos;
      update.deliveryCoordinates = dto.deliveryCoordinates;
    }
    if (dto.status === 'FAILED' || dto.status === 'RETURNED')
      update.failureReason = dto.failureReason;
    await this.deliveryAssignmentRepo.update(id, update);
    // `scope` authorised this call; it is not part of what happened. Stripped
    // rather than spread, as `addTrackingEvent` does — an event that carries
    // the caller's market invites a consumer to read authorisation off the bus.
    const { scope: _authorisedBy, ...event } = dto;
    await this.kafka.publish('delivery.status-updated', { id, ...event });
    this.logger.log(`Delivery ${id} status → ${dto.status}`);
    return { success: true, id, status: dto.status };
  }

  async verifyDeliveryOtp(id: string, otp: string, scope?: string) {
    // `deliveryOtp` is `select: false`, so it has to be asked for explicitly.
    // This is the only place that should ever do so — the code is compared here
    // and never returned.
    const assignment = await this.deliveryAssignmentRepo
      .createQueryBuilder('a')
      .addSelect('a.deliveryOtp')
      .leftJoinAndSelect('a.order', 'order')
      .where('a.id = :id', { id: requireId(id, 'delivery assignment') })
      .getOne();
    if (!assignment) throw new NotFoundException(`Delivery assignment ${id} not found`);
    // Before the attempt counter moves: a refused caller must not be able to
    // burn another market's delivery out of its five OTP attempts.
    assertInMarket(assignment.regionCode, scope, 'delivery assignment', this.logger);

    // Guard: already verified
    if (assignment.otpVerified) {
      return { verified: true, message: 'OTP already verified' };
    }

    // Rate limit: track attempts in Redis (max 5)
    const attemptKey = `delivery:otp-attempts:${id}`;
    const attempts = Number(await this.redis.get(attemptKey)) || 0;
    if (attempts >= 5) {
      this.logger.warn(`Delivery ${id}: OTP max attempts exceeded`);
      return {
        verified: false,
        reason: 'Maximum verification attempts exceeded. Contact support.',
      };
    }

    if (assignment.deliveryOtp !== otp) {
      await this.redis.set(attemptKey, String(attempts + 1), 3600); // 1-hour TTL for attempt counter
      this.logger.warn(`Delivery ${id}: Invalid OTP attempt ${attempts + 1}/5`);
      return { verified: false, reason: 'Invalid OTP', attemptsRemaining: 4 - attempts };
    }

    // OTP matches — mark as verified
    await this.deliveryAssignmentRepo.update(id, { otpVerified: true });
    await this.redis.del(attemptKey); // Clean up attempt counter
    await this.redis.del(`delivery:otp:${id}`); // Clean up cached OTP

    // Publish verification event (consumed by notification-service, order-service)
    await this.kafka.publish('delivery.otp.verified', {
      assignmentId: id,
      orderId: assignment.orderId,
      partnerId: assignment.partnerId,
    });

    this.logger.log(`Delivery ${id}: OTP verified successfully`);
    return { verified: true };
  }

  async submitDeliveryProof(
    id: string,
    dto: { proofPhotos: string[]; deliveryMode: string; deliveryNotes?: string; coordinates?: any },
  ) {
    await this.deliveryAssignmentRepo.update(id, {
      proofPhotos: dto.proofPhotos,
      deliveryMode: dto.deliveryMode as any,
      deliveryNotes: dto.deliveryNotes,
      deliveryCoordinates: dto.coordinates,
    });
    await this.kafka.publish('delivery.proof-submitted', {
      id,
      photoCount: dto.proofPhotos.length,
    });
    return { success: true, id };
  }

  async getPartnerActiveDelivery(partnerId: string) {
    const active = await this.deliveryAssignmentRepo.findOne({
      where: { partnerId, status: In(['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT']) },
      relations: { order: true },
    });
    return active || null;
  }
}
