'use client';
import React, { useState } from 'react';
import { BarChart3, TrendingUp, Package, Pill, DollarSign, Star, Users, ArrowUpRight, ArrowDownRight, Download, Calendar } from 'lucide-react';

const METRICS = [
  { label:'Total Revenue', value:'₹9,00,000', change:12, icon:DollarSign, color:'text-green-600 bg-green-50' },
  { label:'Total Orders', value:'1,860', change:8, icon:Package, color:'text-blue-600 bg-blue-50' },
  { label:'Rx Orders', value:'520 (28%)', change:15, icon:Pill, color:'text-red-600 bg-red-50' },
  { label:'Avg Rating', value:'4.5', change:3, icon:Star, color:'text-amber-600 bg-amber-50' },
  { label:'Active Stores', value:'6', change:20, icon:Users, color:'text-purple-600 bg-purple-50' },
  { label:'Commission', value:'₹90,000', change:15, icon:TrendingUp, color:'text-teal-600 bg-teal-50' },
];

const TOP_PRODUCTS = [
  { name:'Crocin Advance 500mg', orders:890, revenue:40050 },
  { name:'Vitamin D3 60K IU', orders:720, revenue:86400 },
  { name:'Cetirizine 10mg', orders:650, revenue:19500 },
  { name:'Dettol Hand Wash 750ml', orders:560, revenue:72240 },
  { name:'Betadine 100ml', orders:480, revenue:45600 },
];

const TOP_STORES = [
  { name:'Apollo Pharmacy', orders:520, revenue:290000, rating:4.8 },
  { name:'MedPlus Pharmacy', orders:380, revenue:180000, rating:4.6 },
  { name:'Wellness Forever', orders:340, revenue:160000, rating:4.5 },
];

export default function FranchisePharmacyReportsPage() {
  const [period, setPeriod] = useState<'week'|'month'|'quarter'>('month');

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Pharmacy Reports</h1>
          <p className="text-sm text-slate-500">Analytics and insights across your franchise pharmacy stores.</p>
        </div>
        <div className="flex gap-3">
          <div className="flex bg-slate-100 rounded-xl p-1">
            {(['week','month','quarter'] as const).map(p => (
              <button key={p} onClick={()=>setPeriod(p)}
                className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-colors ${period===p ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500'}`}>
                {p}
              </button>
            ))}
          </div>
          <button className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-2">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {METRICS.map(m => (
          <div key={m.label} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${m.color.split(' ')[1]} mb-2`}>
              <m.icon className={`w-4 h-4 ${m.color.split(' ')[0]}`} />
            </div>
            <p className="text-[10px] text-slate-400 font-medium">{m.label}</p>
            <p className="text-lg font-black text-slate-900">{m.value}</p>
            <span className={`text-[10px] font-bold flex items-center gap-0.5 ${m.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {m.change >= 0 ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
              {Math.abs(m.change)}%
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top products */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-slate-900 mb-4">Top Products</h2>
          <div className="space-y-3">
            {TOP_PRODUCTS.map((p,i) => (
              <div key={p.name} className="flex items-center gap-3">
                <span className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-500">{i+1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{p.name}</p>
                  <p className="text-xs text-slate-400">{p.orders} orders</p>
                </div>
                <span className="text-sm font-bold text-slate-900">₹{(p.revenue/1000).toFixed(1)}K</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top stores */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-slate-900 mb-4">Top Performing Stores</h2>
          <div className="space-y-3">
            {TOP_STORES.map((s,i) => (
              <div key={s.name} className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${i===0?'bg-amber-500':i===1?'bg-slate-400':'bg-amber-700'}`}>{i+1}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">{s.name}</p>
                  <p className="text-xs text-slate-400">{s.orders} orders • ⭐ {s.rating}</p>
                </div>
                <span className="text-sm font-bold text-green-700">₹{(s.revenue/1000).toFixed(0)}K</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
