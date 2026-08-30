import { API_BASE_URL } from '@/lib/config/api-base';
/**
 * KARTSEEK Vendor Restaurant API Layer
 * Vendor-facing API calls for restaurant portal.
 * Maps to: restaurant-service vendor routes (52 routes)
 */

// Fallback must include `/v1` — the gateway serves `/api/v1/*` and answers 404
// on `/api/*`. Masked today by NEXT_PUBLIC_API_URL being set, so it would only
// bite in an environment that forgets the variable.
// Gateway origin resolved once in lib/config/api-base.ts — it fails loudly
// in production rather than silently falling back to a developer machine.
const BASE_URL = API_BASE_URL;
const BASE = `${BASE_URL}/restaurants`;

export interface ListParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

function getHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('vendorToken') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiCall<T>(url: string, options?: RequestInit): Promise<{ success: boolean; data: T; error?: string }> {
  try {
    const res = await fetch(url, { headers: getHeaders(), ...options });
    const json = await res.json();
    if (!res.ok) return { success: false, data: null as T, error: json.message || 'Request failed' };
    return { success: true, data: json.data ?? json };
  } catch (err) {
    return { success: false, data: null as T, error: 'Network error' };
  }
}

export const vendorRestaurantApi = {
  // ── Profile & Status ──────────────────────────────────────────
  getProfile:    (id: string)         => apiCall(`${BASE}/${id}/profile`),
  updateProfile: (id: string, data: Record<string, unknown>) => apiCall(`${BASE}/${id}/profile`, { method: 'PUT', body: JSON.stringify(data) }),
  updateStatus:  (data: { isOnline: boolean })               => apiCall(`${BASE}/status`, { method: 'PUT', body: JSON.stringify(data) }),

  // ── Menu Management ───────────────────────────────────────────
  getMenu:           (id: string, params?: { category?: string }) => apiCall(`${BASE}/${id}/menu${params?.category ? `?category=${params.category}` : ''}`),
  getMenuCategories: ()                                           => apiCall(`${BASE}/menu-categories`),
  createMenuCategory: (data: Record<string, unknown>)            => apiCall(`${BASE}/menu-category`, { method: 'POST', body: JSON.stringify(data) }),
  updateMenuCategory: (catId: string, data: Record<string, unknown>) => apiCall(`${BASE}/menu-category/${catId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMenuCategory: (catId: string)                            => apiCall(`${BASE}/menu-category/${catId}`, { method: 'DELETE' }),
  createMenuItem:     (data: Record<string, unknown>)            => apiCall(`${BASE}/menu-item`, { method: 'POST', body: JSON.stringify(data) }),
  updateMenuItem:     (itemId: string, data: Record<string, unknown>) => apiCall(`${BASE}/menu-item/${itemId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMenuItem:     (itemId: string)                           => apiCall(`${BASE}/menu-item/${itemId}`, { method: 'DELETE' }),

  // ── Orders ────────────────────────────────────────────────────
  getOrders:      (id: string, params?: ListParams) => apiCall(`${BASE}/${id}/orders${params?.page ? `?page=${params.page}` : ''}`),
  getOrderDetail: (restId: string, orderId: string) => apiCall(`${BASE}/${restId}/orders/${orderId}`),
  acceptOrder:    (restId: string, orderId: string) => apiCall(`${BASE}/${restId}/orders/${orderId}/accept`, { method: 'POST' }),
  rejectOrder:    (restId: string, orderId: string) => apiCall(`${BASE}/${restId}/orders/${orderId}/reject`, { method: 'POST' }),
  updateOrderStatus: (restId: string, orderId: string, data: { status: string }) => apiCall(`${BASE}/${restId}/orders/${orderId}/status`, { method: 'PUT', body: JSON.stringify(data) }),

  // ── Reservations & Tables ─────────────────────────────────────
  getReservations:       (id: string)                         => apiCall(`${BASE}/${id}/reservations`),
  updateReservationStatus: (resId: string, data: { status: string }) => apiCall(`${BASE}/reservations/${resId}/status`, { method: 'PUT', body: JSON.stringify(data) }),
  getTables:             (id: string)                         => apiCall(`${BASE}/${id}/tables`),
  updateTable:           (id: string, tableId: string, data: Record<string, unknown>) => apiCall(`${BASE}/${id}/tables/${tableId}`, { method: 'PUT', body: JSON.stringify(data) }),

  // ── Earnings & Payouts ────────────────────────────────────────
  getEarnings:   (id: string) => apiCall(`${BASE}/${id}/earnings`),
  getPayouts:    (id: string) => apiCall(`${BASE}/${id}/payouts`),

  // ── Promotions ────────────────────────────────────────────────
  getPromotions:    (id: string) => apiCall(`${BASE}/${id}/promotions`),
  createPromotion:  (id: string, data: Record<string, unknown>) => apiCall(`${BASE}/${id}/promotions`, { method: 'POST', body: JSON.stringify(data) }),
  updatePromotion:  (id: string, promoId: string, data: Record<string, unknown>) => apiCall(`${BASE}/${id}/promotions/${promoId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePromotion:  (id: string, promoId: string) => apiCall(`${BASE}/${id}/promotions/${promoId}`, { method: 'DELETE' }),

  // ── Staff ─────────────────────────────────────────────────────
  getStaff:    (id: string) => apiCall(`${BASE}/${id}/staff`),
  addStaff:    (id: string, data: Record<string, unknown>) => apiCall(`${BASE}/${id}/staff`, { method: 'POST', body: JSON.stringify(data) }),
  updateStaff: (id: string, staffId: string, data: Record<string, unknown>) => apiCall(`${BASE}/${id}/staff/${staffId}`, { method: 'PUT', body: JSON.stringify(data) }),
  removeStaff: (id: string, staffId: string) => apiCall(`${BASE}/${id}/staff/${staffId}`, { method: 'DELETE' }),

  // ── Analytics & Inventory ─────────────────────────────────────
  getAnalytics:     (id: string) => apiCall(`${BASE}/${id}/analytics`),
  getInventory:     (id: string) => apiCall(`${BASE}/${id}/inventory`),
  updateInventory:  (id: string, itemId: string, data: Record<string, unknown>) => apiCall(`${BASE}/${id}/inventory/${itemId}`, { method: 'PUT', body: JSON.stringify(data) }),

  // ── Reviews ───────────────────────────────────────────────────
  getReviews:    (id: string, params?: { page?: number }) => apiCall(`${BASE}/${id}/reviews${params?.page ? `?page=${params.page}` : ''}`),

  // ── Offers ────────────────────────────────────────────────────
  getOffers:     (id: string) => apiCall(`${BASE}/${id}/offers`),
} as const;

export default vendorRestaurantApi;
