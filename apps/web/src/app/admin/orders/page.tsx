'use client';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';
import { adminCoreApi } from '@/lib/api/admin-core';
import React, { useState, useEffect } from 'react';
import {
  Package,
  Search,
  Filter,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  ArrowUpRight,
  RefreshCcw,
  DollarSign,
  ShoppingCart,
  UtensilsCrossed,
  Pill,
  Stethoscope,
  Car,
  Hotel,
} from 'lucide-react';

type Order = {
  id: string;
  customer: string;
  module: string;
  vendor: string;
  items: number;
  total: string;
  status: string;
  payment: string;
  time: string;
  city: string;
};

/**
 * NO FIXTURE ARRAY LIVES HERE ANY MORE.
 *
 * `const orders: Order[] = [...]` held eight hardcoded orders spanning India,
 * the UAE, the UK and Saudi Arabia, and the page seeded its state with them and
 * then replaced them only `if (apiOrders.length > 0)`. An EMPTY response is
 * exactly what a correctly scoped locked-admin read returns when that market
 * has no orders — so a QA-locked administrator saw eight fabricated
 * cross-market orders on the very screen tasks 4 and 9 spent their effort
 * scoping, and the market-aware fetch and the fixture fallback landed in the
 * same commit (`6d34356`). Worse, `todayTotal` and the seven per-module count
 * tiles were computed from the fixture rather than from the fetched rows, so
 * those KPIs were fabricated no matter what the API said — under a "Live" badge
 * with an animated pulse, beside a Refresh button with no `onClick`
 * (whole-branch review, finding G-1).
 *
 * The API result is what renders now, unconditionally, with an explicit empty
 * state naming the market and an explicit error state. The broader rebuild of
 * this screen stays with the CONSOLE plan (K2); this is the honesty fix only.
 */

const statusConfig: Record<string, { bg: string; icon: React.ReactNode }> = {
  delivered: {
    bg: 'bg-emerald-100 text-emerald-700',
    icon: <CheckCircle className="w-3.5 h-3.5" />,
  },
  completed: {
    bg: 'bg-emerald-100 text-emerald-700',
    icon: <CheckCircle className="w-3.5 h-3.5" />,
  },
  confirmed: { bg: 'bg-blue-100 text-blue-700', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  'in-transit': { bg: 'bg-indigo-100 text-indigo-700', icon: <Truck className="w-3.5 h-3.5" /> },
  shipped: { bg: 'bg-indigo-100 text-indigo-700', icon: <Truck className="w-3.5 h-3.5" /> },
  preparing: { bg: 'bg-amber-100 text-amber-700', icon: <Clock className="w-3.5 h-3.5" /> },
  processing: { bg: 'bg-amber-100 text-amber-700', icon: <Clock className="w-3.5 h-3.5" /> },
  cancelled: { bg: 'bg-red-100 text-red-700', icon: <XCircle className="w-3.5 h-3.5" /> },
};

const moduleIcons: Record<string, React.ReactNode> = {
  Marketplace: <ShoppingCart className="w-3.5 h-3.5" />,
  Grocery: <ShoppingCart className="w-3.5 h-3.5" />,
  Restaurant: <UtensilsCrossed className="w-3.5 h-3.5" />,
  Pharmacy: <Pill className="w-3.5 h-3.5" />,
  Doctor: <Stethoscope className="w-3.5 h-3.5" />,
  Taxi: <Car className="w-3.5 h-3.5" />,
  Hotel: <Hotel className="w-3.5 h-3.5" />,
};

const moduleColors: Record<string, string> = {
  Marketplace: 'bg-blue-100 text-blue-700',
  Grocery: 'bg-green-100 text-green-700',
  Restaurant: 'bg-orange-100 text-orange-700',
  Pharmacy: 'bg-cyan-100 text-cyan-700',
  Doctor: 'bg-purple-100 text-purple-700',
  Taxi: 'bg-yellow-100 text-yellow-700',
  Hotel: 'bg-indigo-100 text-indigo-700',
};

/**
 * One row's value as a number.
 *
 * The rows come from the API and their shape is not this page's to assume —
 * `total` arrives as a formatted string on some modules and a number on others.
 * `o.total.replace(...)` threw `replace is not a function` on a numeric total,
 * and that call sat above the table in the render, so one row of the wrong
 * shape removed the whole page rather than itself (the same trap
 * `admin/payouts` documents on its own filter).
 */
function amountOf(order: Order): number {
  const digits = String(order?.total ?? '').replace(/[^0-9.-]/g, '');
  const value = Number(digits);
  return Number.isFinite(value) ? value : 0;
}

export default function OrdersPage() {
  const { regionLabel, isFiltered, regionCode, formatCurrencyValue } = useMarketplaceRegionFilter(
    [],
  );
  const country = isFiltered ? regionCode : undefined;
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  // `null` is "not answered yet", `[]` is "answered, and this market has none".
  // The two used to be the same thing, which is what let the fixture stand in
  // for both.
  const [data, setData] = useState<Order[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      const res = await adminCoreApi.getOrders({ country });
      if (cancelled) return;
      if (res.success && Array.isArray((res.data as any)?.data)) {
        setData((res.data as any).data as Order[]);
      } else {
        // Not an empty table: a failure says so, and says it instead of rows.
        setData(null);
        setError(
          (res as any)?.error ?? 'Orders could not be loaded. The order service did not answer.',
        );
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [country, reloadKey]);

  const rows = data ?? [];

  const filtered = rows.filter((o) => {
    // Coerced for the same reason `amountOf` exists: a row without a customer
    // or a vendor is a row, not a crash.
    const q = search.toLowerCase();
    const matchSearch =
      String(o?.id ?? '')
        .toLowerCase()
        .includes(q) ||
      String(o?.customer ?? '')
        .toLowerCase()
        .includes(q) ||
      String(o?.vendor ?? '')
        .toLowerCase()
        .includes(q);
    const matchModule = moduleFilter === 'All' || o.module === moduleFilter;
    const matchStatus = statusFilter === 'All' || o.status === statusFilter;
    return matchSearch && matchModule && matchStatus;
  });

  // From the fetched rows, not from a fixture — and formatted in the market's
  // own currency rather than with a hardcoded `₹`.
  const todayTotal = rows.reduce((a, o) => a + amountOf(o), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orders — All Modules</h1>
          <p className="text-slate-500 text-sm">
            Centralized order management across Marketplace, Grocery, Restaurant, Pharmacy, Doctor &
            Taxi.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {/* The badge says what is true. It used to pulse "Live" over a
              hardcoded fixture beside a Refresh button with no handler. */}
          {error ? (
            <span className="inline-flex items-center gap-1.5 bg-red-100 text-red-700 px-3 py-1.5 rounded-full font-bold">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span> Not connected
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full font-bold">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> Live
            </span>
          )}
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            disabled={loading}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 disabled:opacity-50"
          >
            <RefreshCcw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />{' '}
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {['Marketplace', 'Grocery', 'Restaurant', 'Pharmacy', 'Doctor', 'Taxi', 'Hotel'].map(
          (m) => {
            const count = rows.filter((o) => o.module === m).length;
            return (
              <button
                key={m}
                onClick={() => setModuleFilter(moduleFilter === m ? 'All' : m)}
                className={`p-3 rounded-xl border text-center transition-all ${moduleFilter === m ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500' : 'border-slate-200 bg-white hover:border-slate-300'}`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-1 ${moduleColors[m]}`}
                >
                  {moduleIcons[m]}
                </div>
                <p className="text-xs font-bold text-slate-900">{m}</p>
                <p className="text-[10px] text-slate-500">{count} orders</p>
              </button>
            );
          },
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by order ID, customer, or vendor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          title="Filter by status"
          className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="All">All Status</option>
          <option value="delivered">Delivered</option>
          <option value="in-transit">In Transit</option>
          <option value="preparing">Preparing</option>
          <option value="shipped">Shipped</option>
          <option value="processing">Processing</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {error && (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 text-sm"
        >
          <p className="font-bold">Orders could not be loaded</p>
          <p className="mt-1">{error}</p>
          <p className="mt-1 text-xs text-red-600">
            Nothing is shown below rather than a sample: an order list you cannot trust is worse
            than no order list.
          </p>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Order</th>
                <th className="px-5 py-3.5 font-semibold">Module</th>
                <th className="px-5 py-3.5 font-semibold">Vendor</th>
                <th className="px-5 py-3.5 font-semibold">City</th>
                <th className="px-5 py-3.5 font-semibold text-center">Items</th>
                <th className="px-5 py-3.5 font-semibold text-right">Total</th>
                <th className="px-5 py-3.5 font-semibold text-center">Payment</th>
                <th className="px-5 py-3.5 font-semibold text-center">Status</th>
                <th className="px-5 py-3.5 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && !data && (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-sm text-slate-500">
                    Loading orders…
                  </td>
                </tr>
              )}
              {!loading && !error && filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-sm text-slate-500">
                    {rows.length === 0
                      ? `No orders in ${isFiltered ? regionLabel : 'any market'} yet.`
                      : 'No orders match these filters.'}
                  </td>
                </tr>
              )}
              {filtered.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-bold text-slate-900">{o.id}</p>
                    <p className="text-xs text-slate-400">
                      {o.customer} • {o.time}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`${moduleColors[o.module]} px-2.5 py-1 rounded-md text-xs font-bold inline-flex items-center gap-1`}
                    >
                      {moduleIcons[o.module]} {o.module}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-700 text-xs">{o.vendor}</td>
                  <td className="px-5 py-4 text-slate-600 text-xs">{o.city}</td>
                  <td className="px-5 py-4 text-center font-medium">{o.items}</td>
                  <td className="px-5 py-4 text-right font-bold text-slate-900">{o.total}</td>
                  <td className="px-5 py-4 text-center">
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-bold">
                      {o.payment}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span
                      className={`${statusConfig[o.status]?.bg} px-2.5 py-1 rounded-full text-xs font-bold capitalize inline-flex items-center gap-1`}
                    >
                      {statusConfig[o.status]?.icon} {o.status.replace('-', ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <button
                      title="View order details"
                      className="p-1.5 hover:bg-slate-100 rounded-lg"
                    >
                      <Eye className="w-4 h-4 text-slate-400" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/50 flex justify-between text-sm text-slate-500">
          <span>
            Showing {filtered.length} of {rows.length} orders
          </span>
          <span>
            Total Value:{' '}
            <strong className="text-slate-900">{formatCurrencyValue(todayTotal)}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
