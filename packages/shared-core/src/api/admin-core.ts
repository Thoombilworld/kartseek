/**
 * KARTSEEK Admin Core API Layer
 * Handles admin-service endpoints: users, KYC, sellers, orders, commissions, payouts, audit logs.
 * Uses the same pattern as admin-marketplace.ts.
 */

import { getAuthToken } from '@/lib/auth-token';
import { API_BASE_URL } from '@/lib/config/api-base';

// Gateway origin resolved once in lib/config/api-base.ts — it fails loudly in
// production rather than silently falling back to a developer machine. Note the
// value must include `/v1`: the gateway serves `/api/v1/*` and answers 404 on
// `/api/*`, so a variable set to the bare origin breaks every call here.
const BASE_URL = API_BASE_URL;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore?: boolean;
}

export interface AdminApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface AdminListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  country?: string;
  role?: string;
  category?: string;
}

// ─── Audit trail (/admin/audit-logs) ─────────────────────────────────────────

/**
 * One row of the platform's immutable audit trail, as `audit-log-service`
 * stores it. `actionType` is either `http.<verb>.<path>` (derived by the
 * gateway's interceptor from an admin mutation) or `console.<action>` (recorded
 * explicitly by the console). `country` is the market the action belonged to,
 * `'ALL'` for one that belonged to every market, and `'UNKNOWN'` where the
 * request carried no market at all.
 */
export interface AuditLogRow {
  _id?: string;
  id?: string;
  actionType: string;
  actorId: string;
  actorEmail?: string;
  actorRole?: string;
  actorIp?: string;
  entityType?: string;
  entityId?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  reason?: string;
  metadata?: Record<string, unknown>;
  isSensitive?: boolean;
  country: string;
  service: string;
  createdAt?: string;
}

export interface AuditLogPage {
  data: AuditLogRow[];
  total: number;
  page: number;
  limit: number;
}

/**
 * The audit trail's own filter set. Not `AdminListParams`: none of `search`,
 * `status`, `role` or `category` means anything here, and `actionType` is a
 * prefix match rather than an exact one.
 */
export interface AuditLogParams {
  page?: number;
  limit?: number;
  actorId?: string;
  actorEmail?: string;
  entityType?: string;
  entityId?: string;
  actionType?: string;
  country?: string;
  /** ISO date, inclusive. */
  from?: string;
  /** ISO date, inclusive. */
  to?: string;
}

/** What the console may send when recording an action it performed itself. */
export interface AuditLogEntryInput {
  action: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, unknown>;
  reason?: string;
  /**
   * @deprecated Accepted and discarded. The gateway reads the actor from the
   * verified token, and its validation pipe rejects any field `AuditEntryDto`
   * does not declare — so a body carrying this is a 400, not a mis-attributed
   * entry. Several admin pages still pass it; `addAuditLog` strips it rather
   * than trusting each caller to stop, because stripping at the one place that
   * builds the request is the only place it cannot be forgotten.
   */
  adminId?: string;
}

// ─── Dashboard (/admin/dashboard) ────────────────────────────────────────────

/**
 * A figure the platform declines to report, rather than reporting as zero.
 *
 * `sellers`, `drivers` and `pendingKyc` live in databases admin-service has no
 * connection to since the module split, so it says so. A console that rendered
 * `value` without checking `unavailable` would print "0 sellers" for a platform
 * with thousands.
 */
export interface UnavailableCounter {
  value: number | null;
  unavailable: string;
}

/** Exactly what `get_admin_dashboard` returns — no more, and nothing invented. */
export interface DashboardStats {
  users: { total: number; active: number; newToday: number };
  orders: { total: number; today: number; pending: number };
  revenue: { total: number; today: number };
  sellers: UnavailableCounter;
  drivers: UnavailableCounter;
  pendingKyc: UnavailableCounter;
  /** Null unless something has actually measured it. There is no per-module breakdown yet. */
  serviceSplit: Record<string, number> | null;
  generatedAt: string;
}

// ─── Security / DDoS (/admin/security — `security.manage`) ───────────────────

export type ThreatLevel = 'normal' | 'elevated' | 'critical';

/** `GET /admin/security/status` — Redis counters, platform-wide (no market). */
export interface SecurityStatus {
  level: ThreatLevel;
  httpBansToday: number;
  wsBansToday: number;
  activeBans: number;
  isHttpAttackMode: boolean;
  isWsAttackMode: boolean;
  timestamp: string;
}

/** One day of `GET /admin/security/trend` — 14 entries, oldest first. */
export interface SecurityTrendPoint {
  date: string;
  httpBans: number;
  wsBans: number;
}

/**
 * Why an IP is banned, as `DdosMonitorService` stored it.
 *
 * Every field is optional because the value is whatever JSON was in Redis at
 * ban time: an automatic ban carries `reason`/`strikes`/`banLevel`, a manual one
 * carries `manual: true`, and a key whose payload has expired carries `{}`.
 */
export interface BanDetails {
  reason?: string;
  strikes?: number;
  bannedAt?: string;
  duration?: number;
  banLevel?: number;
  manual?: boolean;
}

export interface BannedIpRow {
  ip: string;
  type: 'http' | 'ws';
  details: BanDetails;
  /** Redis TTL. Negative for a key with no expiry. */
  remainingSeconds: number;
}

/** `GET /admin/security/offenders` — striking, not yet banned. No country: the service does not resolve one. */
export interface OffenderRow {
  ip: string;
  strikes: number;
}

/**
 * `GET /admin/security/stats/endpoints` — keyed `METHOD:path:YYYY-MM-DDTHH`,
 * one counter per endpoint per hour, capped at 200 keys by the service.
 */
export type EndpointStats = Record<string, number>;

/** What the security mutations answer with. */
export interface SecurityActionResult {
  success: boolean;
  message: string;
}

// ─── KYC queue (/admin/kyc/pending) ──────────────────────────────────────────

/**
 * One row of the identity-check queue.
 *
 * Almost everything is optional, and that is the contract rather than
 * defensiveness: admin-service builds this list by scanning the Redis keys
 * `admin:kyc:pending:<entityType>:<entityId>` and returning whatever JSON it
 * finds there (`AdminService.getPendingKyc`). It reads only `submittedAt` and
 * one of `country`/`countryCode`/`regionCode` itself, and no platform code
 * currently *writes* those keys — so a console that assumes a business name, an
 * owner or a document list is assuming a shape nothing guarantees. The two
 * fields a decision needs are `entityId` and `entityType`, because they are the
 * key segments the approve and reject routes rebuild the key from.
 */
export interface KycPendingRow {
  entityId?: string;
  id?: string;
  entityType?: string;
  type?: string;
  businessName?: string;
  name?: string;
  ownerName?: string;
  email?: string;
  phone?: string;
  gstin?: string;
  country?: string;
  countryCode?: string;
  regionCode?: string;
  city?: string;
  state?: string;
  submittedAt?: string;
  documents?: Array<{ name?: string; type?: string; url?: string; size?: string }>;
}

export interface KycPendingPage {
  data: KycPendingRow[];
  total: number;
  page: number;
  limit: number;
}

// ─── Sellers (/admin/marketplace/sellers) ────────────────────────────────────

/**
 * A seller as `getSellersForAdmin` returns it — the `sellers` row itself, so
 * the property names here are that table's columns.
 *
 * There is no `status`, no `revenue`, no `complaints` and no `lastActive`:
 * `verificationStatus` (PENDING | VERIFIED | REJECTED | SUSPENDED) and
 * `isActive` are what the table records, and the console has to show those
 * rather than a status of its own devising. `ownerId` is the `users.id` behind
 * the shop and is nullable — a seller created without an account has none.
 */
export interface AdminSellerRow {
  id: string;
  businessName: string;
  storeSlug?: string;
  ownerName: string | null;
  ownerId: string | null;
  email: string | null;
  phone: string | null;
  verificationStatus: string;
  kycStatus: string;
  isActive: boolean;
  sellerRating: number | string | null;
  totalReviews?: number;
  totalProducts: number;
  totalOrders: number;
  commissionRate: number | string | null;
  regionCode: string | null;
  address?: { city?: string; state?: string; country?: string } | null;
  createdAt?: string;
}

export interface AdminSellerPage {
  data: AdminSellerRow[];
  total: number;
  page: number;
  limit: number;
  hasMore?: boolean;
}

// ─── Roles & staff (/admin/roles, /admin/staff — SUPER_ADMIN only) ───────────

/** One permission the console may grant, as the gateway defines it. */
export interface PermissionDef {
  key: string;
  label: string;
  group: string;
}

export interface AdminRoleRow {
  id: string;
  key: string;
  name: string;
  description: string | null;
  permissions: string[];
  isSystem: boolean;
  userCount: number;
  createdAt: string | null;
  updatedAt: string | null;
}

/**
 * A staff account as `/admin/staff` returns it.
 *
 * No password hash and no phone number: the stored phone is ciphertext, so
 * `hasPhone` is what the server is willing to say about it.
 */
export interface StaffRow {
  id: string;
  email: string | null;
  name: string;
  firstName: string;
  lastName: string;
  hasPhone: boolean;
  role: string;
  adminRoleId: string | null;
  regionCode: string | null;
  regionLocked: boolean;
  isActive: boolean;
  status: string;
  createdAt: string | null;
  /** Echoed by the gateway on create in development only. Never in production. */
  temporaryPassword?: string;
}

export interface CreateStaffPayload {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  adminRoleId: string;
  regionCode?: string;
  regionLocked?: boolean;
}

/**
 * What `PATCH /admin/staff/:id` accepts — deliberately NOT
 * `Partial<CreateStaffPayload>`.
 *
 * `email` is absent because `UpdateStaffDto` does not declare it, and the
 * gateway's validation pipe runs `forbidNonWhitelisted: true`: a payload
 * carrying `email` is rejected with 400 rather than ignored. Changing the
 * address an account signs in with — and receives its second factor at — is a
 * separate concern from editing a staff record, so the field stays off both
 * ends of the contract and TypeScript refuses the object literal that includes
 * it.
 */
export interface UpdateStaffPayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: string;
  adminRoleId?: string;
  /** `null` clears the market — the account becomes global again. Omit to leave it alone. */
  regionCode?: string | null;
  regionLocked?: boolean;
  isActive?: boolean;
}

export interface StaffListParams extends AdminListParams {
  roleId?: string;
  regionCode?: string;
}

// ─── Auth Header ─────────────────────────────────────────────────────────────

function getHeaders(): HeadersInit {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Widened from `AdminListParams` so the audit filters can use it too.
 * `AdminListParams` itself is deliberately left alone — it is the shape of a
 * *list* endpoint's query, and adding `actorEmail`/`from`/`to` to it would
 * offer every list page filters no list endpoint reads. `object` rather than an
 * index-signature type because the params are interfaces, which TypeScript will
 * not assign to `Record<string, …>`.
 */
function buildQuery(params: object): string {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') q.set(key, String(value));
  });
  return q.toString() ? `?${q.toString()}` : '';
}

/**
 * One readable sentence from whatever shape the gateway put in `message`.
 *
 * A class-validator rejection sends an **array** — `["property ip should not
 * exist", "property reason should not exist"]` — and every consumer here treats
 * `error` as a string. React renders an array by concatenating it, so a 400 read
 * `property ip should not existproperty reason should not exist`, and
 * `classifyApiFailure`'s `.toLowerCase()` would have thrown outright on one.
 * Joined here, at the single place the response is unpacked, rather than at each
 * of the call sites that forget.
 */
export function apiErrorMessage(message: unknown, fallback: string): string {
  if (Array.isArray(message)) {
    const joined = message.filter(Boolean).map(String).join('; ');
    return joined || fallback;
  }
  if (typeof message === 'string' && message) return message;
  // An object or a number is not a sentence; showing `[object Object]` to an
  // administrator is worse than the fallback, which at least names the status.
  return fallback;
}

async function apiCall<T>(url: string, options?: RequestInit): Promise<AdminApiResponse<T>> {
  try {
    const res = await fetch(url, { headers: getHeaders(), ...options });
    const json = await res.json();
    if (!res.ok)
      return {
        success: false,
        data: null as T,
        error: apiErrorMessage(json.message, `Request failed (${res.status})`),
      };
    return {
      success: true,
      data: json.data ?? json,
      message: typeof json.message === 'string' ? json.message : undefined,
    };
  } catch (err) {
    return { success: false, data: null as T, error: 'Network error — API Gateway unreachable' };
  }
}

// ─── Admin Core API ──────────────────────────────────────────────────────────

export const adminCoreApi = {
  // ── Dashboard ─────────────────────────────────────────────────────────────
  /**
   * `country` narrows the counters to one market. A market-locked admin gets
   * their own market whatever they ask for, and is refused if they name
   * another — the gateway decides, not this call.
   */
  getDashboard: (country?: string) =>
    apiCall<DashboardStats>(`${BASE_URL}/admin/dashboard${buildQuery({ country })}`),
  getPlatformHealth: () => apiCall(`${BASE_URL}/admin/platform/health`),

  // ── Security / DDoS ───────────────────────────────────────────────────────
  // `DdosAdminController` is gated as a whole on SUPER_ADMIN, ADMIN or
  // `perm:security.manage`, so one 403 here means all of them are 403: the
  // threat board names every banned address, which is the map of the
  // platform's defences. None of these take a market — the ban list is
  // platform-wide.
  getSecurityStatus: () => apiCall<SecurityStatus>(`${BASE_URL}/admin/security/status`),
  getSecurityTrend: () => apiCall<SecurityTrendPoint[]>(`${BASE_URL}/admin/security/trend`),
  getEndpointStats: () => apiCall<EndpointStats>(`${BASE_URL}/admin/security/stats/endpoints`),
  getOffenders: () => apiCall<OffenderRow[]>(`${BASE_URL}/admin/security/offenders`),
  getBans: () => apiCall<BannedIpRow[]>(`${BASE_URL}/admin/security/bans`),
  banIp: (ip: string, durationSeconds: number, reason: string) =>
    apiCall<SecurityActionResult>(`${BASE_URL}/admin/security/bans`, {
      method: 'POST',
      body: JSON.stringify({ ip, durationSeconds, reason }),
    }),
  // The address is a path segment, so it is encoded: an IPv6 ban key is full of
  // colons, and `::1` unencoded is not the same path.
  unbanIp: (ip: string) =>
    apiCall<SecurityActionResult>(`${BASE_URL}/admin/security/bans/${encodeURIComponent(ip)}`, {
      method: 'DELETE',
    }),
  getWhitelist: () => apiCall<string[]>(`${BASE_URL}/admin/security/whitelist`),
  addWhitelist: (ip: string) =>
    apiCall<SecurityActionResult>(`${BASE_URL}/admin/security/whitelist`, {
      method: 'POST',
      body: JSON.stringify({ ip }),
    }),
  removeWhitelist: (ip: string) =>
    apiCall<SecurityActionResult>(
      `${BASE_URL}/admin/security/whitelist/${encodeURIComponent(ip)}`,
      { method: 'DELETE' },
    ),
  resetAttackMode: () =>
    apiCall<SecurityActionResult>(`${BASE_URL}/admin/security/attack-mode/reset`, {
      method: 'POST',
    }),

  // ── Users ─────────────────────────────────────────────────────────────────
  getUsers: (p: AdminListParams = {}) => apiCall(`${BASE_URL}/admin/users${buildQuery(p)}`),
  /**
   * `PUT /admin/users/:userId/ban`, body `ReasonDto` — `{ reason }` and nothing
   * else. The route's pipe runs `forbidNonWhitelisted`, so the `adminId` this
   * used to send is now a 400 (`property adminId should not exist`) rather than
   * a field the controller ignores; the actor comes from the token.
   */
  banUser: (userId: string, reason: string) =>
    apiCall(`${BASE_URL}/admin/users/${userId}/ban`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    }),
  /** `PUT /admin/users/:userId/unban` declares no `@Body()` at all — so none is sent. */
  unbanUser: (userId: string) =>
    apiCall(`${BASE_URL}/admin/users/${userId}/unban`, { method: 'PUT' }),

  // ── Roles & staff ─────────────────────────────────────────────────────────
  // SUPER_ADMIN only, and refused outright for a market-locked admin: a role
  // applies in every market and a staff record is what creates a market lock.
  listRoles: () =>
    apiCall<{ data: AdminRoleRow[]; permissions: PermissionDef[] }>(`${BASE_URL}/admin/roles`),
  createRole: (dto: { key: string; name: string; description?: string; permissions: string[] }) =>
    apiCall<{ data: AdminRoleRow }>(`${BASE_URL}/admin/roles`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
  updateRole: (
    id: string,
    dto: Partial<{ name: string; description: string; permissions: string[] }>,
  ) =>
    apiCall<{ data: AdminRoleRow }>(`${BASE_URL}/admin/roles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),
  deleteRole: (id: string) =>
    apiCall<{ success: boolean }>(`${BASE_URL}/admin/roles/${id}`, { method: 'DELETE' }),

  listStaff: (p: StaffListParams = {}) =>
    apiCall<PaginatedResponse<StaffRow>>(`${BASE_URL}/admin/staff${buildQuery(p)}`),
  createStaff: (dto: CreateStaffPayload) =>
    apiCall<{ data: StaffRow }>(`${BASE_URL}/admin/staff`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
  updateStaff: (id: string, dto: UpdateStaffPayload) =>
    apiCall<{ data: StaffRow }>(`${BASE_URL}/admin/staff/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),

  // ── KYC Verification ──────────────────────────────────────────────────────
  getPendingKyc: (p: AdminListParams = {}) =>
    apiCall<KycPendingPage>(`${BASE_URL}/admin/kyc/pending${buildQuery(p)}`),
  /**
   * `POST /admin/kyc/:entityId/approve`, body `KycDecisionDto` — `entityType`
   * only. `entityType` is also the middle segment of the Redis key the queue
   * lives under (`admin:kyc:pending:<type>:<id>`), so it has to be the same
   * value the row was listed with or the check is simply not found.
   */
  approveKyc: (entityId: string, entityType: string) =>
    apiCall(`${BASE_URL}/admin/kyc/${encodeURIComponent(entityId)}/approve`, {
      method: 'POST',
      body: JSON.stringify({ entityType }),
    }),
  rejectKyc: (entityId: string, entityType: string, reason: string) =>
    apiCall(`${BASE_URL}/admin/kyc/${encodeURIComponent(entityId)}/reject`, {
      method: 'POST',
      body: JSON.stringify({ entityType, reason }),
    }),

  // ── Sellers (via marketplace API) ─────────────────────────────────────────
  getSellers: (p: AdminListParams = {}) =>
    apiCall<AdminSellerPage>(`${BASE_URL}/admin/marketplace/sellers${buildQuery(p)}`),
  approveSeller: (id: string) =>
    apiCall(`${BASE_URL}/admin/marketplace/sellers/${id}/approve`, { method: 'PATCH' }),
  suspendSeller: (id: string, reason: string) =>
    apiCall(`${BASE_URL}/admin/marketplace/sellers/${id}/suspend`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    }),
  reactivateSeller: (id: string) =>
    apiCall(`${BASE_URL}/admin/marketplace/sellers/${id}/reactivate`, { method: 'PATCH' }),
  /**
   * Closes the shop — `PATCH /admin/marketplace/sellers/:id/block`, which takes
   * the **seller** id.
   *
   * Distinct from `banUser`, which locks the owner out of the platform
   * altogether (as a customer too). `AdminService.blockSeller` writes
   * `verificationStatus = 'SUSPENDED'` **and** `isActive = false`, which is what
   * separates it from `suspendSeller` — that one leaves `isActive` alone.
   *
   * No body: the route declares no `@Body()` and the actor comes from the token,
   * so a reason passed here would be dropped on the floor rather than recorded.
   * There is deliberately no `unblockSeller` beside it — see the note below.
   */
  blockSeller: (sellerId: string) =>
    apiCall(`${BASE_URL}/admin/marketplace/sellers/${sellerId}/block`, { method: 'PATCH' }),

  /*
   * Why there is no `unblockSeller`.
   *
   * Nothing on the gateway reverses a block. `PATCH sellers/:id/reactivate` is
   * the closest route, and `MarketplaceService.reactivateSeller` sets
   * `verificationStatus = 'VERIFIED'` and stops there — it never restores the
   * `isActive = false` that the block wrote. So a blocked shop cannot be fully
   * reopened from the console, and a wrapper called `unblockSeller` pointed at
   * `reactivate` would report a restoration that only half happened. The
   * console says so and disables the control instead.
   */

  // ── Orders ────────────────────────────────────────────────────────────────
  getOrders: (p: AdminListParams = {}) =>
    apiCall(`${BASE_URL}/admin/marketplace/orders${buildQuery(p)}`),

  // ── Commissions ───────────────────────────────────────────────────────────
  getCommissions: (p: AdminListParams = {}) =>
    apiCall(`${BASE_URL}/admin/marketplace/commissions${buildQuery(p)}`),
  updateCommission: (id: string, rate: number, adminId: string) =>
    apiCall(`${BASE_URL}/admin/marketplace/commissions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ rate, adminId }),
    }),

  // ── Payouts ───────────────────────────────────────────────────────────────
  getPayouts: (p: AdminListParams = {}) =>
    apiCall(`${BASE_URL}/admin/marketplace/payouts${buildQuery(p)}`),
  approvePayout: (id: string, adminId: string) =>
    apiCall(`${BASE_URL}/admin/marketplace/payouts/${id}/approve`, {
      method: 'PATCH',
      body: JSON.stringify({ adminId }),
    }),
  retryPayout: (id: string, adminId: string) =>
    apiCall(`${BASE_URL}/admin/marketplace/payouts/${id}/retry`, {
      method: 'POST',
      body: JSON.stringify({ adminId }),
    }),

  // ── Audit Logs ────────────────────────────────────────────────────────────
  getAuditLogs: (p: AuditLogParams = {}) =>
    apiCall<AuditLogPage>(`${BASE_URL}/admin/audit-logs${buildQuery(p)}`),
  /** Every entry for one record — `GET /admin/audit-logs/entity/:type/:id`. */
  getEntityAuditLogs: (entityType: string, entityId: string) =>
    apiCall<AuditLogPage>(
      `${BASE_URL}/admin/audit-logs/entity/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}`,
    ),
  /**
   * Record a console-originated action.
   *
   * No `adminId`: the gateway reads the actor from the verified token and the
   * request body is whitelisted, so sending one is both useless and rejected.
   */
  addAuditLog: ({ adminId: _ignored, ...entry }: AuditLogEntryInput) =>
    apiCall<{ success: boolean; logId: string }>(`${BASE_URL}/admin/audit-logs`, {
      method: 'POST',
      body: JSON.stringify(entry),
    }),

  // ── Revenue Reports ───────────────────────────────────────────────────────
  getRevenue: (startDate: string, endDate: string) =>
    apiCall(`${BASE_URL}/admin/reports/revenue?startDate=${startDate}&endDate=${endDate}`),
} as const;

export default adminCoreApi;
