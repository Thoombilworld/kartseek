'use client';

import React, { useState } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Calendar, Download, Filter, ArrowUpRight, ArrowDownRight, Wallet, CreditCard, Clock, CheckCircle, ChevronDown, ChevronUp, Store, Percent } from 'lucide-react';
import Link from 'next/link';

type CommissionEntry = {
  id: string;
  vendorName: string;
  category: string;
  zone: string;
  grossSales: string;
  grossSalesNum: number;
  commissionRate: string;
  earned: string;
  earnedNum: number;
  status: 'paid' | 'pending' | 'processing';
  period: string;
  paidDate?: string;
};

const commissions: CommissionEntry[] = [
  { id: 'C-2026-001', vendorName: 'City Supermart', category: 'Grocery', zone: 'Colaba', grossSales: '₹4,20,000', grossSalesNum: 420000, commissionRate: '12%', earned: '₹50,400', earnedNum: 50400, status: 'paid', period: 'May 1–15', paidDate: 'May 18' },
  { id: 'C-2026-002', vendorName: 'Burger King (Andheri)', category: 'Restaurant', zone: 'Andheri', grossSales: '₹3,10,000', grossSalesNum: 310000, commissionRate: '18%', earned: '₹55,800', earnedNum: 55800, status: 'paid', period: 'May 1–15', paidDate: 'May 18' },
  { id: 'C-2026-003', vendorName: 'MedPlus Pharmacy', category: 'Pharmacy', zone: 'Bandra', grossSales: '₹1,80,000', grossSalesNum: 180000, commissionRate: '10%', earned: '₹18,000', earnedNum: 18000, status: 'processing', period: 'May 16–31' },
  { id: 'C-2026-004', vendorName: 'Pizza Palace', category: 'Restaurant', zone: 'Worli', grossSales: '₹2,60,000', grossSalesNum: 260000, commissionRate: '18%', earned: '₹46,800', earnedNum: 46800, status: 'processing', period: 'May 16–31' },
  { id: 'C-2026-005', vendorName: 'Fresh Farm Organics', category: 'Grocery', zone: 'Dadar', grossSales: '₹1,40,000', grossSalesNum: 140000, commissionRate: '12%', earned: '₹16,800', earnedNum: 16800, status: 'pending', period: 'May 16–31' },
  { id: 'C-2026-006', vendorName: 'Sushi Kingdom', category: 'Restaurant', zone: 'Juhu', grossSales: '₹3,80,000', grossSalesNum: 380000, commissionRate: '18%', earned: '₹68,400', earnedNum: 68400, status: 'paid', period: 'May 1–15', paidDate: 'May 18' },
  { id: 'C-2026-007', vendorName: 'QuickMart Express', category: 'Grocery', zone: 'Lower Parel', grossSales: '₹90,000', grossSalesNum: 90000, commissionRate: '12%', earned: '₹10,800', earnedNum: 10800, status: 'pending', period: 'May 16–31' },
  { id: 'C-2026-008', vendorName: 'HealthFirst Pharmacy', category: 'Pharmacy', zone: 'Tardeo', grossSales: '₹40,000', grossSalesNum: 40000, commissionRate: '10%', earned: '₹4,000', earnedNum: 4000, status: 'pending', period: 'May 16–31' },
];

const categoryColors: Record<string, string> = {
  Grocery: 'bg-green-100 text-green-700',
  Restaurant: 'bg-orange-100 text-orange-700',
  Pharmacy: 'bg-cyan-100 text-cyan-700',
};

const statusConfig: Record<string, { bg: string; label: string; icon: React.ReactNode }> = {
  paid: { bg: 'bg-emerald-100 text-emerald-700', label: 'Paid', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  processing: { bg: 'bg-blue-100 text-blue-700', label: 'Processing', icon: <Clock className="w-3.5 h-3.5" /> },
  pending: { bg: 'bg-amber-100 text-amber-700', label: 'Pending', icon: <Clock className="w-3.5 h-3.5" /> },
};

const monthlyTrend = [
  { month: 'Jan', earned: 85000 },
  { month: 'Feb', earned: 92000 },
  { month: 'Mar', earned: 110000 },
  { month: 'Apr', earned: 105000 },
  { month: 'May', earned: 121000 },
];

export default function CommissionsPage() {
  const [periodFilter, setPeriodFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const filtered = commissions.filter(c => {
    const matchPeriod = periodFilter === 'All' || c.period === periodFilter;
    const matchStatus = statusFilter === 'All' || c.status === statusFilter;
    return matchPeriod && matchStatus;
  });

  const totalEarned = commissions.reduce((a, c) => a + c.earnedNum, 0);
  const totalPaid = commissions.filter(c => c.status === 'paid').reduce((a, c) => a + c.earnedNum, 0);
  const totalPending = commissions.filter(c => c.status !== 'paid').reduce((a, c) => a + c.earnedNum, 0);
  const totalGross = commissions.reduce((a, c) => a + c.grossSalesNum, 0);
  const avgRate = Math.round((totalEarned / totalGross) * 100 * 10) / 10;

  const maxEarned = Math.max(...monthlyTrend.map(m => m.earned));

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Commissions</h1>
          <p className="text-slate-500 text-sm">Track your franchise earnings from all vendor transactions.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="bg-white hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-bold border border-slate-200 transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <Link href="/franchise/commissions/payout" className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 shadow-sm">
            <Wallet className="w-4 h-4" /> Request Payout
          </Link>
        </div>
      </div>

      {/* Revenue KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-linear-to-br from-teal-500 to-teal-600 p-5 rounded-xl shadow-md text-white">
          <DollarSign className="w-5 h-5 opacity-80" />
          <p className="text-3xl font-black mt-3">₹{(totalEarned / 100000).toFixed(1)}L</p>
          <p className="text-sm font-medium opacity-80 mt-1">Total Earned (MTD)</p>
          <div className="flex items-center gap-1 mt-2 text-xs font-bold opacity-90"><ArrowUpRight className="w-3.5 h-3.5" /> +15.2% vs last month</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <CheckCircle className="w-5 h-5 text-emerald-500" />
          <p className="text-2xl font-black text-slate-900 mt-3">₹{(totalPaid / 100000).toFixed(1)}L</p>
          <p className="text-sm text-slate-500 font-medium mt-1">Paid Out</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <Clock className="w-5 h-5 text-amber-500" />
          <p className="text-2xl font-black text-slate-900 mt-3">₹{(totalPending / 1000).toFixed(0)}K</p>
          <p className="text-sm text-slate-500 font-medium mt-1">Pending / Processing</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <Percent className="w-5 h-5 text-indigo-500" />
          <p className="text-2xl font-black text-slate-900 mt-3">{avgRate}%</p>
          <p className="text-sm text-slate-500 font-medium mt-1">Blended Commission Rate</p>
        </div>
      </div>

      {/* Monthly Trend Chart */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900">Monthly Earnings Trend</h3>
          <span className="text-xs text-slate-400 font-medium">Last 5 months</span>
        </div>
        <div className="flex items-end gap-3 h-40">
          {monthlyTrend.map((m, i) => (
            <div key={m.month} className="flex-1 flex flex-col items-center gap-2">
              <span className="text-xs font-bold text-slate-600">₹{(m.earned / 1000).toFixed(0)}K</span>
              <div className="w-full rounded-t-lg transition-all duration-500"
                style={{
                  height: `${(m.earned / maxEarned) * 100}%`,
                  background: i === monthlyTrend.length - 1 ? 'linear-gradient(to top, #0d9488, #14b8a6)' : '#e2e8f0',
                }} />
              <span className="text-xs font-medium text-slate-500">{m.month}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <select value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
          <option value="All">All Periods</option>
          <option value="May 1–15">May 1–15</option>
          <option value="May 16–31">May 16–31</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
          <option value="All">All Status</option>
          <option value="paid">Paid</option>
          <option value="processing">Processing</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {/* Commissions Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <h2 className="font-bold text-slate-900">Commission Ledger</h2>
          <span className="text-xs text-slate-400 font-medium">{filtered.length} entries</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Vendor</th>
                <th className="px-5 py-3.5 font-semibold">Category</th>
                <th className="px-5 py-3.5 font-semibold">Zone</th>
                <th className="px-5 py-3.5 font-semibold text-right">Gross Sales</th>
                <th className="px-5 py-3.5 font-semibold text-center">Rate</th>
                <th className="px-5 py-3.5 font-semibold text-right">Commission</th>
                <th className="px-5 py-3.5 font-semibold text-center">Period</th>
                <th className="px-5 py-3.5 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center"><Store className="w-4 h-4 text-slate-500" /></div>
                      <div>
                        <p className="font-bold text-slate-900">{c.vendorName}</p>
                        <p className="text-xs text-slate-400">{c.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4"><span className={`${categoryColors[c.category]} px-2.5 py-1 rounded-md text-xs font-bold`}>{c.category}</span></td>
                  <td className="px-5 py-4 text-slate-600">{c.zone}</td>
                  <td className="px-5 py-4 text-right font-medium text-slate-700">{c.grossSales}</td>
                  <td className="px-5 py-4 text-center"><span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs font-bold">{c.commissionRate}</span></td>
                  <td className="px-5 py-4 text-right font-black text-teal-600">{c.earned}</td>
                  <td className="px-5 py-4 text-center text-slate-600 text-xs font-medium">{c.period}</td>
                  <td className="px-5 py-4 text-center">
                    <span className={`${statusConfig[c.status].bg} px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1`}>
                      {statusConfig[c.status].icon} {statusConfig[c.status].label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="px-5 py-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <span className="text-sm text-slate-500">Showing {filtered.length} of {commissions.length} entries</span>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-500">Total Commission:</span>
            <span className="font-black text-teal-600 text-lg">₹{filtered.reduce((a, c) => a + c.earnedNum, 0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Commission Rate Guide */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
        <h3 className="font-bold text-slate-900 mb-4">Commission Rate Structure</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-green-50 border border-green-200">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-lg font-black text-green-700">12%</div>
            <div><p className="font-bold text-green-800">Grocery</p><p className="text-xs text-green-600">Standard rate for all grocery vendors</p></div>
          </div>
          <div className="flex items-center gap-4 p-4 rounded-xl bg-orange-50 border border-orange-200">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-lg font-black text-orange-700">18%</div>
            <div><p className="font-bold text-orange-800">Restaurant</p><p className="text-xs text-orange-600">Includes delivery coordination fee</p></div>
          </div>
          <div className="flex items-center gap-4 p-4 rounded-xl bg-cyan-50 border border-cyan-200">
            <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center text-lg font-black text-cyan-700">10%</div>
            <div><p className="font-bold text-cyan-800">Pharmacy</p><p className="text-xs text-cyan-600">Regulated rate for medical supplies</p></div>
          </div>
        </div>
      </div>

    </div>
  );
}
