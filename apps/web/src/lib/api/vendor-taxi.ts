import { API_BASE_URL } from '@/lib/config/api-base';
/**
 * KARTSEEK Vendor Taxi API Layer
 * Vendor-facing API calls for taxi vendor portal.
 * Maps to: taxi-service vendor routes (64 routes)
 */

// Fallback must include `/v1` — the gateway serves `/api/v1/*` and answers 404
// on `/api/*`. Masked today by NEXT_PUBLIC_API_URL being set, so it would only
// bite in an environment that forgets the variable.
// Gateway origin resolved once in lib/config/api-base.ts — it fails loudly
// in production rather than silently falling back to a developer machine.
const BASE_URL = API_BASE_URL;
const BASE = `${BASE_URL}/taxi`;

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

export const vendorTaxiApi = {
  // ── Vendor Profile ────────────────────────────────────────────
  getVendor:     (id: string) => apiCall(`${BASE}/vendor/${id}`),
  updateProfile: (id: string, data: Record<string, unknown>) => apiCall(`${BASE}/vendor/${id}/profile`, { method: 'PUT', body: JSON.stringify(data) }),

  // ── Dashboard ─────────────────────────────────────────────────
  getDashboard: (vendorId: string) => apiCall(`${BASE}/vendor/${vendorId}/dashboard`),

  // ── Drivers ───────────────────────────────────────────────────
  getDrivers:    (vendorId: string, params?: { page?: number; status?: string }) => apiCall(`${BASE}/vendor/${vendorId}/drivers${params?.page ? `?page=${params.page}` : ''}`),
  getDriver:     (driverId: string) => apiCall(`${BASE}/drivers/${driverId}`),
  addDriver:     (data: Record<string, unknown>) => apiCall(`${BASE}/vendor/drivers`, { method: 'POST', body: JSON.stringify(data) }),
  updateDriver:  (driverId: string, data: Record<string, unknown>) => apiCall(`${BASE}/vendor/drivers/${driverId}`, { method: 'PUT', body: JSON.stringify(data) }),
  removeDriver:  (driverId: string) => apiCall(`${BASE}/vendor/drivers/${driverId}`, { method: 'DELETE' }),

  // ── Fleet ─────────────────────────────────────────────────────
  getFleet:       (vendorId: string) => apiCall(`${BASE}/vendor/${vendorId}/fleet`),
  addVehicle:     (data: Record<string, unknown>) => apiCall(`${BASE}/vendor/fleet`, { method: 'POST', body: JSON.stringify(data) }),
  updateVehicle:  (vehicleId: string, data: Record<string, unknown>) => apiCall(`${BASE}/vendor/fleet/${vehicleId}`, { method: 'PUT', body: JSON.stringify(data) }),
  removeVehicle:  (vehicleId: string) => apiCall(`${BASE}/vendor/fleet/${vehicleId}`, { method: 'DELETE' }),

  // ── Trips ─────────────────────────────────────────────────────
  getTrips:     (vendorId: string, params?: { page?: number; status?: string }) => apiCall(`${BASE}/vendor/${vendorId}/trips${params?.page ? `?page=${params.page}` : ''}`),
  getTripDetail: (tripId: string) => apiCall(`${BASE}/rides/${tripId}`),

  // ── Earnings ──────────────────────────────────────────────────
  getEarnings: (vendorId: string) => apiCall(`${BASE}/vendor/${vendorId}/earnings`),
  getPayouts:  (vendorId: string) => apiCall(`${BASE}/vendor/${vendorId}/payouts`),

  // ── Documents ─────────────────────────────────────────────────
  getDocuments:   (vendorId: string) => apiCall(`${BASE}/vendor/${vendorId}/documents`),
  uploadDocument: (vendorId: string, data: Record<string, unknown>) => apiCall(`${BASE}/vendor/${vendorId}/documents`, { method: 'POST', body: JSON.stringify(data) }),

  // ── Complaints ────────────────────────────────────────────────
  getComplaints:    (vendorId: string) => apiCall(`${BASE}/vendor/${vendorId}/complaints`),
  respondComplaint: (complaintId: string, data: { response: string }) => apiCall(`${BASE}/vendor/complaints/${complaintId}/respond`, { method: 'POST', body: JSON.stringify(data) }),

  // ── Intercity ─────────────────────────────────────────────────
  getIntercityRoutes: (vendorId: string) => apiCall(`${BASE}/vendor/${vendorId}/intercity`),
  createIntercityRoute: (data: Record<string, unknown>) => apiCall(`${BASE}/vendor/intercity`, { method: 'POST', body: JSON.stringify(data) }),

  // ── Rentals ───────────────────────────────────────────────────
  getRentals: (vendorId: string) => apiCall(`${BASE}/vendor/${vendorId}/rentals`),

  // ── Notifications ─────────────────────────────────────────────
  getNotifications: (vendorId: string) => apiCall(`${BASE}/vendor/${vendorId}/notifications`),
  markRead:         (notifId: string)  => apiCall(`${BASE}/vendor/notifications/${notifId}/read`, { method: 'POST' }),
} as const;

export default vendorTaxiApi;
