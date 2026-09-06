import { Inject, Injectable, HttpException, HttpStatus, Logger, Optional } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout, catchError } from 'rxjs';
import { rpcCatch } from '@app/common';
import { getRegionConfig } from '@app/region';
import { MARKETPLACE_PATTERNS } from '../contracts';
import { SellerGateway } from '../gateways/seller.gateway';

/**
 * Marketplace order placement and the customer's view of their orders.
 *
 * Lifted out of MarketplaceGatewayController so that the generic customer
 * routes — `POST /orders/checkout`, `GET /orders/history`, `GET /orders/:id`,
 * `GET /orders/:id/tracking` — run the same code as `/marketplace/orders`.
 * They did not: the generic checkout answered every request with an invented
 * `ORD-…` id and "Order placed successfully" without writing an order anywhere,
 * and the mobile customer app posts its orders there. The history and detail
 * routes did not exist at all.
 *
 * One implementation, two mounts. The marketplace routes keep their paths and
 * behaviour; the generic ones stop lying.
 */
@Injectable()
export class MarketplaceOrderService {
  private readonly logger = new Logger(MarketplaceOrderService.name);

  constructor(
    @Inject('MARKETPLACE_SERVICE') private readonly marketplaceClient: ClientProxy,
    // TCP, not the Kafka 'ORDER_SERVICE': these are request/response commands
    // that need a reply, and the order service listens for them over TCP.
    @Inject('ORDER_SERVICE_TCP') private readonly orderClient: ClientProxy,
    // Optional so a checkout can never fail because the socket layer is absent.
    @Optional() private readonly sellerGateway?: SellerGateway,
  ) {}

  /** The authenticated user id (populated by JwtAuthGuard). */
  userId(req: any): string | undefined {
    return req?.user?.id || req?.user?.userId || req?.user?.sub;
  }

  private async sendToMarketplace<T = any>(cmd: string, payload: any = {}): Promise<T> {
    // Attach the internal service credential to object payloads when configured.
    const secret = process.env.INTERNAL_SERVICE_SECRET;
    const body =
      secret && payload && typeof payload === 'object' && !Array.isArray(payload)
        ? { ...payload, _internalSecret: secret }
        : (payload ?? {});
    try {
      return await lastValueFrom(
        this.marketplaceClient.send<T>({ cmd }, body).pipe(
          timeout(10000),
          // Through the shared helper, not a local copy.
          //
          // This controller carried its own inline version of the rule, and it
          // treated any status from 100 to 599 as a domain error whose message
          // could be forwarded. marketplace-service reports unhandled failures as
          // `{ statusCode: 500, message: <driver text> }`, so a non-uuid sent to
          // the wishlist route answered
          //   500 invalid input syntax for type uuid: "12345"
          // naming the datastore and column type to the caller. `rpcCatch` keeps
          // the original reason for the local copy — read `statusCode` so a
          // missing product is 404 rather than 503 — while forwarding a message
          // only for 4xx, which is the half that was written for the caller.
          catchError(rpcCatch('Marketplace service unavailable')),
        ),
      );
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Marketplace service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  /**
   * Place an order, pricing it server-side.
   *
   * Shared by `POST /orders/checkout` and the `POST /orders` alias, which were
   * both sending `{ cmd: 'create_checkout' }` — a pattern *no service in the
   * monorepo implements*, so every checkout answered 503 and nothing could be
   * bought. The real handler is `place_order`, and it takes `customerId` /
   * `deliveryAddress` / `serviceType`, none of which the old payload supplied.
   *
   * Three things are deliberately not taken from the request body:
   *
   *  - **the customer** — always the JWT subject, never `payload.userId`.
   *  - **prices** — resolved from each product's buy-box listing via
   *    `PRICE_ORDER_ITEMS`. The order service used to compute `subtotal` from
   *    `items[].price` as sent by the caller, so a hand-rolled client could name
   *    its own price; the web client sends no price at all, which made `subtotal`
   *    `NaN`.
   *  - **the discount** — resolved through `VALIDATE_COUPON` against the real
   *    coupon record and this customer's usage. The order service used to apply a
   *    flat `subtotal * 0.1` for *any* non-empty coupon string.
   */
  async place(req: any, payload: any) {
    const customerId = this.userId(req);
    if (!customerId) {
      throw new HttpException('Not authenticated', HttpStatus.UNAUTHORIZED);
    }

    const requested = Array.isArray(payload?.items) ? payload.items : [];
    if (requested.length === 0) {
      throw new HttpException('Cart is empty', HttpStatus.BAD_REQUEST);
    }

    // ── 1. Authoritative prices ────────────────────────────────────────────
    const pricing: any = await this.sendToMarketplace(MARKETPLACE_PATTERNS.PRICE_ORDER_ITEMS, {
      items: requested.map((i: any) => ({ productId: i?.productId, quantity: i?.quantity })),
    }).catch((): null => null);

    if (!pricing) {
      throw new HttpException('Could not price this order', HttpStatus.SERVICE_UNAVAILABLE);
    }
    // A partially-priced basket is refused outright rather than charged for the
    // lines that happened to resolve.
    if (!pricing.ok) {
      throw new HttpException(pricing.reason || 'Item unavailable', HttpStatus.BAD_REQUEST);
    }

    const items = (pricing.items as any[]).map((line) => ({
      productId: line.productId,
      quantity: line.quantity,
      price: line.unitPrice,
      sellerId: line.sellerId,
      name: line.name,
      // The listing is which seller's offer was actually bought, and it is the
      // row that holds the stock. Dropping it here meant the seller order rows
      // recorded an empty `listingId` and — because the decrement was keyed on
      // it — that no order ever reduced a seller's stock at all.
      listingId: line.listingId,
    }));
    const subtotal: number = Number(pricing.subtotal) || 0;

    // ── 2. Real coupon discount ────────────────────────────────────────────
    let discount = 0;
    let couponId: string | null = null;
    const couponCode = typeof payload?.couponCode === 'string' ? payload.couponCode.trim() : '';
    if (couponCode) {
      const result: any = await this.sendToMarketplace(MARKETPLACE_PATTERNS.VALIDATE_COUPON, {
        code: couponCode,
        customerId,
        orderTotal: subtotal,
        paymentMethod: payload?.paymentMethod,
        productIds: items.map((i) => i.productId),
      }).catch((): null => null);

      // An invalid coupon fails the order rather than silently dropping the
      // discount the customer was shown at checkout.
      if (!result?.valid) {
        throw new HttpException(result?.reason || 'Coupon is not valid', HttpStatus.BAD_REQUEST);
      }
      discount = Math.min(Number(result.discount) || 0, subtotal);
      couponId = result.couponId ?? null;
    }

    // ── 2b. Gift card ──────────────────────────────────────────────────────
    // The amount is decided here, from the card's real balance, never from the
    // browser: the cart used to subtract a gift card from the total it displayed
    // while checkout sent no code at all, so the customer saw one price and was
    // charged another with the card left untouched.
    //
    // Looked up before placing so an unusable card fails the order outright,
    // rather than the customer discovering it after payment.
    let giftCardAmount = 0;
    const giftCardCode =
      typeof payload?.giftCardCode === 'string' ? payload.giftCardCode.trim() : '';
    if (giftCardCode) {
      const card: any = await this.sendToMarketplace(MARKETPLACE_PATTERNS.GIFT_CARD_BALANCE, {
        code: giftCardCode,
      }).catch((): null => null);

      if (!card) {
        throw new HttpException('Gift card could not be verified', HttpStatus.BAD_REQUEST);
      }
      const balance = Number(card.currentBalance) || 0;
      if (balance <= 0) {
        throw new HttpException('This gift card has no remaining balance', HttpStatus.BAD_REQUEST);
      }
      // Never more than what is still owed after the coupon.
      giftCardAmount = Math.round(Math.min(balance, subtotal - discount) * 100) / 100;
    }

    // ── 2c. Take the stock ─────────────────────────────────────────────────
    //
    // Immediately before placing, and conditionally: `reserveListingStock` only
    // succeeds where `stockQuantity >= quantity` still holds, so two customers
    // racing for the last unit produce one order and one 409 rather than two
    // orders and a seller who cannot ship.
    //
    // Late on purpose. Everything above can still refuse the order (an invalid
    // coupon, an unusable gift card), and holding stock across those lookups
    // would take units off sale for baskets that were never going to complete.
    // Everything below either succeeds or releases.
    const reservation: any = await this.sendToMarketplace(
      MARKETPLACE_PATTERNS.RESERVE_LISTING_STOCK,
      { items },
    ).catch((): null => null);

    if (!reservation?.ok) {
      throw new HttpException(
        reservation?.reason || 'Some items are no longer in stock',
        HttpStatus.CONFLICT,
      );
    }
    const reserved: Array<{ listingId: string; quantity: number }> = reservation.reserved ?? [];

    /** Put the held units back. Every failure path below has to call this. */
    const releaseStock = async (why: string) => {
      if (reserved.length === 0) return;
      this.logger.warn(`Releasing ${reserved.length} stock reservation(s): ${why}`);
      await this.sendToMarketplace(MARKETPLACE_PATTERNS.RELEASE_LISTING_STOCK, {
        items: reserved,
      }).catch((err) => {
        this.logger.error(
          `Stock release failed after "${why}" — listings are understated until reconciled: ${err?.message}`,
        );
      });
    };

    // ── 3. Place it ────────────────────────────────────────────────────────
    const order: any = await lastValueFrom(
      this.orderClient.send(
        { cmd: 'place_order' },
        {
          customerId,
          items,
          subtotal,
          // The gift card reduces what is charged, so it belongs in the order's
          // discount — otherwise the card is debited and the customer pays the full
          // amount anyway.
          discount: discount + giftCardAmount,
          couponId,
          couponCode: couponCode || undefined,
          giftCardCode: giftCardCode || undefined,
          giftCardAmount: giftCardAmount || undefined,
          deliveryAddress: payload?.shippingAddress ?? payload?.deliveryAddress ?? '',
          serviceType: 'marketplace',
          paymentMethod: payload?.paymentMethod,
          walletAmount: Number(payload?.walletAmount) || 0,
          notes: payload?.notes,
        },
      ),
    ).catch(async () => {
      // The units are held against an order that does not exist. Hand them back
      // before answering, or they are lost until someone reconciles by hand.
      await releaseStock('order-service did not accept the order');
      throw new HttpException('Order service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    });

    // ── 4. Record the redemption ───────────────────────────────────────────
    // After the order exists, so a failed order cannot burn the customer's one
    // use of a coupon. `redeemCoupon` re-checks the per-user limit under a row
    // lock, so a racing double-submit still cannot exceed it.
    const placedId = order?.order?.id ?? order?.id;
    if (couponId && placedId) {
      await this.sendToMarketplace(MARKETPLACE_PATTERNS.REDEEM_COUPON, {
        couponId,
        customerId,
        orderId: placedId,
        discountApplied: discount,
      }).catch((): undefined => undefined);
    }

    // ── 4b. Debit the gift card ────────────────────────────────────────────
    // Also after the order exists, so a failed order cannot burn balance. But
    // unlike the coupon above this is NOT fail-soft: the order's total has
    // already been reduced by `giftCardAmount`, so letting a failed debit pass
    // silently would hand out that money on every attempt, repeatably.
    //
    // The redemption re-reads the balance under a row lock and caps at what is
    // actually there, so two checkouts racing the same card cannot both take it.
    // If the debit comes up short — or fails outright — the order is cancelled
    // rather than left standing at a price the customer did not pay for.
    if (giftCardAmount > 0 && placedId) {
      const redemption: any = await this.sendToMarketplace(MARKETPLACE_PATTERNS.GIFT_CARD_REDEEM, {
        code: giftCardCode,
        orderId: placedId,
        amount: giftCardAmount,
        userId: customerId,
      }).catch((): null => null);

      const redeemed = Number(redemption?.redeemed) || 0;
      if (redeemed < giftCardAmount) {
        // Cancelled through order-service, which owns the row this route created.
        await lastValueFrom(
          this.orderClient.send(
            { cmd: 'cancel_order' },
            {
              orderId: placedId,
              userId: customerId,
              reason: 'Gift card could not be redeemed for the full amount',
            },
          ),
        ).catch((): undefined => undefined);

        // The order is being unwound, so the units it held go back on sale.
        // Without this an unusable gift card would quietly retire stock on every
        // attempt — the customer retries, and each retry costs the seller a unit.
        await releaseStock('gift card could not be debited in full');

        this.logger.error(
          `Gift card debit short on order ${placedId}: expected ${giftCardAmount}, got ${redeemed}`,
        );
        throw new HttpException(
          'We could not apply your gift card, so the order was not placed. Please try again.',
          HttpStatus.CONFLICT,
        );
      }
    }

    // ── 5. Hand the order to the sellers who must fulfil it ────────────────
    //
    // order-service owns the customer's copy; the seller portal reads
    // `marketplace.marketplace_orders`, one row per seller. Nothing connected
    // the two, so every order placed here was invisible to the seller who had to
    // ship it — the seller Orders queue, dashboard counts, returns and payouts
    // were all empty on a system that was taking money.
    //
    // Deliberately awaited rather than fired into Kafka: the seller must see the
    // order the moment checkout returns, and a projection failure is something
    // the caller needs to know about, not something to discover later.
    if (placedId) {
      const projection: any = await this.sendToMarketplace(
        MARKETPLACE_PATTERNS.CREATE_SELLER_ORDERS,
        {
          orderId: placedId,
          orderNumber: order?.order?.orderNumber ?? order?.orderNumber ?? placedId,
          customerId,
          customerName: req?.user?.name ?? '',
          items,
          shippingAddress: payload?.shippingAddress ?? payload?.deliveryAddress ?? null,
          paymentMethod: payload?.paymentMethod,
          paymentStatus: order?.order?.paymentStatus ?? order?.paymentStatus,
          discount,
          deliveryFee: Number(order?.order?.deliveryFee ?? order?.deliveryFee) || 0,
          taxAmount: Number(order?.order?.taxAmount ?? order?.taxAmount) || 0,
          regionCode: req?.headers?.['x-region-code'] ?? null,
        },
      ).catch((err): null => {
        this.logger.error(`Order ${placedId} placed but not projected to sellers: ${err?.message}`);
        return null;
      });

      if (projection?.orphanedLines) {
        this.logger.error(
          `Order ${placedId}: ${projection.orphanedLines} line(s) had no seller and will not be fulfilled`,
        );
      }

      // ── 6. Tell the seller, now ──────────────────────────────────────────
      //
      // marketplace-service also publishes `marketplace.order.placed`, and the
      // Kafka→WebSocket bridge consumes it — but that path depends on a consumer
      // group that is routinely mid-rebalance, and a seller learning about an
      // order "eventually" is not good enough: this is the notification the
      // whole portal is built around. Pushed directly here so it lands the
      // moment checkout returns; the Kafka event remains for every other
      // consumer (analytics, notification-service, the admin console).
      //
      // Best-effort by design — a socket problem must never fail a paid order.
      //
      // The currency travels with the event. `SellerGateway` falls back to INR
      // when it is absent, so this push — which had no `currency` at all —
      // announced a Qatari seller's takings as "₹115,960.00" in their browser
      // notification while the same order read QR 115,960.00 on the page.
      const regionCode = String(req?.headers?.['x-region-code'] ?? '') || undefined;
      const currency = regionCode ? getRegionConfig(regionCode)?.currencyCode : undefined;

      for (const sellerOrder of projection?.orders ?? []) {
        this.sellerGateway
          ?.notifyNewOrder(String(sellerOrder.sellerId), {
            orderId: String(sellerOrder.id),
            customerName: req?.user?.name ?? 'Customer',
            items: items.filter((i) => i.sellerId === sellerOrder.sellerId).length,
            total: Number(sellerOrder.grandTotal ?? 0),
            type: 'marketplace',
            currency,
          })
          .catch((err: any) =>
            this.logger.warn(`Live push for order ${sellerOrder.id} failed: ${err?.message}`),
          );
      }
    }

    return order;
  }

  /**
   * Load one of the caller's own orders from order-service.
   *
   * Accepts either identifier the customer is given — the order number
   * (`ORD-…`, which is what `GET /marketplace/orders` puts in `id`) or the
   * order uuid — because routes below are reached from links built out of that
   * list. order-service enforces ownership, so this is also the ownership check:
   * another customer's order comes back as a rejection, not a row.
   */
  async fetchOwned(req: any, orderId: string): Promise<any> {
    const order = await lastValueFrom(
      this.orderClient.send(
        { cmd: 'get_order_by_id' },
        {
          orderId,
          userId: this.userId(req),
          role: req?.user?.role,
        },
      ),
    ).catch((err: any) => {
      const rawStatus = err?.statusCode ?? err?.status;
      const status =
        typeof rawStatus === 'number' && rawStatus >= 100 && rawStatus < 600
          ? rawStatus
          : HttpStatus.SERVICE_UNAVAILABLE;
      throw new HttpException(err?.message || 'Order service unavailable', status);
    });
    if (!order) throw new HttpException(`Order ${orderId} not found`, HttpStatus.NOT_FOUND);
    return order;
  }

  /** The customer's own order history, from order-service, where checkout writes it. */
  async listForCustomer(req: any, opts: { status?: string; page: number; limit: number }) {
    const { status, page, limit } = opts;
    return await lastValueFrom(
      this.orderClient.send(
        { cmd: 'get_customer_orders' },
        {
          customerId: this.userId(req),
          status,
          page: +page,
          limit: +limit,
        },
      ),
    );
  }

  /** One of the caller's own orders; order-service enforces ownership and reports 403/404. */
  async getById(req: any, id: string) {
    return lastValueFrom(
      this.orderClient.send(
        { cmd: 'get_order_by_id' },
        { orderId: id, userId: this.userId(req), role: req?.user?.role },
      ),
    ).catch((err) => {
      // Propagate a real status (403 Forbidden / 404 Not Found) from the order
      // service rather than masking it as a generic 503.
      //
      // `statusCode` first: that is the field `RpcAwareExceptionsFilter` emits.
      // This read only `err.status`, which the filter never sets, so every
      // propagated error fell through to 503 — an IDOR rejection and a missing
      // order both looked like the order service being down. `status` is kept as
      // a fallback for producers that predate the filter.
      const rawStatus = err?.statusCode ?? err?.status;
      const status =
        typeof rawStatus === 'number' && rawStatus >= 100 && rawStatus < 600
          ? rawStatus
          : HttpStatus.SERVICE_UNAVAILABLE;
      throw new HttpException(err?.message || 'Order service unavailable', status);
    });
  }

  async cancel(req: any, orderId: string, payload: { reason?: string }) {
    return lastValueFrom(
      this.orderClient.send(
        { cmd: 'cancel_order' },
        { orderId, userId: this.userId(req), ...payload },
      ),
    ).catch(() => {
      throw new HttpException('Order service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    });
  }

  /** Tracking events for one of the caller's own orders, resolved by number or uuid. */
  async track(req: any, orderId: string) {
    const order = await this.fetchOwned(req, orderId);
    const uuid = order?.orderId ?? order?.id;
    const tracking: any = await this.sendToMarketplace(MARKETPLACE_PATTERNS.GET_TRACKING, {
      orderId: uuid,
    });
    // The status the customer sees on the order itself, so a parcel with no
    // courier scans yet still renders a timeline instead of an empty box.
    return {
      ...tracking,
      orderStatus: order?.status ?? null,
      placedAt: order?.placedAt ?? null,
      estimatedDeliveryAt: order?.estimatedDeliveryAt ?? null,
    };
  }
}
