'use client';

import React, { useState } from 'react';
import { UtensilsCrossed, TrendingUp, Users, Clock, Search, CheckCircle, XCircle, Eye, Edit, Ban, Star, MapPin, ShoppingBag, Timer } from 'lucide-react';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
const restaurants = [
  { id: 'RS-001', name: 'Burger King (Andheri)', location: 'Andheri West', rating: 4.5, cuisine: 'Fast Food', orders: 610, revenue: '₹3.1L', status: 'active', avgPrepTime: '18 min', deliveryTime: '28 min', joined: 'Mar 2025', tables: 24, avgOrderValue: '₹508' },
  { id: 'RS-002', name: 'Pizza Palace', location: 'Worli', rating: 4.7, cuisine: 'Italian', orders: 520, revenue: '₹2.6L', status: 'active', avgPrepTime: '22 min', deliveryTime: '32 min', joined: 'Jan 2025', tables: 16, avgOrderValue: '₹500' },
  { id: 'RS-003', name: 'Sushi Kingdom', location: 'Juhu', rating: 4.9, cuisine: 'Japanese', orders: 440, revenue: '₹3.8L', status: 'active', avgPrepTime: '25 min', deliveryTime: '35 min', joined: 'Dec 2024', tables: 12, avgOrderValue: '₹864' },
  { id: 'RS-004', name: 'Tandoori Nights', location: 'Colaba', rating: 4.6, cuisine: 'North Indian', orders: 380, revenue: '₹2.2L', status: 'active', avgPrepTime: '20 min', deliveryTime: '30 min', joined: 'Feb 2025', tables: 32, avgOrderValue: '₹579' },
  { id: 'RS-005', name: 'Dragon Wok', location: 'Bandra', rating: 4.3, cuisine: 'Chinese', orders: 290, revenue: '₹1.5L', status: 'active', avgPrepTime: '15 min', deliveryTime: '25 min', joined: 'Apr 2025', tables: 18, avgOrderValue: '₹517' },
  { id: 'RS-006', name: 'Dosa Plaza', location: 'Dadar', rating: 4.4, cuisine: 'South Indian', orders: 350, revenue: '₹1.3L', status: 'active', avgPrepTime: '12 min', deliveryTime: '22 min', joined: 'Jan 2025', tables: 20, avgOrderValue: '₹371' },
  { id: 'RS-007', name: 'Green Leaf Café', location: 'Lower Parel', rating: 4.1, cuisine: 'Continental', orders: 145, revenue: '₹0.8L', status: 'pending', avgPrepTime: '28 min', deliveryTime: '40 min', joined: 'Jun 2025', tables: 8, avgOrderValue: '₹552' },
  { id: 'RS-008', name: 'Spice Route', location: 'Fort', rating: 3.6, cuisine: 'Multi-Cuisine', orders: 65, revenue: '₹0.2L', status: 'suspended', avgPrepTime: '35 min', deliveryTime: '50 min', joined: 'May 2025', tables: 14, avgOrderValue: '₹308' },
];

const cuisineColors: Record<string, string> = {
  'Fast Food': 'bg-red-100 text-red-700', Italian: 'bg-green-100 text-green-700', Japanese: 'bg-pink-100 text-pink-700',
  'North Indian': 'bg-orange-100 text-orange-700', Chinese: 'bg-amber-100 text-amber-700', 'South Indian': 'bg-emerald-100 text-emerald-700',
  Continental: 'bg-blue-100 text-blue-700', 'Multi-Cuisine': 'bg-purple-100 text-purple-700',
};

const statusConfig: Record<string, { bg: string; icon: React.ReactNode; label: string }> = {
  active: { bg: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle className="w-3.5 h-3.5" />, label: 'Active' },
  pending: { bg: 'bg-amber-100 text-amber-700', icon: <Clock className="w-3.5 h-3.5" />, label: 'Pending' },
  suspended: { bg: 'bg-red-100 text-red-700', icon: <XCircle className="w-3.5 h-3.5" />, label: 'Suspended' },
};

export default function FranchiseRestaurantPage() {
  const [search, setSearch] = useState('');
  const [cuisineFilter, setCuisineFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [expandedRest, setExpandedRest] = useState<string | null>(null);

  const cuisines = ['All', ...Array.from(new Set(restaurants.map(r => r.cuisine)))];
  const filtered = restaurants.filter(r => {
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase()) || r.location.toLowerCase().includes(search.toLowerCase());
    const matchCuisine = cuisineFilter === 'All' || r.cuisine === cuisineFilter;
    const matchStatus = statusFilter === 'All' || r.status === statusFilter;
    return matchSearch && matchCuisine && matchStatus;
  });

  const activeCount = restaurants.filter(r => r.status === 'active').length;
  const totalOrders = restaurants.reduce((a, r) => a + r.orders, 0).toLocaleString();
  const avgPrepTime = Math.round(restaurants.filter(r => r.status === 'active').reduce((a, r) => a + parseInt(r.avgPrepTime), 0) / activeCount);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Restaurant Operations</h1>
        <p className="text-slate-500">Manage restaurant partners, monitor food orders, and track kitchen performance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { title: 'Active Restaurants', value: String(activeCount), icon: UtensilsCrossed, trend: '+3', color: 'bg-orange-50 text-orange-600' },
          { title: 'Total Orders (MTD)', value: totalOrders, icon: ShoppingBag, trend: '+22%', color: 'bg-blue-50 text-blue-600' },
          { title: 'Avg Prep Time', value: avgPrepTime + ' min', icon: Timer, trend: '-2 min', color: 'bg-emerald-50 text-emerald-600' },
          { title: 'Restaurant Revenue', value: '₹15.5L', icon: TrendingUp, trend: '+11%', color: 'bg-teal-50 text-teal-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-full ${stat.color} flex items-center justify-center`}><stat.icon className="w-5 h-5" /></div>
              <span className={`text-sm font-bold ${stat.trend.startsWith('+') || stat.trend.startsWith('-') ? 'text-green-600' : 'text-slate-500'}`}>{stat.trend}</span>
            </div>
            <p className="text-slate-500 text-sm font-medium">{stat.title}</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search restaurants..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white" />
        </div>
        <select value={cuisineFilter} onChange={(e) => setCuisineFilter(e.target.value)} className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
          {cuisines.map(c => <option key={c} value={c}>{c === 'All' ? 'All Cuisines' : c}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
          <option value="All">All Status</option><option value="active">Active</option><option value="pending">Pending</option><option value="suspended">Suspended</option>
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center"><h2 className="font-bold text-slate-900">Restaurant Directory</h2><span className="text-xs text-slate-400">{filtered.length} restaurants</span></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Restaurant</th><th className="px-5 py-3.5 font-semibold">Cuisine</th><th className="px-5 py-3.5 font-semibold text-center">Rating</th>
                <th className="px-5 py-3.5 font-semibold text-right">Orders</th><th className="px-5 py-3.5 font-semibold text-right">Revenue</th><th className="px-5 py-3.5 font-semibold text-center">Status</th><th className="px-5 py-3.5 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(r => (
                <React.Fragment key={r.id}>
                  <tr className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => setExpandedRest(expandedRest === r.id ? null : r.id)} tabIndex={0} onKeyDown={activateOnKey(() => setExpandedRest(expandedRest === r.id ? null : r.id))}>
                    <td className="px-5 py-4"><div className="flex items-center gap-3"><div className="w-9 h-9 bg-orange-50 rounded-lg flex items-center justify-center"><UtensilsCrossed className="w-4 h-4 text-orange-600" /></div><div><p className="font-bold text-slate-900">{r.name}</p><p className="text-xs text-slate-400">{r.id} • <MapPin className="w-3 h-3 inline" /> {r.location}</p></div></div></td>
                    <td className="px-5 py-4"><span className={`${cuisineColors[r.cuisine] || 'bg-slate-100 text-slate-700'} px-2.5 py-1 rounded-md text-xs font-bold`}>{r.cuisine}</span></td>
                    <td className="px-5 py-4 text-center"><span className="flex items-center gap-1 justify-center"><Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /><span className="font-bold">{r.rating}</span></span></td>
                    <td className="px-5 py-4 text-right font-bold text-slate-900">{r.orders}</td>
                    <td className="px-5 py-4 text-right font-bold text-emerald-600">{r.revenue}</td>
                    <td className="px-5 py-4 text-center"><span className={`${statusConfig[r.status].bg} px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1`}>{statusConfig[r.status].icon} {statusConfig[r.status].label}</span></td>
                    <td className="px-5 py-4 text-center"><div className="flex items-center justify-center gap-1"><button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors" title="View"><Eye className="w-4 h-4 text-slate-400" /></button><button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors" title="Edit"><Edit className="w-4 h-4 text-slate-400" /></button></div></td>
                  </tr>
                  {expandedRest === r.id && (
                    <tr className="bg-slate-50/80"><td colSpan={7} className="px-5 py-4">
                      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                        <div><p className="text-slate-400 text-xs font-medium mb-1">Prep Time</p><p className="font-bold text-slate-700">{r.avgPrepTime}</p></div>
                        <div><p className="text-slate-400 text-xs font-medium mb-1">Delivery Time</p><p className="font-bold text-slate-700">{r.deliveryTime}</p></div>
                        <div><p className="text-slate-400 text-xs font-medium mb-1">Tables</p><p className="font-bold text-slate-700">{r.tables}</p></div>
                        <div><p className="text-slate-400 text-xs font-medium mb-1">Avg Order Value</p><p className="font-bold text-teal-600">{r.avgOrderValue}</p></div>
                        <div><p className="text-slate-400 text-xs font-medium mb-1">Commission</p><p className="font-bold text-teal-600 text-lg">18%</p></div>
                        <div className="flex items-end gap-2">
                          {r.status === 'pending' && <button className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Approve</button>}
                          {r.status === 'active' && <button className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 border border-red-200"><Ban className="w-3.5 h-3.5" /> Suspend</button>}
                          {r.status === 'suspended' && <button className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 border border-emerald-200"><CheckCircle className="w-3.5 h-3.5" /> Reactivate</button>}
                        </div>
                      </div>
                    </td></tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/50 text-sm text-slate-500">Showing {filtered.length} of {restaurants.length} restaurants</div>
      </div>
    </div>
  );
}
