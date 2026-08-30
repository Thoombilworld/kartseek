'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, ShoppingCart, ChefHat, Truck, DollarSign, AlertTriangle, RefreshCw, ChevronRight } from 'lucide-react';
import { useGroceryLocale } from '@/i18n/grocery-locale';
import { groceryApi } from '@/lib/grocery-api';
import { StoreGate } from '@/components/seller/grocery/store-gate';
import type { GrocerySellerStore } from '@/lib/hooks/use-grocery-seller-store';
import { useAsyncData } from '@/lib/hooks/use-async-data';

/**
 * Seller order queue.
 *
 * Three orders were written into the file as arrays of strings — "GRC-4521",
 * "Sarah M.", "8 items" — and the four stat tiles above them read 12, 5, 8 and
 * 45,800, all literals. `groceryApi` was imported and never called.
 *
 * The queue is now the store's real orders, and the status buttons advance them
 * through the lifecycle the service enforces (`GROCERY_ORDER_STATUS_TRANSITIONS`),
 * which is also why only the legal next step is offered.
 */
export default function GroceryOrdersPage() {
  return <StoreGate requireApproved>{(store) => <OrdersContent store={store} />}</StoreGate>;
}

const STATUS_CFG: Record<string, { label: string; className: string }> = {
  PLACED:           { label: 'New',             className: 'bg-blue-50 text-blue-700' },
  CONFIRMED:        { label: 'Confirmed',       className: 'bg-indigo-50 text-indigo-700' },
  PACKING:          { label: 'Packing',         className: 'bg-amber-50 text-amber-700' },
  READY_FOR_PICKUP: { label: 'Ready',           className: 'bg-cyan-50 text-cyan-700' },
  OUT_FOR_DELIVERY: { label: 'Out for delivery', className: 'bg-orange-50 text-orange-700' },
  DELIVERED:        { label: 'Delivered',       className: 'bg-emerald-50 text-emerald-700' },
  CANCELLED:        { label: 'Cancelled',       className: 'bg-red-50 text-red-700' },
  REFUNDED:         { label: 'Refunded',        className: 'bg-slate-100 text-slate-500' },
};

/**
 * The seller-actionable transitions, mirroring the service's transition table.
 * Offering a status the service will reject is how the old portal's status
 * buttons produced silent failures.
 */
const NEXT_STATUS: Record<string, { status: string; label: string } | null> = {
  PLACED:           { status: 'CONFIRMED',        label: 'Accept order' },
  CONFIRMED:        { status: 'PACKING',          label: 'Start packing' },
  PACKING:          { status: 'READY_FOR_PICKUP', label: 'Mark ready' },
  READY_FOR_PICKUP: { status: 'OUT_FOR_DELIVERY', label: 'Out for delivery' },
  OUT_FOR_DELIVERY: { status: 'DELIVERED',        label: 'Mark delivered' },
  DELIVERED:        null,
  CANCELLED:        null,
  REFUNDED:         null,
};

const FILTERS = ['All', 'PLACED', 'CONFIRMED', 'PACKING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED'];

interface SellerOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  items?: Array<{ name: string; quantity: number; weight: string; price: number }>;
  grandTotal: number;
  status: string;
  paymentMethod: string;
  deliverySlot?: unknown;
  createdAt: string;
}

function OrdersContent({ store }: { store: GrocerySellerStore }) {
  const { formatPrice } = useGroceryLocale();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: ordersData, loading, error, reload } = useAsyncData<SellerOrder[]>(
    async () => {
      const res = await groceryApi.getStoreOrders(store.id, filter === 'All' ? undefined : filter, 1, 100);
      return (res?.data ?? []) as unknown as SellerOrder[];
    },
    [store.id, filter],
  );
  const orders = error ? [] : (ordersData ?? []);

  const advance = async (order: SellerOrder) => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    setBusyId(order.id);
    setActionError(null);
    try {
      await groceryApi.updateOrderStatus(order.id, next.status);
      await reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not update this order');
    } finally {
      setBusyId(null);
    }
  };

  const rows = orders.filter((o) =>
    !search
    || o.orderNumber?.toLowerCase().includes(search.toLowerCase())
    || o.customerId?.toLowerCase().includes(search.toLowerCase()),
  );

  // Counted from the loaded queue rather than hardcoded.
  const counts = {
    newOrders: orders.filter((o) => o.status === 'PLACED').length,
    packing: orders.filter((o) => o.status === 'PACKING' || o.status === 'CONFIRMED').length,
    outForDelivery: orders.filter((o) => o.status === 'OUT_FOR_DELIVERY').length,
    deliveredValue: orders.filter((o) => o.status === 'DELIVERED').reduce((s, o) => s + Number(o.grandTotal ?? 0), 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <ShoppingCart className="w-7 h-7 text-blue-600" /> Grocery Orders
          </h1>
          <p className="text-sm text-slate-500 mt-1">{store.name}</p>
        </div>
        <button onClick={() => reload()} className="self-start flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error && (
        <div role="alert" className="flex items-start justify-between gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          <span className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{error}</span>
          <button onClick={() => reload()} className="font-bold shrink-0">Retry</button>
        </div>
      )}
      {actionError && (
        <div role="alert" className="flex items-start justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="font-bold shrink-0">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'New Orders', value: counts.newOrders, icon: ShoppingCart, bg: 'bg-blue-50', color: 'text-blue-600' },
          { label: 'Preparing', value: counts.packing, icon: ChefHat, bg: 'bg-amber-50', color: 'text-amber-600' },
          { label: 'Out for Delivery', value: counts.outForDelivery, icon: Truck, bg: 'bg-emerald-50', color: 'text-emerald-600' },
          { label: 'Delivered value', value: formatPrice(counts.deliveredValue), icon: DollarSign, bg: 'bg-violet-50', color: 'text-violet-600' },
        ].map((tile) => {
          const Icon = tile.icon;
          return (
            <div key={tile.label} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${tile.bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${tile.color}`} />
                </div>
                <div>
                  <p className="text-xs text-slate-500">{tile.label}</p>
                  <p className="text-lg font-black text-slate-900">{loading ? '—' : tile.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={`px-3 py-2 text-xs font-bold rounded-lg border whitespace-nowrap transition-colors ${filter === f ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
          >
            {f === 'All' ? 'All' : STATUS_CFG[f]?.label ?? f}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by order number…"
          aria-label="Search orders"
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Order</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Items</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-500">Total</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-500">Payment</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-500">Status</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Loading orders…</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-500">{error ? 'Order queue unavailable.' : 'No orders in this view.'}</p>
                  </td>
                </tr>
              )}
              {rows.map((o) => {
                const cfg = STATUS_CFG[o.status] ?? { label: o.status, className: 'bg-slate-100 text-slate-600' };
                const next = NEXT_STATUS[o.status];
                return (
                  <tr key={o.id} className={`hover:bg-slate-50/50 transition-colors ${busyId === o.id ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3.5">
                      <Link href={`/seller/grocery/orders/${o.id}`} className="font-bold text-slate-800 hover:text-blue-600">{o.orderNumber}</Link>
                      <p className="text-xs text-slate-400">
                        {o.createdAt ? new Date(o.createdAt).toLocaleString(undefined, { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—'}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      {o.items?.length ?? 0} item{(o.items?.length ?? 0) === 1 ? '' : 's'}
                      {o.items?.[0] && <p className="text-xs text-slate-400 truncate max-w-[180px]">{o.items[0].name}{(o.items.length > 1) ? ` +${o.items.length - 1}` : ''}</p>}
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-slate-900">{formatPrice(Number(o.grandTotal ?? 0))}</td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-slate-100 text-slate-600">{o.paymentMethod}</span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${cfg.className}`}>{cfg.label}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {next ? (
                        <button
                          onClick={() => void advance(o)}
                          disabled={busyId === o.id}
                          className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                        >
                          {next.label} <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
