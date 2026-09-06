'use client';
import React, { useState } from 'react';
import { TrendingUp, DollarSign, Users, ShoppingBag, ArrowUpRight, ArrowDownRight, Calendar } from 'lucide-react';

const REVENUE_DATA = [
  { label:'Mon', value:14200 }, { label:'Tue', value:11800 }, { label:'Wed', value:18400 },
  { label:'Thu', value:15600 }, { label:'Fri', value:22100 }, { label:'Sat', value:28400 }, { label:'Sun', value:19200 },
];

const STORE_EARNINGS = [
  { name:'Apollo Pharmacy', revenue:290000, orders:520, commission:29000, growth:12 },
  { name:'MedPlus Pharmacy', revenue:180000, orders:380, commission:18000, growth:8 },
  { name:'Wellness Forever', revenue:160000, orders:340, commission:16000, growth:15 },
  { name:'NetMeds Express', revenue:130000, orders:290, commission:13000, growth:-3 },
  { name:'PharmEasy Store', revenue:90000, orders:210, commission:9000, growth:5 },
  { name:'Care Chemist', revenue:50000, orders:120, commission:5000, growth:22 },
];

export default function FranchisePharmacyEarningsPage() {
  const [period, setPeriod] = useState<'week'|'month'|'quarter'>('month');
  const maxRevenue = Math.max(...REVENUE_DATA.map(d => d.value));

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Pharmacy Earnings</h1>
          <p className="text-sm text-slate-500">Revenue and commission overview for your franchise zone.</p>
        </div>
        <div className="flex bg-slate-100 rounded-xl p-1">
          {(['week','month','quarter'] as const).map(p => (
            <button key={p} onClick={()=>setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-colors ${period===p ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500'}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Hero cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label:'Total Revenue', value:'₹9,00,000', change:'+12%', up:true, icon:DollarSign, gradient:'from-green-600 to-emerald-500' },
          { label:'Commission Earned', value:'₹90,000', change:'+15%', up:true, icon:TrendingUp, gradient:'from-blue-600 to-cyan-500' },
          { label:'Total Orders', value:'1,860', change:'+8%', up:true, icon:ShoppingBag, gradient:'from-purple-600 to-violet-500' },
          { label:'Active Stores', value:'6', change:'+1', up:true, icon:Users, gradient:'from-amber-500 to-orange-500' },
        ].map(c => (
          <div key={c.label} className={`bg-linear-to-br ${c.gradient} rounded-2xl p-5 text-white`}>
            <c.icon className="w-8 h-8 mb-3 opacity-80" />
            <p className="text-sm font-medium text-white/80">{c.label}</p>
            <p className="text-2xl font-black mt-1">{c.value}</p>
            <div className="flex items-center gap-1 mt-2 text-xs font-bold">
              {c.up ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              {c.change} vs last {period}
            </div>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h2 className="text-sm font-bold text-slate-900 mb-4">Daily Revenue</h2>
        <div className="flex items-end gap-3 h-48">
          {REVENUE_DATA.map(d => (
            <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] font-bold text-slate-500">₹{(d.value/1000).toFixed(1)}K</span>
              <div className="w-full bg-linear-to-t from-teal-500 to-emerald-400 rounded-t-lg transition-all"
                style={{height:`${(d.value/maxRevenue)*100}%`}} />
              <span className="text-[10px] font-medium text-slate-400">{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Store breakdown */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">Store-wise Breakdown</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-6 py-3 font-bold text-slate-600">Store</th>
              <th className="text-right px-6 py-3 font-bold text-slate-600">Revenue</th>
              <th className="text-center px-6 py-3 font-bold text-slate-600">Orders</th>
              <th className="text-right px-6 py-3 font-bold text-slate-600">Commission</th>
              <th className="text-center px-6 py-3 font-bold text-slate-600">Growth</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {STORE_EARNINGS.map(s => (
              <tr key={s.name} className="hover:bg-slate-50">
                <td className="px-6 py-3 font-semibold text-slate-900">{s.name}</td>
                <td className="px-6 py-3 text-right font-bold">₹{(s.revenue/1000).toFixed(0)}K</td>
                <td className="px-6 py-3 text-center text-slate-500">{s.orders}</td>
                <td className="px-6 py-3 text-right font-bold text-green-700">₹{(s.commission/1000).toFixed(0)}K</td>
                <td className="px-6 py-3 text-center">
                  <span className={`inline-flex items-center gap-0.5 text-xs font-bold ${s.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {s.growth >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {Math.abs(s.growth)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
