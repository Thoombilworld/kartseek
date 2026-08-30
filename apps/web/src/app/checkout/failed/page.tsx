import { redirect } from 'next/navigation';

/**
 * `/checkout/failed` → `/marketplace/checkout/failed`.
 *
 * A duplicate failure screen whose retry link pointed back at the simulated
 * checkout above.
 *
 * The marketplace route is the wired implementation; keeping a second copy of
 * this screen is what let the two drift apart in the first place. Redirecting
 * rather than deleting keeps existing links and bookmarks working.
 */
export default async function CheckoutFailedRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Forward the query string — `?orderId=` is what makes the destination show
  // a real order rather than its empty state.
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === 'string') params.set(key, value);
    else if (Array.isArray(value)) value.forEach(v => params.append(key, v));
  }
  const qs = params.toString();
  redirect(qs ? `/marketplace/checkout/failed?${qs}` : '/marketplace/checkout/failed');
}
