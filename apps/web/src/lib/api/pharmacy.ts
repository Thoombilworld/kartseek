/**
 * KARTSEEK — Pharmacy API Client
 * Module-scoped endpoints for the pharmacy service.
 */

import { api } from '../api-endpoints';
import type { PharmacyStore, Medicine, Prescription } from '../types/pharmacy.types';

const BASE = '/pharmacy';

export const pharmacyApi = {
  // ── Customer — Store Discovery ──────────────────────────────────────────────

  /** List nearby pharmacies */
  getStores: (params?: { lat?: number; lng?: number; search?: string; is24hr?: boolean; page?: number; limit?: number }) =>
    api.get<{ data: PharmacyStore[]; total: number }>(`${BASE}/stores`, params as any),

  /** Get a single pharmacy store */
  getStore: (storeId: string) =>
    api.get<PharmacyStore>(`${BASE}/stores/${storeId}`),

  /** Get pharmacy by slug */
  getStoreBySlug: (slug: string) =>
    api.get<PharmacyStore>(`${BASE}/stores/slug/${slug}`),

  // ── Customer — Categories ───────────────────────────────────────────────────

  /** List pharmacy categories */
  getCategories: () =>
    api.get<any[]>(`${BASE}/categories`),

  /** Get a single category */
  getCategory: (id: string) =>
    api.get<any>(`${BASE}/categories/${id}`),

  // ── Customer — Medicines ────────────────────────────────────────────────────

  /** List medicines for a pharmacy */
  getMedicines: (storeId: string, params?: { category?: string; search?: string; page?: number; limit?: number }) =>
    api.get<{ data: Medicine[]; total: number }>(`${BASE}/stores/${storeId}/medicines`, params as any),

  /** Get a single medicine */
  getMedicine: (storeId: string, medicineId: string) =>
    api.get<Medicine>(`${BASE}/stores/${storeId}/medicines/${medicineId}`),

  /** Search medicines across pharmacies */
  search: (query: string, params?: { page?: number; limit?: number }) =>
    api.get<{ data: Medicine[]; total: number }>(`${BASE}/search`, { q: query, ...params } as any),

  // ── Customer — Prescriptions ────────────────────────────────────────────────

  /** Upload prescription (uses fetch directly for FormData) */
  uploadPrescription: async (formData: FormData) => {
    const res = await fetch(`${BASE}/prescriptions/upload`, {
      method: 'POST',
      body: formData,
    });
    return res.json() as Promise<{ prescriptionId: string; status: string }>;
  },

  /** Get my prescriptions */
  getMyPrescriptions: (customerId: string) =>
    api.get<Prescription[]>(`${BASE}/prescriptions/my`, { customerId }),

  // ── Customer — Orders ───────────────────────────────────────────────────────

  /** Place a pharmacy order */
  placeOrder: (body: {
    storeId: string; customerId: string; items: any[];
    prescriptionId?: string; deliveryAddress?: any;
    paymentMethod?: string; couponCode?: string;
    [key: string]: any;
  }) =>
    api.post<{ success: boolean; order: any }>(`${BASE}/orders`, body),

  /** Get order details */
  getOrder: (orderId: string) =>
    api.get<any>(`${BASE}/orders/${orderId}`),

  /**
   * The signed-in customer's pharmacy orders.
   *
   * Takes no customer id: the gateway reads it from the bearer token. It used to
   * be a query parameter, which meant both that callers could ask for somebody
   * else's orders and that omitting it returned every customer's.
   */
  getMyOrders: (params?: { page?: number; limit?: number }) =>
    api.get<{ data: any[]; total: number }>(`${BASE}/my-orders`, params as any),

  // ── Customer — Reviews & Promotions ─────────────────────────────────────────

  /** Get store reviews */
  getReviews: (storeId: string, params?: { page?: number; limit?: number }) =>
    api.get<{ data: any[]; total: number }>(`${BASE}/stores/${storeId}/reviews`, params as any),

  /** Submit a review */
  submitReview: (storeId: string, body: { customerId: string; rating: number; comment?: string; orderId?: string }) =>
    api.post<any>(`${BASE}/stores/${storeId}/review`, body),

  /** Get store promotions */
  getPromotions: (storeId: string) =>
    api.get<any[]>(`${BASE}/stores/${storeId}/promotions`),

  // ── Seller Portal ───────────────────────────────────────────────────────────

  seller: {
    /** Seller dashboard */
    getDashboard: (storeId: string) =>
      api.get<any>(`${BASE}/seller/${storeId}/dashboard`),

    /** List seller orders */
    getOrders: (storeId: string, params?: { status?: string; page?: number; limit?: number }) =>
      api.get<{ data: any[]; total: number }>(`${BASE}/seller/${storeId}/orders`, params as any),

    /** Update order status */
    updateOrderStatus: (orderId: string, body: { status: string; [key: string]: any }) =>
      api.put<any>(`${BASE}/seller/orders/${orderId}/status`, body),

    /** Add medicine */
    addMedicine: (storeId: string, body: any) =>
      api.post<any>(`${BASE}/seller/${storeId}/medicines`, body),

    /** Update medicine */
    updateMedicine: (itemId: string, body: any) =>
      api.put<any>(`${BASE}/seller/medicines/${itemId}`, body),

    /** Delete medicine */
    deleteMedicine: (itemId: string) =>
      api.delete<any>(`${BASE}/seller/medicines/${itemId}`),

    /** View inventory */
    getInventory: (storeId: string) =>
      api.get<any[]>(`${BASE}/seller/${storeId}/inventory`),

    /** Update stock level */
    updateStock: (itemId: string, stockLevel: number) =>
      api.put<any>(`${BASE}/seller/medicines/${itemId}/stock`, { stockLevel }),

    /** List staff */
    getStaff: (storeId: string) =>
      api.get<any[]>(`${BASE}/seller/${storeId}/staff`),

    /** Add staff */
    addStaff: (storeId: string, body: any) =>
      api.post<any>(`${BASE}/seller/${storeId}/staff`, body),

    /** Update staff member */
    updateStaff: (staffId: string, body: any) =>
      api.put<any>(`${BASE}/seller/staff/${staffId}`, body),

    /** Remove staff member */
    removeStaff: (staffId: string) =>
      api.delete<any>(`${BASE}/seller/staff/${staffId}`),

    /** Payouts & earnings */
    getPayouts: (storeId: string) =>
      api.get<any>(`${BASE}/seller/${storeId}/payouts`),

    /** List promotions */
    getPromotions: (storeId: string) =>
      api.get<any[]>(`${BASE}/seller/${storeId}/promotions`),

    /** Create promotion */
    createPromotion: (storeId: string, body: any) =>
      api.post<any>(`${BASE}/seller/${storeId}/promotions`, body),

    /** Update promotion */
    updatePromotion: (promoId: string, body: any) =>
      api.put<any>(`${BASE}/seller/promotions/${promoId}`, body),

    /** Delete promotion */
    deletePromotion: (promoId: string) =>
      api.delete<any>(`${BASE}/seller/promotions/${promoId}`),

    /** Analytics */
    getAnalytics: (storeId: string) =>
      api.get<any>(`${BASE}/seller/${storeId}/analytics`),
  },

  // ── Super Admin Panel ─────────────────────────────────────────────────────

  admin: {
    /** List all pharmacy stores (with optional status filter) */
    listStores: (params?: { status?: string; page?: number; limit?: number }) =>
      api.get<[any[], number]>(`${BASE}/admin/stores`, params as any),

    /** Approve a pending pharmacy store */
    approveStore: (storeId: string) =>
      api.post<any>(`${BASE}/admin/${storeId}/approve`),

    /** Suspend a pharmacy store */
    suspendStore: (storeId: string, reason?: string) =>
      api.post<any>(`${BASE}/admin/${storeId}/suspend`, { reason }),

    /** Set commission rate for a store */
    setCommission: (storeId: string, rate: number) =>
      api.put<{ success: boolean; storeId: string; commissionRate: number }>(
        `${BASE}/admin/${storeId}/commission`, { rate },
      ),

    /** Verify (approve/reject) a prescription */
    verifyPrescription: (prescId: string, body: {
      status: string; adminId: string;
      rejectionReason?: string; pharmacistNotes?: string;
    }) =>
      api.post<any>(`${BASE}/admin/prescriptions/${prescId}/verify`, body),

    /** Get pending prescriptions awaiting verification */
    getPendingPrescriptions: (params?: { page?: number; limit?: number }) =>
      api.get<[any[], number]>(`${BASE}/admin/prescriptions/pending`, params as any),
  },
};

