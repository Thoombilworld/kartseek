'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Package, ChevronRight, Search, ShoppingBag, AlertCircle, RefreshCw, FileText, MapPin,
} from 'lucide-react';
import { useRegion } from '@/lib/contexts/region-context';
import { getOrders } from '@/lib/api/marketplace';
import { formatDate } from '@/lib/utils';
import {
  ORDER_FILTERS, ORDER_STATUS_UI, normaliseOrderStatus,
  isCancellable, isReturnable,
  type OrderFilterKey, type OrderStatus,
} from '@/lib/marketplace/order-status';

/** One line on an order, after the wire payload's field names are reconciled. */
interface OrderLine {
  name: string;
  quantity: number;
  price: number;
  productId?: string;
}

interface CustomerOrder {
  /** The human-readable reference — also what order routes are keyed by. */
  id: string;
  placedAt: string | null;
  status: OrderStatus;
  items: OrderLine[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  estimatedDeliveryAt: string | null;
  paymentMethod: string | null;
}

/**
 * Reconcile one order from the gateway.
 *
 * The field names differ from what this page used to read on three counts, and
 * each one failed silently: the date is `placedAt` (not `createdAt`, so every
 * card printed "Invalid Date"), line quantity is `quantity` (not `qty`, so
 * "Qty:" rendered with nothing after it), and status arrives SCREAMING_CASE
 * from order-service (so `PENDING` matched none of the five lower-case buckets
 * and the badge came out blank). Aliases are kept for the seller projection and
 * older payloads, which spell two of the three differently again.
 */
function toCustomerOrder(o: Record<string, any>): CustomerOrder {
  const items: OrderLine[] = Array.isArray(o.items) ? o.items.map((i: Record<string, any>) => ({
    name: i.name ?? i.productName ?? 'Item',
    quantity: Number(i.quantity ?? i.qty ?? 1),
    price: Number(i.price ?? i.unitPrice ?? 0),
    productId: i.productId ?? i.product_id,
  })) : [];

  const subtotal = Number(o.subtotal ?? items.reduce((s, i) => s + i.price * i.quantity, 0));

  return {
    id: o.orderNumber ?? o.id,
    placedAt: o.placedAt ?? o.createdAt ?? o.orderDate ?? null,
    status: normaliseOrderStatus(o.status),
    items,
    subtotal,
    deliveryFee: Number(o.deliveryFee ?? 0),
    total: Number(o.totalAmount ?? o.total ?? subtotal),
    estimatedDeliveryAt: o.estimatedDeliveryAt ?? o.expectedDeliveryAt ?? null,
    paymentMethod: o.paymentMethod ?? null,
  };
}

function OrderCardSkeleton() {
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden animate-pulse">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/50">
        <div className="h-3 w-40 bg-slate-200 rounded-sm" />
        <div className="h-5 w-20 bg-slate-200 rounded-sm" />
      </div>
      <div className="px-5 py-4 flex items-center gap-3">
        <div className="w-12 h-12 bg-slate-200 rounded-md" />
        <div className="space-y-2 flex-1">
          <div className="h-3 w-1/2 bg-slate-200 rounded-sm" />
          <div className="h-3 w-16 bg-slate-200 rounded-sm" />
        </div>
      </div>
      <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/30">
        <div className="h-3 w-32 bg-slate-200 rounded-sm ml-auto" />
      </div>
    </div>
  );
}

export default function MyOrdersPage() {
  const { formatCurrencyValue: formatPrice } = useRegion();
  const [filter, setFilter] = useState<OrderFilterKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // `api.get` unwraps the gateway envelope, so the rows sit at `res.data`
      // and the count at `res.total`.
      const res = await getOrders({ limit: '50' });
      const rows: Record<string, any>[] = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setOrders(rows.map(toCustomerOrder));
    } catch (e) {
      // No demo fallback. This page used to swap in seven fabricated orders
      // whenever the call failed, which made a dead orders API look like a
      // healthy account and hid the outage from everyone who could fix it.
      setError(e instanceof Error ? e.message : 'Could not load your orders.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const counts = useMemo(() => {
    const out = {} as Record<OrderFilterKey, number>;
    for (const f of ORDER_FILTERS) out[f.key] = orders.filter((o) => f.match(o.status)).length;
    return out;
  }, [orders]);

  const filtered = useMemo(() => {
    const active = ORDER_FILTERS.find((f) => f.key === filter) ?? ORDER_FILTERS[0];
    const q = searchQuery.trim().toLowerCase();
    return orders.filter((o) => {
      if (!active.match(o.status)) return false;
      if (!q) return true;
      return o.id.toLowerCase().includes(q) || o.items.some((i) => i.name.toLowerCase().includes(q));
    });
  }, [orders, filter, searchQuery]);

  return (
    <div className="max-w-5xl mx-auto px-3 xs:px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">My Orders</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {loading ? 'Loading your orders…'
              : `${orders.length} ${orders.length === 1 ? 'order' : 'orders'} placed`}
          </p>
        </div>
        <Link
          href="/marketplace"
          className="text-sm text-blue-600 hover:underline font-semibold flex items-center gap-1 shrink-0 min-h-[44px] px-2 -mr-2"
        >
          <ShoppingBag className="w-4 h-4" /> Continue Shopping
        </Link>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search orders by ID or product name..."
            aria-label="Search orders"
            /* 16px below `sm`, or iOS Safari zooms on focus and stays zoomed. */
            className="w-full pl-9 pr-4 py-2.5 min-h-[44px] text-base md:text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto hide-scrollbar" role="tablist" aria-label="Filter orders by status">
          {ORDER_FILTERS.map((f) => (
            <button
              key={f.key}
              role="tab"
              aria-selected={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-2 min-h-[44px] text-xs font-bold rounded-lg whitespace-nowrap border transition-colors ${
                filter === f.key
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
              }`}
            >
              {f.label}
              {!loading && counts[f.key] > 0 && (
                <span className={filter === f.key ? 'ml-1.5 text-blue-100' : 'ml-1.5 text-slate-400'}>
                  {counts[f.key]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="space-y-4" aria-busy="true">
          {[0, 1, 2].map((i) => <OrderCardSkeleton key={i} />)}
        </div>
      ) : error ? (
        <div className="text-center py-16 border border-red-100 bg-red-50/40 rounded-lg">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800">We couldn&rsquo;t load your orders</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">{error}</p>
          <button
            onClick={() => void load()}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-bold hover:bg-slate-800"
          >
            <RefreshCw className="w-4 h-4" /> Try again
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-700">
            {orders.length === 0 ? 'No orders yet' : 'No orders match this view'}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            {orders.length === 0
              ? 'Once you place an order it will show up here.'
              : 'Try a different status filter or clear your search.'}
          </p>
          {orders.length === 0 && (
            <Link
              href="/marketplace"
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700"
            >
              <ShoppingBag className="w-4 h-4" /> Start shopping
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((order) => {
            const ui = ORDER_STATUS_UI[order.status];
            const itemCount = order.items.reduce((n, i) => n + i.quantity, 0);
            return (
              <div
                key={order.id}
                className="bg-white border border-slate-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all duration-200"
              >
                {/* Order Header */}
                <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 min-w-0">
                    <span className="text-xs font-mono text-slate-500 truncate">{order.id}</span>
                    <span className="text-xs text-slate-400">Ordered on {formatDate(order.placedAt)}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-sm border whitespace-nowrap ${ui.badgeClass}`}>
                    {ui.label}
                  </span>
                </div>

                {/* Order Items */}
                <Link href={`/marketplace/orders/${order.id}`} className="block px-5 py-3 space-y-2">
                  {order.items.map((item, idx) => (
                    <div key={item.productId ?? idx} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 bg-slate-100 rounded-md flex items-center justify-center shrink-0">
                          <Package className="w-5 h-5 text-slate-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 line-clamp-1">{item.name}</p>
                          <p className="text-xs text-slate-500">
                            Qty: {item.quantity}
                            {item.quantity > 1 && <> · {formatPrice(item.price)} each</>}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-slate-900 whitespace-nowrap">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                  ))}
                  {order.items.length === 0 && (
                    <p className="text-xs text-slate-400 italic">This order has no line items recorded.</p>
                  )}
                </Link>

                {/* Order Footer */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-t border-slate-100 bg-slate-50/30">
                  <div className="flex items-center gap-3 text-xs">
                    <Link
                      href={`/marketplace/orders/${order.id}`}
                      className="font-bold text-blue-600 hover:underline flex items-center gap-1 min-h-[44px] px-1"
                    >
                      View details <ChevronRight className="w-3 h-3" />
                    </Link>
                    {!ui.terminal && (
                      <Link
                        href={`/marketplace/orders/${order.id}/tracking`}
                        className="font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 min-h-[44px] px-1"
                      >
                        <MapPin className="w-3 h-3" /> Track
                      </Link>
                    )}
                    {order.status === 'delivered' && (
                      <Link
                        href={`/marketplace/orders/${order.id}/invoice`}
                        className="font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 min-h-[44px] px-1"
                      >
                        <FileText className="w-3 h-3" /> Invoice
                      </Link>
                    )}
                    {isReturnable(order.status) && (
                      <Link href="/marketplace/returns/new" className="font-bold text-violet-600 hover:underline inline-flex items-center min-h-[44px] px-1">
                        Return
                      </Link>
                    )}
                    {isCancellable(order.status) && (
                      <Link href={`/marketplace/orders/${order.id}`} className="font-bold text-red-600 hover:underline inline-flex items-center min-h-[44px] px-1">
                        Cancel
                      </Link>
                    )}
                  </div>
                  <div className="text-right ml-auto">
                    {order.estimatedDeliveryAt && !ui.terminal && (
                      <p className="text-[11px] text-slate-500">
                        Arriving by {formatDate(order.estimatedDeliveryAt)}
                      </p>
                    )}
                    <p className="text-sm font-black text-slate-900">
                      Total: {formatPrice(order.total)}
                      <span className="ml-1.5 text-[11px] font-medium text-slate-400">
                        ({itemCount} {itemCount === 1 ? 'item' : 'items'})
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
