'use client';
import React, { useState } from 'react';
import { Wallet, Eye, Download, CheckCircle, Clock, X, Search, ChevronLeft, ChevronRight, Lock, Unlock, DollarSign, TrendingUp, AlertTriangle, FileText, Calendar } from 'lucide-react';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';
import { CountryFlag } from '@/components/shared/country-flag';
import MarketplaceEmptyState from '@/components/admin/marketplace/marketplace-empty-state';
import { adminMarketplaceApi } from '@/lib/modules/admin-marketplace-api';
import { useAdminData, useAdminAction, AdminToast, AdminLoadingSkeleton, AdminErrorBanner } from '@/hooks/useAdminData';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
const COUNTRY_TO_CODE: Record<string, string> = { India: 'IN', UAE: 'AE', UK: 'GB', Qatar: 'QA' };

type Payout = {
  id: string; seller: string; country: string;
  pendingAmount: number; totalPaid: number; commission: number; refundAdj: number; tds: number;
  payoutStatus: 'pending' | 'processing' | 'settled' | 'hold' | 'failed';
  lastPayout: string; nextPayout: string; payoutCycle: string; bankAccount: string;
  settlementReport: { orderId: string; amount: number; commission: number; net: number; date: string }[];
};

const PAYOUTS: Payout[] = [
  { id: 'PAY-6001', seller: 'Apple India Store', country: 'India', pendingAmount: 410000, totalPaid: 82000000, commission: 6150000, refundAdj: 180000, tds: 82000, payoutStatus: 'pending', lastPayout: '2026-05-15', nextPayout: '2026-06-15', payoutCycle: 'Monthly', bankAccount: 'HDFC ****4291', settlementReport: [{ orderId: 'ORD-8890', amount: 134900, commission: 4047, net: 130853, date: '2026-06-06' }, { orderId: 'ORD-8875', amount: 114900, commission: 3447, net: 111453, date: '2026-06-05' }, { orderId: 'ORD-8860', amount: 159800, commission: 4794, net: 155006, date: '2026-06-04' }] },
  { id: 'PAY-6002', seller: 'Samsung Store', country: 'India', pendingAmount: 620000, totalPaid: 121000000, commission: 8520000, refundAdj: 90000, tds: 121000, payoutStatus: 'pending', lastPayout: '2026-05-15', nextPayout: '2026-06-15', payoutCycle: 'Monthly', bankAccount: 'ICICI ****7823', settlementReport: [{ orderId: 'ORD-8885', amount: 79999, commission: 3999, net: 76000, date: '2026-06-03' }, { orderId: 'ORD-8880', amount: 169999, commission: 8499, net: 161500, date: '2026-06-02' }] },
  { id: 'PAY-6003', seller: 'Nike Official', country: 'India', pendingAmount: 180000, totalPaid: 45000000, commission: 4520000, refundAdj: 40000, tds: 45000, payoutStatus: 'processing', lastPayout: '2026-05-15', nextPayout: '2026-06-15', payoutCycle: 'Bi-Weekly', bankAccount: 'SBI ****1456', settlementReport: [{ orderId: 'ORD-8882', amount: 16995, commission: 2379, net: 14616, date: '2026-06-04' }] },
  { id: 'PAY-6004', seller: 'Gulf Electronics FZE', country: 'UAE', pendingAmount: 48000, totalPaid: 980000, commission: 62000, refundAdj: 2000, tds: 0, payoutStatus: 'settled', lastPayout: '2026-06-01', nextPayout: '2026-07-01', payoutCycle: 'Monthly', bankAccount: 'Emirates NBD ****9012', settlementReport: [{ orderId: 'ORD-8878', amount: 52000, commission: 3120, net: 48880, date: '2026-06-02' }] },
  { id: 'PAY-6005', seller: 'QuickMart Express', country: 'India', pendingAmount: 0, totalPaid: 180000, commission: 18000, refundAdj: 42000, tds: 1800, payoutStatus: 'hold', lastPayout: '2026-04-30', nextPayout: 'On Hold', payoutCycle: 'Weekly', bankAccount: 'Axis ****5678', settlementReport: [] },
  { id: 'PAY-6006', seller: 'Heritage Silk House', country: 'India', pendingAmount: 85000, totalPaid: 1200000, commission: 168000, refundAdj: 12000, tds: 12000, payoutStatus: 'pending', lastPayout: '2026-05-30', nextPayout: '2026-06-14', payoutCycle: 'Bi-Weekly', bankAccount: 'BOI ****3344', settlementReport: [{ orderId: 'ORD-8870', amount: 8999, commission: 1259, net: 7740, date: '2026-05-30' }] },
];

const STATUS_STYLES: Record<string, string> = { pending: 'bg-amber-50 text-amber-700', processing: 'bg-blue-50 text-blue-700', settled: 'bg-emerald-50 text-emerald-700', hold: 'bg-red-50 text-red-700', failed: 'bg-red-100 text-red-700' };

// ── Payout Drawer with Settlement Report ─────────────────────────────────────
function PayoutDrawer({ payout: p, onClose, onRelease, onHold, formatCurrency }: { payout: Payout; onClose: () => void; onRelease: () => void; onHold: () => void; formatCurrency: (n: number) => string }) {
  const netPayout = p.pendingAmount - p.commission - p.refundAdj - p.tds;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} ><DismissOnEscape onDismiss={onClose} /></div>
      <div className="relative w-full max-w-lg bg-white shadow-2xl overflow-y-auto animate-slide-left">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div><h2 className="text-lg font-black text-slate-900">{p.seller}</h2><p className="text-xs text-slate-500">{p.id} · <CountryFlag code={COUNTRY_TO_CODE[p.country] || 'IN'} size="sm" /> {p.country}</p></div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex gap-2">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md capitalize ${STATUS_STYLES[p.payoutStatus]}`}>{p.payoutStatus}</span>
            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-md">{p.payoutCycle}</span>
          </div>

          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-xl p-5 text-white text-center"><p className="text-sm font-bold opacity-80">Pending Payout</p><p className="text-3xl font-black mt-1">{formatCurrency(p.pendingAmount)}</p><p className="text-xs opacity-60 mt-1">Next: {p.nextPayout}</p></div>

          {/* Settlement Breakdown */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-2">Settlement Breakdown</h3>
            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between"><span className="text-xs text-slate-600">Gross Amount</span><span className="text-xs font-bold text-slate-900">{formatCurrency(p.pendingAmount)}</span></div>
              <div className="flex justify-between"><span className="text-xs text-red-500">− Commission</span><span className="text-xs font-bold text-red-500">{formatCurrency(p.commission)}</span></div>
              <div className="flex justify-between"><span className="text-xs text-red-500">− Refund Adjustments</span><span className="text-xs font-bold text-red-500">{formatCurrency(p.refundAdj)}</span></div>
              <div className="flex justify-between"><span className="text-xs text-red-500">− TDS</span><span className="text-xs font-bold text-red-500">{formatCurrency(p.tds)}</span></div>
              <div className="border-t border-slate-200 pt-2 flex justify-between"><span className="text-sm font-bold text-slate-900">Net Payout</span><span className="text-sm font-black text-emerald-700">{formatCurrency(netPayout > 0 ? netPayout : 0)}</span></div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] text-slate-500">Total Paid (Lifetime)</p><p className="text-sm font-bold text-slate-900">{formatCurrency(p.totalPaid)}</p></div>
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] text-slate-500">Last Payout</p><p className="text-sm font-bold text-slate-900">{p.lastPayout}</p></div>
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] text-slate-500">Bank Account</p><p className="text-sm font-bold text-slate-900">{p.bankAccount}</p></div>
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] text-slate-500">Cycle</p><p className="text-sm font-bold text-slate-900">{p.payoutCycle}</p></div>
          </div>

          {/* Order-Level Settlement Report */}
          {p.settlementReport.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2"><h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><FileText className="w-4 h-4 text-blue-600" />Settlement Report</h3><button className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"><Download className="w-3 h-3" />CSV</button></div>
              <div className="bg-slate-50 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-slate-200"><th className="px-3 py-2 text-left text-slate-500">Order</th><th className="px-3 py-2 text-right text-slate-500">Amount</th><th className="px-3 py-2 text-right text-slate-500">Commission</th><th className="px-3 py-2 text-right text-slate-500">Net</th><th className="px-3 py-2 text-left text-slate-500">Date</th></tr></thead>
                  <tbody>{p.settlementReport.map((s, i) => (<tr key={i} className="border-b border-slate-100 last:border-0"><td className="px-3 py-2 font-mono font-bold text-blue-700">{s.orderId}</td><td className="px-3 py-2 text-right font-bold">{formatCurrency(s.amount)}</td><td className="px-3 py-2 text-right text-red-500">−{formatCurrency(s.commission)}</td><td className="px-3 py-2 text-right font-bold text-emerald-700">{formatCurrency(s.net)}</td><td className="px-3 py-2 text-slate-500">{s.date}</td></tr>))}</tbody>
                </table>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            {p.payoutStatus === 'pending' && <button onClick={onRelease} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"><CheckCircle className="w-4 h-4" /> Release Payout</button>}
            {p.payoutStatus !== 'hold' && p.payoutStatus !== 'settled' && <button onClick={onHold} className="w-full bg-red-50 hover:bg-red-100 text-red-700 py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"><Lock className="w-4 h-4" /> Put On Hold</button>}
            {p.payoutStatus === 'hold' && <button onClick={onRelease} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"><Unlock className="w-4 h-4" /> Release Hold</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function PayoutsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<Payout | null>(null);

  const { data: apiData, loading, error, refetch, toast, showToast } = useAdminData(() => adminMarketplaceApi.getPayouts(), []);
  const { execute } = useAdminAction(showToast);

  const { filtered: regionFiltered, regionLabel, isFiltered, formatCurrencyValue } = useMarketplaceRegionFilter(PAYOUTS);
  const fmt = (n: number) => formatCurrencyValue(n);

  const filtered = regionFiltered.filter(p => {
    if (statusFilter !== 'all' && p.payoutStatus !== statusFilter) return false;
    if (search && !p.seller.toLowerCase().includes(search.toLowerCase()) && !p.id.includes(search)) return false;
    return true;
  });

  const totalPending = regionFiltered.reduce((a, p) => a + p.pendingAmount, 0);
  const totalPaid = regionFiltered.reduce((a, p) => a + p.totalPaid, 0);

  const handleRelease = (p: Payout) => { execute(() => adminMarketplaceApi.processPayout(p.id, { action: 'release' }), `Payout released for ${p.seller}`, () => refetch()); setSelected(null); };
  const handleHold = (p: Payout) => { execute(() => adminMarketplaceApi.processPayout(p.id, { action: 'hold' }), `Payout held for ${p.seller}`, () => refetch()); setSelected(null); };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div><h1 className="text-2xl font-black text-slate-900">Seller Payouts</h1><p className="text-sm text-slate-500 mt-0.5">{isFiltered ? `${regionLabel} — ` : ''}Settlement reports, payout release & hold management</p></div>
        <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50"><Download className="w-4 h-4" /> Export All</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-5 text-white"><p className="text-sm font-bold opacity-80">Pending Payouts</p><p className="text-2xl font-black mt-1">{fmt(totalPending)}</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><p className="text-xs text-slate-500">Total Paid</p><p className="text-xl font-black text-emerald-600">{fmt(totalPaid)}</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><p className="text-xs text-slate-500">Processing</p><p className="text-xl font-black text-blue-600">{regionFiltered.filter(p => p.payoutStatus === 'processing').length}</p></div>
        <div className="bg-white border border-red-200 rounded-xl p-4 shadow-sm"><p className="text-xs text-red-600 font-bold">On Hold</p><p className="text-xl font-black text-red-600">{regionFiltered.filter(p => p.payoutStatus === 'hold').length}</p></div>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search seller or payout ID..." className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-200" /></div>
        <div className="flex gap-2">{['all', 'pending', 'processing', 'settled', 'hold'].map(s => (<button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-2 text-xs font-bold rounded-xl border transition-colors capitalize ${statusFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{s === 'all' ? 'All' : s}</button>))}</div>
      </div>

      {loading && <AdminLoadingSkeleton rows={4} />}
      {error && !loading && <AdminErrorBanner error={error} onRetry={refetch} />}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs">Seller</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-500 text-xs">Pending</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-500 text-xs">Total Paid</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-500 text-xs">Commission</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Cycle</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Next</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Status</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr><td colSpan={8}><MarketplaceEmptyState title="No payouts found" icon={Wallet} /></td></tr>
            ) : filtered.map(p => (
              <tr key={p.id} className={`hover:bg-slate-50/50 cursor-pointer transition-colors ${p.payoutStatus === 'hold' ? 'bg-red-50/30' : ''}`} onClick={() => setSelected(p)} tabIndex={0} onKeyDown={activateOnKey(() => setSelected(p))}>
                <td className="px-4 py-3.5"><p className="font-bold text-slate-900 text-xs">{p.seller}</p><p className="text-[10px] text-slate-400">{p.id} · <CountryFlag code={COUNTRY_TO_CODE[p.country] || 'IN'} size="sm" /> · {p.bankAccount}</p></td>
                <td className="px-4 py-3.5 text-right font-black text-amber-600">{fmt(p.pendingAmount)}</td>
                <td className="px-4 py-3.5 text-right font-bold text-emerald-600 text-xs">{fmt(p.totalPaid)}</td>
                <td className="px-4 py-3.5 text-right text-xs text-slate-600">{fmt(p.commission)}</td>
                <td className="px-4 py-3.5 text-center"><span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">{p.payoutCycle}</span></td>
                <td className="px-4 py-3.5 text-center text-xs text-slate-600">{p.nextPayout}</td>
                <td className="px-4 py-3.5 text-center"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-md capitalize ${STATUS_STYLES[p.payoutStatus]}`}>{p.payoutStatus}</span></td>
                <td className="px-4 py-3.5 text-center" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-center gap-1">
                    {p.payoutStatus === 'pending' && <button onClick={() => handleRelease(p)} className="p-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg"><CheckCircle className="w-3.5 h-3.5" /></button>}
                    {p.payoutStatus !== 'hold' && p.payoutStatus !== 'settled' && <button onClick={() => handleHold(p)} className="p-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg"><Lock className="w-3.5 h-3.5" /></button>}
                    <button onClick={() => setSelected(p)} className="p-1 hover:bg-slate-100 rounded-lg"><Eye className="w-3.5 h-3.5 text-slate-400" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && <PayoutDrawer payout={selected} onClose={() => setSelected(null)} onRelease={() => handleRelease(selected)} onHold={() => handleHold(selected)} formatCurrency={fmt} />}
      <AdminToast toast={toast} />
    </div>
  );
}
