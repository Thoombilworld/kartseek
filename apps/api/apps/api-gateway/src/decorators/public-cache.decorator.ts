import { applyDecorators, Header } from '@nestjs/common';

/**
 * Mark a route as genuinely public and safe for a shared cache to hold.
 *
 * `main.ts` sets `Cache-Control: no-store, no-cache, must-revalidate, private`
 * on every response, which is the right default for an API where almost every
 * route is scoped to the caller — a CDN holding one shopper's cart and serving
 * it to the next is the same leak the auth guards exist to prevent.
 *
 * The cost of that blanket default is that the catalogue is uncacheable too.
 * The gateway computes a strong `ETag` for every response, and `no-store`
 * forbids the client from storing it, so the validator can never be used: no
 * conditional request is ever sent and every listing read runs the full query.
 *
 * `max-age=0` keeps the *browser* revalidating on every read, so a shopper
 * never sees a stale price from their own cache — a matching ETag costs a 304
 * and no body. `s-maxage` lets a CDN absorb repeat traffic for `seconds`.
 *
 * ── No `stale-while-revalidate` ─────────────────────────────────────────────
 *
 * This used to add `stale-while-revalidate=<2×seconds>`. Browsers honour that
 * directive too, not only CDNs, and it lets them answer a fetch from a stale
 * copy *without waiting for the revalidation*. On a storefront page the server
 * render reads the catalogue directly (no cache) while the client-side rails
 * fetch through the browser cache, so for up to three minutes after a price
 * or stock change the two halves of one page could show different offers —
 * which reads, to a shopper, as cards changing between navigation and
 * refresh. Determinism across SSR and hydration matters more than the
 * off-path refill; a CDN that wants SWR can add it at the edge, where the
 * page's two halves are not involved.
 *
 * ── Which TTL for what ──────────────────────────────────────────────────────
 *
 *   semi-static (categories, brands)          600 s
 *   catalogue lists and product detail        60–120 s, invalidated on write
 *   highly dynamic (flash deals, availability) ≤ 15 s
 *
 * Every write that moves a price, stock, approval or category also drops the
 * service-side Redis entry (`CatalogCache` in marketplace-service), so a
 * revalidating browser sees the new answer on its next request; only a CDN
 * can be up to `seconds` behind.
 *
 * Region scoping is already handled: `main.ts` sends
 * `Vary: Authorization, Origin, X-Region-Code`, so a shared cache keys the
 * catalogue per market and cannot serve Qatar's storefront to India.
 *
 * Apply only to routes that are the same for every caller. If the response
 * varies by who is asking — cart, orders, wishlist, recommendations tied to a
 * user — it does not belong here, whatever its TTL.
 *
 * @param seconds  Shared-cache lifetime.
 */
export function PublicCache(seconds: number) {
  return applyDecorators(Header('Cache-Control', `public, max-age=0, s-maxage=${seconds}`));
}
