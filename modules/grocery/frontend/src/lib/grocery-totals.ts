import type { GroceryCountryConfig } from '@/i18n/grocery-locale';

/**
 * The one place grocery order totals are computed.
 *
 * The basket and the checkout each carried their own arithmetic and disagreed:
 * the cart applied a delivery fee below a hardcoded ₹199 threshold and 5% "GST",
 * while the checkout displayed a fixed subtotal of 487, a flat 5 platform fee, a
 * hardcoded 24 tax and always showed delivery as FREE. A customer saw one total on
 * the basket and a different one on the next screen, and neither was right outside
 * India.
 *
 * Every input now comes from the country registry (`GROCERY_COUNTRIES`), so a
 * shopper in Qatar sees no VAT and a QAR-denominated free-delivery threshold
 * without any page knowing that.
 *
 * These are display totals only. The server re-prices the order from the catalogue
 * when it is placed — see `createGroceryOrder` — so a tampered figure here changes
 * what the customer is shown, never what they are charged.
 */

/** Charged per order regardless of basket size or market. */
export const GROCERY_PLATFORM_FEE = 5;

export interface GroceryTotalsInput {
  subtotal: number;
  /** Already-resolved coupon value, in the same currency as `subtotal`. */
  couponDiscount?: number;
  config: GroceryCountryConfig;
  /** Overrides the country's base fee, e.g. a store's own `deliveryFee`. */
  deliveryFeeOverride?: number;
  /** Overrides the country's free-delivery threshold, e.g. a store's minimum. */
  freeDeliveryThresholdOverride?: number;
}

export interface GroceryTotals {
  subtotal: number;
  couponDiscount: number;
  /** Subtotal after the coupon — what tax is charged on. */
  taxable: number;
  deliveryFee: number;
  platformFee: number;
  tax: number;
  total: number;
  /** Threshold used, so the UI can say how much more buys free delivery. */
  freeDeliveryThreshold: number;
  /** Remaining spend for free delivery; 0 once it is already free. */
  amountToFreeDelivery: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function groceryOrderTotals(input: GroceryTotalsInput): { totals: GroceryTotals } {
  const { subtotal, config, deliveryFeeOverride, freeDeliveryThresholdOverride } = input;

  const couponDiscount = Math.min(Math.max(0, input.couponDiscount ?? 0), subtotal);
  const taxable = round2(subtotal - couponDiscount);

  const threshold = freeDeliveryThresholdOverride ?? config.delivery.freeThreshold;
  const baseFee = deliveryFeeOverride ?? config.delivery.baseFee;
  const deliveryFee = subtotal >= threshold ? 0 : round2(baseFee);

  const platformFee = GROCERY_PLATFORM_FEE;
  // `tax.rate` in the registry is a percentage (5, 15, 0), not a fraction —
  // multiplying by it directly would charge 500% GST.
  const tax = round2(taxable * (config.tax.rate / 100));

  return {
    totals: {
      subtotal: round2(subtotal),
      couponDiscount,
      taxable,
      deliveryFee,
      platformFee,
      tax,
      total: round2(taxable + deliveryFee + platformFee + tax),
      freeDeliveryThreshold: threshold,
      amountToFreeDelivery: subtotal >= threshold ? 0 : round2(threshold - subtotal),
    },
  };
}
