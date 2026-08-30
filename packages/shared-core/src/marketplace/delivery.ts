/**
 * The delivery-fee rule the storefront quotes, mirroring order-service.
 *
 * There were three different answers on screen at once, and the customer was
 * charged the one none of the pages showed:
 *
 *   - the cart page  — `subtotal > 49900 ? 0 : 99`, a threshold written in
 *     paise while `subtotal` is in rupees, so free delivery only kicked in at
 *     ₹49,900 rather than the ₹499 it was meant to express
 *   - the footer     — "Free Delivery on orders above ₹499"
 *   - order-service  — a flat ₹60, because `estimateDeliveryFee` declared a
 *     `freeDeliveryThreshold` and then never read it
 *
 * order-service is the only one of the three that decides what is actually
 * charged, so these constants mirror its `rateConfig` for the marketplace
 * vertical. Change them together, or the quote and the bill drift apart again.
 *
 * Known limitation: order-service applies one rate worldwide. The per-market
 * thresholds the footer used to advertise (QA 100, IN 499, GB 35 …) were never
 * backed by anything server-side; quoting a single rule is the honest version
 * until the backend can price per market.
 */

/** Flat delivery fee, in the market's own currency, below the threshold. */
export const MARKETPLACE_DELIVERY_FEE = 60;

/** Basket value at or above which delivery is free. */
export const MARKETPLACE_FREE_DELIVERY_THRESHOLD = 2000;

/**
 * What delivery will cost for a basket of `subtotal`.
 *
 * Takes the subtotal *before* discounts, matching order-service: a coupon must
 * not cost the customer their free delivery.
 */
export function marketplaceDeliveryFee(subtotal: number): number {
  return subtotal >= MARKETPLACE_FREE_DELIVERY_THRESHOLD ? 0 : MARKETPLACE_DELIVERY_FEE;
}

/** How much more the customer must add to qualify, or 0 if they already have. */
export function amountToFreeDelivery(subtotal: number): number {
  return Math.max(0, MARKETPLACE_FREE_DELIVERY_THRESHOLD - subtotal);
}
