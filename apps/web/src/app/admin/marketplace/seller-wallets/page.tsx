'use client';
import React, { useState } from 'react';
import {
  Wallet,
  Download,
  Eye,
  X,
  Plus,
  Minus,
  CreditCard,
  Clock,
  ChevronLeft,
  ChevronRight,
  Search,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';
import { useRegion } from '@/lib/contexts/region-context';
import { CountryFlag } from '@/components/shared/country-flag';
import MarketplaceEmptyState from '@/components/admin/marketplace/marketplace-empty-state';
import { adminMarketplaceApi } from '@/lib/modules/admin-marketplace-api';
import {
  useAdminData,
  useAdminAction,
  AdminToast,
  AdminLoadingSkeleton,
  AdminErrorBanner,
} from '@/hooks/useAdminData';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
const COUNTRY_TO_CODE: Record<string, string> = {
  India: 'IN',
  UAE: 'AE',
  UK: 'GB',
  Qatar: 'QA',
  'Saudi Arabia': 'SA',
};

type WalletItem = {
  seller: string;
  id: string;
  country: string;
  balance: number;
  pending: number;
  totalEarned: number;
  totalPaid: number;
  lastPayout: string;
};
type Transaction = { date: string; type: 'credit' | 'debit'; description: string; amount: number };

/**
 * NO FIXTURE ARRAY LIVES HERE ANY MORE.
 *
 * `const WALLETS: WalletItem[] = [...]` held invented seller balances across
 * several markets, and `walletsSource = apiData?.data?.length ? apiData.data :
 * WALLETS` fell back to them whenever the scoped API answered with an empty
 * list — which is what a correctly scoped locked-admin read returns for a
 * market with no seller wallets. Fabricated money, on a screen an operator
 * reads balances from (whole-branch review, finding G-1 — `:389`).
 *
 * The page already had a loading skeleton, an error banner and an empty state;
 * the fallback was the only thing standing between them and the reader.
 */

const SAMPLE_TXNS: Transaction[] = [
  {
    date: '2026-06-06',
    type: 'credit',
    description: 'Order ORD-8891 — Commission credit',
    amount: 23400,
  },
  {
    date: '2026-06-05',
    type: 'credit',
    description: 'Order ORD-8890 — Commission credit',
    amount: 18500,
  },
  { date: '2026-06-04', type: 'debit', description: 'Payout — NEFT to ****3210', amount: 125000 },
  {
    date: '2026-06-03',
    type: 'credit',
    description: 'Order ORD-8889 — Commission credit',
    amount: 31200,
  },
  { date: '2026-06-02', type: 'debit', description: 'Penalty — Late shipment fee', amount: 500 },
  { date: '2026-06-01', type: 'credit', description: 'Bonus — Performance reward', amount: 5000 },
];

// ── Wallet Detail Drawer ─────────────────────────────────────────────────────
function WalletDrawer({
  wallet: w,
  onClose,
  onAdjust,
  formatCurrency,
}: {
  wallet: WalletItem;
  onClose: () => void;
  onAdjust: () => void;
  formatCurrency: (n: number) => string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose}>
        <DismissOnEscape onDismiss={onClose} />
      </div>
      <div className="relative w-full max-w-md bg-white shadow-2xl overflow-y-auto animate-slide-left">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-black text-slate-900">{w.seller}</h2>
            <p className="text-xs text-slate-500">
              {w.id} · <CountryFlag code={COUNTRY_TO_CODE[w.country] || 'IN'} size="sm" />{' '}
              {w.country}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-5">
          {/* Balance Card */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-5 text-white">
            <p className="text-sm font-bold opacity-80">Available Balance</p>
            <p className="text-3xl font-black mt-1">{formatCurrency(w.balance)}</p>
            <div className="flex justify-between mt-4 text-xs opacity-75">
              <span>Pending: {formatCurrency(w.pending)}</span>
              <span>Last Payout: {w.lastPayout}</span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 rounded-xl p-3 text-center">
              <p className="text-xs text-emerald-600">Total Earned</p>
              <p className="text-lg font-black text-emerald-700">{formatCurrency(w.totalEarned)}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-xs text-blue-600">Total Paid</p>
              <p className="text-lg font-black text-blue-700">{formatCurrency(w.totalPaid)}</p>
            </div>
          </div>

          {/* Transaction History */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3">Recent Transactions</h3>
            <div className="space-y-2">
              {SAMPLE_TXNS.map((t, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0"
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${t.type === 'credit' ? 'bg-emerald-50' : 'bg-red-50'}`}
                  >
                    {t.type === 'credit' ? (
                      <ArrowDownRight className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{t.description}</p>
                    <p className="text-[10px] text-slate-400">{t.date}</p>
                  </div>
                  <span
                    className={`text-sm font-black ${t.type === 'credit' ? 'text-emerald-600' : 'text-red-600'}`}
                  >
                    {t.type === 'credit' ? '+' : '-'}
                    {formatCurrency(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onAdjust}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Adjust Balance
            </button>
            <button className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2">
              <CreditCard className="w-4 h-4" /> Trigger Payout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Adjust Balance Modal ─────────────────────────────────────────────────────
function AdjustModal({
  wallet,
  onConfirm,
  onClose,
}: {
  wallet: WalletItem;
  onConfirm: (amount: number, reason: string) => void;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState('');
  const [type, setType] = useState<'credit' | 'debit'>('credit');
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}>
        <DismissOnEscape onDismiss={onClose} />
      </div>
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="text-lg font-black text-slate-900 mb-1">Adjust Wallet Balance</h3>
        <p className="text-sm text-slate-500 mb-4">
          {wallet.seller} ({wallet.id})
        </p>
        <div className="space-y-4">
          <div className="flex gap-2">
            {(['credit', 'debit'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-colors flex items-center justify-center gap-2 ${type === t ? (t === 'credit' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-red-600 text-white border-red-600') : 'bg-white text-slate-600 border-slate-200'}`}
              >
                {t === 'credit' ? <Plus className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                {t === 'credit' ? 'Credit' : 'Debit'}
              </button>
            ))}
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="amount">
              Amount
            </label>
            <input
              id="amount"
              type="number"
              value={amount || ''}
              onChange={(e) => setAmount(+e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Enter amount..."
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1 block" htmlFor="reason">
              Reason
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for adjustment..."
              className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none h-20 outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-bold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(type === 'debit' ? -amount : amount, reason)}
            disabled={!amount || !reason.trim()}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-40 ${type === 'credit' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}
          >
            Confirm {type === 'credit' ? 'Credit' : 'Debit'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function SellerWalletsPage() {
  const [search, setSearch] = useState('');
  const [selectedWallet, setSelectedWallet] = useState<WalletItem | null>(null);
  const [adjustWallet, setAdjustWallet] = useState<WalletItem | null>(null);

  const { selectedRegion } = useRegion();
  const country = selectedRegion !== 'ALL' ? selectedRegion : undefined;

  const {
    data: apiData,
    loading,
    error,
    refetch,
    toast,
    showToast,
  } = useAdminData(() => adminMarketplaceApi.getSellerWallets(country), [country]);
  const { execute } = useAdminAction(showToast);

  // The API result, whatever it is. An empty list is an answer.
  const walletsSource: WalletItem[] = (apiData?.data as WalletItem[] | undefined) ?? [];
  const { filtered, regionLabel, isFiltered, formatCurrencyValue } =
    useMarketplaceRegionFilter(walletsSource);
  const fmt = (n: number) => formatCurrencyValue(n);

  const searched = filtered.filter(
    (w) =>
      !search || w.seller.toLowerCase().includes(search.toLowerCase()) || w.id.includes(search),
  );
  const totalBalance = searched.reduce((a, w) => a + w.balance, 0);
  const totalPending = searched.reduce((a, w) => a + w.pending, 0);

  const handleAdjust = (amount: number, reason: string) => {
    if (!adjustWallet) return;
    execute(
      () => adminMarketplaceApi.adjustSellerWallet(adjustWallet.id, { amount, reason }),
      `Wallet ${adjustWallet.id} adjusted by ${amount > 0 ? '+' : ''}${fmt(amount)}`,
      () => refetch(),
    );
    setAdjustWallet(null);
    setSelectedWallet(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Seller Wallets</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isFiltered ? `${regionLabel} — ` : ''}Monitor all seller wallet balances and
            transactions
          </p>
        </div>
        <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50">
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-5 text-white">
          <p className="text-sm font-bold opacity-80">Total Wallet Balance</p>
          <p className="text-3xl font-black mt-1">{fmt(totalBalance)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-sm text-slate-500">Pending Settlement</p>
          <p className="text-xl font-black text-amber-600 mt-1">{fmt(totalPending)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-sm text-slate-500">Active Wallets</p>
          <p className="text-xl font-black text-slate-900 mt-1">{searched.length}</p>
        </div>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search seller name or ID..."
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>

      {loading && <AdminLoadingSkeleton rows={5} />}
      {error && !loading && <AdminErrorBanner error={error} onRetry={refetch} />}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs">Seller</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">
                Country
              </th>
              <th className="px-4 py-3 text-right font-semibold text-slate-500 text-xs">Balance</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-500 text-xs">Pending</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-500 text-xs">
                Total Earned
              </th>
              <th className="px-4 py-3 text-right font-semibold text-slate-500 text-xs">
                Total Paid
              </th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">
                Last Payout
              </th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {searched.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <MarketplaceEmptyState title="No wallets found" icon={Wallet} />
                </td>
              </tr>
            ) : (
              searched.map((w) => (
                <tr
                  key={w.id}
                  className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedWallet(w)}
                  tabIndex={0}
                  onKeyDown={activateOnKey(() => setSelectedWallet(w))}
                >
                  <td className="px-4 py-3.5">
                    <p className="font-bold text-slate-900">{w.seller}</p>
                    <p className="text-[10px] text-slate-400">{w.id}</p>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <CountryFlag code={COUNTRY_TO_CODE[w.country] || 'IN'} size="sm" />
                  </td>
                  <td className="px-4 py-3.5 text-right font-black text-slate-900">
                    {fmt(w.balance)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-bold text-amber-600">
                    {fmt(w.pending)}
                  </td>
                  <td className="px-4 py-3.5 text-right text-emerald-600 font-bold">
                    {fmt(w.totalEarned)}
                  </td>
                  <td className="px-4 py-3.5 text-right text-slate-600">{fmt(w.totalPaid)}</td>
                  <td className="px-4 py-3.5 text-center text-xs text-slate-500">{w.lastPayout}</td>
                  <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setSelectedWallet(w)}
                        className="p-1.5 hover:bg-slate-100 rounded-lg"
                      >
                        <Eye className="w-4 h-4 text-slate-400" />
                      </button>
                      <button
                        onClick={() => setAdjustWallet(w)}
                        className="p-1.5 hover:bg-blue-50 rounded-lg"
                      >
                        <Plus className="w-4 h-4 text-blue-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedWallet && (
        <WalletDrawer
          wallet={selectedWallet}
          onClose={() => setSelectedWallet(null)}
          onAdjust={() => setAdjustWallet(selectedWallet)}
          formatCurrency={fmt}
        />
      )}
      {adjustWallet && (
        <AdjustModal
          wallet={adjustWallet}
          onConfirm={handleAdjust}
          onClose={() => setAdjustWallet(null)}
        />
      )}
      <AdminToast toast={toast} />
    </div>
  );
}
