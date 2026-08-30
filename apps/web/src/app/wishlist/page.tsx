import { redirect } from 'next/navigation';

/**
 * `/wishlist` → `/marketplace/wishlist`.
 *
 * The list was two entries sliced out of the demo-data flash deals, under a
 * comment reading `// Simulate a wishlist state based on the mock data`. The
 * site header and the account layout both linked here, so a customer's real
 * saved items were unreachable from the main navigation.
 *
 * The marketplace route is the wired implementation; keeping a second copy of
 * this screen is what let the two drift apart in the first place. Redirecting
 * rather than deleting keeps existing links and bookmarks working.
 */
export default function WishlistRedirectPage() {
  redirect('/marketplace/wishlist');
}
