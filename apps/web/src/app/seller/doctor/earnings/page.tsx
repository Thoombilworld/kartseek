'use client';
import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, ArrowUpRight, Calendar, Download, CreditCard, Landmark } from 'lucide-react';
import { useRegion } from '@/lib/contexts/region-context';
import { vendorDoctorApi } from '@/lib/api/vendor-doctor';

const MONTHLY = [
  { month: 'Jun 2026', consultations: 86, revenue: 186500, commission: 18650, payout: 167850, status: 'pending' },
  { month: 'May 2026', consultations: 94, revenue: 198200, commission: 19820, payout: 178380, status: 'paid' },
  { month: 'Apr 2026', consultations: 78, revenue: 164400, commission: 16440, payout: 147960, status: 'paid' },
  { month: 'Mar 2026', consultations: 82, revenue: 172800, commission: 17280, payout: 155520, status: 'paid' },
  { month: 'Feb 2026', consultations: 71, revenue: 149600, commission: 14960, payout: 134640, status: 'paid' },
  { month: 'Jan 2026', consultations: 68, revenue: 143200, commission: 14320, payout: 128880, status: 'paid' },
];

export default function EarningsPage() {
  const totalRevenue = MONTHLY.reduce((s, m) => s + m.revenue, 0);
  const totalPayout = MONTHLY.reduce((s, m) => s + m.payout, 0);
  const totalCommission = MONTHLY.reduce((s, m) => s + m.commission, 0);
  const { formatCurrencyValue } = useRegion();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div><h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><DollarSign className="w-6 h-6 text-emerald-600" /> Earnings & Payouts</h1><p className="text-sm text-slate-500 mt-1">Track your income, commissions, and payout history</p></div>
        <button className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors shadow-sm"><Download className="w-4 h-4" /> Export</button>
      </div>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-linear-to-br from-emerald-600 to-emerald-700 p-5 rounded-2xl shadow-lg text-white"><DollarSign className="w-5 h-5 opacity-80" /><p className="text-2xl font-black mt-2">{formatCurrencyValue(totalRevenue)}</p><p className="text-xs font-medium text-emerald-200">Total Revenue (YTD)</p></div>
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm"><div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center"><Landmark className="w-4 h-4 text-violet-600" /></div><p className="text-2xl font-black text-slate-900 mt-2">{formatCurrencyValue(totalPayout)}</p><p className="text-xs text-slate-500 font-medium">Total Payout</p></div>
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm"><div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center"><CreditCard className="w-4 h-4 text-amber-600" /></div><p className="text-2xl font-black text-slate-900 mt-2">{formatCurrencyValue(totalCommission)}</p><p className="text-xs text-slate-500 font-medium">Platform Commission</p></div>
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm"><div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center"><TrendingUp className="w-4 h-4 text-blue-600" /></div><p className="text-2xl font-black text-slate-900 mt-2">10%</p><p className="text-xs text-slate-500 font-medium">Commission Rate</p></div>
      </div>
      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100"><h3 className="font-bold text-slate-900 text-sm">Monthly Breakdown</h3></div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/80 border-b border-slate-200"><tr>
            <th className="px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wider">Month</th>
            <th className="px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wider text-center">Consultations</th>
            <th className="px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wider text-right">Revenue</th>
            <th className="px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wider text-right">Commission</th>
            <th className="px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wider text-right">Payout</th>
            <th className="px-5 py-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wider text-center">Status</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {MONTHLY.map(m => (
              <tr key={m.month} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-5 py-4 font-bold text-slate-900">{m.month}</td>
                <td className="px-5 py-4 text-center text-slate-700">{m.consultations}</td>
                <td className="px-5 py-4 text-right font-semibold text-slate-700">{formatCurrencyValue(m.revenue)}</td>
                <td className="px-5 py-4 text-right text-red-600 font-semibold">- {formatCurrencyValue(m.commission)}</td>
                <td className="px-5 py-4 text-right font-bold text-emerald-600">{formatCurrencyValue(m.payout)}</td>
                <td className="px-5 py-4 text-center"><span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${m.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{m.status === 'paid' ? 'Paid' : 'Pending'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
