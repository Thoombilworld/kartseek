import { redirect } from 'next/navigation';

/**
 * `/marketplace/subscribe` → `/marketplace`.
 *
 * This advertised a "Subscribe & Save" programme that does not exist. The eight
 * products and their prices were a literal array in the page — Organic Green Tea
 * at 349, Almond Milk at 899, and so on — none of them catalogue items, and the
 * delivery frequencies and the advertised saving were literals too. Pressing
 * "Subscribe" added the product's *name* to a local `Set`, so the button changed
 * colour and nothing else happened; the selection was gone on reload.
 *
 * Recurring purchase needs real infrastructure — a schedule, a stored payment
 * mandate, renewal and cancellation — and the gateway exposes none of it for the
 * marketplace (`subscriptions` exists only under restaurant). Rather than leave
 * a storefront advertising a programme no customer can actually join, this route
 * redirects until the feature is built. Nothing linked here.
 */
export default function SubscribeSavePage() {
  redirect('/');
}
