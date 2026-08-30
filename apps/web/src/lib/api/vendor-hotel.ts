import { API_BASE_URL } from '@/lib/config/api-base';
/**
 * KARTSEEK Vendor Hotel API Layer
 * Vendor-facing API calls for hotel vendor portal.
 * Maps to: hotel-service vendor routes (11 routes)
 *
 * NOTE: hotel-service currently has limited vendor routes (11).
 * Additional routes need to be added to hotel-service backend.
 */

// Fallback must include `/v1` — the gateway serves `/api/v1/*` and answers 404
// on `/api/*`. Masked today by NEXT_PUBLIC_API_URL being set, so it would only
// bite in an environment that forgets the variable.
// Gateway origin resolved once in lib/config/api-base.ts — it fails loudly
// in production rather than silently falling back to a developer machine.
const BASE_URL = API_BASE_URL;
const BASE = `${BASE_URL}/hotels`;

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

export const vendorHotelApi = {
  // ── Hotels ────────────────────────────────────────────────────
  getHotels:   () => apiCall(`${BASE}/hotels`),
  getHotel:    (id: string) => apiCall(`${BASE}/hotels/${id}`),

  // ── Bookings ──────────────────────────────────────────────────
  getBookings: (params?: { page?: number; status?: string }) => apiCall(`${BASE}/bookings${params?.page ? `?page=${params.page}` : ''}`),

  // ── Analytics ─────────────────────────────────────────────────
  getAnalytics: () => apiCall(`${BASE}/analytics`),

  // ── Compliance ────────────────────────────────────────────────
  getCompliance: () => apiCall(`${BASE}/compliance`),

  // ── Fraud ─────────────────────────────────────────────────────
  getFraud: () => apiCall(`${BASE}/fraud`),

  // ── Refunds ───────────────────────────────────────────────────
  getRefunds: () => apiCall(`${BASE}/refunds`),
} as const;

export default vendorHotelApi;
