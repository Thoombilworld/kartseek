'use client';
import React from 'react';
import { Wallet, CreditCard, Star, ArrowUpRight, ArrowDownLeft, Plus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const txns = [
  { id: 1, title: 'Order #PH-2026-1234', desc: 'Medicine order', amount: -456, time: '5 Jul, 2:30 PM' },
  { id: 2, title: 'Refund #RF-4521', desc: 'Damaged item', amount: 89, time: '4 Jul, 11:20 AM' },
  { id: 3, title: 'Cashback', desc: 'Order PH-2026-1190', amount: 25, time: '2 Jul, 5:15 PM' },
  { id: 4, title: 'Order #PH-2026-1190', desc: 'Medicine order', amount: -312, time: '2 Jul, 3:00 PM' },
  { id: 5, title: 'Wallet Top-up', desc: 'Added via UPI', amount: 1000, time: '1 Jul, 10:00 AM' },
];

export default function WalletPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <Link href="/" className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="w-5 h-5 text-gray-600" /></Link>
          <h1 className="text-lg font-bold">Wallet & Payments</h1>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Balance */}
        <div className="bg-gradient-to-br from-teal-600 to-cyan-600 rounded-2xl p-6 text-white shadow-xl shadow-teal-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3"><Wallet className="w-6 h-6" /><span className="font-bold text-white/80">KARTSEEK Wallet</span></div>
            <button className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-bold transition-colors">+ Add Money</button>
          </div>
          <p className="text-white/70 text-sm">Available Balance</p>
          <p className="text-4xl font-black tracking-tight">₹ 1,250.00</p>
          <div className="mt-6 flex gap-3">
            <div className="flex-1 bg-white/10 rounded-xl p-3 text-center"><p className="text-white/60 text-xs">This Month</p><p className="font-bold">₹ 2,450</p></div>
            <div className="flex-1 bg-white/10 rounded-xl p-3 text-center"><p className="text-white/60 text-xs">Cashback</p><p className="font-bold">₹ 145</p></div>
            <div className="flex-1 bg-white/10 rounded-xl p-3 text-center"><p className="text-white/60 text-xs">Refunds</p><p className="font-bold">₹ 89</p></div>
          </div>
        </div>

        {/* Loyalty */}
        <div className="bg-white rounded-2xl border p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center"><Star className="w-6 h-6 text-amber-500" /></div>
          <div className="flex-1"><p className="font-bold text-gray-900">2,450 Loyalty Points</p><p className="text-sm text-gray-500">= ₹24.50 redeemable</p></div>
          <button className="bg-amber-50 text-amber-700 font-bold px-4 py-2 rounded-lg text-sm hover:bg-amber-100">Redeem</button>
        </div>

        {/* Payment methods */}
        <div>
          <h2 className="font-bold text-gray-900 mb-3">Saved Payment Methods</h2>
          <div className="space-y-3">
            {[
              { icon: '💳', name: 'HDFC Bank ****4532', sub: 'Visa Debit', def: true },
              { icon: '🏦', name: 'SBI ****9876', sub: 'UPI', def: false },
              { icon: '📱', name: 'Google Pay', sub: 'UPI', def: false },
            ].map((m, i) => (
              <div key={i} className={`bg-white rounded-xl border p-4 flex items-center gap-4 ${m.def ? 'border-teal-300' : 'border-gray-200'}`}>
                <span className="text-2xl">{m.icon}</span>
                <div className="flex-1"><p className="font-semibold text-gray-900">{m.name}</p><p className="text-sm text-gray-500">{m.sub}</p></div>
                {m.def && <span className="text-xs font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded">Default</span>}
              </div>
            ))}
            <button className="w-full border-2 border-dashed border-gray-200 rounded-xl p-4 text-sm font-bold text-teal-600 hover:border-teal-300 flex items-center justify-center gap-2"><Plus className="w-4 h-4" /> Add Payment Method</button>
          </div>
        </div>

        {/* Transactions */}
        <div>
          <h2 className="font-bold text-gray-900 mb-3">Recent Transactions</h2>
          <div className="bg-white rounded-2xl border divide-y">
            {txns.map(t => (
              <div key={t.id} className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${t.amount > 0 ? 'bg-emerald-100' : 'bg-red-50'}`}>
                  {t.amount > 0 ? <ArrowDownLeft className="w-5 h-5 text-emerald-600" /> : <ArrowUpRight className="w-5 h-5 text-red-400" />}
                </div>
                <div className="flex-1"><p className="font-semibold text-sm text-gray-900">{t.title}</p><p className="text-xs text-gray-500">{t.desc}</p></div>
                <div className="text-right"><p className={`font-bold text-sm ${t.amount > 0 ? 'text-emerald-600' : 'text-gray-900'}`}>{t.amount > 0 ? '+' : ''}₹{Math.abs(t.amount)}</p><p className="text-xs text-gray-400">{t.time}</p></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
