import { api } from '@/lib/api-endpoints';

const BASE = '/franchise';

/** What `GET /franchise/me` resolves for the caller, or null if they own none. */
export interface FranchiseMe {
  id: string;
  businessName?: string;
  countryCode?: string;
  status?: string;
  operationalZones?: unknown[];
}

export const franchiseApi = {
  // ── Registration & Health ──────────────────────────────────────────────────
  register: async (payload: any) => api.post(`${BASE}/register`, payload),
  health: async () => api.get(`${BASE}/health`),

  /**
   * The caller's own franchise. Every other method here takes an `id`, which is
   * why the console had to invent one; this is where that id comes from. The
   * owner is read from the token server-side, so there is nothing to pass.
   */
  getMine: async () => api.get<FranchiseMe | null>(`${BASE}/me`),

  // ── Dashboard ──────────────────────────────────────────────────────────────
  getDashboard: async (id: string) => api.get(`${BASE}/${id}/dashboard`),

  // ── Stores ─────────────────────────────────────────────────────────────────
  getStores: async (id: string, page = 1, limit = 20) =>
    api.get(`${BASE}/${id}/stores?page=${page}&limit=${limit}`),
  getStorePerformance: async (id: string, storeId: string, period = '30d') =>
    api.get(`${BASE}/${id}/stores/${storeId}/performance?period=${period}`),
  submitCompliance: async (id: string, storeId: string, payload: any) =>
    api.post(`${BASE}/${id}/stores/${storeId}/compliance`, payload),

  // ── Analytics ──────────────────────────────────────────────────────────────
  getAnalytics: async (id: string, period = '30d') =>
    api.get(`${BASE}/${id}/analytics?period=${period}`),

  // ── Delivery Partners ──────────────────────────────────────────────────────
  getDeliveryPartners: async (id: string, page = 1) =>
    api.get(`${BASE}/${id}/delivery-partners?page=${page}`),
  updateDeliveryPartnerStatus: async (id: string, partnerId: string, status: string) =>
    api.post(`${BASE}/${id}/delivery-partners/${partnerId}/status`, { status }),

  // ── Commission ─────────────────────────────────────────────────────────────
  getCommission: async (id: string) => api.get(`${BASE}/${id}/commission`),
  getPayouts: async (id: string, page = 1) =>
    api.get(`${BASE}/${id}/payouts?page=${page}`),

  // ── Orders ─────────────────────────────────────────────────────────────────
  getOrders: async (id: string, params?: { page?: number; status?: string }) =>
    api.get(`${BASE}/${id}/orders?page=${params?.page || 1}${params?.status ? `&status=${params.status}` : ''}`),

  // ── Settings ───────────────────────────────────────────────────────────────
  getSettings: async (id: string) => api.get(`${BASE}/${id}/settings`),
  updateSettings: async (id: string, payload: any) =>
    api.post(`${BASE}/${id}/settings`, payload),

  // ── Zone Management ────────────────────────────────────────────────────────
  getZones: async (id: string) => api.get(`${BASE}/${id}/zones`),

  // ── Marketplace Module ─────────────────────────────────────────────────────
  marketplace: {
    getProducts: async (id: string, page = 1) =>
      api.get(`${BASE}/${id}/marketplace/products?page=${page}`),
    getSellers: async (id: string) =>
      api.get(`${BASE}/${id}/marketplace/sellers`),
    getAnalytics: async (id: string, period = '30d') =>
      api.get(`${BASE}/${id}/marketplace/analytics?period=${period}`),
    updateSellerStatus: async (id: string, sellerId: string, status: string) =>
      api.post(`${BASE}/${id}/marketplace/sellers/${sellerId}/status`, { status }),
  },

  // ── Restaurant Module ──────────────────────────────────────────────────────
  restaurant: {
    getRestaurants: async (id: string, page = 1) =>
      api.get(`${BASE}/${id}/restaurant/restaurants?page=${page}`),
    getOrders: async (id: string, page = 1, status?: string) =>
      api.get(`${BASE}/${id}/restaurant/orders?page=${page}${status ? `&status=${status}` : ''}`),
    getAnalytics: async (id: string, period?: string) =>
      api.get(`${BASE}/${id}/restaurant/analytics${period ? `?period=${period}` : ''}`),
    updateRestaurantStatus: async (id: string, restaurantId: string, status: string) =>
      api.post(`${BASE}/${id}/restaurant/restaurants/${restaurantId}/status`, { status }),
    getSettings: async (id: string) =>
      api.get(`${BASE}/${id}/restaurant/settings`),
  },

  // ── Grocery Module ─────────────────────────────────────────────────────────
  grocery: {
    getStores: async (id: string) =>
      api.get(`${BASE}/${id}/grocery/stores`),
    getOrders: async (id: string, page = 1, status?: string) =>
      api.get(`${BASE}/${id}/grocery/orders?page=${page}${status ? `&status=${status}` : ''}`),
    getAnalytics: async (id: string, period?: string) =>
      api.get(`${BASE}/${id}/grocery/analytics${period ? `?period=${period}` : ''}`),
    updateStoreStatus: async (id: string, storeId: string, status: string) =>
      api.post(`${BASE}/${id}/grocery/stores/${storeId}/status`, { status }),
    getSettings: async (id: string) =>
      api.get(`${BASE}/${id}/grocery/settings`),
  },

  // ── Pharmacy Module ────────────────────────────────────────────────────────
  pharmacy: {
    getStores: async (id: string) =>
      api.get(`${BASE}/${id}/pharmacy/stores`),
    getOrders: async (id: string, page = 1, status?: string) =>
      api.get(`${BASE}/${id}/pharmacy/orders?page=${page}${status ? `&status=${status}` : ''}`),
    getAnalytics: async (id: string, period?: string) =>
      api.get(`${BASE}/${id}/pharmacy/analytics${period ? `?period=${period}` : ''}`),
    getSettings: async (id: string) =>
      api.get(`${BASE}/${id}/pharmacy/settings`),
  },

  // ── Taxi Module ────────────────────────────────────────────────────────────
  taxi: {
    getDrivers: async (id: string, page = 1) =>
      api.get(`${BASE}/${id}/taxi/drivers?page=${page}`),
    getRides: async (id: string, page = 1, status?: string) =>
      api.get(`${BASE}/${id}/taxi/rides?page=${page}${status ? `&status=${status}` : ''}`),
    getAnalytics: async (id: string, period?: string) =>
      api.get(`${BASE}/${id}/taxi/analytics${period ? `?period=${period}` : ''}`),
    getSettings: async (id: string) =>
      api.get(`${BASE}/${id}/taxi/settings`),
  },

  // ── Doctor Module ──────────────────────────────────────────────────────────
  doctor: {
    getDoctors: async (id: string, page = 1) =>
      api.get(`${BASE}/${id}/doctor/doctors?page=${page}`),
    getAppointments: async (id: string, page = 1, status?: string) =>
      api.get(`${BASE}/${id}/doctor/appointments?page=${page}${status ? `&status=${status}` : ''}`),
    getAnalytics: async (id: string, period?: string) =>
      api.get(`${BASE}/${id}/doctor/analytics${period ? `?period=${period}` : ''}`),
    getSettings: async (id: string) =>
      api.get(`${BASE}/${id}/doctor/settings`),
  },

  // ── Hotel Module ───────────────────────────────────────────────────────────
  hotel: {
    getHotels: async (id: string) =>
      api.get(`${BASE}/${id}/hotel/hotels`),
    getBookings: async (id: string, page?: number, status?: string) =>
      api.get(`${BASE}/${id}/hotel/bookings?page=${page || 1}${status ? `&status=${status}` : ''}`),
    getRooms: async (id: string) =>
      api.get(`${BASE}/${id}/hotel/rooms`),
    getAnalytics: async (id: string, period?: string) =>
      api.get(`${BASE}/${id}/hotel/analytics${period ? `?period=${period}` : ''}`),
    updateHotelStatus: async (id: string, hotelId: string, status: string) =>
      api.post(`${BASE}/${id}/hotel/hotels/${hotelId}/status`, { status }),
    getSettings: async (id: string) =>
      api.get(`${BASE}/${id}/hotel/settings`),
  },
};
