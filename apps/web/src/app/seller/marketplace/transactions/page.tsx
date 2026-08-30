'use client';

import React, { useState, useEffect } from 'react';
import { useSeller } from '@/lib/contexts/seller-context';
import { sellerApi, type WalletTransaction } from '@/lib/modules/seller-api';
import { CreditCard, Search, Download, ArrowUpRight, ArrowDownLeft, RefreshCw, TrendingUp } from 'lucide-react';
import { useSellerMoney } from '@/lib/hooks/use-seller-money';
import { downloadCsv } from '@/lib/export-csv';

const TYPE_CONFIG: Record<string, { color: string; label: string }> = {
  credit: { color: 'bg-emerald-50 text-emerald-700', label: 'Credit' },
  debit: { color: 'bg-red-50 text-red-700', label: 'Debit' },
  payout: { color: 'bg-blue-50 text-blue-700', label: 'Payout' },
  commission: { color: 'bg-amber-50 text-amber-700', label: 'Commission' },
  refund: { color: 'bg-red-50 text-red-700', label: 'Refund' },
  adjustment: { color: 'bg-violet-50 text-violet-700', label: 'Adjustment' },
};


export default function TransactionsPage() {
  // Was a module-level `'₹' + n.toLocaleString('en-IN')`, which printed a
  // Qatari seller's takings in rupees. See lib/hooks/use-seller-money.
  const { format: formatMoney } = useSellerMoney();
  const fmt = (n: number) => formatMoney(Math.abs(n));
  const { seller } = useSeller();
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    // No id yet — SellerProvider is still resolving /sellers/me.
    if (!seller.sellerId) return;
    sellerApi.getTransactions(seller.sellerId)
      .then(res => { setTransactions(res?.data ?? []); setLoadError(null); })
      // An empty list and a failed request are different answers; the page
      // used to render both as "nothing found".
      .catch((e: unknown) => { setTransactions([]); setLoadError(e instanceof Error ? e.message : 'Could not load this data.'); })
      .finally(() => setLoading(false));
  }, [seller.sellerId]);

  // Matched against the order reference on screen rather than the ledger row's
  // own id, which the seller never sees.
  const filtered = transactions.filter(t => {
    if (typeFilter !== 'all' && t.type !== typeFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return [t.description, t.reference].some(field => (field ?? '').toLowerCase().includes(q));
  });

  const totals = {
    credits: transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0),
    debits: transactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0),
  };

  /**
   * Download the filtered rows.
   *
   * The Export button had no `onClick`. Exporting `filtered` rather than the
   * raw list matters: the button sits beside the filters, so a seller who has
   * narrowed the view expects the file to match what they are looking at.
   */
  const exportCsv = () => downloadCsv('wallet-transactions', filtered, [
      { header: 'Date', value: (t: any) => t.date },
      { header: 'Reference', value: (t: any) => t.reference ?? '' },
      { header: 'Type', value: (t: any) => t.type },
      { header: 'Description', value: (t: any) => t.description },
      { header: 'Amount', value: (t: any) => t.amount },
      { header: 'Status', value: (t: any) => t.status },
    ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2"><CreditCard className="w-7 h-7 text-blue-600" />Transactions</h1>
          <p className="text-sm text-slate-500 mt-1">Complete transaction ledger for your seller account</p>
        </div>
        <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-50" onClick={exportCsv} disabled={filtered.length === 0}><Download className="w-4 h-4" />Export CSV</button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"><p className="text-xs text-slate-500">Total Credits</p><p className="text-2xl font-black text-emerald-600 mt-1">+{fmt(totals.credits)}</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"><p className="text-xs text-slate-500">Total Debits</p><p className="text-2xl font-black text-red-600 mt-1">-{fmt(totals.debits)}</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"><p className="text-xs text-slate-500">Net</p><p className={`text-2xl font-black mt-1 ${totals.credits - totals.debits >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{totals.credits - totals.debits >= 0 ? '+' : '-'}{fmt(totals.credits - totals.debits)}</p></div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input id="transactions-search" name="transactions-search" type="text" aria-label="Search transactions" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search transactions..." className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none" /></div>
        <div className="flex gap-1.5 flex-wrap">
          {['all', 'credit', 'debit', 'commission', 'refund', 'payout', 'adjustment'].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)} className={`px-3 py-2 text-xs font-bold rounded-lg border capitalize transition-colors ${typeFilter === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{t}</button>
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
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Order</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Description</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Type</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-500">Amount</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(txn => {
                const cfg = TYPE_CONFIG[txn.type] || TYPE_CONFIG.credit;
                return (
                  <tr key={txn.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-500">{txn.reference || '—'}</td>
                    <td className="px-4 py-3.5 text-slate-700">{txn.description}</td>
                    <td className="px-4 py-3.5"><span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${cfg.color}`}>{cfg.label}</span></td>
                    <td className={`px-4 py-3.5 text-right font-bold ${txn.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{txn.amount >= 0 ? '+' : '-'}{fmt(txn.amount)}</td>
                    <td className="px-4 py-3.5"><span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 capitalize">{txn.status}</span></td>
                    <td className="px-4 py-3.5 text-slate-500">{new Date(txn.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="text-center py-12"><CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-sm text-slate-500">No transactions found</p></div>}
      </div>
    </div>
  );
}
