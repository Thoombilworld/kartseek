/**
 * KARTSEEK Typed API Client
 *
 * Wraps fetch with:
 *  - Automatic base URL resolution (env var or fallback)
 *  - JWT Bearer token injection
 *  - Standardised error handling
 *  - Generic typed responses
 */

import { regionHeaders } from '@/lib/region-headers';
import { getAuthToken, AUTH_TOKEN_KEY } from '@/lib/auth-token';
import { API_BASE_URL } from './config/api-base';

const API_BASE = API_BASE_URL;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  statusCode?: number;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ─── Token helper (client-side only) ─────────────────────────────────────────

const getToken = getAuthToken;

function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)kartseek_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// ─── Session refresh ──────────────────────────────────────────────────────────

/**
 * Renew an expired access token, transparently.
 *
 * `AuthProvider` has always saved the refresh token at sign-in and cleared it at
 * sign-out, and `authApi.refresh` has always existed — but nothing ever called
 * it, and this client had no handling for a 401 at all. Access tokens expire
 * after an hour, so an hour into a session every request began failing while the
 * app still showed the customer as signed in: the profile, wallet, loyalty and
 * order pages all rendered "You must be logged in to access this resource" over
 * a header displaying the customer's own name. The only way out was to sign out
 * and back in.
 *
 * A 401 now spends the refresh token once and replays the original request.
 */
const REFRESH_TOKEN_KEY = 'kartseek_refresh_token';

/**
 * The in-flight refresh, if any.
 *
 * A page opens with several requests at once — the profile hub fires eleven —
 * and if the token has expired they all come back 401 together. Without this
 * they would each spend the refresh token, and a rotating refresh token means
 * the first success invalidates the rest, logging the customer out on the very
 * request that was supposed to keep them in.
 */
let refreshInFlight: Promise<string | null> | null = null;

function readRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * `AuthProvider` mirrors the access token into a cookie as well as
 * localStorage, because `proxy.ts` runs in the edge runtime and can only read
 * cookies. A refresh that updated only localStorage would leave the expired
 * token in the cookie, so the two stores would disagree about the session — and
 * anything reading the cookie would keep presenting a token the gateway has
 * already rejected. Kept byte-identical to the `persist()` call that writes it.
 */
const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

function writeTokenCookie(accessToken: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${AUTH_TOKEN_KEY}=${accessToken}; path=/; max-age=${AUTH_COOKIE_MAX_AGE}; SameSite=Strict`;
}

function clearTokenCookie(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${AUTH_TOKEN_KEY}=; path=/; max-age=0; SameSite=Strict`;
}

function storeRefreshedSession(accessToken: string, refreshToken?: string): void {
  try {
    localStorage.setItem(AUTH_TOKEN_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } catch {
    // An unreadable store means the retry goes out with the old token and fails
    // again — the same outcome as before, not a worse one.
  }
  writeTokenCookie(accessToken);
}

function clearSession(): void {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    /* nothing to clear */
  }
  clearTokenCookie();
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  const refreshToken = readRefreshToken();
  if (!refreshToken) return null;

  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ refreshToken }),
        credentials: 'include',
      });
      if (!res.ok) {
        // The refresh token is expired or revoked. Clearing the session is what
        // makes the UI show a signed-out state instead of looping on 401s.
        clearSession();
        return null;
      }
      const body = await res.json();
      const payload = body?.data ?? body;
      const accessToken: string | undefined = payload?.accessToken;
      if (!accessToken) {
        clearSession();
        return null;
      }
      storeRefreshedSession(accessToken, payload?.refreshToken);
      return accessToken;
    } catch {
      // A network failure is not proof the session is dead, so the session is
      // left alone and the original 401 propagates.
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit & { params?: Record<string, string | number | boolean | undefined> } = {},
  /**
   * Set on the replay after a refresh, so a still-401 response is returned to
   * the caller rather than starting another refresh.
   */
  isRetry = false,
): Promise<T> {
  const { params, ...init } = options;

  let url = `${API_BASE}${path}`;
  if (params) {
    const qs = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]),
    ).toString();
    if (qs) url += `?${qs}`;
  }

  const token = getToken();
  // A multipart body must set its own Content-Type: the boundary is generated by
  // the browser, and naming `application/json` here makes the server reject the
  // upload as malformed JSON.
  const isMultipart = init.body instanceof FormData;
  const headers: HeadersInit = {
    ...(isMultipart ? {} : { 'Content-Type': 'application/json' }),
    Accept: 'application/json',
    'X-Client-Platform': 'web',
    // Region scoping — the gateway reads `X-Region-Code` before falling back to
    // IP geolocation, so omitting it scopes the query to the egress location
    // rather than to the region the customer selected.
    ...regionHeaders(),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...init.headers,
  };

  // Inject CSRF token on state-changing requests (double-submit cookie pattern)
  const method = (init.method || 'GET').toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      (headers as Record<string, string>)['X-CSRF-Token'] = csrfToken;
    }
  }

  // Generate client-side request ID for distributed tracing
  // crypto.randomUUID() requires Safari 15.4+ / secure context — fallback for older browsers
  const requestId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  (headers as Record<string, string>)['X-Request-ID'] = requestId;

  // Abort if the API doesn't respond within 8 s — prevents indefinite
  // hangs when the backend (localhost:3001) isn't running.
  // 3 s was too aggressive for mobile / slow networks.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  let res: Response;
  try {
    res = await fetch(url, { ...init, headers, credentials: 'include', signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }

  if (res.status === 401 && !isRetry && !path.startsWith('/auth/')) {
    // `/auth/*` is excluded so a failing sign-in or refresh cannot trigger a
    // refresh of its own.
    const renewed = await refreshAccessToken();
    if (renewed) return request<T>(path, options, true);
  }

  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = await res.text();
    }
    throw new ApiError(res.status, (body as any)?.message ?? res.statusText, body);
  }

  if (res.status === 204) return undefined as T;

  // The gateway's global TransformInterceptor wraps every successful response in
  // a `{ success, data, timestamp }` envelope. Callers are written against the
  // payload itself — e.g. the category page reads `res.data` expecting the
  // product array — so an un-unwrapped envelope leaves `res.data` holding
  // `{ data: [...], total }` and every list silently renders empty. Unwrap here,
  // the single choke point, matching what admin-core.ts already does with
  // `json.data ?? json`.
  //
  // Requiring BOTH keys keeps handlers that legitimately return a `success` flag
  // as their payload (e.g. `{ success: true, id, name }` from createCategory,
  // which the interceptor passes through un-wrapped) intact.
  const body = await res.json();
  if (
    body &&
    typeof body === 'object' &&
    !Array.isArray(body) &&
    'success' in body &&
    'data' in body
  ) {
    return (body as { data: T }).data;
  }
  return body as T;
}

// ─── Method helpers ───────────────────────────────────────────────────────────

export const api = {
  get: <T>(path: string, params?: Record<string, string | number | boolean | undefined>) =>
    request<T>(path, { method: 'GET', params }),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),

  /**
   * POST a file as `multipart/form-data`.
   *
   * `post` JSON-stringifies its body, so it could not send a file at all — which
   * is why the portal's image pickers were decorative even though
   * `/upload/product-image` and `/upload/brand-image` have always existed.
   */
  upload: <T>(
    path: string,
    file: File,
    fields: Record<string, string> = {},
    fieldName = 'image',
  ) => {
    const form = new FormData();
    form.append(fieldName, file);
    for (const [key, value] of Object.entries(fields)) form.append(key, value);
    return request<T>(path, { method: 'POST', body: form });
  },

  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),

  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),

  delete: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'DELETE', body: body ? JSON.stringify(body) : undefined }),
};

// ─── Auth endpoints ───────────────────────────────────────────────────────────

/** The user object as the gateway returns it — not the client's `AuthUser`. */
export interface AuthApiUser {
  id: string;
  name?: string;
  email: string;
  phone?: string;
  /** Lower-case on the wire (`customer`), upper-case in the client union. */
  role: string;
  /**
   * Which seller portal the account may open, issued by the gateway from
   * `users.seller_type`. Null or absent for anyone who is not a seller.
   */
  sellerType?: string | null;
  /** `pending` until an admin approves a self-registered seller. */
  status?: string | null;
  /**
   * Staff market scope, from `users.region_code` / `users.region_locked` and
   * signed into the token: a region-locked admin may act in one market only.
   */
  regionCode?: string | null;
  regionLocked?: boolean;
  avatar?: string | null;
  createdAt?: string;
}

/**
 * Login and register both answer with this shape. Note it carries `success` but
 * no `data`, so the envelope-unwrapping in `request()` deliberately leaves it
 * alone — read `accessToken` off the top level, not off `.data`.
 */
export interface AuthSession {
  success: boolean;
  user: AuthApiUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  /**
   * Staff sign-in only: the password was right but no session was issued. The
   * gateway has delivered a six-digit code and is waiting for
   * `authApi.mfaVerify(challengeToken, code)`, which returns the real session.
   *
   * **A response carrying this has no `accessToken` or `refreshToken`**, so
   * branch on `requires2FA` before reading either. They stay typed as present
   * because every other caller of `/auth/login` — the customer and seller
   * portals — only ever sees the completed form, and widening them would push a
   * check for an impossible state into each of those.
   */
  requires2FA?: boolean;
  /** The pending sign-in. Authorises nothing on its own — see JwtAuthGuard. */
  challengeToken?: string;
  /**
   * The code itself, echoed only by a non-production gateway running with
   * `DEV_MFA_ECHO=true` or `DEV_AUTH_BYPASS=true`, so a developer without a
   * mail provider can still sign in. Never present in production.
   */
  devCode?: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface SellerRegisterPayload extends RegisterPayload {
  /** Which portal the seller is registering for — see SELLER_TYPES on the API. */
  sellerType: string;
  businessName?: string;
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post<AuthSession>('/auth/login', { email, password }),
  register: (payload: RegisterPayload) => api.post<AuthSession>('/auth/register', payload),
  /** Creates a seller bound to one portal. The account starts pending approval. */
  registerSeller: (payload: SellerRegisterPayload) =>
    api.post<AuthSession>('/auth/seller/register', payload),
  /** Completes a staff sign-in. The code is checked by the gateway, never here. */
  mfaVerify: (challengeToken: string, code: string) =>
    api.post<AuthSession>('/auth/mfa/verify', { challengeToken, code }),
  refresh: (refreshToken: string) => api.post<AuthSession>('/auth/refresh', { refreshToken }),
  /** Ends the server-side session. Requires the access token, so call before clearing it. */
  logout: () => api.post<{ success: boolean }>('/auth/logout'),
  profile: () => api.get<AuthApiUser & { success: boolean }>('/auth/profile'),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, newPassword: string) =>
    api.post('/auth/reset-password', { token, newPassword }),
  verifyOtp: (phone: string, otp: string) => api.post('/auth/otp/verify', { phone, otp }),
};

// ─── Region endpoints ─────────────────────────────────────────────────────────

export const regionApi = {
  detect: (lat: number, lng: number) => api.get('/regions/detect', { lat, lng }),
  list: () => api.get('/regions'),
};

// ─── User endpoints ───────────────────────────────────────────────────────────

export const userApi = {
  getProfile: (userId: string) => api.get(`/users/${userId}/profile`),
  updateProfile: (userId: string, data: object) => api.put(`/users/${userId}/profile`, data),
  getAddresses: (userId: string) => api.get(`/users/${userId}/addresses`),
  addAddress: (userId: string, data: object) => api.post(`/users/${userId}/addresses`, data),
  deleteAddress: (userId: string, addressId: string) =>
    api.delete(`/users/${userId}/addresses/${addressId}`),
};

// ─── Order endpoints ──────────────────────────────────────────────────────────

export const orderApi = {
  checkout: (payload: object) => api.post('/orders/checkout', payload),
  tracking: (orderId: string) => api.get(`/orders/${orderId}/tracking`),
  getById: (orderId: string) => api.get(`/orders/${orderId}`),
};

// ─── Taxi endpoints ───────────────────────────────────────────────────────────

export const taxiApi = {
  estimate: (payload: object) => api.post('/taxi/estimate', payload),
  book: (payload: object) => api.post('/taxi/book', payload),
  cancelRide: (rideId: string, reason: string) => api.post(`/taxi/${rideId}/cancel`, { reason }),
  rateDriver: (rideId: string, rating: number, comment?: string) =>
    api.post(`/taxi/${rideId}/rate-driver`, { rating, comment }),
};

// ─── Wallet endpoints ─────────────────────────────────────────────────────────

export const walletApi = {
  getBalance: (userId: string) => api.get(`/wallet/${userId}/balance`),
  topUp: (userId: string, payload: object) => api.post(`/wallet/${userId}/topup`, payload),
  getTransactions: (userId: string) => api.get(`/wallet/${userId}/transactions`),
};

// ─── Search ───────────────────────────────────────────────────────────────────

export const searchApi = {
  query: (q: string, params?: Record<string, string | number | boolean | undefined>) =>
    api.get('/search', { q, ...params }),
};

// ─── Health ───────────────────────────────────────────────────────────────────

export const healthApi = {
  check: () => api.get('/health'),
  ready: () => api.get('/health/ready'),
  metrics: () => api.get('/health/metrics'),
};
// ─── Marketplace ─────────────────────────────────────────────────────────────
// The storefront's catalogue, cart, coupon and gift-card calls live in
// `api/marketplace.ts` (one function per route). The `marketplaceApi` object
// that used to sit here was a second copy of the same routes — including
// `/marketplace/categories` in a different shape from the one the pages used —
// and nothing but the cart page's coupon and gift-card calls still reached it.

// ─── Seller Portal ────────────────────────────────────────────────────────────

export const sellerApi = {
  // Dashboard
  getDashboard: (sellerId: string, period?: string) =>
    api.get(`/sellers/${sellerId}/dashboard`, { period }),
  getProfile: (sellerId: string) => api.get(`/sellers/${sellerId}/profile`),
  /**
   * Lifecycle status of the caller's own application.
   *
   * Separate from `getProfile` because that route sits behind
   * `SellerApprovalGuard` and answers 403 to anyone not yet APPROVED — which is
   * precisely who reads a status page.
   */
  getApplicationStatus: (sellerId: string) =>
    api.get<{
      id: string;
      businessName: string | null;
      storeSlug: string | null;
      countryCode: string | null;
      verificationStatus: string | null;
      kycStatus: string | null;
      submittedAt: string | null;
    }>(`/sellers/${sellerId}/application-status`),
  /**
   * The signed-in user's own application, when the caller has no seller id.
   *
   * Sign-in sends an unapproved seller to the status page and cannot pass an id:
   * the JWT carries the user id, and a seller's own id is a different value.
   */
  getMyApplicationStatus: () =>
    api.get<{
      application: {
        id: string;
        businessName: string | null;
        storeSlug: string | null;
        countryCode: string | null;
        verificationStatus: string | null;
        kycStatus: string | null;
        submittedAt: string | null;
      } | null;
    }>('/sellers/me/application-status'),
  updateProfile: (sellerId: string, data: object) => api.put(`/sellers/${sellerId}/profile`, data),
  register: (data: object) => api.post('/sellers/register', data),

  // Brand
  getBrand: (sellerId: string) => api.get(`/sellers/${sellerId}/brand`),
  updateBrand: (sellerId: string, data: object) => api.put(`/sellers/${sellerId}/brand`, data),

  // Products
  getProducts: (sellerId: string, params?: Record<string, string | number | boolean | undefined>) =>
    api.get(`/sellers/${sellerId}/products`, params),
  getProduct: (sellerId: string, productId: string) =>
    api.get(`/sellers/${sellerId}/products/${productId}`),
  addProduct: (sellerId: string, data: object) => api.post(`/sellers/${sellerId}/products`, data),
  updateProduct: (sellerId: string, productId: string, data: object) =>
    api.put(`/sellers/${sellerId}/products/${productId}`, data),
  deleteProduct: (sellerId: string, productId: string) =>
    api.delete(`/sellers/${sellerId}/products/${productId}`),
  saveDraft: (sellerId: string, data: object) =>
    api.post(`/sellers/${sellerId}/products/draft`, data),
  bulkUpload: (sellerId: string, data: object) =>
    api.post(`/sellers/${sellerId}/products/bulk`, data),

  // Inventory
  getInventory: (
    sellerId: string,
    params?: Record<string, string | number | boolean | undefined>,
  ) => api.get(`/sellers/${sellerId}/inventory`, params),
  updateStock: (sellerId: string, productId: string, stock: number) =>
    api.put(`/sellers/${sellerId}/inventory/${productId}`, { stock }),
  getLowStock: (sellerId: string) => api.get(`/sellers/${sellerId}/inventory/low-stock`),

  // Orders
  getOrders: (sellerId: string, params?: Record<string, string | number | boolean | undefined>) =>
    api.get(`/sellers/${sellerId}/orders`, params),
  getOrder: (sellerId: string, orderId: string) =>
    api.get(`/sellers/${sellerId}/orders/${orderId}`),
  acceptOrder: (sellerId: string, orderId: string) =>
    api.post(`/sellers/${sellerId}/orders/${orderId}/accept`),
  rejectOrder: (sellerId: string, orderId: string, reason: string) =>
    api.post(`/sellers/${sellerId}/orders/${orderId}/reject`, { reason }),
  markPacked: (sellerId: string, orderId: string) =>
    api.post(`/sellers/${sellerId}/orders/${orderId}/pack`),
  shipOrder: (sellerId: string, orderId: string, data: object) =>
    api.post(`/sellers/${sellerId}/orders/${orderId}/ship`, data),

  // Finance
  getWallet: (sellerId: string) => api.get(`/sellers/${sellerId}/wallet`),
  getTransactions: (
    sellerId: string,
    params?: Record<string, string | number | boolean | undefined>,
  ) => api.get(`/sellers/${sellerId}/transactions`, params),
  getPayouts: (sellerId: string, params?: Record<string, string | number | boolean | undefined>) =>
    api.get(`/sellers/${sellerId}/payouts`, params),
  requestPayout: (sellerId: string, data: object) => api.post(`/sellers/${sellerId}/payouts`, data),

  // Marketing
  getCampaigns: (
    sellerId: string,
    params?: Record<string, string | number | boolean | undefined>,
  ) => api.get(`/sellers/${sellerId}/campaigns`, params),
  createCampaign: (sellerId: string, data: object) =>
    api.post(`/sellers/${sellerId}/campaigns`, data),

  // Store
  getStorefront: (sellerId: string) => api.get(`/sellers/${sellerId}/storefront`),
  updateStorefront: (sellerId: string, data: object) =>
    api.put(`/sellers/${sellerId}/storefront`, data),
  getReviews: (sellerId: string, params?: Record<string, string | number | boolean | undefined>) =>
    api.get(`/sellers/${sellerId}/reviews`, params),

  // Settings
  getSettings: (sellerId: string) => api.get(`/sellers/${sellerId}/settings`),
  updateSettings: (sellerId: string, data: object) =>
    api.put(`/sellers/${sellerId}/settings`, data),

  // Reports
  getReports: (sellerId: string, type?: string) =>
    api.get(`/sellers/${sellerId}/reports`, { type }),
  exportReport: (sellerId: string, type?: string) =>
    api.get(`/sellers/${sellerId}/reports/export`, { type }),

  // ── Tier 6: Returns ─────────────────────────────────────────────────────
  getReturns: (sellerId: string, params?: Record<string, string | number | boolean | undefined>) =>
    api.get(`/marketplace/returns`, { sellerId, ...params }),
  getReturnById: (returnId: string) => api.get(`/marketplace/returns/${returnId}`),
  updateReturnStatus: (returnId: string, data: object) =>
    api.put(`/marketplace/returns/${returnId}/status`, data),

  // ── Tier 6: Variants ────────────────────────────────────────────────────
  getProductVariants: (productId: string) => api.get(`/marketplace/products/${productId}/variants`),
  createVariant: (productId: string, data: object) =>
    api.post(`/marketplace/products/${productId}/variants`, data),
  updateVariant: (variantId: string, data: object) =>
    api.put(`/marketplace/variants/${variantId}`, data),
  deleteVariant: (variantId: string) => api.delete(`/marketplace/variants/${variantId}`),
  updateVariantStock: (variantId: string, data: object) =>
    api.put(`/marketplace/variants/${variantId}/stock`, data),
  getLowStockVariants: (sellerId: string) =>
    api.get(`/marketplace/sellers/${sellerId}/low-stock-variants`),

  // ── Tier 6: Q&A ─────────────────────────────────────────────────────────
  getProductQuestions: (
    productId: string,
    params?: Record<string, string | number | boolean | undefined>,
  ) => api.get(`/marketplace/products/${productId}/questions`, params),
  answerQuestion: (questionId: string, data: object) =>
    api.post(`/marketplace/questions/${questionId}/answers`, data),
  acceptAnswer: (answerId: string) => api.put(`/marketplace/answers/${answerId}/accept`, {}),

  // ── Tier 6: Coupons ─────────────────────────────────────────────────────
  getCoupons: (sellerId: string, params?: Record<string, string | number | boolean | undefined>) =>
    api.get(`/marketplace/coupons`, { sellerId, ...params }),
  createCoupon: (data: object) => api.post('/marketplace/coupons', data),
  updateCoupon: (couponId: string, data: object) =>
    api.put(`/marketplace/coupons/${couponId}`, data),
  deleteCoupon: (couponId: string) => api.delete(`/marketplace/coupons/${couponId}`),
  getCouponUsage: (couponId: string) => api.get(`/marketplace/coupons/${couponId}/usage`),

  // ── Tier 6: Shipping & Tracking ─────────────────────────────────────────
  getShipmentTracking: (orderId: string) => api.get(`/marketplace/tracking/order/${orderId}`),
  addTrackingEvent: (data: object) => api.post('/marketplace/tracking/events', data),
};

// ─── Admin Marketplace ────────────────────────────────────────────────────────

export const adminMarketplaceApi = {
  // Dashboard
  getDashboard: () => api.get('/admin/marketplace/dashboard'),

  // Sellers
  getSellers: (params?: Record<string, string | number | boolean | undefined>) =>
    api.get('/admin/marketplace/sellers', params),
  getSellerById: (id: string) => api.get(`/admin/marketplace/sellers/${id}`),
  approveSeller: (id: string, data?: object) =>
    api.patch(`/admin/marketplace/sellers/${id}/approve`, data),
  rejectSeller: (id: string, data: object) =>
    api.patch(`/admin/marketplace/sellers/${id}/reject`, data),
  suspendSeller: (id: string, data: object) =>
    api.patch(`/admin/marketplace/sellers/${id}/suspend`, data),
  reactivateSeller: (id: string) => api.patch(`/admin/marketplace/sellers/${id}/reactivate`),

  // Products
  getProducts: (params?: Record<string, string | number | boolean | undefined>) =>
    api.get('/admin/marketplace/products', params),
  getProductById: (id: string) => api.get(`/admin/marketplace/products/${id}`),
  approveProduct: (id: string) => api.patch(`/admin/marketplace/products/${id}/approve`),
  rejectProduct: (id: string, data: object) =>
    api.patch(`/admin/marketplace/products/${id}/reject`, data),
  featureProduct: (id: string) => api.patch(`/admin/marketplace/products/${id}/feature`),
  unfeatureProduct: (id: string) => api.patch(`/admin/marketplace/products/${id}/unfeature`),

  // Categories & Brands
  getCategories: () => api.get('/admin/marketplace/categories'),
  createCategory: (data: object) => api.post('/admin/marketplace/categories', data),
  updateCategory: (id: string, data: object) =>
    api.patch(`/admin/marketplace/categories/${id}`, data),
  getBrands: () => api.get('/admin/marketplace/brands'),

  // Orders, Payouts, Campaigns
  getOrders: (params?: Record<string, string | number | boolean | undefined>) =>
    api.get('/admin/marketplace/orders', params),
  getPayouts: (params?: Record<string, string | number | boolean | undefined>) =>
    api.get('/admin/marketplace/payouts', params),
  getCampaigns: (params?: Record<string, string | number | boolean | undefined>) =>
    api.get('/admin/marketplace/campaigns', params),

  // ── Tier 6: Returns Management ──────────────────────────────────────────
  getReturns: (params?: Record<string, string | number | boolean | undefined>) =>
    api.get('/marketplace/returns', params),
  getReturnById: (id: string) => api.get(`/marketplace/returns/${id}`),
  updateReturnStatus: (id: string, data: object) =>
    api.put(`/marketplace/returns/${id}/status`, data),
  assignReturnPickup: (id: string, data: object) =>
    api.put(`/marketplace/returns/${id}/assign-pickup`, data),

  // ── Tier 6: Coupons Management ──────────────────────────────────────────
  getCoupons: (params?: Record<string, string | number | boolean | undefined>) =>
    api.get('/marketplace/coupons', params),
  createCoupon: (data: object) => api.post('/marketplace/coupons', data),
  updateCoupon: (id: string, data: object) => api.put(`/marketplace/coupons/${id}`, data),
  deleteCoupon: (id: string) => api.delete(`/marketplace/coupons/${id}`),
  getCouponUsage: (id: string) => api.get(`/marketplace/coupons/${id}/usage`),

  // ── Tier 6: Delivery Management ─────────────────────────────────────────
  getDeliveryAssignments: (params?: Record<string, string | number | boolean | undefined>) =>
    api.get('/marketplace/delivery-assignments', params),
  createDeliveryAssignment: (data: object) => api.post('/marketplace/delivery-assignments', data),

  // ── Tier 6: Variants Management ─────────────────────────────────────────
  getVariants: (productId: string) => api.get(`/marketplace/products/${productId}/variants`),
  getLowStockVariants: (sellerId: string) =>
    api.get(`/marketplace/sellers/${sellerId}/low-stock-variants`),

  // ── Tier 6: Q&A Moderation ──────────────────────────────────────────────
  getQuestions: (
    productId: string,
    params?: Record<string, string | number | boolean | undefined>,
  ) => api.get(`/marketplace/products/${productId}/questions`, params),
  getAnswers: (questionId: string) => api.get(`/marketplace/questions/${questionId}/answers`),
  acceptAnswer: (answerId: string) => api.put(`/marketplace/answers/${answerId}/accept`, {}),

  // ── Tier 6: Tracking ────────────────────────────────────────────────────
  getTrackingEvents: (orderId: string) => api.get(`/marketplace/tracking/order/${orderId}`),
};
