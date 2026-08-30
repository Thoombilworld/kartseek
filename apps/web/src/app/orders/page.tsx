import { redirect } from 'next/navigation';

/**
 * `/orders` → `/marketplace/orders`.
 *
 * This listed ten hardcoded orders — an iPhone purchase, a hotel booking, a
 * doctor's appointment, taxi rides — shown identically to every signed-in
 * customer as their own history, with no request made for anything.
 *
 * It was framed as a cross-vertical feed, and the gateway exposes no endpoint
 * that aggregates orders across modules, so there is nothing to wire it to
 * yet. Sending customers to their real marketplace orders is narrower than
 * the fiction it replaces and true.
 *
 * The marketplace route is the wired implementation; keeping a second copy of
 * this screen is what let the two drift apart in the first place. Redirecting
 * rather than deleting keeps existing links and bookmarks working.
 */
export default function OrdersRedirectPage() {
  redirect('/marketplace/orders');
}
