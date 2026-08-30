/**
 * KARTSEEK — Restaurant API Client
 * Module-scoped endpoints for the restaurant service.
 */

import { api } from '@/lib/api-endpoints';

const BASE = '/restaurants';
const ORDERS_BASE = '/orders/restaurant';

export const restaurantApi = {
  // ── Discovery ────────────────────────────────────────────────────────────

  /** List restaurants with filters */
  getList: (params?: { page?: number; limit?: number; cuisine?: string; minRating?: string; priceRange?: string; service?: string }) =>
    api.get<{ data: any[]; total: number }>(`${BASE}/`, params as any),

  /** Get nearby restaurants */
  getNearby: (params?: { lat?: string; lng?: string; radius?: number; cuisine?: string }) =>
    api.get<{ count: number; data: any[] }>(`${BASE}/nearby`, params as any),

  /** List all cuisines */
  getCuisines: () =>
    api.get<{ data: any[] }>(`${BASE}/cuisines`),

  /** Trending restaurants */
  getTrending: (limit = 10) =>
    api.get<{ data: any[] }>(`${BASE}/trending`, { limit } as any),

  /** Search restaurants */
  search: (query: string) =>
    api.get<{ data: any[] }>(`${BASE}/search`, { q: query } as any),

  // ── Restaurant Detail ────────────────────────────────────────────────────

  /** Get a single restaurant by slug */
  getBySlug: (slug: string) =>
    api.get<any>(`${BASE}/${slug}`),

  /** Get full menu for a restaurant */
  getMenu: (restaurantId: string, params?: { category?: string; veg?: string; q?: string }) =>
    api.get<{ restaurantId: string; categories: any[] }>(`${BASE}/${restaurantId}/menu`, params as any),

  /** Get restaurant reviews */
  getReviews: (restaurantId: string, params?: { page?: number; sort?: string }) =>
    api.get<{ data: any[]; total: number }>(`${BASE}/${restaurantId}/reviews`, params as any),

  /** Submit a review */
  submitReview: (restaurantId: string, data: { rating: number; comment?: string; orderId?: string }) =>
    api.post<{ success: boolean }>(`${BASE}/${restaurantId}/review`, data),

  // ── Offers & Coupons ─────────────────────────────────────────────────────

  /** Get restaurant offers */
  getOffers: (restaurantId: string) =>
    api.get<{ data: any[] }>(`${BASE}/${restaurantId}/offers`),

  /** Apply coupon */
  applyCoupon: (restaurantId: string, data: { code: string; cartTotal: number }) =>
    api.post<{ success: boolean; discount: number }>(`${BASE}/${restaurantId}/apply-coupon`, data),

  /** Remove coupon */
  removeCoupon: (restaurantId: string, data: { code: string }) =>
    api.post<{ success: boolean }>(`${BASE}/${restaurantId}/remove-coupon`, data),

  // ── Table Booking ────────────────────────────────────────────────────────

  /** Book a table */
  bookTable: (restaurantId: string, data: { date: string; time: string; guests: number; specialRequest?: string }) =>
    api.post<{ success: boolean; reservationId: string }>(`${BASE}/${restaurantId}/book-table`, data),

  /** Get my reservations */
  getMyReservations: () =>
    api.get<{ data: any[] }>(`${BASE}/my-reservations`),

  /** Cancel a reservation */
  cancelReservation: (reservationId: string, data: { reason?: string }) =>
    api.post<{ success: boolean }>(`${BASE}/reservations/${reservationId}/cancel`, data),

  // ── Favorites ────────────────────────────────────────────────────────────

  /** Add to favorites */
  addFavorite: (restaurantId: string) =>
    api.post<{ success: boolean }>(`${BASE}/${restaurantId}/favorite`),

  /** Remove from favorites */
  removeFavorite: (restaurantId: string) =>
    api.delete<{ success: boolean }>(`${BASE}/${restaurantId}/favorite`),

  /** List favorites */
  getFavorites: () =>
    api.get<{ data: any[] }>(`${BASE}/favorites`),

  // ── Cart (server-synced) ─────────────────────────────────────────────────

  /** Get current cart */
  getCart: () =>
    api.get<{ restaurantId?: string; restaurantName?: string; items: any[]; total: number }>(`${BASE}/cart`),

  /** Add item to cart */
  addToCart: (data: { restaurantId: string; menuItemId: string; quantity: number; customization?: any }) =>
    api.post<{ success: boolean }>(`${BASE}/cart/add`, data),

  /** Update cart item quantity */
  updateCartItem: (itemId: string, data: { quantity: number }) =>
    api.put<{ success: boolean }>(`${BASE}/cart/item/${itemId}`, data),

  /** Remove cart item */
  removeCartItem: (itemId: string) =>
    api.delete<{ success: boolean }>(`${BASE}/cart/item/${itemId}`),

  /** Clear entire cart */
  clearCart: () =>
    api.delete<{ success: boolean }>(`${BASE}/cart/clear`),

  // ── Ordering ─────────────────────────────────────────────────────────────

  /** Place an order */
  placeOrder: (restaurantId: string, data: { type: string; items: any[]; total: number; paymentMethod: string; tableNumber?: string }) =>
    api.post<{ success: boolean; orderId: string }>(`${BASE}/${restaurantId}/order`, data),

  // ── Order Tracking & History ─────────────────────────────────────────────

  /** Order history */
  getOrderHistory: (params?: { type?: string }) =>
    api.get<{ data: any[]; total: number }>(`${ORDERS_BASE}/history`, params as any),

  /** Order detail */
  getOrderDetail: (orderId: string) =>
    api.get<any>(`${ORDERS_BASE}/${orderId}`),

  /** Order tracking */
  getOrderTracking: (orderId: string) =>
    api.get<any>(`${ORDERS_BASE}/${orderId}/tracking`),

  /** Order invoice */
  getOrderInvoice: (orderId: string) =>
    api.get<any>(`${ORDERS_BASE}/${orderId}/invoice`),

  /** Reorder */
  reorder: (orderId: string) =>
    api.post<{ success: boolean; cartId: string }>(`${ORDERS_BASE}/${orderId}/reorder`),

  /** Cancel order */
  cancelOrder: (orderId: string, data: { reason?: string; requestRefund?: boolean }) =>
    api.post<{ success: boolean }>(`${ORDERS_BASE}/${orderId}/cancel`, data),

  /** Rate delivery partner */
  rateDelivery: (orderId: string, data: { rating: number; comment?: string }) =>
    api.post<{ success: boolean }>(`${ORDERS_BASE}/${orderId}/rate-delivery`, data),

  /** Tip delivery partner */
  tipDelivery: (orderId: string, data: { amount: number }) =>
    api.post<{ success: boolean }>(`${ORDERS_BASE}/${orderId}/tip`, data),
};
