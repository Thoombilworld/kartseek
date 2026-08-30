'use client';

import { AuthGate } from '@/components/shared/auth-gate';
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Clock, CreditCard, Smartphone, Banknote, Truck, ShieldCheck, AlertTriangle, Plus } from 'lucide-react';
import { useGroceryLocale } from '@/i18n/grocery-locale';
import { groceryApi } from '@/lib/grocery-api';
import { useGroceryCart } from '@/lib/contexts/grocery-cart-context';
import { groceryOrderTotals } from '@/lib/grocery-totals';
import { useAuth } from '@/lib/contexts/auth-context';
import { usePincodeSearchLog } from '@/lib/contexts/pincode-search-log';
import { getPaymentMethods, getPaymentLabel, toWirePaymentMethod } from '@/lib/localization';
import { useSavedAddresses, type SavedAddress } from '@/lib/hooks/use-saved-addresses';

/**
 * Grocery checkout.
 *
 * What this page used to do, all of it wrong:
 *   • posted two hardcoded items (tomatoes, bananas) whatever was in the basket;
 *   • sent `customerId: 'current-user'` and `storeId: 'store-green-basket'`,
 *     neither of which identifies anything;
 *   • displayed a fixed subtotal of 487 with a hardcoded 5 platform fee and 24 tax;
 *   • chose from two addresses written into the file;
 *   • and — worst — caught every failure with
 *     `router.push('/checkout/success')`, so a customer whose order had
 *     just been rejected was shown an order confirmation. `placing` was never
 *     reset either, so the button stayed disabled behind the lie.
 *
 * It now submits the real basket, against the signed-in account, to the real store,
 * and reports failure as failure. The server re-prices every line from the
 * catalogue, so the totals here are what the customer is shown, and the order is
 * what the catalogue says it costs.
 */

const DELIVERY_SLOTS = [
  { id: 'express',   label: 'Express',   badge: 'Fastest', scheduled: false, offsetHours: 0 },
  { id: 'standard',  label: 'Standard',  badge: null,      scheduled: false, offsetHours: 0 },
  { id: 'evening',   label: 'Evening',   badge: '6–7 PM',  scheduled: true,  hour: 18 },
  { id: 'night',     label: 'Night',     badge: '8–9 PM',  scheduled: true,  hour: 20 },
] as const;

/**
 * Payment options come from the region registry, not from this file.
 *
 * The list here was a module constant naming UPI first — "UPI (Google Pay,
 * PhonePe, Paytm)", badged "Recommended" — and `useState('upi')` pre-selected
 * it. In Doha that offered a shopper an Indian payment rail that does not
 * exist in Qatar, as the default, on the screen where they commit to paying.
 * The marketplace checkout has always read `getPaymentMethods`; grocery never
 * did.
 */
/** Narrow a registry payment type to the three buckets grocery-service accepts. */
function toGroceryPaymentBucket(type: string): 'ONLINE' | 'COD' | 'WALLET' {
  const wire = toWirePaymentMethod(type);
  if (wire === 'COD') return 'COD';
  if (wire.startsWith('WALLET')) return 'WALLET';
  return 'ONLINE';
}

const METHOD_ICONS: Record<string, typeof CreditCard> = {
  upi: Smartphone, apple_pay: Smartphone, google_pay: Smartphone,
  cod: Banknote, wallet: Banknote,
};

// Orders are placed against the signed-in account, so the page waits behind the
// sign-in prompt instead of redirecting away and losing the basket.
export default function GroceryCheckoutPage() {
  return (
    <AuthGate reason="Please sign in to place your grocery order — your basket is saved.">
      <GroceryCheckoutPageContent />
    </AuthGate>
  );
}

/** Next occurrence of a given local hour — today if still ahead, else tomorrow. */
function nextSlotAt(hour: number): Date {
  const d = new Date();
  d.setSeconds(0, 0);
  d.setMinutes(0);
  if (d.getHours() >= hour) d.setDate(d.getDate() + 1);
  d.setHours(hour);
  return d;
}

function GroceryCheckoutPageContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { formatPrice, config, taxLabel, showArabic, tr } = useGroceryLocale();
  const { items, count, subtotal, storeId, storeName, clear, hydrated } = useGroceryCart();
  const { addresses, loading: addressesLoading } = useSavedAddresses();
  const { logPincodeSearch } = usePincodeSearchLog();

  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<string>('express');
  // Offered methods follow the shopper's market; the default is whichever the
  // registry marks as that market's own. Keyed by region so switching country
  // cannot leave a method selected that the new market does not accept.
  const paymentMethods = useMemo(
    () => getPaymentMethods({ country: config.code }),
    [config.code],
  );
  const [pickedPayment, setPickedPayment] = useState<{ region: string; id: string } | null>(null);
  const defaultPayment = paymentMethods.find((m) => m.isDefault)?.type ?? paymentMethods[0]?.type ?? 'card';
  const selectedPayment = pickedPayment?.region === config.code ? pickedPayment.id : defaultPayment;
  const setSelectedPayment = (id: string) => setPickedPayment({ region: config.code, id });
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default to the customer's default address once they have loaded.
  useEffect(() => {
    if (!selectedAddress && addresses.length) {
      setSelectedAddress((addresses.find((a) => a.isDefault) ?? addresses[0]).id);
    }
  }, [addresses, selectedAddress]);

  const { totals } = useMemo(() => groceryOrderTotals({ subtotal, config }), [subtotal, config]);
  const address = addresses.find((a) => a.id === selectedAddress) ?? null;
  const slot = DELIVERY_SLOTS.find((s) => s.id === selectedSlot) ?? DELIVERY_SLOTS[0];

  const canPlace = !!user?.id && !!storeId && items.length > 0 && !!address && !placing;

  const handlePlaceOrder = async () => {
    if (!canPlace || !address || !storeId) return;
    setPlacing(true);
    setError(null);
    try {
      if (address.pincode) {
        // Best-effort analytics; a logging failure must not block the order.
        try {
          logPincodeSearch({
            pincode: address.pincode, source: 'grocery_checkout', serviceable: true,
            city: address.city, regionCode: config.code, module: 'grocery',
          });
        } catch { /* analytics only */ }
      }

      const res = await groceryApi.createOrder({
        // The gateway overrides `customerId` from the token, but sending the real
        // one keeps the request honest and makes the payload readable in logs.
        customerId: user!.id,
        storeId,
        items: items.map((i) => ({
          productId: i.productId,
          name: i.name,
          weight: i.weight,
          price: i.price,   // ignored server-side; the catalogue price is charged
          quantity: i.quantity,
          ...(i.preparationNote ? { preparationNote: i.preparationNote } : {}),
        })),
        deliveryAddress: {
          line1: address.line1,
          line2: address.line2,
          city: address.city,
          state: address.state,
          pincode: address.pincode,
          lat: address.lat,
          lng: address.lng,
        },
        // grocery-service settles into three buckets only, so the registry's
        // richer wire value (CARD / WALLET_APPLE / MADA …) is narrowed here.
        // The shopper still sees their market's real method name; this is the
        // settlement channel, not the label.
        paymentMethod: toGroceryPaymentBucket(selectedPayment),
        ...(slot.scheduled ? { scheduledAt: nextSlotAt(slot.hour!).toISOString() } : {}),
      });

      const orderId = res?.order?.id;
      // Only empty the basket once the order actually exists — clearing before the
      // response would lose the items if the request failed.
      clear();
      router.push(orderId ? `/checkout/success?orderId=${encodeURIComponent(orderId)}` : '/checkout/success');
    } catch (e) {
      // Failures stay on this page with the basket intact, so the customer can fix
      // the problem (out of stock, below minimum, store closed) and retry.
      setError(e instanceof Error ? e.message : 'We could not place your order. Please try again.');
      setPlacing(false);
    }
  };

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
        <h1 className="text-2xl font-bold text-slate-900 mb-2">{tr('Nothing to check out')}</h1>
        <p className="text-slate-500 mb-6">{tr('Your basket is empty — add a few items first.')}</p>
        <Link href="/stores" className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 transition-colors">{tr('Browse Stores')}</Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl 3xl:max-w-app-wide mx-auto px-2 2xs:px-3 xs:px-4 md:px-6 xl:px-8 py-4 xs:py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/cart" className="text-slate-500 hover:text-green-600 transition-colors" aria-label={tr('Back to cart')}>
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-slate-900">{tr('Checkout')}</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-4 md:gap-5">
        <div className="flex-1 min-w-0 space-y-4">
          {/* ── Delivery Address ─────────────────────────────── */}
          <section className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm">
            <h2 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-green-600" />{tr('Delivery Address')}</h2>

            {addressesLoading ? (
              <div className="space-y-2" aria-busy="true">
                <div className="h-16 bg-slate-100 rounded-lg animate-pulse" />
                <div className="h-16 bg-slate-100 rounded-lg animate-pulse" />
              </div>
            ) : addresses.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-slate-500 mb-3">{tr('You have no saved delivery addresses yet.')}</p>
                <Link href="/addresses" className="inline-flex items-center gap-1.5 bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-green-700 transition-colors">
                  <Plus className="w-4 h-4" />{tr('Add an address')}</Link>
              </div>
            ) : (
              <div className="space-y-2">
                {addresses.map((addr: SavedAddress) => (
                  <label key={addr.id} className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${selectedAddress === addr.id ? 'border-green-500 bg-green-50/50' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <input
                      type="radio" name="address" value={addr.id}
                      checked={selectedAddress === addr.id}
                      onChange={() => setSelectedAddress(addr.id)}
                      className="mt-1 accent-green-600"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-800">{addr.label}</span>
                        {addr.isDefault && <span className="text-[9px] bg-green-100 text-green-700 font-bold px-1.5 py-0.5 rounded">{tr('Default')}</span>}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{addr.formatted}</p>
                    </div>
                  </label>
                ))}
                <Link href="/addresses" className="inline-block text-green-600 text-sm font-semibold hover:underline mt-1">
                  + Add New Address
                </Link>
              </div>
            )}
          </section>

          {/* ── Delivery Slot ────────────────────────────────── */}
          <section className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm">
            <h2 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />{tr('Delivery Slot')}</h2>
            <div className="grid grid-cols-2 gap-2">
              {DELIVERY_SLOTS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedSlot(s.id)}
                  aria-pressed={selectedSlot === s.id}
                  className={`p-3 border rounded-lg text-left transition-colors ${selectedSlot === s.id ? 'border-green-500 bg-green-50/50' : 'border-slate-200 hover:bg-slate-50'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-slate-800">{s.label}</span>
                    {s.badge && <span className="text-[9px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded">{s.badge}</span>}
                  </div>
                  <p className="text-xs text-slate-500">
                    {s.scheduled
                      ? nextSlotAt(s.hour!).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
                      : s.id === 'express' ? config.delivery.expressTime : config.delivery.standardTime}
                  </p>
                  <p className="text-xs text-green-600 font-semibold mt-0.5">{tr('Free')}</p>
                </button>
              ))}
            </div>
          </section>

          {/* ── Payment Method ───────────────────────────────── */}
          <section className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm">
            <h2 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-purple-600" />{tr('Payment Method')}</h2>
            <div className="space-y-2">
              {paymentMethods.map((method) => {
                const Icon = METHOD_ICONS[method.type] ?? CreditCard;
                const label = getPaymentLabel(method, showArabic ? 'ar' : 'en');
                return (
                  <label key={method.type} className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${selectedPayment === method.type ? 'border-green-500 bg-green-50/50' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <input type="radio" name="payment" value={method.type} checked={selectedPayment === method.type} onChange={() => setSelectedPayment(method.type)} className="accent-green-600" />
                    <Icon className="w-5 h-5 text-slate-600 shrink-0" />
                    <span className="text-sm font-medium text-slate-800">{label}</span>
                    {/* "Local" is a fact about the method — Himyan and NAPS in
                        Qatar, KNET in Kuwait — rather than a hardcoded
                        "Recommended" badge that always sat on UPI. */}
                    {method.isLocal && (
                      <span className="text-[9px] bg-green-100 text-green-700 font-bold px-1.5 py-0.5 rounded ml-auto">
                        {showArabic ? 'محلي' : 'Local'}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </section>
        </div>

        {/* ── Order Summary Sidebar ──────────────────────────── */}
        <div className="md:w-80 lg:w-96 shrink-0">
          <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm sticky top-20 space-y-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800">{tr('Order Summary')}</h2>
              <p className="text-xs text-slate-500">from {storeName}</p>
            </div>

            {/* The actual lines being ordered. The old page showed a total with no
                items behind it, so there was nothing to check before paying. */}
            <ul className="space-y-1.5 max-h-48 overflow-y-auto text-sm text-slate-600 border-b border-slate-100 pb-2">
              {items.map((i) => (
                <li key={`${i.productId}::${i.weight}`} className="flex justify-between gap-2">
                  <span className="truncate">{i.quantity} × {i.name} <span className="text-slate-400">({i.weight})</span></span>
                  <span className="shrink-0">{formatPrice(i.price * i.quantity)}</span>
                </li>
              ))}
            </ul>

            <div className="space-y-1.5 text-sm text-slate-600">
              <div className="flex justify-between"><span>Subtotal ({count} {count === 1 ? 'item' : 'items'})</span><span>{formatPrice(totals.subtotal)}</span></div>
              <div className="flex justify-between">
                <span>{tr('Delivery Fee')}</span>
                {totals.deliveryFee === 0
                  ? <span className="text-green-600 font-semibold">{tr('FREE')}</span>
                  : <span>{formatPrice(totals.deliveryFee)}</span>}
              </div>
              <div className="flex justify-between"><span>{tr('Platform Fee')}</span><span>{formatPrice(totals.platformFee)}</span></div>
              {config.tax.rate > 0 && (
                <div className="flex justify-between"><span>{taxLabel}</span><span>{formatPrice(totals.tax)}</span></div>
              )}
            </div>
            <div className="border-t border-slate-200 pt-2 flex justify-between text-base font-bold text-slate-900">
              <span>{tr('Total')}</span>
              <span>{formatPrice(totals.total)}</span>
            </div>

            {error && (
              <div role="alert" className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            {!address && !addressesLoading && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">{tr('Choose a delivery address to continue.')}</p>
            )}

            <button
              onClick={handlePlaceOrder}
              disabled={!canPlace}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold transition-colors shadow-sm text-sm flex items-center justify-center gap-2"
            >
              {placing ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{tr('Placing Order...')}</>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" /> Place Order — {formatPrice(totals.total)}
                </>
              )}
            </button>

            <p className="flex items-center gap-2 text-[10px] text-slate-400 justify-center">
              <Truck className="w-3 h-3" /> Estimated delivery:{' '}
              {slot.scheduled
                ? nextSlotAt(slot.hour!).toLocaleString(undefined, { weekday: 'short', hour: 'numeric' })
                : slot.id === 'express' ? config.delivery.expressTime : config.delivery.standardTime}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
