'use client';

import React from 'react';
import { useSeller } from '@/lib/contexts/seller-context';
import { sellerApi, type WalletData, type WalletTransaction } from '@/lib/modules/seller-api';
import { useSellerData } from '@/lib/hooks/use-seller-data';
import { SellerDataState } from '@/components/seller/marketplace/data-state';
import { Wallet, Clock, ArrowUpRight, Lock, ArrowDownLeft, Search, Download, TrendingUp, RefreshCw } from 'lucide-react';
import { useSellerMoney } from '@/lib/hooks/use-seller-money';

const TYPE_CONFIG: Record<string, { color: string; icon: typeof ArrowUpRight; label: string }> = {
  credit: { color: 'text-emerald-600 bg-emerald-50', icon: ArrowDownLeft, label: 'Credit' },
  debit: { color: 'text-red-600 bg-red-50', icon: ArrowUpRight, label: 'Debit' },
  payout: { color: 'text-blue-600 bg-blue-50', icon: ArrowUpRight, label: 'Payout' },
  commission: { color: 'text-amber-600 bg-amber-50', icon: ArrowUpRight, label: 'Commission' },
  refund: { color: 'text-red-600 bg-red-50', icon: RefreshCw, label: 'Refund' },
  adjustment: { color: 'text-violet-600 bg-violet-50', icon: TrendingUp, label: 'Adjustment' },
};


export default function WalletPage() {
  const { format: formatMoney } = useSellerMoney();
  const fmt = (n: number | null | undefined) => formatMoney(n != null ? Math.abs(n) : null);
  const { seller } = useSeller();
  const [search, setSearch] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState('all');

  const walletRes = useSellerData<{ data?: WalletData } & Partial<WalletData>>(
    (sellerId) => sellerApi.getWallet(sellerId),
  );
  // `:sellerId/wallet` answers with the balance at the top level, because the
  // handler sets `success` itself and the gateway's TransformInterceptor leaves
  // an already-enveloped body alone. Reading only `data.data` therefore found
  // nothing and the page announced "No wallet data" to a seller sitting on a
  // real balance. Accepts either shape rather than betting on one.
  const wallet = (walletRes.data?.data ?? walletRes.data ?? null) as WalletData | null;

  // The balance and the ledger come from two different services — payout-service
  // owns `balance`/`holdAmount`, wallet-service owns the movements — so
  // `:sellerId/wallet` carries no `transactions` array. Reading one off it left
  // this list permanently empty no matter how much activity the seller had.
  const txnRes = useSellerData<{ data: WalletTransaction[] }>(
    (sellerId) => sellerApi.getWalletTransactions(sellerId) as Promise<{ data: WalletTransaction[] }>,
  );
  const transactions = txnRes.data?.data ?? [];

  const filtered = transactions.filter(t => {
    if (typeFilter !== 'all' && t.type !== typeFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return [t.description, t.reference].some(field => (field ?? '').toLowerCase().includes(q));
  });

  const handleExport = async () => {
    if (!seller.sellerId) return;
    try {
      await sellerApi.exportReport(seller.sellerId, 'wallet', 'csv');
    } catch {
      // Export is best-effort.
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Wallet className="w-7 h-7 text-blue-600" />Wallet
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage your seller wallet and funds</p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors"
        >
          <Download className="w-4 h-4" />Export
        </button>
      </div>

      <SellerDataState
        loading={walletRes.loading}
        error={walletRes.error}
        unavailable={walletRes.unavailable}
        isEmpty={!wallet}
        feature="Wallet"
        onRetry={walletRes.reload}
        emptyTitle="No wallet data"
        emptyDescription="Your wallet balance and transactions will appear here once your first order settles."
      >
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Wallet Balance', value: fmt(wallet?.balance), icon: Wallet, color: 'bg-emerald-50 text-emerald-600' },
            { label: 'Pending Payouts', value: fmt(wallet?.pendingPayout), icon: Clock, color: 'bg-amber-50 text-amber-600' },
            { label: 'Total Withdrawn', value: fmt(wallet?.completedPayouts), icon: ArrowUpRight, color: 'bg-blue-50 text-blue-600' },
            { label: 'Hold Amount', value: fmt(wallet?.holdAmount), icon: Lock, color: 'bg-red-50 text-red-600' },
          ].map(kpi => (
            <div key={kpi.label} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${kpi.color}`}>
                  <kpi.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">{kpi.label}</p>
                  <p className="text-xl font-black text-slate-900">{kpi.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input id="wallet-search" name="wallet-search" type="text" aria-label="Search wallet transactions" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search transactions..." className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {['all', 'credit', 'payout', 'commission', 'refund'].map(t => (
              <button key={t} onClick={() => setTypeFilter(t)} className={`px-3 py-2 text-xs font-bold rounded-lg border capitalize transition-colors ${typeFilter === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                {t === 'all' ? 'All' : t}
              </button>
            ))}
          </div>
        </div>

        {/* Transaction Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm mt-6">
          {/* Own horizontal scroll: a wide table must not drag the page sideways. */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-500">Transaction</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-500">Type</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-500">Amount</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-500">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-500">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(txn => {
                  const cfg = TYPE_CONFIG[txn.type] || TYPE_CONFIG.credit;
                  const TxnIcon = cfg.icon;
                  return (
                    <tr key={txn.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cfg.color}`}>
                            <TxnIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{txn.description}</p>
                            {txn.reference && <p className="text-[10px] text-slate-400">{txn.reference}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${cfg.color}`}>{cfg.label}</span>
                      </td>
                      <td className={`px-4 py-3.5 text-right font-bold ${txn.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {txn.amount >= 0 ? '+' : ''}{fmt(txn.amount)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 capitalize">{txn.status}</span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500">{new Date(txn.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && transactions.length > 0 && (
            <div className="text-center py-12">
              <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No transactions match your filter</p>
              <p className="text-xs text-slate-400 mt-1">Try a different search or filter</p>
            </div>
          )}
          {/* The ledger is a separate request from the balance above, so it can
              fail on its own. Saying so beats rendering "No transactions yet"
              over a list that simply never loaded. */}
          {transactions.length === 0 && !txnRes.loading && (
            <div className="text-center py-12">
              <Wallet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              {txnRes.error ? (
                <>
                  <p className="text-sm text-slate-500">Could not load your transactions</p>
                  <button onClick={txnRes.reload} className="text-xs font-bold text-blue-600 hover:underline mt-1">Try again</button>
                </>
              ) : (
                <p className="text-sm text-slate-500">No transactions yet</p>
              )}
            </div>
          )}
        </div>
      </SellerDataState>
    </div>
  );
}
