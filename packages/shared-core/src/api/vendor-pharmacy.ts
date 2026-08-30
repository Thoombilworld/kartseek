import { API_BASE_URL } from '@/lib/config/api-base';
/**
 * KARTSEEK Vendor Pharmacy API Layer
 * Vendor-facing API calls for pharmacy portal.
 * Maps to: pharmacy-service vendor routes (41 routes)
 */

// Fallback must include `/v1` — the gateway serves `/api/v1/*` and answers 404
// on `/api/*`. Masked today by NEXT_PUBLIC_API_URL being set, so it would only
// bite in an environment that forgets the variable.
// Gateway origin resolved once in lib/config/api-base.ts — it fails loudly
// in production rather than silently falling back to a developer machine.
const BASE_URL = API_BASE_URL;
const BASE = `${BASE_URL}/pharmacy`;

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

export const vendorPharmacyApi = {
  // ── Store & Profile ───────────────────────────────────────────
  getStore:      (id: string)         => apiCall(`${BASE}/stores/${id}`),
  updateProfile: (storeId: string, data: Record<string, unknown>) => apiCall(`${BASE}/vendor/${storeId}/profile`, { method: 'PUT', body: JSON.stringify(data) }),
  updateStatus:  (storeId: string, data: { isOnline: boolean })   => apiCall(`${BASE}/vendor/${storeId}/status`, { method: 'PUT', body: JSON.stringify(data) }),

  // ── Products (Medicines) ──────────────────────────────────────
  getMedicines:    (storeId: string, params?: { page?: number; category?: string }) => apiCall(`${BASE}/stores/${storeId}/medicines${params?.page ? `?page=${params.page}` : ''}`),
  getMedicine:     (id: string) => apiCall(`${BASE}/medicines/${id}`),
  addMedicine:     (data: Record<string, unknown>) => apiCall(`${BASE}/vendor/medicines`, { method: 'POST', body: JSON.stringify(data) }),
  updateMedicine:  (id: string, data: Record<string, unknown>) => apiCall(`${BASE}/vendor/medicines/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMedicine:  (id: string) => apiCall(`${BASE}/vendor/medicines/${id}`, { method: 'DELETE' }),

  // ── Orders ────────────────────────────────────────────────────
  getOrders:        (storeId: string, params?: { page?: number; status?: string }) => apiCall(`${BASE}/vendor/${storeId}/orders${params?.page ? `?page=${params.page}` : ''}`),
  getOrderDetail:   (orderId: string) => apiCall(`${BASE}/orders/${orderId}`),
  acceptOrder:      (orderId: string) => apiCall(`${BASE}/vendor/orders/${orderId}/accept`, { method: 'POST' }),
  rejectOrder:      (orderId: string) => apiCall(`${BASE}/vendor/orders/${orderId}/reject`, { method: 'POST' }),
  updateOrderStatus: (orderId: string, data: { status: string }) => apiCall(`${BASE}/vendor/orders/${orderId}/status`, { method: 'PUT', body: JSON.stringify(data) }),

  // ── Prescriptions ─────────────────────────────────────────────
  getPrescriptions: (storeId: string) => apiCall(`${BASE}/vendor/${storeId}/prescriptions`),
  verifyPrescription: (prescId: string, data: { verified: boolean; notes?: string }) => apiCall(`${BASE}/vendor/prescriptions/${prescId}/verify`, { method: 'PUT', body: JSON.stringify(data) }),

  // ── Inventory ─────────────────────────────────────────────────
  getInventory:     (storeId: string) => apiCall(`${BASE}/vendor/${storeId}/inventory`),
  updateInventory:  (storeId: string, itemId: string, data: Record<string, unknown>) => apiCall(`${BASE}/vendor/${storeId}/inventory/${itemId}`, { method: 'PUT', body: JSON.stringify(data) }),

  // ── Delivery ──────────────────────────────────────────────────
  getDeliverySettings: (storeId: string) => apiCall(`${BASE}/vendor/${storeId}/delivery`),
  updateDelivery:      (storeId: string, data: Record<string, unknown>) => apiCall(`${BASE}/vendor/${storeId}/delivery`, { method: 'PUT', body: JSON.stringify(data) }),

  // ── Earnings & Wallet ─────────────────────────────────────────
  getEarnings: (storeId: string) => apiCall(`${BASE}/vendor/${storeId}/earnings`),
  getWallet:   (storeId: string) => apiCall(`${BASE}/vendor/${storeId}/wallet`),

  // ── Categories ────────────────────────────────────────────────
  getCategories: () => apiCall(`${BASE}/categories`),

  // ── Reviews ───────────────────────────────────────────────────
  getReviews: (storeId: string, params?: { page?: number }) => apiCall(`${BASE}/stores/${storeId}/reviews${params?.page ? `?page=${params.page}` : ''}`),

  // ── Licenses ──────────────────────────────────────────────────
  getLicenses:   (storeId: string) => apiCall(`${BASE}/vendor/${storeId}/licenses`),
  uploadLicense: (storeId: string, data: Record<string, unknown>) => apiCall(`${BASE}/vendor/${storeId}/licenses`, { method: 'POST', body: JSON.stringify(data) }),

  // ── Reports ───────────────────────────────────────────────────
  getReports:    (storeId: string, period = '30d') => apiCall(`${BASE}/vendor/${storeId}/reports?period=${period}`),

  // ── Settings ──────────────────────────────────────────────────
  getSettings:    (storeId: string) => apiCall(`${BASE}/vendor/${storeId}/settings`),
  updateSettings: (storeId: string, data: Record<string, unknown>) => apiCall(`${BASE}/vendor/${storeId}/settings`, { method: 'PUT', body: JSON.stringify(data) }),
} as const;

export default vendorPharmacyApi;
