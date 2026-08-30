'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { Banknote, ChevronRight, CheckCircle, Clock, ArrowLeft, ShieldCheck, XCircle } from 'lucide-react';
import { useRegion } from '@/lib/contexts/region-context';
import { useAuth } from '@/lib/contexts/auth-context';
import { getReturnById } from '@/lib/api/marketplace';
import { ApiError } from '@/lib/api-endpoints';

/**
 * Refund status for a return request.
 *
 * This page used to be a refund *form*: it displayed `const refundAmount =
 * 24990; // demo` for every return regardless of what had been returned, offered
 * a choice of "Original Payment Method / KartSeek Wallet / Bank Transfer" with
 * invented settlement times, and its "Confirm Refund" button called
 * `setSubmitted(true)` and nothing else — then told the customer their money was
 * on its way. No refund was ever initiated.
 *
 * A customer cannot choose a refund route on this platform: `resolutionType` is
 * set on the return request and the money is released by the returns workflow
 * after QC. So this is now a status view of the real return — the amount the
 * seller actually owes, where it is going and how far along it is.
 */

const STATUS_STEPS = [
  { key: 'REQUESTED', label: 'Return requested' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'PICKED_UP', label: 'Picked up' },
  { key: 'RECEIVED', label: 'Received & inspected' },
  { key: 'REFUNDED', label: 'Refund issued' },
];

const RESOLUTION_LABEL: Record<string, string> = {
  REFUND: 'Original payment method',
  WALLET_CREDIT: 'KartSeek Wallet',
  REPLACEMENT: 'Replacement',
  EXCHANGE: 'Exchange',
};

export default function RefundPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { formatCurrencyValue: fmt, formatDateValue } = useRegion();
  const { isAuthenticated, isHydrated } = useAuth();

  const [ret, setRet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id || !isHydrated) return;
    if (!isAuthenticated) { setError('Please sign in to view this refund.'); setLoading(false); return; }
    let cancelled = false;

    getReturnById(id)
      .then((res: any) => { if (!cancelled) setRet(res?.data ?? res); })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof ApiError && e.status === 404
          ? 'We could not find this return on your account.'
          : 'Refund details are unavailable right now. Please try again.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [id, isAuthenticated, isHydrated]);

  const status = String(ret?.status ?? '').toUpperCase();
  const rejected = status === 'REJECTED';
  const stepIndex = STATUS_STEPS.findIndex(s => s.key === status);
  const refundAmount = Number(ret?.refundAmount ?? 0) || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50/30">
      <section className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white py-8 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <Banknote className="w-7 h-7" />
            <h1 className="text-2xl font-extrabold">Refund Status</h1>
          </div>
          <p className="text-white/70 text-sm">Return {ret?.returnNumber ?? `#${id}`}</p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <nav className="text-sm text-slate-500 mb-6">
          <Link href="/marketplace" className="hover:text-blue-600">Home</Link>
          <ChevronRight className="w-3 h-3 inline mx-1" />
          <Link href="/marketplace/returns" className="hover:text-blue-600">Returns</Link>
          <ChevronRight className="w-3 h-3 inline mx-1" />
          <span className="text-slate-800 font-medium">Refund</span>
        </nav>

        {loading ? (
          <div className="space-y-4">
            <div className="h-24 bg-white border border-slate-200 rounded-xl animate-pulse" />
            <div className="h-56 bg-white border border-slate-200 rounded-xl animate-pulse" />
          </div>
        ) : error || !ret ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
            <Banknote className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-600">{error || 'Refund not found'}</p>
            <Link href="/marketplace/returns" className="inline-flex items-center gap-2 mt-4 text-sm font-bold text-blue-600 hover:underline">
              <ArrowLeft className="w-4 h-4" /> Back to Returns
            </Link>
          </div>
        ) : (
          <>
            {/* Amount — the figure recorded on the return, not a placeholder. */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Refund Amount</p>
                <p className="text-3xl font-black text-green-600">{fmt(refundAmount)}</p>
                <p className="text-xs text-slate-500 mt-1">
                  To: {RESOLUTION_LABEL[String(ret.resolutionType ?? '').toUpperCase()] ?? 'Original payment method'}
                </p>
              </div>
              <Banknote className="w-10 h-10 text-green-200" />
            </div>

            {rejected ? (
              <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
                <XCircle className="w-10 h-10 text-red-300 mx-auto mb-2" />
                <h2 className="font-bold text-slate-800 mb-1">Return rejected</h2>
                <p className="text-sm text-slate-500">{ret.rejectionReason || 'No refund will be issued for this return.'}</p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h2 className="text-lg font-bold text-slate-800 mb-4">Progress</h2>
                <ol className="space-y-4">
                  {STATUS_STEPS.map((step, i) => {
                    const done = stepIndex >= 0 && i <= stepIndex;
                    return (
                      <li key={step.key} className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                          done ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-300'
                        }`}>
                          {done ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                        </div>
                        <span className={`text-sm ${done ? 'font-semibold text-slate-800' : 'text-slate-400'}`}>{step.label}</span>
                      </li>
                    );
                  })}
                </ol>
                {ret.refundedAt && (
                  <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mt-5">
                    Refund issued on {formatDateValue(ret.refundedAt)}. Settlement to your bank or card can take a few working days.
                  </p>
                )}
              </div>
            )}

            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 mt-6">
              <ShieldCheck className="w-5 h-5 text-green-600 shrink-0" />
              <p className="text-sm text-green-700">Your refund is secured by KartSeek&apos;s buyer protection policy.</p>
            </div>

            <Link href="/marketplace/returns" className="inline-flex items-center gap-2 mt-6 text-sm font-bold text-blue-600 hover:underline">
              <ArrowLeft className="w-4 h-4" /> Back to Returns
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
