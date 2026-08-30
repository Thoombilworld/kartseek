/**
 * KARTSEEK Marketplace — Typed Customer-facing API Client
 * ────────────────────────────────────────────────────────
 * All marketplace browsing, cart, wishlist, order, and review endpoints.
 * Maps 1:1 to the backend marketplace.controller.ts routes.
 */

import { api } from '@/lib/api-endpoints';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MarketplaceProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  mrp: number;
  discount: number;
  rating: number;
  reviewCount: number;
  brand: string;
  categoryId: string;
  categoryName: string;
  sellerId: string;
  sellerName: string;
  image?: string;
  images: string[];
  inStock: boolean;
  freeDelivery: boolean;
  description: string;
  specifications: Record<string, string>;
}

export interface MarketplaceCategory {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  image?: string;
  productCount: number;
  subcategories: MarketplaceSubcategory[];
}

export interface MarketplaceSubcategory {
  id: string;
  name: string;
  slug: string;
  parentCategoryId: string;
}

export interface MarketplaceBrand {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  productCount: number;
  verified: boolean;
}

export interface MarketplaceSeller {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  rating: number;
  productCount: number;
  verified: boolean;
}

export interface MarketplaceCartItem {
  id: string;
  productId: string;
  productName: string;
  productImage?: string;
  price: number;
  quantity: number;
  variantId?: string;
  variantLabel?: string;
}

export interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  status: string;
  paymentMethod: string;
  createdAt: string;
  trackingId?: string;
  courier?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
}

export interface ProductReview {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  title: string;
  comment: string;
  date: string;
  helpful: number;
}

export interface MarketplaceHomeData {
  banners: { image: string; link: string }[];
  featuredProducts: MarketplaceProduct[];
  topCategories: MarketplaceCategory[];
  topBrands: MarketplaceBrand[];
  flashDeals: MarketplaceProduct[];
  recentlyViewed: MarketplaceProduct[];
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const marketplaceApi = {
  // ── Home ──────────────────────────────────────────────────────
  getHome: (country?: string) =>
    api.get<{ data: MarketplaceHomeData }>('/marketplace/home', { country }),

  // ── Products ─────────────────────────────────────────────────
  getProducts: (params?: {
    page?: number; limit?: number; category?: string; subcategory?: string;
    brand?: string; seller?: string; minPrice?: number; maxPrice?: number;
    sort?: string; country?: string;
  }) =>
    api.get<{ data: MarketplaceProduct[]; total: number }>('/marketplace/products', params as any),

  getProductById: (id: string) =>
    api.get<{ data: MarketplaceProduct }>(`/marketplace/products/${id}`),

  getFeatured: () =>
    api.get<{ data: MarketplaceProduct[] }>('/marketplace/featured'),

  getDeals: () =>
    api.get<{ data: MarketplaceProduct[] }>('/marketplace/deals'),

  getFlashDeals: () =>
    api.get<{ data: MarketplaceProduct[] }>('/marketplace/flash-deals'),

  // ── Search ───────────────────────────────────────────────────
  search: (q: string, params?: { page?: number; limit?: number }) =>
    api.get<{ data: MarketplaceProduct[]; total: number }>('/marketplace/search', { q, ...params }),

  // ── Categories ───────────────────────────────────────────────
  getCategories: () =>
    api.get<{ data: MarketplaceCategory[] }>('/marketplace/categories'),

  getCategoryById: (id: string) =>
    api.get<{ data: MarketplaceCategory }>(`/marketplace/categories/${id}`),

  // ── Subcategories ────────────────────────────────────────────
  getSubcategories: (categoryId?: string) =>
    api.get<{ data: MarketplaceSubcategory[] }>('/marketplace/subcategories', { categoryId }),

  // ── Brands ───────────────────────────────────────────────────
  getBrands: () =>
    api.get<{ data: MarketplaceBrand[] }>('/marketplace/brands'),

  getTopBrands: () =>
    api.get<{ data: MarketplaceBrand[] }>('/marketplace/brands/top'),

  getBrandById: (id: string) =>
    api.get<{ data: MarketplaceBrand }>(`/marketplace/brands/${id}`),

  // ── Sellers ──────────────────────────────────────────────────
  getSellers: () =>
    api.get<{ data: MarketplaceSeller[] }>('/marketplace/sellers'),

  getVerifiedSellers: () =>
    api.get<{ data: MarketplaceSeller[] }>('/marketplace/sellers/verified'),

  getSellerById: (id: string) =>
    api.get<{ data: MarketplaceSeller }>(`/marketplace/sellers/${id}`),

  // ── Cart (authenticated) ─────────────────────────────────────
  getCart: () =>
    api.get<{ data: MarketplaceCartItem[] }>('/marketplace/cart'),

  addToCart: (payload: { productId: string; quantity: number; variantId?: string }) =>
    api.post<{ data: MarketplaceCartItem }>('/marketplace/cart', payload),

  updateCartItem: (itemId: string, quantity: number) =>
    api.put('/marketplace/cart/' + itemId, { quantity }),

  removeFromCart: (itemId: string) =>
    api.delete('/marketplace/cart/' + itemId),

  // ── Wishlist (authenticated) ─────────────────────────────────
  getWishlist: () =>
    api.get<{ data: MarketplaceProduct[] }>('/marketplace/wishlist'),

  addToWishlist: (productId: string) =>
    api.post('/marketplace/wishlist', { productId }),

  removeFromWishlist: (productId: string) =>
    api.delete('/marketplace/wishlist/' + productId),

  // ── Orders (authenticated) ───────────────────────────────────
  getOrders: (params?: { status?: string; page?: number }) =>
    api.get<{ data: Order[]; total: number }>('/marketplace/orders', params as any),

  getOrderById: (id: string) =>
    api.get<{ data: Order }>(`/marketplace/orders/${id}`),

  placeOrder: (payload: object) =>
    api.post<{ data: { orderId: string } }>('/marketplace/orders', payload),

  cancelOrder: (id: string, reason: string) =>
    api.post(`/marketplace/orders/${id}/cancel`, { reason }),

  // ── Returns (authenticated) ──────────────────────────────────
  createReturnRequest: (orderId: string, payload: object) =>
    api.post(`/marketplace/orders/${orderId}/returns`, payload),

  // ── Reviews ──────────────────────────────────────────────────
  getReviews: (productId: string) =>
    api.get<{ data: ProductReview[] }>(`/marketplace/products/${productId}/reviews`),

  addReview: (productId: string, review: { rating: number; title: string; comment: string }) =>
    api.post(`/marketplace/products/${productId}/reviews`, review),

  // ── Recently Viewed (authenticated) ──────────────────────────
  getRecentlyViewed: () =>
    api.get<{ data: MarketplaceProduct[] }>('/marketplace/recently-viewed'),

  // ── Support ──────────────────────────────────────────────────
  createSupportTicket: (payload: { subject: string; message: string; category: string }) =>
    api.post('/marketplace/support', payload),
};
