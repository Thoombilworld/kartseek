import { getCountry } from '../localization/countries';

/**
 * The marketplace delivery rule the storefront quotes, per market.
 *
 * There were three different answers on screen at once and the customer was
 * charged the one none of the pages showed: the cart page's own threshold, the
 * footer's promise, and order-service's flat fee. Then there was one rule for
 * every market — QR 60 / free above QR 2,000 in Doha and AED 60 / 2,000 in
 * Dubai, the same digits under a different currency sign.
 *
 * The rule now lives once per market in the localization registry
 * (`COUNTRIES[code].delivery`, in that market's currency) and order-service
 * carries the same table (`MARKETPLACE_RATES` in `estimateDeliveryFee`). Change
 * them together, or the quote and the bill drift apart again.
 *
 * `subtotal` is the basket before discounts, matching order-service: a coupon
 * must not cost the customer their free delivery.
 */
export interface DeliveryRule {
  /** Flat fee, in the market's own currency, below the threshold. */
  fee: number;
  /** Basket value at or above which delivery is free. */
  freeAbove: number;
}

export function getMarketplaceDeliveryRule(country?: string): DeliveryRule {
  return getCountry(country).delivery;
}

/** What delivery will cost for a basket of `subtotal` in `country`. */
export function marketplaceDeliveryFee(subtotal: number, country?: string): number {
  const rule = getMarketplaceDeliveryRule(country);
  return subtotal >= rule.freeAbove ? 0 : rule.fee;
}

/** How much more the customer must add to qualify, or 0 if they already have. */
export function amountToFreeDelivery(subtotal: number, country?: string): number {
  return Math.max(0, getMarketplaceDeliveryRule(country).freeAbove - subtotal);
}

/** Home-market figures, kept for callers that have no market in hand. */
export const MARKETPLACE_DELIVERY_FEE = getMarketplaceDeliveryRule().fee;
export const MARKETPLACE_FREE_DELIVERY_THRESHOLD = getMarketplaceDeliveryRule().freeAbove;
