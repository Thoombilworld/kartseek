'use client';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';

import React, { useState } from 'react';
import { Truck, Car, Search, Star, MapPin, Phone, FileCheck, Eye, Ban, CheckCircle, Clock, XCircle, ChevronDown, ChevronUp, DollarSign, Users, AlertTriangle, Shield } from 'lucide-react';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
type Driver = {
  id: string; name: string; phone: string; type: 'delivery' | 'taxi'; vehicleType: string;
  vehicleNumber: string; city: string; zone: string; rating: number; trips: number;
  earnings: string; status: string; kycStatus: string; joinDate: string;
  documents: { aadhar: boolean; license: boolean; rc: boolean; insurance: boolean; pcc: boolean };
};

const drivers: Driver[] = [
  { id: 'DRV-001', name: 'Ravi Kumar', phone: '+91 98765 43210', type: 'delivery', vehicleType: 'Bike', vehicleNumber: 'MH02AB1234', city: 'Mumbai', zone: 'Colaba', rating: 4.8, trips: 1240, earnings: '₹42,000', status: 'online', kycStatus: 'verified', joinDate: 'Jan 2025', documents: { aadhar: true, license: true, rc: true, insurance: true, pcc: true } },
  { id: 'DRV-002', name: 'Amit Singh', phone: '+91 98765 43211', type: 'taxi', vehicleType: 'Sedan', vehicleNumber: 'MH04CD5678', city: 'Mumbai', zone: 'Andheri', rating: 4.5, trips: 890, earnings: '₹58,500', status: 'on-trip', kycStatus: 'verified', joinDate: 'Mar 2025', documents: { aadhar: true, license: true, rc: true, insurance: true, pcc: true } },
  { id: 'DRV-003', name: 'Suresh M.', phone: '+91 98765 43212', type: 'delivery', vehicleType: 'Bike', vehicleNumber: 'KA01EF9012', city: 'Bangalore', zone: 'Koramangala', rating: 4.7, trips: 1560, earnings: '₹52,000', status: 'online', kycStatus: 'verified', joinDate: 'Dec 2024', documents: { aadhar: true, license: true, rc: true, insurance: true, pcc: true } },
  { id: 'DRV-004', name: 'Deepak R.', phone: '+91 98765 43213', type: 'taxi', vehicleType: 'SUV', vehicleNumber: 'DL08GH3456', city: 'Delhi', zone: 'Connaught Place', rating: 4.3, trips: 420, earnings: '₹28,200', status: 'offline', kycStatus: 'verified', joinDate: 'Feb 2025', documents: { aadhar: true, license: true, rc: true, insurance: true, pcc: false } },
  { id: 'DRV-005', name: 'Prakash B.', phone: '+91 98765 43214', type: 'delivery', vehicleType: 'Bike', vehicleNumber: 'AP10KL2345', city: 'Hyderabad', zone: 'Hitech City', rating: 3.9, trips: 210, earnings: '₹8,400', status: 'suspended', kycStatus: 'expired', joinDate: 'Apr 2025', documents: { aadhar: true, license: true, rc: false, insurance: false, pcc: false } },
  { id: 'DRV-006', name: 'Mohan K.', phone: '+91 98765 43215', type: 'taxi', vehicleType: 'Auto', vehicleNumber: 'TN09IJ7890', city: 'Chennai', zone: 'T. Nagar', rating: 4.6, trips: 780, earnings: '₹32,800', status: 'online', kycStatus: 'verified', joinDate: 'Jan 2025', documents: { aadhar: true, license: true, rc: true, insurance: true, pcc: true } },
  { id: 'DRV-007', name: 'Naveen P.', phone: '+91 98765 43216', type: 'delivery', vehicleType: 'Bike', vehicleNumber: 'MH14MN6789', city: 'Pune', zone: 'Hinjewadi', rating: 0, trips: 0, earnings: '₹0', status: 'pending', kycStatus: 'under-review', joinDate: 'May 2026', documents: { aadhar: true, license: true, rc: true, insurance: false, pcc: false } },
  { id: 'DRV-008', name: 'Farhan S.', phone: '+91 98765 43217', type: 'taxi', vehicleType: 'Mini', vehicleNumber: 'MH01OP3456', city: 'Mumbai', zone: 'Bandra', rating: 0, trips: 0, earnings: '₹0', status: 'pending', kycStatus: 'under-review', joinDate: 'May 2026', documents: { aadhar: true, license: false, rc: false, insurance: false, pcc: false } },
];

const statusColors: Record<string, string> = {
  online: 'bg-emerald-100 text-emerald-700', 'on-trip': 'bg-blue-100 text-blue-700',
  offline: 'bg-slate-100 text-slate-600', suspended: 'bg-red-100 text-red-700',
  pending: 'bg-amber-100 text-amber-700',
};
const kycColors: Record<string, string> = {
  approved: 'bg-emerald-100 text-emerald-700', verified: 'bg-emerald-100 text-emerald-700',
  under_review: 'bg-amber-100 text-amber-700', submitted: 'bg-amber-100 text-amber-700',
  not_submitted: 'bg-slate-100 text-slate-500', correction_requested: 'bg-orange-100 text-orange-700',
  expired: 'bg-red-100 text-red-700', rejected: 'bg-red-100 text-red-700',
  suspended: 'bg-red-100 text-red-700',
};


export default function DriversPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);

  const filtered = drivers.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) || d.id.toLowerCase().includes(search.toLowerCase()) || d.city.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'All' || d.type === typeFilter;
    const matchStatus = statusFilter === 'All' || d.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const deliveryCount = drivers.filter(d => d.type === 'delivery').length;
  const taxiCount = drivers.filter(d => d.type === 'taxi').length;
  const onlineCount = drivers.filter(d => d.status === 'online' || d.status === 'on-trip').length;
  const pendingKyc = drivers.filter(d => d.kycStatus === 'under-review').length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Drivers & Delivery Partners</h1>
          <p className="text-slate-500 text-sm">Manage applications, KYC, earnings, and operations for all delivery boys and taxi drivers.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-bold"><span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> {onlineCount} Online</span>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-linear-to-br from-indigo-500 to-indigo-600 p-4 rounded-xl shadow-md text-white">
          <Users className="w-5 h-5 opacity-80" /><p className="text-2xl font-black mt-2">{drivers.length}</p><p className="text-xs font-medium opacity-80">Total Drivers</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <Truck className="w-5 h-5 text-violet-500" /><p className="text-2xl font-black text-slate-900 mt-2">{deliveryCount}</p><p className="text-xs text-slate-500 font-medium">Delivery Boys</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <Car className="w-5 h-5 text-amber-500" /><p className="text-2xl font-black text-slate-900 mt-2">{taxiCount}</p><p className="text-xs text-slate-500 font-medium">Taxi Drivers</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <DollarSign className="w-5 h-5 text-emerald-500" /><p className="text-2xl font-black text-slate-900 mt-2">₹2.2L</p><p className="text-xs text-slate-500 font-medium">Payouts Today</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-amber-500" /><p className="text-2xl font-black text-slate-900 mt-2">{pendingKyc}</p><p className="text-xs text-slate-500 font-medium">Pending KYC</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search by name, ID, or city..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white" /></div>
        <select title="Filter by driver type" value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white">
          <option value="All">All Types</option><option value="delivery">Delivery Boys</option><option value="taxi">Taxi Drivers</option>
        </select>
        <select title="Filter by status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white">
          <option value="All">All Status</option><option value="online">Online</option><option value="on-trip">On Trip</option><option value="offline">Offline</option><option value="pending">Pending</option><option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Driver</th>
                <th className="px-5 py-3.5 font-semibold">Type</th>
                <th className="px-5 py-3.5 font-semibold">Vehicle</th>
                <th className="px-5 py-3.5 font-semibold text-center">Rating</th>
                <th className="px-5 py-3.5 font-semibold text-right">Trips</th>
                <th className="px-5 py-3.5 font-semibold text-right">Earnings</th>
                <th className="px-5 py-3.5 font-semibold text-center">KYC</th>
                <th className="px-5 py-3.5 font-semibold text-center">Status</th>
                <th className="px-5 py-3.5 font-semibold text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(d => (
                <React.Fragment key={d.id}>
                  <tr className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => setExpandedDriver(expandedDriver === d.id ? null : d.id)} tabIndex={0} onKeyDown={activateOnKey(() => setExpandedDriver(expandedDriver === d.id ? null : d.id))}>
                    <td className="px-5 py-4"><p className="font-bold text-slate-900">{d.name}</p><p className="text-xs text-slate-400">{d.id} • {d.city} ({d.zone})</p></td>
                    <td className="px-5 py-4"><span className={`px-2.5 py-1 rounded-md text-xs font-bold inline-flex items-center gap-1 ${d.type === 'delivery' ? 'bg-violet-100 text-violet-700' : 'bg-amber-100 text-amber-700'}`}>{d.type === 'delivery' ? <Truck className="w-3 h-3" /> : <Car className="w-3 h-3" />}{d.type === 'delivery' ? 'Delivery' : 'Taxi'}</span></td>
                    <td className="px-5 py-4 text-xs text-slate-600">{d.vehicleType} — {d.vehicleNumber}</td>
                    <td className="px-5 py-4 text-center">{d.rating > 0 ? <span className="inline-flex items-center gap-0.5"><Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /><span className="font-bold">{d.rating}</span></span> : <span className="text-slate-400 text-xs">New</span>}</td>
                    <td className="px-5 py-4 text-right font-bold">{d.trips.toLocaleString()}</td>
                    <td className="px-5 py-4 text-right font-bold">{d.earnings}</td>
                    <td className="px-5 py-4 text-center"><span className={`${kycColors[d.kycStatus]} px-2 py-0.5 rounded text-xs font-bold capitalize`}>{d.kycStatus.replace('-', ' ')}</span></td>
                    <td className="px-5 py-4 text-center"><span className={`${statusColors[d.status]} px-2.5 py-1 rounded-full text-xs font-bold capitalize`}>{d.status.replace('-', ' ')}</span></td>
                    <td className="px-5 py-4 text-center">{expandedDriver === d.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}</td>
                  </tr>
                  {expandedDriver === d.id && (
                    <tr className="bg-slate-50/80">
                      <td colSpan={9} className="px-5 py-5">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm mb-4">
                          <div><p className="text-slate-400 text-xs font-medium mb-1">Contact</p><p className="flex items-center gap-1 text-slate-700"><Phone className="w-3.5 h-3.5" />{d.phone}</p></div>
                          <div><p className="text-slate-400 text-xs font-medium mb-1">Joined</p><p className="font-bold text-slate-700">{d.joinDate}</p></div>
                          <div><p className="text-slate-400 text-xs font-medium mb-1">Zone</p><p className="flex items-center gap-1 text-slate-700"><MapPin className="w-3.5 h-3.5" />{d.zone}, {d.city}</p></div>
                          <div className="flex items-end gap-2">
                            {d.status === 'pending' ? (
                              <><button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Approve</button>
                              <button className="bg-white hover:bg-red-50 text-red-600 px-4 py-2 rounded-lg text-xs font-bold border border-red-200 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Reject</button></>
                            ) : d.status === 'suspended' ? (
                              <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Reinstate</button>
                            ) : (
                              <button className="bg-white hover:bg-red-50 text-red-600 px-4 py-2 rounded-lg text-xs font-bold border border-red-200 flex items-center gap-1"><Ban className="w-3.5 h-3.5" /> Suspend</button>
                            )}
                          </div>
                        </div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">KYC Documents</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(d.documents).map(([key, val]) => (
                            <span key={key} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border ${val ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                              {val ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                              {key === 'aadhar' ? 'Aadhaar' : key === 'license' ? 'Driving License' : key === 'rc' ? 'Vehicle RC' : key === 'insurance' ? 'Insurance' : 'Police Clearance'}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/50 text-sm text-slate-500">Showing {filtered.length} of {drivers.length} drivers</div>
      </div>
    </div>
  );
}
