'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Gift, ChevronRight, CreditCard, Search, CheckCircle, Clock, ArrowRight } from 'lucide-react';
import { useRegion } from '@/lib/contexts/region-context';
import { getGiftCardBalance, type GiftCardBalance } from '@/lib/api/marketplace';
import { ApiError } from '@/lib/api-endpoints';
import { useRequireAuth } from '@/lib/contexts/login-prompt';

export default function GiftCardBalancePage() {
  const { formatCurrencyValue, formatDateValue } = useRegion();
  const requireAuth = useRequireAuth();
  const [code, setCode] = useState('');
  const [result, setResult] = useState<GiftCardBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /**
   * Look the card up for real.
   *
   * This previously called `GET /gift-cards/{code}/balance`, which is not a
   * route — every lookup 404'd and both the `else` and the `catch` answered
   * with a hard-coded ₹2,500 "active" balance. Any string typed into the box
   * showed the customer money that does not exist, and a genuinely empty or
   * expired card looked healthy. There is no fallback now: if the API cannot
   * confirm the balance, the page says so.
   */
  const lookup = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      setResult(await getGiftCardBalance(code.trim().toUpperCase()));
    } catch (e) {
      // The gateway's wording distinguishes not-found from expired from
      // disabled, and the customer needs to know which.
      setError(e instanceof ApiError
        ? (e.message || 'We could not check that gift card.')
        : 'We could not reach the gift card service. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const checkBalance = () => {
    if (!code.trim()) { setError('Please enter a gift card code'); return; }
    // Balance lookup is JWT-guarded on the gateway — prompt rather than firing a
    // request that can only come back 401.
    requireAuth({ reason: 'to check your gift card balance', onAuthenticated: () => { void lookup(); } });
  };

  const history = result?.redemptionHistory ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-amber-50/30">
      <section className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white py-10 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Gift className="w-8 h-8" />
            <h1 className="text-3xl font-extrabold">Gift Card Balance</h1>
          </div>
          <p className="text-white/80">Check your gift card balance and view transaction history.</p>
        </div>
      </section>

      <div className="max-w-xl mx-auto px-4 py-8">
        <nav className="text-sm text-slate-500 mb-6">
          <Link href="/" className="hover:text-blue-600">Home</Link>
          <ChevronRight className="w-3 h-3 inline mx-1" />
          <Link href="/gift-cards" className="hover:text-blue-600">Gift Cards</Link>
          <ChevronRight className="w-3 h-3 inline mx-1" />
          <span className="text-slate-800 font-medium">Check Balance</span>
        </nav>

        {/* Check Form */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
          <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-amber-600" /> Enter Gift Card Code
          </h2>
          <div className="flex gap-3">
            <input
              type="text" value={code} onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-lg font-mono tracking-wider focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
              maxLength={19}
            />
            <button onClick={checkBalance} disabled={loading}
              className="px-6 py-3 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 transition-colors disabled:opacity-50 flex items-center gap-2 shrink-0">
              {loading ? 'Checking...' : <><Search className="w-4 h-4" /> Check</>}
            </button>
          </div>
          {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
        </div>

        {/* Result */}
        {result && (
          <>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-8 text-center mb-6">
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <div className="text-sm text-slate-500 mb-1">Available Balance</div>
              <div className="text-4xl font-black text-green-600 mb-2">{formatCurrencyValue(result.currentBalance)}</div>
              {result.expiresAt && (
                <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                  <Clock className="w-4 h-4" />
                  Valid until {formatDateValue(result.expiresAt)}
                </div>
              )}
            </div>

            {/* Redemption history — the card's own record, not a sample. The
                three "transactions" hard-coded here before were shown for every
                card regardless of what it had actually been spent on. */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 font-semibold text-slate-800">Redemption History</div>
              {history.length === 0 ? (
                <div className="px-5 py-6 text-sm text-slate-400 text-center">
                  This gift card has not been used yet.
                </div>
              ) : history.map((tx, i) => (
                <div key={`${tx.orderId}-${i}`} className="px-5 py-3 flex items-center justify-between border-b border-slate-50 last:border-0">
                  <div>
                    <div className="text-sm font-medium text-slate-800">Order {String(tx.orderId).slice(0, 8)}</div>
                    <div className="text-xs text-slate-400">{formatDateValue(tx.date)}</div>
                  </div>
                  <span className="font-bold text-sm text-red-500">
                    −{formatCurrencyValue(Math.abs(Number(tx.amount) || 0))}
                  </span>
                </div>
              ))}
            </div>

            <div className="text-center mt-6">
              <Link href="/" className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center justify-center gap-1">
                Use this balance to shop <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
