'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  CreditCard,
  ChevronRight,
  Check,
  Calculator,
  Info,
  Building2,
  RefreshCw,
} from 'lucide-react';
import { useRegion } from '@/lib/contexts/region-context';
import { parseProductParam } from '@/lib/marketplace/product-url';
import { getProductById, getEmiOptions, type EmiPlan } from '@/lib/api/marketplace';
import { normaliseProductDetail } from '@/lib/marketplace/product-detail';

/**
 * Every instalment plan the backend quotes for this product in this market.
 *
 * This page used to carry a literal product price (115 900) and a hard-coded
 * list of five Indian banks with invented rates and processing fees, and
 * computed EMIs from them for every product in every market. The price is now
 * the product's own buy-box price and the plans are the backend's; a market
 * with no configured lender says so instead of quoting one.
 */
export default function EMIPage() {
  const params = useParams();
  const segment = params?.id as string;
  const { id: productId } = parseProductParam(segment);
  const { formatCurrencyValue: fmt, country } = useRegion();

  const [state, setState] = useState<
    | { kind: 'loading' }
    | { kind: 'failed' }
    | { kind: 'ready'; name: string; price: number; plans: EmiPlan[]; reason: string | null }
  >({ kind: 'loading' });
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!productId) {
      setState({ kind: 'failed' });
      return;
    }
    let cancelled = false;
    setState({ kind: 'loading' });
    Promise.all([getProductById(productId, country.code), getEmiOptions(productId, country.code)])
      .then(([rawProduct, emi]) => {
        if (cancelled) return;
        const product = normaliseProductDetail(rawProduct, country.code);
        const plans =
          emi?.eligible === false
            ? []
            : (Array.isArray(emi?.plans) ? emi.plans : [])
                .filter((p) => Number(p?.monthlyEmi) > 0 && Number(p?.tenure) > 0)
                .map((p) => ({
                  tenure: Number(p.tenure),
                  bank: String(p.bank ?? ''),
                  interestRate: Number(p.interestRate) || 0,
                  monthlyEmi: Number(p.monthlyEmi),
                  totalCost: Number(p.totalCost) || undefined,
                  label: String(p.label ?? ''),
                }))
                .sort((a, b) => a.tenure - b.tenure || a.monthlyEmi - b.monthlyEmi);
        setState({
          kind: 'ready',
          name: product.name,
          price: Number(emi?.price) || product.price,
          plans,
          reason:
            emi?.eligible === false
              ? String(emi?.reason ?? '') || 'Instalment plans are not offered on this product.'
              : null,
        });
        setSelectedIdx(0);
      })
      .catch(() => {
        if (!cancelled) setState({ kind: 'failed' });
      });
    return () => {
      cancelled = true;
    };
  }, [productId, country.code, attempt]);

  const selected = state.kind === 'ready' ? state.plans[selectedIdx] : undefined;
  const totalCost = selected ? (selected.totalCost ?? selected.monthlyEmi * selected.tenure) : 0;
  const totalInterest =
    state.kind === 'ready' && selected ? Math.max(0, totalCost - state.price) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 pb-mobile-nav">
      <section className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white py-8 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <Calculator className="w-7 h-7" aria-hidden="true" />
            <h1 className="text-2xl font-extrabold">Instalment plans</h1>
          </div>
          <p className="text-white/70 text-sm">
            The plans lenders in {country.name} quote for this product
          </p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <nav className="text-sm text-slate-500 mb-6" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-blue-600">
            Home
          </Link>
          <ChevronRight className="w-3 h-3 inline mx-1" aria-hidden="true" />
          <Link href={`/product/${segment}`} className="hover:text-blue-600">
            Product
          </Link>
          <ChevronRight className="w-3 h-3 inline mx-1" aria-hidden="true" />
          <span className="text-slate-800 font-medium">EMI options</span>
        </nav>

        {state.kind === 'loading' && (
          <div className="space-y-3" aria-busy="true">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 bg-white border border-slate-200 rounded-xl animate-pulse"
              />
            ))}
          </div>
        )}

        {state.kind === 'failed' && (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
            <p className="text-slate-700 font-semibold mb-3">
              We couldn&apos;t load the instalment plans right now.
            </p>
            <button
              type="button"
              onClick={() => setAttempt((n) => n + 1)}
              className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:underline"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" /> Try again
            </button>
          </div>
        )}

        {state.kind === 'ready' && (
          <>
            <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm text-slate-500 truncate">{state.name}</p>
                <p className="text-2xl font-black text-slate-800">
                  {state.price > 0 ? fmt(state.price) : 'Price unavailable'}
                </p>
              </div>
              <CreditCard className="w-10 h-10 text-blue-200 shrink-0" aria-hidden="true" />
            </div>

            {state.plans.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-sm text-amber-800">
                  {state.reason ??
                    'No instalment plans are available for this product in your market.'}
                </p>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-bold text-slate-800 mb-3">Choose a plan</h2>
                <div className="space-y-2 mb-6" role="radiogroup" aria-label="Instalment plans">
                  {state.plans.map((plan, i) => (
                    <button
                      key={`${plan.tenure}-${plan.bank}-${i}`}
                      type="button"
                      role="radio"
                      aria-checked={selectedIdx === i}
                      onClick={() => setSelectedIdx(i)}
                      className={`w-full bg-white border-2 rounded-xl p-4 text-left flex items-center justify-between gap-3 transition-all ${
                        selectedIdx === i
                          ? 'border-blue-500 shadow-sm bg-blue-50/30'
                          : 'border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                          <Building2 className="w-5 h-5 text-slate-400" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-800">
                            {plan.tenure} months{plan.bank ? ` · ${plan.bank}` : ''}
                          </div>
                          <div className="text-xs text-slate-400">
                            {plan.interestRate === 0 ? 'No-cost EMI' : `${plan.interestRate}% p.a.`}
                            {plan.label ? ` · ${plan.label}` : ''}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-black text-slate-900">
                          {fmt(plan.monthlyEmi)}
                          <span className="text-xs font-normal text-slate-400">/mo</span>
                        </div>
                        {selectedIdx === i && (
                          <Check
                            className="w-4 h-4 text-blue-600 inline-block mt-1"
                            aria-hidden="true"
                          />
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                {selected && (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <Calculator className="w-5 h-5 text-blue-600" aria-hidden="true" /> Plan
                      summary
                    </h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-white rounded-xl p-4 text-center">
                        <p className="text-xs text-slate-500 mb-1">Monthly instalment</p>
                        <p className="text-2xl font-black text-blue-600">
                          {fmt(selected.monthlyEmi)}
                        </p>
                        <p className="text-[11px] text-slate-400">for {selected.tenure} months</p>
                      </div>
                      <div className="bg-white rounded-xl p-4 text-center">
                        <p className="text-xs text-slate-500 mb-1">Total cost</p>
                        <p className="text-2xl font-black text-slate-800">{fmt(totalCost)}</p>
                        <p
                          className={`text-[11px] font-medium ${totalInterest > 0 ? 'text-red-500' : 'text-emerald-600'}`}
                        >
                          {totalInterest > 0 ? `+${fmt(totalInterest)} interest` : 'No interest'}
                        </p>
                      </div>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                      <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                      <p className="text-xs text-amber-700">
                        Instalment plans are subject to your card issuer&apos;s approval and terms.
                        The final plan is confirmed at checkout.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
