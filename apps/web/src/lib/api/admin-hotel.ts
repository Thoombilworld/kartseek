/**
 * KARTSEEK Admin Hotel API Layer
 * All admin hotel API calls go through this module.
 * Maps to: admin-hotel.controller.ts (17 routes)
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
  hotelId?: string;
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
  if (params.hotelId) q.set('hotelId', params.hotelId);
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

export const adminHotelApi = {
  // ── Dashboard ─────────────────────────────────────────────────
  getDashboard: () => apiCall(`${BASE_URL}/admin/hotel/dashboard`),

  // ── Hotels ────────────────────────────────────────────────────
  getHotels:      (p: ListParams = {}) => apiCall(`${BASE_URL}/admin/hotel/hotels${buildQuery(p)}`),
  getHotelById:   (id: string)         => apiCall(`${BASE_URL}/admin/hotel/hotels/${id}`),
  approveHotel:   (id: string)         => apiCall(`${BASE_URL}/admin/hotel/hotels/${id}/approve`, { method: 'PATCH' }),
  suspendHotel:   (id: string, reason?: string) => apiCall(`${BASE_URL}/admin/hotel/hotels/${id}/suspend`, { method: 'PATCH', body: JSON.stringify({ reason }) }),

  // ── Rooms ─────────────────────────────────────────────────────
  getRooms: (p: ListParams = {}) => apiCall(`${BASE_URL}/admin/hotel/rooms${buildQuery(p)}`),

  // ── Bookings ──────────────────────────────────────────────────
  getBookings:    (p: ListParams = {}) => apiCall(`${BASE_URL}/admin/hotel/bookings${buildQuery(p)}`),
  getBookingById: (id: string)         => apiCall(`${BASE_URL}/admin/hotel/bookings/${id}`),

  // ── Amenities ─────────────────────────────────────────────────
  getAmenities:   ()                                                    => apiCall(`${BASE_URL}/admin/hotel/amenities`),
  createAmenity:  (data: { name: string; icon?: string; category?: string }) => apiCall(`${BASE_URL}/admin/hotel/amenities`, { method: 'POST', body: JSON.stringify(data) }),

  // ── Pricing ───────────────────────────────────────────────────
  getPricing:    ()                              => apiCall(`${BASE_URL}/admin/hotel/pricing`),
  updatePricing: (data: Record<string, unknown>) => apiCall(`${BASE_URL}/admin/hotel/pricing`, { method: 'POST', body: JSON.stringify(data) }),

  // ── Reports ───────────────────────────────────────────────────
  getReports: (period = '30d') => apiCall(`${BASE_URL}/admin/hotel/reports?period=${period}`),

  // ── Reviews ───────────────────────────────────────────────────
  getReviews:      (p: ListParams = {}) => apiCall(`${BASE_URL}/admin/hotel/reviews${buildQuery(p)}`),
  moderateReview:  (id: string, data: { action: 'approve' | 'remove'; reason?: string }) => apiCall(`${BASE_URL}/admin/hotel/reviews/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // ── Settings ──────────────────────────────────────────────────
  getSettings:    ()                              => apiCall(`${BASE_URL}/admin/hotel/settings`),
  updateSettings: (data: Record<string, unknown>) => apiCall(`${BASE_URL}/admin/hotel/settings`, { method: 'POST', body: JSON.stringify(data) }),
} as const;

export default adminHotelApi;
