'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Edit2, Save, X, Plus, TrendingUp, ArrowUpRight, AlertTriangle, Download, Search } from 'lucide-react';

type TierRate = {
  category: string;
  rate: number;
  minRate: number;
  maxRate: number;
  sellers: number;
  monthlyGMV: number;
  commission: number;
};

const initialTiers: TierRate[] = [
  { category: 'Electronics — Smartphones', rate: 6.5, minRate: 5, maxRate: 10, sellers: 145, monthlyGMV: 45000000, commission: 2925000 },
  { category: 'Electronics — Laptops', rate: 5.0, minRate: 4, maxRate: 8, sellers: 82, monthlyGMV: 32000000, commission: 1600000 },
  { category: 'Fashion — Apparel', rate: 15.0, minRate: 12, maxRate: 20, sellers: 310, monthlyGMV: 28000000, commission: 4200000 },
  { category: 'Fashion — Footwear', rate: 12.0, minRate: 10, maxRate: 18, sellers: 95, monthlyGMV: 12000000, commission: 1440000 },
  { category: 'Home & Kitchen', rate: 10.0, minRate: 8, maxRate: 15, sellers: 120, monthlyGMV: 18000000, commission: 1800000 },
  { category: 'Beauty & Personal Care', rate: 18.0, minRate: 15, maxRate: 25, sellers: 85, monthlyGMV: 9500000, commission: 1710000 },
  { category: 'Books & Media', rate: 8.0, minRate: 6, maxRate: 12, sellers: 45, monthlyGMV: 3200000, commission: 256000 },
  { category: 'Grocery & Essentials', rate: 5.5, minRate: 3, maxRate: 8, sellers: 60, monthlyGMV: 14000000, commission: 770000 },
  { category: 'Sports & Fitness', rate: 10.0, minRate: 6, maxRate: 18, sellers: 68, monthlyGMV: 5400000, commission: 540000 },
  { category: 'Automotive', rate: 10.0, minRate: 7, maxRate: 15, sellers: 35, monthlyGMV: 8200000, commission: 820000 },
];

const formatInr = (n: number) => {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
};

export default function CommissionTiersPage() {
  const [tiers, setTiers] = useState(initialTiers);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editRate, setEditRate] = useState(0);
  const [search, setSearch] = useState('');
  const [savedMsg, setSavedMsg] = useState('');

  const totalGMV = tiers.reduce((s, t) => s + t.monthlyGMV, 0);
  const totalCommission = tiers.reduce((s, t) => s + t.commission, 0);
  const totalSellers = tiers.reduce((s, t) => s + t.sellers, 0);
  const avgRate = (tiers.reduce((s, t) => s + t.rate, 0) / tiers.length).toFixed(1);

  const filteredTiers = tiers.filter(t =>
    t.category.toLowerCase().includes(search.toLowerCase()),
  );

  const startEdit = (idx: number) => {
    setEditingIdx(idx);
    setEditRate(tiers[idx].rate);
  };

  const saveEdit = () => {
    if (editingIdx === null) return;
    setTiers(prev => prev.map((t, i) => i === editingIdx ? { ...t, rate: editRate, commission: Math.round(t.monthlyGMV * editRate / 100) } : t));
    setEditingIdx(null);
    setSavedMsg(`Rate updated to ${editRate}%`);
    setTimeout(() => setSavedMsg(''), 3000);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/admin/marketplace" className="hover:text-emerald-600">Marketplace</Link>
        <ChevronRight className="w-3 h-3" />
        <Link href="/admin/marketplace/commissions" className="hover:text-emerald-600">Commissions</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-700 font-medium">Tier Rate Card</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-emerald-600" /> Commission Tier Rate Card
          </h1>
          <p className="text-slate-500 text-sm">Category-wise commission rates with GMV breakdown. Rates auto-apply to all sellers in each category.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add Tier
          </button>
        </div>
      </div>

      {savedMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 animate-pulse">
          <Save className="w-4 h-4" /> {savedMsg}
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-linear-to-br from-emerald-500 to-emerald-600 p-5 rounded-xl shadow-md text-white">
          <p className="text-3xl font-black">{formatInr(totalGMV)}</p>
          <p className="text-sm font-medium opacity-80 mt-1">Total Monthly GMV</p>
          <div className="flex items-center gap-1 mt-2 text-xs font-bold opacity-80"><ArrowUpRight className="w-3 h-3" /> +12.4% vs last month</div>
        </div>
        <div className="bg-linear-to-br from-purple-500 to-indigo-600 p-5 rounded-xl shadow-md text-white">
          <p className="text-3xl font-black">{formatInr(totalCommission)}</p>
          <p className="text-sm font-medium opacity-80 mt-1">Total Commission</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-2xl font-black text-slate-900">{avgRate}%</p>
          <p className="text-sm text-slate-500 font-medium mt-1">Avg Commission Rate</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-2xl font-black text-slate-900">{totalSellers.toLocaleString()}</p>
          <p className="text-sm text-slate-500 font-medium mt-1">Total Sellers</p>
        </div>
      </div>

      {/* Visual Rate Comparison Bars */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
        <h3 className="font-bold text-slate-900 mb-4">Rate Comparison by Category</h3>
        <div className="space-y-3">
          {tiers.sort((a, b) => b.rate - a.rate).map(t => {
            const maxR = Math.max(...tiers.map(x => x.rate));
            return (
              <div key={t.category} className="flex items-center gap-3">
                <div className="w-48 text-xs font-medium text-slate-600 truncate">{t.category}</div>
                <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                  <div className="h-full rounded-full bg-linear-to-r from-emerald-400 to-emerald-600 flex items-center justify-end pr-2 transition-all duration-500"
                    style={{ width: `${(t.rate / maxR) * 100}%` }}>
                    <span className="text-[10px] font-black text-white">{t.rate}%</span>
                  </div>
                </div>
                <div className="w-20 text-right text-xs font-bold text-emerald-600">{formatInr(t.commission)}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" placeholder="Search tiers..." aria-label="Search tiers..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          title="Search tiers" />
      </div>

      {/* Tier Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50/50">
          <h2 className="font-bold text-slate-900">Detailed Tier Rates</h2>
          <p className="text-xs text-slate-400 mt-1">Click edit to modify rates • Changes apply immediately to all sellers in the category</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Category</th>
                <th className="px-5 py-3.5 font-semibold text-center">Current Rate</th>
                <th className="px-5 py-3.5 font-semibold text-center">Rate Range</th>
                <th className="px-5 py-3.5 font-semibold text-right">Sellers</th>
                <th className="px-5 py-3.5 font-semibold text-right">Monthly GMV</th>
                <th className="px-5 py-3.5 font-semibold text-right">Commission</th>
                <th className="px-5 py-3.5 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTiers.map((t, i) => {
                const originalIdx = tiers.indexOf(t);
                return (
                  <tr key={t.category} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4 font-bold text-slate-900">{t.category}</td>
                    <td className="px-5 py-4 text-center">
                      {editingIdx === originalIdx ? (
                        <div className="inline-flex items-center gap-1">
                          <input type="number" value={editRate} onChange={e => setEditRate(+e.target.value)}
                            min={t.minRate} max={t.maxRate} step={0.5}
                            className="w-16 px-2 py-1.5 rounded-lg border-2 border-emerald-500 text-sm font-black text-center focus:outline-none"
                            title={`Rate for ${t.category}`} autoFocus />
                          <span className="text-xs font-bold text-slate-500">%</span>
                        </div>
                      ) : (
                        <span className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-sm font-black">{t.rate}%</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center text-xs text-slate-500">{t.minRate}% — {t.maxRate}%</td>
                    <td className="px-5 py-4 text-right font-medium">{t.sellers}</td>
                    <td className="px-5 py-4 text-right font-medium">{formatInr(t.monthlyGMV)}</td>
                    <td className="px-5 py-4 text-right font-black text-emerald-600">{formatInr(t.commission)}</td>
                    <td className="px-5 py-4 text-center">
                      {editingIdx === originalIdx ? (
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={saveEdit} className="p-1.5 bg-emerald-600 hover:bg-emerald-700 rounded text-white" title="Save">
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setEditingIdx(null)} className="p-1.5 bg-slate-200 hover:bg-slate-300 rounded text-slate-600" title="Cancel">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => startEdit(originalIdx)} className="p-1.5 hover:bg-blue-50 rounded-lg group" title="Edit Rate">
                          <Edit2 className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
          <div className="text-xs text-blue-800 space-y-1">
            <p className="font-bold text-sm text-blue-900">How Tiered Rates Work</p>
            <p>Each category has a <strong>base rate</strong> and an allowable <strong>range</strong>. Rates within the range can be set per-category.</p>
            <p>Individual sellers can receive <strong>custom overrides</strong> (negotiated rates) that take priority over category rates.</p>
            <p>Enterprise sellers with high GMV automatically qualify for lower tier rates via volume-based discounts.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
