'use client';

import React, { useState } from 'react';
import { Users, TrendingUp, Search, ShoppingBag, Calendar, Star, Eye, Mail, Phone, ArrowUpRight } from 'lucide-react';

const customers = [
  { id: 'CU-001', name: 'Rahul Khanna', email: 'rahul.k@email.com', phone: '+91 98765 43001', orders: 42, spent: '₹18,450', lastOrder: '2 days ago', joined: 'Jan 2025', status: 'active', tier: 'Gold', favModule: 'Grocery' },
  { id: 'CU-002', name: 'Priya Sharma', email: 'priya.s@email.com', phone: '+91 98765 43002', orders: 38, spent: '₹24,800', lastOrder: '1 day ago', joined: 'Dec 2024', status: 'active', tier: 'Platinum', favModule: 'Restaurant' },
  { id: 'CU-003', name: 'Anil Mehta', email: 'anil.m@email.com', phone: '+91 98765 43003', orders: 15, spent: '₹6,200', lastOrder: '5 days ago', joined: 'Mar 2025', status: 'active', tier: 'Silver', favModule: 'Pharmacy' },
  { id: 'CU-004', name: 'Sneha Rao', email: 'sneha.r@email.com', phone: '+91 98765 43004', orders: 56, spent: '₹32,100', lastOrder: '3 hrs ago', joined: 'Nov 2024', status: 'active', tier: 'Platinum', favModule: 'Restaurant' },
  { id: 'CU-005', name: 'Vikram Taneja', email: 'vikram.t@email.com', phone: '+91 98765 43005', orders: 28, spent: '₹12,800', lastOrder: '1 week ago', joined: 'Feb 2025', status: 'active', tier: 'Gold', favModule: 'Grocery' },
  { id: 'CU-006', name: 'Neha Gupta', email: 'neha.g@email.com', phone: '+91 98765 43006', orders: 8, spent: '₹3,400', lastOrder: '2 weeks ago', joined: 'May 2025', status: 'inactive', tier: 'Bronze', favModule: 'Marketplace' },
  { id: 'CU-007', name: 'Karan Chopra', email: 'karan.c@email.com', phone: '+91 98765 43007', orders: 62, spent: '₹41,200', lastOrder: 'Today', joined: 'Oct 2024', status: 'active', tier: 'Platinum', favModule: 'Restaurant' },
  { id: 'CU-008', name: 'Divya Pillai', email: 'divya.p@email.com', phone: '+91 98765 43008', orders: 3, spent: '₹15,800', lastOrder: '3 days ago', joined: 'Jun 2025', status: 'active', tier: 'Silver', favModule: 'Marketplace' },
  { id: 'CU-009', name: 'Arjun Nair', email: 'arjun.n@email.com', phone: '+91 98765 43009', orders: 19, spent: '₹8,900', lastOrder: '4 days ago', joined: 'Apr 2025', status: 'active', tier: 'Silver', favModule: 'Grocery' },
  { id: 'CU-010', name: 'Maya Iyer', email: 'maya.i@email.com', phone: '+91 98765 43010', orders: 33, spent: '₹19,600', lastOrder: '1 day ago', joined: 'Jan 2025', status: 'active', tier: 'Gold', favModule: 'Marketplace' },
];

const tierColors: Record<string, string> = {
  Platinum: 'bg-indigo-100 text-indigo-700', Gold: 'bg-amber-100 text-amber-700', Silver: 'bg-slate-100 text-slate-600', Bronze: 'bg-orange-100 text-orange-700',
};

export default function FranchiseCustomersPage() {
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('All');

  const filtered = customers.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()) || c.id.toLowerCase().includes(search.toLowerCase());
    const matchTier = tierFilter === 'All' || c.tier === tierFilter;
    return matchSearch && matchTier;
  });

  const activeCount = customers.filter(c => c.status === 'active').length;
  const totalSpent = customers.reduce((a, c) => a + parseInt(c.spent.replace(/[₹,]/g, '')), 0);
  const avgOrders = Math.round(customers.reduce((a, c) => a + c.orders, 0) / customers.length);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Customer Management</h1>
        <p className="text-slate-500">Track customer activity, spending patterns, and engagement in your franchise region.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { title: 'Active Customers', value: String(activeCount), icon: Users, trend: '+340', color: 'bg-teal-50 text-teal-600' },
          { title: 'Avg Orders / Customer', value: String(avgOrders), icon: ShoppingBag, trend: '+2.4', color: 'bg-blue-50 text-blue-600' },
          { title: 'Total Spend (MTD)', value: '₹' + (totalSpent / 100000).toFixed(1) + 'L', icon: TrendingUp, trend: '+18%', color: 'bg-emerald-50 text-emerald-600' },
          { title: 'Retention Rate', value: '78%', icon: Star, trend: '+4%', color: 'bg-purple-50 text-purple-600' },
        ].map((s, i) => (
          <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3"><div className={`w-10 h-10 rounded-full ${s.color} flex items-center justify-center`}><s.icon className="w-5 h-5" /></div><span className="text-sm font-bold text-green-600">{s.trend}</span></div>
            <p className="text-slate-500 text-sm font-medium">{s.title}</p><h3 className="text-2xl font-bold text-slate-900 mt-1">{s.value}</h3>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search customers by name, email, or ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white" />
        </div>
        <select value={tierFilter} onChange={(e) => setTierFilter(e.target.value)} className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
          <option value="All">All Tiers</option><option value="Platinum">Platinum</option><option value="Gold">Gold</option><option value="Silver">Silver</option><option value="Bronze">Bronze</option>
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center"><h2 className="font-bold text-slate-900">Customer Directory</h2><span className="text-xs text-slate-400">{filtered.length} customers</span></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Customer</th><th className="px-5 py-3.5 font-semibold text-center">Tier</th><th className="px-5 py-3.5 font-semibold text-center">Orders</th>
                <th className="px-5 py-3.5 font-semibold text-right">Total Spent</th><th className="px-5 py-3.5 font-semibold">Fav Module</th><th className="px-5 py-3.5 font-semibold">Last Order</th><th className="px-5 py-3.5 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4"><div className="flex items-center gap-3"><div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-xs font-bold text-slate-600">{c.name.split(' ').map(n => n[0]).join('')}</div><div><p className="font-bold text-slate-900">{c.name}</p><p className="text-xs text-slate-400">{c.email}</p></div></div></td>
                  <td className="px-5 py-4 text-center"><span className={`${tierColors[c.tier]} px-2.5 py-1 rounded-full text-xs font-bold`}>{c.tier}</span></td>
                  <td className="px-5 py-4 text-center font-bold text-slate-900">{c.orders}</td>
                  <td className="px-5 py-4 text-right font-bold text-emerald-600">{c.spent}</td>
                  <td className="px-5 py-4"><span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded">{c.favModule}</span></td>
                  <td className="px-5 py-4 text-slate-500 text-sm">{c.lastOrder}</td>
                  <td className="px-5 py-4 text-center"><div className="flex items-center justify-center gap-1"><button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors" title="View"><Eye className="w-4 h-4 text-slate-400" /></button><button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors" title="Email"><Mail className="w-4 h-4 text-slate-400" /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/50 text-sm text-slate-500">Showing {filtered.length} of {customers.length} customers</div>
      </div>
    </div>
  );
}
