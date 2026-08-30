'use client';

import React, { useState } from 'react';
import { Car, Search, TrendingUp, ArrowUpRight, Download, Filter } from 'lucide-react';

const kpis = [{ label: 'Total Vehicles', value: '210', change: '+15' },{ label: 'Active', value: '185', change: '+12' },{ label: 'Maintenance', value: '18', change: '-3' },{ label: 'Avg Age', value: '2.4 yrs', change: '-0.2' }];
const columns = ['Vehicle', 'Type', 'Driver', 'Status', 'Rides Today', 'Km Today', 'Condition'];
const rows = [{ v: 'MH01AB1234', t: 'Sedan', d: 'Rajesh Kumar', s: 'Active', r: '12', k: '145', c: 'Good' },{ v: 'MH01CD5678', t: 'SUV', d: 'Suresh P.', s: 'Active', r: '8', k: '98', c: 'Excellent' },{ v: 'MH01GH3456', t: 'Hatchback', d: '—', s: 'Maintenance', r: '0', k: '0', c: 'Service Due' }];

export default function FleetOverviewPage() {
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState('30d');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Fleet Overview</h1>
          <p className="text-slate-400 mt-1">Vehicle fleet management for your zone</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-lg text-sm hover:bg-amber-500/20 transition-colors">
          <Download className="w-4 h-4" />Export
        </button>
      </div>
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
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40" />
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
