'use client';
import ProgressBar from '@/components/seller/progress-bar';
import React, { useState, useEffect } from 'react';
import {
  TrendingUp, Download, Calendar, BarChart3, Users, ShoppingBag,
  Star, Clock, ChevronDown, Bike, UtensilsCrossed, Package, Filter,
  FileSpreadsheet, FileText,
} from 'lucide-react';
import RevenueChart from '@/components/seller/restaurant/revenue-chart';
import { vendorRestaurantApi } from '@/lib/api/vendor-restaurant';

type ReportTab = 'sales' | 'menu' | 'customer' | 'delivery' | 'tax';

const TABS: { id: ReportTab; label: string; icon: React.ElementType }[] = [
  { id: 'sales', label: 'Sales', icon: TrendingUp },
  { id: 'menu', label: 'Menu Performance', icon: BarChart3 },
  { id: 'customer', label: 'Customers', icon: Users },
  { id: 'delivery', label: 'Delivery', icon: Bike },
  { id: 'tax', label: 'Tax Reports', icon: FileText },
];

const DAILY_REVENUE = [
  { label: 'Mon', value: 22400 }, { label: 'Tue', value: 18900 }, { label: 'Wed', value: 28600 },
  { label: 'Thu', value: 24100 }, { label: 'Fri', value: 34200 }, { label: 'Sat', value: 42800 }, { label: 'Sun', value: 38500 },
];

const TOP_ITEMS = [
  { name: 'Chicken Dum Biryani', orders: 284, revenue: 82076, rating: 4.8, trend: '+12%' },
  { name: 'Mutton Biryani', orders: 210, revenue: 79590, rating: 4.7, trend: '+8%' },
  { name: 'Butter Naan', orders: 520, revenue: 20800, rating: 4.5, trend: '+3%' },
  { name: 'Paneer Tikka', orders: 196, revenue: 47040, rating: 4.6, trend: '-2%' },
  { name: 'Tandoori Chicken', orders: 188, revenue: 65800, rating: 4.8, trend: '+15%' },
];

export default function AnalyticsPage() {
  const [tab, setTab] = useState<ReportTab>('sales');
  const [period, setPeriod] = useState('This Week');

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Analytics & Reports</h1>
          <p className="text-sm text-slate-500">Deep insights into sales, menu performance, and operations.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={period} onChange={(e) => setPeriod(e.target.value)} title="Report period"
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 bg-white outline-none shadow-sm">
            <option>Today</option><option>This Week</option><option>This Month</option><option>Last 30 Days</option><option>Custom Range</option>
          </select>
          <div className="flex gap-1">
            <button title="Export as PDF" className="px-3 py-2 bg-red-50 border border-red-200 text-red-700 font-bold rounded-xl text-xs hover:bg-red-100 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> PDF
            </button>
            <button title="Export as Excel" className="px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold rounded-xl text-xs hover:bg-emerald-100 flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
            </button>
            <button title="Export as CSV" className="px-3 py-2 bg-blue-50 border border-blue-200 text-blue-700 font-bold rounded-xl text-xs hover:bg-blue-100 flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto border-b border-slate-200 pb-2">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
              tab === t.id ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Sales Report */}
      {tab === 'sales' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Revenue', value: '₹1,28,400', change: '+15.2%', up: true, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Total Orders', value: '342', change: '+8.4%', up: true, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Avg Order Value', value: '₹375', change: '+3.1%', up: true, color: 'text-purple-600', bg: 'bg-purple-50' },
              { label: 'Cancelled', value: '12', change: '-2.3%', up: true, color: 'text-amber-600', bg: 'bg-amber-50' },
            ].map((s) => (
              <div key={s.label} className={`${s.bg} rounded-2xl p-4 border border-slate-100`}>
                <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">{s.label}</p>
                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                <p className={`text-[10px] font-bold mt-1 ${s.up ? 'text-emerald-600' : 'text-red-600'}`}>{s.change} vs last period</p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h2 className="font-black text-slate-900 mb-4">Revenue Trend</h2>
            <RevenueChart data={DAILY_REVENUE} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Delivery', value: '₹79,608', pct: 62, icon: Bike, color: 'text-orange-600', bg: 'bg-orange-50' },
              { label: 'Takeaway', value: '₹25,680', pct: 20, icon: ShoppingBag, color: 'text-purple-600', bg: 'bg-purple-50' },
              { label: 'Dine-in', value: '₹23,112', pct: 18, icon: UtensilsCrossed, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            ].map((ch) => (
              <div key={ch.label} className={`${ch.bg} rounded-2xl p-4 border border-slate-100`}>
                <div className="flex items-center gap-2 mb-2">
                  <ch.icon className={`w-4 h-4 ${ch.color}`} />
                  <span className="text-xs font-bold text-slate-600">{ch.label}</span>
                </div>
                <p className={`text-xl font-black ${ch.color}`}>{ch.value}</p>
                <div className="mt-2 bg-white/60 rounded-full h-1.5">
                  <ProgressBar percent={ch.pct} className={`${ch.color.replace('text-', 'bg-')} rounded-full h-1.5`} />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">{ch.pct}% of revenue</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Menu Performance */}
      {tab === 'menu' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h2 className="font-black text-slate-900">Top Performing Items</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold">#</th>
                  <th className="px-5 py-3 text-left font-semibold">Item</th>
                  <th className="px-5 py-3 text-center font-semibold">Orders</th>
                  <th className="px-5 py-3 text-right font-semibold">Revenue</th>
                  <th className="px-5 py-3 text-center font-semibold">Rating</th>
                  <th className="px-5 py-3 text-center font-semibold">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {TOP_ITEMS.map((item, i) => (
                  <tr key={item.name} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3.5 font-black text-slate-400">{i + 1}</td>
                    <td className="px-5 py-3.5 font-bold text-slate-900">{item.name}</td>
                    <td className="px-5 py-3.5 text-center font-bold text-slate-700">{item.orders}</td>
                    <td className="px-5 py-3.5 text-right font-black text-emerald-600">₹{item.revenue.toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="text-amber-600 font-bold flex items-center justify-center gap-0.5">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {item.rating}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`text-xs font-bold ${item.trend.startsWith('+') ? 'text-emerald-600' : 'text-red-600'}`}>{item.trend}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Customer Report */}
      {tab === 'customer' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Customers', value: '1,248', color: 'text-slate-700', bg: 'bg-white' },
              { label: 'New This Month', value: '156', color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Returning', value: '68%', color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Avg Lifetime Value', value: '₹2,450', color: 'text-purple-600', bg: 'bg-purple-50' },
            ].map((s) => (
              <div key={s.label} className={`${s.bg} border border-slate-200 rounded-xl p-4 text-center shadow-sm`}>
                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delivery Report */}
      {tab === 'delivery' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Deliveries', value: '212', color: 'text-slate-700', bg: 'bg-white' },
              { label: 'Avg Delivery Time', value: '32 min', color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Success Rate', value: '96.2%', color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Failed/Returned', value: '8', color: 'text-red-600', bg: 'bg-red-50' },
            ].map((s) => (
              <div key={s.label} className={`${s.bg} border border-slate-200 rounded-xl p-4 text-center shadow-sm`}>
                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tax Report */}
      {tab === 'tax' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h2 className="font-black text-slate-900">Tax Collection Summary — {period}</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold">Tax Type</th>
                  <th className="px-5 py-3 text-center font-semibold">Rate</th>
                  <th className="px-5 py-3 text-right font-semibold">Taxable Amount</th>
                  <th className="px-5 py-3 text-right font-semibold">Tax Collected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { type: 'CGST', rate: '2.5%', taxable: '₹1,08,200', tax: '₹2,705' },
                  { type: 'SGST', rate: '2.5%', taxable: '₹1,08,200', tax: '₹2,705' },
                  { type: 'IGST', rate: '5%', taxable: '₹20,200', tax: '₹1,010' },
                ].map((t) => (
                  <tr key={t.type} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3.5 font-bold text-slate-900">{t.type}</td>
                    <td className="px-5 py-3.5 text-center text-slate-600">{t.rate}</td>
                    <td className="px-5 py-3.5 text-right text-slate-700">{t.taxable}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-blue-600">{t.tax}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-black">
                  <td className="px-5 py-3.5" colSpan={3}>Total Tax Collected</td>
                  <td className="px-5 py-3.5 text-right text-blue-700">₹6,420</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
