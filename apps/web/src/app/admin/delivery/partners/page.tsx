'use client';
import React, { useState } from 'react';
import { Truck, Search, Star, FileCheck, Eye, Ban, CheckCircle, Clock, XCircle, ChevronDown, ChevronUp, DollarSign, Users, Shield, MapPin, Phone, Package, AlertTriangle } from 'lucide-react';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
type DeliveryPartner = {
  id: string; name: string; phone: string; email: string; city: string; zone: string;
  vehicleType: 'Bike' | 'Scooter' | 'Van' | 'Bicycle'; vehicleNumber: string;
  rating: number; totalDeliveries: number; todayDeliveries: number; earnings: string;
  codBalance: number; status: 'online' | 'on-delivery' | 'offline' | 'suspended' | 'pending';
  kycStatus: 'approved' | 'under_review' | 'not_submitted' | 'rejected' | 'expired';
  joinDate: string; acceptanceRate: number; avgDeliveryTime: string;
  serviceTypes: string[];
};

const partners: DeliveryPartner[] = [
  { id: 'DEL-001', name: 'Ravi Kumar', phone: '+91 98765 43210', email: 'ravi@mail.com', city: 'Mumbai', zone: 'Colaba', vehicleType: 'Bike', vehicleNumber: 'MH02AB1234', rating: 4.8, totalDeliveries: 1240, todayDeliveries: 8, earnings: '₹42,000', codBalance: 3200, status: 'online', kycStatus: 'approved', joinDate: 'Jan 2025', acceptanceRate: 96, avgDeliveryTime: '22 min', serviceTypes: ['marketplace', 'grocery', 'restaurant'] },
  { id: 'DEL-002', name: 'Suresh M.', phone: '+91 98765 43212', email: 'suresh@mail.com', city: 'Bangalore', zone: 'Koramangala', vehicleType: 'Scooter', vehicleNumber: 'KA01EF9012', rating: 4.7, totalDeliveries: 1560, todayDeliveries: 11, earnings: '₹52,000', codBalance: 5400, status: 'on-delivery', kycStatus: 'approved', joinDate: 'Dec 2024', acceptanceRate: 98, avgDeliveryTime: '18 min', serviceTypes: ['marketplace', 'grocery', 'pharmacy'] },
  { id: 'DEL-003', name: 'James Mwangi', phone: '+91 712 345678', email: 'james@mail.com', city: 'Mumbai', zone: 'Westlands', vehicleType: 'Bike', vehicleNumber: 'KCY 123A', rating: 4.5, totalDeliveries: 890, todayDeliveries: 6, earnings: '38,000', codBalance: 12000, status: 'online', kycStatus: 'approved', joinDate: 'Mar 2025', acceptanceRate: 92, avgDeliveryTime: '25 min', serviceTypes: ['marketplace', 'grocery', 'restaurant', 'pharmacy'] },
  { id: 'DEL-004', name: 'Ahmed H.', phone: '+971 55 123 4567', email: 'ahmed@mail.com', city: 'Dubai', zone: 'Marina', vehicleType: 'Van', vehicleNumber: 'DXB-V-4567', rating: 4.9, totalDeliveries: 2100, todayDeliveries: 14, earnings: 'AED 8,500', codBalance: 0, status: 'online', kycStatus: 'approved', joinDate: 'Nov 2024', acceptanceRate: 99, avgDeliveryTime: '20 min', serviceTypes: ['marketplace', 'grocery'] },
  { id: 'DEL-005', name: 'Prakash B.', phone: '+91 98765 43214', email: 'prakash@mail.com', city: 'Hyderabad', zone: 'Hitech City', vehicleType: 'Bike', vehicleNumber: 'AP10KL2345', rating: 3.9, totalDeliveries: 210, todayDeliveries: 0, earnings: '₹8,400', codBalance: 0, status: 'suspended', kycStatus: 'expired', joinDate: 'Apr 2025', acceptanceRate: 65, avgDeliveryTime: '35 min', serviceTypes: ['marketplace'] },
  { id: 'DEL-006', name: 'Naveen P.', phone: '+91 98765 43216', email: 'naveen@mail.com', city: 'Pune', zone: 'Hinjewadi', vehicleType: 'Bicycle', vehicleNumber: 'N/A', rating: 0, totalDeliveries: 0, todayDeliveries: 0, earnings: '₹0', codBalance: 0, status: 'pending', kycStatus: 'under_review', joinDate: 'Jun 2026', acceptanceRate: 0, avgDeliveryTime: '-', serviceTypes: ['grocery', 'pharmacy'] },
  { id: 'DEL-007', name: 'Fatima O.', phone: '+234 801 234567', email: 'fatima@mail.com', city: 'Lagos', zone: 'Victoria Island', vehicleType: 'Scooter', vehicleNumber: 'LAG-SC-789', rating: 0, totalDeliveries: 0, todayDeliveries: 0, earnings: '₦0', codBalance: 0, status: 'pending', kycStatus: 'not_submitted', joinDate: 'Jul 2026', acceptanceRate: 0, avgDeliveryTime: '-', serviceTypes: [] },
];

const statusColors: Record<string, string> = {
  online: 'bg-emerald-100 text-emerald-700', 'on-delivery': 'bg-blue-100 text-blue-700',
  offline: 'bg-slate-100 text-slate-600', suspended: 'bg-red-100 text-red-700',
  pending: 'bg-amber-100 text-amber-700',
};
const kycColors: Record<string, string> = {
  approved: 'bg-emerald-100 text-emerald-700', under_review: 'bg-amber-100 text-amber-700',
  not_submitted: 'bg-slate-100 text-slate-500', rejected: 'bg-red-100 text-red-700',
  expired: 'bg-red-100 text-red-700',
};
const serviceLabels: Record<string, string> = {
  marketplace: '🛒', grocery: '🥬', restaurant: '🍽️', pharmacy: '💊',
};

export default function DeliveryPartnersPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [expanded, setExpanded] = useState<string | null>(null);

  const online = partners.filter(p => p.status === 'online' || p.status === 'on-delivery').length;
  const pendingKyc = partners.filter(p => p.kycStatus === 'under_review' || p.kycStatus === 'not_submitted').length;
  const totalCod = partners.reduce((sum, p) => sum + p.codBalance, 0);
  const todayTotal = partners.reduce((sum, p) => sum + p.todayDeliveries, 0);

  const filtered = partners.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase()) || p.city.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Truck className="w-7 h-7 text-violet-500" /> Delivery Partners
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage delivery partner onboarding, KYC, zones, and performance</p>
        </div>
        <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-bold">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> {online} Online
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-linear-to-br from-violet-500 to-violet-600 p-4 rounded-xl shadow-md text-white">
          <Users className="w-5 h-5 opacity-80" /><p className="text-2xl font-black mt-2">{partners.length}</p><p className="text-xs font-medium opacity-80">Total Partners</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <Package className="w-5 h-5 text-blue-500" /><p className="text-2xl font-black text-slate-900 mt-2">{todayTotal}</p><p className="text-xs text-slate-500 font-medium">Today&apos;s Deliveries</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <DollarSign className="w-5 h-5 text-emerald-500" /><p className="text-2xl font-black text-slate-900 mt-2">₹{totalCod.toLocaleString()}</p><p className="text-xs text-slate-500 font-medium">COD Balance</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <Star className="w-5 h-5 text-amber-500" /><p className="text-2xl font-black text-slate-900 mt-2">4.6</p><p className="text-xs text-slate-500 font-medium">Avg Rating</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-orange-500" /><p className="text-2xl font-black text-slate-900 mt-2">{pendingKyc}</p><p className="text-xs text-slate-500 font-medium">Pending KYC</p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, ID, or city..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400" />
        </div>
        <div className="flex gap-2">
          {['All', 'online', 'on-delivery', 'offline', 'pending', 'suspended'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 text-xs font-semibold rounded-full transition-all ${statusFilter === s ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {s === 'All' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1).replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-5 py-3 font-semibold text-slate-600">Partner</th>
              <th className="text-left px-5 py-3 font-semibold text-slate-600">Zone</th>
              <th className="text-left px-5 py-3 font-semibold text-slate-600">Vehicle</th>
              <th className="text-left px-5 py-3 font-semibold text-slate-600">Services</th>
              <th className="text-center px-5 py-3 font-semibold text-slate-600">Rating</th>
              <th className="text-center px-5 py-3 font-semibold text-slate-600">Deliveries</th>
              <th className="text-left px-5 py-3 font-semibold text-slate-600">KYC</th>
              <th className="text-left px-5 py-3 font-semibold text-slate-600">Status</th>
              <th className="text-center px-5 py-3 font-semibold text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <React.Fragment key={p.id}>
                <tr className="border-b border-slate-100 hover:bg-slate-50/80 cursor-pointer transition-colors"
                  onClick={() => setExpanded(expanded === p.id ? null : p.id)} tabIndex={0} onKeyDown={activateOnKey(() => setExpanded(expanded === p.id ? null : p.id))}>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-900">{p.name}</p>
                    <p className="text-xs text-slate-400 font-mono">{p.id}</p>
                  </td>
                  <td className="px-5 py-4 text-slate-700">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400" /> {p.zone}, {p.city}</span>
                  </td>
                  <td className="px-5 py-4 text-slate-700">{p.vehicleType}<span className="text-xs text-slate-400 ml-1">{p.vehicleNumber}</span></td>
                  <td className="px-5 py-4">
                    <div className="flex gap-1">{p.serviceTypes.map(s => <span key={s} title={s} className="text-base">{serviceLabels[s]}</span>)}</div>
                  </td>
                  <td className="px-5 py-4 text-center">
                    {p.rating > 0 ? <span className="flex items-center justify-center gap-1 font-bold text-amber-600"><Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />{p.rating}</span> : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-5 py-4 text-center font-bold text-slate-900">{p.totalDeliveries.toLocaleString()}</td>
                  <td className="px-5 py-4"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${kycColors[p.kycStatus]}`}>{p.kycStatus.replace('_', ' ')}</span></td>
                  <td className="px-5 py-4"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColors[p.status]}`}>{p.status.replace('-', ' ')}</span></td>
                  <td className="px-5 py-4 text-center">{expanded === p.id ? <ChevronUp className="w-4 h-4 text-slate-400 inline" /> : <ChevronDown className="w-4 h-4 text-slate-400 inline" />}</td>
                </tr>
                {expanded === p.id && (
                  <tr className="bg-slate-50/80">
                    <td colSpan={9} className="px-5 py-5">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                        <div><p className="text-xs text-slate-400">Phone</p><p className="text-sm font-semibold text-slate-800 flex items-center gap-1"><Phone className="w-3 h-3" />{p.phone}</p></div>
                        <div><p className="text-xs text-slate-400">Today</p><p className="text-sm font-semibold text-slate-800">{p.todayDeliveries} deliveries</p></div>
                        <div><p className="text-xs text-slate-400">Acceptance Rate</p><p className="text-sm font-semibold text-slate-800">{p.acceptanceRate}%</p></div>
                        <div><p className="text-xs text-slate-400">Avg Time</p><p className="text-sm font-semibold text-slate-800">{p.avgDeliveryTime}</p></div>
                        <div><p className="text-xs text-slate-400">COD Balance</p><p className="text-sm font-semibold text-slate-800">₹{p.codBalance.toLocaleString()}</p></div>
                      </div>
                      <div className="flex items-center gap-2">
                        {p.kycStatus === 'under_review' && <button className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-700 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Approve KYC</button>}
                        {p.kycStatus === 'under_review' && <button className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-600 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Reject</button>}
                        {p.status === 'pending' && <button className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Activate</button>}
                        {p.status !== 'suspended' && p.status !== 'pending' && <button className="bg-orange-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-orange-600 flex items-center gap-1"><Ban className="w-3.5 h-3.5" /> Suspend</button>}
                        {p.status === 'suspended' && <button className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-700 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Reinstate</button>}
                        <button className="bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-300 flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> View Details</button>
                        <button className="bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-300 flex items-center gap-1"><FileCheck className="w-3.5 h-3.5" /> View Documents</button>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
