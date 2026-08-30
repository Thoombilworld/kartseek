/**
 * KARTSEEK Admin Taxi API Layer
 * All admin taxi API calls go through this module.
 * Maps to: admin-taxi.controller.ts (26 routes)
 */

import { getAuthToken } from '../auth-token';
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

export const adminTaxiApi = {
  // ── Dashboard ─────────────────────────────────────────────────
  getDashboard: () => apiCall(`${BASE_URL}/admin/taxi/dashboard`),

  // ── Vendors ───────────────────────────────────────────────────
  getVendors:      (p: ListParams = {}) => apiCall(`${BASE_URL}/admin/taxi/vendors${buildQuery(p)}`),
  getVendorById:   (id: string)         => apiCall(`${BASE_URL}/admin/taxi/vendors/${id}`),
  approveVendor:   (id: string)         => apiCall(`${BASE_URL}/admin/taxi/vendors/${id}/approve`, { method: 'PATCH' }),
  suspendVendor:   (id: string, reason?: string) => apiCall(`${BASE_URL}/admin/taxi/vendors/${id}/suspend`, { method: 'PATCH', body: JSON.stringify({ reason }) }),

  // ── Drivers ───────────────────────────────────────────────────
  getDrivers:      (p: ListParams = {}) => apiCall(`${BASE_URL}/admin/taxi/drivers${buildQuery(p)}`),
  getDriverById:   (id: string)         => apiCall(`${BASE_URL}/admin/taxi/drivers/${id}`),
  approveDriver:   (id: string)         => apiCall(`${BASE_URL}/admin/taxi/drivers/${id}/approve`, { method: 'PATCH' }),
  suspendDriver:   (id: string, reason: string) => apiCall(`${BASE_URL}/admin/taxi/drivers/${id}/suspend`, { method: 'PATCH', body: JSON.stringify({ reason }) }),

  // ── Rides ─────────────────────────────────────────────────────
  getRides:    (p: ListParams = {}) => apiCall(`${BASE_URL}/admin/taxi/rides${buildQuery(p)}`),
  getRideById: (id: string)         => apiCall(`${BASE_URL}/admin/taxi/rides/${id}`),

  // ── Pricing ───────────────────────────────────────────────────
  getPricing:    ()                              => apiCall(`${BASE_URL}/admin/taxi/pricing`),
  updatePricing: (data: Record<string, unknown>) => apiCall(`${BASE_URL}/admin/taxi/pricing`, { method: 'POST', body: JSON.stringify(data) }),

  // ── Surge ─────────────────────────────────────────────────────
  getSurge:    ()                              => apiCall(`${BASE_URL}/admin/taxi/surge`),
  updateSurge: (data: Record<string, unknown>) => apiCall(`${BASE_URL}/admin/taxi/surge`, { method: 'POST', body: JSON.stringify(data) }),

  // ── Complaints ────────────────────────────────────────────────
  getComplaints:    (p: ListParams = {}) => apiCall(`${BASE_URL}/admin/taxi/complaints${buildQuery(p)}`),
  resolveComplaint: (id: string, resolution: string) => apiCall(`${BASE_URL}/admin/taxi/complaints/${id}/resolve`, { method: 'PATCH', body: JSON.stringify({ resolution }) }),

  // ── Fleet ─────────────────────────────────────────────────────
  getFleet: (page = 1) => apiCall(`${BASE_URL}/admin/taxi/fleet?page=${page}`),

  // ── Payouts ───────────────────────────────────────────────────
  getPayouts:    (p: ListParams = {}) => apiCall(`${BASE_URL}/admin/taxi/payouts${buildQuery(p)}`),
  approvePayout: (id: string)         => apiCall(`${BASE_URL}/admin/taxi/payouts/${id}/approve`, { method: 'POST' }),

  // ── Routes ────────────────────────────────────────────────────
  getRoutes:   ()                              => apiCall(`${BASE_URL}/admin/taxi/routes`),
  createRoute: (data: Record<string, unknown>) => apiCall(`${BASE_URL}/admin/taxi/routes`, { method: 'POST', body: JSON.stringify(data) }),

  // ── Pending Approvals ─────────────────────────────────────────
  getPendingApprovals: () => apiCall(`${BASE_URL}/admin/taxi/pending-approvals`),

  // ── Compliance ────────────────────────────────────────────────
  getCompliance: () => apiCall(`${BASE_URL}/admin/taxi/compliance`),

  // ── Settings ──────────────────────────────────────────────────
  getSettings:    ()                              => apiCall(`${BASE_URL}/admin/taxi/settings`),
  updateSettings: (data: Record<string, unknown>) => apiCall(`${BASE_URL}/admin/taxi/settings`, { method: 'POST', body: JSON.stringify(data) }),
} as const;

export default adminTaxiApi;
