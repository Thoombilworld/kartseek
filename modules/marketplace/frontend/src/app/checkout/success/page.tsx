'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  CheckCircle,
  Package,
  ChevronRight,
  ArrowRight,
  Download,
  Truck,
  Home,
  Star,
} from 'lucide-react';
import { useRegion } from '@/lib/contexts/region-context';
import { getOrderById } from '@/lib/api/marketplace';

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutSuccessInner />
    </Suspense>
  );
}

function CheckoutSuccessInner() {
  const { formatCurrencyValue: fmt, formatDateValue } = useRegion();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId') ?? '';

  /**
   * The real order, when the caller names one.
   *
   * This page used to invent an order outright: a random `KS-2026-XXXXXX`
   * number, two hard-coded line items (an iPhone and a pair of Sony
   * headphones), a fixed total and "Credit Card ending 4521" — shown to
   * whoever landed here, no matter what they had actually bought. Nothing even
   * routed to it: the checkout flow renders its own confirmation inline with
   * the real order number, so this page was only reachable by typing the URL.
   *
   * It now shows a real order when given `?orderId=`, and says it has nothing
   * to show when it isn't, rather than manufacturing a receipt.
   */
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(Boolean(orderId));

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    getOrderById(orderId)
      .then((res: any) => {
        if (!cancelled) setOrder(res?.order ?? res?.data ?? res);
      })
      .catch(() => {
        /* fall through to the empty state */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        Loading your order…
      </div>
    );
  }

  // No order to confirm. Sending the customer to their order list is useful;
  // showing them a receipt for a purchase they did not make is not.
  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <Package className="w-8 h-8 text-slate-400" />
          </div>
          <h1 className="text-xl font-black text-slate-900 mb-2">No order to show</h1>
          <p className="text-slate-500 text-sm mb-7">
            {orderId
              ? 'We could not find that order on your account.'
              : 'This page confirms an order once one has been placed.'}
          </p>
          <div className="space-y-3">
            <Link
              href="/orders"
              className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors"
            >
              View your orders
            </Link>
            <Link
              href="/"
              className="block w-full border border-slate-200 text-slate-700 font-semibold py-3 rounded-xl hover:bg-slate-50 transition-colors text-sm"
            >
              Continue shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const items: any[] = Array.isArray(order.items) ? order.items : [];
  const view = {
    id: order.orderNumber ?? order.id ?? '—',
    date: order.createdAt ? formatDateValue(order.createdAt) : '—',
    estimatedDelivery: order.estimatedDelivery ? formatDateValue(order.estimatedDelivery) : '—',
    items: items.map((i: any) => ({
      title: i.productName ?? i.name ?? i.title ?? 'Item',
      qty: Number(i.quantity ?? i.qty ?? 1) || 1,
      price: Number(i.price ?? 0) || 0,
    })),
    subtotal: Number(order.subtotal ?? 0) || 0,
    shipping: Number(order.shippingFee ?? order.shipping ?? 0) || 0,
    tax: Number(order.tax ?? 0) || 0,
    total: Number(order.totalAmount ?? order.total ?? 0) || 0,
    paymentMethod: order.paymentMethod ?? '—',
    deliveryFee: Number(order.deliveryFee ?? 0) || 0,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50/30 to-blue-50/20">
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Success Icon */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-800 mb-1">Order Confirmed!</h1>
          <p className="text-slate-500">Thank you for shopping with KartSeek</p>
        </div>

        {/* Order Summary Card */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-5 py-3 flex items-center justify-between">
            <span className="text-white font-semibold text-sm flex items-center gap-2">
              <Package className="w-4 h-4" /> Order {view.id}
            </span>
            <span className="text-white/80 text-xs">{view.date}</span>
          </div>

          <div className="p-5 space-y-4">
            {/* Delivery estimate */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
              <Truck className="w-5 h-5 text-blue-600 shrink-0" />
              <div>
                <div className="text-sm font-semibold text-blue-800">Estimated Delivery</div>
                <div className="text-xs text-blue-600">{view.estimatedDelivery}</div>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-3">
              {view.items.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                      <Package className="w-5 h-5 text-slate-300" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800 line-clamp-1">
                        {item.title}
                      </p>
                      <p className="text-xs text-slate-400">Qty: {item.qty}</p>
                    </div>
                  </div>
                  <span className="font-bold text-sm text-slate-800">{fmt(item.price)}</span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t border-slate-200 pt-3 space-y-1.5">
              <div className="flex justify-between text-sm text-slate-500">
                <span>Subtotal</span>
                <span>{fmt(view.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-green-600">
                <span>Delivery</span>
                <span>{view.deliveryFee > 0 ? fmt(view.deliveryFee) : 'FREE'}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-slate-800 pt-2 border-t border-slate-200">
                <span>Total</span>
                <span>{fmt(view.total)}</span>
              </div>
            </div>

            {/* Payment */}
            <div className="text-xs text-slate-400">
              {String(view.paymentMethod).toUpperCase() === 'COD'
                ? `Pay ${fmt(view.total)} in cash on delivery`
                : `Paid via ${view.paymentMethod}`}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Link
            href="/orders"
            className="px-6 py-3.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-md"
          >
            <Package className="w-5 h-5" /> Track Your Order
          </Link>
          <Link
            href="/"
            className="px-6 py-3.5 bg-white text-slate-700 border border-slate-200 rounded-xl font-semibold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" /> Continue Shopping
          </Link>
          {/* Was a handler-less <button>. The invoice route already exists and
              is keyed by order id, which this page now actually has. */}
          <Link
            href={`/orders/${order.id}/invoice`}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center justify-center gap-1"
          >
            <Download className="w-4 h-4" /> Download Invoice
          </Link>
        </div>

        {/* Rate experience */}
        <div className="mt-8 bg-white border border-slate-200 rounded-xl p-5 text-center">
          <h3 className="font-semibold text-slate-800 mb-2">Rate your checkout experience</h3>
          <div className="flex justify-center gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <button key={s} className="p-1 hover:scale-110 transition-transform">
                <Star className="w-7 h-7 text-slate-200 hover:text-amber-400 hover:fill-amber-400 transition-colors" />
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400">Your feedback helps us improve</p>
        </div>
      </div>
    </div>
  );
}
