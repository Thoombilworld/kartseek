'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { Gift, Send, CreditCard, Sparkles } from 'lucide-react';
import { useRegion } from '@/lib/contexts/region-context';
import { getCurrencySymbolFor } from '@/lib/localization';
import { getGiftCardBalance } from '@/lib/api/marketplace';
import { ApiError } from '@/lib/api-endpoints';

const GIFT_CARD_THEMES = [
  { id: 'birthday', name: 'Birthday', emoji: '🎂', gradient: 'from-pink-500 to-rose-500', bg: 'bg-pink-50' },
  { id: 'wedding', name: 'Wedding', emoji: '💍', gradient: 'from-violet-500 to-purple-500', bg: 'bg-violet-50' },
  { id: 'thankyou', name: 'Thank You', emoji: '🙏', gradient: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-50' },
  { id: 'festive', name: 'Festive', emoji: '🎉', gradient: 'from-amber-500 to-orange-500', bg: 'bg-amber-50' },
  { id: 'corporate', name: 'Corporate', emoji: '🏢', gradient: 'from-blue-600 to-indigo-600', bg: 'bg-blue-50' },
  { id: 'love', name: 'Love', emoji: '❤️', gradient: 'from-red-500 to-pink-500', bg: 'bg-red-50' },
  { id: 'newyear', name: 'New Year', emoji: '🎆', gradient: 'from-indigo-600 to-blue-700', bg: 'bg-indigo-50' },
  { id: 'custom', name: 'Custom', emoji: '✨', gradient: 'from-slate-600 to-slate-800', bg: 'bg-slate-50' },
];

/**
 * Face values per market.
 *
 * These are bare numbers rendered through the active currency formatter, so a
 * single ladder cannot serve both markets: the rupee-scale set this replaces
 * (500 … 25,000) rendered in Doha as gift cards from QAR 500 to QAR 25,000 —
 * roughly $137 to $6,800, where the top card costs more than most of the
 * catalogue.
 */
const DENOMINATIONS_BY_COUNTRY: Record<string, number[]> = {
  QA: [50, 100, 200, 500, 1000, 2000],
  AE: [50, 100, 200, 500, 1000, 2000],
  SA: [50, 100, 200, 500, 1000, 2000],
  BH: [5, 10, 20, 50, 100, 200],
  KW: [5, 10, 20, 50, 100, 200],
  OM: [5, 10, 20, 50, 100, 200],
  IN: [500, 1000, 2000, 5000, 10000, 25000],
};
const DEFAULT_DENOMINATIONS = [50, 100, 200, 500, 1000, 2000];

export default function GiftCardsPage() {
  const { formatCurrencyValue: fmt, country } = useRegion();
  // The card preview's empty state printed a literal '₹---' next to amounts
  // that are formatted through the active currency, so an untouched Qatari
  // gift card opened showing a rupee sign.
  const emptyAmount = `${getCurrencySymbolFor(country.code)}---`;
  const denominations = DENOMINATIONS_BY_COUNTRY[country.code] ?? DEFAULT_DENOMINATIONS;
  const [selectedTheme, setSelectedTheme] = useState(GIFT_CARD_THEMES[0]);
  const [amount, setAmount] = useState(denominations[2]);
  const [customAmount, setCustomAmount] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [message, setMessage] = useState('');
  const [step, setStep] = useState<'design' | 'details'>('design');
  const [checkCode, setCheckCode] = useState('');
  const [checkedBalance, setCheckedBalance] = useState<number | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const effectiveAmount = customAmount ? parseInt(customAmount) || 0 : amount;

  /**
   * Buying a gift card is not implemented anywhere on the platform.
   *
   * This used to be `setStep('sent')` and nothing else — no payment, no card
   * issued, no email — and the page then displayed "Gift Card Sent! 🎉 A gift
   * card worth ₹2,000 has been sent to <address>" with a note promising the
   * recipient would receive a code. The customer walked away believing they had
   * gifted real money.
   *
   * There is no issuance endpoint to call: the gateway exposes only
   * `gift-cards/balance`, `gift-cards/redeem` and a list route. Until purchase
   * and settlement exist server-side, the page says so rather than pretending.
   */
  const handleSend = () => {
    setSendError(
      'Gift card purchase isn’t available yet. Nothing has been charged and no card has been sent — '
      + 'we’ll enable this as soon as gift card issuance goes live.',
    );
  };

  /** Real balance lookup — the code is a bearer secret, so it goes in the body. */
  const handleCheckBalance = async () => {
    const code = checkCode.trim();
    if (!code || checking) return;
    setChecking(true);
    setCheckError(null);
    setCheckedBalance(null);
    try {
      // Was `checkCode.startsWith('KART-') ? 5000 : -1` — any code with the
      // right prefix reported a ₹5,000 balance that no card had.
      const card = await getGiftCardBalance(code);
      setCheckedBalance(Number(card?.currentBalance ?? 0));
    } catch (e) {
      setCheckError(
        e instanceof ApiError && e.status === 404
          ? 'We couldn’t find a gift card with that code.'
          : 'We couldn’t check that code right now. Please try again.',
      );
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-3 xs:px-4 py-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link href="/" className="hover:text-blue-600">Home</Link>
        <span>/</span>
        <span className="text-slate-900 font-medium">Gift Cards</span>
      </div>

      {/* Hero */}
      <div className="bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 rounded-2xl p-8 md:p-12 text-white mb-8 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-white/10" />
        <div className="absolute -left-8 -bottom-8 w-32 h-32 rounded-full bg-white/5" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2"><Gift className="w-6 h-6" /><span className="text-sm font-bold uppercase tracking-wider">KARTSEEK Gift Cards</span></div>
          <h1 className="text-3xl md:text-4xl font-black mb-3">Give the Perfect Gift 🎁</h1>
          <p className="text-purple-100 max-w-lg">Send a KARTSEEK Gift Card to your loved ones. They can use it to shop from millions of products across all categories.</p>
        </div>
      </div>

      {/* The "Gift Card Sent! 🎉" confirmation that used to live here has been
          removed along with the state that reached it. It was shown after a
          click that took no payment, issued no card and sent no email. Deleted
          rather than left unreachable, so it cannot be wired back up by
          accident before issuance actually exists. */}
      {(
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Theme Selection */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h2 className="font-black text-lg text-slate-900 mb-4 flex items-center gap-2"><Sparkles className="w-5 h-5 text-violet-500" /> Choose a Theme</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {GIFT_CARD_THEMES.map(theme => (
                  <button key={theme.id} onClick={() => setSelectedTheme(theme)} className={`p-4 rounded-xl border-2 transition-all text-center ${selectedTheme.id === theme.id ? 'border-violet-500 bg-violet-50 scale-[1.02]' : 'border-slate-200 hover:border-slate-300'}`}>
                    <span className="text-3xl block mb-2">{theme.emoji}</span>
                    <span className="text-sm font-bold text-slate-700">{theme.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Amount Selection */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h2 className="font-black text-lg text-slate-900 mb-4 flex items-center gap-2"><CreditCard className="w-5 h-5 text-green-600" /> Select Amount</h2>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
                {denominations.map(d => (
                  <button key={d} onClick={() => { setAmount(d); setCustomAmount(''); }} className={`py-3 rounded-xl border-2 text-sm font-bold transition-all ${amount === d && !customAmount ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                    {fmt(d)}
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-1.5" htmlFor="or-enter-custom-amount-100-1-00-000">Or enter custom amount (₹100 – ₹1,00,000)</label>
                <input id="or-enter-custom-amount-100-1-00-000" type="number" value={customAmount} onChange={e => setCustomAmount(e.target.value)} placeholder="e.g. 3500" min={100} max={100000} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:border-violet-400 focus:ring-1 focus:ring-violet-100 outline-none" />
              </div>
            </div>

            {/* Recipient Details */}
            {step === 'details' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h2 className="font-black text-lg text-slate-900 mb-4 flex items-center gap-2"><Send className="w-5 h-5 text-blue-600" /> Recipient Details</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="recipient-name">Recipient Name</label>
                    <input id="recipient-name" value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder="e.g. Priya" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-400 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="recipient-email">Recipient Email *</label>
                    <input id="recipient-email" type="email" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} placeholder="e.g. priya@example.com" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-400 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="personal-message-optional">Personal Message (optional)</label>
                    <textarea id="personal-message-optional" value={message} onChange={e => setMessage(e.target.value)} placeholder="Happy Birthday! Treat yourself to something nice 🎉" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-400 outline-none resize-none h-20" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar — Preview & Checkout */}
          <div className="space-y-4">
            {/* Card Preview */}
            <div className={`bg-gradient-to-br ${selectedTheme.gradient} rounded-2xl p-6 text-white shadow-lg aspect-[1.6/1] flex flex-col justify-between`}>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2"><Gift className="w-5 h-5" /><span className="font-black text-sm">KARTSEEK</span></div>
                <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded">{selectedTheme.name}</span>
              </div>
              <div>
                <span className="text-4xl">{selectedTheme.emoji}</span>
              </div>
              <div>
                <p className="text-2xl font-black">{effectiveAmount > 0 ? fmt(effectiveAmount) : emptyAmount}</p>
                <p className="text-xs text-white/70">Gift Card</p>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="font-bold text-slate-900 mb-3">Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Theme</span><span className="font-bold text-slate-800">{selectedTheme.name} {selectedTheme.emoji}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Amount</span><span className="font-bold text-slate-800">{effectiveAmount > 0 ? fmt(effectiveAmount) : '—'}</span></div>
                {recipientEmail && <div className="flex justify-between"><span className="text-slate-500">To</span><span className="font-bold text-slate-800 truncate ml-2">{recipientEmail}</span></div>}
              </div>
              <div className="border-t border-slate-100 mt-3 pt-3 flex justify-between font-black text-slate-900">
                <span>Total</span><span>{effectiveAmount > 0 ? fmt(effectiveAmount) : '—'}</span>
              </div>
              {step === 'design' ? (
                <button onClick={() => effectiveAmount >= 100 && setStep('details')} disabled={effectiveAmount < 100} className="w-full mt-4 bg-violet-600 hover:bg-violet-700 text-white font-bold py-3.5 rounded-xl text-sm disabled:opacity-40">Continue to Details</button>
              ) : (
                <button onClick={handleSend} disabled={!recipientEmail || effectiveAmount < 100} className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl text-sm disabled:opacity-40 flex items-center justify-center gap-2"><Send className="w-4 h-4" /> Send Gift Card — {fmt(effectiveAmount)}</button>
              )}
              {sendError && (
                <p className="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  {sendError}
                </p>
              )}
              {step === 'details' && <button onClick={() => setStep('design')} className="w-full mt-2 text-sm text-slate-500 hover:text-slate-700">← Back to Design</button>}
            </div>

            {/* Check Balance */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="font-bold text-slate-900 mb-3 text-sm">Check Gift Card Balance</h3>
              <div className="flex gap-2">
                <input value={checkCode} onChange={e => setCheckCode(e.target.value.toUpperCase())} placeholder="Enter code" className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:border-violet-400 outline-none uppercase" />
                <button onClick={handleCheckBalance} disabled={checking || !checkCode.trim()} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-40">
                  {checking ? 'Checking…' : 'Check'}
                </button>
              </div>
              {checkedBalance !== null && (
                <p className="text-xs font-bold mt-2 text-green-600">Balance: {fmt(checkedBalance)}</p>
              )}
              {checkError && <p className="text-xs font-bold mt-2 text-red-500">{checkError}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
