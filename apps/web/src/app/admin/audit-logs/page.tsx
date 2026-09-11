'use client';

import React, { Suspense, useCallback, useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Globe,
  PlugZap,
  Search,
  Shield,
} from 'lucide-react';
import { useAdminData, AdminLoadingSkeleton } from '@/hooks/useAdminData';
import {
  adminCoreApi,
  type AuditLogPage,
  type AuditLogParams,
  type AuditLogRow,
} from '@/lib/api/admin-core';
import { downloadCsv, type CsvColumn } from '@/lib/export-csv';

/**
 * Security Audit Logs — the platform's real trail.
 *
 * This page used to render `generateSeedEntries()`: seven invented rows
 * compiled into the bundle, complete with plausible admin names, IP addresses
 * and reasons. It was the one screen an administrator would open after an
 * incident, and it showed fiction — while `audit_logs` in Mongo, filled by the
 * gateway's interceptor on every admin mutation, had no route that could read
 * it. There is no fallback array here now. If the API cannot be reached the
 * page says so, by name, rather than drawing history that did not happen.
 *
 * Filters live in the URL so a row someone found can be linked to.
 */

// ─── Pure helpers (exported for the spec) ────────────────────────────────────

export const AUDIT_PAGE_SIZE = 50;

/**
 * The marketplace record kinds the trail carries, as the gateway's interceptor
 * derives them from the URL path. Shared with the marketplace audit page, which
 * is the same trail pre-filtered to these.
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
 * Pure and exported so the mapping is testable without a router: a filter that
 * silently fails to reach the server is indistinguishable, on screen, from a
 * filter that matched nothing.
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
    // the marketplace page can preset one and still let the reader change it.
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

// ─── Shared pieces ───────────────────────────────────────────────────────────

/**
 * What the page says when the trail cannot be reached.
 *
 * Names the endpoint deliberately: "no audit entries found" and "the audit
 * service is down" look identical on a table, and only one of them means
 * nothing happened.
 */
export function AuditNotConnected({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="bg-white border border-red-200 rounded-2xl p-8 text-center">
      <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-3">
        <PlugZap className="w-6 h-6" />
      </div>
      <p className="font-bold text-slate-900">The audit trail is not connected.</p>
      <p className="text-sm text-slate-500 mt-1 max-w-lg mx-auto">
        <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">
          GET /admin/audit-logs
        </code>{' '}
        did not answer, so this page cannot say what administrators have done. It is showing nothing
        rather than guessing.
      </p>
      <p className="text-xs text-red-600 mt-3 font-medium">{error}</p>
      <button
        onClick={onRetry}
        className="mt-4 bg-slate-900 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-slate-800"
      >
        Try again
      </button>
    </div>
  );
}

interface AuditTableProps {
  rows: AuditLogRow[];
  emptyHint: string;
}

export function AuditTable({ rows, emptyHint }: AuditTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
            <th className="p-4 pl-6">Time</th>
            <th className="p-4">Action</th>
            <th className="p-4">Actor</th>
            <th className="p-4">Entity</th>
            <th className="p-4">Market</th>
            <th className="p-4">Request</th>
            <th className="p-4 pr-6">Outcome</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-sm">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7} className="p-12 text-center text-slate-400">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="font-bold">No audit entries match these filters</p>
                <p className="text-xs mt-1">{emptyHint}</p>
              </td>
            </tr>
          ) : (
            rows.map((row, i) => {
              const outcome = auditOutcome(row);
              return (
                <tr key={auditRowId(row, i)} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 pl-6 text-slate-500 font-medium whitespace-nowrap text-xs">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      {formatAuditTime(row.createdAt)}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="font-mono text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold break-all">
                      {row.actionType}
                    </span>
                  </td>
                  <td className="p-4">
                    <p className="font-bold text-slate-900 text-xs break-all">
                      {row.actorEmail || row.actorId}
                    </p>
                    <p className="text-[10px] text-slate-500 uppercase">{row.actorRole || '—'}</p>
                  </td>
                  <td className="p-4">
                    <p className="text-xs font-bold text-slate-700">{row.entityType || '—'}</p>
                    <p className="text-[10px] font-mono text-slate-400 break-all">
                      {row.entityId || '—'}
                    </p>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">
                      <Globe className="w-3 h-3" />
                      {row.country}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-[10px] text-slate-500 break-all">
                    {auditRequestId(row)}
                  </td>
                  <td className="p-4 pr-6">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        outcome.ok === null
                          ? 'bg-slate-50 text-slate-500 border-slate-200'
                          : outcome.ok
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                      }`}
                    >
                      {outcome.label}
                    </span>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

/**
 * The shared audit screen. The marketplace audit page is this with an
 * `entityType` preset, which is why it is a component rather than a page body.
 */
export function AuditLogsScreen({
  title,
  subtitle,
  entityTypes,
  defaultEntityType,
  csvName,
}: {
  title: string;
  subtitle: string;
  /** Offered in the entity-type select. Empty means a free-text box instead. */
  entityTypes?: readonly string[];
  defaultEntityType?: string;
  csvName: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const query = useMemo(
    () =>
      parseAuditQuery(new URLSearchParams(searchParams.toString()), {
        entityType: defaultEntityType,
      }),
    [searchParams, defaultEntityType],
  );

  const setParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(searchParams.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      // Any filter change starts at page 1; keeping the old page number is how
      // a narrowed filter ends up on an empty page that reads as "no results".
      if (key !== 'page') next.delete('page');
      router.replace(next.toString() ? `${pathname}?${next.toString()}` : pathname);
    },
    [router, pathname, searchParams],
  );

  const { data, loading, error, refetch } = useAdminData<AuditLogPage>(async () => {
    const res = await adminCoreApi.getAuditLogs(query);
    if (!res.success) throw new Error(res.error || 'Could not load the audit trail');
    return res.data;
  }, [
    query.page,
    query.limit,
    query.actionType,
    query.entityType,
    query.actorEmail,
    query.from,
    query.to,
  ]);

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const page = data?.page ?? query.page ?? 1;
  const limit = data?.limit ?? AUDIT_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const markets = new Set(rows.map((r) => r.country)).size;

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="text-slate-500 text-sm">{subtitle}</p>
        </div>
        <button
          onClick={() => downloadCsv(csvName, rows, AUDIT_CSV_COLUMNS)}
          disabled={rows.length === 0}
          className="bg-white border border-slate-300 text-slate-700 font-medium px-4 py-2 rounded-lg shadow-sm hover:bg-slate-50 disabled:opacity-40 transition-colors flex items-center gap-2 text-sm"
        >
          <Download className="w-4 h-4" /> Export this page (CSV)
        </button>
      </div>

      <div className="bg-slate-900 rounded-2xl p-5 flex items-center gap-4 flex-wrap">
        <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="text-white font-black">
            Every administrative action is recorded and cannot be altered.
          </p>
          <p className="text-slate-400 text-sm mt-0.5">
            Actor, role, entity, market, request id and outcome, as the gateway observed them.
          </p>
        </div>
        <div className="ml-auto flex gap-6 text-right">
          <div>
            <p className="text-white font-black text-xl">{total.toLocaleString()}</p>
            <p className="text-slate-400 text-xs">matching entries</p>
          </div>
          <div>
            <p className="text-white font-black text-xl">{markets}</p>
            <p className="text-slate-400 text-xs">markets on this page</p>
          </div>
        </div>
      </div>

      {/* Filters — bound to the URL, so a filtered view can be linked to. */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="relative md:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            value={query.actionType ?? ''}
            onChange={(e) => setParam('actionType', e.target.value)}
            placeholder="Action starts with… e.g. http.post."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
        {entityTypes && entityTypes.length > 0 ? (
          <select
            value={query.entityType ?? ''}
            onChange={(e) => setParam('entityType', e.target.value)}
            aria-label="Entity type"
            className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium bg-white outline-none"
          >
            <option value="">All record types</option>
            {entityTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        ) : (
          <input
            value={query.entityType ?? ''}
            onChange={(e) => setParam('entityType', e.target.value)}
            placeholder="Entity type"
            aria-label="Entity type"
            className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none"
          />
        )}
        <input
          value={query.actorEmail ?? ''}
          onChange={(e) => setParam('actorEmail', e.target.value)}
          placeholder="Actor email"
          aria-label="Actor email"
          className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none"
        />
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={query.from ?? ''}
            onChange={(e) => setParam('from', e.target.value)}
            aria-label="From date"
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none w-full"
          />
          <span className="text-xs text-slate-400">to</span>
          <input
            type="date"
            value={query.to ?? ''}
            onChange={(e) => setParam('to', e.target.value)}
            aria-label="To date"
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none w-full"
          />
        </div>
      </div>

      {loading && <AdminLoadingSkeleton rows={6} />}
      {!loading && error && <AuditNotConnected error={error} onRetry={refetch} />}

      {!loading && !error && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <AuditTable
            rows={rows}
            emptyHint="Entries appear here as administrators act. Widen the filters or the date range."
          />
          <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-white text-sm">
            <p className="text-slate-500 font-medium">
              Showing <span className="font-bold text-slate-900">{rows.length}</span> of{' '}
              <span className="font-bold text-slate-900">{total.toLocaleString()}</span> entries
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setParam('page', String(page - 1))}
                disabled={page <= 1}
                aria-label="Previous page"
                className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold">
                {page}/{totalPages}
              </span>
              <button
                onClick={() => setParam('page', String(page + 1))}
                disabled={page >= totalPages}
                aria-label="Next page"
                className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminAuditLogsPage() {
  return (
    <div className="bg-slate-50 min-h-screen p-4 md:p-8 font-sans">
      {/* useSearchParams needs a boundary or the whole route opts out of static rendering. */}
      <Suspense fallback={<AdminLoadingSkeleton rows={6} />}>
        <AuditLogsScreen
          title="Security Audit Logs"
          subtitle="Every administrative action across the platform, newest first, confined to your market."
          csvName="audit-logs"
        />
      </Suspense>
    </div>
  );
}
