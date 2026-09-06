'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Trash2,
  Plus,
  Minus,
  Tag,
  ShieldCheck,
  Truck,
  ChevronRight,
  ShoppingBag,
  Gift,
  CreditCard,
  X,
  Check,
  Copy,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Percent,
} from 'lucide-react';
import { useRegion } from '@/lib/contexts/region-context';
import { useCartContext } from '@/lib/contexts/cart-context';
import { useAuth } from '@/lib/contexts/auth-context';
import { marketplaceApi } from '@/lib/api-endpoints';
import {
  marketplaceDeliveryFee,
  amountToFreeDelivery,
  getMarketplaceDeliveryRule,
} from '@/lib/marketplace/delivery';
import { productPath } from '@/lib/marketplace/product-url';
import { zoneHref } from '@/lib/routes/zone-href';

/** A coupon as the catalogue actually holds it. */
interface AvailableCoupon {
  code: string;
  description: string;
  minOrderValue: number;
}

interface CartItem {
  id: string;
  title: string;
  brand: string;
  price: number;
  mrp: number;
  qty: number;
  /** The chosen SKU — lines are keyed by product AND variant. */
  variantId?: string;
}

export default function CartPage() {
  const { formatCurrencyValue: fmt, country } = useRegion();
  const cart = useCartContext();
  const [coupon, setCoupon] = useState('');
  // Section-level, not page-level. Coupons and bank offers are secondary
  // here: if they fail the basket is still correct and orderable, so the
  // strip says it could not load rather than claiming there are none.
  const [offersFailed, setOffersFailed] = useState(false);
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [couponChecking, setCouponChecking] = useState(false);
  /** The discount the server calculated — not a percentage guessed here. */
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [giftCard, setGiftCard] = useState('');
  const [giftCardApplied, setGiftCardApplied] = useState(false);
  const [giftCardBalance, setGiftCardBalance] = useState(0);
  const [giftCardError, setGiftCardError] = useState('');
  const [giftCardChecking, setGiftCardChecking] = useState(false);
  const [showAvailableCoupons, setShowAvailableCoupons] = useState(false);
  const { isAuthenticated } = useAuth();

  // This page reads the SHARED cart, not its own copy from the API.
  //
  // It used to fetch `getCart()` into local state, which meant the storefront ran
  // two disconnected carts: the header badge (and every Add to Cart button) wrote
  // to CartProvider, while this page showed only the server cart. Signed out —
  // where there is no server cart at all, every gateway cart route being behind
  // JwtAuthGuard — the badge would read "1" while this page said "your cart is
  // empty" on the very same click. The provider already reconciles with the
  // server whenever a session exists, so it is the one source of truth.
  // Derived, not copied into state: mirroring the provider through an effect
  // would render one frame of stale rows after every quantity change and makes
  // this page a second place cart data can go wrong.
  const items: CartItem[] = useMemo(
    () =>
      cart.items.map((i) => ({
        id: i.id,
        title: i.name || 'Product',
        brand: i.brand || '',
        price: Number(i.price) || 0,
        mrp: Number(i.price) || 0,
        qty: Number(i.quantity) || 1,
        variantId: i.variantId,
      })),
    [cart.items],
  );

  // Coupons come from the catalogue, not from this file.
  //
  // These were four hardcoded codes — SAVE5, FIRST500, HDFC10, ELECTRONICS —
  // matched locally, and the discount was `subtotal * 0.05` regardless of which
  // one you typed. None of them exist in the database, and checkout validates
  // the code against the real record and **rejects the order** when it does not
  // resolve. So the cart showed a discount, the customer went to pay, and the
  // order came back "Coupon is not valid".
  const [availableCoupons, setAvailableCoupons] = useState<AvailableCoupon[]>([]);

  useEffect(() => {
    let cancelled = false;
    marketplaceApi
      .getCoupons({ limit: 20 })
      .then((res: any) => {
        if (cancelled) return;
        // The gateway wraps list payloads twice — rows sit at data.data.
        const rows: any[] = res?.data?.data ?? res?.data ?? [];
        setAvailableCoupons(
          rows
            .filter((c) => c?.code)
            .map((c) => ({
              code: String(c.code),
              description: String(c.description ?? c.name ?? ''),
              minOrderValue: Number(c.minOrderValue) || 0,
            })),
        );
      })
      .catch(() => {
        if (!cancelled) {
          setAvailableCoupons([]);
          setOffersFailed(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Bank/card offers, from `bank_offers` via the gateway. This panel listed a
  // fixed HDFC / SBI / ICICI set written into the page, so it advertised
  // promotions the platform was not running — including a `HDFC10` code that
  // resolves to nothing.
  const [bankOffers, setBankOffers] = useState<{ id: string; text: string; code?: string }[]>([]);

  useEffect(() => {
    let cancelled = false;
    marketplaceApi
      .getBankOffers()
      .then((res: any) => {
        if (cancelled) return;
        const rows: any[] = res?.data?.data ?? res?.data ?? [];
        setBankOffers(
          rows
            .map((o) => ({
              id: String(o.id),
              text: String(o.description ?? o.title ?? ''),
              code: o.couponCode ?? o.code ?? undefined,
            }))
            .filter((o) => o.text),
        );
      })
      .catch(() => {
        if (!cancelled) {
          setBankOffers([]);
          setOffersFailed(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Mutations go through the provider too, so the badge, this page and the server
  // can never drift apart. The provider owns the optimistic update and the
  // server round-trip; the effect above re-derives local rows from the result.
  // Keyed by product AND variant: without the SKU the provider could not tell
  // a "128GB / Silver" line from the plain one, so Remove and the quantity
  // buttons silently did nothing on any variant line.
  const updateQty = (item: CartItem, delta: number) => {
    cart.update(item.id, item.qty + delta, item.variantId);
  };

  const removeItem = (item: CartItem) => cart.remove(item.id, item.variantId);

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const savedMRP = items.reduce((s, i) => s + (i.mrp - i.price) * i.qty, 0);
  // The server's figure, from POST /coupons/validate — this was a flat 5% of the
  // subtotal for any code the local list happened to contain, so the discount
  // shown here had nothing to do with the coupon or with what checkout applies.
  const couponDiscount = couponApplied ? appliedDiscount : 0;
  /**
   * What a gift card WOULD cover — shown, but not subtracted from the total.
   *
   * Checkout has no gift card field, never sends a code with the order, and
   * nothing in the app calls `POST /marketplace/gift-cards/redeem` — the endpoint
   * exists but has no caller. Deducting here produced a cart total the customer
   * never got: they saw the reduced figure, moved to checkout, and were charged
   * the full amount with the card still untouched.
   *
   * Showing the balance is still useful, so the lookup stays. The deduction goes
   * until redemption is wired into order placement.
   */
  const giftCardCoverage = giftCardApplied
    ? Math.min(giftCardBalance, subtotal - couponDiscount)
    : 0;
  // Quoted from the same rule order-service charges by. This was
  // `subtotal > 49900 ? 0 : 99` — a threshold written in paise against a
  // subtotal in rupees, so "free over ₹499" only started at ₹49,900 — and the
  // ₹99 fee was a number the server has never charged.
  const delivery = marketplaceDeliveryFee(subtotal, country.code);
  const total = subtotal - couponDiscount + delivery;
  // The delivery saving is the fee actually waived, not a flat 99 added on
  // whenever delivery came out free.
  const deliverySaving = delivery === 0 ? getMarketplaceDeliveryRule(country.code).fee : 0;
  // Gift card coverage is deliberately absent: it is not deducted from the total,
  // so counting it as a saving would overstate what the customer actually saves.
  const totalSavings = savedMRP + couponDiscount + deliverySaving;

  /**
   * Apply a coupon by asking the server whether it is valid.
   *
   * The same `validate_coupon` call checkout makes, so what the cart shows and
   * what the order charges cannot disagree — including the minimum-order rule,
   * the per-customer usage limit and the discount cap, none of which the old
   * local check knew about.
   */
  const handleApplyCoupon = useCallback(async () => {
    setCouponError('');
    const code = coupon.trim().toUpperCase();
    if (!code) return;
    if (couponApplied) {
      setCouponError('A coupon is already applied');
      return;
    }

    setCouponChecking(true);
    try {
      const res: any = await marketplaceApi.validateCoupon({ code, cartTotal: subtotal });
      const result = res?.data ?? res;
      if (!result?.valid) {
        setCouponError(result?.reason || 'This coupon cannot be applied to your order.');
        return;
      }
      setAppliedDiscount(Math.min(Number(result.discount) || 0, subtotal));
      setCouponApplied(true);
    } catch {
      setCouponError('We could not check that coupon just now. Please try again.');
    } finally {
      setCouponChecking(false);
    }
  }, [coupon, couponApplied, subtotal]);

  const handleRemoveCoupon = () => {
    setCouponApplied(false);
    setAppliedDiscount(0);
    setCoupon('');
    setCouponError('');
  };

  /**
   * Apply a gift card by looking up its real balance.
   *
   * Any code starting with `KART-GIFT-` was accepted and credited with a flat
   * 5,000 — a discount invented in the browser, against a card that need not
   * exist. Checkout redeems against the actual `gift_cards` row, so the two
   * disagreed on every order.
   */
  const handleApplyGiftCard = useCallback(async () => {
    setGiftCardError('');
    const code = giftCard.trim();
    if (!code) return;
    if (!isAuthenticated) {
      setGiftCardError('Sign in to use a gift card.');
      return;
    }

    setGiftCardChecking(true);
    try {
      const res: any = await marketplaceApi.getGiftCardBalance({ code });
      const card = res?.data ?? res;
      const balance = Number(card?.currentBalance) || 0;
      if (balance <= 0) {
        setGiftCardError('This gift card has no remaining balance.');
        return;
      }
      setGiftCardBalance(balance);
      setGiftCardApplied(true);
    } catch (err: any) {
      setGiftCardError(err?.message || 'We could not find that gift card.');
    } finally {
      setGiftCardChecking(false);
    }
  }, [giftCard, isAuthenticated]);

  const handleRemoveGiftCard = () => {
    setGiftCardApplied(false);
    setGiftCard('');
    setGiftCardBalance(0);
  };

  const handleCopyCoupon = (code: string) => {
    setCoupon(code);
    navigator.clipboard?.writeText(code);
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      <div className="max-w-7xl mx-auto px-3 xs:px-4 pt-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <Link href="/" className="hover:text-blue-600">
            Home
          </Link>
          <span>/</span>
          <span className="text-slate-900 font-medium">Your Cart</span>
        </div>

        <h1 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-2">
          <ShoppingBag className="w-6 h-6 text-blue-600" />
          Your Cart
          <span className="text-base font-semibold text-slate-400 ml-1">
            ({items.reduce((s, i) => s + i.qty, 0)} items)
          </span>
        </h1>

        {items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center">
            <ShoppingBag className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-700 mb-2">Your cart is empty</h2>
            <p className="text-slate-500 mb-6">Looks like you haven&apos;t added anything yet.</p>
            <Link
              href="/"
              className="bg-blue-600 text-white font-bold px-8 py-3 rounded-xl hover:bg-blue-700 transition-colors inline-block"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {/* Delivery Banner */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-3 flex items-center gap-3">
                <Truck className="w-5 h-5 text-blue-600 shrink-0" />
                <p className="text-sm text-blue-800 font-medium">
                  {delivery === 0
                    ? '🎉 You qualify for FREE delivery!'
                    : `Add ${fmt(amountToFreeDelivery(subtotal, country.code))} more for FREE delivery`}
                </p>
              </div>

              {items.map((item) => {
                // The cart payload carries no MRP, so `mrp` equals `price` and
                // there is no discount to claim. Rendering it anyway put a
                // struck-through copy of the price beside the price and a
                // "0% off" badge on every line.
                const hasMrp = item.mrp > item.price;
                const disc = hasMrp ? Math.round(((item.mrp - item.price) / item.mrp) * 100) : 0;
                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex gap-5"
                  >
                    {/* Product Thumb */}
                    <Link
                      href={zoneHref(productPath(item))}
                      className="w-24 h-24 bg-linear-to-br from-blue-50 to-indigo-50 rounded-xl flex items-center justify-center border border-slate-100 shrink-0 hover:border-blue-200 transition-colors"
                    >
                      <ShoppingBag className="w-8 h-8 text-blue-300" />
                    </Link>

                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">
                        {item.brand}
                      </span>
                      <Link href={zoneHref(productPath(item))}>
                        <h3 className="font-bold text-slate-900 leading-snug mt-0.5 hover:text-blue-600 transition-colors line-clamp-2">
                          {item.title}
                        </h3>
                      </Link>

                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-lg font-black text-slate-900">{fmt(item.price)}</span>
                        {hasMrp && (
                          <>
                            <span className="text-sm text-slate-400 line-through">
                              {fmt(item.mrp)}
                            </span>
                            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                              {disc}% off
                            </span>
                          </>
                        )}
                        {item.qty > 1 && (
                          <span className="text-xs text-slate-500">
                            × {item.qty} ={' '}
                            <span className="font-bold text-slate-700">
                              {fmt(item.price * item.qty)}
                            </span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-4">
                        {/* Qty Controls */}
                        <div className="flex items-center gap-1 border border-slate-200 rounded-lg overflow-hidden">
                          <button
                            title="Decrease quantity"
                            onClick={() => updateQty(item, -1)}
                            className="w-9 h-9 flex items-center justify-center hover:bg-slate-50 text-slate-600 transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-9 text-center font-bold text-slate-900 text-sm">
                            {item.qty}
                          </span>
                          <button
                            title="Increase quantity"
                            onClick={() => updateQty(item, 1)}
                            className="w-9 h-9 flex items-center justify-center hover:bg-slate-50 text-slate-600 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          onClick={() => removeItem(item)}
                          className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" /> Remove
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Coupon */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-3">
                  <Tag className="w-4 h-4 text-blue-600" /> Apply Coupon
                </h3>
                {couponApplied ? (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-bold text-green-700">
                        SAVE5 applied — 5% off!
                      </span>
                    </div>
                    <button
                      onClick={handleRemoveCoupon}
                      className="text-red-500 hover:text-red-700 p-1"
                      aria-label="Close"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-3">
                      <input
                        value={coupon}
                        onChange={(e) => {
                          setCoupon(e.target.value.toUpperCase());
                          setCouponError('');
                        }}
                        placeholder="Enter coupon code"
                        className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none transition-all uppercase"
                      />
                      <button
                        onClick={handleApplyCoupon}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl transition-colors text-sm"
                      >
                        Apply
                      </button>
                    </div>
                    {couponError && (
                      <p className="text-sm text-red-500 font-medium mt-2">{couponError}</p>
                    )}
                    <button
                      onClick={() => setShowAvailableCoupons(!showAvailableCoupons)}
                      className="text-sm text-blue-600 font-bold mt-3 flex items-center gap-1 hover:text-blue-700"
                    >
                      <Percent className="w-3.5 h-3.5" />
                      {showAvailableCoupons ? 'Hide' : 'Browse'} Available Coupons
                      {showAvailableCoupons ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </>
                )}

                {/* Available Coupons Dropdown */}
                {showAvailableCoupons && !couponApplied && (
                  <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                    {availableCoupons.length === 0 && (
                      <p className="text-xs text-slate-500 py-2">
                        No coupons are available right now.
                      </p>
                    )}
                    {availableCoupons.map((c) => (
                      <div
                        key={c.code}
                        className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 group hover:bg-blue-50 transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-blue-700 text-sm bg-blue-50 px-2 py-0.5 rounded border border-dashed border-blue-300">
                              {c.code}
                            </span>
                            {c.minOrderValue > subtotal && (
                              <span className="text-[10px] text-amber-600 font-bold">
                                Min: {fmt(c.minOrderValue)}
                              </span>
                            )}
                          </div>
                          {c.description && (
                            <p className="text-xs text-slate-500 mt-1">{c.description}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleCopyCoupon(c.code)}
                          className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-100 hover:bg-blue-200 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <Copy className="w-3 h-3" /> Use
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Gift Card Redemption */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-3">
                  <Gift className="w-4 h-4 text-purple-600" /> Have a Gift Card?
                </h3>
                {giftCardApplied ? (
                  <div className="flex items-center justify-between bg-purple-50 border border-purple-200 rounded-xl px-4 py-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-purple-600" />
                        <span className="text-sm font-bold text-purple-700">Gift card found</span>
                      </div>
                      <p className="text-xs text-purple-500 mt-1">
                        Balance: {fmt(giftCardBalance)} · Covers up to {fmt(giftCardCoverage)} of
                        this order
                      </p>
                      {/* The deduction is applied at checkout, where the order is
                          placed and the server debits the card. Saying so is more
                          honest than showing a discount on a total nothing charges. */}
                      <p className="text-xs text-slate-500 mt-1">Applied at checkout.</p>
                    </div>
                    <button
                      onClick={handleRemoveGiftCard}
                      className="text-red-500 hover:text-red-700 p-1"
                      aria-label="Close"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-3">
                      <input
                        value={giftCard}
                        onChange={(e) => {
                          setGiftCard(e.target.value.toUpperCase());
                          setGiftCardError('');
                        }}
                        placeholder="e.g. KART-GIFT-A1B2C3"
                        className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:border-purple-400 focus:ring-1 focus:ring-purple-100 outline-none transition-all uppercase"
                      />
                      <button
                        onClick={handleApplyGiftCard}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-5 py-2.5 rounded-xl transition-colors text-sm"
                      >
                        Redeem
                      </button>
                    </div>
                    {giftCardError && (
                      <p className="text-sm text-red-500 font-medium mt-2">{giftCardError}</p>
                    )}
                    <Link
                      href="/gift-cards"
                      className="text-xs text-purple-600 font-bold mt-2 inline-block hover:text-purple-700"
                    >
                      Buy a Gift Card →
                    </Link>
                  </>
                )}
              </div>

              {/* Bank Offers */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-3">
                  <CreditCard className="w-4 h-4 text-green-600" /> Bank Offers
                </h3>
                <div className="space-y-2">
                  {bankOffers.length === 0 && (
                    <p className="text-xs text-slate-500">
                      No card offers are running at the moment.
                    </p>
                  )}
                  {bankOffers.map((offer) => (
                    <div
                      key={offer.id}
                      className="flex items-start gap-3 bg-green-50/50 border border-green-100 rounded-xl px-4 py-3"
                    >
                      <Sparkles className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-slate-700">{offer.text}</p>
                        {offer.code && (
                          <span className="text-[10px] font-mono font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded mt-1 inline-block">
                            Use: {offer.code}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 lg:sticky lg:top-[calc(var(--mp-header-h)+1rem)]">
                <h2 className="font-bold text-slate-900 text-lg mb-5 pb-3 border-b border-slate-100">
                  Order Summary
                </h2>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal ({items.reduce((s, i) => s + i.qty, 0)} items)</span>
                    <span className="font-semibold text-slate-900">{fmt(subtotal)}</span>
                  </div>
                  {/* Only shown when there is a saving to show. The cart's line
                      items carry no MRP, so this row printed "− ₹0.00" on every
                      basket. */}
                  {savedMRP > 0 && (
                    <div className="flex justify-between text-green-600 font-semibold">
                      <span>You Save (MRP)</span>
                      <span>− {fmt(savedMRP)}</span>
                    </div>
                  )}
                  {couponApplied && (
                    <div className="flex justify-between text-blue-600 font-semibold">
                      <span>Coupon (SAVE5)</span>
                      <span>− {fmt(couponDiscount)}</span>
                    </div>
                  )}
                  {giftCardApplied && (
                    // Not a "−" line: it is not coming off this total. Showing it
                    // as a deduction is what made the cart disagree with checkout.
                    <div className="flex justify-between text-slate-500">
                      <span>Gift card balance</span>
                      <span>{fmt(giftCardBalance)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>Delivery</span>
                    <span
                      className={
                        delivery === 0
                          ? 'text-green-600 font-semibold'
                          : 'font-semibold text-slate-900'
                      }
                    >
                      {delivery === 0 ? 'FREE' : fmt(delivery)}
                    </span>
                  </div>
                </div>

                <div className="border-t border-slate-100 mt-4 pt-4 flex justify-between items-center">
                  <span className="font-black text-slate-900 text-lg">Total</span>
                  <span className="font-black text-slate-900 text-xl">{fmt(total)}</span>
                </div>

                {totalSavings > 0 && (
                  <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-2.5 mt-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-green-600 shrink-0" />
                    <p className="text-xs text-green-700 font-bold">
                      You&apos;re saving {fmt(totalSavings)} on this order!
                    </p>
                  </div>
                )}

                <Link
                  // Carry the verified code so the customer does not retype it.
                  // Checkout re-checks the balance and the server decides the
                  // amount, so nothing here is trusted as a discount.
                  href={
                    giftCardApplied
                      ? `/checkout?gift=${encodeURIComponent(giftCard.trim())}`
                      : '/checkout'
                  }
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg active:scale-95 text-base"
                >
                  Proceed to Checkout <ChevronRight className="w-5 h-5" />
                </Link>

                <Link
                  href="/"
                  className="w-full mt-3 border border-slate-200 text-slate-700 font-semibold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors text-sm"
                >
                  Continue Shopping
                </Link>

                <div className="flex items-center gap-2 mt-5 text-xs text-slate-400">
                  <ShieldCheck className="w-4 h-4 text-green-500 shrink-0" />
                  Safe &amp; Secure Checkout — 100% Encrypted
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
