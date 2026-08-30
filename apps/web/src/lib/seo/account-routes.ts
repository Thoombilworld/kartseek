import type { Metadata } from 'next';
import { generateMetadata as buildMeta } from './metadata';

/**
 * Metadata for a signed-in route that must never be indexed.
 *
 * `robots.ts` disallows `/checkout/`, `/cart/`, `/orders/` and friends, but
 * those prefixes are matched from the root — none of them match
 * `/grocery/checkout/`, `/grocery/cart/` or `/grocery/orders/`. The grocery
 * module's own layout then sets `robots: { index: true, follow: true }`, which
 * every route beneath it inherits, so a shopper's cart, checkout, saved
 * addresses and order invoices were all advertised as indexable.
 *
 * `noindex` in the page's own metadata rather than a `Disallow` is deliberate,
 * and for the reason `robots.ts` already sets out: a blocked URL cannot be read,
 * so the crawler never sees the directive and the URL can still surface from an
 * external link. Letting it read the page and find `noindex` is what actually
 * removes it. `follow` stays so the navigation on these pages is still crawled.
 *
 * @param title Shown in the tab and in the title template; keep it plain.
 * @param description One line. Never includes anything account-specific.
 */
export function accountRouteMeta(title: string, description: string): Metadata {
  return buildMeta({ title, description, noIndex: true });
}
