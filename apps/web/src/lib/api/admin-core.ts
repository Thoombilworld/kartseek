/**
 * KARTSEEK Admin Core API Layer
 * Handles admin-service endpoints: users, KYC, sellers, orders, commissions, payouts, audit logs.
 * Uses the same pattern as admin-marketplace.ts.
 */

import { getAuthToken } from '../auth-token';
import { API_BASE_URL } from '@/lib/config/api-base';

// Gateway origin resolved once in lib/config/api-base.ts — it fails loudly in
// production rather than silently falling back to a developer machine. Note the
// value must include `/v1`: the gateway serves `/api/v1/*` and answers 404 on
// `/api/*`, so a variable set to the bare origin breaks every call here.
const BASE_URL = API_BASE_URL;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore?: boolean;
}

export interface AdminApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface AdminListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  country?: string;
  role?: string;
  category?: string;
}

// ─── Auth Header ─────────────────────────────────────────────────────────────

function getHeaders(): HeadersInit {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function buildQuery(params: AdminListParams): string {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') q.set(key, String(value));
  });
  return q.toString() ? `?${q.toString()}` : '';
}

async function apiCall<T>(url: string, options?: RequestInit): Promise<AdminApiResponse<T>> {
  try {
    const res = await fetch(url, { headers: getHeaders(), ...options });
    const json = await res.json();
    if (!res.ok) return { success: false, data: null as T, error: json.message || `Request failed (${res.status})` };
    return { success: true, data: json.data ?? json, message: json.message };
  } catch (err) {
    return { success: false, data: null as T, error: 'Network error — API Gateway unreachable' };
  }
}

// ─── Admin Core API ──────────────────────────────────────────────────────────

export const adminCoreApi = {
  // ── Dashboard ─────────────────────────────────────────────────────────────
  getDashboard: () => apiCall(`${BASE_URL}/admin/dashboard`),
  getPlatformHealth: () => apiCall(`${BASE_URL}/admin/platform/health`),

  // ── Users ─────────────────────────────────────────────────────────────────
  getUsers: (p: AdminListParams = {}) => apiCall(`${BASE_URL}/admin/users${buildQuery(p)}`),
  banUser: (userId: string, reason: string, adminId: string) =>
    apiCall(`${BASE_URL}/admin/users/${userId}/ban`, { method: 'PUT', body: JSON.stringify({ reason, adminId }) }),
  unbanUser: (userId: string, adminId: string) =>
    apiCall(`${BASE_URL}/admin/users/${userId}/unban`, { method: 'PUT', body: JSON.stringify({ adminId }) }),

  // ── KYC Verification ──────────────────────────────────────────────────────
  getPendingKyc: (p: AdminListParams = {}) => apiCall(`${BASE_URL}/admin/kyc/pending${buildQuery(p)}`),
  approveKyc: (entityId: string, entityType: string, adminId: string) =>
    apiCall(`${BASE_URL}/admin/kyc/${entityId}/approve`, { method: 'POST', body: JSON.stringify({ entityType, adminId }) }),
  rejectKyc: (entityId: string, entityType: string, adminId: string, reason: string) =>
    apiCall(`${BASE_URL}/admin/kyc/${entityId}/reject`, { method: 'POST', body: JSON.stringify({ entityType, adminId, reason }) }),

  // ── Sellers (via marketplace API) ─────────────────────────────────────────
  getSellers: (p: AdminListParams = {}) => apiCall(`${BASE_URL}/admin/marketplace/sellers${buildQuery(p)}`),
  approveSeller: (id: string, adminId: string) =>
    apiCall(`${BASE_URL}/admin/marketplace/sellers/${id}/approve`, { method: 'PATCH', body: JSON.stringify({ adminId }) }),
  suspendSeller: (id: string, reason: string, adminId: string) =>
    apiCall(`${BASE_URL}/admin/marketplace/sellers/${id}/suspend`, { method: 'PATCH', body: JSON.stringify({ reason, adminId }) }),
  reactivateSeller: (id: string, adminId: string) =>
    apiCall(`${BASE_URL}/admin/marketplace/sellers/${id}/reactivate`, { method: 'PATCH', body: JSON.stringify({ adminId }) }),
  blockSeller: (id: string, reason: string, adminId: string) =>
    apiCall(`${BASE_URL}/admin/users/${id}/ban`, { method: 'PUT', body: JSON.stringify({ reason, adminId }) }),
  unblockSeller: (id: string, adminId: string) =>
    apiCall(`${BASE_URL}/admin/users/${id}/unban`, { method: 'PUT', body: JSON.stringify({ adminId }) }),

  // ── Orders ────────────────────────────────────────────────────────────────
  getOrders: (p: AdminListParams = {}) => apiCall(`${BASE_URL}/admin/marketplace/orders${buildQuery(p)}`),

  // ── Commissions ───────────────────────────────────────────────────────────
  getCommissions: (p: AdminListParams = {}) => apiCall(`${BASE_URL}/admin/marketplace/commissions${buildQuery(p)}`),
  updateCommission: (id: string, rate: number, adminId: string) =>
    apiCall(`${BASE_URL}/admin/marketplace/commissions/${id}`, { method: 'PATCH', body: JSON.stringify({ rate, adminId }) }),

  // ── Payouts ───────────────────────────────────────────────────────────────
  getPayouts: (p: AdminListParams = {}) => apiCall(`${BASE_URL}/admin/marketplace/payouts${buildQuery(p)}`),
  approvePayout: (id: string, adminId: string) =>
    apiCall(`${BASE_URL}/admin/marketplace/payouts/${id}/approve`, { method: 'PATCH', body: JSON.stringify({ adminId }) }),
  retryPayout: (id: string, adminId: string) =>
    apiCall(`${BASE_URL}/admin/marketplace/payouts/${id}/retry`, { method: 'POST', body: JSON.stringify({ adminId }) }),

  // ── Audit Logs ────────────────────────────────────────────────────────────
  getAuditLogs: (p: AdminListParams = {}) => apiCall(`${BASE_URL}/admin/audit-logs${buildQuery(p)}`),
  addAuditLog: (entry: { action: string; adminId: string; entityType: string; entityId: string; details?: Record<string, unknown> }) =>
    apiCall(`${BASE_URL}/admin/audit-logs`, { method: 'POST', body: JSON.stringify(entry) }),

  // ── Revenue Reports ───────────────────────────────────────────────────────
  getRevenue: (startDate: string, endDate: string) =>
    apiCall(`${BASE_URL}/admin/reports/revenue?startDate=${startDate}&endDate=${endDate}`),
} as const;

export default adminCoreApi;
