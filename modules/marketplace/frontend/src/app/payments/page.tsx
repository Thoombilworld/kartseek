'use client';

import React from 'react';
import Link from 'next/link';
import { CreditCard, ChevronRight, ShieldCheck, Info } from 'lucide-react';
import { useRegion } from '@/lib/contexts/region-context';

/**
 * Payment methods available on this account.
 *
 * This page previously displayed two saved cards ("HDFC Bank •••• 4521",
 * "ICICI Bank •••• 8903"), two UPI IDs and four wallets — all `useState`
 * literals, with the page making no API call whatsoever. Nothing on the
 * platform stores a customer's payment instruments: there is no
 * saved-payment-methods endpoint, and the gateway's `get_payment_methods` only
 * reports which methods a *market* supports, not which ones a person has saved.
 *
 * So the page told every customer they had cards and wallets on file that do
 * not exist, complete with a green "encrypted and stored securely" banner over
 * the top. Fabricated financial state is the worst version of this problem —
 * a shopper who believes it reaches checkout expecting one click and finds
 * nothing there.
 *
 * What it shows now is true: the methods this market can actually clear, and a
 * plain statement that details are entered at checkout and not retained.
 */
export default function PaymentsPage() {
  const { paymentMethods, country } = useRegion();

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-blue-50/30">
      {/* Hero */}
      <section className="bg-linear-to-r from-slate-700 via-slate-800 to-slate-900 text-white py-8 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <CreditCard className="w-7 h-7" />
            <h1 className="text-2xl font-extrabold">Payment Methods</h1>
          </div>
          <p className="text-white/70 text-sm">
            How you can pay for orders in {country.name}.
          </p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <nav className="text-sm text-slate-500 mb-6">
          <Link href="/" className="hover:text-blue-600">Home</Link>
          <ChevronRight className="w-3 h-3 inline mx-1" />
          <span className="text-slate-800 font-medium">Payments</span>
        </nav>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 mb-6">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold">You have no saved payment methods.</p>
            <p className="text-blue-700 mt-0.5">
              KARTSEEK does not store card or UPI details on your account — you enter them at
              checkout each time, and they are passed straight to the payment gateway.
            </p>
          </div>
        </div>

        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60">
            <h2 className="font-bold text-slate-900">Accepted at checkout</h2>
          </div>
          {paymentMethods.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-500">
              No payment methods are configured for this market yet.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {paymentMethods.map((method) => (
                <li key={`${method.type}-${method.gateway}`} className="px-5 py-3.5 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">
                      {method.label}
                      {method.isLocal && (
                        <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                          Local
                        </span>
                      )}
                    </p>
                    {method.description && (
                      <p className="text-xs text-slate-500 mt-0.5">{method.description}</p>
                    )}
                  </div>
                  {method.isDefault && (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded whitespace-nowrap">
                      Default
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-green-600 shrink-0" />
          <p className="text-sm text-green-700">
            Payments are processed over an encrypted connection by the gateway for your market.
          </p>
        </div>

        <Link
          href="/cart"
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700"
        >
          Go to cart <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
