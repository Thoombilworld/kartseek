'use client';
import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Users, Clock, CheckCircle, ArrowUpRight } from 'lucide-react';
import { vendorTaxiApi } from '@/lib/api/vendor-taxi';

const earningsSummary = {
  totalRevenue: '₹8.2L',
  platformDeducted: '₹1.23L',
  vendorEarned: '₹41K',
  netToDrivers: '₹6.56L',
  pendingPayout: '₹12.5K',
};

const driverEarnings = [
  { name: 'Priya Devi', trips: 2100, earnings: '₹68K', commission: '₹3.4K' },
  { name: 'Ravi Kumar', trips: 1240, earnings: '₹42K', commission: '₹2.1K' },
  { name: 'Amit Singh', trips: 890, earnings: '₹28K', commission: '₹1.4K' },
  { name: 'Venkat R.', trips: 210, earnings: '₹8K', commission: '₹0.4K' },
  { name: 'Karthik M.', trips: 0, earnings: '₹0', commission: '₹0' },
];

const payoutHistory = [
  { id: 'PAY-001', amount: '₹15,200', status: 'settled', date: '2026-06-15', method: 'Bank Transfer' },
  { id: 'PAY-002', amount: '₹18,400', status: 'settled', date: '2026-06-08', method: 'Bank Transfer' },
  { id: 'PAY-003', amount: '₹12,800', status: 'settled', date: '2026-06-01', method: 'Bank Transfer' },
  { id: 'PAY-004', amount: '₹12,500', status: 'pending', date: '2026-06-17', method: 'Pending' },
];

const psCfg: Record<string, { bg: string; l: string }> = { settled: { bg: 'bg-emerald-100 text-emerald-700', l: 'Settled' }, pending: { bg: 'bg-blue-100 text-blue-700', l: 'Pending' }, processing: { bg: 'bg-amber-100 text-amber-700', l: 'Processing' } };

export default function VendorEarningsPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><DollarSign className="w-6 h-6 text-emerald-600" /> Earnings & Payouts</h1>
        <p className="text-slate-500 text-sm mt-1">View your fleet earnings, commission breakdown, and payout history. All payouts are processed through the admin panel.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-linear-to-br from-emerald-500 to-emerald-600 p-4 rounded-xl text-white shadow-md">
          <TrendingUp className="w-5 h-5 opacity-80" />
          <p className="text-2xl font-black mt-2">{earningsSummary.totalRevenue}</p>
          <p className="text-xs font-medium opacity-80">Total Revenue</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <DollarSign className="w-5 h-5 text-red-500" />
          <p className="text-xl font-black text-slate-900 mt-2">{earningsSummary.platformDeducted}</p>
          <p className="text-[10px] text-slate-500 font-medium">Platform (15%)</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <DollarSign className="w-5 h-5 text-amber-500" />
          <p className="text-xl font-black text-amber-600 mt-2">{earningsSummary.vendorEarned}</p>
          <p className="text-[10px] text-slate-500 font-medium">Vendor Commission (5%)</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <Users className="w-5 h-5 text-indigo-500" />
          <p className="text-xl font-black text-slate-900 mt-2">{earningsSummary.netToDrivers}</p>
          <p className="text-[10px] text-slate-500 font-medium">Net to Drivers</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <Clock className="w-5 h-5 text-blue-500" />
          <p className="text-xl font-black text-blue-600 mt-2">{earningsSummary.pendingPayout}</p>
          <p className="text-[10px] text-slate-500 font-medium">Pending Payout</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Per-Driver Earnings */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5"><Users className="w-4 h-4 text-indigo-500" /> Per-Driver Breakdown</h3>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200"><tr><th className="px-5 py-2.5 font-semibold">Driver</th><th className="px-4 py-2.5 font-semibold text-right">Trips</th><th className="px-4 py-2.5 font-semibold text-right">Earnings</th><th className="px-4 py-2.5 font-semibold text-right">Your Cut</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {driverEarnings.map(d => (
                <tr key={d.name} className="hover:bg-slate-50/50">
                  <td className="px-5 py-3 font-bold text-xs text-slate-900">{d.name}</td>
                  <td className="px-4 py-3 text-right text-xs font-bold">{d.trips.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-xs font-bold">{d.earnings}</td>
                  <td className="px-4 py-3 text-right text-xs font-bold text-amber-600">{d.commission}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Payout History */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5"><DollarSign className="w-4 h-4 text-emerald-500" /> Payout History</h3>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200"><tr><th className="px-5 py-2.5 font-semibold">Payout ID</th><th className="px-4 py-2.5 font-semibold text-right">Amount</th><th className="px-4 py-2.5 font-semibold text-center">Status</th><th className="px-4 py-2.5 font-semibold">Date</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {payoutHistory.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/50">
                  <td className="px-5 py-3 text-xs font-mono text-slate-500">{p.id}</td>
                  <td className="px-4 py-3 text-right font-bold text-xs">{p.amount}</td>
                  <td className="px-4 py-3 text-center"><span className={`${psCfg[p.status].bg} px-2 py-0.5 rounded-full text-[10px] font-bold`}>{psCfg[p.status].l}</span></td>
                  <td className="px-4 py-3 text-xs text-slate-500">{p.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-slate-400 text-center">All financial processing is managed through the Super Admin panel. This view is read-only.</p>
    </div>
  );
}
