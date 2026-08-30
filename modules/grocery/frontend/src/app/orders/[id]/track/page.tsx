'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, MapPin, Phone, Package, Truck, Check, Clock, ChefHat, User, AlertTriangle, XCircle } from 'lucide-react';
import { AuthGate } from '@/components/shared/auth-gate';
import { useGroceryLocale } from '@/i18n/grocery-locale';
import { groceryApi } from '@/lib/grocery-api';

/**
 * Live order tracking.
 *
 * Three separate fabrications here, all removed:
 *
 *  • `DELIVERY_PARTNER` — a rider called "Rahul K." with a **phone number**
 *    (+91 98765 43210), a vehicle registration, a 4.8 rating and 1,247 trips,
 *    shown for every order. The Call and Chat buttons dialled that number.
 *  • `TRACKING_STEPS` — five stages with fixed clock times (10:32, 10:38, …) and
 *    a hardcoded "current step 3", so every order was always out for delivery.
 *  • `ORDER_ITEMS` — four items belonging to no order.
 *
 * The partner block now renders only once delivery-service has actually assigned
 * someone. See the polling effect below for why the page no longer opens an
 * EventSource.
 */
export default function OrderTrackingPage() {
  return (
    <AuthGate reason="Sign in to track this order.">
      <TrackingContent />
    </AuthGate>
  );
}

/** The lifecycle, in order. `reached` is derived from the order's real status. */
const STAGES = [
  { key: 'PLACED',           label: 'Order Placed',     icon: Check,   desc: 'Your order has been placed' },
  { key: 'CONFIRMED',        label: 'Confirmed',        icon: Check,   desc: 'The store accepted your order' },
  { key: 'PACKING',          label: 'Packing',          icon: Package, desc: 'The store is packing your items' },
  { key: 'READY_FOR_PICKUP', label: 'Ready for Pickup', icon: ChefHat, desc: 'Packed and waiting for a rider' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: Truck,   desc: 'On the way to you' },
  { key: 'DELIVERED',        label: 'Delivered',        icon: MapPin,  desc: 'Order delivered' },
] as const;

interface Tracking {
  orderId: string;
  orderNumber: string;
  status: string;
  estimatedDeliveryAt?: string;
  deliveredAt?: string;
  storeName?: string | null;
  partnerName?: string | null;
  partnerPhone?: string | null;
  partnerLocation?: { lat: number; lng: number } | null;
  lastUpdated?: string;
}

function TrackingContent() {
  const params = useParams();
  const orderId = params.id as string;
  const { formatPrice, tr } = useGroceryLocale();

  const [tracking, setTracking] = useState<Tracking | null>(null);
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Initial load: the order for its lines and totals, plus one tracking read so
  // the page is populated before the first poll.
  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([groceryApi.getOrderById(orderId), groceryApi.getOrderTracking(orderId)])
      .then(([orderRes, trackRes]) => {
        if (cancelled) return;
        if (orderRes.status === 'fulfilled') setOrder(orderRes.value);
        if (trackRes.status === 'fulfilled') setTracking(trackRes.value as unknown as Tracking);
        if (orderRes.status === 'rejected' && trackRes.status === 'rejected') {
          setError('We could not load this order.');
        }
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [orderId]);

  const status = tracking?.status ?? order?.status ?? 'PLACED';

  /**
   * Live updates by polling.
   *
   * Not EventSource. The old page opened `new EventSource('/api/v1/grocery/orders/
   * <id>/tracking')`, which could not have worked for three separate reasons: the
   * gateway serves that path as plain JSON (the SSE handler lives on the service's
   * own port, which no browser reaches), EventSource cannot send an Authorization
   * header so the now-guarded route would reject it, and the URL was same-origin
   * while the gateway is not. Passing the token on the query string would fix the
   * second at the cost of writing a bearer token into every access log and
   * `Referer` header, which is not a trade worth making for a delivery ETA.
   *
   * Polling through the normal authenticated client is honest and adequate: order
   * status changes on the order of minutes, not milliseconds. The interval stops
   * once the order reaches a terminal state so a forgotten tab does not poll a
   * delivered order forever.
   */
  useEffect(() => {
    if (!orderId) return;
    const terminal = ['DELIVERED', 'CANCELLED', 'REFUNDED'];
    if (terminal.includes(status)) return;

    const timer = setInterval(() => {
      groceryApi.getOrderTracking(orderId)
        .then((t) => setTracking(t as unknown as Tracking))
        .catch(() => { /* transient — the next tick tries again */ });
    }, 15_000);
    return () => clearInterval(timer);
  }, [orderId, status]);

  const isCancelled = status === 'CANCELLED' || status === 'REFUNDED';
  const currentIndex = STAGES.findIndex((s) => s.key === status);
  const items: Array<{ name: string; quantity: number; price: number; weight?: string }> = order?.items ?? [];

  /**
   * The countdown ticks on its own.
   *
   * `Date.now()` read during render is impure — React may render at any moment or
   * not at all — and in practice it meant "arriving in about N min" only moved when
   * the 15-second poll happened to return. A minute-resolution clock in state gives
   * the render a stable value and makes the number actually count down.
   */
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const eta = tracking?.estimatedDeliveryAt ?? order?.estimatedDeliveryAt;
  const etaMinutes = eta ? Math.max(0, Math.round((new Date(eta).getTime() - now) / 60000)) : null;

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-4" aria-busy="true">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="h-64 bg-white border border-slate-200 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <AlertTriangle className="w-10 h-10 text-red-300 mx-auto mb-3" />
        <h1 className="text-xl font-bold text-slate-800 mb-1">{tr('Tracking unavailable')}</h1>
        <p className="text-sm text-slate-500 mb-6">{error}</p>
        <Link href="/orders" className="inline-flex items-center gap-1.5 bg-green-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-green-700">{tr('Back to orders')}</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <Link href={`/orders/${orderId}`} className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-700 text-sm font-medium mb-2 transition-colors">
            <ArrowLeft className="w-4 h-4" />{tr('Back to order')}</Link>
          <h1 className="text-xl font-black text-slate-900">{tr('Track order')}</h1>
          <p className="text-sm text-slate-500">
            {tracking?.orderNumber ?? order?.orderNumber ?? orderId}
            {tracking?.storeName ? ` • ${tracking.storeName}` : ''}
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* ETA */}
        <div className={`rounded-2xl p-5 text-white ${isCancelled ? 'bg-slate-500' : 'bg-gradient-to-r from-green-600 to-emerald-500'}`}>
          {isCancelled ? (
            <div className="flex items-center gap-3">
              <XCircle className="w-8 h-8" />
              <div>
                <p className="text-lg font-black">Order {status.toLowerCase()}</p>
                {order?.cancelReason && <p className="text-sm text-white/80">{order.cancelReason}</p>}
              </div>
            </div>
          ) : status === 'DELIVERED' ? (
            <div className="flex items-center gap-3">
              <Check className="w-8 h-8" />
              <div>
                <p className="text-lg font-black">{tr('Delivered')}</p>
                <p className="text-sm text-white/80">
                  {tracking?.deliveredAt ? new Date(tracking.deliveredAt).toLocaleString() : 'Your order arrived.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8" />
              <div>
                {/* Derived from the order's own estimate — the old page counted
                    down from a hardcoded 18 minutes on a one-per-minute timer,
                    regardless of the order. */}
                <p className="text-lg font-black">
                  {etaMinutes != null ? (etaMinutes > 0 ? `Arriving in about ${etaMinutes} min` : 'Arriving shortly') : 'Being prepared'}
                </p>
                <p className="text-sm text-white/80">{STAGES[Math.max(0, currentIndex)]?.desc ?? ''}</p>
              </div>
            </div>
          )}
        </div>

        {/* Stages */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <ol className="space-y-4">
            {STAGES.map((stage, i) => {
              const Icon = stage.icon;
              const reached = currentIndex >= i;
              const active = currentIndex === i;
              return (
                <li key={stage.key} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${reached ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-300'} ${active ? 'ring-4 ring-green-100' : ''}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    {i < STAGES.length - 1 && <div className={`w-px flex-1 my-1 ${reached ? 'bg-green-200' : 'bg-slate-200'}`} />}
                  </div>
                  <div className="pb-2">
                    <p className={`text-sm font-bold ${reached ? 'text-slate-900' : 'text-slate-400'}`}>{stage.label}</p>
                    <p className="text-xs text-slate-500">{stage.desc}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Delivery partner — only once one is actually assigned. */}
        {tracking?.partnerName ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{tr('Delivery partner')}</p>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-slate-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-slate-400" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-slate-800">{tracking.partnerName}</p>
                {tracking.lastUpdated && (
                  <p className="text-xs text-slate-400">Updated {new Date(tracking.lastUpdated).toLocaleTimeString()}</p>
                )}
              </div>
              {tracking.partnerPhone && (
                <a href={`tel:${tracking.partnerPhone}`} className="inline-flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700">
                  <Phone className="w-4 h-4" />{tr('Call')}</a>
              )}
            </div>
          </div>
        ) : !isCancelled && status !== 'DELIVERED' ? (
          <p className="text-sm text-slate-500 text-center py-2">
            A delivery partner has not been assigned yet.
          </p>
        ) : null}

        {/* Items */}
        {items.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              {items.length} item{items.length === 1 ? '' : 's'}
            </p>
            <ul className="divide-y divide-slate-100">
              {items.map((item, i) => (
                <li key={i} className="py-2 flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-700 truncate">
                    {item.quantity} × {item.name}
                    {item.weight && <span className="text-slate-400"> ({item.weight})</span>}
                  </span>
                  <span className="font-semibold text-slate-900 shrink-0">
                    {formatPrice(Number(item.price) * Number(item.quantity))}
                  </span>
                </li>
              ))}
            </ul>
            {order?.grandTotal != null && (
              <div className="flex justify-between pt-3 mt-1 border-t border-slate-200 font-black text-slate-900">
                <span>{tr('Total')}</span><span>{formatPrice(Number(order.grandTotal))}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
