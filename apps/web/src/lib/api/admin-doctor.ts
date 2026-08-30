/**
 * KARTSEEK Admin Doctor API Layer
 * All admin doctor API calls go through this module.
 * Maps to: admin-doctor.controller.ts (15 routes)
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
  specialty?: string;
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
  if (params.specialty) q.set('specialty', params.specialty);
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

export const adminDoctorApi = {
  // ── Dashboard ─────────────────────────────────────────────────
  getDashboard: () => apiCall(`${BASE_URL}/admin/doctor/dashboard`),

  // ── Clinics ───────────────────────────────────────────────────
  getClinics:     (p: ListParams = {}) => apiCall(`${BASE_URL}/admin/doctor/clinics${buildQuery(p)}`),
  getClinicById:  (id: string)         => apiCall(`${BASE_URL}/admin/doctor/clinics/${id}`),
  approveClinic:  (id: string)         => apiCall(`${BASE_URL}/admin/doctor/clinics/${id}/approve`, { method: 'PATCH' }),

  // ── Doctors ───────────────────────────────────────────────────
  getDoctors:      (p: ListParams = {}) => apiCall(`${BASE_URL}/admin/doctor/doctors${buildQuery(p)}`),
  getDoctorById:   (id: string)         => apiCall(`${BASE_URL}/admin/doctor/doctors/${id}`),
  verifyDoctor:    (id: string, data: { verified: boolean; notes?: string }) => apiCall(`${BASE_URL}/admin/doctor/doctors/${id}/verify`, { method: 'PATCH', body: JSON.stringify(data) }),
  suspendDoctor:   (id: string, reason: string) => apiCall(`${BASE_URL}/admin/doctor/doctors/${id}/suspend`, { method: 'PATCH', body: JSON.stringify({ reason }) }),

  // ── Appointments ──────────────────────────────────────────────
  getAppointments: (p: ListParams = {}) => apiCall(`${BASE_URL}/admin/doctor/appointments${buildQuery(p)}`),

  // ── Specialties ───────────────────────────────────────────────
  getSpecialties:   ()                                                  => apiCall(`${BASE_URL}/admin/doctor/specialties`),
  createSpecialty:  (data: { name: string; icon?: string; description?: string }) => apiCall(`${BASE_URL}/admin/doctor/specialties`, { method: 'POST', body: JSON.stringify(data) }),

  // ── Prescriptions ─────────────────────────────────────────────
  getPrescriptions: (page = 1) => apiCall(`${BASE_URL}/admin/doctor/prescriptions?page=${page}`),

  // ── Reports ───────────────────────────────────────────────────
  getReports: (period = '30d') => apiCall(`${BASE_URL}/admin/doctor/reports?period=${period}`),

  // ── Settings ──────────────────────────────────────────────────
  getSettings:    ()                              => apiCall(`${BASE_URL}/admin/doctor/settings`),
  updateSettings: (data: Record<string, unknown>) => apiCall(`${BASE_URL}/admin/doctor/settings`, { method: 'POST', body: JSON.stringify(data) }),
} as const;

export default adminDoctorApi;
