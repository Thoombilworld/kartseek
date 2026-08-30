'use client';

import React from 'react';
import Link from 'next/link';
import { sellerApi } from '@/lib/modules/seller-api';
import { useSellerData, useSellerList } from '@/lib/hooks/use-seller-data';
import { useSellerMoney } from '@/lib/hooks/use-seller-money';
import { SellerDataState, SellerError, SellerLoading } from '@/components/seller/marketplace/data-state';
import {
  Activity, AlertTriangle, Clock, RotateCcw, Star, XCircle, ShieldCheck, Scale,
} from 'lucide-react';

/**
 * Seller performance.
 *
 * This page used to render three hard-coded arrays as though they were the
 * seller's own record: six metric cards (1.2% defect rate, 4.8 rating, a health
 * score pinned at 94), four policy violations naming real-looking order ids, and
 * four penalties totalling ₹3,200 "deducted" from the account. None of it came
 * from anywhere. The one API call the page did make — `getReports(…)` — had its
 * result thrown away inside `catch { /* using demo data *\/ }`.
 *
 * Penalties are the worst thing to invent: a seller who believes them appeals,
 * or changes how they operate. This now shows what
 * `GET /sellers/:id/performance` and `GET /sellers/:id/penalty-ledger` actually
 * return, and marks anything nothing measures as unmeasured.
 */

type Perf = {
  rating?: number;
  totalOrders?: number;
  cancellationRate?: string | number;
  returnRate?: string | number;
  responseTime?: string;
  dispatchSla?: string;
  healthScore?: string;
};

function pct(v: string | number | undefined) {
  if (v === undefined || v === null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace('%', ''));
  return Number.isFinite(n) ? `${n}%` : String(v);
}

function MetricCard({
  label, value, target, icon: Icon,
}: {
  label: string; value: string | null; target: string; icon: React.ElementType;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <Icon className="w-4 h-4 text-slate-400" aria-hidden />
        <span className="text-[10px] text-slate-400 font-medium">Target {target}</span>
      </div>
      <p className="text-2xl font-black text-slate-900">{value ?? '—'}</p>
      <p className="text-xs text-slate-500 mt-0.5 font-medium">{label}</p>
      {value === null && <p className="text-[10px] text-slate-400 mt-1">Not measured yet</p>}
    </div>
  );
}

export default function PerformancePage() {
  const { format: money } = useSellerMoney();

  const perf = useSellerData<Perf>((sellerId) => sellerApi.getPerformanceMetrics(sellerId) as Promise<Perf>);
  const penalties = useSellerList<any>((sellerId) => sellerApi.getPenaltyLedger(sellerId) as any);

  const d = (perf.data ?? {}) as Perf;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
          <Activity className="w-6 h-6 text-blue-600" aria-hidden />
          Seller Performance
        </h1>
        <p className="text-sm text-slate-500 mt-1">Your account health, SLAs and policy record</p>
      </div>

      {perf.loading ? (
        <SellerLoading label="Loading your performance record…" />
      ) : perf.error ? (
        <SellerError message={perf.error} onRetry={perf.reload} />
      ) : (
        <>
          <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-7 h-7 text-emerald-600" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Account Health</p>
              <p className="text-xl font-black text-slate-900">{d.healthScore || '—'}</p>
              <p className="text-xs text-slate-500">
                Based on {typeof d.totalOrders === 'number' ? d.totalOrders.toLocaleString() : '0'} orders
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <MetricCard label="Seller Rating" value={typeof d.rating === 'number' ? d.rating.toFixed(1) : null} target="> 4.5" icon={Star} />
            <MetricCard label="Cancellation Rate" value={pct(d.cancellationRate)} target="< 2.5%" icon={XCircle} />
            <MetricCard label="Return Rate" value={pct(d.returnRate)} target="< 5%" icon={RotateCcw} />
            <MetricCard label="Dispatch SLA" value={d.dispatchSla ?? null} target="> 95%" icon={Clock} />
            <MetricCard label="Response Time" value={d.responseTime ?? null} target="< 24 hrs" icon={Clock} />
            <MetricCard label="Order Defect Rate" value={null} target="< 1%" icon={AlertTriangle} />
          </div>
        </>
      )}

      {/* Penalties — the real ledger, empty until something is actually charged. */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <Scale className="w-4 h-4 text-slate-400" aria-hidden />Penalties &amp; Violations
          </h2>
          <Link href="/seller/marketplace/disputes" className="text-xs text-blue-600 font-bold hover:underline">
            Raise a dispute
          </Link>
        </div>
        <SellerDataState
          loading={penalties.loading}
          error={penalties.error}
          unavailable={penalties.unavailable}
          isEmpty={penalties.rows.length === 0}
          feature="Penalties"
          onRetry={penalties.reload}
          emptyTitle="No penalties on your account"
          emptyDescription="Policy violations and any resulting deductions would be listed here."
          emptyIcon={ShieldCheck}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-500">Reference</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-500">Type</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-500">Order</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-500">Amount</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-500">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-500">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {penalties.rows.map((p: any, i: number) => (
                  <tr key={p.id ?? i} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3.5 font-semibold text-slate-800">{p.id ?? '—'}</td>
                    <td className="px-4 py-3.5 text-slate-700">{p.type ?? '—'}</td>
                    <td className="px-4 py-3.5 text-blue-600">{p.orderId ?? '—'}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-red-600">{money(p.amount)}</td>
                    <td className="px-4 py-3.5">
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 capitalize">
                        {String(p.status ?? '').replace(/_/g, ' ') || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500">
                      {p.date ? new Date(p.date).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SellerDataState>
      </div>
    </div>
  );
}
