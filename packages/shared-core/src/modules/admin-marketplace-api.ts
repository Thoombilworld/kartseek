/**
 * KARTSEEK Admin — Marketplace Administration API Client
 * ──────────────────────────────────────────────────────
 * Admin-only endpoints for full marketplace governance.
 * All endpoints require JWT + admin/super_admin role.
 */

import { api } from '@/lib/api-endpoints';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  image?: string;
  parentId?: string;
  productCount: number;
  isActive: boolean;
}

export interface AdminProduct {
  id: string;
  name: string;
  sellerId: string;
  sellerName: string;
  price: number;
  status: 'pending' | 'active' | 'rejected' | 'suspended';
  createdAt: string;
  approvedBy?: string;
  rejectionReason?: string;
}

export interface AdminSeller {
  id: string;
  name: string;
  email: string;
  status: 'pending' | 'active' | 'suspended' | 'blocked';
  rating: number;
  totalProducts: number;
  totalOrders: number;
  joinedAt: string;
}

export interface AdminReturn {
  id: string;
  orderId: string;
  productName: string;
  customerName: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  amount: number;
  date: string;
}

export interface AdminRefund {
  id: string;
  orderId: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'processed';
  date: string;
}

export interface DashboardKPIs {
  sellers: { total: number; active: number; pending: number; suspended: number; blocked: number };
  products: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    unpublished: number;
  };
  brands: { total: number; approved: number; pendingApproval: number; rejected: number };
  campaigns: {
    active: number;
    scheduled: number;
    pending: number;
    paused: number;
    expired: number;
  };
  orders: { today: number; thisWeek: number; thisMonth: number; pending: number };
  returns: { open: number; resolved: number };
  refunds: { pending: number; processed: number; amount: number };
  revenue: { today: number; thisWeek: number; thisMonth: number; commission: number };
  payouts: { pending: number; processed: number };
  country?: string;
}

// Shared paginated response
interface Paginated<T> {
  data: T[];
  total: number;
}

// ─── Admin API ────────────────────────────────────────────────────────────────

export const adminMarketplaceApi = {
  // ── Dashboard ─────────────────────────────────────────────────
  getDashboard: (country?: string) =>
    api.get<DashboardKPIs>('/admin/marketplace/dashboard', country ? { country } : undefined),

  getDashboardGraphQL: async () => {
    return api.post<any>('/graphql', {
      query: `
        query {
          adminDashboard {
            pendingApprovals {
              products
              sellers
            }
            escrowFunds {
              holdAmount
              released
            }
            activeSellers
            todayOrders
            todayRevenue
          }
        }
      `,
    });
  },

  // ── Category Management ───────────────────────────────────────
  getCategories: (params?: { search?: string; country?: string }) =>
    api.get<Paginated<AdminCategory>>('/admin/marketplace/categories', params as any),

  createCategory: (dto: { name: string; slug: string; icon?: string; parentId?: string }) =>
    api.post<{ data: AdminCategory }>('/admin/marketplace/categories', dto),

  updateCategory: (id: string, dto: Partial<AdminCategory>) =>
    api.put('/admin/marketplace/categories/' + id, dto),

  deleteCategory: (id: string) => api.delete('/admin/marketplace/categories/' + id),

  // ── Subcategory Management ────────────────────────────────────
  getSubcategories: (params?: { categoryId?: string }) =>
    api.get<Paginated<any>>('/admin/marketplace/subcategories', params as any),

  createSubcategory: (dto: any) => api.post('/admin/marketplace/subcategories', dto),

  updateSubcategory: (id: string, dto: any) =>
    api.put('/admin/marketplace/subcategories/' + id, dto),

  deleteSubcategory: (id: string) => api.delete('/admin/marketplace/subcategories/' + id),

  // ── Attribute Management ──────────────────────────────────────
  getAttributes: (params?: { category?: string }) =>
    api.get<Paginated<any>>('/admin/marketplace/attributes', params as any),

  createAttribute: (dto: any) => api.post('/admin/marketplace/attributes', dto),

  updateAttribute: (id: string, dto: any) => api.put('/admin/marketplace/attributes/' + id, dto),

  deleteAttribute: (id: string) => api.delete('/admin/marketplace/attributes/' + id),

  // ── Product Moderation ────────────────────────────────────────
  // `search` added for the featured-products picker, which had no way to look
  // up a real product and filtered a bundled fixture list instead.
  getProducts: (params?: {
    page?: number;
    limit?: number;
    category?: string;
    status?: string;
    country?: string;
    search?: string;
  }) => api.get<Paginated<AdminProduct>>('/admin/marketplace/products', params as any),

  createProduct: (dto: object) =>
    api.post<{ data: { productId: string } }>('/admin/marketplace/products', dto),

  updateProduct: (id: string, dto: object) => api.put('/admin/marketplace/products/' + id, dto),

  approveProduct: (id: string, adminId: string) =>
    api.patch(`/admin/marketplace/products/${id}/approve`, { adminId }),

  rejectProduct: (id: string, adminId: string, reason: string) =>
    api.patch(`/admin/marketplace/products/${id}/reject`, { adminId, reason }),

  suspendProduct: (id: string, adminId: string) =>
    api.patch(`/admin/marketplace/products/${id}/suspend`, { adminId }),

  // ── Featured Products ─────────────────────────────────────────
  getFeaturedProducts: (country?: string) =>
    api.get<Paginated<any>>('/admin/marketplace/featured', country ? { country } : undefined),

  addFeaturedProduct: (dto: { productId: string; section?: string; sortOrder?: number }) =>
    api.post('/admin/marketplace/featured', dto),

  removeFeaturedProduct: (id: string) => api.delete('/admin/marketplace/featured/' + id),

  // ── Brand Moderation ──────────────────────────────────────────
  getBrands: (params?: { search?: string; status?: string }) =>
    api.get<Paginated<any>>('/admin/marketplace/brands', params as any),

  createBrand: (dto: any) => api.post('/admin/marketplace/brands', dto),

  updateBrand: (id: string, dto: any) => api.put('/admin/marketplace/brands/' + id, dto),

  deleteBrand: (id: string) => api.delete('/admin/marketplace/brands/' + id),

  approveBrand: (id: string, adminId: string) =>
    api.patch(`/admin/marketplace/brands/${id}/approve`, { adminId }),

  rejectBrand: (id: string, adminId: string, reason: string) =>
    api.patch(`/admin/marketplace/brands/${id}/reject`, { adminId, reason }),

  suspendBrand: (id: string, adminId: string) =>
    api.patch(`/admin/marketplace/brands/${id}/suspend`, { adminId }),

  // ── Seller Moderation ─────────────────────────────────────────
  getSellers: (params?: { search?: string; status?: string; country?: string }) =>
    api.get<Paginated<AdminSeller>>('/admin/marketplace/sellers', params as any),

  getPendingSellers: (country?: string) =>
    api.get<Paginated<any>>(
      '/admin/marketplace/sellers/pending',
      country ? { country } : undefined,
    ),

  // ── Regional approvals ────────────────────────────────────────
  // Scoped by market: approving a Qatari seller means checking a Commercial
  // Registration and municipality trade licence, not a GSTIN, so the queues are
  // reviewed one market at a time.
  getSellerApprovals: (params?: { country?: string }) =>
    api.get<Paginated<AdminSeller>>('/admin/marketplace/seller-approvals', params as any),

  getSellerApprovalCounts: () =>
    api.get<Record<string, number>>('/admin/marketplace/seller-approvals/counts'),

  getProductApprovals: (params?: { country?: string }) =>
    api.get<Paginated<AdminProduct>>('/admin/marketplace/product-approvals', params as any),

  rejectSeller: (id: string, adminId: string, reason: string) =>
    api.patch(`/admin/marketplace/sellers/${id}/reject`, { adminId, reason }),

  reactivateSeller: (id: string, adminId: string) =>
    api.patch(`/admin/marketplace/sellers/${id}/reactivate`, { adminId }),

  approveSeller: (id: string, adminId: string) =>
    api.patch(`/admin/marketplace/sellers/${id}/approve`, { adminId }),

  suspendSeller: (id: string, adminId: string) =>
    api.patch(`/admin/marketplace/sellers/${id}/suspend`, { adminId }),

  blockSeller: (id: string, adminId: string) =>
    api.patch(`/admin/marketplace/sellers/${id}/block`, { adminId }),

  getSellerHealth: (id: string) => api.get<any>(`/admin/marketplace/sellers/${id}/health`),

  // ── Orders ────────────────────────────────────────────────────
  //
  // `userId` and `sellerId` used to be in this type and the route implements
  // neither. Harmless while it answered an empty page; now that the gateway
  // validates the query, an undeclared key is a 400 rather than a filter that
  // quietly does nothing, so the type says what the route actually takes. No
  // caller passed them.
  getOrders: (params?: { status?: string; country?: string; page?: number; limit?: number }) =>
    api.get<Paginated<any>>('/admin/marketplace/orders', params as any),

  /**
   * One order, BY ORDER NUMBER.
   *
   * The route is `/admin/marketplace/orders/:orderNumber` and order-service
   * looks orders up by that number — not by the row's uuid, which is what a
   * parameter called `id` invites a caller to pass. Renamed rather than
   * removed: it is the only typed way to reach the route, and a uuid here is a
   * 404 that looks like a missing order.
   */
  getOrderByNumber: (orderNumber: string) =>
    api.get<any>('/admin/marketplace/orders/' + encodeURIComponent(orderNumber)),

  // ── Returns Adjudication ──────────────────────────────────────
  getReturns: (params?: { sellerId?: string; status?: string; page?: number; country?: string }) =>
    api.get<Paginated<AdminReturn>>('/admin/marketplace/returns', params as any),

  approveReturn: (id: string) => api.post(`/admin/marketplace/returns/${id}/approve`),

  rejectReturn: (id: string, dto: { reason: string }) =>
    api.post(`/admin/marketplace/returns/${id}/reject`, dto),

  // ── Refunds Adjudication ──────────────────────────────────────
  getRefunds: (params?: { sellerId?: string; status?: string; page?: number; country?: string }) =>
    api.get<Paginated<AdminRefund>>('/admin/marketplace/refunds', params as any),

  approveRefund: (id: string, adminId: string) =>
    api.post(`/admin/marketplace/refunds/${id}/approve`, { adminId }),

  // ── Payments ──────────────────────────────────────────────────
  getPayments: (params?: { status?: string; country?: string }) =>
    api.get<Paginated<any>>('/admin/marketplace/payouts', params as any),

  // ── Banners ───────────────────────────────────────────────────
  // The typed route is the real one; the flat `/admin/marketplace/banners`
  // GET answers an empty stub. `country` narrows to banners running in one
  // market (a region-locked admin always gets their own).
  getBanners: (params?: { type?: string; country?: string }) =>
    api.get<Paginated<any>>(
      `/admin/marketplace/banners/${params?.type ?? 'hero'}`,
      params?.country ? { country: params.country } : undefined,
    ),

  createBanner: (dto: any) => api.post('/admin/marketplace/banners', dto),

  updateBanner: (id: string, dto: any) => api.put('/admin/marketplace/banners/' + id, dto),

  deleteBanner: (id: string) => api.delete('/admin/marketplace/banners/' + id),

  // ── Flash Deals ───────────────────────────────────────────────
  getFlashDeals: (params?: { status?: string; country?: string }) =>
    api.get<Paginated<any>>('/admin/marketplace/flash-deals', params as any),

  createFlashDeal: (dto: any) => api.post('/admin/marketplace/flash-deals', dto),

  updateFlashDeal: (id: string, dto: any) => api.put('/admin/marketplace/flash-deals/' + id, dto),

  deleteFlashDeal: (id: string) => api.delete('/admin/marketplace/flash-deals/' + id),

  getNominations: (params?: { status?: string; country?: string }) =>
    api.get<Paginated<any>>('/admin/marketplace/flash-deals/nominations', params as any),

  approveNomination: (nominationId: string) =>
    api.patch('/admin/marketplace/flash-deals/nominations/' + nominationId + '/approve', {}),

  rejectNomination: (nominationId: string, reason?: string) =>
    api.patch('/admin/marketplace/flash-deals/nominations/' + nominationId + '/reject', { reason }),

  // ── Campaigns ─────────────────────────────────────────────────
  getCampaigns: (params?: { status?: string; country?: string }) =>
    api.get<Paginated<any>>('/admin/marketplace/campaigns', params as any),

  createCampaign: (dto: any) => api.post('/admin/marketplace/campaigns', dto),

  updateCampaign: (id: string, dto: any) => api.put('/admin/marketplace/campaigns/' + id, dto),

  deleteCampaign: (id: string) => api.delete('/admin/marketplace/campaigns/' + id),

  // ── Coupons (platform codes; issued for one market or every market) ──
  getCoupons: (params?: { country?: string; isActive?: boolean }) =>
    api.get<Paginated<any>>('/admin/marketplace/coupons', params as any),

  // The admin routes, not the seller ones: reads and writes for the promotions
  // screen now sit on the same controller, behind the same guard stack, and the
  // market a coupon is issued for is decided from the admin's own token.
  createCoupon: (dto: any) => api.post('/admin/marketplace/coupons', dto),

  updateCoupon: (id: string, dto: any) => api.put('/admin/marketplace/coupons/' + id, dto),

  deleteCoupon: (id: string) => api.delete('/admin/marketplace/coupons/' + id),

  // ── Promotions (run by sellers; listed per market through the seller) ──
  getPromotions: (params?: { country?: string }) =>
    api.get<Paginated<any>>('/admin/marketplace/promotions', params as any),

  createPromotion: (dto: any) => api.post('/admin/marketplace/promotions', dto),

  updatePromotion: (id: string, dto: any) => api.put('/admin/marketplace/promotions/' + id, dto),

  // ── Commissions ───────────────────────────────────────────────
  // commission-service keeps its records in Redis with no market column
  // (R11) — the route accepts `country` and stays refused for a locked
  // admin regardless; a global admin's filter narrows nothing today, and is
  // passed through for the day a datastore exists to narrow it against.
  getCommissions: (country?: string) =>
    api.get<Paginated<any>>('/admin/marketplace/commissions', country ? { country } : undefined),

  createCommission: (dto: any) => api.post('/admin/marketplace/commissions', dto),

  updateCommission: (id: string, dto: any) => api.put('/admin/marketplace/commissions/' + id, dto),

  // ── Payouts ───────────────────────────────────────────────────
  getPayouts: (params?: { status?: string; country?: string }) =>
    api.get<Paginated<any>>('/admin/marketplace/payouts', params as any),

  processPayout: (id: string, data?: any) =>
    api.post(`/admin/marketplace/payouts/${id}/process`, data),

  // ── Reviews ───────────────────────────────────────────────────
  getReviews: (params?: { status?: string; rating?: number; country?: string }) =>
    api.get<Paginated<any>>('/admin/marketplace/reviews', params as any),

  flagReview: (id: string, reason: string) =>
    api.patch(`/admin/marketplace/reviews/${id}/flag`, { reason }),

  hideReview: (id: string) => api.patch(`/admin/marketplace/reviews/${id}/hide`),

  // ── Complaints ────────────────────────────────────────────────
  getComplaints: (params?: { status?: string; country?: string }) =>
    api.get<Paginated<any>>('/admin/marketplace/complaints', params as any),

  updateComplaint: (id: string, dto: any) => api.put('/admin/marketplace/complaints/' + id, dto),

  // ── QA Moderation ─────────────────────────────────────────────
  getQAItems: (params?: { status?: string; country?: string }) =>
    api.get<Paginated<any>>('/admin/marketplace/qa-moderation', params as any),

  moderateQAItem: (id: string, dto: any) => api.put('/admin/marketplace/qa-moderation/' + id, dto),

  // ── Notifications ─────────────────────────────────────────────
  getNotifications: (country?: string) =>
    api.get<Paginated<any>>('/admin/marketplace/notifications', country ? { country } : undefined),

  sendNotification: (dto: any) => api.post('/admin/marketplace/notifications', dto),

  // ── Settings ──────────────────────────────────────────────────
  getSettings: () => api.get<any>('/admin/marketplace/settings'),

  updateSettings: (dto: any) => api.put('/admin/marketplace/settings', dto),

  // ── Audit Logs ────────────────────────────────────────────────
  // `getAuditLogs` is gone with the `GET /admin/marketplace/audit-logs` stub it
  // called — a route that always answered `{ data: [], total: 0 }`. There is one
  // audit trail and one client for it: `adminCoreApi.getAuditLogs`, against
  // `GET /admin/audit-logs`, which is market-scoped from the caller's token.
  // Its filters are named for what is stored (`actionType`, `actorEmail`), not
  // the `{ action, actor }` this took and never used.

  // ── Reports ───────────────────────────────────────────────────
  getReports: (params?: { type?: string; period?: string; country?: string }) =>
    api.get<any>('/admin/marketplace/reports', params as any),

  // ── Page Builder ──────────────────────────────────────────────
  getPageLayout: (country?: string) =>
    api.get<any>('/admin/marketplace/page-layout', country ? { country } : undefined),

  updatePageLayout: (dto: any) => api.put('/admin/marketplace/page-layout', dto),

  // ── SEO Settings ──────────────────────────────────────────────
  getSeoSettings: () => api.get<any>('/admin/marketplace/seo'),

  updateSeoSettings: (dto: any) => api.put('/admin/marketplace/seo', dto),

  // ── HSN / Tax Master ──────────────────────────────────────────
  getHsnCodes: (params?: { search?: string }) =>
    api.get<Paginated<any>>('/admin/marketplace/hsn-codes', params as any),

  createHsnCode: (dto: any) => api.post('/admin/marketplace/hsn-codes', dto),

  updateHsnCode: (id: string, dto: any) => api.put('/admin/marketplace/hsn-codes/' + id, dto),

  // ── Bank Offers ───────────────────────────────────────────────
  getBankOffers: (country?: string) =>
    api.get<Paginated<any>>('/admin/marketplace/bank-offers', country ? { country } : undefined),

  createBankOffer: (dto: any) => api.post('/admin/marketplace/bank-offers', dto),

  updateBankOffer: (id: string, dto: any) => api.put('/admin/marketplace/bank-offers/' + id, dto),

  deleteBankOffer: (id: string) => api.delete('/admin/marketplace/bank-offers/' + id),

  // ── Exchange Offers ───────────────────────────────────────────
  getExchangeOffers: (country?: string) =>
    api.get<Paginated<any>>(
      '/admin/marketplace/exchange-offers',
      country ? { country } : undefined,
    ),

  createExchangeOffer: (dto: any) => api.post('/admin/marketplace/exchange-offers', dto),

  updateExchangeOffer: (id: string, dto: any) =>
    api.put('/admin/marketplace/exchange-offers/' + id, dto),

  // ── Sponsored Products ────────────────────────────────────────
  getSponsoredProducts: (params?: { status?: string; country?: string }) =>
    api.get<Paginated<any>>('/admin/marketplace/sponsored', params as any),

  updateSponsoredProduct: (id: string, dto: any) =>
    api.put('/admin/marketplace/sponsored/' + id, dto),

  // ── Compliance / Countries ────────────────────────────────────
  getComplianceCountries: () => api.get<Paginated<any>>('/admin/marketplace/compliance/countries'),

  updateComplianceCountry: (code: string, dto: any) =>
    api.put('/admin/marketplace/compliance/countries/' + code, dto),

  // ── Customers ─────────────────────────────────────────────────
  getCustomers: (params?: { search?: string; page?: number; country?: string }) =>
    api.get<Paginated<any>>('/admin/marketplace/customers', params as any),

  blockCustomer: (id: string) => api.put('/admin/marketplace/customers/' + id + '/block'),

  // ── Seller Wallets ────────────────────────────────────────────
  getSellerWallets: (country?: string) =>
    api.get<Paginated<any>>('/admin/marketplace/seller-wallets', country ? { country } : undefined),

  adjustSellerWallet: (id: string, dto: { amount: number; reason: string }) =>
    api.post(`/admin/marketplace/seller-wallets/${id}/adjust`, dto),

  // ── India Operations ──────────────────────────────────────────
  getIndiaOpsConfig: () => api.get<any>('/admin/marketplace/india-ops'),

  updateIndiaOpsConfig: (dto: any) => api.put('/admin/marketplace/india-ops', dto),

  // ── Orders ───────────────────────────────────────────────────
  updateOrder: (id: string, dto: { action: string; reason?: string }) =>
    api.put(`/admin/marketplace/orders/${id}`, dto),

  cancelOrder: (id: string, reason: string) =>
    api.put(`/admin/marketplace/orders/${id}/cancel`, { reason }),

  // ── Refunds & Payments ──────────────────────────────────────
  processRefund: (orderId: string, dto: { amount: number; reason?: string; note?: string }) =>
    api.post(`/admin/marketplace/refunds/${orderId}/process`, dto),

  rejectRefund: (id: string, dto: { reason: string }) =>
    api.put(`/admin/marketplace/refunds/${id}/reject`, dto),

  // ── Seller Management ───────────────────────────────────────
  updateSeller: (id: string, dto: { action: string; message?: string }) =>
    api.put(`/admin/marketplace/sellers/${id}`, dto),
};
