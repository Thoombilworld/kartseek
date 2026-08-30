import { redirect } from 'next/navigation';

/**
 * `/rewards` → `/loyalty`.
 *
 * The second loyalty screen, and the invented one. `const USER_POINTS = 1420`
 * with a tier and a progress bar computed from it, a `POINT_HISTORY` of earnings
 * nobody made, and a `REWARDS_CATALOG` of redeemable perks — a free shipping
 * pass among them — that no service has ever heard of. It made no request, so
 * every customer saw the same 1,420 points, and once `/loyalty` began reporting
 * the real balance the two pages openly disagreed.
 *
 * Nothing real is lost here. `/loyalty` shows the balance, tier, progress and
 * earn rates that loyalty-service actually applies, and redeems through the
 * endpoint that actually moves points. The two features this page had that
 * `/loyalty` does not — a points ledger and a rewards catalogue — have no
 * backing service to wire them to: loyalty-service keeps a balance and per-order
 * mappings, not a transaction history, and there is no catalogue anywhere.
 *
 * Redirecting rather than deleting keeps the home footer link and any bookmarks
 * working.
 */
export default function RewardsPage() {
  redirect('/loyalty');
}
