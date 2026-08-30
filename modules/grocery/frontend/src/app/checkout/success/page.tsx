'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Package, Home, Clock, MapPin, Truck } from 'lucide-react';
import { useGroceryLocale } from '@/i18n/grocery-locale';
import { groceryApi } from '@/lib/grocery-api';

/**
 * Order confirmation.
 *
 * The page invented its own order number —
 * `KSG${Date.now().toString(36).toUpperCase().slice(-6)}` — so the reference a
 * customer wrote down or quoted to support belonged to no order, and a refresh
 * produced a different one. Everything else was fixed text too: a delivery
 * address in Bandra West, a 15–30 minute ETA and a timeline pinned to
 * "Confirmed", all shown regardless of what was actually placed.
 *
 * The checkout now passes `?orderId=`, and this reads the real order.
 */
export default function GroceryCheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="max-w-lg mx-auto px-4 py-12" aria-busy="true"><div className="h-64 bg-white border border-slate-200 rounded-xl animate-pulse" /></div>}>
      <SuccessContent />
    </Suspense>
  );
}

const TIMELINE = ['Placed', 'Confirmed', 'Packing', 'On the way', 'Delivered'] as const;
const STATUS_INDEX: Record<string, number> = {
  PLACED: 0, CONFIRMED: 1, PACKING: 2, READY_FOR_PICKUP: 2, OUT_FOR_DELIVERY: 3, DELIVERED: 4,
};

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const { formatPrice, config, tr } = useGroceryLocale();

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(!!orderId);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    groceryApi.getOrderById(orderId)
      .then((o) => { if (!cancelled) setOrder(o); })
      // The order was placed — the confirmation stands even if this read fails;
      // it just falls back to the generic copy below rather than inventing detail.
      .catch(() => undefined)
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [orderId]);

  const addr = order?.deliveryAddress;
  const deliveryAddress = [addr?.line1, addr?.line2, addr?.city, addr?.pincode].filter(Boolean).join(', ');
  const eta = order?.estimatedDeliveryAt ? new Date(order.estimatedDeliveryAt) : null;
  const stepIndex = STATUS_INDEX[order?.status] ?? 0;

  return (
    <div className="max-w-lg mx-auto px-4 py-12 text-center">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle className="w-10 h-10 text-green-600" />
      </div>

      <h1 className="text-2xl font-bold text-slate-900 mb-2">{tr('Order placed')}</h1>
      <p className="text-slate-500 mb-6">{tr('Thank you — your groceries are being prepared.')}</p>

      <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm text-left space-y-4 mb-6">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-slate-400 font-medium">{tr('Order number')}</span>
          <span className="text-sm font-bold text-slate-800">
            {loading ? '…' : order?.orderNumber ?? (orderId ? orderId.slice(0, 8) : 'Check your orders')}
          </span>
        </div>
        {order?.grandTotal != null && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-slate-400 font-medium">{tr('Total paid')}</span>
            <span className="text-sm font-bold text-slate-800">{formatPrice(Number(order.grandTotal))}</span>
          </div>
        )}
        <div className="border-t border-slate-100" />

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center shrink-0"><Clock className="w-4 h-4 text-blue-600" /></div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-700">{tr('Estimated delivery')}</p>
            <p className="text-xs text-slate-500">
              {eta ? eta.toLocaleString(undefined, { hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'short' }) : config.delivery.standardTime}
            </p>
          </div>
        </div>

        {deliveryAddress && (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center shrink-0"><MapPin className="w-4 h-4 text-green-600" /></div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-700">{tr('Delivery address')}</p>
              <p className="text-xs text-slate-500 truncate">{deliveryAddress}</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center shrink-0"><Package className="w-4 h-4 text-amber-600" /></div>
          <div>
            <p className="text-sm font-semibold text-slate-700">{tr('Order status')}</p>
            <p className="text-xs text-green-600 font-semibold capitalize">
              {(order?.status ?? 'PLACED').toLowerCase().replace(/_/g, ' ')}
            </p>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-3">
          <div className="flex items-center justify-between">
            {TIMELINE.map((step, i) => (
              <div key={step} className="flex flex-col items-center flex-1">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${i <= stepIndex ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                  {i <= stepIndex ? '✓' : i + 1}
                </div>
                <p className={`text-[9px] mt-1 font-medium ${i <= stepIndex ? 'text-green-600' : 'text-slate-400'}`}>{step}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {/* Deep-links to this order when we have it, rather than the whole list. */}
        <Link
          href={orderId ? `/orders/${orderId}/track` : '/orders'}
          className="inline-flex items-center justify-center gap-2 bg-green-600 text-white px-5 py-3 rounded-xl font-bold hover:bg-green-700 transition-colors text-sm"
        >
          <Truck className="w-4 h-4" />{tr('Track order')}</Link>
        <Link href="/" className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 px-5 py-3 rounded-xl font-bold hover:bg-slate-50 transition-colors text-sm">
          <Home className="w-4 h-4" />{tr('Continue shopping')}</Link>
      </div>
    </div>
  );
}
