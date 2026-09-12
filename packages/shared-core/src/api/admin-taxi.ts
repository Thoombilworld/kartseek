/**
 * KARTSEEK Admin Taxi API Layer
 * All admin taxi API calls go through this module.
 * Maps to: admin-taxi.controller.ts (26 routes)
 */

import { getAuthToken } from '@/lib/auth-token';
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
  search?: string;
  /**
   * The market to list. Named for the query parameter the controller actually
   * reads (`@Query('countryCode')`) — a `country=` was simply dropped, and the
   * list came back platform-wide while the screen said it was filtered.
   */
  countryCode?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

/** Every admin taxi list answers `{ data, total }`. */
export interface TaxiListPage<T> {
  data: T[];
  total: number;
}

/**
 * A driver as `TaxiOnboardingService.getDrivers` returns it — the
 * `taxi_drivers` row, with its vendor joined.
 *
 * The names are the entity's columns, so there is no `name` (it is `firstName`
 * + `lastName`), no `city`, no `earnings`, no `docsPending` and no
 * `lastActive`: a console that shows those is showing values no query
 * produced.
 */
export interface TaxiDriverRow {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  countryCode: string;
  vendorId: string | null;
  vendor?: { id: string; name: string } | null;
  status: 'pending' | 'onboarding' | 'active' | 'suspended' | 'blocked' | 'rejected';
  vehicleType: string;
  vehiclePlate: string | null;
  vehicleModel: string | null;
  rating: number | string;
  totalTrips: number;
  onboardingProgress: number;
  suspensionReason?: string | null;
  createdAt?: string;
}

/** One `taxi_payout_records` row. The decimals arrive as strings from Postgres. */
export interface TaxiPayoutRow {
  id: string;
  recipientType: 'vendor' | 'driver';
  recipientId: string;
  recipientName: string;
  rideId: string;
  countryCode: string;
  grossAmount: number | string;
  platformCommission: number | string;
  vendorCommission: number | string;
  taxAmount: number | string;
  netPayout: number | string;
  currency: string;
  status: 'pending' | 'approved' | 'processing' | 'settled' | 'failed';
  failureReason?: string | null;
  createdAt: string;
  settledAt: string | null;
}

/** What `admin.taxi.payouts.process` answers with. */
export interface TaxiPayoutBatchResult {
  processed: number;
  failed: number;
}

/**
 * One `taxi_rate_cards` row. `RateCardUpsertDto` declares exactly the writable
 * subset of this, which is why `TaxiRateCardInput` is derived from it below
 * rather than written out twice.
 */
export interface TaxiRateCard {
  id: string;
  countryCode: string;
  vehicleType: string;
  displayName: string;
  baseFare: number | string;
  distanceRate: number | string;
  timeRate: number | string;
  minimumFare: number | string;
  waitingRate: number | string;
  nightSurcharge: number | string;
  airportSurcharge: number | string;
  cancellationFee: number | string;
  maxPassengers: number;
  maxLuggage: number;
  isAccessible?: boolean;
  iconName?: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * The body `POST /admin/taxi/rates` accepts — `RateCardUpsertDto`,
 * field for field.
 *
 * `id`, `createdAt` and `updatedAt` are absent because the DTO does not declare
 * them: the pipe runs `forbidNonWhitelisted`, so posting a row straight back
 * from `getRateCards` is 400 `property id should not exist`. The card is keyed
 * on (countryCode, vehicleType).
 */
export interface TaxiRateCardInput {
  countryCode: string;
  vehicleType: string;
  displayName?: string;
  baseFare: number;
  distanceRate: number;
  timeRate: number;
  minimumFare: number;
  waitingRate?: number;
  nightSurcharge?: number;
  airportSurcharge?: number;
  cancellationFee?: number;
  maxPassengers?: number;
  maxLuggage?: number;
  isAccessible?: boolean;
  iconName?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface TaxiSurgeLimits {
  minMultiplier: number;
  maxMultiplier: number;
  autoEnabled: boolean;
}

export interface TaxiPeakHour {
  start: number;
  end: number;
  multiplier: number;
  label: string;
}

/** One `taxi_country_configs` row — `countryCode` is the primary key. */
export interface TaxiCountryConfig extends TaxiCountryConfigInput {
  countryCode: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * The body `PUT /admin/taxi/config/:countryCode` accepts —
 * `TaxiConfigUpsertDto`, field for field, and nothing a fetched row adds.
 *
 * The commission and tax rates are **fractions**, not percentages: the columns
 * are `decimal(5,4)` and the DTO caps them at 1, so a screen that forgets to
 * divide its percentage input by 100 is a 400 rather than 15× commission.
 */
export interface TaxiCountryConfigInput {
  countryCode?: string;
  /** ISO 4217, e.g. `QAR`. The DTO refuses a symbol. */
  currency?: string;
  distanceUnit?: 'km' | 'mi';
  otpRequired?: boolean;
  scheduledRidesEnabled?: boolean;
  cashEnabled?: boolean;
  tipsEnabled?: boolean;
  rideShareEnabled?: boolean;
  vendorsEnabled?: boolean;
  maxStops?: number;
  enabledPaymentGateways?: string[];
  enabledVehicleTypes?: string[];
  requiredVendorDocuments?: string[];
  requiredDriverDocuments?: string[];
  platformCommissionRate?: number;
  defaultVendorCommissionRate?: number;
  taxRate?: number;
  surgeLimits?: TaxiSurgeLimits;
  peakHourConfig?: TaxiPeakHour[];
  emergencyNumber?: string;
  defaultLocale?: string;
  timezone?: string | null;
  minimumDriverRating?: number;
  freeWaitingMinutes?: number;
  autoCancelTimeoutSeconds?: number;
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
  if (params.search) q.set('search', params.search);
  if (params.countryCode) q.set('countryCode', params.countryCode);
  return q.toString() ? `?${q.toString()}` : '';
}

async function apiCall<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(url, { headers: getHeaders(), ...options });
    const json = await res.json();
    if (!res.ok)
      return { success: false, data: null as T, error: json.message || 'Request failed' };
    return { success: true, data: json.data ?? json, message: json.message };
  } catch (err) {
    return { success: false, data: null as T, error: 'Network error — please check API Gateway' };
  }
}

export const adminTaxiApi = {
  // ── Dashboard ─────────────────────────────────────────────────
  getDashboard: (countryCode?: string) =>
    apiCall(`${BASE_URL}/admin/taxi/dashboard${buildQuery({ countryCode })}`),

  // ── Vendors ───────────────────────────────────────────────────
  getVendors: (p: ListParams = {}) => apiCall(`${BASE_URL}/admin/taxi/vendors${buildQuery(p)}`),
  getVendorById: (id: string) => apiCall(`${BASE_URL}/admin/taxi/vendors/${id}`),
  approveVendor: (id: string) =>
    apiCall(`${BASE_URL}/admin/taxi/vendors/${id}/approve`, { method: 'PATCH' }),
  suspendVendor: (id: string, reason?: string) =>
    apiCall(`${BASE_URL}/admin/taxi/vendors/${id}/suspend`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    }),

  // ── Drivers ───────────────────────────────────────────────────
  getDrivers: (p: ListParams = {}) =>
    apiCall<TaxiListPage<TaxiDriverRow>>(`${BASE_URL}/admin/taxi/drivers${buildQuery(p)}`),
  getDriverById: (id: string) => apiCall<TaxiDriverRow>(`${BASE_URL}/admin/taxi/drivers/${id}`),
  // `approve` and `suspend` are PATCH; `block` is POST. They were reached with
  // a single POST for all three, so two of them 404'd against a @Patch route.
  //
  // `{ data: row }`, not `row`: these two handlers return `{ data: … }`
  // themselves and `TransformInterceptor` wraps that again, so `apiCall`'s
  // `json.data` unwrap leaves one envelope behind. Typed as it arrives, rather
  // than as it ought to arrive, so the next caller that reads `.status` gets a
  // type error instead of `undefined`.
  approveDriver: (id: string) =>
    apiCall<{ data: TaxiDriverRow }>(`${BASE_URL}/admin/taxi/drivers/${id}/approve`, {
      method: 'PATCH',
    }),
  suspendDriver: (id: string, reason: string) =>
    apiCall<{ data: TaxiDriverRow }>(`${BASE_URL}/admin/taxi/drivers/${id}/suspend`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    }),
  /** `POST /admin/taxi/drivers/:driverId/block`, body `ReasonDto` — the reason is mandatory (3–500 chars). */
  blockDriver: (id: string, reason: string) =>
    apiCall<TaxiDriverRow>(`${BASE_URL}/admin/taxi/drivers/${id}/block`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  // ── Onboarding documents ──────────────────────────────────────
  rejectDocument: (documentId: string, reason: string) =>
    apiCall(`${BASE_URL}/admin/taxi/documents/${documentId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  // ── Rides ─────────────────────────────────────────────────────
  getRides: (p: ListParams = {}) => apiCall(`${BASE_URL}/admin/taxi/rides${buildQuery(p)}`),
  getRideById: (id: string) => apiCall(`${BASE_URL}/admin/taxi/rides/${id}`),

  // ── Pricing ───────────────────────────────────────────────────
  getPricing: () => apiCall(`${BASE_URL}/admin/taxi/pricing`),
  updatePricing: (data: Record<string, unknown>) =>
    apiCall(`${BASE_URL}/admin/taxi/pricing`, { method: 'POST', body: JSON.stringify(data) }),

  // ── Surge ─────────────────────────────────────────────────────
  getSurge: () => apiCall(`${BASE_URL}/admin/taxi/surge`),
  updateSurge: (data: Record<string, unknown>) =>
    apiCall(`${BASE_URL}/admin/taxi/surge`, { method: 'POST', body: JSON.stringify(data) }),

  // ── Complaints ────────────────────────────────────────────────
  getComplaints: (p: ListParams = {}) =>
    apiCall(`${BASE_URL}/admin/taxi/complaints${buildQuery(p)}`),
  resolveComplaint: (id: string, resolution: string) =>
    apiCall(`${BASE_URL}/admin/taxi/complaints/${id}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify({ resolution }),
    }),

  // ── Fleet ─────────────────────────────────────────────────────
  getFleet: (page = 1) => apiCall(`${BASE_URL}/admin/taxi/fleet?page=${page}`),

  // ── Payouts ───────────────────────────────────────────────────
  /**
   * `GET /admin/taxi/payouts` declares `page`, `status` and `countryCode` — and
   * **no `limit`**.
   *
   * A `limit` passed here reaches the query string and is then dropped by the
   * controller, so taxi-service applies its own page size of 20
   * (`TaxiPayoutService.getAllPayouts`). Asking for 100 and rendering what comes
   * back as if it were everything is the same defect as the `?country=` this
   * client used to send to the rates route. Page with `page`; show `total`.
   */
  getPayouts: (p: ListParams = {}) =>
    apiCall<TaxiListPage<TaxiPayoutRow>>(`${BASE_URL}/admin/taxi/payouts${buildQuery(p)}`),
  /** `{ data: row }` — the handler wraps, and so does the interceptor. */
  approvePayout: (id: string) =>
    apiCall<{ data: TaxiPayoutRow }>(`${BASE_URL}/admin/taxi/payouts/${id}/approve`, {
      method: 'POST',
    }),
  /**
   * `POST /admin/taxi/payouts/process`, body `PayoutBatchDto` — `{ payoutIds }`
   * and nothing else.
   *
   * There is no `action`: `TaxiPayoutService.processPayouts` settles approved
   * records and has no notion of one, so a console that sent
   * `action: 'approve'` was both refused by the pipe and asking for something
   * the service cannot do. Each id must be a record UUID.
   */
  processPayouts: (payoutIds: string[]) =>
    apiCall<TaxiPayoutBatchResult>(`${BASE_URL}/admin/taxi/payouts/process`, {
      method: 'POST',
      body: JSON.stringify({ payoutIds }),
    }),

  // ── Routes ────────────────────────────────────────────────────
  getRoutes: () => apiCall(`${BASE_URL}/admin/taxi/routes`),
  createRoute: (data: Record<string, unknown>) =>
    apiCall(`${BASE_URL}/admin/taxi/routes`, { method: 'POST', body: JSON.stringify(data) }),

  // ── Pending Approvals ─────────────────────────────────────────
  getPendingApprovals: () => apiCall(`${BASE_URL}/admin/taxi/pending-approvals`),

  // ── Compliance ────────────────────────────────────────────────
  getCompliance: () => apiCall(`${BASE_URL}/admin/taxi/compliance`),

  // ── Settings ──────────────────────────────────────────────────
  getSettings: () => apiCall(`${BASE_URL}/admin/taxi/settings`),
  updateSettings: (data: Record<string, unknown>) =>
    apiCall(`${BASE_URL}/admin/taxi/settings`, { method: 'POST', body: JSON.stringify(data) }),

  // ── Rate cards ────────────────────────────────────────────────
  // Not `pricing` above: these are the per-country, per-vehicle-type cards the
  // fare calculator reads. `countryCode` is the query parameter the route
  // declares and it is required — `?country=` was silently ignored and then
  // rejected as a missing market.
  getRateCards: (countryCode: string) =>
    apiCall<TaxiRateCard[]>(
      `${BASE_URL}/admin/taxi/rates?countryCode=${encodeURIComponent(countryCode)}`,
    ),
  /** One card per call — the route upserts a single (countryCode, vehicleType), never a batch. */
  upsertRateCard: (card: TaxiRateCardInput) =>
    apiCall<TaxiRateCard>(`${BASE_URL}/admin/taxi/rates`, {
      method: 'POST',
      body: JSON.stringify(card),
    }),

  // ── Country configuration ─────────────────────────────────────
  getConfig: (countryCode: string) =>
    apiCall<TaxiCountryConfig>(`${BASE_URL}/admin/taxi/config/${encodeURIComponent(countryCode)}`),
  /**
   * A merge, not a replace: `upsertCountryConfig` assigns the forwarded keys
   * onto the existing row, and the gateway drops any property the body omitted,
   * so sending a subset leaves every other column alone.
   */
  upsertConfig: (countryCode: string, config: TaxiCountryConfigInput) =>
    apiCall<TaxiCountryConfig>(`${BASE_URL}/admin/taxi/config/${encodeURIComponent(countryCode)}`, {
      method: 'PUT',
      body: JSON.stringify(config),
    }),
} as const;

export default adminTaxiApi;
