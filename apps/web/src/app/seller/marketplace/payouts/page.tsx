'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSeller } from '@/lib/contexts/seller-context';
import { sellerApi, type Payout } from '@/lib/modules/seller-api';
import { CreditCard, Clock, CheckCircle, XCircle, ArrowUpRight, Search, Download, Plus, Ban } from 'lucide-react';
import { useSellerMoney } from '@/lib/hooks/use-seller-money';
import { getPayoutNavLabel } from '@/lib/localization';

const STATUS_CFG: Record<string, { color: string; icon: typeof CheckCircle }> = {
  pending: { color: 'bg-amber-50 text-amber-700', icon: Clock },
  processing: { color: 'bg-blue-50 text-blue-700', icon: ArrowUpRight },
  completed: { color: 'bg-emerald-50 text-emerald-700', icon: CheckCircle },
  failed: { color: 'bg-red-50 text-red-700', icon: XCircle },
};


export default function PayoutsPage() {
  // Was a module-level `'₹' + n.toLocaleString('en-IN')`, which printed a
  // Qatari seller's takings in rupees. See lib/hooks/use-seller-money.
  const { format: formatMoney } = useSellerMoney();
  // Accepts null so a figure we do not have renders as "—" instead of zero.
  const fmt = (n: number | null | undefined) => formatMoney(n);
  const { seller, kpi } = useSeller();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [requesting, setRequesting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // The payout rail is market-specific: "UPI/NEFT" means nothing to a seller in
  // Doha, who is paid by bank transfer. The sidebar already localises this label
  // via `getPayoutNavLabel`; the heading had it hard-coded and contradicted it.
  const { countryCode } = useSellerMoney();
  const payoutLabel = getPayoutNavLabel(countryCode);

  const load = useCallback(() => {
    if (!seller.sellerId) return;
    setLoading(true);
    sellerApi.getPayouts(seller.sellerId)
      .then(res => { setPayouts(res?.data ?? []); setLoadError(null); })
      // An empty list and a failed request are different answers; the page
      // used to render both as "nothing found".
      .catch((e: unknown) => { setPayouts([]); setLoadError(e instanceof Error ? e.message : 'Could not load this data.'); })
      .finally(() => setLoading(false));
  }, [seller.sellerId]);

  useEffect(() => { load(); }, [load]);

  /**
   * Request a withdrawal.
   *
   * The button used to have no handler at all — a seller could click "Request
   * Payout" as often as they liked and nothing was ever submitted.
   */
  const requestPayout = async () => {
    const available = Number(kpi?.walletBalance ?? 0);
    const raw = window.prompt(`How much would you like to withdraw? (available ${formatMoney(available)})`);
    if (raw === null) return;

    const amount = Number(raw.replace(/[^\d.]/g, ''));
    if (!Number.isFinite(amount) || amount <= 0) { setRequestError('Enter an amount greater than zero.'); return; }
    if (amount > available) { setRequestError(`You can withdraw at most ${formatMoney(available)}.`); return; }

    setRequesting(true); setRequestError(null);
    try {
      await sellerApi.requestPayout(seller.sellerId, amount);
      setToast('Payout requested');
      setTimeout(() => setToast(null), 3000);
      load();
    } catch (e) {
      setRequestError(e instanceof Error ? e.message : 'The payout could not be requested.');
    } finally {
      setRequesting(false);
    }
  };

  const filtered = payouts.filter(p =>
    (statusFilter === 'all' || p.status === statusFilter) &&
    (!search || p.id.toLowerCase().includes(search.toLowerCase()) || p.bankAccount.includes(search))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2"><CreditCard className="w-7 h-7 text-blue-600" />{payoutLabel}</h1>
          <p className="text-sm text-slate-500 mt-1">Request a withdrawal and track its settlement</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/seller/marketplace/payouts/manage" className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors">
            <Ban className="w-4 h-4" />Manage Banks
          </Link>
          <button
            onClick={requestPayout}
            disabled={requesting}
            className="flex items-center gap-2 bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />{requesting ? 'Requesting…' : 'Request Payout'}
          </button>
        </div>
      </div>

      {requestError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{requestError}</div>
      )}
      {loadError && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          {loadError} Nothing shown below is your real payout history.
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          // `|| 348920` etc. meant a seller with an empty wallet, and a seller
          // whose KPIs failed to load, were both shown ₹3,48,920 available and
          // ₹42,10,000 withdrawn. A balance we do not have reads as "—".
          { label: 'Available Balance', value: fmt(kpi?.walletBalance ?? null), color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Pending Payout', value: fmt(kpi?.pendingPayout ?? null), color: 'bg-amber-50 text-amber-600' },
          { label: 'Total Withdrawn', value: fmt(kpi?.completedPayout ?? null), color: 'bg-blue-50 text-blue-600' },
        ].map(k => (
          <div key={k.label} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <p className="text-xs text-slate-500">{k.label}</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search payouts..." className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none" /></div>
        <div className="flex flex-wrap gap-1.5">
          {['all', 'pending', 'completed', 'failed'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-2 text-xs font-bold rounded-lg border capitalize transition-colors ${statusFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{s}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {/* Own horizontal scroll: a wide table must not drag the page sideways. */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Payout ID</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-500">Amount</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Bank Account</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">UTR</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Requested</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Processed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(p => {
                const cfg = STATUS_CFG[p.status] || STATUS_CFG.pending;
                const Icon = cfg.icon;
                return (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3.5 font-semibold text-slate-800">{p.id}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-slate-900">{fmt(p.amount)}</td>
                    <td className="px-4 py-3.5 text-slate-600">{p.bankAccount}</td>
                    <td className="px-4 py-3.5 text-slate-500 text-xs font-mono">{p.utr || '—'}</td>
                    <td className="px-4 py-3.5"><span className={`text-[10px] font-bold px-2.5 py-1 rounded-md capitalize ${cfg.color}`}>{p.status}</span></td>
                    <td className="px-4 py-3.5 text-slate-500">{new Date(p.requestedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                    <td className="px-4 py-3.5 text-slate-500">{p.processedAt ? new Date(p.processedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="text-center py-12"><CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-sm text-slate-500">No payouts found</p></div>}
      </div>
    </div>
  );
}
