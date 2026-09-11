import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { RedisService } from '@app/redis';
import { KafkaProducerService, KAFKA_TOPICS } from '@app/kafka';
import { Order } from './entities/order.entity';
import { getRegionConfig } from '@app/region';

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PREPARING = 'PREPARING',
  READY = 'READY',
  PICKED_UP = 'PICKED_UP',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REFUND_REQUESTED = 'REFUND_REQUESTED',
  REFUNDED = 'REFUNDED',
}

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    private readonly redis: RedisService,
    private readonly kafka: KafkaProducerService,
  ) {}

  /** Redis is a read cache in front of the table, never the system of record. */
  private cacheKey(orderNumber: string) {
    return `order:${orderNumber}`;
  }

  async healthCheck() {
    return { service: 'order-service', status: 'ok', timestamp: new Date().toISOString() };
  }

  /**
   * Record an order.
   *
   * `subtotal` and `discount` are supplied by the caller and are expected to be
   * **already resolved server-side** — the API gateway prices every line from the
   * buy-box listing (`PRICE_ORDER_ITEMS`) and validates the coupon
   * (`VALIDATE_COUPON`) before calling this. Two rules used to live here and were
   * both unsafe:
   *
   *   `subtotal = items.reduce((s,i) => s + i.price * i.quantity, 0)`
   *       — priced the order from the request body, so a caller could name its
   *         own price. The web client sends no `price`, which made this `NaN`.
   *   `discount = couponCode ? subtotal * 0.1 : 0`
   *       — gave 10% off for any non-empty string, with no lookup, no expiry
   *         check and no per-user limit.
   *
   * The line-sum is still recomputed here and used when it disagrees with the
   * caller's `subtotal`, so this cannot be turned into a discount vector by a
   * caller that under-reports the total.
   */
  async placeOrder(payload: {
    customerId: string;
    items: Array<{ productId: string; quantity: number; price: number; variantId?: string }>;
    deliveryAddress: string;
    serviceType: 'marketplace' | 'grocery' | 'restaurant' | 'pharmacy';
    paymentMethod: string;
    subtotal?: number;
    discount?: number;
    couponId?: string | null;
    couponCode?: string;
    walletAmount?: number;
    notes?: string;
    /** Market the order is placed in — selects the delivery rule (and its currency). */
    regionCode?: string;
  }) {
    const orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const lineSum = payload.items.reduce(
      (sum, i) => sum + (Number(i?.price) || 0) * (Number(i?.quantity) || 0),
      0,
    );
    const claimed = Number(payload.subtotal);
    // Trust whichever is higher: an upstream that under-states the subtotal must
    // not be able to shrink the bill.
    const subtotal =
      Math.round(Math.max(Number.isFinite(claimed) ? claimed : 0, lineSum) * 100) / 100;

    // Dynamic delivery fee based on admin-defined zone rates
    // Zone rates: Metro=40, Tier-1=49, Tier-2=69, Rest=79, default=50
    const deliveryFee = await this.estimateDeliveryFee(
      payload.serviceType,
      subtotal,
      payload.regionCode,
    );
    // Never more than the basket, never negative — a bad discount cannot produce
    // a credit.
    const discount = Math.min(Math.max(Number(payload.discount) || 0, 0), subtotal);
    const walletDeduction = Math.min(Math.max(payload.walletAmount ?? 0, 0), subtotal - discount);
    const totalAmount =
      Math.round((subtotal + deliveryFee - discount - walletDeduction) * 100) / 100;

    // The market and currency this order is denominated in, kept on the row.
    const market =
      String(payload.regionCode ?? '')
        .trim()
        .toUpperCase() || null;
    const currency = market ? (getRegionConfig(market)?.currencyCode ?? null) : null;

    // Written to Postgres first — this row is the record of a payment taken, and
    // it must exist before the event that tells the rest of the platform so.
    // Orders used to live only in `redis.setJson(..., 86400)`, so every order
    // silently disappeared after 24 hours and none survived a cache flush.
    const saved = await this.orderRepo.save(
      this.orderRepo.create({
        orderNumber: orderId,
        customerId: payload.customerId,
        sellerId: (payload.items?.[0] as any)?.sellerId ?? undefined,
        items: payload.items,
        subtotal,
        deliveryFee,
        discount,
        couponCode: payload.couponCode ?? null,
        couponId: payload.couponId ?? null,
        regionCode: market,
        currency,
        walletDeduction,
        totalAmount,
        deliveryAddress: payload.deliveryAddress,
        serviceType: payload.serviceType,
        paymentMethod: payload.paymentMethod,
        status: OrderStatus.PENDING as any,
        notes: payload.notes,
        estimatedDeliveryAt: new Date(Date.now() + 35 * 60 * 1000),
      }),
    );

    const order = this.toWire(saved);

    // Cache for fast retrieval; the row above is what makes it durable.
    await this.redis.setJson(this.cacheKey(orderId), order, 86400);

    // Publish domain event
    await this.kafka.publish(KAFKA_TOPICS.ORDER_CREATED, {
      id: orderId,
      customerId: payload.customerId,
      serviceType: payload.serviceType,
      totalAmount,
      itemCount: payload.items.length,
    });

    this.logger.log(
      `Order placed: ${orderId} | Total: ${totalAmount} | Customer: ${payload.customerId}`,
    );
    return { success: true, order };
  }

  /**
   * The shape every caller expects: `id` is the customer-facing order number,
   * with the database key alongside it. Decimal columns come back from pg as
   * strings, so they are coerced here rather than at each call site.
   */
  private toWire(row: Order) {
    return {
      id: row.orderNumber,
      orderNumber: row.orderNumber,
      orderId: row.id,
      customerId: row.customerId,
      sellerId: row.sellerId ?? null,
      items: row.items ?? [],
      subtotal: Number(row.subtotal) || 0,
      deliveryFee: Number(row.deliveryFee) || 0,
      discount: Number(row.discount) || 0,
      walletDeduction: Number(row.walletDeduction) || 0,
      totalAmount: Number(row.totalAmount) || 0,
      couponCode: row.couponCode ?? null,
      couponId: row.couponId ?? null,
      regionCode: row.regionCode ?? null,
      currency: row.currency ?? null,
      deliveryAddress: row.deliveryAddress,
      serviceType: row.serviceType,
      paymentMethod: row.paymentMethod,
      status: row.status,
      escrowStatus: row.escrowStatus,
      notes: row.notes ?? null,
      placedAt: row.placedAt instanceof Date ? row.placedAt.toISOString() : row.placedAt,
      estimatedDeliveryAt:
        row.estimatedDeliveryAt instanceof Date
          ? row.estimatedDeliveryAt.toISOString()
          : row.estimatedDeliveryAt,
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
    };
  }

  /**
   * Look an order up by its customer-facing number, falling back to the table.
   *
   * The DB read is what makes an order outlive its cache entry — this used to be
   * a cache lookup and a `TODO: fallback to DB`, so a 24h-old order 404'd.
   */
  async getOrderById(orderId: string) {
    const cached = await this.redis.getJson<any>(this.cacheKey(orderId));
    if (cached) return cached;

    const row = await this.orderRepo.findOne({ where: { orderNumber: orderId } });
    if (!row) throw new NotFoundException(`Order ${orderId} not found`);

    const order = this.toWire(row);
    // Re-warm so the next read stays on the fast path.
    await this.redis
      .setJson(this.cacheKey(orderId), order, 86400)
      .catch((): undefined => undefined);
    return order;
  }

  /**
   * Fetch an order enforcing object-level ownership (IDOR protection).
   * The caller (API Gateway) passes the authenticated requester derived from the JWT.
   * A non-privileged user may only read their own order; ADMIN/SUPER_ADMIN/STAFF bypass.
   * When no requester is supplied (legacy internal string calls), no check is applied.
   */
  async getOrderByIdForRequester(orderId: string, requester?: { userId?: string; role?: string }) {
    const order = await this.getOrderById(orderId);
    if (requester?.userId) {
      const role = (requester.role || '').toLowerCase();
      const privileged = role === 'admin' || role === 'super_admin' || role === 'staff';
      if (!privileged && order?.customerId && order.customerId !== requester.userId) {
        this.logger.warn(
          `IDOR blocked: user ${requester.userId} attempted to access order ${orderId} owned by ${order.customerId}`,
        );
        throw new ForbiddenException('You do not have permission to access this order.');
      }
    }
    return order;
  }

  async updateOrderStatus(orderId: string, status: OrderStatus, updatedBy: string) {
    const order = await this.getOrderById(orderId);

    // Persist the transition, then refresh the cache from what was actually
    // written. Updating only the cached copy meant a status change survived
    // exactly as long as the cache entry did.
    const result = await this.orderRepo.update({ orderNumber: orderId }, { status: status as any });
    if (!result.affected) throw new NotFoundException(`Order ${orderId} not found`);

    const updated = { ...order, status, updatedAt: new Date().toISOString(), updatedBy };
    await this.redis.setJson(this.cacheKey(orderId), updated, 86400);

    await this.kafka.publish(KAFKA_TOPICS.ORDER_STATUS_UPDATED, {
      id: orderId,
      status,
      updatedBy,
      previousStatus: order.status,
    });

    // ── Auto-Dispatch Delivery Partner on READY ──────────────────────────────
    // When seller marks order as READY (packed & awaiting pickup), publish a
    // delivery request event. The delivery-service consumes this to find the
    // nearest idle delivery partner via Redis geospatial search.
    if (status === OrderStatus.READY && order.status !== OrderStatus.READY) {
      await this.kafka.publish(KAFKA_TOPICS.DELIVERY_REQUEST_CREATED, {
        orderId,
        sellerId: order.sellerId || order.items?.[0]?.sellerId || 'unknown',
        serviceType: order.serviceType,
        deliveryAddress: order.deliveryAddress,
        totalAmount: order.totalAmount,
        itemCount: order.items?.length ?? 0,
      });
      this.logger.log(
        `Delivery request created for order ${orderId} — awaiting partner assignment`,
      );
    }

    // ── Commission Auto-Trigger on Delivery ──────────────────────────────────
    // When an order is delivered, trigger the commission calculation pipeline.
    // The commission-service listens on 'commission.trigger' and:
    //   1. Calculates referral fee + closing fee + GST + TDS
    //   2. Credits seller wallet (order total − commission − GST − TDS)
    //   3. Credits platform admin wallet (commission + GST)
    //   4. Publishes 'commission.calculated' for downstream services
    if (status === OrderStatus.DELIVERED && order.status !== OrderStatus.DELIVERED) {
      const sellerId = order.sellerId || order.items?.[0]?.sellerId || 'unknown';
      const category = order.category || order.items?.[0]?.category;
      const subCategory = order.subCategory || order.items?.[0]?.subCategory;

      await this.kafka.publish('commission.trigger', {
        orderId,
        sellerId,
        orderTotal: order.subtotal, // Commission is on subtotal (excl. delivery fee)
        serviceType: order.serviceType,
        category,
        subCategory,
        deliveredAt: updated.updatedAt,
      });

      this.logger.log(
        `Commission triggered for order ${orderId} | ` +
          `Seller: ${sellerId} | Subtotal: ${order.subtotal} | ` +
          `Service: ${order.serviceType} | Category: ${category ?? 'N/A'}`,
      );
    }

    this.logger.log(`Order ${orderId} status → ${status}`);
    return { success: true, orderId, status };
  }

  async getOrderTracking(orderId: string) {
    const order = await this.getOrderById(orderId);
    const trackingKey = `tracking:${orderId}`;
    const location = await this.redis.getJson<any>(trackingKey);
    return {
      orderId,
      status: order.status,
      estimatedDeliveryAt: order.estimatedDeliveryAt,
      driver: location?.driver ?? null,
      location: location?.coords ?? null,
      timeline: [
        { status: 'CONFIRMED', at: order.placedAt, done: true },
        { status: 'PREPARING', at: null, done: order.status !== OrderStatus.PENDING },
        {
          status: 'OUT_FOR_DELIVERY',
          at: null,
          done:
            order.status === OrderStatus.OUT_FOR_DELIVERY || order.status === OrderStatus.DELIVERED,
        },
        { status: 'DELIVERED', at: null, done: order.status === OrderStatus.DELIVERED },
      ],
    };
  }

  /**
   * A customer's order history, newest first.
   *
   * Returned `{ data: [], total: 0 }` unconditionally before the table existed —
   * so "My Orders" was permanently empty no matter how much the customer had
   * bought.
   */
  async getOrdersByCustomer(customerId: string, page = 1, limit = 20, status?: string) {
    if (!customerId) return { data: [], total: 0, page, limit };

    const take = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

    // `status` was accepted by the gateway, forwarded in the message payload,
    // and then silently dropped here — so `?status=DELIVERED` returned every
    // order the customer had ever placed. The Reviews page used that filter to
    // decide what could be reviewed and invited customers to review items that
    // had not shipped; the Returns page offered returns on the same orders.
    // Accepts one status or a comma-separated list, case-insensitively, since
    // callers spell the enum both ways.
    const wanted = String(status ?? '')
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

    const where =
      wanted.length === 1
        ? { customerId, status: wanted[0] as OrderStatus }
        : wanted.length > 1
          ? { customerId, status: In(wanted as OrderStatus[]) }
          : { customerId };

    const [rows, total] = await this.orderRepo.findAndCount({
      where,
      order: { placedAt: 'DESC' },
      skip,
      take,
    });
    return { data: rows.map((r) => this.toWire(r)), total, page: Number(page) || 1, limit: take };
  }

  async cancelOrder(orderId: string, reason: string, cancelledBy: string) {
    const order = await this.getOrderById(orderId);
    if ([OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED].includes(order.status)) {
      throw new Error('Cannot cancel an order already out for delivery or delivered');
    }
    return this.updateOrderStatus(orderId, OrderStatus.CANCELLED, cancelledBy);
  }

  // ── Dynamic Delivery Fee — Uses admin-defined zone rates ───────────────────
  /**
   * Delivery fee for one order.
   *
   * `freeDeliveryThreshold` was declared for three of the four verticals and
   * then never read — the method returned `config.baseFee` unconditionally, so
   * a ₹55,000 marketplace order was charged ₹60 delivery despite a threshold of
   * ₹2,000 sitting right there in the table. Meanwhile the storefront footer
   * promised free delivery over ₹499 and the cart page applied its own third
   * number. Three answers, and the customer was charged the one no page showed.
   *
   * `subtotal` is the basket before discounts: a coupon should not cost the
   * customer their free delivery.
   */
  private async estimateDeliveryFee(
    serviceType?: string,
    subtotal = 0,
    regionCode?: string,
  ): Promise<number> {
    // Marketplace rates are per market, in that market's own currency — one
    // number for every currency meant QR 60 / free above QR 2,000 in Doha and
    // AED 60 / 2,000 in Dubai. Mirrored by `delivery` in the web registry
    // (packages/shared-core/src/localization/countries.ts); change both.
    const MARKETPLACE_RATES: Record<string, { baseFee: number; freeDeliveryThreshold: number }> = {
      QA: { baseFee: 15, freeDeliveryThreshold: 200 },
      IN: { baseFee: 60, freeDeliveryThreshold: 2000 },
      AE: { baseFee: 15, freeDeliveryThreshold: 200 },
      SA: { baseFee: 15, freeDeliveryThreshold: 200 },
      BH: { baseFee: 2, freeDeliveryThreshold: 25 },
      KW: { baseFee: 2, freeDeliveryThreshold: 20 },
      OM: { baseFee: 2, freeDeliveryThreshold: 25 },
      GB: { baseFee: 4, freeDeliveryThreshold: 40 },
      US: { baseFee: 6, freeDeliveryThreshold: 50 },
      SG: { baseFee: 5, freeDeliveryThreshold: 60 },
    };
    const market = String(regionCode ?? '').toUpperCase();
    // Service-specific base fees aligned with delivery-service rateConfig
    const rateConfig: Record<string, { baseFee: number; freeDeliveryThreshold?: number }> = {
      marketplace: MARKETPLACE_RATES[market] ?? MARKETPLACE_RATES.QA,
      grocery: { baseFee: 40, freeDeliveryThreshold: 1500 },
      restaurant: { baseFee: 30 },
      pharmacy: { baseFee: 50, freeDeliveryThreshold: 1000 },
    };

    const config = rateConfig[serviceType ?? 'marketplace'] ?? rateConfig.marketplace;

    if (config.freeDeliveryThreshold !== undefined && subtotal >= config.freeDeliveryThreshold) {
      return 0;
    }

    // Try to fetch zone-specific rate from Redis (admin-configured)
    try {
      const adminRate = await this.redis.get('shipping:default_rate');
      if (adminRate && !isNaN(Number(adminRate))) return Number(adminRate);
    } catch {
      /* fallback to config */
    }

    return config.baseFee;
  }
}
