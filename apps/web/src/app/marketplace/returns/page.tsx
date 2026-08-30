'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  RotateCcw, Package, Truck, CheckCircle, Clock, ChevronRight,
  Camera, Upload, X, AlertCircle, MapPin, MessageSquare, DollarSign,
  Search, Filter, ArrowLeft, Shield, RefreshCw, Ban, FileText,
} from 'lucide-react';
import { useRegion } from '@/lib/contexts/region-context';
import { useAuth } from '@/lib/contexts/auth-context';
import { getReturnRequests, getOrders, createReturn, cancelReturn } from '@/lib/api/marketplace';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
type ReturnStatus = 'pending' | 'approved' | 'pickup_scheduled' | 'picked_up' | 'refund_initiated' | 'refund_completed' | 'rejected' | 'cancelled';
type RefundStatus = 'processing' | 'completed' | 'failed';

type ReturnItem = {
  /** The `RET-…` reference shown to the customer. Not a database key. */
  id: string;
  /**
   * The row's uuid — what every `/marketplace/returns/:id/…` route matches on.
   *
   * Kept separate because `id` above is the human-facing return *number*, and
   * sending that to the cancel route matched nothing and 404'd every time.
   */
  recordId: string;
  orderId: string; productName: string; brand: string; price: number;
  reason: string; status: ReturnStatus; requestDate: string;
  pickupDate?: string; refundAmount: number; refundStatus: RefundStatus;
  refundMethod: string; images: string[];
};

/**
 * True for the `ORD-…` reference a customer is actually shown.
 *
 * Three different identifiers describe one order — order-service's uuid, the
 * marketplace projection's uuid, and the `ORD-…` order number — and only the
 * last appears anywhere the customer can look it up.
 */
function isOrderNumber(value: unknown): value is string {
  return typeof value === 'string' && /^ORD-/i.test(value.trim());
}

const RETURN_STATUS: Record<ReturnStatus, { label: string; color: string; icon: React.ElementType; step: number }> = {
  pending: { label: 'Pending Review', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock, step: 1 },
  approved: { label: 'Approved', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: CheckCircle, step: 2 },
  pickup_scheduled: { label: 'Pickup Scheduled', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: Truck, step: 3 },
  picked_up: { label: 'Picked Up', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Package, step: 4 },
  refund_initiated: { label: 'Refund Initiated', color: 'bg-teal-50 text-teal-700 border-teal-200', icon: DollarSign, step: 5 },
  refund_completed: { label: 'Refund Completed', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle, step: 6 },
  rejected: { label: 'Rejected', color: 'bg-red-50 text-red-700 border-red-200', icon: Ban, step: 0 },
  cancelled: { label: 'Cancelled', color: 'bg-slate-100 text-slate-600 border-slate-200', icon: Ban, step: 0 },
};

const TIMELINE_STEPS = ['Request', 'Approved', 'Pickup', 'Picked Up', 'Refund', 'Completed'];

// Maps a backend ReturnRequest.status → this page's ReturnStatus.
function mapReturnStatus(s: string): ReturnStatus {
  switch (String(s || '').toUpperCase()) {
    case 'APPROVED': return 'approved';
    case 'PICKUP_ASSIGNED': return 'pickup_scheduled';
    case 'PICKED_UP': case 'RECEIVED': case 'QC_PASSED': return 'picked_up';
    case 'REFUNDED': case 'REPLACEMENT_SHIPPED': case 'CLOSED': return 'refund_completed';
    case 'REJECTED': case 'QC_FAILED': return 'rejected';
    // Customer-withdrawn. Grouped with the closed states rather than left to
    // the `pending` default, which would keep offering a Cancel button for a
    // return that is already cancelled.
    case 'CANCELLED': return 'cancelled';
    default: return 'pending';
  }
}

// Maps a backend ReturnRequest → the shape this page renders.
function normalizeReturn(r: any): ReturnItem {
  const uiStatus = mapReturnStatus(r.status);
  const refundStatus: RefundStatus = uiStatus === 'refund_completed' ? 'completed' : uiStatus === 'rejected' ? 'failed' : 'processing';
  const resolutionLabel: Record<string, string> = { REFUND: 'Original Payment Method', STORE_CREDIT: 'Store Credit', REPLACEMENT: 'Replacement' };
  const item0 = (r.items && r.items[0]) || {};
  return {
    id: r.returnNumber || r.id,
    recordId: r.id,
    // The return record stores `orderId` as the marketplace projection's uuid,
    // which is not the `ORD-…` reference the customer sees anywhere else, so
    // printing it verbatim gave them a 36-character string they could not match
    // to any order. Only a real order number is shown; the raw uuid is dropped
    // rather than displayed as if it meant something.
    orderId: isOrderNumber(r.order?.orderNumber) ? r.order.orderNumber
      : isOrderNumber(r.orderNumber) ? r.orderNumber
      : isOrderNumber(r.orderId) ? r.orderId
      : '',
    productName: item0.name || 'Returned item',
    brand: item0.brand || '',
    price: Number(item0.unitPrice ?? r.refundAmount ?? 0),
    reason: r.reasonDetail || String(r.reason || '').replace(/_/g, ' ').toLowerCase(),
    status: uiStatus,
    requestDate: r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '',
    pickupDate: r.pickupScheduledAt ? new Date(r.pickupScheduledAt).toLocaleDateString() : undefined,
    refundAmount: Number(r.refundAmount ?? 0),
    refundStatus,
    refundMethod: resolutionLabel[r.resolutionType] || 'Original Payment Method',
    images: r.photoUrls || [],
  };
}

const RETURN_REASONS = [
  'Defective product', 'Received wrong item', 'Received wrong color/size',
  'Product not as described', 'Damaged during delivery', 'Changed my mind',
  'Better price available elsewhere', 'Missing accessories/parts', 'Quality not as expected',
];

// Maps a UI reason label → the backend CreateReturnDto reason enum.
function mapReasonToEnum(reason: string): string {
  const r = reason.toLowerCase();
  if (r.includes('defective') || r.includes('quality')) return 'DEFECTIVE';
  if (r.includes('wrong item')) return 'WRONG_ITEM';
  if (r.includes('color') || r.includes('size') || r.includes('fit')) return 'SIZE_FIT';
  if (r.includes('not as described')) return 'NOT_AS_DESCRIBED';
  if (r.includes('damaged')) return 'DAMAGED';
  return 'OTHER';
}

export default function ReturnsPage() {
  const { formatCurrencyValue: fmt } = useRegion();
  const { user } = useAuth();
  const [returns, setReturns] = useState<ReturnItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | ReturnStatus>('all');
  const [search, setSearch] = useState('');
  const [showInitiate, setShowInitiate] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<ReturnItem | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [initiateStep, setInitiateStep] = useState(1);

  // ── Initiate-return flow state ──
  const [returnableOrders, setReturnableOrders] = useState<any[]>([]);
  const [selRetOrder, setSelRetOrder] = useState<any | null>(null);
  const [retReason, setRetReason] = useState(RETURN_REASONS[0]);
  const [retDetails, setRetDetails] = useState('');
  const [submittingRet, setSubmittingRet] = useState(false);
  const [retError, setRetError] = useState('');

  const loadReturns = useCallback(async () => {
    try {
      const res: any = await getReturnRequests(user?.id ? { customerId: user.id } : {});
      const list = res?.data ?? res?.returns ?? [];
      setReturns(Array.isArray(list) ? list.map(normalizeReturn) : []);
    } catch {
      setReturns([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { loadReturns(); }, [loadReturns]);

  /**
   * Withdraw a pending return.
   *
   * The button that calls this had no handler at all, and there was no customer
   * endpoint to give it — `PUT /returns/:id/status` is restricted to sellers and
   * admins. `PUT /returns/:id/cancel` was added for this, scoped to the
   * requester by the token.
   */
  const handleCancelReturn = useCallback(async (returnId: string) => {
    setCancelling(true);
    setCancelError('');
    try {
      await cancelReturn(returnId);
      // Re-read rather than patching local state: the server decides whether
      // the transition was allowed, and a stale row here would show a return as
      // cancelled that is still open.
      await loadReturns();
      setSelectedReturn(null);
    } catch (err: unknown) {
      setCancelError(err instanceof Error ? err.message : 'Could not cancel this return. Please try again.');
    } finally {
      setCancelling(false);
    }
  }, [loadReturns]);

  // Fetch delivered orders (flattened to items) that are eligible to return
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res: any = await getOrders(user?.id ? { userId: user.id, status: 'DELIVERED' } : { status: 'DELIVERED' });
        const orders = res?.data ?? res?.orders ?? [];
        const flat: any[] = [];
        (Array.isArray(orders) ? orders : []).forEach((o: any) => {
          (o.items || []).forEach((it: any) => flat.push({
            orderId: o.id,
            orderNumber: o.orderNumber || o.id,
            name: it.name || 'Product',
            price: Number(it.unitPrice ?? it.price ?? 0),
            date: (o.createdAt || '').slice(0, 10),
          }));
        });
        if (!cancelled) setReturnableOrders(flat);
      } catch {
        if (!cancelled) setReturnableOrders([]);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  async function submitReturn() {
    if (!user?.id || !selRetOrder) { setRetError('Please select an order to return.'); return; }
    setSubmittingRet(true);
    setRetError('');
    try {
      await createReturn({
        orderId: selRetOrder.orderId,
        reason: mapReasonToEnum(retReason),
        description: retDetails || undefined,
        customerId: user.id,
      });
      setShowInitiate(false);
      setInitiateStep(1);
      setSelRetOrder(null);
      setRetDetails('');
      await loadReturns();
    } catch (err: any) {
      setRetError(err?.message || 'Could not submit your return. Please try again.');
    } finally {
      setSubmittingRet(false);
    }
  }

  const filtered = returns.filter(r => {
    if (filter !== 'all' && r.status !== filter) return false;
    if (search && !r.productName.toLowerCase().includes(search.toLowerCase()) && !r.orderId.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const activeCount = returns.filter(r => !['refund_completed', 'rejected'].includes(r.status)).length;
  const completedCount = returns.filter(r => r.status === 'refund_completed').length;
  const totalRefunded = returns.filter(r => r.refundStatus === 'completed').reduce((s, r) => s + r.refundAmount, 0);

  return (
    <div className="max-w-[1200px] mx-auto px-3 xs:px-4 py-6 space-y-6 pb-mobile-nav">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Link href="/marketplace/orders" className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-slate-500" /></Link>
        <div>
          <h1 className="text-2xl font-black text-slate-900">Returns & Refunds</h1>
          <p className="text-sm text-slate-500">Track return requests and refund status</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4"><p className="text-xl sm:text-2xl font-black text-slate-900">{activeCount}</p><p className="text-xs text-slate-500">Active Returns</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4"><p className="text-xl sm:text-2xl font-black text-emerald-600">{completedCount}</p><p className="text-xs text-slate-500">Completed</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 col-span-2 sm:col-span-1"><p className="text-xl sm:text-2xl font-black text-slate-900 wrap-break-word">{fmt(totalRefunded)}</p><p className="text-xs text-slate-500">Total Refunded</p></div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by product or order ID..." className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white outline-none" /></div>
        <select value={filter} onChange={e => setFilter(e.target.value as any)} className="px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-white" aria-label="Filter">
          <option value="all">All Status</option>
          {Object.entries(RETURN_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button onClick={() => { setInitiateStep(1); setShowInitiate(true); }} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-lg text-sm flex items-center gap-2">
          <RotateCcw className="w-4 h-4" />New Return
        </button>
      </div>

      {/* Return Cards */}
      <div className="space-y-3">
        {loading && [0, 1, 2].map(i => <div key={`sk-${i}`} className="bg-white border border-slate-200 rounded-xl p-5 h-28 animate-pulse" />)}
        {!loading && filtered.map(r => {
          const st = RETURN_STATUS[r.status];
          const stepNum = st.step;
          return (
            <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedReturn(r)} role="button" tabIndex={0} onKeyDown={activateOnKey(() => setSelectedReturn(r))}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="font-bold text-slate-900">{r.productName}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${st.color}`}>{st.label}</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {r.orderId && <>Order: {r.orderId} · </>}Return: {r.id} · Requested: {r.requestDate}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-black text-slate-900">{fmt(r.refundAmount)}</p>
                  <p className={`text-[10px] font-bold ${r.refundStatus === 'completed' ? 'text-emerald-600' : r.refundStatus === 'failed' ? 'text-red-600' : 'text-amber-600'}`}>{r.refundStatus === 'completed' ? '✓ Refunded' : r.refundStatus === 'failed' ? '✗ Not Eligible' : '⟳ Processing'}</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 mb-3"><span className="font-bold">Reason:</span> {r.reason}</p>
              {/* Timeline */}
              {r.status !== 'rejected' && (
                <div className="flex items-center gap-0">
                  {TIMELINE_STEPS.map((step, i) => (
                    <React.Fragment key={i}>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0 ${i + 1 <= stepNum ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`}>{i + 1 <= stepNum ? '✓' : i + 1}</div>
                      {i < TIMELINE_STEPS.length - 1 && <div className={`flex-1 h-0.5 ${i + 1 < stepNum ? 'bg-blue-600' : 'bg-slate-200'}`} />}
                    </React.Fragment>
                  ))}
                </div>
              )}
              {r.status !== 'rejected' && (
                <div className="flex justify-between mt-1">
                  {TIMELINE_STEPS.map((step, i) => <span key={i} className="text-[8px] text-slate-400 text-center" style={{ width: '16.66%' }}>{step}</span>)}
                </div>
              )}
            </div>
          );
        })}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-16 bg-white border border-slate-200 rounded-xl">
            <RotateCcw className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 font-bold">No returns found</p>
            <p className="text-xs text-slate-400 mt-1">Your return requests will appear here</p>
          </div>
        )}
      </div>

      {/* Return Detail Drawer */}
      {selectedReturn && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setSelectedReturn(null)} ><DismissOnEscape onDismiss={() => setSelectedReturn(null)} /></div>
          <div className="fixed right-0 top-0 bottom-0 w-full md:w-[440px] bg-white shadow-2xl z-50 flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <div><h3 className="font-bold text-slate-900">Return Details</h3><p className="text-xs text-slate-400">{selectedReturn.id}</p></div>
              <button onClick={() => setSelectedReturn(null)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Product */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <p className="text-xs text-slate-400 mb-0.5">{selectedReturn.brand}</p>
                <p className="font-bold text-slate-900">{selectedReturn.productName}</p>
                <p className="text-sm font-black text-slate-900 mt-1">{fmt(selectedReturn.price)}</p>
              </div>
              {/* Status */}
              <div className={`rounded-xl p-4 border ${RETURN_STATUS[selectedReturn.status].color}`}>
                <div className="flex items-center gap-2">
                  {React.createElement(RETURN_STATUS[selectedReturn.status].icon, { className: 'w-5 h-5' })}
                  <span className="font-bold">{RETURN_STATUS[selectedReturn.status].label}</span>
                </div>
              </div>
              {/* Timeline Detail */}
              {selectedReturn.status !== 'rejected' && (
                <div className="space-y-0">
                  <p className="text-xs font-bold text-slate-500 uppercase mb-3">Return Timeline</p>
                  {[
                    { step: 'Return Requested', date: selectedReturn.requestDate, done: RETURN_STATUS[selectedReturn.status].step >= 1 },
                    { step: 'Return Approved', date: RETURN_STATUS[selectedReturn.status].step >= 2 ? 'Approved by seller' : '', done: RETURN_STATUS[selectedReturn.status].step >= 2 },
                    { step: 'Pickup Scheduled', date: selectedReturn.pickupDate || '', done: RETURN_STATUS[selectedReturn.status].step >= 3 },
                    { step: 'Product Picked Up', date: RETURN_STATUS[selectedReturn.status].step >= 4 ? 'Quality check passed' : '', done: RETURN_STATUS[selectedReturn.status].step >= 4 },
                    { step: 'Refund Initiated', date: RETURN_STATUS[selectedReturn.status].step >= 5 ? `Via ${selectedReturn.refundMethod}` : '', done: RETURN_STATUS[selectedReturn.status].step >= 5 },
                    { step: 'Refund Completed', date: RETURN_STATUS[selectedReturn.status].step >= 6 ? `${fmt(selectedReturn.refundAmount)} credited` : '', done: RETURN_STATUS[selectedReturn.status].step >= 6 },
                  ].map((t, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full shrink-0 ${t.done ? 'bg-blue-600' : 'bg-slate-200'}`} />
                        {i < 5 && <div className={`w-0.5 h-8 ${t.done ? 'bg-blue-600' : 'bg-slate-200'}`} />}
                      </div>
                      <div className="pb-4">
                        <p className={`text-sm font-bold ${t.done ? 'text-slate-900' : 'text-slate-400'}`}>{t.step}</p>
                        {t.date && <p className="text-[10px] text-slate-400">{t.date}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* Rejected reason */}
              {selectedReturn.status === 'rejected' && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-sm font-bold text-red-800">Return Request Rejected</p>
                  <p className="text-xs text-red-600 mt-1">This product does not qualify for return under our return policy. Items used for more than 7 days are not eligible.</p>
                </div>
              )}
              {/* Details */}
              <div className="space-y-2">
                {[
                  ['Order', selectedReturn.orderId || '—'],
                  ['Reason', selectedReturn.reason],
                  ['Refund Amount', fmt(selectedReturn.refundAmount)],
                  ['Refund Method', selectedReturn.refundMethod],
                  ['Refund Status', selectedReturn.refundStatus === 'completed' ? '✓ Completed' : selectedReturn.refundStatus === 'failed' ? '✗ Not Eligible' : '⟳ Processing'],
                ].map(([l, v], i) => (
                  <div key={i} className="flex justify-between"><span className="text-xs text-slate-500">{l}</span><span className="text-xs font-bold text-slate-900 text-right max-w-[60%]">{v}</span></div>
                ))}
              </div>
              {/* Actions */}
              <div className="space-y-2">
                {selectedReturn.status === 'pending' && (
                  <button
                    type="button"
                    onClick={() => handleCancelReturn(selectedReturn.recordId)}
                    disabled={cancelling}
                    className="w-full bg-red-50 text-red-600 font-bold py-2.5 rounded-xl text-sm border border-red-200 hover:bg-red-100 disabled:opacity-60"
                  >
                    {cancelling ? 'Cancelling…' : 'Cancel Return Request'}
                  </button>
                )}
                {cancelError && (
                  <p className="text-xs text-red-600 text-center" role="alert">{cancelError}</p>
                )}
                {/* Was a dead button. Support lives on the help page, which has
                    the real contact routes. */}
                <Link
                  href="/marketplace/help"
                  className="w-full bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />Contact Support
                </Link>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Initiate Return Modal */}
      {showInitiate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowInitiate(false)} ><DismissOnEscape onDismiss={() => setShowInitiate(false)} /></div>
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto mx-4">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <div><h3 className="text-lg font-black text-slate-900">Initiate Return</h3><p className="text-xs text-slate-500">Step {initiateStep} of 3</p></div>
              <button onClick={() => setShowInitiate(false)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            {/* Step indicator */}
            <div className="px-5 pt-4">
              <div className="flex items-center gap-2">
                {['Select Order', 'Reason & Photos', 'Confirm'].map((label, i) => (
                  <React.Fragment key={i}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${initiateStep > i + 1 ? 'bg-emerald-500 text-white' : initiateStep === i + 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                      {initiateStep > i + 1 ? <CheckCircle className="w-4 h-4" /> : i + 1}
                    </div>
                    {i < 2 && <div className={`flex-1 h-0.5 ${initiateStep > i + 1 ? 'bg-emerald-400' : 'bg-slate-200'}`} />}
                  </React.Fragment>
                ))}
              </div>
            </div>
            <div className="p-5 space-y-4">
              {initiateStep === 1 && (
                <>
                  <p className="text-sm text-slate-600">Select the order and item you wish to return:</p>
                  {returnableOrders.length === 0 && (
                    <div className="text-center py-8 text-sm text-slate-400">No delivered orders are available to return.</div>
                  )}
                  {returnableOrders.map((item, idx) => {
                    const isSel = selRetOrder && selRetOrder.orderId === item.orderId && selRetOrder.name === item.name;
                    return (
                      <button key={`${item.orderId}-${idx}`} onClick={() => setSelRetOrder(item)} className={`w-full text-left rounded-xl p-4 border transition-colors ${isSel ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/30'}`}>
                        <p className="font-bold text-slate-900 text-sm">{item.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">Order: {item.orderNumber} · {item.date} · {fmt(item.price)}</p>
                      </button>
                    );
                  })}
                </>
              )}
              {initiateStep === 2 && (
                <>
                  <div><label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block" htmlFor="reason-for-return">Reason for Return *</label>
                    <select id="reason-for-return" value={retReason} onChange={e => setRetReason(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none" aria-label="Return reason">
                      {RETURN_REASONS.map(r => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                  <div><label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block" htmlFor="additional-details">Additional Details</label>
                    <textarea id="additional-details" value={retDetails} onChange={e => setRetDetails(e.target.value)} rows={3} placeholder="Describe the issue in detail..." className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none resize-none" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Upload Photos (Optional)</label>
                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30">
                      <Camera className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                      <p className="text-xs text-slate-400">Click to upload or drag & drop</p>
                      <p className="text-[10px] text-slate-300 mt-0.5">JPG, PNG up to 5MB each · Max 4 photos</p>
                    </div>
                  </div>
                </>
              )}
              {initiateStep === 3 && (
                <div className="space-y-3">
                  <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
                    <p className="font-bold text-slate-900 mb-2">Review Your Return Request</p>
                    {[['Product', selRetOrder?.name || '—'], ['Order', selRetOrder?.orderNumber || '—'], ['Reason', retReason], ['Refund To', 'Original Payment Method'], ['Expected Refund', selRetOrder ? fmt(selRetOrder.price) : '—']].map(([l, v], i) => (
                      <div key={i} className="flex justify-between"><span className="text-slate-500">{l}</span><span className="font-bold text-slate-900">{v}</span></div>
                    ))}
                  </div>
                  {retError && <p className="text-xs text-red-600 font-semibold text-center">{retError}</p>}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700 flex items-start gap-2">
                    <Shield className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>Your refund will be processed within 5-7 business days after the product is picked up and quality checked.</p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 flex items-start gap-2">
                    <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>A delivery partner will pick up the product from your registered address. Please keep the product in original packaging.</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-200">
              {initiateStep > 1 && <button onClick={() => setInitiateStep(s => s - 1)} className="flex-1 bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl text-sm">Back</button>}
              {initiateStep === 1 && <button onClick={() => setShowInitiate(false)} className="flex-1 bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl text-sm">Cancel</button>}
              {initiateStep < 3 && <button onClick={() => setInitiateStep(s => s + 1)} disabled={initiateStep === 1 && !selRetOrder} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl text-sm">Next</button>}
              {initiateStep === 3 && <button onClick={submitReturn} disabled={submittingRet} className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2"><CheckCircle className="w-4 h-4" />{submittingRet ? 'Submitting…' : 'Submit Return'}</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
