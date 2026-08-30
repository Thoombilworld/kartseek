'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ZoneLink } from '@/components/zone-link';
import { useParams, useRouter } from 'next/navigation';
import { getOrderById, cancelOrder, getSellerById } from '@/lib/api/marketplace';
import { useToast } from '@/lib/contexts/toast-context';
import {
  Package, Truck, CheckCircle, XCircle, RotateCcw, Clock, MapPin,
  CreditCard, ArrowLeft, Phone, Star, Download, HelpCircle,
  X, Camera, FileText, AlertTriangle, MessageSquare, Sparkles,
} from 'lucide-react';
import { useRegion } from '@/lib/contexts/region-context';
import { formatDate as fd, formatDateTime as fdt } from '@/lib/utils';
import {
  ORDER_PROGRESSION, ORDER_STATUS_UI, normaliseOrderStatus,
  orderProgressIndex, isCancellable, isReturnable, paymentStatusLabel,
} from '@/lib/marketplace/order-status';

import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
import { productPath } from '@/lib/marketplace/product-url';
/**
 * The delivery address is persisted as a JSON *string* on the order, not as a
 * nested object, and its keys are `line`/`city`/`state`/`pin` — none of which
 * matched the `shippingAddress.line1`/`postalCode` this page used to read. The
 * address block therefore rendered four blank lines on every order.
 */
function parseAddress(raw: unknown): { line: string; city: string; state: string; pin: string; country: string } {
  if (!raw) return { line: '', city: '', state: '', pin: '', country: '' };
  let obj: Record<string, any> = {};
  if (typeof raw === 'string') {
    try { obj = JSON.parse(raw); } catch { return { line: raw, city: '', state: '', pin: '', country: '' }; }
  } else if (typeof raw === 'object') {
    obj = raw as Record<string, any>;
  }
  return {
    line: obj.line ?? obj.line1 ?? obj.address ?? '',
    city: obj.city ?? '',
    state: obj.state ?? '',
    pin: obj.pin ?? obj.pincode ?? obj.postalCode ?? '',
    country: obj.country ?? '',
  };
}

/**
 * Maps the backend MarketplaceOrder → the shape this page renders.
 *
 * Every money field was read under a name the gateway does not send —
 * `itemTotal`, `grandTotal` and `discountAmount` against the actual `subtotal`,
 * `totalAmount` and `discount` — so the entire Price Details panel showed
 * ₹0.00 on orders worth lakhs. Same story for `createdAt` (it is `placedAt`),
 * which is where "Invalid Date" came from.
 */
interface OrderLine {
  name: string;
  qty: number;
  price: number;
  productId: string;
  seller: string;
}

type NormalizedOrder = ReturnType<typeof normalizeOrder>;

function normalizeOrder(ord: any) {
  const status = normaliseOrderStatus(ord.status);
  const placedAt = ord.placedAt ?? ord.createdAt ?? null;
  const addr = parseAddress(ord.deliveryAddress ?? ord.shippingAddress);
  const items: OrderLine[] = (ord.items || []).map((it: any) => ({
    name: it.name || 'Product',
    qty: Number(it.quantity ?? it.qty ?? 1),
    price: Number(it.price ?? it.unitPrice ?? 0),
    productId: it.productId || '',
    seller: ord.seller?.businessName || ord.seller?.name || 'Seller',
  }));

  const subtotal = Number(ord.subtotal ?? ord.itemTotal ?? items.reduce((s: number, i: any) => s + i.price * i.qty, 0));
  const curIdx = orderProgressIndex(status);
  const timeline = status === 'cancelled'
    ? [{ status: 'Order Placed', date: placedAt, done: true }, { status: 'Cancelled', date: ord.updatedAt, done: true }]
    : ORDER_PROGRESSION.map((s, i) => ({
      status: ORDER_STATUS_UI[s].label,
      // Only the first and current steps have a timestamp we can stand behind;
      // the rest are future stages and must not borrow the order's own date.
      date: i === 0 ? placedAt : (i === curIdx ? ord.updatedAt : ''),
      done: curIdx >= 0 && i <= curIdx,
    }));

  return {
    id: ord.orderNumber || ord.id,
    date: placedAt,
    status,
    paymentMethod: ord.paymentMethod || '—',
    paymentStatus: ord.paymentStatus || ord.escrowStatus || '—',
    address: {
      name: ord.customerName || 'Customer',
      line1: addr.line,
      line2: [addr.city, addr.state, addr.pin].filter(Boolean).join(', '),
      phone: ord.customerPhone || '',
    },
    items,
    subtotal,
    deliveryFee: Number(ord.deliveryFee ?? 0),
    discount: Number(ord.discount ?? ord.discountAmount ?? 0),
    walletDeduction: Number(ord.walletDeduction ?? 0),
    total: Number(ord.totalAmount ?? ord.grandTotal ?? subtotal),
    estimatedDeliveryAt: ord.estimatedDeliveryAt ?? null,
    timeline,
    trackingId: ord.trackingId || null,
    courier: ord.courierName || null,
  };
}

export default function OrderDetailPage() {
  const { formatCurrencyValue: fp } = useRegion();
  const toast = useToast();
  const params = useParams();
  const router = useRouter();
  const oid = params?.id as string;

  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [returnStep, setReturnStep] = useState(0);
  const [returnReason, setReturnReason] = useState('');
  const [returnRefundMethod, setReturnRefundMethod] = useState<'original' | 'wallet'>('original');
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [returnSubmitted, setReturnSubmitted] = useState(false);

  // Typed rather than `any` so `o.status` narrows to `OrderStatus` and indexing
  // ORDER_STATUS_UI with it is checked instead of silently implicit-any.
  const [o, setO] = useState<NormalizedOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  /**
   * Cancel the order.
   *
   * The button was rendered with no handler beside "Rate & Review" and
   * "Return / Replace", both of which worked — so cancelling was the one action
   * on this screen that silently did nothing. `cancelOrder` has existed in the
   * API layer the whole time.
   */
  async function handleCancelOrder() {
    if (cancelling) return;
    const reason = window.prompt('Why are you cancelling this order?')?.trim();
    // A null return means the customer dismissed the prompt — not a cancellation.
    if (reason === undefined || reason === null) return;

    setCancelling(true);
    try {
      await cancelOrder(oid, reason || 'Cancelled by customer');
      toast.success('Order cancelled.');
      const res: any = await getOrderById(oid);
      const raw = res?.data ?? res?.order ?? res;
      if (raw && !raw.statusCode && !raw.error) setO(normalizeOrder(raw));
    } catch (e: any) {
      toast.error(e?.message || 'We could not cancel this order. Please try again.');
    } finally {
      setCancelling(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res: any = await getOrderById(oid);
        const raw = res?.data ?? res?.order ?? res;
        if (cancelled) return;
        if (!raw || raw.statusCode || raw.error) { setO(null); return; }

        const order = normalizeOrder(raw);
        setO(order);

        // The order carries a `sellerId` but no seller name, so "Sold by" read
        // a literal "Seller" on every line. Resolved separately and folded in
        // once it arrives — a failure here must not blank out the order itself.
        if (raw.sellerId) {
          try {
            const s: any = await getSellerById(raw.sellerId);
            const name = s?.businessName ?? s?.data?.businessName ?? s?.name ?? s?.data?.name;
            if (!cancelled && name) {
              setO((prev) => (prev ? { ...prev, items: prev.items.map((it) => ({ ...it, seller: name })) } : prev));
            }
          } catch { /* keep the placeholder name */ }
        }
      } catch {
        if (!cancelled) setO(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [oid]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-100 rounded w-1/3" />
          <div className="h-40 bg-slate-100 rounded-lg" />
          <div className="h-40 bg-slate-100 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!o) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <Package className="w-14 h-14 text-slate-200 mx-auto mb-4" />
        <h1 className="text-xl font-black text-slate-900 mb-2">Order not found</h1>
        <p className="text-slate-500 text-sm mb-6">We couldn&apos;t find order {oid}. It may have been removed, or you may need to sign in.</p>
        <Link href="/orders" className="inline-block bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700">View My Orders</Link>
      </div>
    );
  }


  const RETURN_REASONS = [
    'Product damaged on delivery',
    'Wrong item received',
    'Product not as described',
    'Quality not satisfactory',
    'Changed my mind',
    'Better price elsewhere',
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <button title="Go back" onClick={() => router.back()} className="p-2 rounded-lg hover:bg-slate-100"><ArrowLeft className="w-5 h-5 text-slate-600" /></button>
        <div className="flex-1">
          <h1 className="text-xl font-black text-slate-900">Order {o.id}</h1>
          <p className="text-xs text-slate-500 mt-0.5">Placed on {fdt(o.date)}</p>
        </div>
        <span className={`text-xs font-bold px-3 py-1 rounded-sm border ${ORDER_STATUS_UI[o.status].badgeClass}`}>
          {ORDER_STATUS_UI[o.status].label}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/50"><h2 className="font-bold text-slate-900">Order Items</h2></div>
            <div className="divide-y divide-slate-100">
              {o.items.map((it: any, i: number) => (
                <div key={i} className="flex items-start gap-4 px-5 py-4">
                  <div className="w-14 h-14 bg-slate-100 rounded-lg flex items-center justify-center"><Package className="w-6 h-6 text-slate-400" /></div>
                  <div className="flex-1 min-w-0">
                    <Link href={productPath({ id: it.productId, name: it.name })} className="text-sm font-semibold text-slate-800 hover:text-blue-600">{it.name}</Link>
                    <p className="text-xs text-slate-500 mt-0.5">Sold by: {it.seller} &middot; Qty: {it.qty}</p>
                    <div className="flex gap-3 mt-2">
                      {isReturnable(o.status) && <button onClick={() => setShowReviewModal(true)} className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1 min-h-[44px] pr-2"><Star className="w-3 h-3" />Rate & Review</button>}
                      {isReturnable(o.status) && <button onClick={() => { setShowReturnModal(true); setReturnStep(0); setReturnSubmitted(false); }} className="text-[11px] font-bold text-violet-600 hover:underline flex items-center gap-1 min-h-[44px] pr-2"><RotateCcw className="w-3 h-3" />Return / Replace</button>}
                      {isCancellable(o.status) && <button onClick={handleCancelOrder} disabled={cancelling} className="text-[11px] font-bold text-red-600 hover:underline disabled:text-slate-400 disabled:no-underline flex items-center gap-1 min-h-[44px] pr-2"><XCircle className="w-3 h-3" />{cancelling ? 'Cancelling…' : 'Cancel'}</button>}
                    </div>
                  </div>
                  <p className="text-sm font-bold text-slate-900">{fp(it.price)}</p>
                </div>
              ))}
            </div>
          </div>
          {/* Timeline */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/50"><h2 className="font-bold text-slate-900">Order Timeline</h2></div>
            <div className="px-5 py-4">
              {o.timeline.map((s: any, i: number) => (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${s.done ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                      {s.done ? <CheckCircle className="w-4 h-4 text-white" /> : <div className="w-2 h-2 rounded-full bg-slate-400" />}
                    </div>
                    {i < o.timeline.length - 1 && <div className={`w-0.5 h-8 ${s.done ? 'bg-emerald-300' : 'bg-slate-200'}`} />}
                  </div>
                  <div className="pb-6">
                    <p className={`text-sm font-semibold ${s.done ? 'text-slate-800' : 'text-slate-400'}`}>{s.status}</p>
                    {s.date && <p className="text-xs text-slate-500 mt-0.5">{fdt(s.date)}</p>}
                  </div>
                </div>
              ))}
              {o.trackingId && <div className="mt-2 p-3 bg-blue-50 rounded-md border border-blue-100"><p className="text-xs text-blue-800 font-semibold">Tracking: {o.trackingId}</p><p className="text-xs text-blue-600">Courier: {o.courier}</p></div>}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Price */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/50"><h2 className="font-bold text-slate-900">Price Details</h2></div>
            <div className="px-5 py-4 space-y-2.5 text-sm">
              <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{fp(o.subtotal)}</span></div>
              <div className="flex justify-between text-slate-600"><span>Delivery</span><span className={o.deliveryFee === 0 ? 'text-green-600 font-bold' : ''}>{o.deliveryFee === 0 ? 'FREE' : fp(o.deliveryFee)}</span></div>
              {o.discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-{fp(o.discount)}</span></div>}
              {o.walletDeduction > 0 && <div className="flex justify-between text-green-600"><span>Wallet</span><span>-{fp(o.walletDeduction)}</span></div>}
              <div className="border-t border-slate-200 pt-2.5 flex justify-between font-black text-slate-900"><span>Total</span><span>{fp(o.total)}</span></div>
              {o.estimatedDeliveryAt && !ORDER_STATUS_UI[o.status].terminal && (
                <p className="text-xs text-slate-500 pt-1">Arriving by <span className="font-semibold text-slate-700">{fd(o.estimatedDeliveryAt)}</span></p>
              )}
            </div>
          </div>
          {/* Address */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/50"><h2 className="font-bold text-slate-900 flex items-center gap-2"><MapPin className="w-4 h-4 text-slate-500" />Delivery Address</h2></div>
            <div className="px-5 py-4 text-sm space-y-1">
              <p className="font-semibold text-slate-800">{o.address.name}</p>
              {o.address.line1 ? <p className="text-slate-600">{o.address.line1}</p> : null}
              {o.address.line2 ? <p className="text-slate-600">{o.address.line2}</p> : null}
              {o.address.phone ? (
                <p className="text-slate-500 flex items-center gap-1"><Phone className="w-3 h-3" />{o.address.phone}</p>
              ) : null}
              {!o.address.line1 && !o.address.line2 && (
                <p className="text-slate-400 italic">No delivery address was recorded for this order.</p>
              )}
            </div>
          </div>
          {/* Payment */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/50"><h2 className="font-bold text-slate-900 flex items-center gap-2"><CreditCard className="w-4 h-4 text-slate-500" />Payment</h2></div>
            <div className="px-5 py-4 text-sm">
              <p className="text-slate-700 font-medium">{o.paymentMethod}</p>
              {(() => {
                const pay = paymentStatusLabel(o.paymentMethod, o.paymentStatus);
                const tone = pay.tone === 'positive' ? 'text-emerald-600'
                  : pay.tone === 'warning' ? 'text-amber-600' : 'text-slate-500';
                return <p className={`font-bold text-xs ${tone}`}>{pay.label}</p>;
              })()}
            </div>
          </div>
          <div className="space-y-2">
            {/* The real invoice, not the modal that used to open here.
                `InvoiceModal` renders an Indian GST document — GSTIN, PAN, CIN,
                HSN codes, CGST/SGST and place-of-supply state codes — and this
                page fed it hardcoded values: "KARTSEEK India Pvt. Ltd.", a
                Bangalore address and the GSTIN 29AADCK1234A1Z5, none of which
                exist. Every Qatari order displayed an Indian tax invoice for a
                fabricated entity.

                `/invoice` reads the order's real invoice from the API, names the
                merchant who actually sold the goods, and labels their tax
                registration by their own jurisdiction. */}
            <Link
              href={`/orders/${encodeURIComponent(oid)}/invoice`}
              className="w-full py-2.5 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />View Invoice
            </Link>
            {isReturnable(o.status) && <button onClick={() => { setShowReturnModal(true); setReturnStep(0); setReturnSubmitted(false); }} className="w-full py-2.5 border border-violet-200 rounded-lg text-sm font-bold text-violet-600 hover:bg-violet-50 flex items-center justify-center gap-2"><RotateCcw className="w-4 h-4" />Return / Replace</button>}
            <ZoneLink href={`/support?orderId=${o.id}`} className="w-full py-2.5 border border-amber-200 rounded-lg text-sm font-bold text-amber-700 hover:bg-amber-50 flex items-center justify-center gap-2"><AlertTriangle className="w-4 h-4" />File Dispute</ZoneLink>
            <ZoneLink href="/support" className="w-full py-2.5 border border-slate-200 rounded-lg text-sm font-bold text-blue-600 hover:bg-blue-50 flex items-center justify-center gap-2"><HelpCircle className="w-4 h-4" />Need Help?</ZoneLink>
          </div>
        </div>
      </div>

      {/* ── Return / Replace Modal ──────────────────────────────────────── */}
      {showReturnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowReturnModal(false)} ><DismissOnEscape onDismiss={() => setShowReturnModal(false)} /></div>
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2"><RotateCcw className="w-5 h-5 text-violet-600" /> Return / Replace</h3>
              <button onClick={() => setShowReturnModal(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>

            {returnSubmitted ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle className="w-8 h-8 text-green-500" /></div>
                <h4 className="text-lg font-bold text-slate-900 mb-2">Return Request Submitted!</h4>
                <p className="text-sm text-slate-500 mb-1">Return ID: <span className="font-mono font-bold">RET-{o.id.slice(-5)}</span></p>
                <p className="text-xs text-slate-400 mb-6">Pickup will be scheduled within 24-48 hours.</p>
                <p className="text-xs text-slate-500">Refund to: <span className="font-bold">{returnRefundMethod === 'original' ? 'Original payment method' : 'KARTSEEK Wallet'}</span></p>
                <p className="text-xs text-emerald-600 font-bold mt-1">Expected refund: 5-7 business days</p>
                <button onClick={() => setShowReturnModal(false)} className="mt-6 bg-slate-900 text-white font-bold px-8 py-2.5 rounded-xl text-sm">Done</button>
              </div>
            ) : (
              <>
                {/* Step indicator */}
                <div className="flex gap-2 mb-6">
                  {['Reason', 'Refund Method', 'Confirm'].map((s, i) => (
                    <div key={s} className={`flex-1 h-1.5 rounded-full ${i <= returnStep ? 'bg-violet-500' : 'bg-slate-200'}`} />
                  ))}
                </div>

                {returnStep === 0 && (<div className="space-y-3">
                    <p className="text-sm font-bold text-slate-700 mb-2">Why are you returning this?</p>
                    {RETURN_REASONS.map(r => (
                      <label key={r} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${returnReason === r ? 'border-violet-500 bg-violet-50' : 'border-slate-200 hover:border-slate-300'}`}>
                        <input type="radio" name="reason" checked={returnReason === r} onChange={() => setReturnReason(r)} className="accent-violet-600" />
                        <span className="text-sm text-slate-700">{r}</span>
                      </label>
                    ))}
                    <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center cursor-pointer hover:bg-slate-100">
                      <Camera className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                      <p className="text-xs text-slate-500">Upload photos (optional)</p>
                    </div>
                    <button onClick={() => returnReason && setReturnStep(1)} disabled={!returnReason} className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-40 mt-2">Continue</button>
                  </div>
                )}

                {returnStep === 1 && (<div className="space-y-3">
                    <p className="text-sm font-bold text-slate-700 mb-2">How would you like your refund?</p>
                    {[{ id: 'original' as const, label: 'Original Payment Method', sub: 'Refund in 5-7 business days' }, { id: 'wallet' as const, label: 'KARTSEEK Wallet', sub: 'Instant refund as wallet balance' }].map(m => (
                      <label key={m.id} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${returnRefundMethod === m.id ? 'border-violet-500 bg-violet-50' : 'border-slate-200 hover:border-slate-300'}`}>
                        <input type="radio" name="refund" checked={returnRefundMethod === m.id} onChange={() => setReturnRefundMethod(m.id)} className="accent-violet-600" />
                        <div><p className="text-sm font-bold text-slate-800">{m.label}</p><p className="text-xs text-slate-500">{m.sub}</p></div>
                      </label>
                    ))}
                    <div className="flex gap-3 mt-4">
                      <button onClick={() => setReturnStep(0)} className="flex-1 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl text-sm">Back</button>
                      <button onClick={() => setReturnStep(2)} className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 rounded-xl text-sm">Continue</button>
                    </div>
                  </div>
                )}

                {returnStep === 2 && (
                  <div className="space-y-4">
                    <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                      <div className="flex justify-between text-sm"><span className="text-slate-500">Reason</span><span className="font-bold text-slate-800">{returnReason}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-slate-500">Refund to</span><span className="font-bold text-slate-800">{returnRefundMethod === 'original' ? 'Original payment' : 'KARTSEEK Wallet'}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-slate-500">Refund amount</span><span className="font-bold text-emerald-600">{fp(o.total)}</span></div>
                    </div>
                    <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                      <p className="text-xs text-amber-700"><strong>Pickup:</strong> A courier will be scheduled within 24-48 hours to collect the item.</p>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => setReturnStep(1)} className="flex-1 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl text-sm">Back</button>
                      <button onClick={() => setReturnSubmitted(true)} className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 rounded-xl text-sm">Submit Return</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Rate & Review Modal ──────────────────────────────────────────── */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowReviewModal(false)} ><DismissOnEscape onDismiss={() => setShowReviewModal(false)} /></div>
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2"><Star className="w-5 h-5 text-amber-500" /> Rate & Review</h3>
              <button onClick={() => setShowReviewModal(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>

            {reviewSubmitted ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4"><Sparkles className="w-8 h-8 text-amber-500" /></div>
                <h4 className="text-lg font-bold text-slate-900 mb-2">Thank you for your review!</h4>
                <p className="text-sm text-slate-500 mb-6">Your feedback helps other shoppers make better decisions.</p>
                <button onClick={() => setShowReviewModal(false)} className="bg-slate-900 text-white font-bold px-8 py-2.5 rounded-xl text-sm">Done</button>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="text-center">
                  <p className="text-sm text-slate-600 mb-3">How would you rate this product?</p>
                  <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button key={n} onClick={() => setReviewRating(n)} className="transition-transform hover:scale-110">
                        <Star className={`w-8 h-8 ${n <= reviewRating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                      </button>
                    ))}
                  </div>
                  {reviewRating > 0 && <p className="text-xs text-slate-500 mt-2">{['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][reviewRating]}</p>}
                </div>
                <textarea value={reviewText} onChange={e => setReviewText(e.target.value)} placeholder="Tell us about your experience..." className="w-full border border-slate-200 rounded-xl p-4 text-sm resize-none h-28 outline-none focus:ring-2 focus:ring-amber-200" />
                <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center cursor-pointer hover:bg-slate-100">
                  <Camera className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                  <p className="text-xs text-slate-500">Add photos (optional)</p>
                </div>
                <button onClick={() => setReviewSubmitted(true)} disabled={reviewRating === 0} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-40">Submit Review</button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
