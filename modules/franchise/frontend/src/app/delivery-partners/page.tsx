'use client';

import React, { useState } from 'react';
import { Truck, TrendingUp, MapPin, Search, CheckCircle, Clock, XCircle, Eye, Star, Phone, Bike, Car, Ban } from 'lucide-react';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
const partners = [
  { id: 'DP-001', name: 'Suresh Kumar', phone: '+91 98765 43001', vehicle: 'Bike', zone: 'Colaba', status: 'online', rating: 4.8, deliveries: 1240, avgTime: '22 min', completionRate: '98%', todayDeliveries: 12, earnings: '₹2,450' },
  { id: 'DP-002', name: 'Mohammed Ali', phone: '+91 98765 43002', vehicle: 'Bike', zone: 'Bandra', status: 'online', rating: 4.6, deliveries: 890, avgTime: '25 min', completionRate: '96%', todayDeliveries: 8, earnings: '₹1,820' },
  { id: 'DP-003', name: 'Rajesh Patil', phone: '+91 98765 43003', vehicle: 'Car', zone: 'Andheri', status: 'on-delivery', rating: 4.9, deliveries: 2100, avgTime: '20 min', completionRate: '99%', todayDeliveries: 15, earnings: '₹3,100' },
  { id: 'DP-004', name: 'Deepak Sharma', phone: '+91 98765 43004', vehicle: 'Bike', zone: 'Dadar', status: 'online', rating: 4.5, deliveries: 3200, avgTime: '18 min', completionRate: '97%', todayDeliveries: 22, earnings: '₹1,980' },
  { id: 'DP-005', name: 'Vikram Singh', phone: '+91 98765 43005', vehicle: 'Car', zone: 'Worli', status: 'offline', rating: 4.3, deliveries: 560, avgTime: '28 min', completionRate: '94%', todayDeliveries: 0, earnings: '₹0' },
  { id: 'DP-006', name: 'Anil Verma', phone: '+91 98765 43006', vehicle: 'Bike', zone: 'Juhu', status: 'on-delivery', rating: 4.7, deliveries: 1450, avgTime: '21 min', completionRate: '98%', todayDeliveries: 10, earnings: '₹2,200' },
  { id: 'DP-007', name: 'Prakash Jadhav', phone: '+91 98765 43007', vehicle: 'Bike', zone: 'Fort', status: 'suspended', rating: 3.2, deliveries: 180, avgTime: '38 min', completionRate: '82%', todayDeliveries: 0, earnings: '₹0' },
  { id: 'DP-008', name: 'Amit Deshmukh', phone: '+91 98765 43008', vehicle: 'Bike', zone: 'Lower Parel', status: 'online', rating: 4.4, deliveries: 780, avgTime: '24 min', completionRate: '95%', todayDeliveries: 6, earnings: '₹1,350' },
  { id: 'DP-009', name: 'Rohit Gaikwad', phone: '+91 98765 43009', vehicle: 'Car', zone: 'Dadar', status: 'online', rating: 4.6, deliveries: 920, avgTime: '19 min', completionRate: '97%', todayDeliveries: 9, earnings: '₹2,800' },
  { id: 'DP-010', name: 'Santosh Yadav', phone: '+91 98765 43010', vehicle: 'Bike', zone: 'Bandra', status: 'pending', rating: 0, deliveries: 0, avgTime: '-', completionRate: '-', todayDeliveries: 0, earnings: '₹0' },
];

const statusConfig: Record<string, { bg: string; dot: string; label: string }> = {
  online: { bg: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', label: 'Online' },
  'on-delivery': { bg: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500', label: 'On Delivery' },
  offline: { bg: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400', label: 'Offline' },
  suspended: { bg: 'bg-red-100 text-red-700', dot: 'bg-red-500', label: 'Suspended' },
  pending: { bg: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500', label: 'Pending Approval' },
};

export default function FranchiseDeliveryPartnersPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [expandedPartner, setExpandedPartner] = useState<string | null>(null);

  const filtered = partners.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.zone.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const onlineCount = partners.filter(p => p.status === 'online' || p.status === 'on-delivery').length;
  const todayDeliveries = partners.reduce((a, p) => a + p.todayDeliveries, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Delivery Partners</h1>
        <p className="text-slate-500">Manage delivery fleet, track partner performance, and monitor assignments.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { title: 'Partners Online', value: String(onlineCount), icon: Truck, trend: '+5', color: 'bg-emerald-50 text-emerald-600' },
          { title: 'Today Deliveries', value: String(todayDeliveries), icon: MapPin, trend: '+22%', color: 'bg-blue-50 text-blue-600' },
          { title: 'Avg Delivery Time', value: '23 min', icon: Clock, trend: '-2 min', color: 'bg-orange-50 text-orange-600' },
          { title: 'Avg Rating', value: '4.5', icon: Star, trend: '+0.1', color: 'bg-amber-50 text-amber-600' },
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
          <input type="text" placeholder="Search partners..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
          <option value="All">All Status</option><option value="online">Online</option><option value="on-delivery">On Delivery</option><option value="offline">Offline</option><option value="pending">Pending</option><option value="suspended">Suspended</option>
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center"><h2 className="font-bold text-slate-900">Delivery Fleet</h2><span className="text-xs text-slate-400">{filtered.length} partners</span></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Partner</th><th className="px-5 py-3.5 font-semibold">Vehicle</th><th className="px-5 py-3.5 font-semibold">Zone</th>
                <th className="px-5 py-3.5 font-semibold text-center">Rating</th><th className="px-5 py-3.5 font-semibold text-right">Today</th><th className="px-5 py-3.5 font-semibold text-right">Earnings</th><th className="px-5 py-3.5 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(p => (
                <React.Fragment key={p.id}>
                  <tr className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => setExpandedPartner(expandedPartner === p.id ? null : p.id)} tabIndex={0} onKeyDown={activateOnKey(() => setExpandedPartner(expandedPartner === p.id ? null : p.id))}>
                    <td className="px-5 py-4"><div className="flex items-center gap-3"><div className="w-9 h-9 bg-blue-50 rounded-full flex items-center justify-center relative"><Truck className="w-4 h-4 text-blue-600" /><span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${statusConfig[p.status].dot} rounded-full border-2 border-white`} /></div><div><p className="font-bold text-slate-900">{p.name}</p><p className="text-xs text-slate-400">{p.id}</p></div></div></td>
                    <td className="px-5 py-4"><span className={`${p.vehicle === 'Bike' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'} px-2.5 py-1 rounded-md text-xs font-bold inline-flex items-center gap-1`}>{p.vehicle === 'Bike' ? <Bike className="w-3 h-3" /> : <Car className="w-3 h-3" />} {p.vehicle}</span></td>
                    <td className="px-5 py-4"><span className="flex items-center gap-1 text-slate-600"><MapPin className="w-3.5 h-3.5" />{p.zone}</span></td>
                    <td className="px-5 py-4 text-center">{p.rating > 0 ? <span className="flex items-center gap-1 justify-center"><Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /><span className="font-bold">{p.rating}</span></span> : <span className="text-slate-400">—</span>}</td>
                    <td className="px-5 py-4 text-right font-bold text-slate-900">{p.todayDeliveries}</td>
                    <td className="px-5 py-4 text-right font-bold text-emerald-600">{p.earnings}</td>
                    <td className="px-5 py-4 text-center"><span className={`${statusConfig[p.status].bg} px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5`}><span className={`w-1.5 h-1.5 rounded-full ${statusConfig[p.status].dot} ${p.status === 'online' || p.status === 'on-delivery' ? 'animate-pulse' : ''}`} />{statusConfig[p.status].label}</span></td>
                  </tr>
                  {expandedPartner === p.id && (
                    <tr className="bg-slate-50/80"><td colSpan={7} className="px-5 py-4">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                        <div><p className="text-slate-400 text-xs font-medium mb-1">Phone</p><p className="font-bold text-slate-700 flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{p.phone}</p></div>
                        <div><p className="text-slate-400 text-xs font-medium mb-1">Total Deliveries</p><p className="font-bold text-slate-700">{p.deliveries.toLocaleString()}</p></div>
                        <div><p className="text-slate-400 text-xs font-medium mb-1">Avg Time</p><p className="font-bold text-slate-700">{p.avgTime}</p></div>
                        <div><p className="text-slate-400 text-xs font-medium mb-1">Completion Rate</p><p className={`font-bold ${p.completionRate !== '-' && parseInt(p.completionRate) >= 95 ? 'text-emerald-600' : 'text-red-600'}`}>{p.completionRate}</p></div>
                        <div className="flex items-end gap-2">
                          {p.status === 'pending' && <button className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Approve</button>}
                          {(p.status === 'online' || p.status === 'offline') && <button className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 border border-red-200"><Ban className="w-3.5 h-3.5" /> Suspend</button>}
                          {p.status === 'suspended' && <button className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 border border-emerald-200"><CheckCircle className="w-3.5 h-3.5" /> Reactivate</button>}
                        </div>
                      </div>
                    </td></tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/50 text-sm text-slate-500">Showing {filtered.length} of {partners.length} partners</div>
      </div>
    </div>
  );
}
