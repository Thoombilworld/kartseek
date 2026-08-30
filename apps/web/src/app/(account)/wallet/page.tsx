'use client';

/**
 * KARTSEEK Wallet.
 *
 * Every figure on this page was invented and no request was ever made:
 *
 *  • the balance was `useState(4250)`, shown as `₹{balance}` with `en-IN`
 *    grouping on a platform trading in Qatar;
 *  • "Add Money" ran `await new Promise(r => setTimeout(r, 1500))` under a
 *    comment reading "Simulate API call", incremented the local number and
 *    toasted "₹1,000 added to wallet!" — the customer was told money had been
 *    credited and nothing anywhere had changed;
 *  • the three transactions below it were markup, down to the reference numbers.
 *
 * `/wallet/:userId/balance`, `/topup` and `/transactions` all exist, are guarded
 * by `ResourceOwnershipGuard`, and work: a top-up credits the balance and writes
 * a transaction row carrying `balanceBefore`/`balanceAfter`.
 *
 * The balance is rendered in the currency the wallet itself reports rather than
 * the region's. Those currently disagree — wallet-service defaults new wallets
 * to INR — and restating a real balance in a currency it is not held in would be
 * the same class of error this page already made.
 */

import React, { useCallback, useState } from 'react';
import {
  Wallet as WalletIcon, Plus, ArrowDownRight, ArrowUpRight, History, X,
  CreditCard, Smartphone, Building2, CheckCircle2, Loader2, AlertCircle, RefreshCw,
} from 'lucide-react';

import { AuthGate } from '@/components/shared/auth-gate';
import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
import { useAuth } from '@/lib/contexts/auth-context';
import { useRegion } from '@/lib/contexts/region-context';
import { useAsyncData } from '@/lib/hooks/use-async-data';
import { walletApi } from '@/lib/api-endpoints';

/**
 * Top-up presets.
 *
 * These were 500 / 1,000 / 2,000 / 5,000, sized for rupees. The same numbers in
 * the region's own currency are an order of magnitude larger than anyone tops a
 * wallet up by, so the ladder is scaled to something sane across currencies.
 */
const TOPUP_PRESETS = [50, 100, 250, 500];
const MIN_TOPUP = 10;

const TOPUP_METHODS = [
  { id: 'CARD', label: 'Credit / debit card', icon: CreditCard },
  { id: 'UPI', label: 'UPI / mobile wallet', icon: Smartphone },
  { id: 'NETBANKING', label: 'Bank transfer', icon: Building2 },
] as const;

interface WalletBalance { balance: number; currency: string; frozen: boolean; status: string }
interface WalletTxn {
  id: string; type: 'CREDIT' | 'DEBIT'; amount: string | number; reason: string;
  referenceId: string | null; module: string | null; currency: string; createdAt: string;
}

export default function WalletPage() {
  return (
    <AuthGate reason="Please sign in to view your wallet balance and transactions.">
      <WalletPageContent />
    </AuthGate>
  );
}

function WalletPageContent() {
  const { user } = useAuth();
  const { formatCurrencyValue, currencyCode, formatDateTimeValue } = useRegion();

  const [showTopup, setShowTopup] = useState(false);
  const [topupAmount, setTopupAmount] = useState(TOPUP_PRESETS[1]);
  const [topupMethod, setTopupMethod] = useState<string>('CARD');
  const [topupLoading, setTopupLoading] = useState(false);
  const [topupSuccess, setTopupSuccess] = useState<{ amount: number; newBalance: number } | null>(null);
  const [topupError, setTopupError] = useState<string | null>(null);

  const {
    data: wallet, loading: balanceLoading, error: balanceError, reload: reloadBalance,
  } = useAsyncData<WalletBalance>(
    async () => {
      const res: any = await walletApi.getBalance(user!.id);
      return {
        balance: Number(res?.balance ?? 0),
        currency: String(res?.currency ?? currencyCode),
        frozen: !!res?.frozen,
        status: String(res?.status ?? 'ACTIVE'),
      };
    },
    [user?.id],
    { enabled: !!user?.id },
  );

  const {
    data: transactions, loading: txnLoading, error: txnError, reload: reloadTxns,
  } = useAsyncData<WalletTxn[]>(
    async () => {
      const res: any = await walletApi.getTransactions(user!.id);
      return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    },
    [user?.id],
    { enabled: !!user?.id },
  );

  /**
   * Format an amount in the currency the wallet holds it in.
   *
   * `formatCurrencyValue` renders in the region's currency, which is correct for
   * catalogue prices but not for a stored balance that states its own.
   */
  const money = useCallback((amount: number, currency?: string) => {
    const code = currency ?? wallet?.currency ?? currencyCode;
    if (code !== currencyCode) {
      return `${code} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return formatCurrencyValue(amount);
  }, [wallet?.currency, currencyCode, formatCurrencyValue]);

  const closeTopup = () => {
    if (topupLoading) return;
    setShowTopup(false);
    setTopupSuccess(null);
    setTopupError(null);
  };

  const handleTopup = async () => {
    if (topupAmount < MIN_TOPUP || topupLoading) return;
    setTopupLoading(true);
    setTopupError(null);
    try {
      const res: any = await walletApi.topUp(user!.id, { amount: topupAmount, method: topupMethod });
      // The gateway answers `{ success, transactionId, newBalance }` un-wrapped.
      // A `success: false` inside a 200 is still a failure and must not be
      // reported as money added.
      if (res && res.success === false) {
        throw new Error(res.reason ?? res.message ?? 'The top-up was declined.');
      }
      setTopupSuccess({ amount: topupAmount, newBalance: Number(res?.newBalance ?? 0) });
      // Re-read rather than trusting the local number: the balance the server
      // holds is the one that gets spent.
      await Promise.all([reloadBalance(), reloadTxns()]);
    } catch (err) {
      setTopupError(err instanceof Error ? err.message : 'We could not add money right now.');
    } finally {
      setTopupLoading(false);
    }
  };

  return (
    <div className="space-y-6 xs:space-y-8">
      <div className="border-b border-slate-100 pb-4">
        <h1 className="text-xl xs:text-2xl font-bold text-slate-900">KARTSEEK Wallet</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Manage your balance, add funds, and track refunds across all modules.
        </p>
      </div>

      {/* ── Balance ─────────────────────────────────────────────────────────── */}
      <div className="bg-linear-to-br from-blue-600 to-indigo-800 rounded-2xl p-5 xs:p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="min-w-0">
            <p className="text-blue-100 font-medium mb-1 uppercase tracking-wider text-xs xs:text-sm">
              Available balance
            </p>
            {balanceError ? (
              // Never "0" on a failed read: a zero is a statement about the
              // customer's money, and a wrong one.
              <p className="text-2xl xs:text-3xl font-black">Unavailable</p>
            ) : wallet ? (
              <p className="text-3xl xs:text-4xl md:text-5xl font-black tabular-nums break-words">
                {money(wallet.balance)}
              </p>
            ) : (
              <div className="h-10 xs:h-12 w-40 rounded bg-white/20 animate-pulse" />
            )}
            <p className="text-sm text-blue-200 mt-2">
              {wallet?.frozen
                ? 'This wallet is frozen — contact support to unlock it.'
                : 'Usable across Marketplace, Grocery, Food & Taxi'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => { setShowTopup(true); setTopupSuccess(null); setTopupError(null); }}
            disabled={!wallet || wallet.frozen}
            className="bg-white text-blue-700 font-bold px-6 py-3 min-h-[44px] rounded-xl shadow-md hover:bg-blue-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shrink-0"
          >
            <Plus className="w-5 h-5" aria-hidden="true" /> Add money
          </button>
        </div>
        <WalletIcon className="absolute -right-8 -bottom-10 w-48 h-48 text-white/10" aria-hidden="true" />
      </div>

      {balanceError && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" aria-hidden="true" />
          <p className="flex-1 text-sm text-red-800 break-words">
            <span className="font-bold">We could not load your balance.</span> {balanceError}
          </p>
          <button
            type="button"
            onClick={() => void reloadBalance()}
            className="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors shrink-0"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" /> Try again
          </button>
        </div>
      )}

      {/* ── Add money ───────────────────────────────────────────────────────── */}
      {showTopup && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={closeTopup}>
            <DismissOnEscape onDismiss={closeTopup} />
          </div>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 xs:p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Add money to wallet"
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-[scaleIn_0.2s_ease-out] max-h-[90vh] overflow-y-auto"
            >
              <div className="bg-linear-to-r from-blue-600 to-indigo-700 px-5 xs:px-6 py-5 flex items-center justify-between sticky top-0">
                <div>
                  <h2 className="font-black text-white text-lg">Add money</h2>
                  <p className="text-blue-100 text-xs">Credited to your KARTSEEK wallet</p>
                </div>
                <button
                  type="button"
                  onClick={closeTopup}
                  aria-label="Close"
                  className="text-white/70 hover:text-white transition-colors w-11 h-11 flex items-center justify-center shrink-0"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              {topupSuccess ? (
                <div className="px-6 py-10 text-center">
                  <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" aria-hidden="true" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900">
                    {money(topupSuccess.amount)} added
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    New balance: {money(wallet?.balance ?? topupSuccess.newBalance)}
                  </p>
                  <button
                    type="button"
                    onClick={closeTopup}
                    className="mt-6 w-full py-3 min-h-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div className="px-5 xs:px-6 py-5 space-y-5">
                  <div>
                    <label htmlFor="topup-amount" className="block text-sm font-bold text-slate-700 mb-2">
                      Amount
                    </label>
                    {/* Two-up on a small handset: four columns leave ~55px per
                        preset at 320px, which a formatted amount does not fit. */}
                    <div className="grid grid-cols-2 xs:grid-cols-4 gap-2 mb-3">
                      {TOPUP_PRESETS.map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setTopupAmount(amt)}
                          aria-pressed={topupAmount === amt}
                          className={`py-2.5 min-h-[44px] rounded-lg text-sm font-bold transition-all border-2 ${
                            topupAmount === amt
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-slate-200 text-slate-600 hover:border-blue-300'
                          }`}
                        >
                          {money(amt)}
                        </button>
                      ))}
                    </div>
                    <input
                      id="topup-amount"
                      type="number"
                      inputMode="decimal"
                      value={topupAmount}
                      onChange={(e) => setTopupAmount(Math.max(0, Number(e.target.value)))}
                      /* 16px minimum: iOS Safari zooms into any smaller control
                         on focus and never zooms back out. */
                      className="w-full px-4 py-3 min-h-[44px] border border-slate-200 rounded-xl text-base font-bold text-slate-900 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none"
                      placeholder="Enter an amount"
                      min={MIN_TOPUP}
                      aria-describedby="topup-min"
                    />
                    {topupAmount > 0 && topupAmount < MIN_TOPUP && (
                      <p id="topup-min" className="text-xs text-red-500 mt-1">
                        Minimum top-up is {money(MIN_TOPUP)}
                      </p>
                    )}
                  </div>

                  <fieldset>
                    <legend className="block text-sm font-bold text-slate-700 mb-2">Payment method</legend>
                    <div className="space-y-2">
                      {TOPUP_METHODS.map((m) => (
                        <label
                          key={m.id}
                          className={`flex items-center gap-3 p-3 min-h-[44px] rounded-xl border-2 cursor-pointer transition-all ${
                            topupMethod === m.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="topupMethod"
                            value={m.id}
                            checked={topupMethod === m.id}
                            onChange={() => setTopupMethod(m.id)}
                            className="accent-blue-600 w-5 h-5"
                          />
                          <m.icon className="w-5 h-5 text-slate-600" aria-hidden="true" />
                          <span className="text-sm font-semibold text-slate-900">{m.label}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  {topupError && (
                    <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      {topupError}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleTopup}
                    disabled={topupAmount < MIN_TOPUP || topupLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black py-4 min-h-[44px] rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-base"
                  >
                    {topupLoading
                      ? <><Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> Processing…</>
                      : <>Add {money(topupAmount)}</>}
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Transactions ────────────────────────────────────────────────────── */}
      <section aria-label="Recent transactions">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5" aria-hidden="true" /> Recent transactions
          </h2>
          {transactions && transactions.length > 0 && (
            <span className="text-sm text-slate-400">{transactions.length} shown</span>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm divide-y divide-slate-100 overflow-hidden">
          {txnLoading && !transactions ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-100 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-1/2 bg-slate-100 rounded animate-pulse" />
                  <div className="h-3 w-1/4 bg-slate-100 rounded animate-pulse" />
                </div>
              </div>
            ))
          ) : txnError ? (
            <div role="alert" className="p-5 flex flex-col sm:flex-row sm:items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" aria-hidden="true" />
              <p className="flex-1 text-sm text-red-800 break-words">
                <span className="font-bold">We could not load your transactions.</span> {txnError}
              </p>
              <button
                type="button"
                onClick={() => void reloadTxns()}
                className="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors shrink-0"
              >
                <RefreshCw className="w-4 h-4" aria-hidden="true" /> Try again
              </button>
            </div>
          ) : !transactions || transactions.length === 0 ? (
            <div className="p-8 text-center">
              <p className="font-bold text-slate-900">No transactions yet</p>
              <p className="text-sm text-slate-500 mt-1">
                Top-ups, payments and refunds all appear here.
              </p>
            </div>
          ) : (
            transactions.map((txn) => {
              const credit = txn.type === 'CREDIT';
              const amount = Number(txn.amount);
              return (
                <div key={txn.id} className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3 xs:gap-4 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        credit ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                      }`}
                    >
                      {credit
                        ? <ArrowDownRight className="w-5 h-5" aria-hidden="true" />
                        : <ArrowUpRight className="w-5 h-5" aria-hidden="true" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 text-sm truncate">{txn.reason}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                        {txn.module && (
                          <span className="bg-slate-100 text-slate-700 px-1.5 rounded font-semibold capitalize">
                            {txn.module}
                          </span>
                        )}
                        {txn.referenceId && <span className="truncate font-mono">{txn.referenceId}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`font-bold tabular-nums ${credit ? 'text-emerald-600' : 'text-slate-900'}`}>
                      {credit ? '+' : '−'}{money(Math.abs(amount), txn.currency)}
                    </p>
                    <p className="text-xs text-slate-400">{formatDateTimeValue(txn.createdAt)}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
