'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Minus, Plus, Trash2, ArrowRight, ArrowLeft, Tag, AlertTriangle, Truck, ChevronRight, Store } from 'lucide-react';
import { useGroceryLocale } from '@/i18n/grocery-locale';
import { useGroceryCart } from '@/lib/contexts/grocery-cart-context';
import { groceryOrderTotals } from '@/lib/grocery-totals';
import { applyGroceryCoupon, GROCERY_COUPONS } from '@/lib/grocery-coupons';
import { ProductThumb, THUMB_SIZES } from '@/components/marketplace/product-thumb';
import { storePath } from '@/lib/grocery/urls';

/**
 * Grocery basket.
 *
 * Previously `useState(INITIAL_CART)` over five hardcoded items: nothing could add
 * to it, edits vanished on navigation, and the checkout it linked to ignored it
 * entirely. It now renders the shared `GroceryCartProvider` basket — the same one
 * the header badge counts and the checkout submits.
 *
 * Money is formatted through `useGroceryLocale`, not the India-only
 * `formatGroceryPrice` this file used to import, so the totals match the country
 * the customer is shopping in.
 */

// Coupons come from `lib/grocery-coupons.ts`, the one registry `/grocery/coupons`
// also renders. The two used to disagree: that page advertised five codes and
// this one accepted two entirely different ones, so every code a customer copied
// was rejected here.

export default function GroceryCartPage() {
  const { formatPrice, config, taxLabel, tr } = useGroceryLocale();
  const { items, count, subtotal, savings, storeName, storeId, setQuantity, remove, hydrated } = useGroceryCart();

  const [couponInput, setCouponInput] = useState('');
  const [applied, setApplied] = useState<{ code: string; title: string; discount: number; freeDelivery: boolean } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Fees and tax come from the country registry, not from constants. Both pages
  // used to hardcode ₹-denominated figures — a 5% "GST" line and a 199 free-delivery
  // threshold — which are simply wrong outside India, and the two pages disagreed
  // with each other (the cart charged delivery below the threshold while the
  // checkout always displayed FREE), so the total changed on the next screen.
  const { totals } = groceryOrderTotals({
    subtotal,
    couponDiscount: applied?.discount ?? 0,
    config,
    // A free-delivery coupon waives the fee rather than discounting the basket.
    ...(applied?.freeDelivery ? { deliveryFeeOverride: 0, freeDeliveryThresholdOverride: 0 } : {}),
  });
  const { deliveryFee, platformFee, tax, total } = totals;

  const applyCoupon = () => {
    if (!couponInput.trim()) return;
    const result = applyGroceryCoupon(couponInput, subtotal, config);
    if ('error' in result) {
      // Distinguishes "no such code" from "real code, basket too small" — the old
      // version said "not a valid code" for both.
      setCouponError(result.error);
      setApplied(null);
      return;
    }
    setApplied({
      code: result.coupon.code,
      title: result.coupon.title,
      discount: result.discount,
      freeDelivery: result.freeDelivery,
    });
    setCouponError(null);
  };

  // Hold the frame until localStorage has been read — rendering the empty state
  // first makes a full basket flash "your cart is empty" on every load.
  if (!hydrated) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 flex justify-center" aria-busy="true">
        <span className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-green-600 animate-spin" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <span className="text-6xl mb-4 block" aria-hidden="true">🛒</span>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">{tr('Your cart is empty')}</h1>
        <p className="text-slate-500 mb-6">Add items from your favourite grocery stores to get started.</p>
        <Link href="/stores" className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 transition-colors">
          {tr('Browse Stores')} <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl 3xl:max-w-app-wide mx-auto px-2 2xs:px-3 xs:px-4 md:px-6 xl:px-8 py-4 xs:py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="touch-target -ml-2 text-slate-500 hover:text-green-600 transition-colors" aria-label={tr('Back')}>
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">{tr('Your Cart')}</h1>
          <p className="text-sm text-slate-500">
            {count} {count === 1 ? 'item' : 'items'} from {storeName}
          </p>
        </div>
      </div>

      {/* Single-store indicator */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
            <Store className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-sm font-bold text-green-800 truncate">Ordering from {storeName}</p>
        </div>
        {storeId && (
          <Link href={storePath({ id: storeId, name: storeName })} className="shrink-0 text-green-600 text-sm font-semibold hover:underline flex items-center gap-0.5 min-h-[44px] px-1">{tr('Add more')}<ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4 md:gap-5">
        {/* Items — `min-w-0` so this column yields space to the fixed-width summary
            panel instead of shouldering it off the right edge at 768px. */}
        <div className="flex-1 min-w-0 space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-sm">
            <ul className="divide-y divide-slate-100">
              {items.map((item) => (
                <li key={`${item.productId}::${item.weight}`} className="px-3 xs:px-4 py-3 flex items-center gap-2 xs:gap-3 min-h-[60px]">
                  <div className="w-12 h-12 shrink-0">
                    {item.imageUrl ? (
                      <ProductThumb src={item.imageUrl} alt={item.name} sizes={THUMB_SIZES.row} className="rounded-lg" />
                    ) : (
                      <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center">
                        <span className="text-2xl" aria-hidden="true">{item.emoji ?? '🛒'}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-slate-800 text-sm line-clamp-2 md:truncate">{item.name}</h2>
                    <p className="text-xs text-slate-500">{[item.brand, item.weight].filter(Boolean).join(' • ')}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-bold text-sm text-slate-900">{formatPrice(item.price)}</span>
                      {item.mrp != null && item.mrp > item.price && (
                        <span className="text-[10px] text-slate-400 line-through">{formatPrice(item.mrp)}</span>
                      )}
                    </div>
                    {item.maxQuantity != null && item.quantity >= item.maxQuantity && (
                      <p className="text-[10px] text-amber-600 font-semibold mt-0.5">
                        Only {item.maxQuantity} left in stock
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5 bg-green-600 text-white rounded-lg overflow-hidden">
                      <button
                        onClick={() => setQuantity(item.productId, item.weight, item.quantity - 1)}
                        className="min-h-[44px] min-w-[36px] flex items-center justify-center hover:bg-green-700 transition-colors"
                        aria-label={`Decrease quantity of ${item.name}`}
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="text-sm font-bold px-1.5 min-w-[24px] text-center" aria-live="polite">{item.quantity}</span>
                      <button
                        onClick={() => setQuantity(item.productId, item.weight, item.quantity + 1)}
                        disabled={item.maxQuantity != null && item.quantity >= item.maxQuantity}
                        className="min-h-[44px] min-w-[36px] flex items-center justify-center hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        aria-label={`Increase quantity of ${item.name}`}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <button
                      onClick={() => remove(item.productId, item.weight)}
                      className="touch-target text-slate-400 hover:text-red-500 transition-colors"
                      aria-label={`Remove ${item.name} from cart`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Summary */}
        <div className="md:w-80 lg:w-96 shrink-0">
          <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm sticky top-20 space-y-4">
            {/* Coupon */}
            <div>
              <h2 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-green-600" />{tr('Apply Coupon')}</h2>
              {applied ? (
                <div className="flex items-center justify-between gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <span className="text-sm font-semibold text-green-700">{applied.code} — {applied.title}</span>
                  <button onClick={() => { setApplied(null); setCouponInput(''); }} className="text-red-500 text-sm font-semibold min-h-[44px] px-2 shrink-0">{tr('Remove')}</button>
                </div>
              ) : (
                <>
                  {/* `min-w-0` lets the field shrink; without it the input holds its
                      intrinsic width and pushes Apply off-screen at 320px. */}
                  <div className="flex gap-2">
                    <input
                      value={couponInput}
                      onChange={(e) => { setCouponInput(e.target.value); setCouponError(null); }}
                      onKeyDown={(e) => e.key === 'Enter' && applyCoupon()}
                      placeholder={tr('Enter code')}
                      aria-label={tr('Coupon code')}
                      aria-invalid={!!couponError}
                      className="flex-1 min-w-0 px-3 py-2 min-h-[44px] border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
                    />
                    <button onClick={applyCoupon} className="shrink-0 bg-green-600 text-white px-4 py-2 min-h-[44px] rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors">{tr('Apply')}</button>
                  </div>
                  {couponError
                    ? <p role="alert" className="text-xs text-red-600 mt-1">{couponError}</p>
                    : <p className="text-xs text-slate-400 mt-1">Try: {GROCERY_COUPONS[0].code} — {GROCERY_COUPONS[0].title}</p>}
                </>
              )}
            </div>

            {/* Totals */}
            <div className="border-t border-slate-100 pt-3 space-y-2">
              <h2 className="text-sm font-bold text-slate-800">{tr('Order Summary')}</h2>
              <div className="flex justify-between text-sm text-slate-600">
                <span>Subtotal ({count} {count === 1 ? 'item' : 'items'})</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              {savings > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>{tr('Savings')}</span><span>−{formatPrice(savings)}</span>
                </div>
              )}
              {applied && applied.discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Coupon ({applied.code})</span><span>−{formatPrice(applied.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-slate-600">
                <span>{tr('Delivery Fee')}</span>
                {deliveryFee === 0
                  ? <span className="text-green-600 font-semibold">{tr('FREE')}</span>
                  : <span>{formatPrice(deliveryFee)}</span>}
              </div>
              <div className="flex justify-between text-sm text-slate-600">
                <span>{tr('Platform Fee')}</span><span>{formatPrice(platformFee)}</span>
              </div>
              {/* Hidden where the market charges none — a "VAT (0%) — 0.00" row is
                  noise, and Qatar and the UK both fall in that case. */}
              {config.tax.rate > 0 && (
                <div className="flex justify-between text-sm text-slate-600">
                  <span>{taxLabel}</span><span>{formatPrice(tax)}</span>
                </div>
              )}
              <div className="border-t border-slate-200 pt-2 flex justify-between text-base font-bold text-slate-900">
                <span>{tr('Total')}</span><span>{formatPrice(total)}</span>
              </div>
            </div>

            {totals.amountToFreeDelivery > 0 && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>Add {formatPrice(totals.amountToFreeDelivery)} more for free delivery.</p>
              </div>
            )}

            <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
              <Store className="w-4 h-4 shrink-0 mt-0.5" />
              <p>{tr('All items are from')}<strong>{storeName}</strong>. Each order is fulfilled by a single store.</p>
            </div>

            <Link href="/checkout" className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold transition-colors shadow-sm text-center text-sm flex items-center justify-center gap-2">{tr('Proceed to Checkout')}<ArrowRight className="w-4 h-4" />
            </Link>

            <p className="flex items-center gap-2 text-[10px] text-slate-400 justify-center">
              <Truck className="w-3 h-3" /> Delivery in {config.delivery.expressTime}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
