'use client';

import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, Download, Filter, Pill, ShoppingBag, FileText, CheckCircle, DollarSign } from 'lucide-react';
import { vendorPharmacyApi } from '@/lib/api/vendor-pharmacy';

const STATUS_COLORS: Record<string, string> = {
  Active: 'bg-emerald-50 text-emerald-700', Completed: 'bg-emerald-50 text-emerald-700', Delivered: 'bg-emerald-50 text-emerald-700', Verified: 'bg-emerald-50 text-emerald-700', Good: 'bg-emerald-50 text-emerald-700', Available: 'bg-emerald-50 text-emerald-700', Resolved: 'bg-emerald-50 text-emerald-700', Published: 'bg-emerald-50 text-emerald-700', Replied: 'bg-emerald-50 text-emerald-700',
  New: 'bg-blue-50 text-blue-700', Unread: 'bg-blue-50 text-blue-700', Open: 'bg-blue-50 text-blue-700', Confirmed: 'bg-blue-50 text-blue-700', Online: 'bg-blue-50 text-blue-700',
  Processing: 'bg-amber-50 text-amber-700', Preparing: 'bg-amber-50 text-amber-700', Pending: 'bg-amber-50 text-amber-700', 'Pending Approval': 'bg-amber-50 text-amber-700', 'Pending Review': 'bg-amber-50 text-amber-700', Investigating: 'bg-amber-50 text-amber-700', 'In Progress': 'bg-amber-50 text-amber-700', Monitor: 'bg-amber-50 text-amber-700', Waiting: 'bg-amber-50 text-amber-700', 'Expiring Soon': 'bg-amber-50 text-amber-700', 'On Trip': 'bg-amber-50 text-amber-700', 'Due for Inspection': 'bg-amber-50 text-amber-700',
  Shipped: 'bg-cyan-50 text-cyan-700', Delivering: 'bg-cyan-50 text-cyan-700', Upcoming: 'bg-cyan-50 text-cyan-700', Scheduled: 'bg-cyan-50 text-cyan-700', Reserved: 'bg-cyan-50 text-cyan-700',
  'Out of Stock': 'bg-red-50 text-red-700', Cancelled: 'bg-red-50 text-red-700', Expired: 'bg-red-50 text-red-700', 'Sold Out': 'bg-red-50 text-red-700', Rejected: 'bg-red-50 text-red-700', Inactive: 'bg-slate-100 text-slate-500', 'No Show': 'bg-red-50 text-red-700', 'Low Stock': 'bg-amber-50 text-amber-700', Offline: 'bg-slate-100 text-slate-500', Maintenance: 'bg-red-50 text-red-700', Paused: 'bg-slate-100 text-slate-500',
  Ended: 'bg-slate-100 text-slate-500', Closed: 'bg-slate-100 text-slate-500', 'Off Duty': 'bg-slate-100 text-slate-500',
};

const MOCK_DATA = [
  [
    "PH-3045",
    "Mary K.",
    "Paracetamol x2, Amoxicillin",
    "Required ✅",
    "1,250",
    "Preparing"
  ],
  [
    "PH-3044",
    "John M.",
    "Vitamin C, Zinc",
    "Not Required",
    "680",
    "Ready"
  ],
  [
    "PH-3043",
    "Grace W.",
    "Blood Pressure Monitor",
    "Not Required",
    "4,500",
    "Delivered"
  ]
];

export default function PharmacyOrdersPage() {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const filters = ["All","New","Pending Rx","Preparing","Ready","Delivered"];

  const filtered = MOCK_DATA.filter(row =>
    row.some(cell => cell.toLowerCase().includes(search.toLowerCase())) &&
    (activeFilter === 'All' || row.some(cell => cell === activeFilter))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Pill className="w-7 h-7 text-blue-600" />Pharmacy Orders
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage prescription and OTC orders</p>
        </div>
        <div className="flex gap-2">
          
          <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors"><Download className="w-4 h-4" />Export</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center"><ShoppingBag className="w-5 h-5 text-blue-600" /></div><div><p className="text-xs text-slate-500">New Orders</p><p className="text-lg font-black text-slate-900">6</p></div></div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center"><FileText className="w-5 h-5 text-amber-600" /></div><div><p className="text-xs text-slate-500">Pending Rx</p><p className="text-lg font-black text-slate-900">3</p></div></div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center"><CheckCircle className="w-5 h-5 text-emerald-600" /></div><div><p className="text-xs text-slate-500">Ready</p><p className="text-lg font-black text-slate-900">4</p></div></div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center"><DollarSign className="w-5 h-5 text-violet-600" /></div><div><p className="text-xs text-slate-500">Today's Sales</p><p className="text-lg font-black text-slate-900">18,500</p></div></div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map(f => (
          <button key={f} onClick={() => setActiveFilter(f)} className={`px-3 py-2 text-xs font-bold rounded-lg border whitespace-nowrap transition-colors ${activeFilter === f ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{f}</button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-500">Order ID</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-500">Customer</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-500">Items</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-500">Prescription</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-500">Total</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((row, i) => (
              <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                {row.map((cell, j) => (
                  <td key={j} className="px-4 py-3.5">
                    {STATUS_COLORS[cell] ? (
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${STATUS_COLORS[cell]}`}>{cell}</span>
                    ) : (
                      <span className="text-slate-700">{cell}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <Pill className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No results found</p>
          </div>
        )}
      </div>
    </div>
  );
}
