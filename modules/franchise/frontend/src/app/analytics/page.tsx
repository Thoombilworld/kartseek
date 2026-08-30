'use client';

import React, { useState } from 'react';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Package, Users, Store, ArrowUpRight, ShoppingCart, UtensilsCrossed, Pill, Car, Stethoscope } from 'lucide-react';

const monthlyRevenue = [
  { month: 'Jan', revenue: 820000, orders: 3200 }, { month: 'Feb', revenue: 940000, orders: 3600 },
  { month: 'Mar', revenue: 1100000, orders: 4100 }, { month: 'Apr', revenue: 1050000, orders: 3900 },
  { month: 'May', revenue: 1280000, orders: 4800 }, { month: 'Jun', revenue: 1420000, orders: 5200 },
];

const modulePerformance = [
  { name: 'Grocery', icon: ShoppingCart, revenue: '₹4.8L', orders: 1840, growth: '+14%', color: 'bg-green-50 text-green-600 border-green-200', barColor: '#10b981' },
  { name: 'Restaurant', icon: UtensilsCrossed, revenue: '₹3.6L', orders: 1320, growth: '+22%', color: 'bg-orange-50 text-orange-600 border-orange-200', barColor: '#f97316' },
  { name: 'Pharmacy', icon: Pill, revenue: '₹1.8L', orders: 680, growth: '+8%', color: 'bg-cyan-50 text-cyan-600 border-cyan-200', barColor: '#06b6d4' },
  { name: 'Marketplace', icon: Store, revenue: '₹2.4L', orders: 520, growth: '+18%', color: 'bg-blue-50 text-blue-600 border-blue-200', barColor: '#3b82f6' },
  { name: 'Taxi', icon: Car, revenue: '₹1.2L', orders: 890, growth: '+5%', color: 'bg-amber-50 text-amber-600 border-amber-200', barColor: '#f59e0b' },
  { name: 'Doctor', icon: Stethoscope, revenue: '₹0.6L', orders: 210, growth: '+32%', color: 'bg-purple-50 text-purple-600 border-purple-200', barColor: '#8b5cf6' },
];

const topMetrics = [
  { label: 'Total Revenue (MTD)', value: '₹14.4L', change: '+18.2%', up: true, icon: DollarSign },
  { label: 'Total Orders (MTD)', value: '5,460', change: '+12.5%', up: true, icon: Package },
  { label: 'Active Customers', value: '14.2K', change: '+840', up: true, icon: Users },
  { label: 'Active Vendors', value: '156', change: '+8', up: true, icon: Store },
];

export default function FranchiseAnalyticsPage() {
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('monthly');
  const maxRevenue = Math.max(...monthlyRevenue.map(m => m.revenue));
  const maxModuleOrders = Math.max(...modulePerformance.map(m => m.orders));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics & Reports</h1>
          <p className="text-slate-500">Comprehensive performance metrics across your franchise territory.</p>
        </div>
        <div className="flex items-center gap-2 bg-white rounded-lg border border-slate-200 p-1">
          {(['weekly', 'monthly'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors capitalize ${period === p ? 'bg-teal-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}>{p}</button>
          ))}
        </div>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {topMetrics.map((m, i) => (
          <div key={i} className={`p-5 rounded-xl shadow-sm border ${i === 0 ? 'bg-gradient-to-br from-teal-500 to-teal-600 text-white border-teal-400' : 'bg-white border-slate-200'}`}>
            <m.icon className={`w-5 h-5 ${i === 0 ? 'opacity-80' : 'text-slate-400'}`} />
            <p className={`text-2xl font-black mt-3 ${i === 0 ? '' : 'text-slate-900'}`}>{m.value}</p>
            <p className={`text-sm font-medium mt-1 ${i === 0 ? 'opacity-80' : 'text-slate-500'}`}>{m.label}</p>
            <div className={`flex items-center gap-1 mt-2 text-xs font-bold ${i === 0 ? 'opacity-90' : 'text-emerald-600'}`}>
              {m.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />} {m.change}
            </div>
          </div>
        ))}
      </div>

      {/* Revenue Chart */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-slate-900">Revenue Trend</h3>
          <span className="text-xs text-slate-400 font-medium">Last 6 months</span>
        </div>
        <div className="flex items-end gap-4 h-48">
          {monthlyRevenue.map((m, i) => (
            <div key={m.month} className="flex-1 flex flex-col items-center gap-2">
              <span className="text-xs font-bold text-slate-600">₹{(m.revenue / 100000).toFixed(1)}L</span>
              <div className="w-full rounded-t-lg transition-all duration-500"
                style={{
                  height: `${(m.revenue / maxRevenue) * 100}%`,
                  background: i === monthlyRevenue.length - 1 ? 'linear-gradient(to top, #0d9488, #14b8a6)' : '#e2e8f0',
                }} />
              <span className="text-xs font-medium text-slate-500">{m.month}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Module Performance */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50/50">
          <h3 className="font-bold text-slate-900">Module Performance Comparison</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {modulePerformance.map(mod => (
            <div key={mod.name} className="p-5 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${mod.color}`}>
                <mod.icon className="w-5 h-5" />
              </div>
              <div className="w-28">
                <h4 className="font-bold text-slate-900 text-sm">{mod.name}</h4>
                <p className="text-xs text-emerald-600 font-bold">{mod.growth}</p>
              </div>
              <div className="flex-1">
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(mod.orders / maxModuleOrders) * 100}%`, backgroundColor: mod.barColor }} />
                </div>
              </div>
              <div className="text-right w-20">
                <p className="font-bold text-slate-900 text-sm">{mod.orders.toLocaleString()}</p>
                <p className="text-[10px] text-slate-400">orders</p>
              </div>
              <div className="text-right w-20">
                <p className="font-bold text-emerald-600 text-sm">{mod.revenue}</p>
                <p className="text-[10px] text-slate-400">revenue</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Growth Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: 'Customer Retention', value: '78%', desc: '+4% vs last month', color: 'text-emerald-600' },
          { title: 'Avg Order Value', value: '₹542', desc: '+₹38 vs last month', color: 'text-teal-600' },
          { title: 'Vendor Satisfaction', value: '4.6/5', desc: 'Based on 156 reviews', color: 'text-indigo-600' },
        ].map((card, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <p className="text-sm text-slate-500 font-medium">{card.title}</p>
            <p className={`text-3xl font-black mt-2 ${card.color}`}>{card.value}</p>
            <p className="text-xs text-slate-400 mt-1">{card.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
