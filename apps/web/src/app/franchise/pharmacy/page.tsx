'use client';

import React, { useState } from 'react';
import { Pill, TrendingUp, Users, ShoppingBag, Search, CheckCircle, Clock, XCircle, Eye, Edit, Ban, Star, MapPin, ShieldCheck, AlertTriangle } from 'lucide-react';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
const pharmacies = [
  { id: 'PH-001', name: 'MedPlus Pharmacy', location: 'Bandra', rating: 4.6, orders: 380, revenue: '₹1.8L', status: 'active', license: 'verified', products: 3200, deliveryTime: '32 min', joined: 'Feb 2025', compliance: 'compliant' },
  { id: 'PH-002', name: 'Apollo Pharmacy', location: 'Colaba', rating: 4.8, orders: 520, revenue: '₹2.9L', status: 'active', license: 'verified', products: 4500, deliveryTime: '28 min', joined: 'Jan 2025', compliance: 'compliant' },
  { id: 'PH-003', name: 'HealthFirst Pharmacy', location: 'Tardeo', rating: 3.9, orders: 95, revenue: '₹0.4L', status: 'suspended', license: 'expired', products: 1800, deliveryTime: '45 min', joined: 'Mar 2025', compliance: 'non-compliant' },
  { id: 'PH-004', name: 'NetMeds Express', location: 'Andheri West', rating: 4.4, orders: 290, revenue: '₹1.3L', status: 'active', license: 'verified', products: 2800, deliveryTime: '35 min', joined: 'Mar 2025', compliance: 'compliant' },
  { id: 'PH-005', name: 'PharmEasy Store', location: 'Worli', rating: 4.2, orders: 210, revenue: '₹0.9L', status: 'active', license: 'verified', products: 2100, deliveryTime: '30 min', joined: 'Apr 2025', compliance: 'under-review' },
  { id: 'PH-006', name: 'Wellness Forever', location: 'Dadar', rating: 4.5, orders: 340, revenue: '₹1.6L', status: 'active', license: 'verified', products: 3800, deliveryTime: '25 min', joined: 'Dec 2024', compliance: 'compliant' },
  { id: 'PH-007', name: 'Care Chemist', location: 'Lower Parel', rating: 4.0, orders: 120, revenue: '₹0.5L', status: 'pending', license: 'pending', products: 900, deliveryTime: '40 min', joined: 'Jun 2025', compliance: 'under-review' },
];

const statusConfig: Record<string, { bg: string; icon: React.ReactNode; label: string }> = {
  active: { bg: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle className="w-3.5 h-3.5" />, label: 'Active' },
  pending: { bg: 'bg-amber-100 text-amber-700', icon: <Clock className="w-3.5 h-3.5" />, label: 'Pending' },
  suspended: { bg: 'bg-red-100 text-red-700', icon: <XCircle className="w-3.5 h-3.5" />, label: 'Suspended' },
};

const licenseColors: Record<string, string> = {
  verified: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  expired: 'bg-red-50 text-red-700 border-red-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
};

const complianceConfig: Record<string, { bg: string; icon: React.ReactNode; label: string }> = {
  'compliant': { bg: 'bg-emerald-50 text-emerald-700', icon: <ShieldCheck className="w-3.5 h-3.5" />, label: 'Compliant' },
  'non-compliant': { bg: 'bg-red-50 text-red-700', icon: <AlertTriangle className="w-3.5 h-3.5" />, label: 'Non-Compliant' },
  'under-review': { bg: 'bg-amber-50 text-amber-700', icon: <Clock className="w-3.5 h-3.5" />, label: 'Under Review' },
};

export default function FranchisePharmacyPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [expandedPharmacy, setExpandedPharmacy] = useState<string | null>(null);

  const filtered = pharmacies.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.location.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const activeCount = pharmacies.filter(p => p.status === 'active').length;
  const totalOrders = pharmacies.reduce((a, p) => a + p.orders, 0).toLocaleString();
  const complianceRate = Math.round((pharmacies.filter(p => p.compliance === 'compliant').length / pharmacies.length) * 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pharmacy Operations</h1>
        <p className="text-slate-500">Manage pharmacies, monitor compliance, and track medical sales in your franchise region.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { title: 'Active Pharmacies', value: String(activeCount), icon: Pill, trend: '+5%', color: 'bg-cyan-50 text-cyan-600' },
          { title: 'Pending Approvals', value: String(pharmacies.filter(p => p.status === 'pending').length), icon: Users, trend: '0', color: 'bg-amber-50 text-amber-600' },
          { title: 'Total Orders (MTD)', value: totalOrders, icon: ShoppingBag, trend: '+12%', color: 'bg-blue-50 text-blue-600' },
          { title: 'Compliance Rate', value: complianceRate + '%', icon: ShieldCheck, trend: complianceRate >= 80 ? '+2%' : '-3%', color: 'bg-emerald-50 text-emerald-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 rounded-full ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <span className={`text-sm font-bold ${stat.trend.startsWith('+') ? 'text-green-600' : stat.trend.startsWith('-') ? 'text-red-500' : 'text-slate-500'}`}>
                {stat.trend}
              </span>
            </div>
            <p className="text-slate-500 text-sm font-medium">{stat.title}</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</h3>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search pharmacies by name or location..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
          <option value="All">All Status</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Pharmacy Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
          <h2 className="font-bold text-slate-900">Pharmacy Directory</h2>
          <span className="text-xs text-slate-400 font-medium">{filtered.length} pharmacies</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Pharmacy</th>
                <th className="px-5 py-3.5 font-semibold">Location</th>
                <th className="px-5 py-3.5 font-semibold text-center">License</th>
                <th className="px-5 py-3.5 font-semibold text-center">Compliance</th>
                <th className="px-5 py-3.5 font-semibold text-right">Orders</th>
                <th className="px-5 py-3.5 font-semibold text-right">Revenue</th>
                <th className="px-5 py-3.5 font-semibold text-center">Status</th>
                <th className="px-5 py-3.5 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((p) => (
                <React.Fragment key={p.id}>
                  <tr className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => setExpandedPharmacy(expandedPharmacy === p.id ? null : p.id)} tabIndex={0} onKeyDown={activateOnKey(() => setExpandedPharmacy(expandedPharmacy === p.id ? null : p.id))}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-cyan-50 rounded-lg flex items-center justify-center">
                          <Pill className="w-4 h-4 text-cyan-600" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{p.name}</p>
                          <p className="text-xs text-slate-400">{p.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4"><span className="flex items-center gap-1 text-slate-600"><MapPin className="w-3.5 h-3.5" />{p.location}</span></td>
                    <td className="px-5 py-4 text-center"><span className={`${licenseColors[p.license]} border px-2.5 py-1 rounded-md text-xs font-bold capitalize`}>{p.license}</span></td>
                    <td className="px-5 py-4 text-center">
                      <span className={`${complianceConfig[p.compliance].bg} px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1`}>
                        {complianceConfig[p.compliance].icon} {complianceConfig[p.compliance].label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right font-bold text-slate-900">{p.orders}</td>
                    <td className="px-5 py-4 text-right font-bold text-emerald-600">{p.revenue}</td>
                    <td className="px-5 py-4 text-center">
                      <span className={`${statusConfig[p.status].bg} px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1`}>
                        {statusConfig[p.status].icon} {statusConfig[p.status].label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors" title="View"><Eye className="w-4 h-4 text-slate-400" /></button>
                        <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors" title="Edit"><Edit className="w-4 h-4 text-slate-400" /></button>
                      </div>
                    </td>
                  </tr>
                  {expandedPharmacy === p.id && (
                    <tr className="bg-slate-50/80">
                      <td colSpan={8} className="px-5 py-4">
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-sm">
                          <div><p className="text-slate-400 text-xs font-medium mb-1">Rating</p><p className="font-bold text-slate-700 flex items-center gap-1"><Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />{p.rating}</p></div>
                          <div><p className="text-slate-400 text-xs font-medium mb-1">Products Listed</p><p className="font-bold text-slate-700">{p.products.toLocaleString()}</p></div>
                          <div><p className="text-slate-400 text-xs font-medium mb-1">Avg Delivery</p><p className="font-bold text-slate-700">{p.deliveryTime}</p></div>
                          <div><p className="text-slate-400 text-xs font-medium mb-1">Commission Rate</p><p className="font-bold text-teal-600 text-lg">10%</p></div>
                          <div className="flex items-end gap-2">
                            {p.status === 'pending' && (
                              <button className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Approve</button>
                            )}
                            {p.status === 'active' && (
                              <button className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 border border-red-200"><Ban className="w-3.5 h-3.5" /> Suspend</button>
                            )}
                            {p.status === 'suspended' && (
                              <button className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 border border-emerald-200"><CheckCircle className="w-3.5 h-3.5" /> Reactivate</button>
                            )}
                          </div>
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
          Showing {filtered.length} of {pharmacies.length} pharmacies
        </div>
      </div>
    </div>
  );
}
