import { redirect } from 'next/navigation';

/**
 * `/cart` → `/marketplace/cart`.
 *
 * This rendered a second, thinner cart against the same `useCartContext`,
 * but without the coupon field, gift-card balance, delivery-fee threshold or
 * saved-for-later list the real cart has. The global site header linked here,
 * so the default navigation path showed customers the reduced version.
 *
 * The marketplace route is the wired implementation; keeping a second copy of
 * this screen is what let the two drift apart in the first place. Redirecting
 * rather than deleting keeps existing links and bookmarks working.
 */
export default function CartRedirectPage() {
  redirect('/marketplace/cart');
}
