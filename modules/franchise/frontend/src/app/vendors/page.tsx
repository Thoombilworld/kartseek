'use client';

import React, { useState } from 'react';
import { Store, Search, Filter, Star, MapPin, Phone, Mail, MoreVertical, CheckCircle, XCircle, Clock, TrendingUp, ShoppingBag, ChevronDown, Eye, Edit, Ban } from 'lucide-react';
import Link from 'next/link';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
const vendors = [
  { id: 'V-001', name: 'City Supermart', category: 'Grocery', location: 'Colaba', rating: 4.8, orders: 842, revenue: '₹4.2L', status: 'active', phone: '+91 98765 43210', email: 'city@supermart.in', joinDate: 'Jan 2025', commission: '12%', pendingPayout: '₹18,400' },
  { id: 'V-002', name: 'Burger King (Andheri)', category: 'Restaurant', location: 'Andheri West', rating: 4.5, orders: 610, revenue: '₹3.1L', status: 'active', phone: '+91 98765 43211', email: 'andheri@burgerking.in', joinDate: 'Mar 2025', commission: '18%', pendingPayout: '₹24,200' },
  { id: 'V-003', name: 'MedPlus Pharmacy', category: 'Pharmacy', location: 'Bandra', rating: 4.6, orders: 380, revenue: '₹1.8L', status: 'active', phone: '+91 98765 43212', email: 'bandra@medplus.in', joinDate: 'Feb 2025', commission: '10%', pendingPayout: '₹8,900' },
  { id: 'V-004', name: 'Fresh Farm Organics', category: 'Grocery', location: 'Dadar', rating: 4.3, orders: 290, revenue: '₹1.4L', status: 'active', phone: '+91 98765 43213', email: 'info@freshfarm.in', joinDate: 'Apr 2025', commission: '12%', pendingPayout: '₹6,700' },
  { id: 'V-005', name: 'Pizza Palace', category: 'Restaurant', location: 'Worli', rating: 4.7, orders: 520, revenue: '₹2.6L', status: 'active', phone: '+91 98765 43214', email: 'worli@pizzapalace.in', joinDate: 'Jan 2025', commission: '18%', pendingPayout: '₹15,300' },
  { id: 'V-006', name: 'QuickMart Express', category: 'Grocery', location: 'Lower Parel', rating: 4.1, orders: 180, revenue: '₹0.9L', status: 'pending', phone: '+91 98765 43215', email: 'quick@mart.in', joinDate: 'May 2025', commission: '12%', pendingPayout: '₹0' },
  { id: 'V-007', name: 'Sushi Kingdom', category: 'Restaurant', location: 'Juhu', rating: 4.9, orders: 440, revenue: '₹3.8L', status: 'active', phone: '+91 98765 43216', email: 'juhu@sushikingdom.in', joinDate: 'Dec 2024', commission: '18%', pendingPayout: '₹21,100' },
  { id: 'V-008', name: 'HealthFirst Pharmacy', category: 'Pharmacy', location: 'Tardeo', rating: 3.9, orders: 95, revenue: '₹0.4L', status: 'suspended', phone: '+91 98765 43217', email: 'info@healthfirst.in', joinDate: 'Mar 2025', commission: '10%', pendingPayout: '₹2,300' },
];

const categoryColors: Record<string, string> = {
  Grocery: 'bg-green-100 text-green-700',
  Restaurant: 'bg-orange-100 text-orange-700',
  Pharmacy: 'bg-cyan-100 text-cyan-700',
};

const statusConfig: Record<string, { bg: string; icon: React.ReactNode; label: string }> = {
  active: { bg: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle className="w-3.5 h-3.5" />, label: 'Active' },
  pending: { bg: 'bg-amber-100 text-amber-700', icon: <Clock className="w-3.5 h-3.5" />, label: 'Pending' },
  suspended: { bg: 'bg-red-100 text-red-700', icon: <XCircle className="w-3.5 h-3.5" />, label: 'Suspended' },
};

export default function LocalVendorsPage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [expandedVendor, setExpandedVendor] = useState<string | null>(null);

  const filtered = vendors.filter(v => {
    const matchSearch = v.name.toLowerCase().includes(search.toLowerCase()) || v.location.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'All' || v.category === categoryFilter;
    const matchStatus = statusFilter === 'All' || v.status === statusFilter;
    return matchSearch && matchCat && matchStatus;
  });

  const activeCount = vendors.filter(v => v.status === 'active').length;
  const pendingCount = vendors.filter(v => v.status === 'pending').length;
  const suspendedCount = vendors.filter(v => v.status === 'suspended').length;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Local Vendors</h1>
          <p className="text-slate-500 text-sm">Manage and monitor all vendors in your franchise region.</p>
        </div>
        <Link href="/vendors/new" className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 shadow-sm">
          <Store className="w-4 h-4" /> Onboard New Vendor
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center"><CheckCircle className="w-5 h-5" /></div>
            <div>
              <p className="text-2xl font-black text-slate-900">{activeCount}</p>
              <p className="text-xs text-slate-500 font-medium">Active Vendors</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center"><Clock className="w-5 h-5" /></div>
            <div>
              <p className="text-2xl font-black text-slate-900">{pendingCount}</p>
              <p className="text-xs text-slate-500 font-medium">Pending Approval</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-50 text-red-600 rounded-lg flex items-center justify-center"><Ban className="w-5 h-5" /></div>
            <div>
              <p className="text-2xl font-black text-slate-900">{suspendedCount}</p>
              <p className="text-xs text-slate-500 font-medium">Suspended</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search vendors by name or location..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white" />
        </div>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
          <option value="All">All Categories</option>
          <option value="Grocery">Grocery</option>
          <option value="Restaurant">Restaurant</option>
          <option value="Pharmacy">Pharmacy</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
          <option value="All">All Status</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Vendor Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Vendor</th>
                <th className="px-5 py-3.5 font-semibold">Category</th>
                <th className="px-5 py-3.5 font-semibold">Location</th>
                <th className="px-5 py-3.5 font-semibold text-center">Rating</th>
                <th className="px-5 py-3.5 font-semibold text-right">Orders (MTD)</th>
                <th className="px-5 py-3.5 font-semibold text-right">Revenue</th>
                <th className="px-5 py-3.5 font-semibold text-center">Status</th>
                <th className="px-5 py-3.5 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((v) => (
                <React.Fragment key={v.id}>
                  <tr className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => setExpandedVendor(expandedVendor === v.id ? null : v.id)} tabIndex={0} onKeyDown={activateOnKey(() => setExpandedVendor(expandedVendor === v.id ? null : v.id))}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center"><Store className="w-4 h-4 text-slate-500" /></div>
                        <div>
                          <p className="font-bold text-slate-900">{v.name}</p>
                          <p className="text-xs text-slate-400">{v.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4"><span className={`${categoryColors[v.category]} px-2.5 py-1 rounded-md text-xs font-bold`}>{v.category}</span></td>
                    <td className="px-5 py-4"><span className="flex items-center gap-1 text-slate-600"><MapPin className="w-3.5 h-3.5" />{v.location}</span></td>
                    <td className="px-5 py-4 text-center"><span className="flex items-center gap-1 justify-center"><Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /><span className="font-bold">{v.rating}</span></span></td>
                    <td className="px-5 py-4 text-right font-bold text-slate-900">{v.orders}</td>
                    <td className="px-5 py-4 text-right font-bold text-slate-900">{v.revenue}</td>
                    <td className="px-5 py-4 text-center">
                      <span className={`${statusConfig[v.status].bg} px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1`}>
                        {statusConfig[v.status].icon} {statusConfig[v.status].label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors" title="View"><Eye className="w-4 h-4 text-slate-400" /></button>
                        <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors" title="Edit"><Edit className="w-4 h-4 text-slate-400" /></button>
                      </div>
                    </td>
                  </tr>
                  {expandedVendor === v.id && (
                    <tr className="bg-slate-50/80">
                      <td colSpan={8} className="px-5 py-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div><p className="text-slate-400 text-xs font-medium mb-1">Contact</p><p className="flex items-center gap-1 text-slate-700"><Phone className="w-3.5 h-3.5" />{v.phone}</p><p className="flex items-center gap-1 text-slate-700 mt-1"><Mail className="w-3.5 h-3.5" />{v.email}</p></div>
                          <div><p className="text-slate-400 text-xs font-medium mb-1">Joined</p><p className="font-bold text-slate-700">{v.joinDate}</p></div>
                          <div><p className="text-slate-400 text-xs font-medium mb-1">Commission Rate</p><p className="font-bold text-teal-600 text-lg">{v.commission}</p></div>
                          <div><p className="text-slate-400 text-xs font-medium mb-1">Pending Payout</p><p className="font-bold text-slate-900 text-lg">{v.pendingPayout}</p></div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/50 text-sm text-slate-500">
          Showing {filtered.length} of {vendors.length} vendors
        </div>
      </div>

    </div>
  );
}
