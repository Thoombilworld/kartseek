/**
 * KARTSEEK Admin Pharmacy API Layer
 * All admin pharmacy API calls go through this module.
 * Maps to: admin-pharmacy.controller.ts (19 routes)
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
  category?: string;
  search?: string;
  /** Named for the query param the gateway controller actually reads (`@Query('countryCode')`). */
  countryCode?: string;
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
  if (params.category) q.set('category', params.category);
  if (params.search) q.set('search', params.search);
  if (params.countryCode) q.set('countryCode', params.countryCode);
  return q.toString() ? `?${q.toString()}` : '';
}

async function apiCall<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(url, { headers: getHeaders(), ...options });
    const json = await res.json();
    if (!res.ok)
      return { success: false, data: null as T, error: json.message || 'Request failed' };
    return { success: true, data: json.data ?? json, message: json.message };
  } catch (err) {
    return { success: false, data: null as T, error: 'Network error — please check API Gateway' };
  }
}

export const adminPharmacyApi = {
  // ── Dashboard ─────────────────────────────────────────────────
  getDashboard: (countryCode?: string) =>
    apiCall(`${BASE_URL}/admin/pharmacy/dashboard${buildQuery({ countryCode })}`),

  // ── Stores (Pharmacies) ───────────────────────────────────────
  getStores: (p: ListParams = {}) => apiCall(`${BASE_URL}/admin/pharmacy/stores${buildQuery(p)}`),
  getStoreById: (id: string) => apiCall(`${BASE_URL}/admin/pharmacy/stores/${id}`),
  approveStore: (id: string) =>
    apiCall(`${BASE_URL}/admin/pharmacy/stores/${id}/approve`, { method: 'PATCH' }),
  suspendStore: (id: string, reason?: string) =>
    apiCall(`${BASE_URL}/admin/pharmacy/stores/${id}/suspend`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    }),

  // ── Products ──────────────────────────────────────────────────
  getProducts: (p: ListParams = {}) =>
    apiCall(`${BASE_URL}/admin/pharmacy/products${buildQuery(p)}`),
  approveProduct: (id: string) =>
    apiCall(`${BASE_URL}/admin/pharmacy/products/${id}/approve`, { method: 'PATCH' }),

  // ── Orders ────────────────────────────────────────────────────
  getOrders: (p: ListParams = {}) => apiCall(`${BASE_URL}/admin/pharmacy/orders${buildQuery(p)}`),

  // ── Prescriptions ─────────────────────────────────────────────
  getPrescriptions: (page = 1, countryCode?: string) =>
    apiCall(`${BASE_URL}/admin/pharmacy/prescriptions${buildQuery({ page, countryCode })}`),
  approvePrescription: (id: string) =>
    apiCall(`${BASE_URL}/admin/pharmacy/prescriptions/${id}/approve`, { method: 'PATCH' }),

  // ── Verifications ─────────────────────────────────────────────
  getVerifications: (status?: string, countryCode?: string) =>
    apiCall(`${BASE_URL}/admin/pharmacy/verifications${buildQuery({ status, countryCode })}`),
  verifyLicense: (id: string, data: { verified: boolean; notes?: string }) =>
    apiCall(`${BASE_URL}/admin/pharmacy/verifications/${id}/verify`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // ── Categories ────────────────────────────────────────────────
  // Taxonomy, not a market's own list — no countryCode: `/admin/pharmacy/categories`
  // carries no `@Query('countryCode')` on the gateway.
  getCategories: () => apiCall(`${BASE_URL}/admin/pharmacy/categories`),
  createCategory: (data: { name: string; icon?: string }) =>
    apiCall(`${BASE_URL}/admin/pharmacy/categories`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // ── Commissions ───────────────────────────────────────────────
  getCommissions: (countryCode?: string) =>
    apiCall(`${BASE_URL}/admin/pharmacy/commissions${buildQuery({ countryCode })}`),

  // ── Settlements ───────────────────────────────────────────────
  getSettlements: (page = 1, countryCode?: string) =>
    apiCall(`${BASE_URL}/admin/pharmacy/settlements${buildQuery({ page, countryCode })}`),

  // ── Reports ───────────────────────────────────────────────────
  getReports: (period = '30d', countryCode?: string) =>
    apiCall(
      `${BASE_URL}/admin/pharmacy/reports?period=${period}${countryCode ? `&countryCode=${encodeURIComponent(countryCode)}` : ''}`,
    ),

  // ── Settings ──────────────────────────────────────────────────
  getSettings: (countryCode?: string) =>
    apiCall(`${BASE_URL}/admin/pharmacy/settings${buildQuery({ countryCode })}`),
  updateSettings: (data: Record<string, unknown>) =>
    apiCall(`${BASE_URL}/admin/pharmacy/settings`, { method: 'POST', body: JSON.stringify(data) }),
} as const;

export default adminPharmacyApi;
