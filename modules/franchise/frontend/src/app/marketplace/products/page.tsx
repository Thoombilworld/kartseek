'use client';

import React, { useState } from 'react';
import { ShoppingCart, Search, TrendingUp, ArrowUpRight, Download, Filter } from 'lucide-react';

const kpis = [{ label: 'Total Products', value: '12,450', change: '+8%' },{ label: 'Active Listings', value: '10,280', change: '+5%' },{ label: 'Avg Price', value: '₹1,850', change: '+3%' },{ label: 'Out of Stock', value: '342', change: '-12%' }];
const columns = ['Product', 'Seller', 'Category', 'Price', 'Stock', 'Sales', 'Status'];
const rows = [{ p: 'iPhone 15 Pro', s: 'TechZone', c: 'Electronics', pr: '₹1,34,900', st: '45', sa: '128', status: 'Active' },{ p: 'Nike Air Max', s: 'SportsFit', c: 'Fashion', pr: '₹8,995', st: '120', sa: '342', status: 'Active' },{ p: 'Samsung TV 55"', s: 'ElectroMart', c: 'Electronics', pr: '₹45,990', st: '12', sa: '56', status: 'Active' },{ p: 'Protein Powder', s: 'HealthFirst', c: 'Sports', pr: '₹2,499', st: '0', sa: '89', status: 'Out of Stock' }];

export default function MarketplaceProductsPage() {
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState('30d');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Marketplace Products</h1>
          <p className="text-slate-400 mt-1">Product catalog across all sellers in your zone</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-lg text-sm hover:bg-blue-500/20 transition-colors">
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
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
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
