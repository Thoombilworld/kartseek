'use client';

import React, { useState } from 'react';
import { ArrowLeft, Wallet, CheckCircle, DollarSign, CreditCard, AlertTriangle, Info, Send, Clock, Download, Building } from 'lucide-react';
import Link from 'next/link';

const payoutHistory = [
  { id: 'PO-2026-048', amount: '₹1,18,200', date: 'May 18, 2026', period: 'May 1–15', method: 'NEFT', status: 'completed', account: 'HDFC ****6789' },
  { id: 'PO-2026-032', amount: '₹1,05,400', date: 'May 2, 2026', period: 'Apr 16–30', method: 'NEFT', status: 'completed', account: 'HDFC ****6789' },
  { id: 'PO-2026-018', amount: '₹98,600', date: 'Apr 18, 2026', period: 'Apr 1–15', method: 'NEFT', status: 'completed', account: 'HDFC ****6789' },
];

const statusColors: Record<string, string> = {
  completed: 'bg-emerald-100 text-emerald-700',
  processing: 'bg-blue-100 text-blue-700',
  failed: 'bg-red-100 text-red-700',
};

export default function RequestPayoutPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    amount: '',
    method: 'neft',
    notes: '',
    confirmAccount: false,
  });

  const availableBalance = 96400;
  const pendingCommission = 31600;
  const totalEarned = 271200;

  const handleChange = (field: string, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const handleRequestFull = () => {
    setForm(prev => ({ ...prev, amount: availableBalance.toString() }));
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto p-4 md:p-8">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Send className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Payout Requested!</h2>
          <p className="text-slate-500 mb-1 font-medium">₹{Number(form.amount).toLocaleString()}</p>
          <p className="text-sm text-slate-400 mb-2">
            via {form.method === 'neft' ? 'NEFT' : form.method === 'imps' ? 'IMPS' : 'UPI'} to HDFC ****6789
          </p>
          <div className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full text-xs font-bold mb-6">
            <Clock className="w-3.5 h-3.5" /> Processing — ETA 1-2 business days
          </div>
          <div className="flex items-center justify-center gap-3">
            <Link href="/franchise/commissions" className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold transition-colors">
              View Commissions
            </Link>
            <Link href="/franchise" className="bg-white hover:bg-slate-50 text-slate-700 px-6 py-2.5 rounded-lg text-sm font-bold border border-slate-200 transition-colors">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/franchise/commissions" className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center hover:bg-slate-50 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Request Payout</h1>
          <p className="text-slate-500 text-sm">Withdraw your earned commissions to your registered bank account.</p>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-linear-to-br from-teal-500 to-teal-600 p-5 rounded-xl shadow-md text-white">
          <Wallet className="w-5 h-5 opacity-80" />
          <p className="text-3xl font-black mt-3">₹{(availableBalance / 1000).toFixed(1)}K</p>
          <p className="text-sm font-medium opacity-80 mt-1">Available Balance</p>
          <p className="text-xs opacity-60 mt-1">Ready for withdrawal</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <Clock className="w-5 h-5 text-amber-500" />
          <p className="text-2xl font-black text-slate-900 mt-3">₹{(pendingCommission / 1000).toFixed(1)}K</p>
          <p className="text-sm text-slate-500 font-medium mt-1">Pending Commission</p>
          <p className="text-xs text-slate-400 mt-1">Processing • clears in 2-3 days</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <DollarSign className="w-5 h-5 text-indigo-500" />
          <p className="text-2xl font-black text-slate-900 mt-3">₹{(totalEarned / 100000).toFixed(1)}L</p>
          <p className="text-sm text-slate-500 font-medium mt-1">Total Earned (Lifetime)</p>
          <p className="text-xs text-slate-400 mt-1">Since Jan 2025</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Payout Form */}
        <div className="lg:col-span-3">
          <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-5">
            <h3 className="font-bold text-slate-900 flex items-center gap-2"><Send className="w-4 h-4 text-teal-600" /> Withdrawal Details</h3>

            {/* Registered Bank Account */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-400 font-medium mb-2">Payout to Registered Account</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center"><Building className="w-5 h-5 text-blue-600" /></div>
                <div>
                  <p className="font-bold text-slate-900">HDFC Bank</p>
                  <p className="text-xs text-slate-500">A/c ****6789 • HDFC0001234 • Mumbai South Franchise Pvt Ltd</p>
                </div>
                <CheckCircle className="w-5 h-5 text-emerald-500 ml-auto shrink-0" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Withdrawal Amount (₹) *</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                <input type="number" required min="500" max={availableBalance} step="1" placeholder="Enter amount" value={form.amount} onChange={e => handleChange('amount', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-slate-400">Min ₹500 • Max ₹{availableBalance.toLocaleString()}</p>
                <button type="button" onClick={handleRequestFull} className="text-xs text-teal-600 font-bold hover:underline">Withdraw Full Balance</button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Transfer Method</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'neft', label: 'NEFT', desc: '1-2 hours', icon: '🏦' },
                  { value: 'imps', label: 'IMPS', desc: 'Instant', icon: '⚡' },
                  { value: 'upi', label: 'UPI', desc: 'Instant', icon: '📱' },
                ].map(m => (
                  <button key={m.value} type="button" onClick={() => handleChange('method', m.value)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      form.method === m.value ? 'border-teal-500 bg-teal-50 ring-1 ring-teal-500' : 'border-slate-200 hover:border-slate-300'
                    }`}>
                    <span className="text-xl">{m.icon}</span>
                    <p className="font-bold text-slate-900 text-sm mt-2">{m.label}</p>
                    <p className="text-xs text-slate-400">{m.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="notes-optional">Notes (optional)</label>
              <textarea id="notes-optional" placeholder="Any special instructions for this payout..." value={form.notes} onChange={e => handleChange('notes', e.target.value)} rows={2}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
            </div>

            {/* Confirmation checkbox */}
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <input type="checkbox" required checked={form.confirmAccount} onChange={e => handleChange('confirmAccount', e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
              <div>
                <p className="text-sm font-bold text-amber-800">I confirm the withdrawal</p>
                <p className="text-xs text-amber-600">I have verified the bank account details and authorize this payout request. This action cannot be reversed once processed.</p>
              </div>
            </div>

            {/* Summary */}
            {form.amount && Number(form.amount) >= 500 && (
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-teal-700">Withdrawal Amount</span>
                  <span className="text-sm font-bold text-teal-700">₹{Number(form.amount).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-teal-700">Processing Fee</span>
                  <span className="text-sm font-bold text-emerald-600">₹0 (Free)</span>
                </div>
                <div className="border-t border-teal-200 pt-2 flex items-center justify-between">
                  <span className="text-sm font-bold text-teal-800">You&apos;ll Receive</span>
                  <span className="text-lg font-black text-teal-800">₹{Number(form.amount).toLocaleString()}</span>
                </div>
              </div>
            )}

            <button type="submit" disabled={!form.confirmAccount || !form.amount || Number(form.amount) < 500}
              className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-sm">
              <Send className="w-4 h-4" /> Request Payout
            </button>
          </form>
        </div>

        {/* Payout History */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Recent Payouts</h3>
              <button className="text-xs text-teal-600 font-bold hover:underline flex items-center gap-1"><Download className="w-3 h-3" /> Export</button>
            </div>
            <div className="divide-y divide-slate-100">
              {payoutHistory.map(p => (
                <div key={p.id} className="px-5 py-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-black text-slate-900">{p.amount}</p>
                    <span className={`${statusColors[p.status]} px-2 py-0.5 rounded text-[10px] font-bold capitalize`}>{p.status}</span>
                  </div>
                  <p className="text-xs text-slate-500">{p.id} • {p.date}</p>
                  <p className="text-xs text-slate-400 mt-1">{p.method} → {p.account} • Period: {p.period}</p>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-slate-200 bg-slate-50/50 text-center">
              <Link href="/franchise/commissions" className="text-xs text-teal-600 font-bold hover:underline">View Full Ledger →</Link>
            </div>
          </div>

          {/* Help Box */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 mt-4">
            <h4 className="font-bold text-slate-900 text-sm mb-3">Payout FAQ</h4>
            <div className="space-y-3 text-xs">
              <div>
                <p className="font-bold text-slate-700">When will I receive my payout?</p>
                <p className="text-slate-500">NEFT: 1-2 hours during bank hours. IMPS/UPI: Instant, 24/7.</p>
              </div>
              <div>
                <p className="font-bold text-slate-700">Is there a minimum withdrawal?</p>
                <p className="text-slate-500">Yes, minimum ₹500 per transaction.</p>
              </div>
              <div>
                <p className="font-bold text-slate-700">Any processing fees?</p>
                <p className="text-slate-500">All payouts are free — no hidden charges.</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
