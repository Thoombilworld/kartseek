'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { MapPin, CreditCard, ShieldCheck, ChevronRight, Package, CheckCircle2, ChevronDown, FileText, Sparkles, Calendar, Truck, Tag, X, Loader2, Wallet, Star, Gift } from 'lucide-react';
import { useRegion } from '@/lib/contexts/region-context';
import { useCartContext } from '@/lib/contexts/cart-context';
import { usePincodeSearchLog } from '@/lib/contexts/pincode-search-log';
import { useAuth } from '@/lib/contexts/auth-context';
import { validateCoupon, placeOrder, getGiftCardBalance } from '@/lib/api/marketplace';
import { api } from '@/lib/api-endpoints';
import { marketplaceDeliveryFee, amountToFreeDelivery } from '@/lib/marketplace/delivery';
import { AddressForm } from '@/components/shared/address-form';
import { PaymentMethodSelector } from '@/components/shared/payment-method-selector';
import { toWirePaymentMethod, hasPostalCode, type AddressValue, type AddressFieldKey } from '@/lib/localization';
import { AuthGate } from '@/components/shared/auth-gate';

interface CheckoutItem { productId: string; title: string; brand: string; price: number; qty: number }

type Step = 'address' | 'payment' | 'review';

const STEPS: { id: Step; label: string; icon: React.ElementType }[] = [
  { id: 'address', label: 'Delivery Address', icon: MapPin },
  { id: 'payment', label: 'Payment', icon: CreditCard },
  { id: 'review', label: 'Review & Place Order', icon: Package },
];

// The order is placed against the signed-in customer's account, so the page is
// held behind the sign-in prompt rather than redirecting — the basket, address
// and chosen payment method survive the sign-in.
export default function CheckoutPage() {
  return (
    <AuthGate reason="Please sign in to complete your order — your basket is saved.">
      <CheckoutPageContent />
    </AuthGate>
  );
}

function CheckoutPageContent() {
  const {
    formatCurrencyValue: fmt, country,
    validateAddressValue, toWireAddressValue, calculateTaxValue,
    defaultPaymentMethod, getDeliveryWindow, timezoneLabel,
  } = useRegion();
  const { logPincodeSearch } = usePincodeSearchLog();
  const cart = useCartContext();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('address');
  const [placed, setPlaced] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  // Region-shaped: a Qatari address carries building/street/zone, an Indian one
  // line1/city/state/PIN. `AddressForm` renders whichever the region defines.
  const [address, setAddress] = useState<AddressValue>({});
  const [addressErrors, setAddressErrors] = useState<Partial<Record<AddressFieldKey, string>>>({});
  // A payment choice belongs to the market it was made in, so it is stored WITH
  // that market rather than reset by an effect after the fact. Deriving it means
  // there is never a render where `payMethod` still holds the previous region's
  // choice — the effect that used to do this fired after paint, so a customer
  // switching from India to Qatar briefly saw `upi` selected against a gateway
  // that would decline it.
  const [pickedMethod, setPickedMethod] = useState<{ region: string; method: string } | null>(null);
  const payMethod = pickedMethod?.region === country.code
    ? pickedMethod.method
    : (defaultPaymentMethod?.type ?? 'card');
  const setPayMethod = (method: string) => setPickedMethod({ region: country.code, method });
  const [showGst, setShowGst] = useState(false);
  const [gstin, setGstin] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [gstError, setGstError] = useState('');

  // Checkout reads the SHARED cart, like every other cart surface.
  //
  // It used to fetch `getCart()` into its own state — a third independent copy
  // alongside the header badge and the cart page. Every gateway cart route is
  // behind JwtAuthGuard and there is no guest cart, so for a signed-out shopper
  // that call returned nothing and the order summary said "0 items" while the
  // badge showed the real count. The provider reconciles with the server
  // whenever a session exists, so reading it is correct in both states.
  const orderItems: CheckoutItem[] = useMemo(
    () => cart.items.map((i) => ({
      productId: i.id,
      title: i.name || 'Product',
      brand: i.brand || '',
      price: Number(i.price) || 0,
      qty: Number(i.quantity) || 1,
    })),
    [cart.items],
  );

  // Coupon state
  const [showCoupon, setShowCoupon] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState('');
  const [couponError, setCouponError] = useState('');

  // Gift card state.
  //
  // Checkout had no gift card field at all: the cart let a customer "apply" one
  // and reduced the total it displayed, then sent no code here, so the order was
  // charged in full and the card never debited. The code is now carried to the
  // server, which decides the amount from the card's real balance and debits it
  // as part of placing the order.
  const [giftCardCode, setGiftCardCode] = useState('');
  const [giftCardApplied, setGiftCardApplied] = useState('');
  const [giftCardBalance, setGiftCardBalance] = useState(0);
  const [giftCardChecking, setGiftCardChecking] = useState(false);
  const [giftCardError, setGiftCardError] = useState('');

  // A code carried over from the cart is pre-filled, never pre-applied: its
  // balance is re-checked here, and the server decides the amount at placement.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const fromCart = new URLSearchParams(window.location.search).get('gift');
    if (fromCart) setGiftCardCode(fromCart.toUpperCase());
  }, []);

  // ── Wallet & loyalty ─────────────────────────────────────────────────────
  //
  // Both balances are READ FROM THE SERVER. They used to be `useState(4250)` and
  // `useState(750)` — literals, with a comment claiming they were fetched — and
  // both are subtracted from `total` below. That let any shopper take 4,250 of
  // wallet credit and 750 points off their bill with money and points they did
  // not have, and the order service accepted the reduced total, so the shortfall
  // was simply lost revenue. Anything that moves the amount payable has to come
  // from the ledger that owns it.
  //
  // On failure both stay at zero: showing no credit is recoverable (the shopper
  // pays in full), showing credit that isn't there is not.
  const [walletBalance, setWalletBalance] = useState(0);
  const [useWallet, setUseWallet] = useState(false);
  const [walletAmount, setWalletAmount] = useState(0);

  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [loyaltyTier, setLoyaltyTier] = useState('');
  const [useLoyalty, setUseLoyalty] = useState(false);
  const [loyaltyPointsToRedeem, setLoyaltyPointsToRedeem] = useState(0);
  const loyaltyDiscount = Math.floor(loyaltyPointsToRedeem / 10); // 10 pts = 1 currency unit

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    api.get<any>(`/wallet/${user.id}/balance`)
      .then((res) => { if (!cancelled) setWalletBalance(Number(res?.balance ?? 0) || 0); })
      .catch(() => { /* no credit shown — the shopper pays in full */ });

    api.get<any>('/api/loyalty/points')
      .then((res) => {
        if (cancelled) return;
        setLoyaltyPoints(Number(res?.points ?? 0) || 0);
        setLoyaltyTier(String(res?.tier ?? ''));
      })
      .catch(() => { /* no points shown */ });

    return () => { cancelled = true; };
  }, [user?.id]);

  // A balance that drops below what is already staged (refetch, or credit spent
  // in another tab) must not stay applied to this order.
  useEffect(() => {
    setWalletAmount((amount) => Math.min(amount, walletBalance));
    if (walletBalance <= 0) setUseWallet(false);
  }, [walletBalance]);

  useEffect(() => {
    setLoyaltyPointsToRedeem((points) => Math.min(points, loyaltyPoints));
    if (loyaltyPoints <= 0) setUseLoyalty(false);
  }, [loyaltyPoints]);

  const subtotal = orderItems.reduce((s, i) => s + i.price * i.qty, 0);
  const savedMRP = orderItems.reduce((s, i) => s + ((i as any).mrp ? ((i as any).mrp - i.price) * i.qty : 0), 0);
  // Was a hard-coded `0`, so this page always displayed "Delivery FREE" and a
  // total that omitted the fee — while order-service charged ₹60 on any basket
  // under the threshold. The customer approved one number and was billed
  // another. Quoted from the same rule the server prices by.
  const delivery = marketplaceDeliveryFee(subtotal);
  const estimatedPointsEarn = Math.floor((subtotal - couponDiscount) / 100); // 1 pt per 100 units
  // What the gift card will cover. The server recomputes this from the card's
  // balance when the order is placed and debits exactly that — this figure is for
  // display, so the customer is never shown a total the server will not honour.
  const giftCardAmount = giftCardApplied
    ? Math.min(giftCardBalance, Math.max(subtotal - couponDiscount, 0))
    : 0;
  const total = subtotal + delivery - couponDiscount - giftCardAmount - walletAmount - loyaltyDiscount;

  // Qatar levies no VAT, so `applies` is false there and the tax row is omitted
  // rather than printed as a misleading zero.
  const tax = calculateTaxValue(total);

  // Promised delivery window, quoted in the region's clock. A Doha customer must
  // see Doha time even when their device is set elsewhere.
  const deliveryWindow = getDeliveryWindow(48 * 60, 72 * 60);

  const validateGstin = (val: string) => {
    setGstin(val.toUpperCase());
    if (val.length > 0 && val.length !== 15) {
      setGstError('GSTIN must be 15 characters');
    } else if (val.length === 15 && !/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/.test(val.toUpperCase())) {
      setGstError('Invalid GSTIN format');
    } else {
      setGstError('');
    }
  };

  /** Validate against the region's own spec and move on, or surface the errors. */
  function continueFromAddress() {
    const result = validateAddressValue(address);
    setAddressErrors(result.errors);
    if (!result.valid) return;

    // Postal-code telemetry only means something where the region has one —
    // Qatar has no public postcode system, so there is nothing to log.
    if (hasPostalCode(country.code) && address.postalCode && address.postalCode.length >= 5) {
      try {
        logPincodeSearch({
          pincode: address.postalCode, source: 'checkout', serviceable: true,
          regionCode: country.code, module: 'marketplace',
        });
      } catch {}
    }
    setStep('payment');
  }

  async function handlePlaceOrder() {
    setOrderError('');
    if (!user?.id) { setOrderError('Please sign in to place your order.'); return; }
    if (orderItems.length === 0) { setOrderError('Your cart is empty.'); return; }
    if (orderItems.some((i) => !i.productId)) { setOrderError('Some items are missing product references — please revisit your cart.'); return; }

    const addressCheck = validateAddressValue(address);
    if (!addressCheck.valid) {
      setAddressErrors(addressCheck.errors);
      setOrderError('Please complete your delivery address.');
      setStep('address');
      return;
    }

    setPlacing(true);
    try {
      // Wallet covering the whole order settles as WALLET regardless of the
      // method chosen; otherwise the region's method maps to its wire value.
      const method = useWallet && walletAmount >= total ? 'WALLET' : toWirePaymentMethod(payMethod);
      const res: any = await placeOrder({
        customerId: user.id,
        customerName: (address.fullName as string) || undefined,
        items: orderItems.map((i) => ({ productId: i.productId, quantity: i.qty })),
        // Flattened into the envelope the order service persists, with the
        // region-native fields (building/street/zone) carried alongside so the
        // delivery partner gets an address they can actually navigate to.
        shippingAddress: toWireAddressValue(address),
        paymentMethod: method,
        couponCode: couponApplied || undefined,
        // Only the code travels. The server reads the balance, decides the amount
        // and debits the card inside order placement, so the browser cannot
        // dictate its own discount.
        giftCardCode: giftCardApplied || undefined,
      });
      const order = res?.order ?? res?.data ?? res;
      setOrderNumber(order?.orderNumber ?? order?.id ?? '');
      // Empty the basket once the order is accepted. Without this the just-bought
      // items stayed in the cart: the header badge still showed them, returning
      // to /marketplace/cart offered them again, and a second trip through
      // checkout placed a duplicate order for goods already paid for.
      cart.clear();
      setPlaced(true);
    } catch (err: any) {
      setOrderError(err?.message || 'Could not place your order. Please try again.');
    } finally {
      setPlacing(false);
    }
  }

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  if (placed) {
    return (
      <div className="bg-slate-50 min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">Order Placed! 🎉</h1>
          <p className="text-slate-500 mb-2">Your order {orderNumber && <span className="font-bold text-slate-800">#{orderNumber}</span>} has been confirmed.</p>
          <p className="text-slate-500 text-sm mb-8">We&apos;ve emailed your confirmation and will notify you as it ships.</p>
          <div className="space-y-3">
            <Link href="/marketplace" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors">
              Continue Shopping
            </Link>
            <Link href="/marketplace/orders" className="w-full border border-slate-200 text-slate-700 font-semibold py-3.5 rounded-xl hover:bg-slate-50 transition-colors text-sm flex items-center justify-center">
              Track Your Order
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      <div className="max-w-6xl mx-auto px-3 xs:px-4 pt-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <Link href="/marketplace" className="hover:text-blue-600">Home</Link>
          <span>/</span>
          <Link href="/marketplace/cart" className="hover:text-blue-600">Cart</Link>
          <span>/</span>
          <span className="text-slate-900 font-medium">Checkout</span>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-0 mb-8 bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          {STEPS.map((s, i) => {
            const done = i < stepIndex;
            const active = s.id === step;
            return (
              <React.Fragment key={s.id}>
                <button
                  onClick={() => done && setStep(s.id)}
                  className={`flex items-center gap-2.5 flex-1 justify-center py-2 rounded-xl text-sm font-semibold transition-all ${
                    active ? 'bg-blue-600 text-white shadow-md' : done ? 'text-blue-600 hover:bg-blue-50' : 'text-slate-400 cursor-default'
                  }`}
                >
                  <s.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{s.label}</span>
                  {done && <CheckCircle2 className="w-4 h-4" />}
                </button>
                {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />}
              </React.Fragment>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form Area */}
          <div className="lg:col-span-2">

            {/* STEP 1: Address */}
            {step === 'address' && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-black text-xl text-slate-900 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-600" /> Delivery Address
                  </h2>
                  <span className="text-xs font-bold text-slate-400 shrink-0 mt-1.5">
                    {country.flag} {country.name}
                  </span>
                </div>

                {/* Fields come from the region's address specification — Qatar's
                    building/street/zone numbering, India's PIN-led form, and so on. */}
                <AddressForm value={address} onChange={setAddress} errors={addressErrors} />

                <div className="flex gap-3">
                  {['Home', 'Work', 'Other'].map((t) => (
                    <button key={t} className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
                      {t}
                    </button>
                  ))}
                </div>

                <button
                  onClick={continueFromAddress}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  Continue to Payment <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* STEP 2: Payment */}
            {step === 'payment' && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-black text-xl text-slate-900 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-blue-600" /> Payment Method
                  </h2>
                  <span className="text-xs font-bold text-slate-400 shrink-0 mt-1.5">
                    Paying in {country.currency.code}
                  </span>
                </div>

                {/* Methods that actually clear in this market, domestic scheme
                    first — Himyan/NAPS in Qatar, UPI in India, KNET in Kuwait. */}
                <PaymentMethodSelector
                  value={payMethod}
                  onChange={setPayMethod}
                  amount={total}
                  module="marketplace"
                  walletBalance={walletBalance}
                />

                {/* ── Wallet Balance Toggle ─────────────────────────── */}
                <div className="border border-blue-100 bg-blue-50/50 rounded-xl p-4 space-y-3">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">Use KARTSEEK Wallet</p>
                        <p className="text-xs text-slate-500">
                          {walletBalance > 0
                            ? <>Available: <span className="font-bold text-blue-600">{fmt(walletBalance)}</span></>
                            : 'No wallet balance available'}
                        </p>
                      </div>
                    </div>
                    <div className="relative">
                      <input type="checkbox" checked={useWallet} disabled={walletBalance <= 0} onChange={(e) => {
                        setUseWallet(e.target.checked);
                        if (e.target.checked) {
                          const maxApplicable = Math.min(walletBalance, subtotal - couponDiscount - loyaltyDiscount);
                          setWalletAmount(Math.max(0, maxApplicable));
                        } else { setWalletAmount(0); }
                      }} className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-200 peer-checked:bg-blue-600 peer-disabled:opacity-40 rounded-full transition-colors" />
                      <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow peer-checked:translate-x-5 transition-transform" />
                    </div>
                  </label>
                  {useWallet && walletAmount > 0 && (
                    <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-blue-200">
                      <span className="text-xs text-slate-600">Wallet deduction</span>
                      <span className="text-sm font-black text-blue-600">− {fmt(walletAmount)}</span>
                    </div>
                  )}
                </div>

                {/* ── Loyalty Points Redemption ─────────────────────── */}
                <div className="border border-amber-100 bg-amber-50/50 rounded-xl p-4 space-y-3">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center">
                        <Star className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">Redeem Loyalty Points</p>
                        <p className="text-xs text-slate-500">
                          {loyaltyPoints > 0 ? `${loyaltyPoints} pts available` : 'No points available'}
                          {loyaltyTier && <> · <span className="font-bold text-amber-600">{loyaltyTier}</span> tier</>}
                        </p>
                      </div>
                    </div>
                    <div className="relative">
                      <input type="checkbox" checked={useLoyalty} disabled={loyaltyPoints <= 0} onChange={(e) => {
                        setUseLoyalty(e.target.checked);
                        if (e.target.checked) {
                          setLoyaltyPointsToRedeem(Math.min(loyaltyPoints, (subtotal - couponDiscount - walletAmount) * 10));
                        } else { setLoyaltyPointsToRedeem(0); }
                      }} className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-200 peer-checked:bg-amber-500 peer-disabled:opacity-40 rounded-full transition-colors" />
                      <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow peer-checked:translate-x-5 transition-transform" />
                    </div>
                  </label>
                  {useLoyalty && loyaltyDiscount > 0 && (
                    <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-amber-200">
                      <span className="text-xs text-slate-600">{loyaltyPointsToRedeem} pts redeemed</span>
                      <span className="text-sm font-black text-amber-600">− {fmt(loyaltyDiscount)}</span>
                    </div>
                  )}
                </div>

                {payMethod === 'upi' && (
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="upi-id">UPI ID</label>
                    <input id="upi-id" placeholder="e.g. name@paytm" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-400 outline-none font-mono" />
                  </div>
                )}
                {(payMethod === 'card' || payMethod === 'debit_national' || payMethod === 'mada' || payMethod === 'knet' || payMethod === 'benefit') && (
                  /**
                   * Card capture is NOT implemented. These inputs hold no state, are
                   * wired to no gateway, and nothing they contain is ever submitted.
                   *
                   * They are disabled rather than merely inert, because an enabled
                   * field is an invitation: a customer can type a real PAN and CVV
                   * into a form that silently discards them, and the browser will
                   * happily persist that number in autofill. Collecting card data
                   * into this page would also pull the whole app into PCI scope —
                   * the real integration belongs in the gateway's hosted fields or
                   * tokenisation SDK, where the PAN never touches our DOM.
                   *
                   * `disabled` also keeps the values out of any form serialisation
                   * or error report that might otherwise carry them off the device.
                   */
                  <fieldset disabled className="space-y-4" aria-describedby="card-pending-note">
                    <div
                      id="card-pending-note"
                      className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3"
                    >
                      <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-900 leading-relaxed">
                        <span className="font-bold">Card payment isn&apos;t available yet.</span>{' '}
                        Please don&apos;t enter card details — this form is not connected to a
                        payment provider. Choose another payment method to continue.
                      </p>
                    </div>
                    <div>
                      <label htmlFor="cc-number" className="block text-sm font-bold text-slate-400 mb-1.5">Card Number</label>
                      <input
                        id="cc-number"
                        name="cardNumber"
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder="1234 5678 9012 3456"
                        maxLength={19}
                        className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm outline-none font-mono text-slate-400 cursor-not-allowed"
                      />
                    </div>
                    {/* Name on card — required by every card network for
                        authorisation, and simply absent from this form before. */}
                    <div>
                      <label htmlFor="cc-name" className="block text-sm font-bold text-slate-400 mb-1.5">Name on Card</label>
                      <input
                        id="cc-name"
                        name="cardholderName"
                        autoComplete="off"
                        placeholder="As printed on the card"
                        className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm outline-none text-slate-400 cursor-not-allowed"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="cc-exp" className="block text-sm font-bold text-slate-400 mb-1.5">Expiry</label>
                        <input
                          id="cc-exp"
                          name="cardExpiry"
                          inputMode="numeric"
                          autoComplete="off"
                          placeholder="MM / YY"
                          maxLength={7}
                          className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm outline-none font-mono text-slate-400 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label htmlFor="cc-csc" className="block text-sm font-bold text-slate-400 mb-1.5">CVV</label>
                        <input
                          id="cc-csc"
                          name="cardCvv"
                          inputMode="numeric"
                          autoComplete="off"
                          placeholder="•••"
                          maxLength={4}
                          type="password"
                          className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm outline-none font-mono text-slate-400 cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </fieldset>
                )}

                <button onClick={() => setStep('review')} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md">
                  Review Order <ChevronRight className="w-5 h-5" />
                </button>
                <button onClick={() => setStep('address')} className="w-full text-sm text-slate-500 hover:text-slate-700 transition-colors">← Back to Address</button>
              </div>
            )}

            {/* STEP 3: Review */}
            {step === 'review' && (
              <div className="space-y-5">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
                  <h2 className="font-black text-xl text-slate-900 flex items-center gap-2">
                    <Package className="w-5 h-5 text-blue-600" /> Review Your Order
                  </h2>

                  {/* Promised window in the region's own clock and zone — a Doha
                      customer sees Doha time whatever their device is set to. */}
                  <div className="flex items-center gap-2 text-xs bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                    <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-emerald-800 font-bold">
                      Arriving {deliveryWindow.dayLabel} · all times {timezoneLabel} ({country.timezone})
                    </span>
                  </div>

                  <div className="divide-y divide-slate-50">
                    {orderItems.map((item, i) => {
                      const itemWindow = getDeliveryWindow((48 + i * 24) * 60, (72 + i * 24) * 60);
                      const deliveryStr = itemWindow.dayLabel;
                      return (
                        <div key={i} className="flex items-center gap-4 py-4">
                          <div className="w-14 h-14 bg-linear-to-br from-blue-50 to-indigo-50 rounded-xl border border-slate-100 flex items-center justify-center shrink-0">
                            <Package className="w-6 h-6 text-blue-300" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-900 text-sm truncate">{item.title}</p>
                            <p className="text-xs text-blue-600 font-medium">{item.brand} · Qty: {item.qty}</p>
                            <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3" /> Est. delivery: {deliveryStr}
                            </p>
                          </div>
                          <p className="font-bold text-slate-900 shrink-0">{fmt(item.price * item.qty)}</p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
                    <div className="flex justify-between text-slate-600"><span>Subtotal</span><span className="font-semibold">{fmt(subtotal)}</span></div>
                    {savedMRP > 0 && <div className="flex justify-between text-green-600 font-semibold"><span>Product Discount</span><span>− {fmt(savedMRP)}</span></div>}
                    <div className={`flex justify-between font-semibold ${delivery === 0 ? 'text-green-600' : 'text-slate-600'}`}>
                      <span>Delivery</span><span>{delivery === 0 ? 'FREE' : fmt(delivery)}</span>
                    </div>
                    {couponDiscount > 0 && <div className="flex justify-between text-green-600 font-semibold"><span>Coupon</span><span>− {fmt(couponDiscount)}</span></div>}
                    {giftCardAmount > 0 && <div className="flex justify-between text-purple-600 font-semibold"><span>Gift Card</span><span>− {fmt(giftCardAmount)}</span></div>}
                    {walletAmount > 0 && <div className="flex justify-between text-blue-600 font-semibold"><span>Wallet</span><span>− {fmt(walletAmount)}</span></div>}
                    {loyaltyDiscount > 0 && <div className="flex justify-between text-amber-600 font-semibold"><span>Loyalty Points</span><span>− {fmt(loyaltyDiscount)}</span></div>}
                    {/* Only where a consumption tax actually applies. Qatar has no
                        VAT, so printing "VAT 0.00" there would be misleading. */}
                    {tax.applies && (
                      <div className="flex justify-between text-slate-600">
                        <span>{tax.label}{tax.inclusive ? ' (included)' : ''}</span>
                        <span className="font-semibold">{fmt(tax.taxAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-black text-slate-900 text-base pt-2 border-t border-slate-200">
                      <span>Total</span>
                      <span>{fmt(tax.applies && !tax.inclusive ? tax.grossAmount : total)}</span>
                    </div>
                  </div>

                  {savedMRP > 0 && (
                    <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-green-600 shrink-0" />
                      <p className="text-xs text-green-700 font-bold">You&apos;re saving {fmt(savedMRP)} on this order!</p>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs text-slate-500 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
                    <ShieldCheck className="w-4 h-4 text-green-500 shrink-0" />
                    Your payment is secured by 256-bit SSL encryption
                  </div>

                  {/* Points to earn preview */}
                  <div className="flex items-center gap-2 text-xs bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                    <Gift className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="text-amber-700 font-bold">🎁 You&apos;ll earn ~{estimatedPointsEarn} loyalty points with this order!</span>
                  </div>
                </div>

                {/* Tax invoice — only where the market has a tax registration to
                    quote. Qatar levies no VAT, so there is no GSTIN-equivalent to
                    collect and the whole section is omitted rather than asking a
                    Doha customer for an Indian tax number. */}
                {country.code === 'IN' && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                  <button onClick={() => setShowGst(!showGst)} className="w-full flex items-center justify-between">
                    <span className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                      <FileText className="w-4 h-4 text-blue-600" /> Need a GST Invoice?
                    </span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showGst ? 'rotate-180' : ''}`} />
                  </button>
                  {showGst && (
                    <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                      <p className="text-xs text-slate-500">Enter your GSTIN to receive a GST-compliant invoice for this order.</p>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="gstin">GSTIN</label>
                        <input id="gstin" value={gstin} onChange={e => validateGstin(e.target.value)} placeholder="e.g. 22AAAAA0000A1Z5" maxLength={15} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:border-blue-400 outline-none uppercase" />
                        {gstError && <p className="text-xs text-red-500 mt-1">{gstError}</p>}
                        {gstin.length === 15 && !gstError && <p className="text-xs text-green-600 font-semibold mt-1">✓ Valid GSTIN format</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="company-business-name">Company / Business Name</label>
                        <input id="company-business-name" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="e.g. Acme Pvt. Ltd." className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-400 outline-none" />
                      </div>
                      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5">
                        <p className="text-xs text-blue-700">GST invoice with input tax credit details will be emailed after delivery.</p>
                      </div>
                    </div>
                  )}
                </div>
                )}

                {orderError && <p className="text-sm text-red-600 font-semibold text-center bg-red-50 border border-red-100 rounded-lg py-2 px-3">{orderError}</p>}
                <button
                  onClick={handlePlaceOrder}
                  disabled={placing}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md text-lg"
                >
                  {placing ? <><Loader2 className="w-5 h-5 animate-spin" /> Placing Order…</> : <>Place Order — {fmt(total)}</>}
                </button>
                <button onClick={() => setStep('payment')} className="w-full text-sm text-slate-500 hover:text-slate-700 transition-colors">← Back to Payment</button>
              </div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 lg:sticky lg:top-[calc(var(--mp-header-h)+1rem)]">
              <h2 className="font-bold text-slate-900 mb-4 pb-3 border-b border-slate-100">
                Order ({orderItems.reduce((s, i) => s + i.qty, 0)} {orderItems.reduce((s, i) => s + i.qty, 0) === 1 ? 'item' : 'items'})
              </h2>
              <div className="space-y-3">
                {orderItems.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-slate-600 truncate pr-2">{item.title.slice(0, 28)}… ×{item.qty}</span>
                    <span className="font-semibold text-slate-900 shrink-0">{fmt(item.price * item.qty)}</span>
                  </div>
                ))}
              </div>

              {/* Coupon Apply Section */}
              <div className="border-t border-slate-100 mt-4 pt-4">
                {couponApplied ? (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-green-600" />
                      <div>
                        <span className="text-xs font-bold text-green-700">{couponApplied}</span>
                        <span className="text-xs text-green-600 ml-1">applied</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-green-700">-{fmt(couponDiscount)}</span>
                      <button onClick={() => { setCouponApplied(''); setCouponDiscount(0); setCouponCode(''); }} className="text-slate-400 hover:text-red-500">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button onClick={() => setShowCoupon(!showCoupon)} className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors w-full">
                      <Tag className="w-4 h-4" /> Apply Coupon / Promo Code
                    </button>
                    {showCoupon && (
                      <div className="mt-3">
                        <div className="flex gap-2">
                          <input
                            value={couponCode}
                            onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); }}
                            placeholder="Enter code"
                            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono uppercase outline-none focus:border-blue-400"
                          />
                          <button
                            onClick={async () => {
                              if (!couponCode.trim()) return;
                              setCouponLoading(true);
                              setCouponError('');
                              try {
                                const res = await validateCoupon({ code: couponCode.trim(), cartTotal: subtotal });
                                if (res?.valid) {
                                  setCouponDiscount(res.discount || 0);
                                  setCouponApplied(couponCode.trim());
                                  setShowCoupon(false);
                                } else {
                                  setCouponError(res?.message || 'Invalid coupon code');
                                }
                              } catch {
                                setCouponError('Could not validate coupon. Try again.');
                              }
                              setCouponLoading(false);
                            }}
                            disabled={!couponCode.trim() || couponLoading}
                            className="bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-lg disabled:opacity-50 flex items-center gap-1"
                          >
                            {couponLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Apply'}
                          </button>
                        </div>
                        {couponError && <p className="text-xs text-red-500 mt-1.5">{couponError}</p>}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Gift Card */}
              <div className="border-t border-slate-100 mt-4 pt-4">
                {giftCardApplied ? (
                  <div className="flex items-center justify-between bg-purple-50 border border-purple-200 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Gift className="w-4 h-4 text-purple-600" />
                      <div>
                        <span className="text-xs font-bold text-purple-700">{giftCardApplied}</span>
                        <span className="text-xs text-purple-600 ml-1">· balance {fmt(giftCardBalance)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-purple-700">-{fmt(giftCardAmount)}</span>
                      <button
                        onClick={() => { setGiftCardApplied(''); setGiftCardBalance(0); setGiftCardCode(''); }}
                        className="text-slate-400 hover:text-red-500"
                        aria-label="Remove gift card"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex gap-2">
                      <input
                        value={giftCardCode}
                        onChange={e => { setGiftCardCode(e.target.value.toUpperCase()); setGiftCardError(''); }}
                        placeholder="Gift card code"
                        className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono uppercase outline-none focus:border-purple-400"
                      />
                      <button
                        onClick={async () => {
                          const code = giftCardCode.trim();
                          if (!code) return;
                          setGiftCardChecking(true);
                          setGiftCardError('');
                          try {
                            const res: any = await getGiftCardBalance(code);
                            const card = res?.data ?? res;
                            const balance = Number(card?.currentBalance) || 0;
                            if (balance <= 0) {
                              setGiftCardError('This gift card has no remaining balance.');
                            } else {
                              setGiftCardBalance(balance);
                              setGiftCardApplied(code);
                            }
                          } catch (err: any) {
                            setGiftCardError(err?.message || 'We could not find that gift card.');
                          } finally {
                            setGiftCardChecking(false);
                          }
                        }}
                        disabled={!giftCardCode.trim() || giftCardChecking}
                        className="bg-purple-600 text-white text-xs font-bold px-4 py-2 rounded-lg disabled:opacity-50 flex items-center gap-1"
                      >
                        {giftCardChecking ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Apply'}
                      </button>
                    </div>
                    {giftCardError && <p className="text-xs text-red-500 mt-1.5">{giftCardError}</p>}
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 mt-4 pt-4 flex justify-between font-black text-slate-900">
                <span>Total</span><span>{fmt(total)}</span>
              </div>
              {delivery === 0 ? (
                <p className="text-xs text-green-600 font-semibold mt-1">Free delivery included</p>
              ) : (
                <p className="text-xs text-slate-500 mt-1">
                  Includes {fmt(delivery)} delivery · add {fmt(amountToFreeDelivery(subtotal))} more for free delivery
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
