/**
 * KARTSEEK Seller Portal — Typed API Client
 * ──────────────────────────────────────────
 * All seller-facing API calls. Uses the same base client from api-endpoints.ts.
 * Every seller endpoint is scoped to the seller's own data via sellerId.
 */

import { api } from '@/lib/api-endpoints';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * One of this seller's offers, as `product_listings` holds it.
 *
 * Distinct from {@link SellerProduct}: a product is a catalogue entry, a listing
 * is one seller's terms on it. A seller who only ever offers on other people's
 * products owns no products at all, and their whole portal would read as empty
 * if these were conflated.
 */
export interface SellerListing {
  id: string;
  sellerSku: string;
  sellingPrice: number;
  stockQuantity: number;
  condition: string;
  isActive: boolean;
  isBuyBoxWinner: boolean;
  isFulfilledByKartseek: boolean;
  /** PENDING | APPROVED | REJECTED — the platform's decision, not the seller's. */
  approvalStatus: string;
  rejectionReason?: string | null;
  createdAt: string;
  product?: { id: string; name: string; slug?: string; mrp?: number } | null;
}

export interface SellerProduct {
  id: string;
  name: string;
  sku: string;
  categoryId: string;
  categoryName: string;
  price: number;
  mrp: number;
  stock: number;
  status: 'active' | 'draft' | 'pending' | 'rejected' | 'suspended';
  image?: string;
  rating: number;
  sold: number;
  createdAt: string;
  /** Enhanced card design fields */
  delivery?: string | null;
  brand?: string;
  emoji?: string;
  discount?: number;
  reviews?: number;
  /** Tax compliance fields */
  hsn?: string;
  gst?: string | null;
}

export interface SellerOrder {
  id: string;
  product: string;
  buyer: string;
  buyerPhone?: string;
  amount: number;
  status: 'New' | 'Accepted' | 'Packed' | 'Shipped' | 'Delivered' | 'Cancelled' | 'Returned';
  payment: 'Prepaid' | 'COD';
  paymentStatus: 'Paid' | 'Pending' | 'Refunded';
  date: string;
  time: string;
  items: SellerOrderItem[];
  address: {
    line: string;
    city: string;
    state: string;
    pin: string;
    country: string;
  };
}

export interface SellerOrderItem {
  name: string;
  sku: string;
  qty: number;
  price: number;
  hsn: string;
  gst: string;
}

export interface WalletData {
  balance: number;
  pendingPayout: number;
  completedPayouts: number;
  holdAmount: number;
  transactions: WalletTransaction[];
}

export interface WalletTransaction {
  /** wallet-service row id. Not a seller-facing reference — see `reference`. */
  id: string;
  /**
   * The order number this movement relates to, resolved from the ledger's
   * `referenceId` uuid. `null` for movements with no order behind them
   * (top-ups, manual adjustments) or when the order is not this seller's.
   */
  reference: string | null;
  type: 'credit' | 'debit' | 'payout' | 'commission' | 'refund' | 'adjustment';
  /** Signed: debits are negative. Render the magnitude. */
  amount: number;
  description: string;
  balanceAfter?: number;
  currency?: string;
  status: 'completed' | 'pending' | 'failed';
  date: string;
}

export interface Payout {
  id: string;
  amount: number;
  bankAccount: string;
  utr?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requestedAt: string;
  processedAt?: string;
}

export interface Commission {
  id: string;
  /** The order's uuid. Kept for links; `orderNumber` is what gets rendered. */
  orderId: string;
  /** Resolved from marketplace-service; `null` when the order is not this seller's. */
  orderNumber: string | null;
  /**
   * Commission is charged per *order*, not per line, so commission-service has
   * no product to report. Declared optional because it is genuinely absent —
   * typing it as `string` is what let the page call `.toLowerCase()` on
   * `undefined` and crash the moment a seller typed in the search box.
   */
  productName?: string;
  categoryName: string;
  orderAmount: number;
  commissionRate: number;
  commissionAmount: number;
  date: string;
}

export interface Campaign {
  id: string;
  name: string;
  type: 'sponsored' | 'flash_deal' | 'banner' | 'promotion';
  status: 'active' | 'paused' | 'scheduled' | 'ended' | 'pending_approval';
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  orders: number;
  startDate: string;
  endDate: string;
}

export interface Promotion {
  id: string;
  name: string;
  code: string;
  type: 'percentage' | 'flat' | 'bogo' | 'freebie';
  value: number;
  maxDiscount?: number;
  minOrderValue: number;
  usageCount: number;
  usageLimit: number;
  status: 'active' | 'expired' | 'scheduled' | 'paused';
  startDate: string;
  endDate: string;
  applicableProducts: string[];
}

export interface SponsoredProduct {
  id: string;
  productId: string;
  productName: string;
  dailyBudget: number;
  maxCpc: number;
  spent: number;
  impressions: number;
  clicks: number;
  orders: number;
  status: 'active' | 'paused' | 'out_of_budget' | 'pending_approval';
  startDate: string;
}

export interface BrandInfo {
  id: string;
  name: string;
  logo?: string;
  description: string;
  verified: boolean;
  registrationDate: string;
  productsCount: number;
  totalSales: number;
}

export interface StorefrontSettings {
  storeName: string;
  slug: string;
  logo?: string;
  banner?: string;
  description: string;
  returnPolicy: string;
  shippingPolicy: string;
  supportEmail: string;
  supportPhone: string;
  socialLinks: { platform: string; url: string }[];
  theme: { primaryColor: string; accentColor: string };
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'manager' | 'catalog' | 'finance' | 'support';
  status: 'active' | 'inactive';
  lastActive: string;
  avatar?: string;
}

export interface SellerReview {
  id: string;
  productId: string;
  productName: string;
  customerId: string;
  customerName: string;
  rating: number;
  title: string;
  comment: string;
  reply?: string;
  repliedAt?: string;
  status: 'published' | 'hidden' | 'flagged';
  date: string;
  helpful: number;
}

export interface SellerNotification {
  id: string;
  type: 'order' | 'approval' | 'payout' | 'system' | 'promotion' | 'return' | 'review';
  title: string;
  body: string;
  read: boolean;
  actionUrl?: string;
  createdAt: string;
}

export interface SellerSettings {
  storeInfo: {
    name: string;
    gstin: string;
    pan: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
  bankDetails: {
    accountName: string;
    accountNumber: string;
    ifsc: string;
    bankName: string;
    branch: string;
    upiId?: string;
  };
  notifications: {
    emailOrders: boolean;
    emailReturns: boolean;
    emailPayouts: boolean;
    smsOrders: boolean;
    pushOrders: boolean;
    pushPromotions: boolean;
  };
}

export interface DashboardKPI {
  /** Paid revenue over the requested `period` — follows the Today/Week/Month selector. */
  periodSales: number;
  /** Paid orders over the requested `period`. */
  periodOrders: number;
  /** Always today, regardless of the selector — used by the sidebar badges. */
  todaySales: number;
  monthlySales: number;
  /** Lifetime paid revenue. */
  totalRevenue: number;
  pendingOrders: number;
  acceptedOrders: number;
  packedOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  returnRequests: number;
  refundRequests: number;
  lowStock: number;
  outOfStock: number;
  approvalPending: number;
  rejected: number;
  walletBalance: number;
  pendingPayout: number;
  completedPayout: number;
  sellerRating: number;
  healthScore: number;
  totalProducts: number;
  totalOrders: number;
}

export interface ReportData {
  type: 'sales' | 'inventory' | 'performance' | 'returns';
  period: string;
  summary: Record<string, number>;
  rows: Record<string, string | number>[];
}

export interface SupportTicket {
  id: string;
  subject: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  createdAt: string;
  updatedAt: string;
  messages: { sender: string; body: string; time: string }[];
}

// ─── Seller API ───────────────────────────────────────────────────────────────

export const sellerApi = {
  // ── Identity ─────────────────────────────────────────────────────
  /**
   * The seller account owned by the signed-in user.
   *
   * Every other call here is keyed on a `sellerId`; this is where that id comes
   * from. The gateway resolves it from the JWT subject, so the portal never has
   * to guess — which is what it used to do, with a hard-coded `SLR-9201`.
   */
  getMyAccount: () => api.get<any>('/sellers/me'),

  // ── Dashboard ────────────────────────────────────────────────────
  /**
   * Dashboard KPIs, already unwrapped.
   *
   * The gateway answers `{ success, sellerId, period, data: {…} }` and
   * `request()` strips that envelope, so what resolves here is the KPI object
   * itself — **not** `{ data: KPI }`. Typing it as the latter made the dashboard
   * read `res.data.data`, which is `undefined`, so every figure on the page
   * rendered as "—" while the API was returning real numbers.
   */
  getDashboard: (sellerId: string, period?: 'today' | 'week' | 'month') =>
    api.get<DashboardKPI>(`/sellers/${sellerId}/dashboard`, { period }),

  getRecentOrders: (sellerId: string, limit = 5) =>
    api.get<{ data: SellerOrder[] }>(`/sellers/${sellerId}/orders`, { limit, sort: '-createdAt' }),

  getCampaignStats: (sellerId: string) =>
    api.get<{ data: Campaign[] }>(`/sellers/${sellerId}/campaigns`, { limit: 5 }),

  // ── Products / Catalog ───────────────────────────────────────────
  getProducts: (sellerId: string, params?: { page?: number; limit?: number; status?: string; search?: string; category?: string }) =>
    api.get<{ data: SellerProduct[]; total: number }>(`/sellers/${sellerId}/products`, params as any),

  getProductById: (sellerId: string, productId: string) =>
    api.get<{ data: SellerProduct }>(`/sellers/${sellerId}/products/${productId}`),

  createProduct: (sellerId: string, payload: object) =>
    api.post<{ data: { productId: string } }>(`/sellers/${sellerId}/products`, payload),

  updateProduct: (sellerId: string, productId: string, payload: object) =>
    api.put<{ data: SellerProduct }>(`/sellers/${sellerId}/products/${productId}`, payload),

  saveDraft: (sellerId: string, payload: object) =>
    api.post<{ data: { productId: string } }>(`/sellers/${sellerId}/products/draft`, payload),

  bulkUpload: (sellerId: string, products: object[]) =>
    api.post<{ data: { uploaded: number; errors: number; errorDetails: { row: number; message: string }[] } }>(
      `/sellers/${sellerId}/products/bulk`, { products },
    ),

  deleteProduct: (sellerId: string, productId: string) =>
    api.delete(`/sellers/${sellerId}/products/${productId}`),

  // ── Listings (offers on products already in the catalogue) ───────
  //
  // Distinct from `createProduct`, which mints a *new* catalogue entry. These
  // attach this seller's price and stock to an entry another seller authored,
  // which is what lets two merchants compete on one product page.
  //
  // Addressed at `/seller/*`, not `/sellers/:sellerId/*`: the seller is taken
  // from the signed-in token rather than the URL, so there is no id to forge.
  createListing: (payload: {
    productId?: string;
    gtin?: string;
    sellingPrice: number;
    stock: number;
    condition?: string;
    sku?: string;
    isFulfilledByKartseek?: boolean;
  }) => api.post<{ listingId: string; productId: string; productName: string; status: string; message: string }>(
    '/seller/listings', payload,
  ),

  getListings: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get<{ data: SellerListing[]; total: number }>('/seller/listings', params as any),

  updateListing: (listingId: string, payload: {
    sellingPrice?: number;
    stock?: number;
    condition?: string;
    isActive?: boolean;
  }) => api.patch<{ success: boolean; listingId: string }>(`/seller/listings/${listingId}`, payload),

  /** Find a catalogue product to offer on, by name or barcode. */
  searchCatalogue: (query: string) =>
    api.get<{ data: any[]; total: number }>('/marketplace/products', { search: query, limit: 10 }),

  // ── Inventory ────────────────────────────────────────────────────
  getInventory: (sellerId: string, params?: { page?: number; search?: string; sort?: string }) =>
    api.get<{ data: SellerProduct[]; total: number }>(`/sellers/${sellerId}/inventory`, params as any),

  updateStock: (sellerId: string, productId: string, quantity: number) =>
    api.put(`/sellers/${sellerId}/inventory/${productId}`, { stock: quantity }),

  getLowStockProducts: (sellerId: string) =>
    api.get<{ data: SellerProduct[] }>(`/sellers/${sellerId}/inventory/low-stock`),

  setLowStockThreshold: (sellerId: string, productId: string, threshold: number) =>
    api.put(`/sellers/${sellerId}/inventory/${productId}/threshold`, { threshold }),

  // ── Orders ───────────────────────────────────────────────────────
  getOrders: (sellerId: string, params?: { status?: string; page?: number; limit?: number; search?: string }) =>
    api.get<{ data: SellerOrder[]; total: number }>(`/sellers/${sellerId}/orders`, params as any),

  getOrderById: (sellerId: string, orderId: string) =>
    api.get<{ data: SellerOrder }>(`/sellers/${sellerId}/orders/${orderId}`),

  acceptOrder: (sellerId: string, orderId: string) =>
    api.post(`/sellers/${sellerId}/orders/${orderId}/accept`),

  rejectOrder: (sellerId: string, orderId: string, reason: string) =>
    api.post(`/sellers/${sellerId}/orders/${orderId}/reject`, { reason }),

  shipOrder: (sellerId: string, orderId: string, trackingId: string, courier: string) =>
    api.post(`/sellers/${sellerId}/orders/${orderId}/ship`, { trackingId, courier }),

  markPacked: (sellerId: string, orderId: string) =>
    api.post(`/sellers/${sellerId}/orders/${orderId}/pack`),

  // ── Returns & Refunds ────────────────────────────────────────────
  getReturns: (sellerId: string, params?: { status?: string; page?: number; search?: string }) =>
    api.get<{ data: any[]; total: number }>(`/sellers/${sellerId}/returns`, params as any),

  acceptReturn: (sellerId: string, returnId: string) =>
    api.post(`/sellers/${sellerId}/returns/${returnId}/accept`),

  rejectReturn: (sellerId: string, returnId: string, reason: string) =>
    api.post(`/sellers/${sellerId}/returns/${returnId}/reject`, { reason }),

  getRefunds: (sellerId: string, params?: { status?: string; page?: number; search?: string }) =>
    api.get<{ data: any[]; total: number }>(`/sellers/${sellerId}/refunds`, params as any),

  // ── Finance: Wallet ──────────────────────────────────────────────
  getWallet: (sellerId: string) =>
    api.get<{ data: WalletData }>(`/sellers/${sellerId}/wallet`),

  getWalletTransactions: (sellerId: string, params?: { type?: string; page?: number; search?: string }) =>
    api.get<{ data: WalletTransaction[]; total: number }>(`/sellers/${sellerId}/wallet/transactions`, params as any),

  // ── Finance: Payouts ─────────────────────────────────────────────
  getPayouts: (sellerId: string, params?: { status?: string; page?: number; search?: string }) =>
    api.get<{ data: Payout[]; total: number }>(`/sellers/${sellerId}/payouts`, params as any),

  requestPayout: (sellerId: string, amount: number, bankAccountId?: string) =>
    api.post<{ data: Payout }>(`/sellers/${sellerId}/payouts`, { amount, bankAccountId }),

  // ── Finance: Transactions ────────────────────────────────────────
  getTransactions: (sellerId: string, params?: { type?: string; page?: number; search?: string; dateFrom?: string; dateTo?: string }) =>
    api.get<{ data: WalletTransaction[]; total: number }>(`/sellers/${sellerId}/transactions`, params as any),

  // ── Finance: Commissions ─────────────────────────────────────────
  getCommissions: (sellerId: string, params?: { page?: number; category?: string; dateFrom?: string; dateTo?: string }) =>
    api.get<{ data: Commission[]; total: number }>(`/sellers/${sellerId}/commissions`, params as any),

  // ── Marketing: Campaigns ─────────────────────────────────────────
  getCampaigns: (sellerId: string, params?: { status?: string; page?: number }) =>
    api.get<{ data: Campaign[]; total: number }>(`/sellers/${sellerId}/campaigns`, params as any),

  createCampaign: (sellerId: string, payload: object) =>
    api.post<{ data: Campaign }>(`/sellers/${sellerId}/campaigns`, payload),

  updateCampaign: (sellerId: string, campaignId: string, payload: object) =>
    api.put(`/sellers/${sellerId}/campaigns/${campaignId}`, payload),

  pauseCampaign: (sellerId: string, campaignId: string) =>
    api.post(`/sellers/${sellerId}/campaigns/${campaignId}/pause`),

  resumeCampaign: (sellerId: string, campaignId: string) =>
    api.post(`/sellers/${sellerId}/campaigns/${campaignId}/resume`),

  deleteCampaign: (sellerId: string, campaignId: string) =>
    api.delete(`/sellers/${sellerId}/campaigns/${campaignId}`),

  // ── Marketing: Promotions ────────────────────────────────────────
  getPromotions: (sellerId: string, params?: { status?: string; page?: number; search?: string }) =>
    api.get<{ data: Promotion[]; total: number }>(`/sellers/${sellerId}/promotions`, params as any),

  createPromotion: (sellerId: string, payload: object) =>
    api.post<{ data: Promotion }>(`/sellers/${sellerId}/promotions`, payload),

  updatePromotion: (sellerId: string, promoId: string, payload: object) =>
    api.put(`/sellers/${sellerId}/promotions/${promoId}`, payload),

  deletePromotion: (sellerId: string, promoId: string) =>
    api.delete(`/sellers/${sellerId}/promotions/${promoId}`),

  // ── Marketing: Sponsored Products ────────────────────────────────
  getSponsoredProducts: (sellerId: string, params?: { status?: string; page?: number; search?: string }) =>
    api.get<{ data: SponsoredProduct[]; total: number }>(`/sellers/${sellerId}/sponsored`, params as any),

  sponsorProduct: (sellerId: string, payload: { productId: string; dailyBudget: number; maxCpc: number }) =>
    api.post<{ data: SponsoredProduct }>(`/sellers/${sellerId}/sponsored`, payload),

  pauseSponsored: (sellerId: string, sponsoredId: string) =>
    api.post(`/sellers/${sellerId}/sponsored/${sponsoredId}/pause`),

  resumeSponsored: (sellerId: string, sponsoredId: string) =>
    api.post(`/sellers/${sellerId}/sponsored/${sponsoredId}/resume`),

  // ── Marketing: Brand Center ──────────────────────────────────────
  getBrandInfo: (sellerId: string) =>
    api.get<{ data: BrandInfo }>(`/sellers/${sellerId}/brand`),

  updateBrand: (sellerId: string, payload: object) =>
    api.put(`/sellers/${sellerId}/brand`, payload),

  // ── Store: Storefront ────────────────────────────────────────────
  getStorefront: (sellerId: string) =>
    api.get<{ data: StorefrontSettings }>(`/sellers/${sellerId}/storefront`),

  updateStorefront: (sellerId: string, payload: Partial<StorefrontSettings>) =>
    api.put(`/sellers/${sellerId}/storefront`, payload),

  // ── Store: Reviews ───────────────────────────────────────────────
  getReviews: (sellerId: string, params?: { rating?: number; status?: string; page?: number; search?: string }) =>
    api.get<{ data: SellerReview[]; total: number }>(`/sellers/${sellerId}/reviews`, params as any),

  replyToReview: (sellerId: string, reviewId: string, reply: string) =>
    api.post(`/sellers/${sellerId}/reviews/${reviewId}/reply`, { reply }),

  // ── Analytics: Reports ───────────────────────────────────────────
  getReports: (sellerId: string, params?: { type?: string; dateFrom?: string; dateTo?: string }) =>
    api.get<{ data: ReportData }>(`/sellers/${sellerId}/reports`, params as any),

  exportReport: (sellerId: string, type: string, format: 'csv' | 'xlsx') =>
    api.get<Blob>(`/sellers/${sellerId}/reports/export`, { type, format }),

  // ── Account: Notifications ───────────────────────────────────────
  getNotifications: (sellerId: string, params?: { type?: string; page?: number; unreadOnly?: boolean }) =>
    api.get<{ data: SellerNotification[]; total: number; unread: number }>(`/sellers/${sellerId}/notifications`, params as any),

  markNotificationRead: (sellerId: string, notificationId: string) =>
    api.post(`/sellers/${sellerId}/notifications/${notificationId}/read`),

  markAllNotificationsRead: (sellerId: string) =>
    api.post(`/sellers/${sellerId}/notifications/read-all`),

  // ── Account: Staff ───────────────────────────────────────────────
  getStaff: (sellerId: string) =>
    api.get<{ data: StaffMember[] }>(`/sellers/${sellerId}/staff`),

  addStaff: (sellerId: string, payload: Omit<StaffMember, 'id' | 'lastActive' | 'status'>) =>
    api.post<{ data: StaffMember }>(`/sellers/${sellerId}/staff`, payload),

  updateStaff: (sellerId: string, staffId: string, payload: Partial<StaffMember>) =>
    api.put(`/sellers/${sellerId}/staff/${staffId}`, payload),

  removeStaff: (sellerId: string, staffId: string) =>
    api.delete(`/sellers/${sellerId}/staff/${staffId}`),

  // ── Account: Settings ────────────────────────────────────────────
  getSettings: (sellerId: string) =>
    api.get<{ data: SellerSettings }>(`/sellers/${sellerId}/settings`),

  updateSettings: (sellerId: string, payload: Partial<SellerSettings>) =>
    api.put(`/sellers/${sellerId}/settings`, payload),

  changePassword: (sellerId: string, currentPassword: string, newPassword: string) =>
    api.post(`/sellers/${sellerId}/settings/change-password`, { currentPassword, newPassword }),

  // ── Account: Help & Support ──────────────────────────────────────
  getSupportTickets: (sellerId: string, params?: { status?: string; page?: number }) =>
    api.get<{ data: SupportTicket[]; total: number }>(`/sellers/${sellerId}/support`, params as any),

  createSupportTicket: (sellerId: string, payload: { subject: string; category: string; priority: string; message: string }) =>
    api.post<{ data: SupportTicket }>(`/sellers/${sellerId}/support`, payload),

  replySupportTicket: (sellerId: string, ticketId: string, message: string) =>
    api.post(`/sellers/${sellerId}/support/${ticketId}/reply`, { message }),

  // ── Brand Center ──────────────────────────────────────────────────
  getBrand: (sellerId: string) =>
    api.get<{ data: any }>(`/sellers/${sellerId}/brand`),

  registerBrand: (sellerId: string, payload: { brandName: string; trademarkNumber?: string; category?: string; description?: string }) =>
    api.post(`/sellers/${sellerId}/brand`, payload),

  getBrandAnalytics: (sellerId: string, period?: string) =>
    api.get<{ data: any }>(`/sellers/${sellerId}/brand/analytics`, { period }),

  // ── Shipping & Logistics ──────────────────────────────────────────
  getShippingZones: (sellerId: string) =>
    api.get<{ data: any[] }>(`/sellers/${sellerId}/shipping/zones`),

  updateShippingZone: (sellerId: string, zoneId: string, payload: { isActive?: boolean; baseRate?: number; perKgRate?: number; freeAbove?: number }) =>
    api.put(`/sellers/${sellerId}/shipping/zones/${zoneId}`, payload),

  getShippingRates: (sellerId: string) =>
    api.get<{ data: any[] }>(`/sellers/${sellerId}/shipping/rates`),

  getShippingCouriers: (sellerId: string) =>
    api.get<{ data: any[] }>(`/sellers/${sellerId}/shipping/couriers`),

  updateShippingCouriers: (sellerId: string, payload: { defaultCourier?: string; enabledCouriers?: string[] }) =>
    api.put(`/sellers/${sellerId}/shipping/couriers`, payload),

  getShipmentTracking: (sellerId: string, params?: { status?: string; page?: number }) =>
    api.get<{ data: any[]; total: number }>(`/sellers/${sellerId}/shipping/tracking`, params as any),

  getShippingSettings: (sellerId: string) =>
    api.get<any>(`/sellers/${sellerId}/shipping/settings`),

  updateShippingSettings: (sellerId: string, payload: object) =>
    api.put(`/sellers/${sellerId}/shipping/settings`, payload),

  // ── Flash Deals ──────────────────────────────────────────────────────────

  getFlashDeals: (sellerId: string) =>
    api.get<{ data: any[]; total: number }>(`/sellers/${sellerId}/flash-deals`),

  getAvailableDeals: (sellerId: string) =>
    api.get<{ data: any[]; total: number }>(`/sellers/${sellerId}/flash-deals/available`),

  nominateProduct: (sellerId: string, dto: { dealId: string; productId: string; productName: string; proposedDiscount: number; stockAllocated: number; note?: string }) =>
    api.post(`/sellers/${sellerId}/flash-deals/nominate`, dto),

  getNominations: (sellerId: string) =>
    api.get<{ data: any[]; total: number }>(`/sellers/${sellerId}/flash-deals/nominations`),

  withdrawFromDeal: (sellerId: string, dealId: string) =>
    api.patch(`/sellers/${sellerId}/flash-deals/${dealId}/withdraw`, {}),

  // ── Disputes ──────────────────────────────────────────────────────────
  getDisputes: (sellerId: string, params?: { status?: string; page?: number; search?: string }) =>
    api.get<{ data: any[]; total: number }>(`/sellers/${sellerId}/disputes`, params as any),

  // ── Coupons ───────────────────────────────────────────────────────────
  getCoupons: (sellerId: string, params?: { status?: string; page?: number; search?: string }) =>
    api.get<{ data: any[]; total: number }>(`/sellers/${sellerId}/coupons`, params as any),

  createCoupon: (sellerId: string, payload: object) =>
    api.post<{ data: any }>(`/sellers/${sellerId}/coupons`, payload),

  // ── Customer Messages ─────────────────────────────────────────────────
  getMessages: (sellerId: string, params?: { page?: number; search?: string }) =>
    api.get<{ data: any[]; total: number }>(`/sellers/${sellerId}/messages`, params as any),

  // `sendMessage` removed: it posted to /sellers/:id/messages/:id/reply, which
  // no controller declares, and the Messages page rendered the reply anyway.
  // Re-add it alongside a real messaging store, not before.

  // ── Warehouses ────────────────────────────────────────────────────────
  getWarehouses: (sellerId: string) =>
    api.get<{ data: any[] }>(`/sellers/${sellerId}/warehouses`),

  createWarehouse: (sellerId: string, payload: object) =>
    api.post<{ data: any }>(`/sellers/${sellerId}/warehouses`, payload),

  updateWarehouse: (sellerId: string, warehouseId: string, payload: object) =>
    api.put(`/sellers/${sellerId}/warehouses/${warehouseId}`, payload),

  // ── Bundles ───────────────────────────────────────────────────────────
  getBundles: (sellerId: string) =>
    api.get<{ data: any[]; total: number }>(`/sellers/${sellerId}/bundles`),

  createBundle: (sellerId: string, payload: object) =>
    api.post<{ data: any }>(`/sellers/${sellerId}/bundles`, payload),

  // ── GST ───────────────────────────────────────────────────────────────
  getGstInfo: (sellerId: string) =>
    api.get<{ data: any }>(`/sellers/${sellerId}/gst`),

  // ── Performance ───────────────────────────────────────────────────────
  getPerformanceMetrics: (sellerId: string, period?: string) =>
    api.get<{ data: any }>(`/sellers/${sellerId}/performance`, { period }),

  getSlaCompliance: (sellerId: string) =>
    api.get<{ data: any }>(`/sellers/${sellerId}/sla-compliance`),

  getPenaltyLedger: (sellerId: string) =>
    api.get<{ data: any[] }>(`/sellers/${sellerId}/penalty-ledger`),

  // ── Analytics ─────────────────────────────────────────────────────────
  getAnalytics: (sellerId: string, params?: { type?: string; period?: string }) =>
    api.get<{ data: any }>(`/sellers/${sellerId}/analytics`, params as any),

  getInsights: (sellerId: string, type: string, params?: { period?: string }) =>
    api.get<{ data: any }>(`/sellers/${sellerId}/analytics/${type}`, params as any),

  // ── Product Sub-resources ─────────────────────────────────────────────
  getProductImages: (sellerId: string, productId: string) =>
    api.get<{ data: any[] }>(`/sellers/${sellerId}/products/${productId}/images`),

  /**
   * Attach an image by URL.
   *
   * Was `FormData` against a route that did not exist. There is no upload
   * pipeline in this service — images are referenced by URL, so that is what the
   * endpoint takes.
   */
  addProductImage: (sellerId: string, productId: string, payload: { url: string; altText?: string; isPrimary?: boolean }) =>
    api.post<{ image: any }>(`/sellers/${sellerId}/products/${productId}/images`, payload),

  /**
   * Upload a brand logo or banner and get its stored URL back.
   *
   * `POST /upload/brand-image` is SELLER-scoped and has existed all along; the
   * portal's picker simply had no handler and the client had no way to send a
   * file. See `api.upload`.
   */
  uploadBrandImage: (sellerId: string, file: File, type: 'logo' | 'banner') =>
    api.upload<{ url: string; size: number }>('/upload/brand-image', file, { brandId: sellerId, type }),

  setPrimaryProductImage: (sellerId: string, productId: string, imageId: string) =>
    api.post(`/sellers/${sellerId}/products/${productId}/images/${imageId}/primary`),

  reorderProductImages: (sellerId: string, productId: string, imageIds: string[]) =>
    api.post(`/sellers/${sellerId}/products/${productId}/images/reorder`, { imageIds }),

  deleteProductImage: (sellerId: string, productId: string, imageId: string) =>
    api.delete(`/sellers/${sellerId}/products/${productId}/images/${imageId}`),

  getProductSeo: (sellerId: string, productId: string) =>
    api.get<{ data: any }>(`/sellers/${sellerId}/products/${productId}/seo`),

  updateProductSeo: (sellerId: string, productId: string, payload: object) =>
    api.put(`/sellers/${sellerId}/products/${productId}/seo`, payload),

  getProductSpin360: (sellerId: string, productId: string) =>
    api.get<{ data: string[] }>(`/sellers/${sellerId}/products/${productId}/spin360`),

  setProductSpin360: (sellerId: string, productId: string, urls: string[]) =>
    api.put(`/sellers/${sellerId}/products/${productId}/spin360`, { urls }),

  getProductVariants: (sellerId: string, productId: string) =>
    api.get<{ data: any[] }>(`/sellers/${sellerId}/products/${productId}/variants`),

  createProductVariant: (sellerId: string, productId: string, payload: object) =>
    api.post<{ variantId: string; variant: any }>(`/sellers/${sellerId}/products/${productId}/variants`, payload),

  updateProductVariant: (sellerId: string, productId: string, variantId: string, payload: object) =>
    api.put(`/sellers/${sellerId}/products/${productId}/variants/${variantId}`, payload),

  deleteProductVariant: (sellerId: string, productId: string, variantId: string) =>
    api.delete(`/sellers/${sellerId}/products/${productId}/variants/${variantId}`),

  /**
   * Apply price/stock edits to several products at once.
   *
   * The shape was `{ productId, updates: {...} }`, which the server never saw —
   * the route did not exist. It now takes the fields flat alongside the id,
   * matching `SellerService.bulkEditProducts`, and reports per-row failures
   * rather than a single error count.
   */
  bulkEditProducts: (sellerId: string, edits: { productId: string; price?: number; stock?: number }[]) =>
    api.post<{ success: boolean; updated: number; failed: { productId: string; reason: string }[] }>(
      `/sellers/${sellerId}/products/bulk-edit`, { edits }),

  exportProducts: (sellerId: string, format: 'csv' | 'xlsx') =>
    api.get<Blob>(`/sellers/${sellerId}/products/export`, { format }),

  importProducts: (sellerId: string, payload: FormData) =>
    api.post<{ data: { imported: number; errors: number } }>(`/sellers/${sellerId}/products/import`, payload),

  // ── Return Policy ─────────────────────────────────────────────────────
  getReturnPolicy: (sellerId: string) =>
    api.get<{ data: any }>(`/sellers/${sellerId}/returns/policy`),

  updateReturnPolicy: (sellerId: string, payload: object) =>
    api.put(`/sellers/${sellerId}/returns/policy`, payload),

  // ── Payout Bank Accounts ──────────────────────────────────────────────
  getBankAccounts: (sellerId: string) =>
    api.get<{ data: any[] }>(`/sellers/${sellerId}/bank-accounts`),

  addBankAccount: (sellerId: string, payload: object) =>
    api.post<{ data: any }>(`/sellers/${sellerId}/bank-accounts`, payload),

  deleteBankAccount: (sellerId: string, accountId: string) =>
    api.delete(`/sellers/${sellerId}/bank-accounts/${accountId}`),

  setDefaultBankAccount: (sellerId: string, accountId: string) =>
    api.post(`/sellers/${sellerId}/bank-accounts/${accountId}/default`),

  // ── GST Compliance ────────────────────────────────────────────────────
  getGstCompliance: (sellerId: string) =>
    api.get<{ data: any }>(`/sellers/${sellerId}/gst/compliance`),

  downloadGstReport: (sellerId: string, period: string) =>
    api.get<Blob>(`/sellers/${sellerId}/gst/report`, { period }),

  // ── Performance Sub-pages ─────────────────────────────────────────────
  getHealthScore: (sellerId: string) =>
    api.get<{ data: any }>(`/sellers/${sellerId}/performance/health`),

  // ── Advertising ───────────────────────────────────────────────────────
  getAdCampaigns: (sellerId: string, params?: { status?: string; page?: number }) =>
    api.get<{ data: any[]; total: number }>(`/sellers/${sellerId}/advertising`, params as any),

  createAdCampaign: (sellerId: string, payload: object) =>
    api.post<{ data: any }>(`/sellers/${sellerId}/advertising`, payload),

  // ── A+ Content ────────────────────────────────────────────────────────
  getAplusContent: (sellerId: string, params?: { status?: string; page?: number }) =>
    api.get<{ data: any[]; total: number }>(`/sellers/${sellerId}/a-plus`, params as any),

  createAplusContent: (sellerId: string, payload: object) =>
    api.post<{ data: any }>(`/sellers/${sellerId}/a-plus`, payload),

  updateAplusContent: (sellerId: string, contentId: string, payload: object) =>
    api.put(`/sellers/${sellerId}/a-plus/${contentId}`, payload),

  // ── Reviews: Q&A ──────────────────────────────────────────────────────
  getQuestions: (sellerId: string, params?: { status?: string; page?: number; search?: string }) =>
    api.get<{ data: any[]; total: number }>(`/sellers/${sellerId}/questions`, params as any),

  answerQuestion: (sellerId: string, questionId: string, answer: string) =>
    api.post(`/sellers/${sellerId}/questions/${questionId}/answer`, { answer }),

  // ── Brand Center: Follower Updates ────────────────────────────────────
  sendFollowerUpdate: (sellerId: string, payload: { type: string; title: string; body: string; imageUrl?: string }) =>
    api.post(`/sellers/${sellerId}/brand/follower-update`, payload),

  getFollowerUpdates: (sellerId: string) =>
    api.get<{ data: any[] }>(`/sellers/${sellerId}/brand/follower-updates`),

  // ── Account: Notification Preferences ─────────────────────────────────
  getNotificationPreferences: (sellerId: string) =>
    api.get<{ data: any }>(`/sellers/${sellerId}/settings/notifications`),

  updateNotificationPreferences: (sellerId: string, payload: object) =>
    api.put(`/sellers/${sellerId}/settings/notifications`, payload),

  // ── Account: Security ─────────────────────────────────────────────────
  getSessions: (sellerId: string) =>
    api.get<{ data: any[] }>(`/sellers/${sellerId}/settings/sessions`),

  revokeSession: (sellerId: string, sessionId: string) =>
    api.delete(`/sellers/${sellerId}/settings/sessions/${sessionId}`),

  get2FAStatus: (sellerId: string) =>
    api.get<{ data: any }>(`/sellers/${sellerId}/settings/2fa`),

  enable2FA: (sellerId: string) =>
    api.post<{ data: { qrCode: string; secret: string } }>(`/sellers/${sellerId}/settings/2fa/enable`),

  disable2FA: (sellerId: string, code: string) =>
    api.post(`/sellers/${sellerId}/settings/2fa/disable`, { code }),

  // ── Account: Onboarding ───────────────────────────────────────────────
  getOnboardingProgress: (sellerId: string) =>
    api.get<{ data: any }>(`/sellers/${sellerId}/onboarding`),

  completeOnboardingStep: (sellerId: string, stepId: string) =>
    api.post(`/sellers/${sellerId}/onboarding/${stepId}/complete`),

  // ── Account: Developer / API Keys ─────────────────────────────────────
  getApiKeys: (sellerId: string) =>
    api.get<{ data: any[] }>(`/sellers/${sellerId}/developer/api-keys`),

  createApiKey: (sellerId: string, payload: { name: string; scopes: string[] }) =>
    api.post<{ data: { key: string; secret: string } }>(`/sellers/${sellerId}/developer/api-keys`, payload),

  revokeApiKey: (sellerId: string, keyId: string) =>
    api.delete(`/sellers/${sellerId}/developer/api-keys/${keyId}`),

  getWebhooks: (sellerId: string) =>
    api.get<{ data: any[] }>(`/sellers/${sellerId}/developer/webhooks`),

  createWebhook: (sellerId: string, payload: { url: string; events: string[] }) =>
    api.post<{ data: any }>(`/sellers/${sellerId}/developer/webhooks`, payload),

  deleteWebhook: (sellerId: string, webhookId: string) =>
    api.delete(`/sellers/${sellerId}/developer/webhooks/${webhookId}`),

  // ── Shipping: Labels, Manifests, FBK ──────────────────────────────────
  getShippingLabels: (sellerId: string, params?: { page?: number; search?: string }) =>
    api.get<{ data: any[]; total: number }>(`/sellers/${sellerId}/shipping/labels`, params as any),

  generateLabel: (sellerId: string, orderId: string) =>
    api.post<{ data: any }>(`/sellers/${sellerId}/shipping/labels`, { orderId }),

  getManifests: (sellerId: string, params?: { page?: number }) =>
    api.get<{ data: any[]; total: number }>(`/sellers/${sellerId}/shipping/manifests`, params as any),

  createManifest: (sellerId: string, orderIds: string[]) =>
    api.post<{ data: any }>(`/sellers/${sellerId}/shipping/manifests`, { orderIds }),

  getFbkInventory: (sellerId: string) =>
    api.get<{ data: any[] }>(`/sellers/${sellerId}/fbk`),

  createFbkShipment: (sellerId: string, payload: object) =>
    api.post<{ data: any }>(`/sellers/${sellerId}/fbk/shipments`, payload),

  // ── Translations ──────────────────────────────────────────────────────
  getTranslations: (sellerId: string) =>
    api.get<{ data: any[] }>(`/sellers/${sellerId}/translations`),

  updateTranslation: (sellerId: string, productId: string, locale: string, payload: object) =>
    api.put(`/sellers/${sellerId}/translations/${productId}/${locale}`, payload),
};
