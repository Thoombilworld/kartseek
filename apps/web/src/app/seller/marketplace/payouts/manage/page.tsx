'use client';

import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import { useSeller } from '@/lib/contexts/seller-context';
import { sellerApi } from '@/lib/modules/seller-api';
import { useSellerData } from '@/lib/hooks/use-seller-data';
import { SellerDataState } from '@/components/seller/marketplace/data-state';
import { CreditCard, Plus, Trash2, Star, ShieldCheck, AlertCircle, Landmark } from 'lucide-react';

/**
 * Payout destinations.
 *
 * Payouts had nowhere to be sent: `POST /sellers/:id/payouts` accepted a
 * `bankAccountId` that referred to nothing, and this page had no backend, so a
 * seller could request money with no account on file. Backed by
 * `/sellers/:id/bank-accounts`.
 *
 * The account number is sent once, encrypted at rest, and never returned — the
 * API answers with the last four digits only, which is all a seller needs to
 * tell two of their own accounts apart.
 */

interface BankAccount {
  id: string;
  accountHolderName: string;
  bankName: string;
  accountNumberMasked: string;
  bankCode: string | null;
  upiId: string | null;
  method: string;
  isDefault: boolean;
  isVerified: boolean;
  addedAt: string;
}

export default function ManagePayoutsPage() {
  const { seller } = useSeller();
  const [draft, setDraft] = useState({ accountHolderName: '', bankName: '', accountNumber: '', bankCode: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const res = useSellerData<{ data: BankAccount[] }>((sellerId) => sellerApi.getBankAccounts(sellerId) as any);
  const accounts = (res.data?.data ?? []) as BankAccount[];

  const say = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  const run = useCallback(async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true); setError(null);
    try {
      await fn();
      res.reload();
      say(done);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That did not work — please try again.');
      return false;
    } finally { setBusy(false); }
  }, [res]);

  const add = async () => {
    const ok = await run(() => sellerApi.addBankAccount(seller.sellerId, { ...draft, method: 'bank' }), 'Account added');
    if (ok) setDraft({ accountHolderName: '', bankName: '', accountNumber: '', bankCode: '' });
  };

  const field = 'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="space-y-6">
      <div>
        <Link href="/seller/marketplace/payouts" className="text-sm text-slate-500 hover:text-blue-600 mb-2 inline-flex items-center gap-1">
          ← Back to payouts
        </Link>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-blue-600" aria-hidden />
          Bank Accounts
        </h1>
        <p className="text-sm text-slate-500 mt-1">Where your payouts are sent. The default account receives every withdrawal.</p>
      </div>

      {accounts.length === 0 && !res.loading && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>You have no account on file, so a payout has nowhere to go. Add one before requesting a withdrawal.</span>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
          <Landmark className="w-4 h-4 text-slate-400" />Add a bank account
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5" htmlFor="account-holder">Account holder *</label>
            <input id="account-holder" value={draft.accountHolderName} onChange={e => setDraft({ ...draft, accountHolderName: e.target.value })} className={field} placeholder="As it appears on the account" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5" htmlFor="bank-name">Bank name *</label>
            <input id="bank-name" value={draft.bankName} onChange={e => setDraft({ ...draft, bankName: e.target.value })} className={field} placeholder="e.g. HDFC Bank" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5" htmlFor="account-number">Account number *</label>
            <input id="account-number"
              value={draft.accountNumber}
              onChange={e => setDraft({ ...draft, accountNumber: e.target.value })}
              className={field}
              inputMode="numeric"
              autoComplete="off"
              placeholder="6–20 digits"
            />
            <p className="text-[10px] text-slate-400 mt-1">Stored encrypted. Only the last four digits are ever shown back to you.</p>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5" htmlFor="bank-code">Bank code</label>
            <input id="bank-code" value={draft.bankCode} onChange={e => setDraft({ ...draft, bankCode: e.target.value })} className={field} placeholder="IFSC / SWIFT / routing" />
          </div>
        </div>
        <button
          onClick={add}
          disabled={busy}
          className="mt-4 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2.5 rounded-lg text-sm font-bold"
        >
          <Plus className="w-4 h-4" />Add account
        </button>
        {error && <p className="mt-3 text-xs text-red-600 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}</p>}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <SellerDataState
          loading={res.loading} error={res.error} unavailable={res.unavailable}
          isEmpty={accounts.length === 0} feature="Bank accounts" onRetry={res.reload}
          emptyTitle="No accounts on file"
          emptyDescription="Add the account your payouts should be sent to."
          emptyIcon={Landmark}
        >
          <div className="divide-y divide-slate-100">
            {accounts.map(a => (
              <div key={a.id} className="flex items-center gap-4 px-5 py-4">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <Landmark className="w-5 h-5 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                    {a.bankName}
                    {a.isDefault && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 flex items-center gap-1">
                        <Star className="w-2.5 h-2.5 fill-emerald-700" />Default
                      </span>
                    )}
                    {a.isVerified ? (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 flex items-center gap-1">
                        <ShieldCheck className="w-2.5 h-2.5" />Verified
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-500">Unverified</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {a.accountHolderName} · {a.accountNumberMasked}{a.bankCode ? ` · ${a.bankCode}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!a.isDefault && (
                    <button
                      onClick={() => void run(() => sellerApi.setDefaultBankAccount(seller.sellerId, a.id), 'Default account updated')}
                      disabled={busy}
                      className="text-xs font-bold text-blue-600 hover:underline"
                    >
                      Make default
                    </button>
                  )}
                  <button
                    onClick={() => void run(() => sellerApi.deleteBankAccount(seller.sellerId, a.id), 'Account removed')}
                    disabled={busy}
                    className="p-1.5 rounded hover:bg-red-50"
                    aria-label={`Remove ${a.bankName}`}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </SellerDataState>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-xl">{toast}</div>
      )}
    </div>
  );
}
