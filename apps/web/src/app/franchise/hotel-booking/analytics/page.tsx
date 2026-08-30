'use client';

import React, { useState } from 'react';
import { TrendingUp, Search, ArrowUpRight, Download, Filter } from 'lucide-react';

const kpis = [
  { label: 'Avg Occupancy', value: '78%', change: '+5%' },
  { label: 'RevPAR', value: '₹4,850', change: '+12%' },
  { label: 'ADR', value: '₹6,200', change: '+8%' },
  { label: 'Total Revenue', value: '₹56.1L', change: '+15%' },
];
const columns = ['Hotel', 'Occupancy', 'ADR', 'RevPAR', 'Revenue', 'Bookings', 'Rating'];
const rows = [
  { hotel: 'The Grand Mumbai', occ: '82%', adr: '₹8,500', revpar: '₹6,970', rev: '₹18.5L', bookings: '218', rating: '4.8' },
  { hotel: 'Sea View Resort', occ: '76%', adr: '₹5,200', revpar: '₹3,952', rev: '₹9.2L', bookings: '142', rating: '4.6' },
  { hotel: 'Business Inn', occ: '88%', adr: '₹4,500', revpar: '₹3,960', rev: '₹6.8L', bookings: '185', rating: '4.4' },
  { hotel: 'Heritage Palace', occ: '91%', adr: '₹12,000', revpar: '₹10,920', rev: '₹12.4L', bookings: '95', rating: '4.9' },
  { hotel: 'Budget Stay Express', occ: '72%', adr: '₹1,800', revpar: '₹1,296', rev: '₹4.2L', bookings: '312', rating: '4.1' },
];

export default function HotelAnalyticsPage() {
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState('30d');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Hotel Analytics</h1>
          <p className="text-slate-400 mt-1">Occupancy trends, revenue metrics, and performance insights</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-lg text-sm hover:bg-rose-500/20 transition-colors">
          <Download className="w-4 h-4" />Export
        </button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi: any) => (
          <div key={kpi.label} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-400 text-sm font-medium">{kpi.label}</span>
              <span className="text-xs text-emerald-400 flex items-center gap-0.5"><ArrowUpRight className="w-3 h-3" />{kpi.change}</span>
            </div>
            <p className="text-2xl font-bold text-white">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Data Section */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/40" />
          </div>
          <select value={period} onChange={e => setPeriod(e.target.value)} className="px-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-lg text-white text-sm">
            <option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="90d">Last 90 days</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-slate-700/50 text-left">
              {columns.map((c: string) => <th key={c} className="px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{c}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-slate-700/30">
              {rows.filter((r: any) => JSON.stringify(r).toLowerCase().includes(search.toLowerCase())).map((row: any, i: number) => (
                <tr key={i} className="hover:bg-slate-700/20 transition-colors">
                  {Object.values(row).map((val: any, j: number) => <td key={j} className="px-5 py-4 text-sm text-slate-300">{val}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
