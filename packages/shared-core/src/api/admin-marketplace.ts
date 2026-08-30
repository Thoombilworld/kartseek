/**
 * KARTSEEK Admin Marketplace API Layer
 * All admin marketplace API calls go through this module.
 * Configured for: JWT auth, pagination, filters, sorting, audit logging.
 */

import { getAuthToken } from '@/lib/auth-token';
import { API_BASE_URL } from '@/lib/config/api-base';

// Fallback must include `/v1` — the gateway serves `/api/v1/*` and answers 404
// on `/api/*`. Masked today by NEXT_PUBLIC_API_URL being set, so it would only
// bite in an environment that forgets the variable.
// Gateway origin resolved once in lib/config/api-base.ts — it fails loudly
// in production rather than silently falling back to a developer machine.
const BASE_URL = API_BASE_URL;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: string;
  country?: string;
  category?: string;
  fromDate?: string;
  toDate?: string;
}

// ─── Auth Header ─────────────────────────────────────────────────────────────

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
  if (params.search) q.set('search', params.search);
  if (params.sortBy) q.set('sortBy', params.sortBy);
  if (params.sortOrder) q.set('sortOrder', params.sortOrder);
  if (params.status) q.set('status', params.status);
  if (params.country) q.set('country', params.country);
  if (params.category) q.set('category', params.category);
  if (params.fromDate) q.set('fromDate', params.fromDate);
  if (params.toDate) q.set('toDate', params.toDate);
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

// ─── Dashboard ───────────────────────────────────────────────────────────────

export const adminMarketplaceApi = {
  getDashboard: () => apiCall(`${BASE_URL}/admin/marketplace/dashboard`),

  // ── Sellers ────────────────────────────────────────────────────────────────
  getSellers:       (p: ListParams = {}) => apiCall(`${BASE_URL}/admin/marketplace/sellers${buildQuery(p)}`),
  getSellerById:    (id: string) => apiCall(`${BASE_URL}/admin/marketplace/sellers/${id}`),
  approveSeller:    (id: string, reason?: string) => apiCall(`${BASE_URL}/admin/marketplace/sellers/${id}/approve`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
  rejectSeller:     (id: string, reason: string) => apiCall(`${BASE_URL}/admin/marketplace/sellers/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
  suspendSeller:    (id: string, reason: string) => apiCall(`${BASE_URL}/admin/marketplace/sellers/${id}/suspend`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
  reactivateSeller: (id: string) => apiCall(`${BASE_URL}/admin/marketplace/sellers/${id}/reactivate`, { method: 'PATCH' }),

  // ── Products ───────────────────────────────────────────────────────────────
  getProducts:          (p: ListParams = {}) => apiCall(`${BASE_URL}/admin/marketplace/products${buildQuery(p)}`),
  getProductById:       (id: string) => apiCall(`${BASE_URL}/admin/marketplace/products/${id}`),
  approveProduct:       (id: string, reason?: string) => apiCall(`${BASE_URL}/admin/marketplace/products/${id}/approve`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
  rejectProduct:        (id: string, reason: string) => apiCall(`${BASE_URL}/admin/marketplace/products/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
  requestCorrection:    (id: string, notes: string) => apiCall(`${BASE_URL}/admin/marketplace/products/${id}/request-correction`, { method: 'PATCH', body: JSON.stringify({ notes }) }),
  publishProduct:       (id: string) => apiCall(`${BASE_URL}/admin/marketplace/products/${id}/publish`, { method: 'PATCH' }),
  unpublishProduct:     (id: string, reason?: string) => apiCall(`${BASE_URL}/admin/marketplace/products/${id}/unpublish`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
  featureProduct:       (id: string) => apiCall(`${BASE_URL}/admin/marketplace/products/${id}/feature`, { method: 'PATCH' }),
  unfeatureProduct:     (id: string) => apiCall(`${BASE_URL}/admin/marketplace/products/${id}/unfeature`, { method: 'PATCH' }),

  // ── Categories ─────────────────────────────────────────────────────────────
  getCategories:      (p: ListParams = {}) => apiCall(`${BASE_URL}/admin/marketplace/categories${buildQuery(p)}`),
  createCategory:     (data: Record<string, unknown>) => apiCall(`${BASE_URL}/admin/marketplace/categories`, { method: 'POST', body: JSON.stringify(data) }),
  // `category-list` is a *web route* name, not an API one — the gateway declares
  // `@Patch('categories/:id')`, so this 404'd and the admin category editor
  // failed with a generic "Request failed" every time.
  updateCategory:     (id: string, data: Record<string, unknown>) => apiCall(`${BASE_URL}/admin/marketplace/categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  getSubcategories:   (p: ListParams = {}) => apiCall(`${BASE_URL}/admin/marketplace/subcategories${buildQuery(p)}`),
  createSubcategory:  (data: Record<string, unknown>) => apiCall(`${BASE_URL}/admin/marketplace/subcategories`, { method: 'POST', body: JSON.stringify(data) }),
  updateSubcategory:  (id: string, data: Record<string, unknown>) => apiCall(`${BASE_URL}/admin/marketplace/subcategories/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  getAttributes:      (categoryId?: string) => apiCall(`${BASE_URL}/admin/marketplace/attributes${categoryId ? `?categoryId=${categoryId}` : ''}`),
  createAttribute:    (data: Record<string, unknown>) => apiCall(`${BASE_URL}/admin/marketplace/attributes`, { method: 'POST', body: JSON.stringify(data) }),
  updateAttribute:    (id: string, data: Record<string, unknown>) => apiCall(`${BASE_URL}/admin/marketplace/attributes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // ── Brands ─────────────────────────────────────────────────────────────────
  getBrands:              (p: ListParams = {}) => apiCall(`${BASE_URL}/admin/marketplace/brands${buildQuery(p)}`),
  getBrandCenter:         (p: ListParams = {}) => apiCall(`${BASE_URL}/admin/marketplace/brand-center${buildQuery(p)}`),
  approveBrand:           (id: string) => apiCall(`${BASE_URL}/admin/marketplace/brands/${id}/approve`, { method: 'PATCH' }),
  rejectBrand:            (id: string, reason: string) => apiCall(`${BASE_URL}/admin/marketplace/brands/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
  requestBrandCorrection: (id: string, notes: string) => apiCall(`${BASE_URL}/admin/marketplace/brands/${id}/request-correction`, { method: 'PATCH', body: JSON.stringify({ notes }) }),

  // ── Campaigns ──────────────────────────────────────────────────────────────
  getCampaigns:      (p: ListParams = {}) => apiCall(`${BASE_URL}/admin/marketplace/campaigns${buildQuery(p)}`),
  approveCampaign:   (id: string) => apiCall(`${BASE_URL}/admin/marketplace/campaigns/${id}/approve`, { method: 'PATCH' }),
  rejectCampaign:    (id: string, reason: string) => apiCall(`${BASE_URL}/admin/marketplace/campaigns/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
  pauseCampaign:     (id: string) => apiCall(`${BASE_URL}/admin/marketplace/campaigns/${id}/pause`, { method: 'PATCH' }),
  resumeCampaign:    (id: string) => apiCall(`${BASE_URL}/admin/marketplace/campaigns/${id}/resume`, { method: 'PATCH' }),

  // ── Orders / Returns / Refunds ─────────────────────────────────────────────
  getOrders:    (p: ListParams = {}) => apiCall(`${BASE_URL}/admin/marketplace/orders${buildQuery(p)}`),
  getReturns:   (p: ListParams = {}) => apiCall(`${BASE_URL}/admin/marketplace/returns${buildQuery(p)}`),
  getRefunds:   (p: ListParams = {}) => apiCall(`${BASE_URL}/admin/marketplace/refunds${buildQuery(p)}`),

  // ── Finance ────────────────────────────────────────────────────────────────
  getCommissions: (p: ListParams = {}) => apiCall(`${BASE_URL}/admin/marketplace/commissions${buildQuery(p)}`),
  getPayouts:     (p: ListParams = {}) => apiCall(`${BASE_URL}/admin/marketplace/payouts${buildQuery(p)}`),

  // ── Reports / Audit ────────────────────────────────────────────────────────
  getReports:   (p: ListParams = {}) => apiCall(`${BASE_URL}/admin/marketplace/reports${buildQuery(p)}`),
  getAuditLogs: (p: ListParams = {}) => apiCall(`${BASE_URL}/admin/marketplace/audit-logs${buildQuery(p)}`),
} as const;

export default adminMarketplaceApi;
