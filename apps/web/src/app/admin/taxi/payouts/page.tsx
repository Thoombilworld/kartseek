'use client';

import React, { useState } from 'react';
import {
  DollarSign,
  Search,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  RefreshCcw,
  Building2,
  Users,
  ArrowRight,
} from 'lucide-react';
import { adminTaxiApi } from '@/lib/api/admin-taxi';
import type { TaxiPayoutRow } from '@/lib/api/admin-taxi';
import { useAdminData } from '@/hooks/useAdminData';
import {
  AdminForbidden,
  AdminLoading,
  AdminNotConnected,
  classifyApiFailure,
  type ApiFailureKind,
} from '@/components/admin/api-states';

/**
 * Taxi financial reconciliation — the `taxi_payout_records` rows
 * `GET /admin/taxi/payouts` returns.
 *
 * What was here before: `mockPayouts`, seven invented records with ids like
 * `PAY-001`, seeded into state and used unless an unauthenticated `fetch`
 * happened to answer. The batch buttons then posted those very ids to
 * `POST /admin/taxi/payouts/process` alongside `action: 'approve' | 'settle'` —
 * two separate refusals, since `PayoutBatchDto.payoutIds` is `@IsUUID('4')` and
 * declares no `action` at all. `TaxiPayoutService.processPayouts` has no notion
 * of an action either: it settles what is already approved, and approving is
 * the separate `POST /admin/taxi/payouts/:id/approve` route this page now uses,
 * one record at a time, reporting how many were accepted.
 *
 * The summary cards used to add `netPayout` across every row. Those rows carry
 * their own `currency`, so that total was QAR + INR + AED + GBP added together
 * and stamped with one symbol — the same defect the master dashboard's revenue
 * card was rebuilt for. Counts are currency-free, so counts are what is shown.
 */

// ─── Data ─────────────────────────────────────────────────────────────────────

export const PAYOUTS_ROUTE = 'GET /admin/taxi/payouts';

export type PayoutsResult =
  | { ok: true; rows: TaxiPayoutRow[]; total: number }
  | { ok: false; kind: ApiFailureKind; message: string };

export async function loadPayouts(params: {
  status?: string;
  countryCode?: string;
}): Promise<PayoutsResult> {
  const res = await adminTaxiApi.getPayouts({
    limit: 100,
    status: params.status,
    countryCode: params.countryCode,
  });
  if (!res.success) {
    const message = res.error || 'The payout ledger did not answer';
    return { ok: false, kind: classifyApiFailure(message), message };
  }
  const rows = res.data?.data ?? [];
  return { ok: true, rows, total: res.data?.total ?? rows.length };
}

const sCfg: Record<string, { bg: string; l: string; icon: React.ElementType }> = {
  pending: { bg: 'bg-blue-100 text-blue-700', l: 'Pending', icon: Clock },
  approved: { bg: 'bg-indigo-100 text-indigo-700', l: 'Approved', icon: CheckCircle },
  processing: { bg: 'bg-amber-100 text-amber-700', l: 'Processing', icon: RefreshCcw },
  settled: { bg: 'bg-emerald-100 text-emerald-700', l: 'Settled', icon: CheckCircle },
  failed: { bg: 'bg-red-100 text-red-700', l: 'Failed', icon: XCircle },
};

const money = (v: number | string | null | undefined): string => {
  const n = typeof v === 'string' ? Number(v) : (v ?? 0);
  return Number.isFinite(n) ? n.toLocaleString() : '—';
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TaxiPayoutsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [countryFilter, setCountryFilter] = useState('All');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNote, setActionNote] = useState<string | null>(null);

  const { data, loading, error, refetch } = useAdminData<PayoutsResult>(
    () =>
      loadPayouts({
        status: statusFilter === 'All' ? undefined : statusFilter,
        countryCode: countryFilter === 'All' ? undefined : countryFilter,
      }),
    [statusFilter, countryFilter],
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

  const payouts = board?.rows ?? [];
  const needle = search.trim().toLowerCase();
  const filtered = needle
    ? payouts.filter(
        (p) =>
          p.recipientName.toLowerCase().includes(needle) || p.rideId.toLowerCase().includes(needle),
      )
    : payouts;

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selectAllPending = () =>
    setSelected(new Set(filtered.filter((p) => p.status === 'pending').map((p) => p.id)));

  /** Approval is per record: `POST /admin/taxi/payouts/:id/approve` takes no batch. */
  const batchApprove = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    setBusy(true);
    setActionError(null);
    setActionNote(null);
    const results = await Promise.all(ids.map((id) => adminTaxiApi.approvePayout(id)));
    setBusy(false);
    const accepted = results.filter((r) => r.success).length;
    const refused = results.find((r) => !r.success);
    if (refused) setActionError(refused.error || 'A payout approval did not answer');
    if (accepted > 0) setActionNote(`${accepted} of ${ids.length} payout(s) approved.`);
    setSelected(new Set());
    await refetch();
  };

  /** Settlement is the batch: `POST /admin/taxi/payouts/process` with `{ payoutIds }`. */
  const batchProcess = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    setBusy(true);
    setActionError(null);
    setActionNote(null);
    const res = await adminTaxiApi.processPayouts(ids);
    setBusy(false);
    if (!res.success) {
      setActionError(res.error || 'The settlement run did not answer');
      return;
    }
    setActionNote(
      `Settlement run: ${res.data?.processed ?? 0} processed, ${res.data?.failed ?? 0} failed.`,
    );
    setSelected(new Set());
    await refetch();
  };

  const counts = {
    pending: payouts.filter((p) => p.status === 'pending').length,
    approved: payouts.filter((p) => p.status === 'approved').length,
    settled: payouts.filter((p) => p.status === 'settled').length,
    failed: payouts.filter((p) => p.status === 'failed').length,
  };

  const countries = [...new Set(payouts.map((p) => p.countryCode).filter(Boolean))];

  const header = (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-emerald-600" />
          Taxi financial reconciliation
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Driver and vendor payouts, as taxi-service records them. Approve records one by one, then
          settle the approved ones as a batch.
        </p>
      </div>
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
            what="the payout ledger"
            route={PAYOUTS_ROUTE}
            message={failure.message}
          />
        ) : (
          <AdminNotConnected
            what="The payout ledger"
            route={PAYOUTS_ROUTE}
            error={failure.message}
            onRetry={() => void refetch()}
          />
        )}
      </div>
    );
  }

  if (!board) return null;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {header}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            icon: Clock,
            color: 'text-blue-500',
            value: counts.pending,
            label: 'Pending, on this page',
          },
          {
            icon: CheckCircle,
            color: 'text-indigo-500',
            value: counts.approved,
            label: 'Approved, awaiting settlement',
          },
          {
            icon: CheckCircle,
            color: 'text-emerald-500',
            value: counts.settled,
            label: 'Settled, on this page',
          },
          {
            icon: AlertTriangle,
            color: 'text-red-500',
            value: counts.failed,
            label: 'Failed transfers',
          },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"
          >
            <card.icon className={`w-5 h-5 ${card.color}`} />
            <p className="text-2xl font-black text-slate-900 mt-2">{card.value}</p>
            <p className="text-xs text-slate-500 font-medium">{card.label}</p>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-slate-400">
        Amounts are shown per record in that record&rsquo;s own currency. They are not totalled:
        these rows span several currencies and one sum of them would mean nothing.
      </p>

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

      {selected.size > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between">
          <p className="text-sm font-bold text-indigo-700">{selected.size} payout(s) selected</p>
          <div className="flex gap-2">
            <button
              onClick={() => void batchApprove()}
              disabled={busy}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 disabled:opacity-50"
              id="batch-approve-btn"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Approve selected
            </button>
            <button
              onClick={() => void batchProcess()}
              disabled={busy}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 disabled:opacity-50"
              id="batch-process-btn"
            >
              <ArrowRight className="w-3.5 h-3.5" /> Settle selected
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="px-4 py-2 bg-white text-slate-600 rounded-lg text-xs font-bold border border-slate-200"
              id="clear-selection-btn"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="Search the loaded records by recipient or ride id..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            id="search-payouts"
          />
        </div>
        <select
          title="Filter by market"
          value={countryFilter}
          onChange={(e) => setCountryFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white"
          id="filter-country-payouts"
        >
          <option value="All">All markets</option>
          {countries.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
        <select
          title="Filter by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white"
          id="filter-status-payouts"
        >
          <option value="All">All statuses</option>
          {Object.entries(sCfg).map(([k, v]) => (
            <option key={k} value={k}>
              {v.l}
            </option>
          ))}
        </select>
        <button
          onClick={selectAllPending}
          className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-colors"
          id="select-all-pending"
        >
          Select all pending
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-3 py-3 font-semibold w-10">
                  <input
                    title="Select all pending"
                    type="checkbox"
                    className="rounded"
                    onChange={(e) => {
                      if (e.target.checked) selectAllPending();
                      else setSelected(new Set());
                    }}
                  />
                </th>
                <th className="px-4 py-3 font-semibold">Recipient</th>
                <th className="px-4 py-3 font-semibold">Ride</th>
                <th className="px-4 py-3 font-semibold text-right">Gross</th>
                <th className="px-4 py-3 font-semibold text-right">Platform</th>
                <th className="px-4 py-3 font-semibold text-right">Vendor</th>
                <th className="px-4 py-3 font-semibold text-right">Tax</th>
                <th className="px-4 py-3 font-semibold text-right">Net payout</th>
                <th className="px-4 py-3 font-semibold text-center">Status</th>
                <th className="px-4 py-3 font-semibold">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((p) => {
                const StatusIcon = sCfg[p.status]?.icon ?? Clock;
                return (
                  <tr
                    key={p.id}
                    className={`hover:bg-slate-50/50 ${selected.has(p.id) ? 'bg-indigo-50/50' : ''}`}
                  >
                    <td className="px-3 py-3">
                      <input
                        title={`Select payout ${p.id}`}
                        type="checkbox"
                        checked={selected.has(p.id)}
                        onChange={() => toggleSelect(p.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-900 text-xs">{p.recipientName}</p>
                      <span
                        className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${p.recipientType === 'vendor' ? 'text-purple-600' : 'text-indigo-600'}`}
                      >
                        {p.recipientType === 'vendor' ? (
                          <Building2 className="w-3 h-3" />
                        ) : (
                          <Users className="w-3 h-3" />
                        )}
                        {p.recipientType} · {p.countryCode}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-500">{p.rideId}</td>
                    <td className="px-4 py-3 text-right text-xs font-bold text-slate-700">
                      {p.currency} {money(p.grossAmount)}
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-bold text-red-600">
                      {money(p.platformCommission)}
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-bold text-purple-600">
                      {money(p.vendorCommission)}
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-bold text-slate-500">
                      {money(p.taxAmount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-black text-emerald-700 text-sm">
                        {p.currency} {money(p.netPayout)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`${sCfg[p.status]?.bg ?? 'bg-slate-100 text-slate-600'} px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-0.5`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {sCfg[p.status]?.l ?? p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {p.createdAt ? new Date(p.createdAt).toLocaleString() : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-slate-400">
            <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">
              {payouts.length === 0
                ? 'No payout records exist for these filters yet.'
                : 'No loaded record matches that search.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
