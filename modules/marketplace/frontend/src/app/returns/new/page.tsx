'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RotateCcw, ChevronRight, Package, Check, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/lib/contexts/toast-context';
import { useAuth } from '@/lib/contexts/auth-context';
import { useRegion } from '@/lib/contexts/region-context';
import { getOrders, createReturn } from '@/lib/api/marketplace';
import { LoadFailed } from '@/components/shared/load-failed';

/**
 * Raise a return against one of the customer's delivered orders.
 *
 * The wizard this replaces was inert end to end: it listed two hard-coded items
 * ("iPhone 15 Pro … Titanium Blue" and "Sony WH-1000XM5", both against order
 * "KS-2026-78432", which belongs to nobody), and "Submit Return Request" called
 * `toast.success('Return request submitted')` — no network call at all. Every
 * customer who used this page believed they had opened a return, and nothing was
 * ever recorded.
 *
 * Steps that nothing backs are gone rather than faked. The old flow collected
 * photos through a button with no file input and no upload endpoint, and offered
 * pickup date/time slots — pickup is assigned by an operator through
 * `PUT /returns/:id/assign-pickup`, so a slot chosen here could not be honoured.
 * What remains — pick the item, give a reason, add detail — is what
 * `POST /marketplace/returns` actually accepts.
 */

const RETURN_REASONS = [
  'Defective product',
  'Received wrong item',
  'Received wrong color/size',
  'Product not as described',
  'Damaged during delivery',
  'Changed my mind',
  'Missing accessories/parts',
  'Quality not as expected',
];

/** UI label → the `CreateReturnDto` reason enum the service validates against. */
function mapReasonToEnum(reason: string): string {
  const r = reason.toLowerCase();
  if (r.includes('defective') || r.includes('quality')) return 'DEFECTIVE';
  if (r.includes('wrong item')) return 'WRONG_ITEM';
  if (r.includes('color') || r.includes('size') || r.includes('fit')) return 'SIZE_FIT';
  if (r.includes('not as described')) return 'NOT_AS_DESCRIBED';
  if (r.includes('damaged')) return 'DAMAGED';
  return 'OTHER';
}

interface ReturnableItem {
  key: string;
  orderId: string;
  orderNumber: string;
  name: string;
  price: number;
  quantity: number;
}

type Step = 'select' | 'reason' | 'confirm';
const STEPS: { key: Step; label: string; icon: typeof Package }[] = [
  { key: 'select', label: 'Select Item', icon: Package },
  { key: 'reason', label: 'Reason', icon: AlertTriangle },
  { key: 'confirm', label: 'Confirm', icon: CheckCircle },
];

export default function ReturnRequestPage() {
  const toast = useToast();
  const router = useRouter();
  const { user, isAuthenticated, isHydrated } = useAuth();
  const { formatCurrencyValue: fmt } = useRegion();

  const [step, setStep] = useState<Step>('select');

  // Separates "we could not load the items you can return" from "there are none".

  const [loadFailed, setLoadFailed] = useState(false);
  const [items, setItems] = useState<ReturnableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState('');
  const [selectedReason, setSelectedReason] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const currentIndex = STEPS.findIndex(s => s.key === step);
  const selected = items.find(i => i.key === selectedKey) ?? null;

  // Only delivered orders can be returned, so only those are offered.
  useEffect(() => {
    if (!isHydrated) return;
    if (!isAuthenticated) { setLoading(false); return; }
    let cancelled = false;

    getOrders(user?.id ? { userId: user.id, status: 'DELIVERED' } : { status: 'DELIVERED' })
      .then((res: any) => {
        if (cancelled) return;
        const orders = res?.data ?? res?.orders ?? [];
        const flat: ReturnableItem[] = [];
        (Array.isArray(orders) ? orders : []).forEach((o: any) => {
          (o.items || []).forEach((it: any, idx: number) => flat.push({
            key: `${o.id}:${it.productId ?? idx}`,
            orderId: o.id,
            orderNumber: o.orderNumber || o.id,
            name: it.name || it.productName || 'Product',
            price: Number(it.unitPrice ?? it.price ?? 0) || 0,
            quantity: Number(it.quantity ?? 1) || 1,
          }));
        });
        setItems(flat);
      })
      .catch(() => { if (!cancelled) setItems([]); setLoadFailed(true); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [user?.id, isAuthenticated, isHydrated]);

  const nextStep = () => { const next = STEPS[currentIndex + 1]; if (next) setStep(next.key); };
  const prevStep = () => { const prev = STEPS[currentIndex - 1]; if (prev) setStep(prev.key); };

  async function submit() {
    if (!user?.id || !selected) { setError('Please select an item to return.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await createReturn({
        orderId: selected.orderId,
        reason: mapReasonToEnum(selectedReason),
        description: additionalNotes || undefined,
        customerId: user.id,
      });
      toast.success('Return request submitted');
      router.push('/returns');
    } catch (err: any) {
      setError(err?.message || 'Could not submit your return. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loadFailed) {
    return <LoadFailed title="We could not load the items you can return" />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30">
      <section className="bg-gradient-to-r from-orange-500 via-rose-500 to-red-500 text-white py-8 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <RotateCcw className="w-7 h-7" />
            <h1 className="text-2xl font-extrabold">Request a Return</h1>
          </div>
          <p className="text-white/70 text-sm">We&apos;ll guide you through each step</p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <nav className="text-sm text-slate-500 mb-6">
          <Link href="/" className="hover:text-blue-600">Home</Link>
          <ChevronRight className="w-3 h-3 inline mx-1" />
          <Link href="/returns" className="hover:text-blue-600">Returns</Link>
          <ChevronRight className="w-3 h-3 inline mx-1" />
          <span className="text-slate-800 font-medium">New Return</span>
        </nav>

        {/* Progress Stepper */}
        <div className="flex items-center justify-between mb-8 px-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = i < currentIndex;
            const active = i === currentIndex;
            return (
              <React.Fragment key={s.key}>
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    done ? 'bg-green-500 text-white' : active ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-200 text-slate-400'
                  }`}>
                    {done ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className={`text-[10px] mt-1.5 font-medium ${active ? 'text-blue-600' : 'text-slate-400'}`}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 rounded-full ${done ? 'bg-green-400' : 'bg-slate-200'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          {step === 'select' && (
            <>
              <h2 className="text-lg font-bold text-slate-800 mb-4">Select the item to return</h2>
              {loading ? (
                <div className="space-y-3">
                  {[0, 1].map(i => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}
                </div>
              ) : !isAuthenticated ? (
                <p className="text-sm text-slate-500 py-6 text-center">Please sign in to raise a return.</p>
              ) : items.length === 0 ? (
                <div className="text-center py-10">
                  <Package className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-600 font-medium">Nothing available to return</p>
                  <p className="text-sm text-slate-400 mt-1">Only delivered orders can be returned.</p>
                  <Link href="/orders" className="inline-block mt-4 text-sm font-bold text-blue-600 hover:underline">
                    View your orders
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map(item => (
                    <button key={item.key} onClick={() => setSelectedKey(item.key)}
                      className={`w-full text-left p-4 border-2 rounded-xl flex items-center gap-4 transition-all ${
                        selectedKey === item.key ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 hover:border-blue-300'
                      }`}>
                      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 ${
                        selectedKey === item.key ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                      }`}>
                        {selectedKey === item.key && <Check className="w-4 h-4 text-white" />}
                      </div>
                      <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                        <Package className="w-5 h-5 text-slate-300" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800 text-sm truncate">{item.name}</p>
                        <p className="text-xs text-slate-400">
                          Order: {item.orderNumber} · Qty: {item.quantity}
                          {item.price > 0 && ` · ${fmt(item.price)}`}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {step === 'reason' && (
            <>
              <h2 className="text-lg font-bold text-slate-800 mb-4">Why are you returning?</h2>
              <div className="space-y-2 mb-4">
                {RETURN_REASONS.map(reason => (
                  <button key={reason} onClick={() => setSelectedReason(reason)}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm border-2 transition-all ${
                      selectedReason === reason ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold' : 'border-slate-200 text-slate-700 hover:border-blue-300'
                    }`}>
                    {reason}
                  </button>
                ))}
              </div>
              <textarea value={additionalNotes} onChange={e => setAdditionalNotes(e.target.value)}
                placeholder="Tell us more (optional)..." rows={3}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-sm resize-none outline-none focus:ring-2 focus:ring-blue-500" />
            </>
          )}

          {step === 'confirm' && (
            <>
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-extrabold text-slate-800 mb-2">Review your request</h2>
                <p className="text-sm text-slate-500 mb-4">Our team will review it and arrange a pickup.</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm mb-4">
                <p><span className="font-semibold text-slate-800">Item:</span> {selected?.name ?? '—'}</p>
                <p><span className="font-semibold text-slate-800">Order:</span> {selected?.orderNumber ?? '—'}</p>
                <p><span className="font-semibold text-slate-800">Reason:</span> {selectedReason || 'Not specified'}</p>
                {additionalNotes && <p><span className="font-semibold text-slate-800">Notes:</span> {additionalNotes}</p>}
              </div>
              {/* No pickup slot is promised here — pickup is scheduled by the
                  returns team once the request is approved. */}
              <p className="text-xs text-slate-400 mb-2">
                Pickup is scheduled after approval; you&apos;ll be notified with the details.
              </p>
            </>
          )}

          {error && <p className="text-sm text-red-600 mt-4">{error}</p>}

          <div className="flex gap-3 mt-6 pt-4 border-t border-slate-200">
            {currentIndex > 0 && (
              <button onClick={prevStep} disabled={submitting}
                className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold hover:bg-slate-200 transition-colors disabled:opacity-50">
                Back
              </button>
            )}
            <button onClick={step === 'confirm' ? submit : nextStep}
              disabled={
                submitting ||
                (step === 'select' && !selectedKey) ||
                (step === 'reason' && !selectedReason)
              }
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 transition-colors flex items-center justify-center gap-2">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {step === 'confirm' ? 'Submit Return Request' : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
