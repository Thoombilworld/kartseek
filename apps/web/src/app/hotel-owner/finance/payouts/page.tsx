'use client';
import React, { useState } from 'react';
import { DollarSign, CheckCircle, Clock, Download, Calendar, ArrowRight, Building2, ChevronDown, CreditCard, TrendingUp, AlertCircle, FileText } from 'lucide-react';

type Payout = { id: string; period: string; amount: number; currency: string; status: 'paid' | 'pending' | 'processing'; date: string; bankAccount: string; bookings: number };

const PAYOUTS: Payout[] = [
  { id: 'PAY-001', period: 'Jun 1–15, 2026', amount: 45000, currency: 'AED', status: 'paid', date: 'Jun 18, 2026', bankAccount: 'Emirates NBD ****4567', bookings: 24 },
  { id: 'PAY-002', period: 'May 16–31, 2026', amount: 38500, currency: 'AED', status: 'paid', date: 'Jun 3, 2026', bankAccount: 'Emirates NBD ****4567', bookings: 21 },
  { id: 'PAY-003', period: 'Jun 16–30, 2026', amount: 42000, currency: 'AED', status: 'processing', date: 'Jul 3, 2026 (est.)', bankAccount: 'Emirates NBD ****4567', bookings: 23 },
  { id: 'PAY-004', period: 'May 1–15, 2026', amount: 35200, currency: 'AED', status: 'paid', date: 'May 18, 2026', bankAccount: 'Emirates NBD ****4567', bookings: 19 },
  { id: 'PAY-005', period: 'Apr 16–30, 2026', amount: 41800, currency: 'AED', status: 'paid', date: 'May 3, 2026', bankAccount: 'Emirates NBD ****4567', bookings: 22 },
];

export default function OwnerPayoutsPage() {
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);

  const totalPaid = PAYOUTS.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const pendingAmount = PAYOUTS.filter(p => p.status === 'processing' || p.status === 'pending').reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-900">Payouts</h1><p className="text-slate-500 text-sm">Track your earnings and payout history.</p></div>
        <button className="flex items-center gap-2 text-sm font-medium bg-white border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50 transition-colors"><Download className="w-4 h-4" /> Export</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Paid', value: `AED ${totalPaid.toLocaleString()}`, icon: <DollarSign className="w-5 h-5 text-emerald-500" />, bg: 'bg-emerald-50' },
          { label: 'Processing', value: `AED ${pendingAmount.toLocaleString()}`, icon: <Clock className="w-5 h-5 text-amber-500" />, bg: 'bg-amber-50' },
          { label: 'This Month', value: `AED ${(45000 + 42000).toLocaleString()}`, icon: <TrendingUp className="w-5 h-5 text-blue-500" />, bg: 'bg-blue-50' },
          { label: 'Commission Rate', value: '15%', icon: <Building2 className="w-5 h-5 text-rose-500" />, bg: 'bg-rose-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.bg}`}>{s.icon}</div>
            <div><p className="text-[10px] text-slate-400 font-medium uppercase">{s.label}</p><p className="text-lg font-bold text-slate-900">{s.value}</p></div>
          </div>
        ))}
      </div>

      {/* Payout History */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100"><h2 className="font-bold text-slate-900">Payout History</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3 font-semibold">Period</th>
                <th className="px-5 py-3 font-semibold">Bookings</th>
                <th className="px-5 py-3 font-semibold text-right">Amount</th>
                <th className="px-5 py-3 font-semibold">Payout Date</th>
                <th className="px-5 py-3 font-semibold text-center">Status</th>
                <th className="px-5 py-3 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {PAYOUTS.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/50">
                  <td className="px-5 py-4"><p className="font-bold text-slate-900">{p.period}</p><p className="text-xs text-slate-400">{p.id}</p></td>
                  <td className="px-5 py-4 text-slate-600">{p.bookings}</td>
                  <td className="px-5 py-4 text-right font-bold text-slate-900">{p.currency} {p.amount.toLocaleString()}</td>
                  <td className="px-5 py-4 text-slate-600">{p.date}</td>
                  <td className="px-5 py-4 text-center">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${
                      p.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : p.status === 'processing' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {p.status === 'paid' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <button className="text-rose-600 hover:text-rose-700 font-medium text-xs hover:underline flex items-center gap-1 mx-auto"><FileText className="w-3 h-3" /> Statement</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bank Info */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h3 className="font-bold text-slate-900 mb-3">Bank Account</h3>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center"><CreditCard className="w-6 h-6 text-blue-600" /></div>
          <div><p className="text-sm font-bold text-slate-900">Emirates NBD</p><p className="text-xs text-slate-400">Account ending in ****4567 · AED</p></div>
          <button className="ml-auto text-xs text-rose-600 font-medium hover:underline">Edit</button>
        </div>
      </div>
    </div>
  );
}
