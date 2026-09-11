import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { RedisService } from '@app/redis';
import { KafkaProducerService } from '@app/kafka';

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);
  constructor(
    private readonly redis: RedisService,
    private readonly kafka: KafkaProducerService,
  ) {}

  async healthCheck() {
    return { service: 'cart-service', status: 'ok', timestamp: new Date().toISOString() };
  }

  private cartKey(userId: string) {
    return `cart:${userId}`;
  }

  /** Calculate subtotal with NaN protection */
  private safeSubtotal(items: any[]): number {
    const total = items.reduce((s: number, i: any) => s + i.price * i.quantity, 0);
    if (!Number.isFinite(total)) {
      throw new BadRequestException('Cart calculation error: invalid price or quantity detected');
    }
    return Math.round(total * 100) / 100; // round to 2 decimal places
  }

  async getCart(userId: string) {
    const cart = await this.redis.getJson<any>(this.cartKey(userId));
    return cart ?? { userId, items: [], subtotal: 0, updatedAt: null };
  }

  /**
   * A line is one product, one SKU, in one market. The market is part of the
   * identity: the same product carted in Qatar and then in India is two lines
   * in two currencies, not one line with a doubled quantity — which is what
   * matching on product and SKU alone produced, and it left the Indian basket
   * empty while Qatar's held two riyal-priced units.
   */
  private static sameLine(
    a: any,
    b: { productId: string; variantId?: string; regionCode?: string },
  ): boolean {
    return (
      a.productId === b.productId &&
      a.variantId === b.variantId &&
      (a.regionCode ?? null) === (b.regionCode ?? null)
    );
  }

  async addItem(
    userId: string,
    item: {
      productId: string;
      name: string;
      price: number;
      quantity: number;
      imageUrl?: string;
      variantId?: string;
      serviceType: string;
      regionCode?: string;
    },
  ) {
    const cart = await this.getCart(userId);
    const idx = cart.items.findIndex((i: any) => CartService.sameLine(i, item));
    if (idx >= 0) {
      cart.items[idx].quantity += item.quantity;
    } else {
      cart.items.push({ ...item, addedAt: new Date().toISOString() });
    }
    cart.subtotal = this.safeSubtotal(cart.items);
    cart.updatedAt = new Date().toISOString();
    await this.redis.setJson(this.cartKey(userId), cart, 86400 * 3);
    return { success: true, cart };
  }

  async updateItemQuantity(
    userId: string,
    productId: string,
    quantity: number,
    variantId?: string,
    regionCode?: string,
  ) {
    const cart = await this.getCart(userId);
    if (quantity <= 0) return this.removeItem(userId, productId, variantId, regionCode);
    // A caller that names no market (a legacy client) addresses the line whatever its market.
    const idx = cart.items.findIndex((i: any) =>
      regionCode
        ? CartService.sameLine(i, { productId, variantId, regionCode })
        : i.productId === productId && i.variantId === variantId,
    );
    if (idx >= 0) cart.items[idx].quantity = quantity;
    cart.subtotal = this.safeSubtotal(cart.items);
    cart.updatedAt = new Date().toISOString();
    await this.redis.setJson(this.cartKey(userId), cart, 86400 * 3);
    return { success: true, cart };
  }

  async removeItem(userId: string, productId: string, variantId?: string, regionCode?: string) {
    const cart = await this.getCart(userId);
    cart.items = cart.items.filter(
      (i: any) =>
        !(regionCode
          ? CartService.sameLine(i, { productId, variantId, regionCode })
          : i.productId === productId && i.variantId === variantId),
    );
    cart.subtotal = this.safeSubtotal(cart.items);
    cart.updatedAt = new Date().toISOString();
    await this.redis.setJson(this.cartKey(userId), cart, 86400 * 3);
    return { success: true, cart };
  }

  async clearCart(userId: string) {
    await this.redis.del(this.cartKey(userId));
    return { success: true };
  }

  // Coupons are validated at checkout against the marketplace's coupon table
  // (`POST /marketplace/coupons/validate`, scoped to the market). The
  // `applyCoupon` that lived here matched three hard-coded codes — FIRST10,
  // KARTSEEK20, SAVE50 — against nothing, and offered a discount no order
  // could honour.
}
