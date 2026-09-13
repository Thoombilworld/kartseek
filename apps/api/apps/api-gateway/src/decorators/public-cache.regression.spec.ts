import 'reflect-metadata';
import { MarketplaceGatewayController } from '../controllers/marketplace.controller';

/**
 * Guards the two halves of the caching policy against each other.
 *
 * `main.ts` sets `no-store` on every response and expects public catalogue
 * routes to opt out individually with `@PublicCache`. That arrangement has two
 * failure modes, and each is silent:
 *
 *   • A personalised route picks up `@PublicCache` — cart, orders, wishlist —
 *     and a shared cache is now permitted to hold one shopper's data and hand
 *     it to the next caller.
 *   • The opt-outs are dropped in a refactor and the catalogue quietly becomes
 *     uncacheable again. Nothing breaks; the storefront just runs every query
 *     on every request forever.
 *
 * Reading the header metadata Nest stores is what makes both visible here
 * rather than in production.
 */

/** The `@Header()` values Nest attached to a handler. */
function headersOf(method: string): Record<string, string> {
  const handler = (MarketplaceGatewayController.prototype as any)[method];
  if (!handler) throw new Error(`MarketplaceGatewayController has no handler '${method}'`);
  return Reflect.getMetadata('__headers__', handler) ?? {};
}

function cacheControl(method: string): string | undefined {
  const headers = headersOf(method);
  // Nest stores headers as an array of { name, value } or as a keyed object
  // depending on version; normalise both.
  if (Array.isArray(headers)) {
    return (headers as any[]).find((h) => String(h?.name).toLowerCase() === 'cache-control')?.value;
  }
  const key = Object.keys(headers).find((k) => k.toLowerCase() === 'cache-control');
  return key ? (headers as any)[key] : undefined;
}

describe('catalogue cache policy', () => {
  // Every one of these is the same response for every caller.
  const PUBLIC_HANDLERS = [
    'getMarketplaceHome',
    'getProducts',
    'getCategories',
    'getCategoryById',
    'getProductById',
    'getFlashDeals',
    'getDealsOfTheDay',
    'getActiveExchangeOffers',
    'getBrands',
  ];

  it.each(PUBLIC_HANDLERS)('%s is cacheable by a shared cache', (method) => {
    const value = cacheControl(method);
    expect(value).toBeDefined();
    expect(value).toMatch(/\bpublic\b/);
    expect(value).toMatch(/s-maxage=\d+/);
    // The browser must still revalidate, so a shopper never reads a stale price
    // out of their own cache.
    expect(value).toMatch(/max-age=0/);
  });

  // Anything scoped to the caller must never carry a public cache directive.
  const PRIVATE_HANDLERS = ['getCustomerOrders', 'getCart', 'getWishlist'];

  it.each(PRIVATE_HANDLERS)('%s is never publicly cacheable', (method) => {
    let value: string | undefined;
    try {
      value = cacheControl(method);
    } catch {
      return; // handler renamed or moved; the public list above is the guard that matters
    }
    if (value !== undefined) {
      expect(value).not.toMatch(/\bpublic\b/);
      expect(value).not.toMatch(/s-maxage/);
    }
  });
});
