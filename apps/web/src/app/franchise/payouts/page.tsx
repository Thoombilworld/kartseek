'use client';

import React, { useState } from 'react';
import { DollarSign, TrendingUp, Clock, CheckCircle, Download, CreditCard, Landmark, ArrowUpRight, AlertCircle, Calendar, Search, Filter } from 'lucide-react';

type PayoutEntry = {
  id: string; date: string; amount: string; method: string; status: 'completed' | 'pending' | 'processing' | 'failed'; reference: string; period: string;
};

const payouts: PayoutEntry[] = [
  { id: 'PO-2025-042', date: 'Jun 22, 2025', amount: '₹45,200', method: 'Bank Transfer', status: 'completed', reference: 'UTR82345678', period: 'Jun 15-21' },
  { id: 'PO-2025-041', date: 'Jun 15, 2025', amount: '₹38,900', method: 'Bank Transfer', status: 'completed', reference: 'UTR82345677', period: 'Jun 8-14' },
  { id: 'PO-2025-040', date: 'Jun 8, 2025', amount: '₹52,100', method: 'Bank Transfer', status: 'completed', reference: 'UTR82345676', period: 'Jun 1-7' },
  { id: 'PO-2025-039', date: 'Jun 1, 2025', amount: '₹41,800', method: 'Bank Transfer', status: 'completed', reference: 'UTR82345675', period: 'May 25-31' },
  { id: 'PO-2025-038', date: 'May 25, 2025', amount: '₹35,600', method: 'Bank Transfer', status: 'completed', reference: 'UTR82345674', period: 'May 18-24' },
  { id: 'PO-2025-043', date: 'Jun 29, 2025', amount: '₹48,500', method: 'Bank Transfer', status: 'processing', reference: '—', period: 'Jun 22-28' },
  { id: 'PO-2025-044', date: 'Jul 6, 2025', amount: '₹12,300', method: 'Bank Transfer', status: 'pending', reference: '—', period: 'Jun 29 - Jul 5' },
];

const statusConfig: Record<string, { bg: string; icon: React.ReactNode; label: string }> = {
  completed: { bg: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle className="w-3.5 h-3.5" />, label: 'Completed' },
  processing: { bg: 'bg-blue-100 text-blue-700', icon: <Clock className="w-3.5 h-3.5" />, label: 'Processing' },
  pending: { bg: 'bg-amber-100 text-amber-700', icon: <Clock className="w-3.5 h-3.5" />, label: 'Pending' },
  failed: { bg: 'bg-red-100 text-red-700', icon: <AlertCircle className="w-3.5 h-3.5" />, label: 'Failed' },
};

export default function FranchisePayoutsPage() {
  const [statusFilter, setStatusFilter] = useState('All');

  const filtered = payouts.filter(p => statusFilter === 'All' || p.status === statusFilter);
  const totalPaid = payouts.filter(p => p.status === 'completed').reduce((a, p) => a + parseInt(p.amount.replace(/[₹,]/g, '')), 0);
  const pendingAmount = payouts.filter(p => p.status === 'pending' || p.status === 'processing').reduce((a, p) => a + parseInt(p.amount.replace(/[₹,]/g, '')), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payouts</h1>
          <p className="text-slate-500">Track commission payouts, withdrawal history, and bank account details.</p>
        </div>
        <button className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 self-start">
          <Download className="w-4 h-4" /> Download Statement
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-teal-500 to-teal-600 p-5 rounded-xl shadow-md text-white">
          <DollarSign className="w-5 h-5 opacity-80" />
          <p className="text-3xl font-black mt-3">₹{(totalPaid / 100000).toFixed(1)}L</p>
          <p className="text-sm font-medium opacity-80 mt-1">Total Paid Out</p>
          <div className="flex items-center gap-1 mt-2 text-xs font-bold opacity-90"><ArrowUpRight className="w-3.5 h-3.5" /> Lifetime earnings</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <Clock className="w-5 h-5 text-amber-500" />
          <p className="text-2xl font-black text-slate-900 mt-3">₹{pendingAmount.toLocaleString()}</p>
          <p className="text-sm text-slate-500 font-medium mt-1">Pending / Processing</p>
          <p className="text-xs text-slate-400 mt-1">Expected by Jul 6, 2025</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <Landmark className="w-5 h-5 text-indigo-500" />
          <div className="mt-3">
            <p className="text-sm font-bold text-slate-900">HDFC Bank ****4523</p>
            <p className="text-xs text-slate-500 mt-1">IFSC: HDFC0001234</p>
            <p className="text-xs text-slate-400 mt-0.5">Rahul Sharma (Primary)</p>
          </div>
          <button className="text-xs text-teal-600 font-bold mt-2 hover:underline">Update Bank Details →</button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-3">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
          <option value="All">All Status</option><option value="completed">Completed</option><option value="processing">Processing</option><option value="pending">Pending</option>
        </select>
      </div>

      {/* Payout History */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center"><h2 className="font-bold text-slate-900">Payout History</h2><span className="text-xs text-slate-400">{filtered.length} payouts</span></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Payout ID</th><th className="px-5 py-3.5 font-semibold">Date</th><th className="px-5 py-3.5 font-semibold">Period</th>
                <th className="px-5 py-3.5 font-semibold text-right">Amount</th><th className="px-5 py-3.5 font-semibold">Method</th><th className="px-5 py-3.5 font-semibold">Reference</th><th className="px-5 py-3.5 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4 font-bold text-slate-900">{p.id}</td>
                  <td className="px-5 py-4 text-slate-600 flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-slate-400" />{p.date}</td>
                  <td className="px-5 py-4 text-slate-500 text-xs font-medium">{p.period}</td>
                  <td className="px-5 py-4 text-right font-black text-slate-900">{p.amount}</td>
                  <td className="px-5 py-4"><span className="flex items-center gap-1 text-slate-600"><CreditCard className="w-3.5 h-3.5" />{p.method}</span></td>
                  <td className="px-5 py-4 font-mono text-xs text-slate-400">{p.reference}</td>
                  <td className="px-5 py-4 text-center"><span className={`${statusConfig[p.status].bg} px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1`}>{statusConfig[p.status].icon} {statusConfig[p.status].label}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between text-sm text-slate-500">
          <span>Showing {filtered.length} payouts</span>
          <span className="font-bold text-teal-600">Total Paid: ₹{(totalPaid / 100000).toFixed(1)}L</span>
        </div>
      </div>
    </div>
  );
}
