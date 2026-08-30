'use client';
import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Building2, Users, Calendar, ArrowUpRight, ArrowDownRight, BarChart3, PieChart } from 'lucide-react';
import { adminHotelApi } from '@/lib/api/admin-hotel';

const REVENUE_DATA = {
  monthly: [
    { month: 'Jan', revenue: 420000, bookings: 380, commission: 58800 },
    { month: 'Feb', revenue: 385000, bookings: 350, commission: 53900 },
    { month: 'Mar', revenue: 510000, bookings: 460, commission: 71400 },
    { month: 'Apr', revenue: 480000, bookings: 430, commission: 67200 },
    { month: 'May', revenue: 550000, bookings: 495, commission: 77000 },
    { month: 'Jun', revenue: 620000, bookings: 560, commission: 86800 },
    { month: 'Jul', revenue: 580000, bookings: 520, commission: 81200 },
  ],
  byCity: [
    { city: 'Dubai', revenue: 1800000, share: 45, hotels: 42 },
    { city: 'Abu Dhabi', revenue: 920000, share: 23, hotels: 22 },
    { city: 'Sharjah', revenue: 480000, share: 12, hotels: 15 },
    { city: 'Ajman', revenue: 320000, share: 8, hotels: 10 },
    { city: 'Other', revenue: 480000, share: 12, hotels: 14 },
  ],
  byTier: [
    { tier: '5-Star', revenue: 2100000, share: 52.5, avgRate: 650 },
    { tier: '4-Star', revenue: 1200000, share: 30, avgRate: 380 },
    { tier: '3-Star', revenue: 500000, share: 12.5, avgRate: 220 },
    { tier: 'Budget', revenue: 200000, share: 5, avgRate: 120 },
  ],
  byRoomType: [
    { type: 'Suite', revenue: 1500000, bookings: 180, avgPrice: 820 },
    { type: 'Deluxe', revenue: 1200000, bookings: 420, avgPrice: 450 },
    { type: 'Premium', revenue: 800000, bookings: 310, avgPrice: 520 },
    { type: 'Standard', revenue: 500000, bookings: 450, avgPrice: 200 },
  ],
};

export default function RevenuePage() {
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  const totalRevenue = REVENUE_DATA.monthly.reduce((s, m) => s + m.revenue, 0);
  const totalBookings = REVENUE_DATA.monthly.reduce((s, m) => s + m.bookings, 0);
  const totalCommission = REVENUE_DATA.monthly.reduce((s, m) => s + m.commission, 0);
  const maxMonthlyRevenue = Math.max(...REVENUE_DATA.monthly.map(m => m.revenue));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Revenue Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Platform-wide hotel booking revenue analytics</p>
        </div>
        <div className="flex gap-2">
          {(['week', 'month', 'quarter', 'year'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-2 text-xs font-bold rounded-xl transition-colors ${
                period === p ? 'bg-rose-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-rose-300'
              }`}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: `AED ${(totalRevenue / 1000000).toFixed(1)}M`, change: '+12.5%', up: true, icon: DollarSign, bg: 'bg-emerald-100 text-emerald-600' },
          { label: 'Total Bookings', value: totalBookings.toLocaleString(), change: '+8.2%', up: true, icon: Users, bg: 'bg-blue-100 text-blue-600' },
          { label: 'Platform Commission', value: `AED ${(totalCommission / 1000).toFixed(0)}K`, change: '+15.1%', up: true, icon: TrendingUp, bg: 'bg-rose-100 text-rose-600' },
          { label: 'Avg Booking Value', value: `AED ${Math.round(totalRevenue / totalBookings).toLocaleString()}`, change: '-2.3%', up: false, icon: BarChart3, bg: 'bg-amber-100 text-amber-600' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center`}>
                <s.icon className="w-5 h-5" />
              </div>
              <span className={`flex items-center gap-1 text-xs font-bold ${s.up ? 'text-emerald-600' : 'text-red-500'}`}>
                {s.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />} {s.change}
              </span>
            </div>
            <p className="text-2xl font-black text-slate-900">{s.value}</p>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Revenue Chart (bar chart using CSS) */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-rose-600" /> Monthly Revenue Trend
          </h3>
        </div>
        <div className="flex items-end gap-3 h-48">
          {REVENUE_DATA.monthly.map((m, i) => {
            const height = (m.revenue / maxMonthlyRevenue) * 100;
            const commHeight = (m.commission / maxMonthlyRevenue) * 100;
            return (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                <p className="text-[10px] font-bold text-slate-500">AED {(m.revenue / 1000).toFixed(0)}K</p>
                <div className="w-full relative" style={{ height: `${height}%` }}>
                  <div className="absolute bottom-0 left-0 right-0 bg-rose-500/20 rounded-t-lg" style={{ height: '100%' }} />
                  <div className="absolute bottom-0 left-0 right-0 bg-rose-600 rounded-t-lg" style={{ height: `${commHeight / height * 100}%` }} />
                </div>
                <p className="text-[10px] font-bold text-slate-400">{m.month}</p>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-4 justify-center">
          <span className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-3 h-3 rounded bg-rose-500/20" /> Revenue</span>
          <span className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-3 h-3 rounded bg-rose-600" /> Commission</span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* By City */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-rose-600" /> Revenue by City
          </h3>
          <div className="space-y-3">
            {REVENUE_DATA.byCity.map(c => (
              <div key={c.city}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-slate-700">{c.city}</span>
                  <span className="text-sm font-bold text-slate-900">AED {(c.revenue / 1000).toFixed(0)}K <span className="text-xs text-slate-400">({c.share}%)</span></span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full transition-all" style={{ width: `${c.share}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By Star Rating */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-rose-600" /> Revenue by Hotel Tier
          </h3>
          <div className="space-y-3">
            {REVENUE_DATA.byTier.map(t => (
              <div key={t.tier} className="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center">
                    <span className="text-sm font-black text-rose-600">{t.share.toFixed(0)}%</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{t.tier}</p>
                    <p className="text-[10px] text-slate-400">Avg rate: AED {t.avgRate}</p>
                  </div>
                </div>
                <p className="text-sm font-black text-slate-900">AED {(t.revenue / 1000000).toFixed(1)}M</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Room Type Performance */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">Room Type Performance</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="text-left px-5 py-3 font-bold text-xs text-slate-400">Room Type</th>
              <th className="text-right px-5 py-3 font-bold text-xs text-slate-400">Revenue</th>
              <th className="text-right px-5 py-3 font-bold text-xs text-slate-400">Bookings</th>
              <th className="text-right px-5 py-3 font-bold text-xs text-slate-400">Avg Price</th>
              <th className="text-right px-5 py-3 font-bold text-xs text-slate-400">Share</th>
            </tr>
          </thead>
          <tbody>
            {REVENUE_DATA.byRoomType.map(r => (
              <tr key={r.type} className="border-b border-slate-50 hover:bg-slate-50/50">
                <td className="px-5 py-4 font-bold text-slate-900">{r.type}</td>
                <td className="px-5 py-4 text-right font-bold text-slate-900">AED {(r.revenue / 1000000).toFixed(1)}M</td>
                <td className="px-5 py-4 text-right font-semibold text-slate-700">{r.bookings}</td>
                <td className="px-5 py-4 text-right font-semibold text-slate-700">AED {r.avgPrice}</td>
                <td className="px-5 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500 rounded-full" style={{ width: `${r.revenue / totalRevenue * 100}%` }} />
                    </div>
                    <span className="text-xs font-bold text-slate-500">{(r.revenue / totalRevenue * 100).toFixed(1)}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
