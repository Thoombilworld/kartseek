'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Package, ChevronRight, Clock, CheckCircle, Truck, RefreshCw, MapPin, ShoppingBag } from 'lucide-react';
import { AuthGate } from '@/components/shared/auth-gate';
import { useAuth } from '@/lib/contexts/auth-context';
import { groceryApi } from '@/lib/grocery-api';
import { useAsyncData } from '@/lib/hooks/use-async-data';
import { useGroceryLocale, getGroceryLocaleTag } from '@/i18n/grocery-locale';

/**
 * The shape the mapper below produces, declared as a type.
 *
 * This was a four-order `DEMO_ORDERS` array — Green Basket Veggies, CoolDairy
 * Hub and two more, at rupee prices. It was once the page's initial state *and*
 * its error fallback, so a signed-out visitor, a failed request and a customer
 * with no orders all saw the same four purchases attributed to them. By the time
 * this ran it survived only so `typeof DEMO_ORDERS` could annotate the fetch —
 * but sixty lines of plausible order data in an orders file is one
 * `?? DEMO_ORDERS` away from being shown as somebody's history again.
 */
interface GroceryOrderRow {
  id: string;
  date: string;
  status: string;
  statusLabel: string;
  storeName: string;
  storeEmoji: string;
  storeId: string;
  items: Array<{ name: string; weight: string; qty: number; price: number }>;
  total: number;
}


const STATUS_MAP: Record<string, { label: string; key: string }> = {
  PLACED: { label: 'Placed', key: 'placed' },
  CONFIRMED: { label: 'Confirmed', key: 'confirmed' },
  PACKING: { label: 'Packing', key: 'packing' },
  READY_FOR_PICKUP: { label: 'Ready', key: 'packing' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', key: 'out-for-delivery' },
  DELIVERED: { label: 'Delivered', key: 'delivered' },
  CANCELLED: { label: 'Cancelled', key: 'placed' },
};

const statusConfig: Record<string, { icon: any; color: string; bg: string }> = {
  placed: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
  confirmed: { icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
  packing: { icon: Package, color: 'text-purple-600', bg: 'bg-purple-50' },
  'out-for-delivery': { icon: Truck, color: 'text-orange-600', bg: 'bg-orange-50' },
  delivered: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
};

export default function GroceryOrdersPage() {
  return (
    <AuthGate reason="Sign in to see your grocery orders.">
      <GroceryOrdersContent />
    </AuthGate>
  );
}

function GroceryOrdersContent() {
  const { formatPrice, country, tr } = useGroceryLocale();
  const { user } = useAuth();
  // `getCustomerOrders('current-user')` asked the gateway for the order history
  // of a customer literally named "current-user" — the ResourceOwnershipGuard
  // refused it, the catch swallowed the 403, and every customer saw the same two
  // demo orders as if they were their own.
  //
  // Gated on the user id rather than returning early inside the effect, so
  // signing in resolves the list instead of leaving it stuck on its first
  // loading state.
  const { data: ordersData, loading, error } = useAsyncData<GroceryOrderRow[]>(
    async () => {
      const res = await groceryApi.getCustomerOrders(user!.id);
      return (res.data ?? []).map((o: any) => {
        const sm = STATUS_MAP[o.status] ?? STATUS_MAP.PLACED;
        return {
          id: o.orderNumber ?? o.id,
          date: new Date(o.createdAt).toLocaleString(getGroceryLocaleTag(country), { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }),
          status: sm.key,
          statusLabel: sm.label,
          storeName: o.storeName ?? 'Store',
          storeEmoji: '🛒',
          storeId: o.storeId ?? 'fresh-mart',
          items: (o.items ?? []).map((it: any) => ({ name: it.name, weight: it.weight ?? '—', qty: it.quantity, price: it.price })),
          total: Number(o.grandTotal ?? o.total ?? 0),
        };
      });
    },
    [user?.id],
    { enabled: !!user?.id },
  );
  const orders = error ? [] : (ordersData ?? []);

  return (
    <div className="max-w-4xl 3xl:max-w-5xl mx-auto px-2 2xs:px-3 xs:px-4 md:px-6 xl:px-8 py-4 xs:py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="w-11 h-11 -ml-2 flex items-center justify-center text-slate-500 hover:text-green-600 transition-colors" aria-label={tr('Back')}>
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900">{tr('Order History')}</h1>
          <p className="text-sm text-slate-500">
            {loading ? 'Loading…' : `${orders.length} ${orders.length === 1 ? 'order' : 'orders'}`}
          </p>
        </div>
      </div>

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3" aria-busy="true">
            <div className="h-32 bg-white border border-slate-200 rounded-xl animate-pulse" />
            <div className="h-32 bg-white border border-slate-200 rounded-xl animate-pulse" />
          </div>
        ) : orders.length === 0 && !error ? (
          <div className="text-center py-16">
            <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-600 mb-1">{tr('No orders yet')}</h3>
            <p className="text-sm text-slate-400 mb-4">{tr('Start shopping to see your orders here')}</p>
            <Link href="/" className="inline-block bg-green-600 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-green-700 transition-colors">{tr('Browse Grocery')}</Link>
          </div>
        ) : orders.map(order => {
          const config = statusConfig[order.status] || statusConfig.placed;
          const StatusIcon = config.icon;

          return (
            <div key={order.id} className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              {/* Order Header */}
              <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{order.storeEmoji}</span>
                  <div>
                    <h3 className="font-bold text-sm text-slate-800">{order.storeName}</h3>
                    <p className="text-[10px] text-slate-400">{order.date} • {order.id}</p>
                  </div>
                </div>
                <div className={`flex items-center gap-1 ${config.bg} ${config.color} text-xs font-bold px-2 py-1 rounded-full`}>
                  <StatusIcon className="w-3 h-3" />
                  {order.statusLabel}
                </div>
              </div>

              {/* Items */}
              <div className="px-4 py-3">
                <div className="text-xs text-slate-500 space-y-1">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between">
                      <span>{item.name} ({item.weight}) × {item.qty}</span>
                      <span className="font-medium text-slate-700">{formatPrice(item.price * item.qty)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="px-4 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                <div className="text-sm">
                  <span className="text-slate-500">{tr('Total:')}</span>
                  <span className="font-bold text-slate-900">{formatPrice(order.total)}</span>
                </div>
                <div className="flex items-center gap-2">
                  {order.status === 'delivered' && (
                    <button onClick={() => window.location.href = `/grocery/store/${order.storeId || 'fresh-mart'}`} className="text-green-600 text-xs font-semibold hover:underline flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" />{tr('Reorder')}</button>
                  )}
                  <button onClick={() => window.location.href = `/grocery/orders/${order.id}`} className="text-slate-500 text-xs font-medium hover:text-green-600 flex items-center gap-0.5">{tr('Details')}<ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
