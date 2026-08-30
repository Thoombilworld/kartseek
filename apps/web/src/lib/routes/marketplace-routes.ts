import { productPath } from '@/lib/marketplace/product-url';

/**
 * KARTSEEK Marketplace Route Helpers
 * Version 1.0 — Phase 1 Foundation
 *
 * Use these helpers for all marketplace navigation throughout the app.
 * Centralised here to prevent broken links and make future URL changes trivial.
 */

export const MarketplaceRoutes = {
  /** /marketplace */
  home: () => '/marketplace',

  /** /marketplace/categories */
  categories: () => '/marketplace/category-list',

  /** /marketplace/category/:id */
  category: (id: string) => `/marketplace/category/${id}`,

  /** /marketplace/subcategory/:id */
  subcategory: (id: string) => `/marketplace/subcategory/${id}`,

  /**
   * /marketplace/product/:slug-:uuid
   *
   * Delegates to `productPath` so there is one definition of the canonical
   * product URL. Pass the product itself where you have it — an id alone cannot
   * produce a slug, so the string form yields the legacy shape and the page
   * redirects.
   */
  product: (product: Parameters<typeof productPath>[0]) => productPath(product),

  /** /marketplace/search?q=:query */
  search: (query?: string) =>
    query ? `/marketplace/search?q=${encodeURIComponent(query)}` : '/marketplace/search',

  /** /marketplace/brand/:id */
  brand: (id: string) => `/marketplace/brand/${id}`,

  /** /marketplace/seller/:id */
  seller: (id: string) => `/marketplace/seller/${id}`,

  /** /marketplace/wishlist */
  wishlist: () => '/marketplace/wishlist',

  /** /cart */
  cart: () => '/cart',

  /** /checkout */
  checkout: () => '/checkout',

  /** /profile/orders */
  orders: () => '/profile/orders',

  /** /profile/orders/:id */
  orderDetail: (id: string) => `/profile/orders/${id}`,

  /** /marketplace/cart (alias) */
  marketplaceCart: () => '/marketplace/cart',
} as const;

export type MarketplaceRoute = keyof typeof MarketplaceRoutes;

export default MarketplaceRoutes;
