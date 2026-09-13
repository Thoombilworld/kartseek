'use client';

import React from 'react';
import {
  Users,
  DollarSign,
  AlertCircle,
  TrendingUp,
  Package,
  ArrowRight,
  Globe,
  Clock,
  FileWarning,
  ShoppingCart,
  Store,
  UtensilsCrossed,
  Pill,
  Stethoscope,
  Car,
  Hotel,
  Wallet,
  Gift,
  MapPin,
} from 'lucide-react';
import Link from 'next/link';
import { useRegion, REGIONS } from '@/lib/contexts/region-context';
import { adminCoreApi } from '@/lib/api/admin-core';
import type { AuditLogRow, DashboardStats } from '@/lib/api/admin-core';
import { useAdminData } from '@/hooks/useAdminData';
import { auditHeadline, formatAuditTime } from '@/lib/audit-trail';
import {
  AdminForbidden,
  AdminLoading,
  AdminNotConnected,
  classifyApiFailure,
  type ApiFailureKind,
} from '@/components/admin/api-states';

/**
 * Master dashboard — counters from `GET /admin/dashboard`, activity from the
 * audit trail, and nothing else.
 *
 * What was here before: a `modules` array giving all ten verticals invented
 * daily orders and revenue (marketplace "8,420 orders / 2,100,000"), a
 * `recentActivity` array of seven fabricated events with relative timestamps, an
 * `hourlyData` array drawn as "Today's Order Volume", a commission widget
 * quoting seven per-module earnings in rupees regardless of the market, and a
 * row of quick stats (842 partners online, 24 min average delivery, 96.2%
 * on-time, 4.6 rating) that were literals in this file. An amber banner
 * admitted the module table was "illustrative" — the rest said nothing.
 *
 * `get_admin_dashboard` returns users, orders and revenue, and says outright
 * that sellers, drivers and pending KYC belong to other modules' databases. It
 * returns no per-module breakdown at all, so the module cards carry links and no
 * figures. A card with no number is honest; a card with the wrong number is not.
 */

// ─── Data ─────────────────────────────────────────────────────────────────────

interface DashboardData {
  stats: DashboardStats;
  /** The trail's newest rows, or null when the caller may not read it. */
  activity: AuditLogRow[] | null;
  activityRefusal: string | null;
}

type DashboardResult =
  | { ok: true; data: DashboardData }
  | { ok: false; kind: ApiFailureKind; message: string };

const ACTIVITY_LIMIT = 8;

/**
 * Resolves a result rather than throwing: `useAdminData` swallows auth-shaped
 * throws into `data = null, error = null`, which here would render a dashboard
 * of zeroes for an expired session.
 *
 * The audit read is allowed to fail on its own — reading the trail needs
 * `audit.logs`, which a support agent does not hold, and losing the activity
 * panel must not take the counters with it.
 */
export async function loadDashboard(country?: string): Promise<DashboardResult> {
  const [stats, activity] = await Promise.all([
    adminCoreApi.getDashboard(country),
    adminCoreApi.getAuditLogs({ limit: ACTIVITY_LIMIT }),
  ]);

  if (!stats.success || !stats.data) {
    const message = stats.error || 'The dashboard API did not answer';
    return { ok: false, kind: classifyApiFailure(message), message };
  }

  return {
    ok: true,
    data: {
      stats: stats.data,
      activity: activity.success ? (activity.data?.data ?? []) : null,
      activityRefusal: activity.success
        ? null
        : (activity.error ?? 'The audit trail did not answer'),
    },
  };
}

/**
 * The consoles each vertical has, as links.
 *
 * No counters: `get_admin_dashboard` aggregates `public.users` and
 * `"order".orders` platform-wide and has no notion of a module, so any figure
 * here would be one this file made up — which is exactly what it used to be.
 */
const MODULE_LINKS = [
  { name: 'Marketplace', href: '/admin/marketplace', icon: ShoppingCart, color: 'bg-blue-500' },
  { name: 'Grocery', href: '/admin/grocery', icon: Store, color: 'bg-green-500' },
  { name: 'Restaurants', href: '/admin/restaurant', icon: UtensilsCrossed, color: 'bg-orange-500' },
  { name: 'Pharmacy', href: '/admin/pharmacy', icon: Pill, color: 'bg-cyan-500' },
  { name: 'Doctor', href: '/admin/doctor', icon: Stethoscope, color: 'bg-purple-500' },
  { name: 'Taxi', href: '/admin/taxi', icon: Car, color: 'bg-yellow-500' },
  { name: 'Hotel booking', href: '/admin/hotel-booking', icon: Hotel, color: 'bg-rose-500' },
  {
    name: 'Seller wallets',
    href: '/admin/marketplace/seller-wallets',
    icon: Wallet,
    color: 'bg-emerald-500',
  },
  { name: 'Loyalty', href: '/admin/hotel-booking/loyalty', icon: Gift, color: 'bg-pink-500' },
  { name: 'Franchise', href: '/admin/franchise', icon: MapPin, color: 'bg-slate-500' },
] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const { selectedRegion, formatCurrencyValue } = useRegion();
  const isFiltered = selectedRegion !== 'ALL';
  const regionLabel = isFiltered ? REGIONS[selectedRegion]?.name : 'All markets';

  const { data, loading, error, refetch } = useAdminData<DashboardResult>(
    () => loadDashboard(isFiltered ? selectedRegion : undefined),
    [selectedRegion],
  );

  const result = data ?? null;
  const board = result?.ok ? result.data : null;
  const failure = result?.ok
    ? null
    : result
      ? { kind: result.kind, message: result.message }
      : error
        ? { kind: classifyApiFailure(error), message: error }
        : null;

  const header = (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Master dashboard</h1>
        <p className="text-slate-500 text-sm">
          Platform counters {isFiltered ? `for ${regionLabel}` : 'across every market'}, as
          admin-service measures them.
        </p>
      </div>
      <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full font-bold border border-slate-200 text-xs">
        <Globe className="w-3.5 h-3.5 text-emerald-600" /> {regionLabel}
      </span>
    </div>
  );

  if (loading && !board) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        {header}
        <AdminLoading rows={6} />
      </div>
    );
  }

  if (failure) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        {header}
        {failure.kind === 'forbidden' ? (
          <AdminForbidden
            what="the platform dashboard"
            route="GET /admin/dashboard"
            needs="dashboard.view"
            message={failure.message}
          />
        ) : (
          <AdminNotConnected
            what="The platform dashboard"
            route="GET /admin/dashboard"
            error={failure.message}
            onRetry={() => void refetch()}
          />
        )}
      </div>
    );
  }

  if (!board) return null;

  const { stats, activity, activityRefusal } = board;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {header}

      {/* ── Counters ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Money is only meaningful inside one market.
            `getDashboardStats` sums `"order".orders.totalAmount` with no
            currency dimension, and under "All markets" `region-context` resolves
            formatting against the *home* market — so this card used to stamp QR
            on a figure that had added QAR, INR, AED and SAR together. That is
            the defect the commission widget was deleted for, one card higher up,
            and it was the page's default view. A per-market breakdown needs
            support from admin-service (Plan C); until then the platform total is
            not printed at all. */}
        {isFiltered ? (
          <div className="bg-linear-to-br from-emerald-500 to-emerald-600 p-5 rounded-xl shadow-md text-white">
            <DollarSign className="w-5 h-5 opacity-80" />
            <p className="text-3xl font-black mt-3">{formatCurrencyValue(stats.revenue.today)}</p>
            <p className="text-sm font-medium opacity-80 mt-1">Order value today, {regionLabel}</p>
            <p className="text-xs opacity-70 mt-2">
              {formatCurrencyValue(stats.revenue.total)} all time
            </p>
          </div>
        ) : (
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <DollarSign className="w-5 h-5 text-slate-400" />
            <p className="text-2xl font-black text-slate-300 mt-3">—</p>
            <p className="text-sm text-slate-500 font-medium mt-1">Order value</p>
            <p className="text-xs text-slate-400 mt-2">
              Revenue is per market — select one above. A platform total would add every
              market&apos;s currency into a single figure.
            </p>
          </div>
        )}

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <Users className="w-5 h-5 text-blue-500" />
          <p className="text-2xl font-black text-slate-900 mt-3">
            {stats.users.total.toLocaleString()}
          </p>
          <p className="text-sm text-slate-500 font-medium mt-1">Users</p>
          <p className="text-xs text-slate-400 mt-2">
            {stats.users.active.toLocaleString()} active · {stats.users.newToday.toLocaleString()}{' '}
            new today
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <Package className="w-5 h-5 text-indigo-500" />
          <p className="text-2xl font-black text-slate-900 mt-3">
            {stats.orders.today.toLocaleString()}
          </p>
          <p className="text-sm text-slate-500 font-medium mt-1">Orders today</p>
          <p className="text-xs text-slate-400 mt-2">
            {stats.orders.total.toLocaleString()} all time
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <Clock className="w-5 h-5 text-amber-500" />
          <p className="text-2xl font-black text-slate-900 mt-3">
            {stats.orders.pending.toLocaleString()}
          </p>
          <p className="text-sm text-slate-500 font-medium mt-1">Orders awaiting action</p>
          <Link
            href="/admin/orders"
            className="text-xs text-emerald-600 font-bold hover:underline mt-2 inline-flex items-center gap-1"
          >
            Open orders <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* ── Counters admin-service reports separately ─────────────────────────
          Not "figures another module owns" any more: `pendingKyc` is
          admin-service's OWN approval queue, counted from the rows
          (`countPendingKyc`), and `admin.service.ts` says so explicitly. Only
          `sellers` and `drivers` live in another module's database, and each
          carries its own `unavailable` reason for the branch below — which is
          what this tile renders from, rather than from the heading. */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {(
          [
            ['Sellers', stats.sellers, '/admin/sellers'],
            ['Drivers', stats.drivers, '/admin/drivers'],
            ['Pending KYC', stats.pendingKyc, '/admin/kyc-verification'],
          ] as const
        ).map(([label, counter, href]) => (
          <div key={label} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-sm font-bold text-slate-900">{label}</p>
            {counter?.value != null ? (
              <p className="text-2xl font-black text-slate-900 mt-1">
                {counter.value.toLocaleString()}
              </p>
            ) : (
              <>
                {/* Not zero. A dash and the reason, because "0 sellers" on a
                    platform with thousands is the worse of the two answers. */}
                <p className="text-2xl font-black text-slate-300 mt-1">—</p>
                <p className="text-[11px] text-slate-400">
                  {counter?.unavailable ?? 'Not reported by admin-service.'}
                </p>
              </>
            )}
            <Link
              href={href}
              className="text-xs text-emerald-600 font-bold hover:underline mt-2 inline-flex items-center gap-1"
            >
              Open <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Module consoles ─────────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm lg:col-span-2 overflow-hidden">
          <div className="p-5 border-b border-slate-200 bg-slate-50/50">
            <h2 className="font-bold text-slate-900">Modules</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Per-module orders and revenue are not measured yet — the dashboard aggregates the
              platform, not each vertical. They arrive with the module reporting work in Plan C;
              until then each console shows its own figures.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-slate-100">
            {MODULE_LINKS.map((m) => (
              <Link
                key={m.name}
                href={m.href}
                className="bg-white hover:bg-slate-50 transition-colors p-4 flex items-center gap-3"
              >
                <span
                  className={`w-8 h-8 rounded-lg ${m.color} text-white flex items-center justify-center shrink-0`}
                >
                  <m.icon className="w-4 h-4" />
                </span>
                <span className="font-bold text-sm text-slate-800 truncate">{m.name}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Where to look next ──────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-200 bg-slate-50/50">
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" /> Queues
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {/* The old version of this panel asserted "12 pending store
                  approvals" and "4 escalated support tickets" as constants. Each
                  queue counts itself. */}
              Each queue reports its own size when you open it.
            </p>
          </div>
          <div className="divide-y divide-slate-100 flex-1">
            {[
              [
                'KYC verification',
                'Sellers and partners awaiting document review.',
                '/admin/kyc-verification',
              ],
              [
                'Seller applications',
                'Accounts waiting for approval or rejection.',
                '/admin/sellers',
              ],
              ['Support tickets', 'Anything escalated to the platform team.', '/admin/support'],
              ['Markets', 'Regional configuration and activation.', '/admin/regions'],
            ].map(([title, desc, href]) => (
              <Link
                key={href}
                href={href}
                className="block p-4 hover:bg-slate-50 transition-colors"
              >
                <p className="font-bold text-slate-800 text-sm mb-1">{title}</p>
                <p className="text-xs text-slate-500">{desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Recent activity — the real audit trail ────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
          <h2 className="font-bold text-slate-900">Recent activity</h2>
          <Link
            href="/admin/audit-logs"
            className="text-xs text-emerald-600 font-bold hover:underline flex items-center gap-1"
          >
            View the full trail <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {activity === null ? (
          <div className="px-5 py-6">
            <p className="text-sm font-bold text-slate-700">
              This panel could not read the audit trail.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                GET /admin/audit-logs
              </code>{' '}
              — {activityRefusal}
            </p>
          </div>
        ) : activity.length === 0 ? (
          <p className="px-5 py-8 text-sm text-slate-400 text-center">
            The trail has no entries yet.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {activity.map((row, i) => (
              <div
                key={row._id ?? row.id ?? `${row.actionType}-${i}`}
                className="px-5 py-3.5 flex items-center gap-4"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 text-sm truncate" title={row.actionType}>
                    {auditHeadline(row)}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {row.actorEmail ?? row.actorId}
                    {row.entityType ? ` · ${row.entityType}` : ''}
                  </p>
                </div>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium border border-slate-200 shrink-0">
                  {row.country}
                </span>
                <span
                  className="text-xs text-slate-400 whitespace-nowrap shrink-0"
                  suppressHydrationWarning
                >
                  {formatAuditTime(row.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── What is not here ──────────────────────────────────────────────── */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
        <h2 className="font-bold text-slate-900 flex items-center gap-2">
          <FileWarning className="w-4 h-4 text-slate-500" /> Not measured yet
        </h2>
        <ul className="mt-3 space-y-2">
          {[
            [
              'Revenue by hour',
              'Arrives with order-service reporting. The bar chart that stood here was ten literals in this file.',
            ],
            [
              'Commission earnings',
              'The per-module breakdown and fee totals were constants in Indian rupees, shown in every market. Commissions are on their own page.',
            ],
            [
              'Delivery and rating figures',
              'Partners online, average delivery time, on-time rate and average rating are not collected.',
            ],
            [
              'Per-module orders and revenue',
              'Each vertical keeps its own database; the platform aggregate cannot split them. Plan C.',
            ],
          ].map(([name, why]) => (
            <li key={name} className="text-xs text-slate-600 flex gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-slate-300 mt-0.5 shrink-0" />
              <span>
                <span className="font-bold text-slate-700">{name}.</span> {why}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-slate-400 mt-3" suppressHydrationWarning>
          Counters measured {new Date(stats.generatedAt).toLocaleString()}.
        </p>
      </div>
    </div>
  );
}
