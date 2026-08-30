'use client';
import { usePharmacyRegionFilter } from '@/hooks/usePharmacyRegionFilter';
import React, { useState, useEffect } from 'react';
import { Wallet, Search, CheckCircle, Clock, AlertTriangle, ArrowRight, DollarSign, TrendingUp } from 'lucide-react';
import { adminPharmacyApi } from '@/lib/api/admin-pharmacy';

const SETTLEMENTS = [
  { id:'SET-001',store:'Apollo Pharmacy',amount:12450,status:'pending' as const,period:'1-7 Jun 2026',orders:34,commission:1245,payout:11205 },
  { id:'SET-002',store:'HealthPlus Pharmacy',amount:8760,status:'completed' as const,period:'1-7 Jun 2026',orders:22,commission:876,payout:7884 },
  { id:'SET-003',store:'MedPlus Pharmacy',amount:15300,status:'completed' as const,period:'1-7 Jun 2026',orders:48,commission:1530,payout:13770 },
  { id:'SET-004',store:'PharmEasy Store',amount:6890,status:'processing' as const,period:'8-14 Jun 2026',orders:18,commission:689,payout:6201 },
  { id:'SET-005',store:'QuickMeds',amount:3200,status:'pending' as const,period:'8-14 Jun 2026',orders:9,commission:320,payout:2880 },
  { id:'SET-006',store:'BabyMed Pharmacy',amount:4500,status:'failed' as const,period:'1-7 Jun 2026',orders:12,commission:450,payout:4050 },
];

const statusCfg: Record<string,{bg:string;label:string}> = {
  pending:{bg:'bg-amber-100 text-amber-700',label:'Pending'},
  processing:{bg:'bg-blue-100 text-blue-700',label:'Processing'},
  completed:{bg:'bg-emerald-100 text-emerald-700',label:'Completed'},
  failed:{bg:'bg-red-100 text-red-700',label:'Failed'},
};

export default function PharmacySettlementsPage() {
  const { regionLabel, isFiltered, formatPrice } = usePharmacyRegionFilter([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');

  const filtered = SETTLEMENTS.filter(s => {
    const ms = s.store.toLowerCase().includes(search.toLowerCase()) || s.id.toLowerCase().includes(search.toLowerCase());
    const mf = filter === 'All' || s.status === filter;
    return ms && mf;
  });

  const totalPending = SETTLEMENTS.filter(s => s.status === 'pending').reduce((a, s) => a + s.payout, 0);
  const totalCompleted = SETTLEMENTS.filter(s => s.status === 'completed').reduce((a, s) => a + s.payout, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-slate-900">Settlements</h1><p className="text-slate-500 text-sm">Manage pharmacy store payouts and settlement cycles.</p></div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4"><p className="text-xs text-slate-400 font-medium">Pending Payout</p><p className="text-xl font-bold text-amber-600 mt-1">₹{totalPending.toLocaleString()}</p></div>
        <div className="bg-white rounded-xl border border-slate-200 p-4"><p className="text-xs text-slate-400 font-medium">Completed This Week</p><p className="text-xl font-bold text-emerald-600 mt-1">₹{totalCompleted.toLocaleString()}</p></div>
        <div className="bg-white rounded-xl border border-slate-200 p-4"><p className="text-xs text-slate-400 font-medium">Total Settlements</p><p className="text-xl font-bold text-slate-900 mt-1">{SETTLEMENTS.length}</p></div>
        <div className="bg-white rounded-xl border border-slate-200 p-4"><p className="text-xs text-slate-400 font-medium">Commission Earned</p><p className="text-xl font-bold text-cyan-600 mt-1">₹{SETTLEMENTS.reduce((a,s) => a+s.commission, 0).toLocaleString()}</p></div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 relative min-w-48"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input placeholder="Search settlements..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white"/></div>
        {['All','pending','processing','completed','failed'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${filter===f ? 'bg-cyan-600 text-white':'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {f === 'All' ? 'All' : statusCfg[f].label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-200"><tr>
            <th className="px-5 py-3.5 font-semibold">Settlement</th>
            <th className="px-5 py-3.5 font-semibold">Store</th>
            <th className="px-5 py-3.5 font-semibold">Period</th>
            <th className="px-5 py-3.5 font-semibold text-right">GMV</th>
            <th className="px-5 py-3.5 font-semibold text-right">Commission</th>
            <th className="px-5 py-3.5 font-semibold text-right">Payout</th>
            <th className="px-5 py-3.5 font-semibold text-center">Status</th>
            <th className="px-5 py-3.5 font-semibold text-center">Action</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">{filtered.map(s => (
            <tr key={s.id} className="hover:bg-slate-50/50">
              <td className="px-5 py-4"><p className="font-bold text-slate-900">{s.id}</p><p className="text-xs text-slate-400">{s.orders} orders</p></td>
              <td className="px-5 py-4 font-medium text-slate-700">{s.store}</td>
              <td className="px-5 py-4 text-slate-600 text-xs">{s.period}</td>
              <td className="px-5 py-4 text-right font-bold text-slate-900">₹{s.amount.toLocaleString()}</td>
              <td className="px-5 py-4 text-right text-cyan-600 font-bold">₹{s.commission.toLocaleString()}</td>
              <td className="px-5 py-4 text-right font-bold text-emerald-600">₹{s.payout.toLocaleString()}</td>
              <td className="px-5 py-4 text-center"><span className={`${statusCfg[s.status].bg} px-2.5 py-1 rounded-full text-xs font-bold`}>{statusCfg[s.status].label}</span></td>
              <td className="px-5 py-4 text-center">
                {s.status === 'pending' && <button className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold rounded-lg transition-colors">Process</button>}
                {s.status === 'failed' && <button className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold rounded-lg transition-colors">Retry</button>}
              </td>
            </tr>
          ))}</tbody>
        </table></div>
      </div>
    </div>
  );
}
