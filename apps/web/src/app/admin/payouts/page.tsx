'use client';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';
import { adminCoreApi } from '@/lib/api/admin-core';
import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Search,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Download,
  Eye,
  RefreshCcw,
  Landmark,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
type Payout = {
  id: string;
  partner: string;
  partnerId: string;
  module: string;
  grossSales: string;
  commission: string;
  commRate: string;
  netPayout: string;
  method: string;
  bankAcc: string;
  status: 'pending' | 'approved' | 'processing' | 'settled' | 'failed';
  date: string;
  settledAt: string;
};

/**
 * NO FIXTURE ARRAY LIVES HERE ANY MORE.
 *
 * `const payouts: Payout[] = [...]` seeded this page's state, and the fetch
 * replaced it only `if (apiPayouts.length > 0)`. An empty response is what a
 * correctly scoped locked-admin read returns when that market has no pending
 * payouts, so the page answered "your market has no payouts" by rendering
 * another market's (whole-branch review, finding G-1 — `:225`, `:236`).
 *
 * The API result renders unconditionally now, with an explicit empty state
 * naming the market and an explicit error state. The hardcoded figures in the
 * four summary cards above the table are a separate, pre-existing defect and
 * stay with the CONSOLE plan (K2), which rebuilds this screen against
 * `GET /admin/marketplace/payouts/stats`.
 */

const sFallback = { bg: 'bg-slate-100 text-slate-600', icon: null as React.ReactNode };
const sCfg: Record<string, { bg: string; icon: React.ReactNode }> = {
  pending: { bg: 'bg-amber-100 text-amber-700', icon: <Clock className="w-3.5 h-3.5" /> },
  approved: { bg: 'bg-blue-100 text-blue-700', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  processing: { bg: 'bg-indigo-100 text-indigo-700', icon: <RefreshCcw className="w-3.5 h-3.5" /> },
  settled: { bg: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  failed: { bg: 'bg-red-100 text-red-700', icon: <XCircle className="w-3.5 h-3.5" /> },
};

const modC: Record<string, string> = {
  Marketplace: 'bg-blue-100 text-blue-700',
  Grocery: 'bg-green-100 text-green-700',
  Restaurant: 'bg-orange-100 text-orange-700',
  Pharmacy: 'bg-cyan-100 text-cyan-700',
  Doctor: 'bg-purple-100 text-purple-700',
  Taxi: 'bg-amber-100 text-amber-700',
  Delivery: 'bg-violet-100 text-violet-700',
  Franchise: 'bg-teal-100 text-teal-700',
};

export default function PayoutsPage() {
  const { regionLabel, isFiltered, regionCode } = useMarketplaceRegionFilter([]);
  const country = isFiltered ? regionCode : undefined;
  const [search, setSearch] = useState('');
  const [sf, setSf] = useState('All');
  const [mf, setMf] = useState('All');
  const [exp, setExp] = useState<string | null>(null);
  // `null` is "not answered yet", `[]` is "answered, and this market has none".
  const [rows, setRows] = useState<Payout[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const adminId =
    typeof window !== 'undefined' ? localStorage.getItem('adminUserId') || 'admin' : 'admin';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      const res = await adminCoreApi.getPayouts({ country });
      if (cancelled) return;
      if (res.success && Array.isArray((res.data as any)?.data)) {
        setRows((res.data as any).data as Payout[]);
      } else {
        setRows(null);
        setError(
          (res as any)?.error ?? 'Payouts could not be loaded. The payout service did not answer.',
        );
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [country]);

  const data = rows ?? [];
  /** Local status edits are applied to the fetched rows, not to a fixture. */
  const setData = (update: (prev: Payout[]) => Payout[]) => setRows((prev) => update(prev ?? []));

  const f = data.filter((p) => {
    // Coerced, because the rows come from `getPayouts()` and the API's shape is
    // not this page's to assume: a payout row without a `partner` threw
    // `Cannot read properties of undefined (reading 'toLowerCase')` during the
    // filter, which is above the table in the render — so one bad row removed
    // the whole page rather than itself.
    const partner = String(p.partner ?? '');
    const id = String(p.id ?? '');
    const q = search.toLowerCase();
    const ms = partner.toLowerCase().includes(q) || id.toLowerCase().includes(q);
    const mst = sf === 'All' || p.status === sf;
    const mm = mf === 'All' || p.module === mf;
    return ms && mst && mm;
  });

  const approvePayout = async (id: string) => {
    setData((pr) => pr.map((p) => (p.id === id ? { ...p, status: 'approved' as const } : p)));
    await adminCoreApi.approvePayout(id, adminId);
    await adminCoreApi.addAuditLog({
      action: 'payout.approved',
      adminId,
      entityType: 'payout',
      entityId: id,
    });
  };
  const retryPayout = async (id: string) => {
    setData((pr) => pr.map((p) => (p.id === id ? { ...p, status: 'processing' as const } : p)));
    await adminCoreApi.retryPayout(id, adminId);
    await adminCoreApi.addAuditLog({
      action: 'payout.retried',
      adminId,
      entityType: 'payout',
      entityId: id,
    });
  };

  const totalPending = data.filter((p) => p.status === 'pending').length;
  const totalSettled = data.filter((p) => p.status === 'settled').length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payouts & Settlements</h1>
          <p className="text-slate-500 text-sm">
            Manage, approve, and track financial settlements for all partners across modules.
          </p>
        </div>
        <button className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-4 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm">
          <Download className="w-4 h-4" /> Export Report
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-linear-to-br from-emerald-500 to-emerald-600 p-5 rounded-xl shadow-md text-white">
          <DollarSign className="w-5 h-5 opacity-80" />
          <p className="text-3xl font-black mt-3">₹14.2M</p>
          <p className="text-sm font-medium opacity-80 mt-1">Pending Approval</p>
          <p className="text-xs font-bold opacity-70 mt-1">{totalPending} partners</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <CheckCircle className="w-5 h-5 text-emerald-500" />
          <p className="text-2xl font-black text-slate-900 mt-3">₹8.4M</p>
          <p className="text-sm text-slate-500 font-medium mt-1">Settled (7 Days)</p>
          <p className="text-xs text-emerald-600 font-bold mt-1">{totalSettled} transfers</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <Landmark className="w-5 h-5 text-indigo-500" />
          <p className="text-2xl font-black text-slate-900 mt-3">₹1.8M</p>
          <p className="text-sm text-slate-500 font-medium mt-1">Platform Commission</p>
          <p className="text-xs text-indigo-600 font-bold mt-1">7-day earnings</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <p className="text-2xl font-black text-slate-900 mt-3">₹112K</p>
          <p className="text-sm text-slate-500 font-medium mt-1">Failed Transfers</p>
          <p className="text-xs text-red-600 font-bold mt-1">
            {data.filter((p) => p.status === 'failed').length} need retry
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="Search by partner name or payout ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          />
        </div>
        <select
          title="Module filter"
          value={mf}
          onChange={(e) => setMf(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white"
        >
          <option value="All">All Modules</option>
          <option value="Marketplace">Marketplace</option>
          <option value="Grocery">Grocery</option>
          <option value="Restaurant">Restaurant</option>
          <option value="Pharmacy">Pharmacy</option>
          <option value="Doctor">Doctor</option>
          <option value="Taxi">Taxi</option>
          <option value="Delivery">Delivery</option>
          <option value="Franchise">Franchise</option>
        </select>
        <select
          title="Status filter"
          value={sf}
          onChange={(e) => setSf(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white"
        >
          <option value="All">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="processing">Processing</option>
          <option value="settled">Settled</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {error && (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 text-sm"
        >
          <p className="font-bold">Payouts could not be loaded</p>
          <p className="mt-1">{error}</p>
          <p className="mt-1 text-xs text-red-600">
            The table below is empty rather than seeded: a payout queue you cannot trust is worse
            than no payout queue.
          </p>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Partner</th>
                <th className="px-5 py-3.5 font-semibold">Module</th>
                <th className="px-5 py-3.5 font-semibold text-right">Gross Sales</th>
                <th className="px-5 py-3.5 font-semibold text-right">Commission</th>
                <th className="px-5 py-3.5 font-semibold text-right">Net Payout</th>
                <th className="px-5 py-3.5 font-semibold text-center">Status</th>
                <th className="px-5 py-3.5 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && !rows && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-500">
                    Loading payouts…
                  </td>
                </tr>
              )}
              {!loading && !error && f.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-500">
                    {data.length === 0
                      ? `No payouts in ${isFiltered ? regionLabel : 'any market'} yet.`
                      : 'No payouts match these filters.'}
                  </td>
                </tr>
              )}
              {f.map((p) => (
                <React.Fragment key={p.id}>
                  <tr
                    className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                    onClick={() => setExp(exp === p.id ? null : p.id)}
                    tabIndex={0}
                    onKeyDown={activateOnKey(() => setExp(exp === p.id ? null : p.id))}
                  >
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-900">{p.partner}</p>
                      <p className="text-xs text-slate-400">
                        {p.id} • {p.date}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`${modC[p.module] || 'bg-slate-100 text-slate-600'} px-2.5 py-1 rounded-md text-xs font-bold`}
                      >
                        {p.module}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right font-medium text-slate-900">
                      {p.grossSales}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="text-red-600 font-medium">-{p.commission}</span>
                      <span className="text-xs text-slate-400 ml-1">({p.commRate})</span>
                    </td>
                    <td className="px-5 py-4 text-right font-black text-emerald-600">
                      {p.netPayout}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span
                        className={`${(sCfg[p.status] ?? sFallback).bg} px-2.5 py-1 rounded-full text-xs font-bold capitalize inline-flex items-center gap-1`}
                      >
                        {(sCfg[p.status] ?? sFallback).icon} {p.status ?? 'unknown'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      {p.status === 'pending' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            approvePayout(p.id);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg"
                        >
                          Approve
                        </button>
                      )}
                      {p.status === 'failed' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            retryPayout(p.id);
                          }}
                          className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold px-4 py-2 rounded-lg"
                        >
                          Retry
                        </button>
                      )}
                      {p.status === 'settled' && (
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="text-blue-600 text-xs font-bold hover:underline"
                        >
                          Invoice
                        </button>
                      )}
                      {(p.status === 'approved' || p.status === 'processing') && (
                        <span className="text-xs text-slate-400">In progress</span>
                      )}
                    </td>
                  </tr>
                  {exp === p.id && (
                    <tr className="bg-slate-50/80">
                      <td colSpan={7} className="px-5 py-5">
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                          <div>
                            <p className="text-slate-400 text-xs font-medium mb-1">Partner ID</p>
                            <p className="font-bold text-slate-700">{p.partnerId}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs font-medium mb-1">
                              Transfer Method
                            </p>
                            <p className="font-bold text-slate-700">{p.method}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs font-medium mb-1">Bank Account</p>
                            <p className="font-bold text-slate-700">{p.bankAcc}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs font-medium mb-1">Settled At</p>
                            <p className="font-bold text-slate-700">{p.settledAt}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs font-medium mb-1">Net Payout</p>
                            <p className="font-black text-emerald-600 text-lg">{p.netPayout}</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/50 text-sm text-slate-500">
          Showing {f.length} of {data.length} payouts
        </div>
      </div>
    </div>
  );
}
