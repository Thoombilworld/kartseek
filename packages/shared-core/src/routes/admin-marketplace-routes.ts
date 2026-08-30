/**
 * KARTSEEK Admin Marketplace Route Helpers
 * Single source of truth for all /admin/marketplace/* navigation.
 * Use these helpers everywhere — prevents typos and simplifies future changes.
 */

const BASE = '/admin/marketplace';

export const AdminMarketplaceRoutes = {
  home:              () => BASE,
  dashboard:         () => `${BASE}/dashboard`,
  categories:        () => `${BASE}/categories`,
  subcategories:     () => `${BASE}/subcategories`,
  attributes:        () => `${BASE}/attributes`,
  products:          () => `${BASE}/products`,
  productApprovals:  () => `${BASE}/product-approvals`,
  listingApprovals:  () => `${BASE}/listing-approvals`,
  sellers:           () => `${BASE}/sellers`,
  sellerApprovals:   () => `${BASE}/seller-approvals`,
  brands:            () => `${BASE}/brands`,
  brandCenter:       () => `${BASE}/brand-center`,
  campaigns:         () => `${BASE}/campaigns`,
  banners:           () => `${BASE}/banners`,
  featuredProducts:  () => `${BASE}/featured-products`,
  orders:            () => `${BASE}/orders`,
  returns:           () => `${BASE}/returns`,
  refunds:           () => `${BASE}/refunds`,
  commissions:       () => `${BASE}/commissions`,
  payouts:           () => `${BASE}/payouts`,
  reports:           () => `${BASE}/reports`,
  auditLogs:         () => `${BASE}/audit-logs`,
  settings:          () => `${BASE}/settings`,
  hsnTaxMaster:      () => `${BASE}/hsn-tax-master`,
  countryCompliance: () => `${BASE}/compliance/countries`,

  // Dynamic routes
  sellerDetail:      (id: string) => `${BASE}/sellers/${id}`,
  productDetail:     (id: string) => `${BASE}/products/${id}`,
  brandDetail:       (id: string) => `${BASE}/brands/${id}`,
  campaignDetail:    (id: string) => `${BASE}/campaigns/${id}`,
  orderDetail:       (id: string) => `${BASE}/orders/${id}`,
} as const;

export default AdminMarketplaceRoutes;
