'use client';
import ProgressBar from '@/components/seller/progress-bar';
import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, FileText, Download, Pill, Package, ShieldCheck, Wallet } from 'lucide-react';
import { vendorPharmacyApi } from '@/lib/api/vendor-pharmacy';

const TABS = ['Sales', 'Prescriptions', 'Inventory', 'Tax', 'Settlement', 'Compliance'];

export default function PharmacyReportsPage() {
  const [tab, setTab] = useState('Sales');
  const [period, setPeriod] = useState('This Month');

  return (
    <div className="max-w-[1200px] mx-auto space-y-5">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Analytics & Reports</h1>
          <p className="text-sm text-slate-500">Deep insights into sales, prescriptions, inventory, and compliance.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={period} onChange={(e) => setPeriod(e.target.value)} title="Report period"
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 bg-white outline-none shadow-sm">
            <option>Today</option><option>This Week</option><option>This Month</option><option>Last 30 Days</option><option>Custom Range</option>
          </select>
          <button className="px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
              tab === t ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {/* Sales Tab */}
      {tab === 'Sales' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Revenue', value: '₹2,84,500', change: '+12.5%', color: 'text-emerald-600' },
              { label: 'Total Orders', value: '342', change: '+8.2%', color: 'text-blue-600' },
              { label: 'Avg Order Value', value: '₹831', change: '+3.1%', color: 'text-purple-600' },
              { label: 'Return Rate', value: '1.2%', change: '-0.3%', color: 'text-amber-600' },
            ].map((m) => (
              <div key={m.label} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                <p className={`text-2xl font-black ${m.color}`}>{m.value}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase">{m.label}</p>
                <p className="text-[10px] font-bold text-emerald-600 mt-1">{m.change} vs last period</p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h2 className="font-black text-slate-900 mb-4">Top Selling Medicines</h2>
            <div className="space-y-3">
              {[
                { name: 'Dolo 650', brand: 'Micro Labs', orders: 89, revenue: '₹2,492', pct: 92 },
                { name: 'Augmentin 625 Duo', brand: 'GSK', orders: 42, revenue: '₹9,156', pct: 78 },
                { name: 'Celin 500mg', brand: 'GSK', orders: 38, revenue: '₹2,470', pct: 70 },
                { name: 'Thyronorm 50mcg', brand: 'Abbott', orders: 28, revenue: '₹3,220', pct: 55 },
                { name: 'Paracetamol 500mg', brand: 'Dolo', orders: 25, revenue: '₹625', pct: 48 },
              ].map((item) => (
                <div key={item.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-slate-700">{item.name} <span className="text-slate-400 font-normal">• {item.brand}</span></span>
                    <span className="text-xs font-black text-slate-900">{item.revenue} ({item.orders} orders)</span>
                  </div>
                  <div className="bg-slate-100 rounded-full h-2">
                    <ProgressBar percent={item.pct} className="bg-teal-500 rounded-full h-2 transition-all" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Prescriptions Tab */}
      {tab === 'Prescriptions' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Rx Processed', value: '186', color: 'text-blue-600' },
              { label: 'Approved', value: '164', color: 'text-emerald-600' },
              { label: 'Rejected', value: '14', color: 'text-red-600' },
              { label: 'Avg Turnaround', value: '18 min', color: 'text-purple-600' },
            ].map((m) => (
              <div key={m.label} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                <p className={`text-2xl font-black ${m.color}`}>{m.value}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase">{m.label}</p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h2 className="font-black text-slate-900 mb-3">Rejection Reasons</h2>
            {[
              { reason: 'Expired prescription', count: 6, pct: 43 },
              { reason: 'Illegible handwriting', count: 4, pct: 29 },
              { reason: 'Controlled substance violation', count: 3, pct: 21 },
              { reason: 'Missing doctor details', count: 1, pct: 7 },
            ].map((r) => (
              <div key={r.reason} className="mb-2">
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="font-bold text-slate-700">{r.reason}</span>
                  <span className="font-black text-slate-500">{r.count} ({r.pct}%)</span>
                </div>
                <div className="bg-slate-100 rounded-full h-1.5"><ProgressBar percent={r.pct} className="bg-red-400 rounded-full h-1.5" /></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inventory Tab */}
      {tab === 'Inventory' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total SKUs', value: '845', color: 'text-slate-700' },
              { label: 'Stock Value', value: '₹8.4L', color: 'text-emerald-600' },
              { label: 'Expiring (30d)', value: '12', color: 'text-red-600' },
              { label: 'Wastage', value: '₹4,200', color: 'text-amber-600' },
            ].map((m) => (
              <div key={m.label} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                <p className={`text-2xl font-black ${m.color}`}>{m.value}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase">{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tax Tab */}
      {tab === 'Tax' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h2 className="font-black text-slate-900 mb-4">GST Summary — {period}</h2>
            <div className="space-y-3">
              {[
                { slab: '5% GST (Essential Medicines)', taxable: '₹1,42,300', cgst: '₹3,558', sgst: '₹3,558', total: '₹7,115' },
                { slab: '12% GST (Standard)', taxable: '₹86,200', cgst: '₹5,172', sgst: '₹5,172', total: '₹10,344' },
                { slab: '18% GST (Devices)', taxable: '₹18,000', cgst: '₹1,620', sgst: '₹1,620', total: '₹3,240' },
              ].map((row) => (
                <div key={row.slab} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <p className="font-bold text-sm text-slate-800 mb-2">{row.slab}</p>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div><p className="text-slate-400">Taxable</p><p className="font-black">{row.taxable}</p></div>
                    <div><p className="text-slate-400">CGST</p><p className="font-black">{row.cgst}</p></div>
                    <div><p className="text-slate-400">SGST</p><p className="font-black">{row.sgst}</p></div>
                    <div><p className="text-slate-400">Total Tax</p><p className="font-black text-teal-700">{row.total}</p></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Settlement Tab */}
      {tab === 'Settlement' && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: 'Total Settled', value: '₹2,48,000', color: 'text-emerald-600' },
            { label: 'Pending', value: '₹36,500', color: 'text-amber-600' },
            { label: 'Commission Paid', value: '₹14,200', color: 'text-red-600' },
          ].map((m) => (
            <div key={m.label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <p className={`text-2xl font-black ${m.color}`}>{m.value}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase">{m.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Compliance Tab */}
      {tab === 'Compliance' && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: 'Compliance Score', value: '92%', color: 'text-emerald-600' },
            { label: 'Documents Verified', value: '6/8', color: 'text-blue-600' },
            { label: 'Expiring Licenses', value: '1', color: 'text-red-600' },
          ].map((m) => (
            <div key={m.label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <p className={`text-2xl font-black ${m.color}`}>{m.value}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase">{m.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Export Options */}
      <div className="flex gap-2">
        {['PDF', 'Excel', 'CSV'].map((fmt) => (
          <button key={fmt} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 transition-colors">
            <Download className="w-3.5 h-3.5" /> Export {fmt}
          </button>
        ))}
      </div>
    </div>
  );
}
