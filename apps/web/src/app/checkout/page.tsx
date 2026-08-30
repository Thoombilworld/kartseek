import { redirect } from 'next/navigation';

/**
 * `/checkout` → `/marketplace/checkout`.
 *
 * This never placed an order. `handlePlaceOrder` awaited a 1500 ms timer
 * described in its own comment as `// Simulate API call`, then cleared the
 * cart and pushed to the success screen — so a customer who reached checkout
 * from the site header lost their basket and received a confirmation for an
 * order that was never created. It also hardcoded a single fake delivery
 * address, a 10% discount applied with no coupon, and its own delivery-fee
 * thresholds that disagreed with `marketplaceDeliveryFee`.
 *
 * The marketplace route is the wired implementation; keeping a second copy of
 * this screen is what let the two drift apart in the first place. Redirecting
 * rather than deleting keeps existing links and bookmarks working.
 */
export default function CheckoutRedirectPage() {
  redirect('/marketplace/checkout');
}
