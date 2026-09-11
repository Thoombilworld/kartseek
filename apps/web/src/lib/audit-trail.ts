import type { AuditLogParams, AuditLogRow } from '@/lib/api/admin-core';
import type { CsvColumn } from '@/lib/export-csv';

/**
 * Shared reading of the platform audit trail.
 *
 * Everything here is pure, so it can be asserted without a router, a DOM or a
 * network — and it lives outside `app/` so the marketplace audit page and the
 * dashboard's activity panel do not have to import another route's `page.tsx`
 * to reuse it.
 */

export const AUDIT_PAGE_SIZE = 50;

/**
 * The marketplace record kinds the trail carries, as the gateway's interceptor
 * derives them from the URL path.
 */
export const MARKETPLACE_ENTITY_TYPES = [
  'sellers',
  'products',
  'orders',
  'payouts',
  'refunds',
  'returns',
  'commissions',
  'coupons',
  'banners',
  'deals',
] as const;

/**
 * Build the API query from the URL.
 *
 * Pure and exported so the mapping is testable: a filter that silently fails to
 * reach the server is indistinguishable, on screen, from a filter that matched
 * nothing.
 */
export function parseAuditQuery(
  params: URLSearchParams,
  defaults: Partial<AuditLogParams> = {},
): AuditLogParams {
  const text = (key: string) => params.get(key)?.trim() || undefined;
  const page = Number(params.get('page'));
  return {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    limit: defaults.limit ?? AUDIT_PAGE_SIZE,
    actionType: text('actionType'),
    // An explicit `entityType` in the URL wins over the page's own default, so
    // a page can preset one and still let the reader change it.
    entityType: text('entityType') ?? defaults.entityType,
    actorEmail: text('actorEmail'),
    from: text('from'),
    to: text('to'),
  };
}

/** `createdAt` for a stored row; fixed-width so the column scans vertically. */
export function formatAuditTime(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/**
 * How the request ended.
 *
 * The gateway interceptor records `outcome` and `statusCode` under `metadata`;
 * a console-originated entry has neither, and says so rather than claiming a
 * success it never observed.
 */
export function auditOutcome(row: AuditLogRow): { label: string; ok: boolean | null } {
  const meta = row.metadata ?? {};
  const status = meta.statusCode;
  const outcome = typeof meta.outcome === 'string' ? meta.outcome : undefined;
  if (status == null && !outcome) return { label: '—', ok: null };
  const code = typeof status === 'number' ? status : Number(status);
  const label = Number.isFinite(code) ? `${outcome ?? ''} ${code}`.trim() : (outcome ?? '—');
  return { label, ok: Number.isFinite(code) ? code < 400 : outcome === 'success' };
}

export function auditRequestId(row: AuditLogRow): string {
  const id = row.metadata?.requestId;
  return typeof id === 'string' && id ? id : '—';
}

export function auditRowId(row: AuditLogRow, index: number): string {
  return row._id ?? row.id ?? `${row.actionType}-${row.createdAt ?? index}`;
}

/**
 * A one-line summary of a row, for the marketplace dashboard's activity panel.
 *
 * `http.patch./api/v1/admin/marketplace/sellers/<uuid>/approve` is accurate and
 * unreadable at a glance, so the verb-ish tail is what the panel shows, with the
 * full `actionType` kept for the title attribute.
 */
export function auditHeadline(row: AuditLogRow): string {
  const parts = row.actionType.split('.');
  if (parts[0] === 'console') return parts.slice(1).join('.') || row.actionType;
  if (parts[0] === 'http') {
    const verb = (parts[1] ?? '').toUpperCase();
    const path = parts.slice(2).join('.').split('?')[0];
    const tail = path.split('/').filter(Boolean).slice(-2).join('/');
    return `${verb} ${tail || path}`.trim();
  }
  return row.actionType;
}

/**
 * Why a request for the trail failed, and therefore what the page must say.
 *
 * `forbidden` means the server answered and said no — the caller holds no
 * `audit.logs`, or is region-locked and named another market. Rendering that as
 * "not connected" would be false: it answered. Everything else, an expired
 * session included, is "we do not know what happened", which is the one thing an
 * audit surface must never present as an empty table.
 */
export type AuditFailureKind = 'forbidden' | 'unreachable';

const FORBIDDEN_PATTERNS = [
  'missing required permissions',
  'insufficient permissions',
  'do not have permission',
  'restricted to the',
  'cannot perform this action',
  'forbidden',
];

export function classifyAuditFailure(message: string | null | undefined): AuditFailureKind {
  const text = (message ?? '').toLowerCase();
  return FORBIDDEN_PATTERNS.some((p) => text.includes(p)) ? 'forbidden' : 'unreachable';
}

/**
 * What the page holds after asking for the trail.
 *
 * Deliberately a resolved value rather than a thrown error: `useAdminData`
 * classifies auth-shaped *throws* as "degrade gracefully" and swallows them
 * (`data = null`, `error = null`), which on this page drew "No audit entries
 * match these filters" for an expired session — the exact "nothing happened"
 * lie the gateway's `send()` refuses to tell. Resolving keeps that hook's
 * behaviour untouched for every other page (including mid-token-refresh) while
 * making this page's failures impossible to mistake for emptiness.
 */
export type AuditFetchResult =
  | { ok: true; page: { data: AuditLogRow[]; total: number; page: number; limit: number } }
  | { ok: false; kind: AuditFailureKind; message: string };

/** One column per visible field, so an exported file matches what was on screen. */
export const AUDIT_CSV_COLUMNS: CsvColumn<AuditLogRow>[] = [
  { header: 'Time', value: (r) => r.createdAt ?? '' },
  { header: 'Action', value: (r) => r.actionType },
  { header: 'Actor ID', value: (r) => r.actorId },
  { header: 'Actor Email', value: (r) => r.actorEmail ?? '' },
  { header: 'Actor Role', value: (r) => r.actorRole ?? '' },
  { header: 'Entity Type', value: (r) => r.entityType ?? '' },
  { header: 'Entity ID', value: (r) => r.entityId ?? '' },
  { header: 'Market', value: (r) => r.country },
  { header: 'Service', value: (r) => r.service },
  { header: 'Request ID', value: (r) => auditRequestId(r) },
  { header: 'Outcome', value: (r) => auditOutcome(r).label },
  { header: 'IP', value: (r) => r.actorIp ?? '' },
  { header: 'Reason', value: (r) => r.reason ?? '' },
];
