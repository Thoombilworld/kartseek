'use client';

import React, { useState } from 'react';
import {
  Store,
  Search,
  Star,
  Eye,
  Ban,
  CheckCircle,
  Clock,
  X,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  Package,
  ShoppingBag,
  BarChart3,
  Globe,
} from 'lucide-react';
import { adminCoreApi } from '@/lib/api/admin-core';
import type { AdminSellerRow } from '@/lib/api/admin-core';
import { useAdminData } from '@/hooks/useAdminData';
import { useRegion, REGIONS } from '@/lib/contexts/region-context';
import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
import {
  AdminForbidden,
  AdminLoading,
  AdminNotConnected,
  classifyApiFailure,
  type ApiFailureKind,
} from '@/components/admin/api-states';

/**
 * Sellers & partners — the rows `GET /admin/marketplace/sellers` returns.
 *
 * What was here before: `MOCK_SELLERS`, ten invented shops (City Supermart,
 * Burger King India, MedPlus Pharmacy, Apple India Store, …) seeded into state
 * with ratings, order counts, revenue strings, complaint counts and commission
 * percentages, used unless the API happened to return at least one row. Above
 * the table sat four literal counters — 3,240 sellers, 1,850 delivery partners,
 * ₹18.2M GMV — that were characters in this file.
 *
 * The real row is a `sellers` record, so the columns are that table's:
 * `verificationStatus` and `isActive` rather than a status this page invents,
 * no revenue (nothing in that query sums orders) and no complaints.
 *
 * The block action deserves a note. It is `PUT /admin/users/:userId/ban`, which
 * bans the **owner's account**, so it takes `sellers.ownerId` — the console
 * used to hand it the seller id, which that route resolves against the users
 * table and could only answer "not found" for. A seller with no linked account
 * cannot be blocked at all, and says so.
 */

// ─── Data ─────────────────────────────────────────────────────────────────────

export const SELLERS_ROUTE = 'GET /admin/marketplace/sellers';

export type SellersResult =
  | { ok: true; rows: AdminSellerRow[]; total: number }
  | { ok: false; kind: ApiFailureKind; message: string };

/**
 * Resolves a result rather than throwing — `useAdminData` turns an auth-shaped
 * throw into `data = null, error = null`, which here would draw "0 sellers" for
 * an expired session.
 */
export async function loadSellers(params: {
  status?: string;
  country?: string;
  search?: string;
}): Promise<SellersResult> {
  const res = await adminCoreApi.getSellers({
    limit: 100,
    status: params.status,
    country: params.country,
    search: params.search,
  });
  if (!res.success) {
    const message = res.error || 'The seller directory did not answer';
    return { ok: false, kind: classifyApiFailure(message), message };
  }
  const rows = res.data?.data ?? [];
  return { ok: true, rows, total: res.data?.total ?? rows.length };
}

/** The four values `sellers.verificationStatus` actually holds. */
const STATUS_FILTERS = ['ALL', 'PENDING', 'VERIFIED', 'SUSPENDED', 'REJECTED'] as const;

const statusC: Record<string, string> = {
  VERIFIED: 'bg-emerald-100 text-emerald-700',
  PENDING: 'bg-blue-100 text-blue-700',
  SUSPENDED: 'bg-amber-100 text-amber-700',
  REJECTED: 'bg-red-100 text-red-700',
};

const kycC: Record<string, string> = {
  VERIFIED: 'text-emerald-600',
  PENDING: 'text-blue-600',
  EXPIRED: 'text-amber-600',
  REJECTED: 'text-red-600',
};

const num = (v: number | string | null | undefined): number => {
  const n = typeof v === 'string' ? Number(v) : (v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || '—';

const cityOf = (s: AdminSellerRow) =>
  [s.address?.city, s.address?.state].filter(Boolean).join(', ') || s.regionCode || '—';

// ─── Reason prompt ────────────────────────────────────────────────────────────

/**
 * Suspension and ban both record a reason on the decision — `ReasonDto`
 * requires 3–500 characters, and the console used to send the constants
 * "Suspended by admin" and "Blocked by admin" for every seller it ever touched.
 */
function ReasonDialog({
  title,
  confirmLabel,
  busy,
  onConfirm,
  onCancel,
}: {
  title: string;
  confirmLabel: string;
  busy: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <DismissOnEscape onDismiss={onCancel} />
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4">
        <h3 className="font-bold text-slate-900">{title}</h3>
        <label className="block text-xs font-bold text-slate-500" htmlFor="seller-reason">
          Reason (3–500 characters, stored on the decision)
        </label>
        <textarea
          id="seller-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
          rows={4}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
          placeholder="Why is this happening?"
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-bold border border-slate-200 text-slate-600"
          >
            Cancel
          </button>
          <button
            disabled={reason.trim().length < 3 || busy}
            onClick={() => onConfirm(reason.trim())}
            className="px-4 py-2 rounded-lg text-sm font-bold bg-red-600 text-white disabled:opacity-50"
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Drawer ───────────────────────────────────────────────────────────────────

export function SellerDrawer({
  seller,
  onClose,
  onAction,
}: {
  seller: AdminSellerRow;
  onClose: () => void;
  onAction: (action: SellerAction) => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose}>
        <DismissOnEscape onDismiss={onClose} />
      </div>
      <div className="fixed right-0 top-0 bottom-0 w-[420px] bg-white shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h3 className="font-bold text-slate-900">Seller profile</h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="text-center">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-3">
              {initials(seller.businessName)}
            </div>
            <h4 className="text-lg font-bold text-slate-900">{seller.businessName}</h4>
            <p className="text-sm text-slate-500">
              {seller.id} · {cityOf(seller)}
            </p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span
                className={`${statusC[seller.verificationStatus] || 'bg-slate-100 text-slate-600'} px-2.5 py-1 rounded-full text-xs font-bold`}
              >
                {seller.verificationStatus}
              </span>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold ${seller.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
              >
                {seller.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Orders', value: num(seller.totalOrders).toLocaleString(), icon: Package },
              {
                label: 'Products',
                value: num(seller.totalProducts).toLocaleString(),
                icon: ShoppingBag,
              },
              {
                label: 'Commission',
                value:
                  seller.commissionRate === null || seller.commissionRate === undefined
                    ? 'Platform default'
                    : `${num(seller.commissionRate)}%`,
                icon: BarChart3,
              },
              {
                label: 'Rating',
                value:
                  num(seller.sellerRating) > 0 ? num(seller.sellerRating).toFixed(1) : 'None yet',
                icon: Star,
              },
            ].map((stat) => (
              <div key={stat.label} className="bg-slate-50 rounded-xl p-3">
                <stat.icon className="w-4 h-4 text-slate-400 mb-1" />
                <p className="text-lg font-black text-slate-900">{stat.value}</p>
                <p className="text-[10px] text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="w-4 h-4 text-slate-400" />
              <span className="text-slate-700">{seller.email ?? 'No address on file'}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Phone className="w-4 h-4 text-slate-400" />
              <span className="text-slate-700">{seller.phone ?? 'No number on file'}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="w-4 h-4 text-slate-400" />
              <span className="text-slate-700">{cityOf(seller)}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-slate-700">
                {seller.createdAt
                  ? `Joined ${new Date(seller.createdAt).toLocaleDateString()}`
                  : 'Join date not recorded'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Shield className="w-4 h-4 text-slate-400" />
              <span className={`font-bold text-xs ${kycC[seller.kycStatus] || ''}`}>
                KYC: {seller.kycStatus}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 bg-slate-50 rounded-xl p-3">
            Revenue, complaints and delivery times are not part of this query — the seller record
            does not carry them, so they are not shown.
          </p>
        </div>

        <div className="p-4 border-t border-slate-200 space-y-2">
          {seller.verificationStatus === 'PENDING' && (
            <button
              onClick={() => onAction({ kind: 'approve', seller })}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Approve seller
            </button>
          )}
          {seller.verificationStatus === 'SUSPENDED' ? (
            <button
              onClick={() => onAction({ kind: 'reactivate', seller })}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Reactivate seller
            </button>
          ) : (
            <button
              onClick={() => onAction({ kind: 'suspend', seller })}
              className="w-full bg-amber-50 text-amber-700 hover:bg-amber-100 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5" /> Suspend seller
            </button>
          )}

          <div className="pt-2 border-t border-slate-100">
            <p className="text-[11px] text-slate-400 mb-2">
              {seller.ownerId
                ? 'The seller record does not say whether the owner’s account is banned, so both actions are offered and the result is reported.'
                : 'This seller has no linked user account, so there is nothing to ban.'}
            </p>
            <div className="flex gap-2">
              <button
                disabled={!seller.ownerId}
                onClick={() => onAction({ kind: 'ban', seller })}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-40 flex items-center justify-center gap-1.5"
              >
                <Ban className="w-3.5 h-3.5" /> Ban owner
              </button>
              <button
                disabled={!seller.ownerId}
                onClick={() => onAction({ kind: 'unban', seller })}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-40"
              >
                Lift ban
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type SellerAction = {
  kind: 'approve' | 'suspend' | 'reactivate' | 'ban' | 'unban';
  seller: AdminSellerRow;
};

const NEEDS_REASON: SellerAction['kind'][] = ['suspend', 'ban'];

export default function SellersPage() {
  const { selectedRegion } = useRegion();
  const isFiltered = selectedRegion !== 'ALL';
  const regionLabel = isFiltered
    ? (REGIONS[selectedRegion]?.name ?? selectedRegion)
    : 'All markets';

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [viewSeller, setViewSeller] = useState<AdminSellerRow | null>(null);
  const [pending, setPending] = useState<SellerAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNote, setActionNote] = useState<string | null>(null);

  const { data, loading, error, refetch } = useAdminData<SellersResult>(
    () =>
      loadSellers({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        country: isFiltered ? selectedRegion : undefined,
      }),
    [statusFilter, selectedRegion],
  );

  const result = data ?? null;
  const board = result?.ok ? result : null;
  const failure = result?.ok
    ? null
    : result
      ? { kind: result.kind, message: result.message }
      : error
        ? { kind: classifyApiFailure(error), message: error }
        : null;

  const rows = board?.rows ?? [];
  const visible = rows.filter((s) => {
    const needle = search.trim().toLowerCase();
    if (!needle) return true;
    return (
      s.businessName.toLowerCase().includes(needle) ||
      (s.ownerName ?? '').toLowerCase().includes(needle) ||
      s.id.toLowerCase().includes(needle)
    );
  });

  const run = async (action: SellerAction, reason?: string) => {
    setBusy(true);
    setActionError(null);
    setActionNote(null);
    const { kind, seller } = action;
    const res =
      kind === 'approve'
        ? await adminCoreApi.approveSeller(seller.id)
        : kind === 'suspend'
          ? await adminCoreApi.suspendSeller(seller.id, reason ?? '')
          : kind === 'reactivate'
            ? await adminCoreApi.reactivateSeller(seller.id)
            : kind === 'ban'
              ? await adminCoreApi.blockSeller(seller.ownerId as string, reason ?? '')
              : await adminCoreApi.unblockSeller(seller.ownerId as string);

    setBusy(false);
    setPending(null);
    if (!res.success) {
      // No optimistic row rewrite: the table showed a seller as blocked while
      // the call that was meant to block them had failed.
      setActionError(res.error || `The ${kind} call did not answer`);
      return;
    }
    setActionNote(`${seller.businessName}: ${kind} accepted.`);
    await adminCoreApi.addAuditLog({
      action: `seller.${kind}`,
      entityType: 'seller',
      entityId: seller.id,
      reason,
    });
    setViewSeller(null);
    await refetch();
  };

  const onAction = (action: SellerAction) => {
    if (NEEDS_REASON.includes(action.kind)) setPending(action);
    else void run(action);
  };

  const header = (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Sellers &amp; partners</h1>
        <p className="text-slate-500 text-sm">
          Marketplace sellers in {regionLabel}, as the marketplace service records them.
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
            what="the seller directory"
            route={SELLERS_ROUTE}
            message={failure.message}
          />
        ) : (
          <AdminNotConnected
            what="The seller directory"
            route={SELLERS_ROUTE}
            error={failure.message}
            onRetry={() => void refetch()}
          />
        )}
      </div>
    );
  }

  if (!board) return null;

  const counts = {
    pending: rows.filter((s) => s.verificationStatus === 'PENDING').length,
    suspended: rows.filter((s) => s.verificationStatus === 'SUSPENDED').length,
    inactive: rows.filter((s) => !s.isActive).length,
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {header}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <Store className="w-5 h-5 text-blue-500" />
          <p className="text-2xl font-black text-slate-900 mt-2">{board.total.toLocaleString()}</p>
          <p className="text-xs text-slate-500 font-medium">Sellers matching this filter</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <Clock className="w-5 h-5 text-blue-500" />
          <p className="text-2xl font-black text-slate-900 mt-2">{counts.pending}</p>
          <p className="text-xs text-slate-500 font-medium">Awaiting approval, on this page</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <Ban className="w-5 h-5 text-amber-500" />
          <p className="text-2xl font-black text-slate-900 mt-2">{counts.suspended}</p>
          <p className="text-xs text-slate-500 font-medium">Suspended, on this page</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <Shield className="w-5 h-5 text-slate-500" />
          <p className="text-2xl font-black text-slate-900 mt-2">{counts.inactive}</p>
          <p className="text-xs text-slate-500 font-medium">Inactive, on this page</p>
        </div>
      </div>

      {actionError && (
        <p className="text-sm font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {actionError}
        </p>
      )}
      {actionNote && (
        <p className="text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          {actionNote}
        </p>
      )}

      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="Search the loaded sellers by name, owner, or id..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white"
          aria-label="Filter by verification status"
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>
              {s === 'ALL' ? 'All statuses' : s}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Seller</th>
                <th className="px-4 py-3.5 font-semibold">Owner</th>
                <th className="px-4 py-3.5 font-semibold text-center">Rating</th>
                <th className="px-4 py-3.5 font-semibold text-right">Orders</th>
                <th className="px-4 py-3.5 font-semibold text-right">Products</th>
                <th className="px-4 py-3.5 font-semibold text-center">KYC</th>
                <th className="px-4 py-3.5 font-semibold text-center">Status</th>
                <th className="px-4 py-3.5 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((s) => (
                <tr
                  key={s.id}
                  className={`hover:bg-slate-50/50 transition-colors ${s.isActive ? '' : 'opacity-60'}`}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {initials(s.businessName)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{s.businessName}</p>
                        <p className="text-xs text-slate-400">
                          {s.id} · {cityOf(s)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600">{s.ownerName ?? '—'}</td>
                  <td className="px-4 py-3.5 text-center">
                    {num(s.sellerRating) > 0 ? (
                      <span className="inline-flex items-center gap-0.5">
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        <span className="font-bold">{num(s.sellerRating).toFixed(1)}</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">None yet</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right font-bold">
                    {num(s.totalOrders).toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 text-right font-bold">
                    {num(s.totalProducts).toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`text-xs font-bold ${kycC[s.kycStatus] || ''}`}>
                      {s.kycStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span
                      className={`${statusC[s.verificationStatus] || 'bg-slate-100 text-slate-600'} px-2.5 py-1 rounded-full text-xs font-bold`}
                    >
                      {s.verificationStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setViewSeller(s)}
                        className="p-1.5 hover:bg-slate-100 rounded-lg"
                        title="View details"
                      >
                        <Eye className="w-4 h-4 text-slate-400" />
                      </button>
                      {s.verificationStatus === 'PENDING' && (
                        <button
                          onClick={() => onAction({ kind: 'approve', seller: s })}
                          className="p-1.5 hover:bg-emerald-50 rounded-lg"
                          title="Approve"
                        >
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {visible.length === 0 && (
          <div className="py-12 text-center text-slate-400">
            <Store className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">
              {rows.length === 0
                ? 'No sellers are registered in this market yet.'
                : 'No loaded seller matches that search.'}
            </p>
          </div>
        )}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/50 text-sm text-slate-500">
          Showing {visible.length} of {board.total} sellers
        </div>
      </div>

      {viewSeller && (
        <SellerDrawer seller={viewSeller} onClose={() => setViewSeller(null)} onAction={onAction} />
      )}

      {pending && (
        <ReasonDialog
          title={
            pending.kind === 'ban'
              ? `Ban the owner of ${pending.seller.businessName}`
              : `Suspend ${pending.seller.businessName}`
          }
          confirmLabel={pending.kind === 'ban' ? 'Ban owner' : 'Suspend seller'}
          busy={busy}
          onCancel={() => setPending(null)}
          onConfirm={(reason) => void run(pending, reason)}
        />
      )}
    </div>
  );
}
