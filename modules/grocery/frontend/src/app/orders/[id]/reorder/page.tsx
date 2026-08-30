'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, RotateCw, Plus, Minus, ShoppingCart, AlertTriangle, Check } from 'lucide-react';
import { AuthGate } from '@/components/shared/auth-gate';
import { useGroceryLocale } from '@/i18n/grocery-locale';
import { useAuth } from '@/lib/contexts/auth-context';
import { groceryApi } from '@/lib/grocery-api';
import { useGroceryCart } from '@/lib/contexts/grocery-cart-context';

/**
 * Reorder a past order.
 *
 * The page showed five items written into the file — the same bananas, butter and
 * milk regardless of which order you opened — and its "Add to cart" called
 * `reorderFromHistory(orderId, 'demo-customer')`, discarded both the result and the
 * error, then waited 1.5 seconds and navigated to a basket nothing had been added
 * to. It now loads the real order's lines and puts the selected ones in the basket.
 */
export default function ReorderPage() {
  return (
    <AuthGate reason="Sign in to reorder from your order history.">
      <ReorderPageContent />
    </AuthGate>
  );
}

interface ReorderLine {
  productId: string;
  name: string;
  weight: string;
  price: number;
  previousPrice: number;
  priceChanged: boolean;
  quantity: number;
  selected: boolean;
}

function ReorderPageContent() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const { user } = useAuth();
  const { formatPrice, tr } = useGroceryLocale();
  const { add, clear, storeId: cartStoreId } = useGroceryCart();

  const [lines, setLines] = useState<ReorderLine[]>([]);
  const [unavailable, setUnavailable] = useState<Array<{ productId: string; name: string; reason: string }>>([]);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    groceryApi.reorderFromHistory(orderId, user.id)
      .then((res) => {
        if (cancelled) return;
        setStoreId(res.storeId);
        setUnavailable(res.unavailable ?? []);
        setLines((res.items ?? []).map((i) => ({
          productId: i.productId,
          name: i.name,
          weight: i.weight,
          price: Number(i.price),
          previousPrice: Number(i.previousPrice),
          priceChanged: !!i.priceChanged,
          quantity: Number(i.quantity) || 1,
          selected: true,
        })));
      })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load this order'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [orderId, user?.id]);

  const updateQty = (productId: string, delta: number) =>
    setLines((prev) => prev.map((l) => l.productId === productId ? { ...l, quantity: Math.max(1, l.quantity + delta) } : l));

  const toggleLine = (productId: string) =>
    setLines((prev) => prev.map((l) => l.productId === productId ? { ...l, selected: !l.selected } : l));

  const selected = lines.filter((l) => l.selected);
  const total = selected.reduce((sum, l) => sum + l.price * l.quantity, 0);

  const handleAddToCart = () => {
    if (!selected.length || !storeId) return;
    setAdding(true);
    // A reorder is from one store, so a basket belonging to a different store has
    // to go — the order API takes exactly one storeId.
    if (cartStoreId && cartStoreId !== storeId) clear();
    for (const line of selected) {
      add({
        productId: line.productId,
        weight: line.weight,
        name: line.name,
        price: line.price,
        quantity: line.quantity,
        storeId,
        storeName: 'Your store',
      });
    }
    router.push('/grocery/cart');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link href={`/grocery/orders/${orderId}`} className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-700 text-sm font-medium mb-2 transition-colors">
            <ArrowLeft className="w-4 h-4" />{tr('Back to Order')}</Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <RotateCw className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">{tr('Reorder')}</h1>
              <p className="text-sm text-slate-500">From order {orderId}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {error && (
          <div role="alert" className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> <p>{error}</p>
          </div>
        )}

        {loading && (
          <div className="space-y-3" aria-busy="true">
            <div className="h-20 bg-white border border-slate-200 rounded-xl animate-pulse" />
            <div className="h-20 bg-white border border-slate-200 rounded-xl animate-pulse" />
          </div>
        )}

        {!loading && !error && lines.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
            <ShoppingCart className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h2 className="font-bold text-slate-800 mb-1">{tr('Nothing to reorder')}</h2>
            <p className="text-sm text-slate-500">None of the items from this order are available right now.</p>
          </div>
        )}

        {lines.map((line) => (
          <div key={line.productId} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4">
            <button
              onClick={() => toggleLine(line.productId)}
              role="checkbox"
              aria-checked={line.selected}
              aria-label={`${line.selected ? 'Deselect' : 'Select'} ${line.name}`}
              className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${line.selected ? 'bg-green-600 border-green-600' : 'border-slate-300'}`}
            >
              {line.selected && <Check className="w-4 h-4 text-white" />}
            </button>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800 text-sm truncate">{line.name}</p>
              <p className="text-xs text-slate-500">{line.weight}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-bold text-sm text-slate-900">{formatPrice(line.price)}</span>
                {/* Prices move between orders — say so rather than quietly charging
                    the new one. */}
                {line.priceChanged && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${line.price > line.previousPrice ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                    was {formatPrice(line.previousPrice)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 border border-slate-200 rounded-lg overflow-hidden shrink-0">
              <button onClick={() => updateQty(line.productId, -1)} className="px-2.5 py-2 hover:bg-slate-50" aria-label={`Decrease ${line.name}`}><Minus className="w-3.5 h-3.5" /></button>
              <span className="px-2 text-sm font-bold min-w-[28px] text-center">{line.quantity}</span>
              <button onClick={() => updateQty(line.productId, 1)} className="px-2.5 py-2 hover:bg-slate-50" aria-label={`Increase ${line.name}`}><Plus className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}

        {unavailable.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm font-bold text-amber-800 mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> {unavailable.length} item{unavailable.length > 1 ? 's' : ''} unavailable
            </p>
            <ul className="text-xs text-amber-700 space-y-0.5">
              {unavailable.map((u) => <li key={u.productId}>{u.name} — {u.reason}</li>)}
            </ul>
          </div>
        )}

        {/* Offset by the nav's height as well as its own 1rem inset. A sticky
            element sticks relative to the scrollport, so a bare `bottom-4` put
            this "Add N items to Cart" button 16px from the viewport bottom —
            inside the 61px the mobile nav occupies — for the whole of the
            scroll, clearing it only once the container's own end came into view.
            `--grocery-nav-height` is 0 above 767px, where there is no nav, so
            the desktop inset is unchanged. */}
        {lines.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 sticky bottom-[calc(1rem+var(--grocery-nav-height,0px))] shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-600">{selected.length} of {lines.length} selected</span>
              <span className="text-lg font-black text-slate-900">{formatPrice(total)}</span>
            </div>
            <button
              onClick={handleAddToCart}
              disabled={!selected.length || adding}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" /> Add {selected.length} item{selected.length === 1 ? '' : 's'} to Cart
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
