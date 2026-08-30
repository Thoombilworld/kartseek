'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CheckCircle, XCircle, Eye, AlertTriangle, Clock, RefreshCw, Search } from 'lucide-react';
import { useGroceryRegionFilter } from '@/hooks/useGroceryRegionFilter';
import { useGroceryStoresAdmin } from '@/hooks/useGroceryStoresAdmin';

/**
 * Grocery store approvals.
 *
 * Every row on this page was hand-written JSX: two vendors, "Green Valley Grocers"
 * and "City Fresh Mart", under a heading that read "Pending Applications (3)".
 * Approve and Reject called `groceryApi.updateStoreSettings(id, { status })`, and
 * `updateStoreSettings` whitelists ten fields that do not include `status` — the
 * value was dropped server-side and the endpoint returned `{ success: true }`, so
 * the button turned green and nothing was approved.
 *
 * It now lists the real PENDING_KYC queue and both actions go through
 * `admin.grocery.approve` / `suspend`.
 */
export default function AdminGroceryStoreApprovalsPage() {
  const [search, setSearch] = useState('');
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Scoped to the queue this page exists for.
  const { stores, loading, error, actionError, busyId, approveStore, suspendStore, refetch, clearActionError } =
    useGroceryStoresAdmin('PENDING_KYC');
  const { filtered, regionLabel, isFiltered } = useGroceryRegionFilter(stores);

  const rows = filtered.filter((s) =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.id.includes(search),
  );

  const confirmReject = async () => {
    if (!rejectTarget) return;
    // "Rejected" is not a state `grocery_stores.status` holds — the lifecycle is
    // PENDING_KYC / APPROVED / SUSPENDED. A refused application is suspended with
    // the reason, which is what the seller is notified of.
    await suspendStore(rejectTarget, rejectReason.trim() || 'Application did not meet onboarding requirements');
    setRejectTarget(null);
    setRejectReason('');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Grocery Store Approvals</h1>
          <p className="text-slate-500 text-sm">
            {isFiltered ? `${regionLabel} — ` : ''}Review and approve new grocery vendor applications.
          </p>
        </div>
        <button onClick={() => void refetch()} className="self-start flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> <p>{error}</p>
        </div>
      )}
      {actionError && (
        <div role="alert" className="flex items-start justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <span>{actionError}</span>
          <button onClick={clearActionError} className="font-bold shrink-0">Dismiss</button>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="font-semibold text-slate-800">
            {loading ? 'Loading applications…' : `Pending Applications (${rows.length})`}
          </h2>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              type="text"
              placeholder="Search by name or ID…"
              aria-label="Search applications"
              className="text-sm border border-slate-300 rounded-md pl-9 pr-3 py-1.5 outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Store</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Owner</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Location</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Status</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-400">Loading…</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400">
                    {error ? 'Application queue unavailable.' : 'No applications awaiting review.'}
                  </td>
                </tr>
              )}
              {rows.map((store) => (
                <tr key={store.id} className={`hover:bg-slate-50 transition-colors ${busyId === store.id ? 'opacity-50' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{store.name}</div>
                    <div className="text-xs text-slate-500 font-mono">{store.id.slice(0, 12)}…</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-700 font-medium font-mono text-xs">{store.owner || '—'}</div>
                    {store.phone && <div className="text-xs text-slate-500">{store.phone}</div>}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {store.city || '—'}
                    {store.regionCode && <><br /><span className="text-xs text-slate-400">{store.regionCode}</span></>}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-md text-xs font-semibold border border-amber-200">
                      <Clock className="w-3 h-3" /> Pending KYC
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/grocery/store/${store.id}`}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="View storefront"
                      >
                        <Eye className="w-5 h-5" />
                      </Link>
                      <button
                        onClick={() => void approveStore(store.id)}
                        disabled={busyId === store.id}
                        className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors flex items-center gap-1"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => { setRejectTarget(store.id); setRejectReason(''); }}
                        disabled={busyId === store.id}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                        title="Reject application"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {rejectTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Reject application">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Reject this application?</h2>
            <p className="text-sm text-slate-500 mb-4">The applicant is notified with the reason you give.</p>
            <label htmlFor="reject-reason" className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1 block">Reason</label>
            <textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-400 mb-4"
              placeholder="e.g. business licence could not be verified"
            />
            <div className="flex gap-3">
              <button onClick={() => setRejectTarget(null)} className="flex-1 py-2.5 rounded-xl text-sm font-bold border border-slate-200 text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={() => void confirmReject()} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-red-600 text-white hover:bg-red-700">Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
