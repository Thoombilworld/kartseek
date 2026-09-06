'use client';

import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, Download, Filter, BookOpen, Plus } from 'lucide-react';
import { vendorRestaurantApi } from '@/lib/api/vendor-restaurant';

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
    "Chicken Biryani",
    "Main Course",
    "850",
    "25 min",
    "Yes",
    "Active"
  ],
  [
    "Margherita Pizza",
    "Pizza",
    "1,200",
    "20 min",
    "Yes",
    "Active"
  ],
  [
    "Caesar Salad",
    "Starters",
    "450",
    "10 min",
    "No",
    "Sold Out"
  ],
  [
    "Tiramisu",
    "Desserts",
    "550",
    "5 min",
    "Yes",
    "Active"
  ]
];

export default function MenuManagementPage() {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const filters = ["All"];

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
            <BookOpen className="w-7 h-7 text-blue-600" />Menu Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage your restaurant menu</p>
        </div>
        <div className="flex gap-2">
          <Link href="/seller/restaurant/menu-items/add" className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors"><Plus className="w-4 h-4" />Add Menu Item</Link>
          <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors"><Download className="w-4 h-4" />Export</button>
        </div>
      </div>


      {/* Filters */}
      

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
              <th className="px-4 py-3 text-left font-semibold text-slate-500">Item</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-500">Category</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-500">Price</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-500">Prep Time</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-500">Available</th>
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
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No results found</p>
          </div>
        )}
      </div>
    </div>
  );
}
