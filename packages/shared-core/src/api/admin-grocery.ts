/**
 * KARTSEEK Admin Grocery API Layer
 *
 * Every admin grocery call goes through here. Maps to `admin-grocery.controller.ts`.
 *
 * Sixteen of these eighteen routes had no handler on grocery-service and answered
 * 503 for the whole admin section; they are implemented now (`GroceryAdminService`).
 * Fifteen of them also double-wrapped their payload — the handler returned
 * `{ data: X }` and the gateway's TransformInterceptor wrapped that again — so
 * callers reading `res.data` got `{ data: X }` and every field came out undefined.
 * The gateway no longer wraps manually, and `apiCall` below unwraps exactly one
 * envelope.
 */

import { getAuthToken } from '@/lib/auth-token';
import { API_BASE_URL } from '@/lib/config/api-base';

// Gateway origin resolved once in lib/config/api-base.ts — it fails loudly in
// production rather than silently falling back to a developer machine.
const BASE_URL = API_BASE_URL;

export interface ListParams {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
  search?: string;
  storeId?: string;
  regionCode?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

function getHeaders(): HeadersInit {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function buildQuery(params: ListParams): string {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') q.set(key, String(value));
  }
  return q.toString() ? `?${q.toString()}` : '';
}

async function apiCall<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(url, { headers: getHeaders(), ...options });
    // A 204 has no body; calling .json() on it throws and the whole call was
    // reported as a network error.
    const json = res.status === 204 ? null : await res.json().catch(() => null);
    if (!res.ok) {
      return {
        success: false,
        data: null as T,
        error: (json as any)?.message || `Request failed (${res.status})`,
      };
    }
    return { success: true, data: ((json as any)?.data ?? json) as T, message: (json as any)?.message };
  } catch {
    return { success: false, data: null as T, error: 'Network error — please check the API Gateway' };
  }
}

// ── Response shapes ──────────────────────────────────────────────────────────

export interface AdminGroceryDashboard {
  stores: { total: number; approved: number; pending: number; suspended: number };
  products: { total: number };
  orders: { total: number; last30Days: number; byStatus: Record<string, number> };
  revenue: { last30Days: number };
  moderation: { pendingFlashDeals: number; pendingStores: number };
  generatedAt: string;
}

export interface AdminGroceryStore {
  id: string;
  name: string;
  slug?: string;
  ownerId?: string;
  address?: string;
  phone?: string;
  status: 'PENDING_KYC' | 'APPROVED' | 'SUSPENDED';
  isOnline: boolean;
  rating: number;
  totalOrders: number;
  productCount: number;
  regionCode?: string;
  franchiseId?: string;
  createdAt: string;
}

export interface Paginated<T> { data: T[]; total: number; page: number; limit: number }

export const adminGroceryApi = {
  // ── Dashboard ─────────────────────────────────────────────────
  getDashboard: () => apiCall<AdminGroceryDashboard>(`${BASE_URL}/admin/grocery/dashboard`),

  // ── Stores ────────────────────────────────────────────────────
  getStores:    (p: ListParams = {}) => apiCall<Paginated<AdminGroceryStore>>(`${BASE_URL}/admin/grocery/stores${buildQuery(p)}`),
  getStoreById: (id: string)         => apiCall<AdminGroceryStore & { stats: Record<string, number> }>(`${BASE_URL}/admin/grocery/stores/${id}`),
  approveStore: (id: string)         => apiCall(`${BASE_URL}/admin/grocery/stores/${id}/approve`, { method: 'PATCH', body: JSON.stringify({}) }),
  suspendStore: (id: string, reason?: string) =>
    apiCall(`${BASE_URL}/admin/grocery/stores/${id}/suspend`, { method: 'PATCH', body: JSON.stringify({ reason }) }),

  // ── Products ──────────────────────────────────────────────────
  getProducts: (p: ListParams = {}) => apiCall<Paginated<Record<string, unknown>>>(`${BASE_URL}/admin/grocery/products${buildQuery(p)}`),

  // ── Orders ────────────────────────────────────────────────────
  getOrders: (p: ListParams = {}) => apiCall<Paginated<Record<string, unknown>>>(`${BASE_URL}/admin/grocery/orders${buildQuery(p)}`),

  // ── Categories ────────────────────────────────────────────────
  getCategories:  () => apiCall<{ categories: Array<Record<string, unknown>>; total: number; source: string }>(`${BASE_URL}/admin/grocery/categories`),
  createCategory: (data: { name: string; emoji?: string; description?: string; parentId?: string; sortOrder?: number }) =>
    apiCall(`${BASE_URL}/admin/grocery/categories`, { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id: string, data: Record<string, unknown>) =>
    apiCall(`${BASE_URL}/admin/grocery/categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteCategory: (id: string) =>
    apiCall(`${BASE_URL}/admin/grocery/categories/${id}`, { method: 'DELETE' }),

  // ── Delivery Zones ────────────────────────────────────────────
  getDeliveryZones:   (regionCode?: string) => apiCall<{ data: Array<Record<string, unknown>>; total: number }>(`${BASE_URL}/admin/grocery/delivery-zones${buildQuery({ regionCode })}`),
  createDeliveryZone: (data: Record<string, unknown>) => apiCall(`${BASE_URL}/admin/grocery/delivery-zones`, { method: 'POST', body: JSON.stringify(data) }),
  updateDeliveryZone: (id: string, data: Record<string, unknown>) => apiCall(`${BASE_URL}/admin/grocery/delivery-zones/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteDeliveryZone: (id: string) => apiCall(`${BASE_URL}/admin/grocery/delivery-zones/${id}`, { method: 'DELETE' }),

  // ── Flash Deals (moderation queue) ────────────────────────────
  getFlashDeals:     (p: ListParams = {}) => apiCall<Paginated<Record<string, unknown>>>(`${BASE_URL}/admin/grocery/flash-deals${buildQuery(p)}`),
  createFlashDeal:   (data: Record<string, unknown>) => apiCall(`${BASE_URL}/admin/grocery/flash-deals`, { method: 'POST', body: JSON.stringify(data) }),

  // ── Listing moderation ────────────────────────────────────────
  /**
   * Listings waiting for a decision, across the whole platform.
   *
   * Separate from `getProducts` because that endpoint paginates the entire
   * catalogue — 200-plus rows — and a moderator opening this screen needs the
   * handful awaiting review, not page 1 of everything. Filtering the loaded
   * page client-side found nothing, which is exactly the reported symptom.
   */
  getPendingProducts: (p: { page?: number; limit?: number; storeId?: string } = {}) =>
    apiCall<Paginated<Record<string, unknown>>>(`${BASE_URL}/grocery/admin/products/pending${buildQuery(p)}`),

  /**
   * A seller's new product is PENDING until a moderator approves it, and is
   * invisible to shoppers until then. These are the two decisions.
   */
  approveProduct: (id: string) =>
    apiCall(`${BASE_URL}/grocery/admin/products/${id}/approve`, { method: 'PATCH', body: JSON.stringify({}) }),
  rejectProduct: (id: string, reason: string) =>
    apiCall(`${BASE_URL}/grocery/admin/products/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ reason }) }),

  approveFlashDeal:  (id: string) => apiCall(`${BASE_URL}/admin/grocery/flash-deals/${id}/approve`, { method: 'PATCH', body: JSON.stringify({}) }),
  rejectFlashDeal:   (id: string, reason: string) => apiCall(`${BASE_URL}/admin/grocery/flash-deals/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ reason }) }),

  // ── Reports ───────────────────────────────────────────────────
  getReports: (period = '30d') => apiCall<{
    period: string;
    summary: { orders: number; revenue: number; averageOrderValue: number; delivered: number; cancelled: number; cancellationRate: number };
    daily: Array<{ date: string; orders: number; revenue: number }>;
    topStores: Array<{ storeId: string; storeName: string; orders: number; revenue: number }>;
    productsByCategory: Array<{ category: string; products: number }>;
  }>(`${BASE_URL}/admin/grocery/reports?period=${encodeURIComponent(period)}`),

  // ── Settings ──────────────────────────────────────────────────
  getSettings:    () => apiCall<{ settings: Record<string, unknown>; defaults: Record<string, unknown>; overridden: string[]; updatedAt: string | null }>(`${BASE_URL}/admin/grocery/settings`),
  updateSettings: (data: Record<string, unknown>) => apiCall(`${BASE_URL}/admin/grocery/settings`, { method: 'POST', body: JSON.stringify(data) }),
} as const;

export default adminGroceryApi;
