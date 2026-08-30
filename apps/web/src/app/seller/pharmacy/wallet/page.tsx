'use client';
import React, { useState, useEffect } from 'react';
import { Wallet as WalletIcon, TrendingUp, Clock, Download, ArrowUpRight, ArrowDownRight, CreditCard, FileText, Filter } from 'lucide-react';
import { vendorPharmacyApi } from '@/lib/api/vendor-pharmacy';

type TxnType = 'all' | 'credit' | 'debit' | 'commission' | 'settlement';

const TRANSACTIONS = [
  { id: 'TXN-9001', type: 'credit' as const, label: 'Order PO-4205 Payment', amount: 100, time: '4 hrs ago', method: 'Cash' },
  { id: 'TXN-9002', type: 'debit' as const, label: 'Platform Commission (15%)', amount: -15, time: '4 hrs ago', method: 'Auto-deduct' },
  { id: 'TXN-9003', type: 'credit' as const, label: 'Order PO-4206 Payment', amount: 145, time: '2 hrs ago', method: 'UPI' },
  { id: 'TXN-9004', type: 'debit' as const, label: 'Payment Gateway Fee (2%)', amount: -2.9, time: '2 hrs ago', method: 'Auto-deduct' },
  { id: 'TXN-9005', type: 'settlement' as const, label: 'Weekly Settlement — Jun 02-08', amount: 42800, time: '3 days ago', method: 'Bank Transfer' },
  { id: 'TXN-9006', type: 'credit' as const, label: 'Order PO-4208 Payment', amount: 189, time: '30 min ago', method: 'COD' },
  { id: 'TXN-9007', type: 'debit' as const, label: 'GST TDS (1%)', amount: -28.4, time: '1 day ago', method: 'Auto-deduct' },
];

export default function PharmacyWalletPage() {
  const [filter, setFilter] = useState<TxnType>('all');
  const filtered = TRANSACTIONS.filter((t) => filter === 'all' || t.type === filter);

  return (
    <div className="max-w-[1000px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Wallet & Payouts</h1>
        <p className="text-sm text-slate-500">Track earnings, commissions, and settlement history.</p>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-linear-to-br from-teal-600 to-emerald-500 rounded-2xl p-6 text-white relative overflow-hidden shadow-lg">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full" />
          <WalletIcon className="w-5 h-5 opacity-70 mb-2" />
          <p className="text-sm font-bold opacity-70">Available Balance</p>
          <p className="text-3xl font-black mt-1">₹36,840</p>
        </div>
        <div className="bg-linear-to-br from-amber-500 to-orange-500 rounded-2xl p-6 text-white relative overflow-hidden shadow-lg">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full" />
          <Clock className="w-5 h-5 opacity-70 mb-2" />
          <p className="text-sm font-bold opacity-70">Pending Settlement</p>
          <p className="text-3xl font-black mt-1">₹12,450</p>
          <p className="text-xs opacity-60 mt-1">Next payout: Jun 15</p>
        </div>
        <div className="bg-linear-to-br from-slate-700 to-slate-800 rounded-2xl p-6 text-white relative overflow-hidden shadow-lg">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full" />
          <TrendingUp className="w-5 h-5 opacity-70 mb-2" />
          <p className="text-sm font-bold opacity-70">This Month Earnings</p>
          <p className="text-3xl font-black mt-1">₹2,84,500</p>
        </div>
      </div>

      {/* Commission Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="font-black text-slate-900 mb-3">Commission Breakdown</h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Platform Commission (15%)', value: '₹42,675', color: 'text-red-600' },
            { label: 'Payment Gateway (2%)', value: '₹5,690', color: 'text-amber-600' },
            { label: 'GST TDS (1%)', value: '₹2,845', color: 'text-purple-600' },
          ].map((c) => (
            <div key={c.label} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
              <p className={`text-xl font-black ${c.color}`}>{c.value}</p>
              <p className="text-[10px] font-bold text-slate-500">{c.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h2 className="font-black text-slate-900">Transaction History</h2>
          <button className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold text-xs rounded-lg flex items-center gap-1 transition-colors">
            <Download className="w-3.5 h-3.5" /> Download Statement
          </button>
        </div>
        <div className="px-4 py-2 flex gap-1.5 border-b border-slate-100">
          {(['all', 'credit', 'debit', 'settlement'] as TxnType[]).map((t) => (
            <button key={t} onClick={() => setFilter(t)}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                filter === t ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}>
              {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <div className="divide-y divide-slate-100">
          {filtered.map((txn) => (
            <div key={txn.id} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  txn.type === 'credit' ? 'bg-emerald-100' : txn.type === 'settlement' ? 'bg-blue-100' : 'bg-red-100'
                }`}>
                  {txn.type === 'credit' ? <ArrowDownRight className="w-4 h-4 text-emerald-600" /> :
                   txn.type === 'settlement' ? <CreditCard className="w-4 h-4 text-blue-600" /> :
                   <ArrowUpRight className="w-4 h-4 text-red-600" />}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">{txn.label}</p>
                  <p className="text-[10px] text-slate-400">{txn.time} • {txn.method}</p>
                </div>
              </div>
              <span className={`font-black text-sm ${txn.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {txn.amount >= 0 ? '+' : ''}₹{Math.abs(txn.amount).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
