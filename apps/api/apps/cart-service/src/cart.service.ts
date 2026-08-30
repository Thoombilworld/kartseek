import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { RedisService } from '@app/redis';
import { KafkaProducerService } from '@app/kafka';

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);
  constructor(private readonly redis: RedisService, private readonly kafka: KafkaProducerService) {}

  async healthCheck() { return { service: 'cart-service', status: 'ok', timestamp: new Date().toISOString() }; }

  private cartKey(userId: string) { return `cart:${userId}`; }

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

  async addItem(userId: string, item: { productId: string; name: string; price: number; quantity: number; imageUrl?: string; variantId?: string; serviceType: string }) {
    const cart = await this.getCart(userId);
    const idx = cart.items.findIndex((i: any) => i.productId === item.productId && i.variantId === item.variantId);
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

  async updateItemQuantity(userId: string, productId: string, quantity: number, variantId?: string) {
    const cart = await this.getCart(userId);
    if (quantity <= 0) return this.removeItem(userId, productId, variantId);
    const idx = cart.items.findIndex((i: any) => i.productId === productId && i.variantId === variantId);
    if (idx >= 0) cart.items[idx].quantity = quantity;
    cart.subtotal = this.safeSubtotal(cart.items);
    cart.updatedAt = new Date().toISOString();
    await this.redis.setJson(this.cartKey(userId), cart, 86400 * 3);
    return { success: true, cart };
  }

  async removeItem(userId: string, productId: string, variantId?: string) {
    const cart = await this.getCart(userId);
    cart.items = cart.items.filter((i: any) => !(i.productId === productId && i.variantId === variantId));
    cart.subtotal = this.safeSubtotal(cart.items);
    cart.updatedAt = new Date().toISOString();
    await this.redis.setJson(this.cartKey(userId), cart, 86400 * 3);
    return { success: true, cart };
  }

  async clearCart(userId: string) {
    await this.redis.del(this.cartKey(userId));
    return { success: true };
  }

  async applyCoupon(userId: string, couponCode: string) {
    const validCoupons: Record<string, number> = { FIRST10: 0.10, KARTSEEK20: 0.20, SAVE50: 0.05 };
    const discount = validCoupons[couponCode.toUpperCase()];
    if (!discount) return { success: false, reason: 'Invalid or expired coupon code' };
    const cart = await this.getCart(userId);
    const discountAmount = Math.round(cart.subtotal * discount);
    return { success: true, couponCode, discountPercentage: discount * 100, discountAmount, newTotal: cart.subtotal - discountAmount };
  }
}
