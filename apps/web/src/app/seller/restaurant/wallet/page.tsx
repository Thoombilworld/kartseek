'use client';
import ProgressBar from '@/components/seller/progress-bar';
import React, { useState, useEffect } from 'react';
import {
  Wallet, ArrowUpRight, ArrowDownLeft, Download, Calendar,
  Building2, CreditCard, CheckCircle, Clock, TrendingUp,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { vendorRestaurantApi } from '@/lib/api/vendor-restaurant';

interface Transaction {
  id: string; type: 'payout' | 'commission' | 'refund' | 'adjustment';
  amount: number; date: string; status: 'completed' | 'pending' | 'processing';
  description: string; reference: string;
}

const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 'TXN-901', type: 'payout', amount: 42800, date: 'Jun 10, 2026', status: 'completed', description: 'Weekly settlement (Jun 3–9)', reference: 'PAY-20260610-001' },
  { id: 'TXN-902', type: 'commission', amount: -6420, date: 'Jun 10, 2026', status: 'completed', description: 'Platform commission (15%)', reference: 'COM-20260610-001' },
  { id: 'TXN-903', type: 'payout', amount: 38400, date: 'Jun 3, 2026', status: 'completed', description: 'Weekly settlement (May 27–Jun 2)', reference: 'PAY-20260603-001' },
  { id: 'TXN-904', type: 'commission', amount: -5760, date: 'Jun 3, 2026', status: 'completed', description: 'Platform commission (15%)', reference: 'COM-20260603-001' },
  { id: 'TXN-905', type: 'refund', amount: -350, date: 'Jun 8, 2026', status: 'completed', description: 'Refund for order #ORD-9850', reference: 'RFD-20260608-001' },
  { id: 'TXN-906', type: 'payout', amount: 35200, date: 'May 27, 2026', status: 'completed', description: 'Weekly settlement (May 20–26)', reference: 'PAY-20260527-001' },
  { id: 'TXN-907', type: 'payout', amount: 28600, date: 'Jun 17, 2026', status: 'pending', description: 'Weekly settlement (Jun 10–16)', reference: 'PAY-20260617-001' },
];

const WALLET_DATA = {
  balance: 28600,
  pendingPayout: 28600,
  totalEarnings: 542800,
  totalCommissions: 81420,
  nextPayoutDate: 'Jun 17, 2026',
  bankAccount: 'HDFC Bank ****4289',
};

export default function WalletPage() {
  const [txns] = useState(MOCK_TRANSACTIONS);
  const [typeFilter, setTypeFilter] = useState<'all' | 'payout' | 'commission' | 'refund'>('all');

  const filtered = typeFilter === 'all' ? txns : txns.filter((t) => t.type === typeFilter);

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Wallet className="w-6 h-6 text-orange-600" /> Wallet & Settlements
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Track your earnings, commissions, payouts, and statements.</p>
        </div>
        <button className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl text-sm shadow-sm hover:bg-slate-50 transition-colors flex items-center gap-2">
          <Download className="w-4 h-4" /> Download Statement
        </button>
      </div>

      {/* Wallet Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Balance Card */}
        <div className="bg-linear-to-br from-orange-600 to-amber-500 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full" />
          <div className="absolute -right-12 -bottom-12 w-40 h-40 bg-white/5 rounded-full" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-5 h-5 opacity-80" />
              <span className="text-sm font-bold opacity-80">Available Balance</span>
            </div>
            <p className="text-4xl font-black">₹{WALLET_DATA.balance.toLocaleString()}</p>
            <div className="mt-4 flex items-center gap-4 text-sm opacity-80">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4" />
                <span>{WALLET_DATA.bankAccount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Payout Card */}
        <div className="bg-linear-to-br from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-5 h-5 opacity-80" />
              <span className="text-sm font-bold opacity-80">Pending Payout</span>
            </div>
            <p className="text-4xl font-black">₹{WALLET_DATA.pendingPayout.toLocaleString()}</p>
            <div className="mt-4 flex items-center gap-1.5 text-sm opacity-80">
              <Calendar className="w-4 h-4" />
              <span>Next payout: {WALLET_DATA.nextPayoutDate}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Earnings', value: `₹${(WALLET_DATA.totalEarnings / 1000).toFixed(0)}K`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Total Commissions', value: `₹${(WALLET_DATA.totalCommissions / 1000).toFixed(0)}K`, icon: CreditCard, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Net Earnings', value: `₹${((WALLET_DATA.totalEarnings - WALLET_DATA.totalCommissions) / 1000).toFixed(0)}K`, icon: Wallet, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Commission Rate', value: '15%', icon: ArrowDownLeft, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4 shadow-sm border border-slate-100`}>
            <div className="flex items-center gap-2 mb-2">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <span className="text-[10px] font-bold text-slate-500 uppercase">{s.label}</span>
            </div>
            <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-black text-slate-900">Transaction History</h2>
          <div className="flex gap-1.5">
            {(['all', 'payout', 'commission', 'refund'] as const).map((f) => (
              <button key={f} onClick={() => setTypeFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                  typeFilter === f ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}>
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs border-b border-slate-200">
              <tr>
                <th className="px-5 py-3 text-left font-semibold">Type</th>
                <th className="px-5 py-3 text-left font-semibold">Description</th>
                <th className="px-5 py-3 text-left font-semibold">Date</th>
                <th className="px-5 py-3 text-right font-semibold">Amount</th>
                <th className="px-5 py-3 text-center font-semibold">Status</th>
                <th className="px-5 py-3 text-left font-semibold">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((txn) => (
                <tr key={txn.id} className="hover:bg-slate-50/50">
                  <td className="px-5 py-3.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      txn.type === 'payout' ? 'bg-emerald-50' : txn.type === 'commission' ? 'bg-red-50' : 'bg-amber-50'
                    }`}>
                      {txn.type === 'payout' ? <ArrowUpRight className="w-4 h-4 text-emerald-600" /> :
                       txn.type === 'commission' ? <ArrowDownLeft className="w-4 h-4 text-red-600" /> :
                       <ArrowDownLeft className="w-4 h-4 text-amber-600" />}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="font-bold text-slate-900">{txn.description}</p>
                    <p className="text-[10px] text-slate-400">{txn.type}</p>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" /> {txn.date}
                  </td>
                  <td className={`px-5 py-3.5 text-right font-black ${txn.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {txn.amount >= 0 ? '+' : ''}₹{Math.abs(txn.amount).toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      txn.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                      txn.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {txn.status === 'completed' ? '✓ Completed' : txn.status === 'pending' ? '⏳ Pending' : '⚙ Processing'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-[10px] text-slate-400 font-mono">{txn.reference}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Commission Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="font-black text-slate-900 mb-4">Commission Breakdown</h2>
        <div className="space-y-3">
          {[
            { label: 'Platform Commission', pct: 12, amount: '₹65,136', color: 'bg-orange-500' },
            { label: 'Payment Processing', pct: 2, amount: '₹10,856', color: 'bg-blue-500' },
            { label: 'GST on Commission', pct: 1, amount: '₹5,428', color: 'bg-purple-500' },
          ].map((item) => (
            <div key={item.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-slate-700">{item.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{item.pct}%</span>
                  <span className="text-sm font-black text-slate-900">{item.amount}</span>
                </div>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5">
                <ProgressBar percent={item.pct * 6} className={`${item.color} rounded-full h-1.5`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
