/**
 * Grocery API Service — Web Frontend
 *
 * Typed wrapper for all grocery-service REST endpoints.
 * Uses the centralized api client from @/lib/api-endpoints.
 *
 * Usage:
 *   import { groceryApi } from '@/lib/grocery-api';
 *   const { categories } = await groceryApi.getCategories();
 *   const { data: stores } = await groceryApi.getNearbyStores(25.2854, 51.5310);
 */

import { api } from '@/lib/api-endpoints';

// ── Response Types ─────────────────────────────────────────────────────────

export interface GroceryCategory {
  id: string;
  name: string;
  emoji?: string;
  gradient?: string;
  description?: string;
  imageUrl?: string;
  parentId?: string;
  children?: GroceryCategory[];
  sortOrder: number;
  isActive: boolean;
  productCount: number;
  subcategoryCount: number;
  translations?: Record<string, { name?: string; description?: string }>;
}

export interface GroceryStoreApi {
  id: string;
  name: string;
  slug: string;
  address: string;
  latitude: number;
  longitude: number;
  storeTypes: string[];
  isOnline: boolean;
  deliveryRadius: number;
  minOrderAmount: number;
  deliveryFee: number;
  openingHours?: Record<string, { open: string; close: string }>;
  tags?: string[];
  rating: number;
  totalOrders: number;
  logoUrl?: string;
  bannerUrl?: string;
  phone?: string;
  status: string;
  regionCode?: string;
  productCount?: number;
}

export interface GroceryProduct {
  id: string;
  name: string;
  description?: string;
  category: string;
  subCategory?: string;
  isAvailable: boolean;
  weightVariants: Array<{ weight: string; price: number; mrp: number; stock: number; sku?: string }>;
  preparationPreferences?: { allowCutSelection: boolean; options: string[] } | null;
  imageUrl?: string;
  brand?: string;
  barcode?: string;
  isPromoted: boolean;
  rating: number;
  reviewCount: number;
  storeId: string;
}

export interface GroceryOrderApi {
  id: string;
  orderNumber: string;
  customerId: string;
  storeId: string;
  items: Array<{ productId: string; name: string; weight: string; price: number; quantity: number; preparationNote?: string }>;
  itemTotal: number;
  deliveryFee: number;
  discount: number;
  grandTotal: number;
  paymentMethod: string;
  status: string;
  deliveryAddress?: any;
  deliverySlot?: any;
  estimatedDeliveryAt?: string;
  deliveredAt?: string;
  cancelReason?: string;
  store?: GroceryStoreApi;
  createdAt: string;
}

interface Paginated<T> { data: T[]; total: number; page: number; limit: number }

// ── API Methods ────────────────────────────────────────────────────────────

export const groceryApi = {
  // ── Categories ─────────────────────────────────────────────────
  /**
   * @param stockedOnly drop categories no open shop in this market stocks.
   *   Storefronts want this: of 23 categories only 7 have a shop behind them in
   *   Qatar, so the unfiltered list sends shoppers to sixteen empty pages.
   *   Admin tooling omits it and gets everything.
   */
  getCategories: (stockedOnly = false) =>
    api.get<{ categories: GroceryCategory[]; total: number; cachedAt: string; source: string }>(
      '/grocery/categories',
      stockedOnly ? { stockedOnly: true } : {},
    ),

  getCategoryById: (id: string) =>
    api.get<GroceryCategory>(`/grocery/categories/${id}`),

  // Admin: create/update category
  createCategory: (data: Partial<GroceryCategory>) =>
    api.post<GroceryCategory>('/grocery/categories', data),

  updateCategory: (id: string, data: Partial<GroceryCategory>) =>
    api.patch<GroceryCategory>(`/grocery/categories/${id}`, data),

  invalidateCategoryCache: () =>
    api.delete<{ success: boolean }>('/grocery/categories/cache'),

  // ── Stores ─────────────────────────────────────────────────────
  getNearbyStores: (lat?: number, lng?: number, page = 1, limit = 20) =>
    api.get<Paginated<GroceryStoreApi>>('/grocery/stores', { lat, lng, page, limit }),

  /**
   * Stores that stock a category.
   *
   * Browsing a category used to lead to a product grid with no indication of
   * which shops carry it, and no endpoint existed to ask — the only category
   * route was the inverse, `stores/:id/categories`.
   */
  getStoresByCategory: (category: string, lat?: number, lng?: number, limit = 12) =>
    api.get<Paginated<GroceryStoreApi>>('/grocery/stores', { category, lat, lng, page: 1, limit }),

  getStoreById: (storeId: string) =>
    api.get<GroceryStoreApi>(`/grocery/stores/${storeId}`),

  getStoreCategories: (storeId: string) =>
    api.get<{ storeId: string; categories: GroceryCategory[]; total: number }>(`/grocery/stores/${storeId}/categories`),

  // ── Products ────────────────────────────────────────────────────
  getProducts: (storeId: string, category?: string, page = 1, limit = 30) =>
    api.get<Paginated<GroceryProduct>>(`/grocery/stores/${storeId}/products`, { category, page, limit }),

  getProductById: (storeId: string, productId: string) =>
    api.get<GroceryProduct>(`/grocery/stores/${storeId}/products/${productId}`),

  /**
   * Catalogue-wide listing, optionally filtered by category — what the category
   * landing pages need. There was no such endpoint, so those pages ran a full-text
   * search for the category slug instead.
   */
  listProducts: (params: { category?: string; storeId?: string; page?: number; limit?: number } = {}) =>
    api.get<Paginated<GroceryProduct>>('/grocery/products', {
      category: params.category, storeId: params.storeId,
      page: params.page ?? 1, limit: params.limit ?? 30,
    }),

  /**
   * Product lookup that does not need a store id — used by `/grocery/product/[id]`,
   * which is reached from search, the wishlist, order history and shared links.
   */
  getProduct: (productId: string) =>
    api.get<GroceryProduct & {
      storeName: string | null; storeSlug: string | null; storeIsOnline: boolean;
      storeDeliveryFee: number | null; storeMinOrderAmount: number | null;
    }>(`/grocery/products/${productId}`),

  // ── Search ──────────────────────────────────────────────────────
  searchProducts: (query: string, storeId?: string, page = 1, limit = 30) =>
    api.get<{ query: string; results: GroceryProduct[]; total: number; page: number }>('/grocery/search', { q: query, storeId, page, limit }),

  // ── Orders ──────────────────────────────────────────────────────
  createOrder: (order: {
    customerId: string;
    storeId: string;
    items: Array<{ productId: string; name: string; weight: string; price: number; quantity: number; preparationNote?: string }>;
    // `lat`/`lng` are optional: a saved address is typed by hand and is not
    // geocoded, and the service treats them as routing hints rather than requirements.
    deliveryAddress: { line1: string; line2?: string; city: string; state?: string; pincode: string; lat?: number; lng?: number };
    paymentMethod: 'ONLINE' | 'COD' | 'WALLET';
    scheduledAt?: string;
  }) => api.post<{ success: boolean; order: GroceryOrderApi }>('/grocery/orders', order),

  getOrderById: (orderId: string) =>
    api.get<GroceryOrderApi>(`/grocery/orders/${orderId}`),

  getCustomerOrders: (customerId: string, page = 1, limit = 20) =>
    api.get<Paginated<GroceryOrderApi>>(`/grocery/orders/customer/${customerId}`, { page, limit }),

  getStoreOrders: (storeId: string, status?: string, page = 1, limit = 20) =>
    api.get<Paginated<GroceryOrderApi>>(`/grocery/orders/store/${storeId}`, { status, page, limit }),

  updateOrderStatus: (orderId: string, status: string, reason?: string) =>
    api.patch<{ success: boolean; order: GroceryOrderApi }>(`/grocery/orders/${orderId}/status`, { status, reason }),

  // ── Seller: Product CRUD ────────────────────────────────────────
  createProduct: (storeId: string, data: Partial<GroceryProduct>) =>
    api.post<{ success: boolean; product: GroceryProduct }>(`/grocery/stores/${storeId}/products`, data),

  updateProduct: (storeId: string, productId: string, data: Partial<GroceryProduct>) =>
    api.put<{ success: boolean; product: GroceryProduct }>(`/grocery/stores/${storeId}/products/${productId}`, data),

  deleteProduct: (storeId: string, productId: string) =>
    api.delete<{ success: boolean; deletedId: string }>(`/grocery/stores/${storeId}/products/${productId}`),

  bulkImportProducts: (storeId: string, products: Partial<GroceryProduct>[]) =>
    api.post<{ uploaded: number; errors: number; errorDetails: any[]; total: number }>(`/grocery/stores/${storeId}/products/bulk`, { products }),

  // ── Seller: Analytics ───────────────────────────────────────────
  getStoreAnalytics: (storeId: string, period = '7d') =>
    api.get<{ storeId: string; storeName: string; period: string; stats: any; dailyStats: any[] }>(`/grocery/stores/${storeId}/analytics`, { period }),

  // ── Seller: Store Settings ──────────────────────────────────────
  updateStoreSettings: (storeId: string, settings: Record<string, any>) =>
    api.patch<{ success: boolean; store: GroceryStoreApi }>(`/grocery/stores/${storeId}/settings`, settings),

  // ── Seller: Promotions ──────────────────────────────────────────
  getStorePromotions: (storeId: string) =>
    api.get<{ storeId: string; promotions: any[]; total: number }>(`/grocery/stores/${storeId}/promotions`),

  toggleProductPromotion: (storeId: string, productId: string, promoted: boolean) =>
    api.patch<{ success: boolean; productId: string; isPromoted: boolean }>(`/grocery/stores/${storeId}/products/${productId}/promote`, { promoted }),

  // ── Seller: Inventory / Low Stock ───────────────────────────────

  // ── Inventory (variant rows + movement ledger) ────────────────────────────

  /**
   * Variants at or below their own low-stock threshold.
   *
   * `getLowStock` below reads the legacy jsonb blob against one global number;
   * this honours the threshold set on each variant.
   */
  getLowStockVariants: (storeId: string, threshold?: number) =>
    api.get<{
      storeId: string;
      threshold: number | null;
      total: number;
      items: Array<{
        variantId: string; sku: string; label: string; stock: number; threshold: number;
        productId: string; productName: string; category: string;
      }>;
    }>(`/grocery/stores/${storeId}/inventory/low-stock`, threshold === undefined ? {} : { threshold }),

  /**
   * Move stock and say why.
   *
   * Replaces rewriting the whole `weightVariants` array to change one number —
   * that was a read-modify-write over a single jsonb column, so two edits at
   * once silently lost one.
   */
  recordStockMovement: (storeId: string, data: {
    variantId: string;
    type: 'RECEIVED' | 'SOLD' | 'RETURNED' | 'ADJUSTED' | 'TRANSFER_IN' | 'TRANSFER_OUT';
    quantity: number;
    batchNumber?: string;
    expiryDate?: string;
    reason?: string;
  }) => api.post<{ success: boolean; stock: number }>(`/grocery/stores/${storeId}/inventory/movements`, data),

  /** Write off damaged or expired stock. */
  writeOffStock: (storeId: string, data: {
    variantId: string; quantity: number; type: 'DAMAGED' | 'EXPIRED'; reason?: string; batchNumber?: string;
  }) => api.post<{ success: boolean; stock: number }>(`/grocery/stores/${storeId}/inventory/write-off`, data),

  /** Movement history for one variant — the batch trail. */
  getStockHistory: (storeId: string, variantId: string, page = 1, limit = 50) =>
    api.get<{ variantId: string; data: any[]; total: number }>(
      `/grocery/stores/${storeId}/inventory/variants/${variantId}/history`, { page, limit },
    ),

  getLowStockItems: (storeId: string, threshold = 10) =>
    api.get<{ storeId: string; threshold: number; items: any[]; total: number }>(`/grocery/stores/${storeId}/low-stock`, { threshold }),

  // ── Flash Deals ─────────────────────────────────────────────────
  /**
   * Live flash deals across the shopper's market.
   *
   * The grocery homepage had no way to ask for these — it read a hardcoded
   * `FLASH_DEALS` array instead, and advertised discounts no shop had agreed to.
   */
  /**
   * Live deals for the storefront, scoped to the caller's market.
   *
   * Not `/grocery/flash-deals` — that is the seller/admin moderation queue and
   * has no region filter, so the homepage rail was showing (or, more often,
   * failing to show) deals belonging to shops in other countries.
   */
  listActiveFlashDeals: (limit = 40) =>
    api.get<{ data: any[]; total: number }>('/grocery/flash-deals/active', { limit }),

  listFlashDeals: (status = 'ACTIVE', limit = 20) =>
    api.get<Paginated<any>>('/grocery/flash-deals', { status, page: 1, limit }),

  createFlashDeal: (data: { storeId: string; productId: string; flashPrice: number; stockLimit: number; startTime: string; endTime: string }) =>
    api.post<{ success: boolean; flashDeal: any }>('/grocery/flash-deals', data),

  submitFlashDeal: (dealId: string) =>
    api.patch<{ success: boolean; flashDeal: any }>(`/grocery/flash-deals/${dealId}/submit`, {}),

  approveFlashDeal: (dealId: string) =>
    api.patch<{ success: boolean; flashDeal: any }>(`/grocery/flash-deals/${dealId}/approve`, {}),

  rejectFlashDeal: (dealId: string, reason: string) =>
    api.patch<{ success: boolean; flashDeal: any }>(`/grocery/flash-deals/${dealId}/reject`, { reason }),

  pauseFlashDeal: (dealId: string) =>
    api.patch<{ success: boolean; flashDeal: any }>(`/grocery/flash-deals/${dealId}/pause`, {}),

  resumeFlashDeal: (dealId: string) =>
    api.patch<{ success: boolean; flashDeal: any }>(`/grocery/flash-deals/${dealId}/resume`, {}),

  getFlashDeals: (filters?: { storeId?: string; status?: string; page?: number; limit?: number }) =>
    api.get<{ data: any[]; total: number; page: number; limit: number }>('/grocery/flash-deals', filters),

  getStoreFlashDeals: (storeId: string) =>
    api.get<{ storeId: string; deals: any[]; total: number }>(`/grocery/flash-deals/store/${storeId}`),

  // ── Brands ──────────────────────────────────────────────────────
  /**
   * Brands with something actually on sale.
   *
   * The homepage row used to come from a hardcoded regional list that shared no
   * entries with `grocery_items.brand`, so every avatar led to an empty page.
   */
  getBrands: (limit = 40) =>
    api.get<{ regionCode: string | null; brands: Array<{ id: string; name: string; productCount: number; imageUrl: string | null }>; total: number }>(
      '/grocery/brands', { limit }),

  getProductsByBrand: (slug: string, page = 1, limit = 30) =>
    api.get<{ brand: string | null; data: any[]; total: number; page: number; limit: number }>(
      `/grocery/brands/${encodeURIComponent(slug)}/products`, { page, limit }),

  // ── Reviews ─────────────────────────────────────────────────────
  submitReview: (storeId: string, productId: string, data: { customerId: string; customerName?: string; rating: number; comment?: string }) =>
    api.post<{ success: boolean; review: any }>(`/grocery/stores/${storeId}/products/${productId}/reviews`, data),

  getProductReviews: (storeId: string, productId: string, page = 1, limit = 20) =>
    api.get<{ data: any[]; total: number; page: number; limit: number }>(`/grocery/stores/${storeId}/products/${productId}/reviews`, { page, limit }),

  // ── Wishlist ────────────────────────────────────────────────────
  addToWishlist: (data: { customerId: string; productId: string; storeId: string }) =>
    api.post<{ success: boolean; wishlistItem: any }>('/grocery/wishlist', data),

  removeFromWishlist: (customerId: string, productId: string) =>
    api.delete<{ success: boolean; deleted: boolean }>(`/grocery/wishlist/${customerId}/${productId}`),

  getWishlist: (customerId: string, page = 1, limit = 30) =>
    api.get<{ data: any[]; total: number; page: number; limit: number }>(`/grocery/wishlist/${customerId}`, { page, limit }),

  // ── Reorder ─────────────────────────────────────────────────────
  /**
   * Rebuilds a past order's basket. `items` are re-priced against the live
   * catalogue and carry `previousPrice`/`priceChanged`; anything delisted or out of
   * stock is reported in `unavailable` rather than silently cloned.
   */
  reorderFromHistory: (orderId: string, customerId: string) =>
    api.post<{
      success: boolean;
      storeId: string;
      itemCount: number;
      items: Array<{
        productId: string; name: string; weight: string; quantity: number;
        price: number; previousPrice: number; priceChanged: boolean; requestedQuantity: number;
      }>;
      unavailable: Array<{ productId: string; name: string; reason: string }>;
      message: string;
    }>(`/grocery/orders/${orderId}/reorder`, { customerId }),

  // ── Tracking (SSE) ──────────────────────────────────────────────
  getOrderTracking: (orderId: string) =>
    api.get<{ orderId: string; status: string; partnerName: string | null; partnerPhone: string | null; partnerLocation: any }>(`/grocery/orders/${orderId}/tracking`),

  // ── Bulk Export ─────────────────────────────────────────────────
  exportProductsCsv: (storeId: string) =>
    api.get<{ csv: string; filename: string; rowCount: number }>(`/grocery/stores/${storeId}/products/export`),

  // ── Translations ────────────────────────────────────────────────
  updateProductTranslation: (storeId: string, productId: string, data: { locale: string; name?: string; description?: string }) =>
    api.patch<{ success: boolean; product: GroceryProduct }>(`/grocery/stores/${storeId}/products/${productId}/translations`, data),

  getProductTranslated: (storeId: string, productId: string, locale: string) =>
    api.get<GroceryProduct>(`/grocery/stores/${storeId}/products/${productId}/translated`, { locale }),
};
