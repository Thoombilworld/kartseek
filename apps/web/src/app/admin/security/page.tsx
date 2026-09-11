'use client';

import React, { useCallback, useState } from 'react';
import {
  Shield,
  AlertTriangle,
  Ban,
  CheckCircle2,
  RefreshCw,
  Activity,
  Lock,
  Globe,
  TrendingUp,
  Eye,
  Trash2,
  Plus,
  Clock,
  ShieldCheck,
  Server,
  FileWarning,
} from 'lucide-react';
import { adminCoreApi } from '@/lib/api/admin-core';
import type {
  BannedIpRow,
  EndpointStats,
  OffenderRow,
  SecurityStatus,
  SecurityTrendPoint,
  ThreatLevel,
} from '@/lib/api/admin-core';
import { useAdminData, AdminToast } from '@/hooks/useAdminData';
import {
  AdminForbidden,
  AdminLoading,
  AdminNotConnected,
  classifyApiFailure,
  type ApiFailureKind,
} from '@/components/admin/api-states';

/**
 * DDoS & security centre — everything on this page comes from
 * `/admin/security/*`.
 *
 * It used to be 839 lines of fixtures: `MOCK_STATUS` declared an elevated threat
 * level and 2.8 million requests, `MOCK_BANS` named eight IPs in seven
 * countries, twelve WAF rules reported trigger counts, nineteen countries had
 * geo-block verdicts, eight incidents had timestamps and mitigation notes — and
 * a 10-second interval added `Math.random()` to the counters so the numbers
 * moved. Banning an IP pushed a row onto a `useState` array. None of it ever
 * left the browser, and an administrator watching this page during a real
 * attack would have seen a calm, plausible, entirely fictional dashboard.
 *
 * What the platform actually measures is narrower: Redis ban keys, strike
 * counts, per-endpoint request counters and a whitelist set. That is what is
 * here. The sections with nothing behind them are listed in one note at the
 * bottom rather than drawn as empty charts, because an empty chart still says
 * "we are watching this" and nothing is.
 *
 * The whole `DdosAdminController` is gated on SUPER_ADMIN, ADMIN or
 * `perm:security.manage`, so the seeded `admin` and `regional_admin` roles are
 * refused — hence a forbidden state distinct from an outage.
 */

// ─── Data ─────────────────────────────────────────────────────────────────────

interface SecurityBoard {
  status: SecurityStatus;
  trend: SecurityTrendPoint[];
  offenders: OffenderRow[];
  bans: BannedIpRow[];
  whitelist: string[];
  endpoints: EndpointStats;
}

type BoardResult =
  | { ok: true; board: SecurityBoard }
  | { ok: false; kind: ApiFailureKind; message: string; route: string };

/**
 * One read of the whole board.
 *
 * Resolves a result rather than throwing: `useAdminData` swallows auth-shaped
 * *throws* into `data = null, error = null`, which on this page would draw a
 * threat level of "normal" and zero bans for an account that is simply not
 * allowed to look — the same lie the fixtures told, with better manners.
 *
 * The six calls share one guard, so the first failure is the answer for all of
 * them; its route is carried so the panel can name what to curl.
 */
export async function loadSecurityBoard(): Promise<BoardResult> {
  const [status, trend, offenders, bans, whitelist, endpoints] = await Promise.all([
    adminCoreApi.getSecurityStatus(),
    adminCoreApi.getSecurityTrend(),
    adminCoreApi.getOffenders(),
    adminCoreApi.getBans(),
    adminCoreApi.getWhitelist(),
    adminCoreApi.getEndpointStats(),
  ]);

  const failure =
    (!status.success && { route: 'GET /admin/security/status', error: status.error }) ||
    (!trend.success && { route: 'GET /admin/security/trend', error: trend.error }) ||
    (!offenders.success && { route: 'GET /admin/security/offenders', error: offenders.error }) ||
    (!bans.success && { route: 'GET /admin/security/bans', error: bans.error }) ||
    (!whitelist.success && { route: 'GET /admin/security/whitelist', error: whitelist.error }) ||
    (!endpoints.success && {
      route: 'GET /admin/security/stats/endpoints',
      error: endpoints.error,
    });

  if (failure) {
    const message = failure.error || 'The security API did not answer';
    return { ok: false, kind: classifyApiFailure(message), message, route: failure.route };
  }

  return {
    ok: true,
    board: {
      status: status.data,
      // Defensive only where the shape could legitimately vary: a Redis read
      // that returns nothing yields `[]`, not a missing array.
      trend: trend.data ?? [],
      offenders: offenders.data ?? [],
      bans: bans.data ?? [],
      whitelist: whitelist.data ?? [],
      endpoints: endpoints.data ?? {},
    },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatSeconds(s: number): string {
  // A Redis key with no expiry reports -1, and "-1s remaining" is worse than
  // saying so.
  if (s < 0) return 'no expiry';
  if (s >= 86400) return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`;
  if (s >= 3600) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  if (s >= 60) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${s}s`;
}

/**
 * `GET:/api/v1/products:2026-09-11T14` → method, path and hour.
 *
 * Split from the right: a path contains no colon, but the hour bucket and the
 * method both sit either side of one, so `split(':')` on the whole key would
 * cut an IPv6-ish path in half.
 */
export function parseEndpointKey(key: string): { method: string; path: string; hour: string } {
  const first = key.indexOf(':');
  const last = key.lastIndexOf(':');
  if (first < 0 || last === first) return { method: '', path: key, hour: '' };
  return {
    method: key.slice(0, first),
    path: key.slice(first + 1, last),
    hour: key.slice(last + 1),
  };
}

/** The busiest endpoints over whatever hours Redis still holds. */
export function topEndpoints(stats: EndpointStats, limit = 12) {
  const totals = new Map<string, number>();
  Object.entries(stats).forEach(([key, count]) => {
    const { method, path } = parseEndpointKey(key);
    const label = `${method} ${path}`.trim();
    totals.set(label, (totals.get(label) ?? 0) + count);
  });
  return [...totals.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function threatConfig(level: ThreatLevel) {
  if (level === 'critical')
    return {
      bg: 'bg-red-500',
      text: 'text-red-700',
      light: 'bg-red-50 border-red-200',
      label: 'CRITICAL',
      icon: <AlertTriangle className="w-5 h-5" />,
    };
  if (level === 'elevated')
    return {
      bg: 'bg-amber-500',
      text: 'text-amber-700',
      light: 'bg-amber-50 border-amber-200',
      label: 'ELEVATED',
      icon: <AlertTriangle className="w-5 h-5" />,
    };
  return {
    bg: 'bg-emerald-500',
    text: 'text-emerald-700',
    light: 'bg-emerald-50 border-emerald-200',
    label: 'NORMAL',
    icon: <CheckCircle2 className="w-5 h-5" />,
  };
}

const BAN_DURATIONS = [
  { value: 900, label: '15 minutes' },
  { value: 3600, label: '1 hour' },
  { value: 86400, label: '24 hours' },
  { value: 604800, label: '7 days' },
  { value: 2592000, label: '30 days' },
];

/**
 * The sections this page used to draw and no longer does.
 *
 * Listed by name on purpose: deleting them silently would leave an
 * administrator believing the platform still has a WAF board and an incident
 * log somewhere, when what it had was an array in this file.
 */
const UNBACKED_SECTIONS = [
  [
    'WAF rules',
    'No rules engine exists — the twelve rules and their trigger counts were literals.',
  ],
  ['Geo-blocking', 'Nothing blocks by country, and no per-country request counts are recorded.'],
  ['Rate-limit editor', 'Limits are configured in the gateway, not stored anywhere this can edit.'],
  ['Incident history', 'No incident is ever written down; there is no collection to read.'],
  ['Traffic mix', 'Legitimate/suspicious/blocked is not measured — only per-endpoint totals are.'],
  ['Requests, bandwidth, uptime, unique IPs', 'None of these are collected by the gateway.'],
  ['Protection-mode switch', 'Attack mode is entered automatically; only clearing it is an API.'],
] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SecurityDashboardPage() {
  const { data, loading, error, refetch, toast, showToast } = useAdminData<BoardResult>(
    loadSecurityBoard,
    [],
  );

  const [busy, setBusy] = useState(false);
  const [banIp, setBanIp] = useState('');
  const [banReason, setBanReason] = useState('');
  const [banDuration, setBanDuration] = useState(86400);
  const [wlInput, setWlInput] = useState('');
  const [lastError, setLastError] = useState<string | null>(null);

  /**
   * Run a mutation and reload from the server.
   *
   * The board is never updated locally: a ban that the server rejected — and
   * `POST /admin/security/bans` does reject bodies today — must not appear in
   * the list as though it had taken. What is on screen is what a subsequent
   * read returned.
   */
  const run = useCallback(
    async (
      call: () => Promise<{ success: boolean; message?: string; error?: string }>,
      ok: string,
    ): Promise<boolean> => {
      setBusy(true);
      try {
        const res = await call();
        if (!res.success) {
          // The server's own words, kept on screen. A toast self-dismisses after
          // four seconds, which is not long enough to read a validation
          // rejection, work out which field it names and correct it — and the
          // form deliberately keeps its contents so the admin can. Cleared by
          // the next attempt, not by a timer.
          setLastError(res.error || 'The security API refused that.');
          return false;
        }
        setLastError(null);
        showToast(res.message || ok, 'success');
        await refetch();
        return true;
      } finally {
        setBusy(false);
      }
    },
    [refetch, showToast],
  );

  const result = data ?? null;
  const board = result?.ok ? result.board : null;
  const failure = result?.ok
    ? null
    : result
      ? { kind: result.kind, message: result.message, route: result.route }
      : error
        ? {
            kind: classifyApiFailure(error),
            message: error,
            route: 'GET /admin/security/status',
          }
        : null;

  const header = (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
          <Shield className="w-6 h-6 text-rose-500" />
          DDoS &amp; Security Centre
        </h1>
        <p className="text-slate-500 text-sm">
          Bans, strikes and request counters from the gateway&apos;s DDoS monitor. Platform-wide —
          these defences are not per-market.
        </p>
      </div>
      <button
        onClick={() => void refetch()}
        disabled={loading || busy}
        className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-700 disabled:opacity-40"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
      </button>
    </div>
  );

  if (loading && !board) {
    return (
      <div className="max-w-7xl mx-auto space-y-5">
        {header}
        <AdminLoading rows={6} />
      </div>
    );
  }

  if (failure) {
    return (
      <div className="max-w-7xl mx-auto space-y-5">
        {header}
        {failure.kind === 'forbidden' ? (
          <AdminForbidden
            what="the threat board"
            route={failure.route}
            needs="security.manage"
            message={failure.message}
          />
        ) : (
          <AdminNotConnected
            what="The threat board"
            route={failure.route}
            error={failure.message}
            onRetry={() => void refetch()}
          />
        )}
      </div>
    );
  }

  if (!board) return null;

  const { status, trend, offenders, bans, whitelist, endpoints } = board;
  const tc = threatConfig(status.level);
  const trendMax = Math.max(...trend.map((t) => t.httpBans + t.wsBans), 1);
  const trend14Http = trend.reduce((s, t) => s + t.httpBans, 0);
  const trend14Ws = trend.reduce((s, t) => s + t.wsBans, 0);
  const busiest = topEndpoints(endpoints);
  const busiestMax = Math.max(...busiest.map((e) => e.count), 1);
  const maxStrikes = Math.max(...offenders.map((o) => o.strikes), 1);

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {header}

      {/* ── Threat banner ─────────────────────────────────────────────────── */}
      <div className={`rounded-2xl border overflow-hidden ${tc.light} shadow-sm`}>
        <div className="flex items-center gap-4 px-6 py-5 flex-wrap">
          <div
            className={`w-14 h-14 rounded-2xl ${tc.bg} text-white flex items-center justify-center shadow`}
          >
            {tc.icon}
          </div>
          <div className="flex-1 min-w-[16rem]">
            <p className={`font-black text-xl ${tc.text}`}>Threat level: {tc.label}</p>
            <p className="text-sm text-slate-600 mt-0.5">
              {status.isHttpAttackMode && (
                <span className="text-red-600 font-bold">HTTP attack mode · </span>
              )}
              {status.isWsAttackMode && (
                <span className="text-orange-600 font-bold">WebSocket attack mode · </span>
              )}
              <span className="text-slate-500">
                {status.httpBansToday + status.wsBansToday} bans today · {status.activeBans} active
              </span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="text-[11px] text-slate-500 flex items-center gap-1"
              suppressHydrationWarning
            >
              <Clock className="w-3 h-3" /> Measured {new Date(status.timestamp).toLocaleString()}
            </span>
            {(status.isHttpAttackMode || status.isWsAttackMode) && (
              <button
                onClick={() =>
                  void run(() => adminCoreApi.resetAttackMode(), 'Attack mode cleared.')
                }
                disabled={busy}
                className="px-3 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-700 disabled:opacity-40"
              >
                Clear attack mode
              </button>
            )}
          </div>
        </div>
      </div>

      {lastError && (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-3"
        >
          <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-red-900">The security API refused that request.</p>
            <p className="text-xs text-red-700 mt-0.5 break-words">{lastError}</p>
          </div>
          <button
            onClick={() => setLastError(null)}
            className="text-xs font-bold text-red-700 hover:text-red-900 shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── Counters ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          {
            icon: <Ban className="w-4 h-4 text-rose-600" />,
            label: 'HTTP bans today',
            value: status.httpBansToday,
            color: 'bg-rose-50 border-rose-200',
          },
          {
            icon: <Activity className="w-4 h-4 text-orange-600" />,
            label: 'WebSocket bans today',
            value: status.wsBansToday,
            color: 'bg-orange-50 border-orange-200',
          },
          {
            icon: <Lock className="w-4 h-4 text-slate-600" />,
            label: 'Bans in force',
            value: status.activeBans,
            color: 'bg-slate-50 border-slate-200',
          },
          {
            icon: <Eye className="w-4 h-4 text-amber-600" />,
            label: 'IPs on strikes',
            value: offenders.length,
            color: 'bg-amber-50 border-amber-200',
          },
          {
            icon: <ShieldCheck className="w-4 h-4 text-emerald-600" />,
            label: 'Whitelisted IPs',
            value: whitelist.length,
            color: 'bg-emerald-50 border-emerald-200',
          },
          {
            icon: <TrendingUp className="w-4 h-4 text-blue-600" />,
            label: 'Bans (14 days)',
            value: trend14Http + trend14Ws,
            color: 'bg-blue-50 border-blue-200',
          },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border p-4 shadow-sm ${s.color}`}>
            <div className="mb-2">{s.icon}</div>
            <p className="text-xl font-black text-slate-900">{s.value}</p>
            <p className="text-[11px] text-slate-500 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── 14-day trend ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" /> Ban trend, last 14 days
          </h2>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-2 bg-rose-400 rounded" /> HTTP {trend14Http}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-2 bg-amber-400 rounded" /> WebSocket {trend14Ws}
            </span>
          </div>
        </div>
        {trend.length === 0 ? (
          <p className="text-sm text-slate-400">The monitor returned no days.</p>
        ) : (
          <div className="flex items-end gap-1.5 h-28">
            {trend.map((t) => (
              <div key={t.date} className="flex-1 flex flex-col items-center gap-1 group">
                {/* One scale for both series. The deleted version divided HTTP
                    by `trendMax * 60px` and WebSocket by `trendMax * 20px`, so
                    two equal counts drew bars a third apart — harmless while the
                    numbers were invented, misleading now that they are real. */}
                <div className="relative flex flex-col justify-end gap-0.5 h-20 w-full">
                  <div
                    ref={(el) => {
                      if (el) el.style.setProperty('--bar-h', `${(t.httpBans / trendMax) * 72}px`);
                    }}
                    className="bg-rose-400 rounded-t-sm security-bar"
                  />
                  <div
                    ref={(el) => {
                      if (el) el.style.setProperty('--bar-h', `${(t.wsBans / trendMax) * 72}px`);
                    }}
                    className="bg-amber-400 rounded-t-sm security-bar"
                  />
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none">
                    {t.httpBans + t.wsBans} bans
                  </div>
                </div>
                <span className="text-[9px] text-slate-400">{t.date.slice(5)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ── Offenders ───────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <Eye className="w-4 h-4 text-amber-500" /> Strike offenders
            </h2>
            <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
              {offenders.length} with strikes
            </span>
          </div>
          {offenders.length === 0 ? (
            <p className="px-5 py-8 text-sm text-slate-400 text-center">
              No IP currently holds a strike.
            </p>
          ) : (
            <div className="divide-y divide-slate-50">
              {offenders.map((o, i) => (
                <div key={o.ip} className="flex items-center gap-3 px-5 py-3">
                  <span
                    className={`text-xs font-black w-5 h-5 rounded flex items-center justify-center ${i < 2 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}
                  >
                    {i + 1}
                  </span>
                  <span className="font-mono text-sm text-slate-900 font-bold flex-1 min-w-0 truncate">
                    {o.ip}
                  </span>
                  <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden w-16">
                    <div
                      ref={(el) => {
                        if (el)
                          el.style.setProperty('--usage-w', `${(o.strikes / maxStrikes) * 100}%`);
                      }}
                      className="h-full rounded-full security-usage-bar bg-amber-500"
                    />
                  </div>
                  <span className="text-[10px] font-bold text-amber-700 w-14 text-right">
                    {o.strikes} strikes
                  </span>
                  <button
                    onClick={() =>
                      void run(
                        () => adminCoreApi.banIp(o.ip, 900, `Manual ban — ${o.strikes} strikes`),
                        `${o.ip} banned.`,
                      )
                    }
                    disabled={busy}
                    className="text-[10px] px-2 py-1 bg-rose-50 text-rose-700 rounded-lg font-bold hover:bg-rose-100 disabled:opacity-40"
                  >
                    Ban 15m
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Manual ban ──────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <Ban className="w-4 h-4 text-rose-500" /> Ban an address
            </h2>
          </div>
          <div className="p-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                id="manual-ban-ip"
                placeholder="IP address"
                value={banIp}
                onChange={(e) => setBanIp(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              <input
                id="manual-ban-reason"
                placeholder="Reason (recorded with the ban)"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div className="flex gap-3">
              <select
                value={banDuration}
                onChange={(e) => setBanDuration(Number(e.target.value))}
                aria-label="Ban duration"
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none"
              >
                {BAN_DURATIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
              <button
                id="manual-ban-submit"
                onClick={() =>
                  void run(
                    () => adminCoreApi.banIp(banIp.trim(), banDuration, banReason.trim()),
                    `${banIp.trim()} banned.`,
                  ).then((ok) => {
                    // Cleared only if the ban took. Wiping the form on a
                    // rejection makes the admin retype what the server refused.
                    if (ok) {
                      setBanIp('');
                      setBanReason('');
                    }
                  })
                }
                disabled={busy || !banIp.trim() || !banReason.trim()}
                className="flex-1 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-700 disabled:opacity-40 flex items-center justify-center gap-1.5"
              >
                <Ban className="w-3.5 h-3.5" /> Ban this address
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Bans apply to HTTP and WebSocket traffic together, and are stored in Redis with the
              duration as their expiry.
            </p>
          </div>
        </div>
      </div>

      {/* ── Bans in force ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-600" /> Bans in force
          </h2>
          <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
            {bans.length}
          </span>
        </div>
        {bans.length === 0 ? (
          <p className="px-5 py-8 text-sm text-slate-400 text-center">No address is banned.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3 font-semibold">Address</th>
                  <th className="px-5 py-3 font-semibold">Traffic</th>
                  <th className="px-5 py-3 font-semibold">Reason</th>
                  <th className="px-5 py-3 font-semibold">Banned at</th>
                  <th className="px-5 py-3 font-semibold text-right">Remaining</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bans.map((b) => (
                  <tr key={`${b.type}-${b.ip}`}>
                    <td className="px-5 py-3 font-mono font-bold text-slate-900">{b.ip}</td>
                    <td className="px-5 py-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                        {b.type}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {b.details?.reason ?? '—'}
                      {b.details?.manual && (
                        <span className="ml-2 text-[10px] font-bold text-slate-400">manual</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-500 text-xs" suppressHydrationWarning>
                      {b.details?.bannedAt ? new Date(b.details.bannedAt).toLocaleString() : '—'}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-slate-700">
                      {formatSeconds(b.remainingSeconds)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() =>
                          void run(() => adminCoreApi.unbanIp(b.ip), `${b.ip} unbanned.`)
                        }
                        disabled={busy}
                        className="text-[10px] px-2 py-1 bg-slate-100 text-slate-700 rounded-lg font-bold hover:bg-slate-200 disabled:opacity-40"
                      >
                        Unban
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ── Whitelist ───────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" /> Whitelist
            </h2>
            <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
              {whitelist.length}
            </span>
          </div>
          <div className="p-5 flex gap-3 border-b border-slate-100">
            <input
              id="whitelist-ip"
              placeholder="IP address"
              value={wlInput}
              onChange={(e) => setWlInput(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            <button
              onClick={() =>
                void run(
                  () => adminCoreApi.addWhitelist(wlInput.trim()),
                  `${wlInput.trim()} whitelisted.`,
                ).then((ok) => {
                  if (ok) setWlInput('');
                })
              }
              disabled={busy || !wlInput.trim()}
              className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 disabled:opacity-40 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
          {whitelist.length === 0 ? (
            <p className="px-5 py-8 text-sm text-slate-400 text-center">Nothing is whitelisted.</p>
          ) : (
            <div className="divide-y divide-slate-50">
              {whitelist.map((ip) => (
                <div key={ip} className="flex items-center gap-3 px-5 py-2.5">
                  <Globe className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                  <span className="font-mono text-sm text-slate-800 flex-1 min-w-0 truncate">
                    {ip}
                  </span>
                  <button
                    onClick={() =>
                      void run(
                        () => adminCoreApi.removeWhitelist(ip),
                        `${ip} removed from the whitelist.`,
                      )
                    }
                    disabled={busy}
                    className="text-slate-400 hover:text-rose-600 disabled:opacity-40"
                    title={`Remove ${ip}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="px-5 py-3 text-[11px] text-slate-400 border-t border-slate-100">
            A whitelisted address bypasses every DDoS check, and adding one clears any ban it
            already had.
          </p>
        </div>

        {/* ── Busiest endpoints ───────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <Server className="w-4 h-4 text-blue-500" /> Busiest endpoints
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Request counters the monitor keeps per endpoint per hour, summed over the hours it
              still holds.
            </p>
          </div>
          {busiest.length === 0 ? (
            <p className="px-5 py-8 text-sm text-slate-400 text-center">
              No request counters are recorded.
            </p>
          ) : (
            <div className="divide-y divide-slate-50">
              {busiest.map((e) => (
                <div key={e.label} className="px-5 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-xs text-slate-700 truncate">{e.label}</span>
                    <span className="text-xs font-bold text-slate-900 shrink-0">
                      {e.count.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mt-1.5">
                    <div
                      ref={(el) => {
                        if (el)
                          el.style.setProperty('--usage-w', `${(e.count / busiestMax) * 100}%`);
                      }}
                      className="h-full rounded-full security-usage-bar bg-blue-400"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── What this page cannot show ────────────────────────────────────── */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
        <h2 className="font-bold text-slate-900 flex items-center gap-2">
          <FileWarning className="w-4 h-4 text-slate-500" /> Not measured by the platform yet
        </h2>
        <p className="text-xs text-slate-500 mt-1 mb-3">
          These sections used to appear here with invented figures. They are gone rather than empty:
          nothing behind them is recorded, so there is no query that would fill them in.
        </p>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
          {UNBACKED_SECTIONS.map(([name, why]) => (
            <li key={name} className="text-xs text-slate-600 flex gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5 shrink-0" />
              <span>
                <span className="font-bold text-slate-700">{name}.</span> {why}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <AdminToast toast={toast} />
    </div>
  );
}
