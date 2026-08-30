import type { GroceryCountryConfig } from '@/i18n/grocery-locale';

/**
 * The coupon codes the grocery basket accepts.
 *
 * This exists because the two screens disagreed. `/grocery/coupons` advertised
 * five codes — FRESH50, DAIRY20, FREEDEL, MEAT100, WELCOME — with a copy button,
 * while `/grocery/cart` accepted a different two, FRESH10 and FRESHMEAT20. Every
 * code a customer copied from the coupons page was rejected at the basket.
 *
 * One registry, read by both. Discounts are expressed as functions of the
 * subtotal rather than fixed amounts so they mean the same thing in every market
 * — a flat "₹50 off" is meaningless in Doha, and a percentage is not.
 *
 * These are client-side presentation rules. The order total is authoritative on
 * the server, which re-prices every line from the catalogue; a coupon forged here
 * changes what the customer is *shown*, never what they are charged.
 */

export interface GroceryCoupon {
  code: string;
  title: string;
  /** Shown under the title. `config` lets it name the market's own threshold. */
  describe: (config: GroceryCountryConfig) => string;
  /** Minimum subtotal, as a multiple of the market's free-delivery threshold. */
  minOrderFactor: number;
  /** Returns the discount for a given subtotal. Zero if the rule does not apply. */
  discount: (subtotal: number, config: GroceryCountryConfig) => number;
  /** Waives the delivery fee instead of discounting the basket. */
  freeDelivery?: boolean;
  category: string;
  emoji: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export const GROCERY_COUPONS: GroceryCoupon[] = [
  {
    code: 'FRESH10',
    title: '10% off your basket',
    describe: () => 'On any order. One use per customer.',
    minOrderFactor: 0,
    discount: (subtotal) => round2(subtotal * 0.10),
    category: 'All',
    emoji: '🥬',
  },
  {
    code: 'FRESHMEAT20',
    title: '20% off fresh meat & seafood',
    describe: (c) => `On orders above ${c.currency.symbol}${c.delivery.freeThreshold}.`,
    minOrderFactor: 1,
    discount: (subtotal, c) => (subtotal >= c.delivery.freeThreshold ? round2(subtotal * 0.20) : 0),
    category: 'Meat',
    emoji: '🥩',
  },
  {
    code: 'FREEDEL',
    title: 'Free delivery',
    describe: (c) => `On orders above ${c.currency.symbol}${Math.round(c.delivery.freeThreshold / 2)}.`,
    minOrderFactor: 0.5,
    discount: () => 0,
    freeDelivery: true,
    category: 'All',
    emoji: '🚚',
  },
];

export function findGroceryCoupon(code: string): GroceryCoupon | undefined {
  const normalised = code.trim().toUpperCase();
  return GROCERY_COUPONS.find((c) => c.code === normalised);
}

/**
 * Resolves a code against a basket.
 *
 * Returns `null` when the code is unknown, and an explanatory reason when it is
 * real but does not apply yet — the basket page previously just said "not a valid
 * code" for both, so a customer holding a genuine coupon below its threshold was
 * told it did not exist.
 */
export function applyGroceryCoupon(
  code: string,
  subtotal: number,
  config: GroceryCountryConfig,
): { coupon: GroceryCoupon; discount: number; freeDelivery: boolean } | { error: string } {
  const coupon = findGroceryCoupon(code);
  if (!coupon) return { error: `"${code.trim().toUpperCase()}" is not a valid code` };

  const minimum = round2(coupon.minOrderFactor * config.delivery.freeThreshold);
  if (subtotal < minimum) {
    return { error: `${coupon.code} needs a basket of at least ${config.currency.symbol}${minimum}` };
  }

  return {
    coupon,
    discount: coupon.discount(subtotal, config),
    freeDelivery: !!coupon.freeDelivery,
  };
}
