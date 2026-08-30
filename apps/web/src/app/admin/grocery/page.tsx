'use client';

import React, { useState } from 'react';
import {
  Store, Search, Star, Eye, CheckCircle, Clock, XCircle, DollarSign, ShoppingBag,
  ChevronDown, ChevronUp, Phone, Wifi, WifiOff, AlertTriangle, RefreshCw, Package,
} from 'lucide-react';
import Link from 'next/link';
import { useGroceryRegionFilter } from '@/hooks/useGroceryRegionFilter';
import { useGroceryStoresAdmin, type StoreStatus } from '@/hooks/useGroceryStoresAdmin';
import { useAdminGroceryDashboard } from '@/hooks/useAdminGroceryDashboard';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
/**
 * Grocery — Partner Control.
 *
 * The headline counters were derived from eleven demo stores and a `revenue`
 * field invented as `orders × 500`; "Quality Alerts" counted a `complaints`
 * property no store record has ever carried. They now come from
 * `admin.grocery.dashboard`, which aggregates the real tables.
 *
 * The lifecycle has three states, not four: `grocery_stores.status` is
 * PENDING_KYC / APPROVED / SUSPENDED. The UI offered Block and Reject as well,
 * mapped onto values the column cannot hold, so those two buttons could not have
 * worked even if the endpoint had been right.
 */
const STATUS_CFG: Record<StoreStatus, { bg: string; label: string }> = {
  active:    { bg: 'bg-emerald-100 text-emerald-700', label: 'Active' },
  suspended: { bg: 'bg-amber-100 text-amber-700',     label: 'Suspended' },
  pending:   { bg: 'bg-blue-100 text-blue-700',       label: 'Pending KYC' },
};

export default function GroceryAdminPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<string | null>(null);
  const [suspendReason, setSuspendReason] = useState('');

  const {
    stores, loading, error, actionError, busyId,
    approveStore, suspendStore, refetch, clearActionError,
  } = useGroceryStoresAdmin();
  const { dashboard, loading: dashboardLoading } = useAdminGroceryDashboard();
  const { filtered: regionFiltered, regionLabel, isFiltered, formatPrice } = useGroceryRegionFilter(stores);

  const rows = regionFiltered.filter((r) => {
    const matchesSearch = !search
      || r.name.toLowerCase().includes(search.toLowerCase())
      || r.city.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const confirmSuspend = async () => {
    if (!suspendTarget) return;
    await suspendStore(suspendTarget, suspendReason.trim() || undefined);
    setSuspendTarget(null);
    setSuspendReason('');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            Grocery — Partner Control
            {loading
              ? <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" /> Loading</span>
              : error
                ? <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1"><WifiOff className="w-3 h-3" /> Unavailable</span>
                : <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1"><Wifi className="w-3 h-3" /> Live</span>}
          </h1>
          <p className="text-slate-500 text-sm">
            {isFiltered ? `${regionLabel} — ` : ''}Approve, suspend and monitor grocery store partners.
          </p>
        </div>
        <button onClick={() => void refetch()} className="self-start md:self-auto flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Could not load grocery stores</p>
            <p className="text-red-600/80">{error}</p>
          </div>
        </div>
      )}

      {actionError && (
        <div role="alert" className="flex items-start justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <span>{actionError}</span>
          <button onClick={clearActionError} className="font-bold shrink-0">Dismiss</button>
        </div>
      )}

      {/* KPI tiles — from admin.grocery.dashboard, not from the rows on screen. */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-linear-to-br from-green-500 to-green-600 p-5 rounded-xl shadow-md text-white">
          <Store className="w-5 h-5 opacity-80" />
          <p className="text-3xl font-black mt-3">{dashboardLoading ? '—' : dashboard?.stores.total ?? 0}</p>
          <p className="text-sm font-medium opacity-80 mt-1">Grocery Stores</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <ShoppingBag className="w-5 h-5 text-emerald-500" />
          <p className="text-2xl font-black text-slate-900 mt-3">{dashboardLoading ? '—' : (dashboard?.orders.total ?? 0).toLocaleString()}</p>
          <p className="text-sm text-slate-500 font-medium mt-1">Total Orders</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <DollarSign className="w-5 h-5 text-amber-500" />
          <p className="text-2xl font-black text-slate-900 mt-3">{dashboardLoading ? '—' : formatPrice(dashboard?.revenue.last30Days ?? 0)}</p>
          <p className="text-sm text-slate-500 font-medium mt-1">Revenue (30d)</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <Clock className="w-5 h-5 text-blue-500" />
          <p className="text-2xl font-black text-slate-900 mt-3">{dashboardLoading ? '—' : dashboard?.stores.pending ?? 0}</p>
          <p className="text-sm text-slate-500 font-medium mt-1">Awaiting Approval</p>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="Search stores…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search grocery stores"
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by store status"
          className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white"
        >
          <option value="All">All statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending KYC</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Store</th>
                <th className="px-5 py-3.5 font-semibold text-center">Rating</th>
                <th className="px-5 py-3.5 font-semibold text-right">Orders</th>
                <th className="px-5 py-3.5 font-semibold text-right">Products</th>
                <th className="px-5 py-3.5 font-semibold text-center">Online</th>
                <th className="px-5 py-3.5 font-semibold text-center">Status</th>
                <th className="px-5 py-3.5 font-semibold text-center"><span className="sr-only">Expand</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-400">Loading grocery stores…</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                    {error ? 'Store list unavailable.' : 'No grocery stores match this filter.'}
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <React.Fragment key={r.id}>
                  <tr
                    className={`hover:bg-slate-50/50 cursor-pointer ${busyId === r.id ? 'opacity-50' : ''}`}
                    onClick={() => setExpanded(expanded === r.id ? null : r.id)} tabIndex={0} onKeyDown={activateOnKey(() => setExpanded(expanded === r.id ? null : r.id))}
                  >
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-900">{r.name}</p>
                      <p className="text-xs text-slate-400">{[r.id.slice(0, 8), r.city].filter(Boolean).join(' • ')}</p>
                    </td>
                    <td className="px-5 py-4 text-center">
                      {r.rating > 0
                        ? <span className="inline-flex items-center gap-0.5"><Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /><span className="font-bold">{r.rating.toFixed(1)}</span></span>
                        : <span className="text-slate-400 text-xs">N/A</span>}
                    </td>
                    <td className="px-5 py-4 text-right font-bold">{r.orders.toLocaleString()}</td>
                    <td className="px-5 py-4 text-right">{r.products.toLocaleString()}</td>
                    <td className="px-5 py-4 text-center">
                      {r.isOnline
                        ? <Wifi className="w-4 h-4 text-emerald-500 inline" aria-label="Online" />
                        : <WifiOff className="w-4 h-4 text-slate-300 inline" aria-label="Offline" />}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`${STATUS_CFG[r.status].bg} px-2.5 py-1 rounded-full text-xs font-bold`}>{STATUS_CFG[r.status].label}</span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      {expanded === r.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </td>
                  </tr>

                  {expanded === r.id && (
                    <tr className="bg-slate-50/80">
                      <td colSpan={7} className="px-5 py-5">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                          <div>
                            <p className="text-slate-400 text-xs font-medium mb-1">Owner</p>
                            <p className="font-bold text-slate-700 truncate">{r.owner || '—'}</p>
                            {r.phone && <p className="text-xs text-slate-500 flex items-center gap-1 mt-1"><Phone className="w-3 h-3" />{r.phone}</p>}
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs font-medium mb-1">Catalogue</p>
                            <p className="font-bold text-slate-900 flex items-center gap-1"><Package className="w-3.5 h-3.5 text-slate-400" />{r.products} items</p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs font-medium mb-1">Region</p>
                            <p className="font-bold text-slate-700">{r.regionCode || '—'}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs font-medium mb-1">Availability</p>
                            <p className="font-bold text-slate-700">{r.lastActive}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
                          {r.status !== 'active' && (
                            <button
                              onClick={() => void approveStore(r.id)}
                              disabled={busyId === r.id}
                              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Approve
                            </button>
                          )}
                          {r.status !== 'suspended' && (
                            <button
                              onClick={() => { setSuspendTarget(r.id); setSuspendReason(''); }}
                              disabled={busyId === r.id}
                              className="bg-amber-100 hover:bg-amber-200 disabled:opacity-50 text-amber-700 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Suspend
                            </button>
                          )}
                          <Link
                            href={`/grocery/store/${r.id}`}
                            className="bg-white hover:bg-slate-50 text-slate-600 px-4 py-2 rounded-lg text-xs font-bold border border-slate-200 flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" /> View storefront
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* A suspension is visible to the seller, so it takes a reason. */}
      {suspendTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Suspend store">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Suspend this store?</h2>
            <p className="text-sm text-slate-500 mb-4">
              The store stops taking orders immediately and is taken offline. The owner is notified.
            </p>
            <label htmlFor="suspend-reason" className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1 block">Reason (shown to the seller)</label>
            <textarea
              id="suspend-reason"
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              rows={3}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400 mb-4"
              placeholder="e.g. repeated quality complaints"
            />
            <div className="flex gap-3">
              <button onClick={() => setSuspendTarget(null)} className="flex-1 py-2.5 rounded-xl text-sm font-bold border border-slate-200 text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={() => void confirmSuspend()} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-amber-600 text-white hover:bg-amber-700">Suspend store</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
