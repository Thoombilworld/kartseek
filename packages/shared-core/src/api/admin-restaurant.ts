/**
 * KARTSEEK Admin Restaurant API Layer
 * All admin restaurant API calls go through this module.
 * Maps to: admin-restaurant.controller.ts (17 routes)
 */

import { getAuthToken } from '@/lib/auth-token';
import { API_BASE_URL } from '@/lib/config/api-base';

// Fallback must include `/v1` — the gateway serves `/api/v1/*` and answers 404
// on `/api/*`. Masked today by NEXT_PUBLIC_API_URL being set, so it would only
// bite in an environment that forgets the variable.
// Gateway origin resolved once in lib/config/api-base.ts — it fails loudly
// in production rather than silently falling back to a developer machine.
const BASE_URL = API_BASE_URL;

export interface ListParams {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  search?: string;
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
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  if (params.status) q.set('status', params.status);
  if (params.type) q.set('type', params.type);
  if (params.search) q.set('search', params.search);
  return q.toString() ? `?${q.toString()}` : '';
}

async function apiCall<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(url, { headers: getHeaders(), ...options });
    const json = await res.json();
    if (!res.ok) return { success: false, data: null as T, error: json.message || 'Request failed' };
    return { success: true, data: json.data ?? json, message: json.message };
  } catch (err) {
    return { success: false, data: null as T, error: 'Network error — please check API Gateway' };
  }
}

export const adminRestaurantApi = {
  // ── Dashboard ─────────────────────────────────────────────────
  getDashboard: () => apiCall(`${BASE_URL}/admin/restaurant/dashboard`),

  // ── Restaurants ───────────────────────────────────────────────
  getRestaurants:     (p: ListParams = {}) => apiCall(`${BASE_URL}/admin/restaurant/restaurants${buildQuery(p)}`),
  getRestaurantById:  (id: string)         => apiCall(`${BASE_URL}/admin/restaurant/restaurants/${id}`),
  approveRestaurant:  (id: string)         => apiCall(`${BASE_URL}/admin/restaurant/restaurants/${id}/approve`, { method: 'PATCH' }),
  suspendRestaurant:  (id: string, reason?: string) => apiCall(`${BASE_URL}/admin/restaurant/restaurants/${id}/suspend`, { method: 'PATCH', body: JSON.stringify({ reason }) }),

  // ── Orders ────────────────────────────────────────────────────
  getOrders: (p: ListParams = {}) => apiCall(`${BASE_URL}/admin/restaurant/orders${buildQuery(p)}`),

  // ── Menu Approvals ────────────────────────────────────────────
  getMenuApprovals: (page = 1) => apiCall(`${BASE_URL}/admin/restaurant/menu-approvals?page=${page}`),
  approveMenuItem:  (id: string) => apiCall(`${BASE_URL}/admin/restaurant/menu-approvals/${id}/approve`, { method: 'PATCH' }),

  // ── Complaints ────────────────────────────────────────────────
  getComplaints:    (p: ListParams = {}) => apiCall(`${BASE_URL}/admin/restaurant/complaints${buildQuery(p)}`),
  resolveComplaint: (id: string, resolution: string) => apiCall(`${BASE_URL}/admin/restaurant/complaints/${id}/resolve`, { method: 'PATCH', body: JSON.stringify({ resolution }) }),

  // ── Commissions ───────────────────────────────────────────────
  getCommissions:    () => apiCall(`${BASE_URL}/admin/restaurant/commissions`),
  updateCommissions: (data: Record<string, unknown>) => apiCall(`${BASE_URL}/admin/restaurant/commissions`, { method: 'POST', body: JSON.stringify(data) }),

  // ── Cuisines ──────────────────────────────────────────────────
  getCuisines:   ()                                 => apiCall(`${BASE_URL}/admin/restaurant/cuisines`),
  createCuisine: (data: { name: string; icon?: string }) => apiCall(`${BASE_URL}/admin/restaurant/cuisines`, { method: 'POST', body: JSON.stringify(data) }),

  // ── Analytics ─────────────────────────────────────────────────
  getAnalytics: (period = '7d') => apiCall(`${BASE_URL}/admin/restaurant/analytics?period=${period}`),

  // ── Zones ─────────────────────────────────────────────────────
  getZones:   ()                              => apiCall(`${BASE_URL}/admin/restaurant/zones`),
  createZone: (data: Record<string, unknown>) => apiCall(`${BASE_URL}/admin/restaurant/zones`, { method: 'POST', body: JSON.stringify(data) }),
} as const;

export default adminRestaurantApi;
