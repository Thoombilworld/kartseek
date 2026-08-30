'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Package, Clock, CheckCircle, Truck, MapPin, Phone, MessageSquare, RefreshCw, Copy, Star, Navigation, ShoppingCart } from 'lucide-react';
import { groceryApi } from '@/lib/grocery-api';
import { useRouter } from 'next/navigation';
import { AuthGate } from '@/components/shared/auth-gate';
import { useAuth } from '@/lib/contexts/auth-context';
import { useGroceryCart } from '@/lib/contexts/grocery-cart-context';
import { useGroceryLocale } from '@/i18n/grocery-locale';

// ── Order lifecycle stages ──────────────────────────────────────────────
const STAGES = [
  { key: 'placed', label: 'Order Placed', icon: Package },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
  { key: 'packing', label: 'Packing', icon: Package },
  { key: 'out-for-delivery', label: 'Out for Delivery', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle },
];

// ── Fallback demo data ──────────────────────────────────────────────────
const DEMO_ORDER = {
  id: 'KSG-2024-001',
  date: '12 Jun 2025, 3:45 PM',
  status: 'out-for-delivery',
  statusLabel: 'Out for Delivery',
  storeName: 'Green Basket Veggies',
  storeEmoji: '🥬',
  storeId: 'store-green-basket',
  items: [
    { name: 'Fresh Tomatoes', weight: '1 kg', qty: 2, price: 42, image: '🍅' },
    { name: 'Robusta Bananas', weight: '1 dozen', qty: 1, price: 49, image: '🍌' },
    { name: 'Green Capsicum', weight: '500 g', qty: 1, price: 30, image: '🫑' },
    { name: 'Fresh Coriander', weight: '100 g', qty: 2, price: 12, image: '🌿' },
  ],
  subtotal: 175,
  deliveryFee: 25,
  discount: 15,
  total: 185,
  paymentMethod: 'UPI (Google Pay)',
  deliveryAddress: '402, Lotus Residency, Sector 15, Gurgaon, Haryana 122001',
  estimatedDelivery: '3:45 PM — 4:15 PM',
  deliveryPartner: {
    name: 'Raj Kumar',
    phone: '+91 98765 43210',
    vehicle: 'Bike · HR26AB1234',
    rating: 4.8,
  },
};

export default function OrderDetailPage() {
  return (
    <AuthGate reason="Sign in to view this order.">
      <OrderDetailContent />
    </AuthGate>
  );
}

function OrderDetailContent() {
  const { formatPrice, tr } = useGroceryLocale();
  const params = useParams();
  const orderId = params.id as string;
  const { user } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reordering, setReordering] = useState(false);
  const [reorderError, setReorderError] = useState<string | null>(null);
  const [trackingData, setTrackingData] = useState<any>(null);
  const { add: addToCart, clear: clearCart, storeId: cartStoreId } = useGroceryCart();
  const router = useRouter();

  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    // A failed lookup used to fall through to `DEMO_ORDER` with the requested id
    // pasted on, so a mistyped or someone else's order id rendered a complete,
    // convincing order — items, address, total — that did not exist.
    async function loadOrder() {
      try {
        setOrder(await groceryApi.getOrderById(orderId));
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : 'Could not load this order');
      }
    }
    loadOrder().finally(() => setLoading(false));
  }, [orderId]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/3" />
          <div className="h-32 bg-slate-100 rounded-xl" />
          <div className="h-48 bg-slate-100 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!order) return null;

  const currentStageIdx = STAGES.findIndex(s => s.key === order.status);

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-5">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Link href="/orders" className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-slate-900">Order #{order.id}</h1>
          <p className="text-xs text-slate-500">{order.date}</p>
        </div>
        <button onClick={() => { navigator.clipboard.writeText(order.id); }} className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors" title={tr('Copy Order ID')}>
          <Copy className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      {/* ── Order Status Timeline ──────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-800 mb-4">{tr('Order Status')}</h2>
        <div className="relative">
          {STAGES.map((stage, i) => {
            const Icon = stage.icon;
            const isComplete = i <= currentStageIdx;
            const isCurrent = i === currentStageIdx;
            return (
              <div key={stage.key} className="flex items-start gap-3 relative">
                {/* Vertical line */}
                {i < STAGES.length - 1 && (
                  <div className={`absolute left-[15px] top-8 w-0.5 h-8 ${i < currentStageIdx ? 'bg-green-500' : 'bg-slate-200'}`} />
                )}
                {/* Icon */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  isCurrent ? 'bg-green-500 text-white ring-4 ring-green-100' :
                  isComplete ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                {/* Label */}
                <div className={`pb-8 ${isCurrent ? '' : ''}`}>
                  <p className={`text-sm font-bold ${isComplete ? 'text-slate-900' : 'text-slate-400'}`}>{stage.label}</p>
                  {isCurrent && <p className="text-xs text-green-600 font-medium mt-0.5">{tr('In progress')}</p>}
                </div>
              </div>
            );
          })}
        </div>
        {order.estimatedDelivery && (
          <div className="flex items-center gap-2 mt-1 pt-3 border-t border-slate-100">
            <Clock className="w-4 h-4 text-green-600" />
            <span className="text-sm font-semibold text-slate-700">ETA: {order.estimatedDelivery}</span>
          </div>
        )}
      </div>

      {/* ── Items ──────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-800 mb-3">{order.storeEmoji} {order.storeName}</h2>
        <div className="divide-y divide-slate-100">
          {order.items.map((item: any, i: number) => (
            <div key={i} className="flex items-center gap-3 py-3">
              <span className="text-2xl w-10 text-center">{item.image || '📦'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{item.name}</p>
                <p className="text-xs text-slate-500">{item.weight} × {item.qty}</p>
              </div>
              <p className="text-sm font-bold text-slate-900">{formatPrice(item.price * item.qty)}</p>
            </div>
          ))}
        </div>

        {/* Price Breakdown */}
        <div className="mt-3 pt-3 border-t border-slate-200 space-y-1.5">
          <div className="flex justify-between text-sm text-slate-500">
            <span>{tr('Subtotal')}</span>
            <span>{formatPrice(order.subtotal || order.total)}</span>
          </div>
          {order.deliveryFee != null && (
            <div className="flex justify-between text-sm text-slate-500">
              <span>{tr('Delivery Fee')}</span>
              <span>{order.deliveryFee === 0 ? <span className="text-green-600 font-bold">{tr('FREE')}</span> : formatPrice(order.deliveryFee)}</span>
            </div>
          )}
          {order.discount > 0 && (
            <div className="flex justify-between text-sm text-green-600 font-semibold">
              <span>{tr('Discount')}</span>
              <span>−{formatPrice(order.discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-dashed border-slate-200">
            <span>{tr('Total')}</span>
            <span>{formatPrice(order.total)}</span>
          </div>
        </div>
      </div>

      {/* ── Delivery Partner ───────────────────────────────────────────── */}
      {order.deliveryPartner && order.status !== 'delivered' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-800 mb-3">{tr('Delivery Partner')}</h2>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-xl">🛵</div>
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-900">{order.deliveryPartner.name}</p>
              <p className="text-xs text-slate-500">{order.deliveryPartner.vehicle}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span className="text-xs font-bold text-slate-700">{order.deliveryPartner.rating}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => window.open(`tel:${order.deliveryPartner.phone}`)} className="w-10 h-10 bg-green-50 border border-green-200 rounded-xl flex items-center justify-center hover:bg-green-100 transition-colors" title={tr('Call delivery partner')}>
                <Phone className="w-4 h-4 text-green-700" />
              </button>
              <button onClick={() => window.location.href = '/grocery/help'} className="w-10 h-10 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-colors" title={tr('Chat with delivery partner')}>
                <MessageSquare className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delivery Address ───────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-800 mb-2">{tr('Delivery Address')}</h2>
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
          <p className="text-sm text-slate-600">{order.deliveryAddress || '402, Lotus Residency, Sector 15, Gurgaon'}</p>
        </div>
      </div>

      {/* ── Payment ────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-800 mb-2">{tr('Payment')}</h2>
        <p className="text-sm text-slate-600">{order.paymentMethod || 'Cash on Delivery'}</p>
      </div>

      {/* ── Live Tracking ────────────────────────────────────────────── */}
      {order.status !== 'delivered' && order.status !== 'cancelled' && (
        <div className="bg-linear-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Navigation className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-bold text-blue-900">{tr('Live Tracking')}</h2>
            <span className="ml-auto text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full animate-pulse">● Live</span>
          </div>
          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 text-center">
            <div className="text-4xl mb-2">🗺️</div>
            <p className="text-sm text-blue-800 font-medium">{tr('Delivery partner is on the way')}</p>
            <p className="text-xs text-blue-600 mt-1">Estimated arrival: {order.estimatedDelivery || '15-20 min'}</p>
          </div>
        </div>
      )}

      {/* ── Action Buttons ─────────────────────────────────────────────── */}
      <div className="flex gap-3">
        <button
          onClick={async () => {
            setReordering(true);
            try {
              // `'demo-customer'` never matched, so the lookup 404'd every time and
              // the catch quietly redirected to a hardcoded store instead.
              if (!user?.id) return;
              const result = await groceryApi.reorderFromHistory(orderId, user.id);
              if (result?.items?.length) {
                // Rebuild the basket from what the service says is still buyable —
                // it re-prices each line and drops anything delisted.
                const storeId = result.storeId;
                if (cartStoreId && cartStoreId !== storeId) clearCart();
                for (const item of result.items) {
                  addToCart({
                    productId: item.productId,
                    weight: item.weight,
                    name: item.name,
                    price: Number(item.price),
                    quantity: Number(item.quantity),
                    storeId,
                    storeName: order.store?.name ?? order.storeName ?? 'Store',
                  });
                }
                router.push('/cart');
              } else {
                setReorderError(
                  result?.unavailable?.length
                    ? 'None of the items from this order are available right now.'
                    : 'Nothing from this order could be added to your basket.',
                );
              }
            } catch (e) {
              setReorderError(e instanceof Error ? e.message : 'Could not reorder — please try again.');
            } finally {
              setReordering(false);
            }
          }}
          disabled={reordering}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm transition-colors disabled:opacity-50"
        >
          {reordering ? (
            <><RefreshCw className="w-4 h-4 animate-spin" />{tr('Reordering...')}</>
          ) : (
            <><ShoppingCart className="w-4 h-4" />{tr('Reorder')}</>
          )}
        </button>
        <Link href="/orders" className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors">{tr('Back to Orders')}</Link>
      </div>
    </div>
  );
}
