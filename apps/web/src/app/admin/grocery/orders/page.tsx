'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Eye, AlertTriangle, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { useGroceryRegionFilter } from '@/hooks/useGroceryRegionFilter';
import { adminGroceryApi } from '@/lib/api/admin-grocery';
import { useAsyncData } from '@/lib/hooks/use-async-data';

/**
 * Order monitoring.
 *
 * This page imported `adminGroceryApi` and never called it: all eleven rows —
 * "Rajesh Kumar", "Ahmed Hassan", "Fatima Al Saud" — were written into the file,
 * the revenue tile summed them, and "Avg. Delivery" was the literal string
 * "18 min". `admin.grocery.orders` had no handler on the service either, so even a
 * wired-up version would have 503'd; both halves are fixed.
 */

const STATUS_CFG: Record<string, { bg: string; label: string }> = {
  PLACED:            { bg: 'bg-blue-100 text-blue-700',     label: 'Placed' },
  CONFIRMED:         { bg: 'bg-indigo-100 text-indigo-700', label: 'Confirmed' },
  PACKING:           { bg: 'bg-purple-100 text-purple-700', label: 'Packing' },
  READY_FOR_PICKUP:  { bg: 'bg-cyan-100 text-cyan-700',     label: 'Ready' },
  OUT_FOR_DELIVERY:  { bg: 'bg-orange-100 text-orange-700', label: 'On the Way' },
  DELIVERED:         { bg: 'bg-emerald-100 text-emerald-700', label: 'Delivered' },
  CANCELLED:         { bg: 'bg-red-100 text-red-700',       label: 'Cancelled' },
  REFUNDED:          { bg: 'bg-slate-100 text-slate-600',   label: 'Refunded' },
};

const PAGE_SIZE = 20;

interface AdminOrderRow {
  id: string;
  orderNumber: string;
  customerId: string;
  storeId: string;
  store?: { name?: string; regionCode?: string };
  items?: unknown[];
  grandTotal: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
}

export default function AdminGroceryOrdersPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);

  // Debounced so typing does not fire a request per keystroke against a table
  // that can hold every grocery order on the platform.
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  /**
   * Paged, filtered and searched — so three inputs can change while a request is
   * in flight. The hand-rolled version had no cancellation: type quickly in the
   * search box and whichever response *returned* last won, which is not
   * necessarily the one for the text on screen. `useAsyncData` discards
   * superseded responses.
   */
  const { data, loading, error, reload } = useAsyncData(
    async () => {
      const res = await adminGroceryApi.getOrders({
        page, limit: PAGE_SIZE,
        status: statusFilter === 'All' ? undefined : statusFilter,
        search: debouncedSearch || undefined,
      });
      if (!res.success) throw new Error(res.error ?? 'Could not load grocery orders');
      return res.data;
    },
    [page, statusFilter, debouncedSearch],
  );

  const orders = (data?.data ?? []) as unknown as AdminOrderRow[];
  const total = Number(data?.total ?? 0);

  // Region filtering reads `store.regionCode`, so flatten it onto the row.
  const withRegion = orders.map((o) => ({ ...o, code: o.store?.regionCode }));
  const { filtered, regionLabel, isFiltered, formatPrice } = useGroceryRegionFilter(withRegion);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageRevenue = filtered.reduce((sum, o) => sum + Number(o.grandTotal ?? 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Order Monitoring</h1>
          <p className="text-sm text-slate-500">
            {isFiltered ? `${regionLabel} — ` : ''}Every grocery order across the platform
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-white border border-slate-200 rounded-lg p-2.5">
            <p className="text-lg font-black text-slate-900">{loading ? '—' : total.toLocaleString()}</p>
            <p className="text-[10px] text-slate-500">Orders</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-2.5">
            <p className="text-lg font-black text-emerald-600">{loading ? '—' : formatPrice(pageRevenue)}</p>
            {/* Says what it is: the total of the page on screen, not of all orders. */}
            <p className="text-[10px] text-slate-500">This page</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-2.5">
            <p className="text-lg font-black text-slate-900">{pageCount}</p>
            <p className="text-[10px] text-slate-500">Pages</p>
          </div>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-start justify-between gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          <span className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{error}</span>
          <button onClick={reload} className="font-bold shrink-0 flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5" /> Retry</button>
        </div>
      )}

      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order number or customer id…"
            aria-label="Search grocery orders"
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-green-500 bg-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          aria-label="Filter by order status"
          className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white"
        >
          <option value="All">All statuses</option>
          {Object.entries(STATUS_CFG).map(([value, cfg]) => (
            <option key={value} value={value}>{cfg.label}</option>
          ))}
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold">Order</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Store</th>
                <th className="px-4 py-3 font-semibold text-center">Items</th>
                <th className="px-4 py-3 font-semibold text-right">Total</th>
                <th className="px-4 py-3 font-semibold text-center">Payment</th>
                <th className="px-4 py-3 font-semibold text-center">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Placed</th>
                <th className="px-4 py-3 font-semibold text-center"><span className="sr-only">View</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-400">Loading orders…</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-400">
                    {error ? 'Order list unavailable.' : 'No orders match this filter.'}
                  </td>
                </tr>
              )}
              {filtered.map((o) => {
                const cfg = STATUS_CFG[o.status] ?? { bg: 'bg-slate-100 text-slate-600', label: o.status };
                return (
                  <tr key={o.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-bold text-slate-900">{o.orderNumber}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs font-mono">{o.customerId?.slice(0, 12)}…</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{o.store?.name ?? o.storeId?.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-center">{o.items?.length ?? 0}</td>
                    <td className="px-4 py-3 text-right font-bold">{formatPrice(Number(o.grandTotal ?? 0))}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-medium">{o.paymentMethod}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`${cfg.bg} px-2.5 py-1 rounded-full text-xs font-bold`}>{cfg.label}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-slate-500">
                      {o.createdAt ? new Date(o.createdAt).toLocaleString(undefined, { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link href={`/grocery/orders/${o.id}`} className="inline-flex text-slate-400 hover:text-green-600" aria-label={`View order ${o.orderNumber}`}>
                        <Eye className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {pageCount > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm">
            <span className="text-slate-500">Page {page} of {pageCount}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold disabled:opacity-40 hover:bg-slate-50 flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={page >= pageCount}
                className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold disabled:opacity-40 hover:bg-slate-50 flex items-center gap-1"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
