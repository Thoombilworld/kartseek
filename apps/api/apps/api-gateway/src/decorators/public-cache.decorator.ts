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
 * The homepage alone re-reads 250 products every thirty seconds, per open tab.
 *
 * `max-age=0` keeps the *browser* revalidating, so a shopper never sees a stale
 * price from their own cache; `s-maxage` lets a CDN absorb the repeat traffic;
 * `stale-while-revalidate` means the refill happens off the request path.
 *
 * Apply only to routes that are the same for every caller. If the response
 * varies by who is asking — cart, orders, wishlist, recommendations tied to a
 * user — it does not belong here, whatever its TTL.
 *
 * Region scoping is already handled: `main.ts` sends
 * `Vary: Authorization, Origin, X-Region-Code`, so a shared cache keys the
 * catalogue per market and cannot serve Qatar's storefront to India.
 *
 * @param seconds  Shared-cache lifetime.
 * @param staleFor How long a stale copy may be served while revalidating.
 */
export function PublicCache(seconds: number, staleFor = seconds * 2) {
  return applyDecorators(
    Header('Cache-Control', `public, max-age=0, s-maxage=${seconds}, stale-while-revalidate=${staleFor}`),
  );
}
