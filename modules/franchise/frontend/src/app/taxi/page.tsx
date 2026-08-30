'use client';

import React, { useState } from 'react';
import { Car, TrendingUp, Users, MapPin, Search, CheckCircle, Clock, XCircle, Eye, Edit, Ban, Star, Fuel, Smartphone } from 'lucide-react';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
const drivers = [
  { id: 'TX-001', name: 'Suresh Kumar', vehicle: 'Swift Dzire', plate: 'MH-01-AB-1234', status: 'online', rating: 4.8, ridesCompleted: 1240, todayRides: 12, earnings: '₹2,450', joined: 'Jan 2025', zone: 'Colaba', vehicleType: 'Sedan', phone: '+91 98765 43001' },
  { id: 'TX-002', name: 'Mohammed Ali', vehicle: 'Hyundai Aura', plate: 'MH-02-CD-5678', status: 'online', rating: 4.6, ridesCompleted: 890, todayRides: 8, earnings: '₹1,820', joined: 'Feb 2025', zone: 'Bandra', vehicleType: 'Sedan', phone: '+91 98765 43002' },
  { id: 'TX-003', name: 'Rajesh Patil', vehicle: 'Maruti Ertiga', plate: 'MH-01-EF-9012', status: 'on-trip', rating: 4.9, ridesCompleted: 2100, todayRides: 15, earnings: '₹3,100', joined: 'Nov 2024', zone: 'Andheri', vehicleType: 'SUV', phone: '+91 98765 43003' },
  { id: 'TX-004', name: 'Vikram Singh', vehicle: 'Toyota Innova', plate: 'MH-03-GH-3456', status: 'offline', rating: 4.3, ridesCompleted: 560, todayRides: 0, earnings: '₹0', joined: 'Apr 2025', zone: 'Worli', vehicleType: 'SUV', phone: '+91 98765 43004' },
  { id: 'TX-005', name: 'Deepak Sharma', vehicle: 'Honda Activa', plate: 'MH-01-JK-7890', status: 'online', rating: 4.5, ridesCompleted: 3200, todayRides: 22, earnings: '₹1,980', joined: 'Oct 2024', zone: 'Dadar', vehicleType: 'Bike', phone: '+91 98765 43005' },
  { id: 'TX-006', name: 'Anil Verma', vehicle: 'Swift Dzire', plate: 'MH-02-LM-2345', status: 'on-trip', rating: 4.7, ridesCompleted: 1450, todayRides: 10, earnings: '₹2,200', joined: 'Jan 2025', zone: 'Juhu', vehicleType: 'Sedan', phone: '+91 98765 43006' },
  { id: 'TX-007', name: 'Prakash Jadhav', vehicle: 'Tata Nano', plate: 'MH-01-NP-6789', status: 'suspended', rating: 3.2, ridesCompleted: 180, todayRides: 0, earnings: '₹0', joined: 'May 2025', zone: 'Fort', vehicleType: 'Mini', phone: '+91 98765 43007' },
  { id: 'TX-008', name: 'Amit Deshmukh', vehicle: 'Maruti WagonR', plate: 'MH-04-QR-0123', status: 'online', rating: 4.4, ridesCompleted: 780, todayRides: 6, earnings: '₹1,350', joined: 'Mar 2025', zone: 'Lower Parel', vehicleType: 'Mini', phone: '+91 98765 43008' },
];

const statusConfig: Record<string, { bg: string; dot: string; label: string }> = {
  online: { bg: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', label: 'Online' },
  'on-trip': { bg: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500', label: 'On Trip' },
  offline: { bg: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400', label: 'Offline' },
  suspended: { bg: 'bg-red-100 text-red-700', dot: 'bg-red-500', label: 'Suspended' },
};

const vehicleColors: Record<string, string> = {
  Sedan: 'bg-blue-100 text-blue-700',
  SUV: 'bg-indigo-100 text-indigo-700',
  Bike: 'bg-amber-100 text-amber-700',
  Mini: 'bg-teal-100 text-teal-700',
};

export default function FranchiseTaxiPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);

  const filtered = drivers.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) || d.vehicle.toLowerCase().includes(search.toLowerCase()) || d.zone.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || d.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const onlineCount = drivers.filter(d => d.status === 'online' || d.status === 'on-trip').length;
  const onTripCount = drivers.filter(d => d.status === 'on-trip').length;
  const todayRides = drivers.reduce((a, d) => a + d.todayRides, 0);
  const todayEarnings = '₹12,900';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Taxi & Ride Operations</h1>
        <p className="text-slate-500">Manage taxi drivers, fleets, and monitor ride statistics in your franchise region.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { title: 'Drivers Online', value: String(onlineCount), icon: Users, trend: '+8%', color: 'bg-emerald-50 text-emerald-600' },
          { title: 'Active Rides', value: String(onTripCount), icon: Car, trend: String(onTripCount), color: 'bg-blue-50 text-blue-600' },
          { title: 'Completed Today', value: String(todayRides), icon: MapPin, trend: '+18%', color: 'bg-orange-50 text-orange-600' },
          { title: 'Today Revenue', value: todayEarnings, icon: TrendingUp, trend: '+9.2%', color: 'bg-teal-50 text-teal-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 rounded-full ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <span className="text-sm font-bold text-green-600">{stat.trend}</span>
            </div>
            <p className="text-slate-500 text-sm font-medium">{stat.title}</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</h3>
          </div>
        ))}
      </div>

      {/* Surge Zone Indicators */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
        <h3 className="font-bold text-slate-900 mb-3">Live Surge Zones</h3>
        <div className="flex flex-wrap gap-3">
          {[
            { zone: 'Bandra', surge: '1.5x', demand: 'high' },
            { zone: 'Andheri', surge: '1.8x', demand: 'very-high' },
            { zone: 'Juhu', surge: '2.0x', demand: 'very-high' },
            { zone: 'Colaba', surge: '1.2x', demand: 'medium' },
            { zone: 'Fort', surge: '1.3x', demand: 'medium' },
          ].map(sz => (
            <div key={sz.zone} className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${
              sz.demand === 'very-high' ? 'bg-red-50 border-red-200 text-red-700' : sz.demand === 'high' ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-blue-50 border-blue-200 text-blue-700'
            }`}>
              <MapPin className="w-3.5 h-3.5" />
              <span className="text-xs font-bold">{sz.zone}</span>
              <span className="text-xs font-black bg-white/50 px-1.5 py-0.5 rounded-md">{sz.surge}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search drivers by name, vehicle, or zone..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
          <option value="All">All Status</option>
          <option value="online">Online</option>
          <option value="on-trip">On Trip</option>
          <option value="offline">Offline</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Driver Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
          <h2 className="font-bold text-slate-900">Driver Fleet</h2>
          <span className="text-xs text-slate-400 font-medium">{filtered.length} drivers</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Driver</th>
                <th className="px-5 py-3.5 font-semibold">Vehicle</th>
                <th className="px-5 py-3.5 font-semibold">Zone</th>
                <th className="px-5 py-3.5 font-semibold text-center">Rating</th>
                <th className="px-5 py-3.5 font-semibold text-right">Today Rides</th>
                <th className="px-5 py-3.5 font-semibold text-right">Earnings</th>
                <th className="px-5 py-3.5 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((d) => (
                <React.Fragment key={d.id}>
                  <tr className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => setExpandedDriver(expandedDriver === d.id ? null : d.id)} tabIndex={0} onKeyDown={activateOnKey(() => setExpandedDriver(expandedDriver === d.id ? null : d.id))}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-orange-50 rounded-full flex items-center justify-center relative">
                          <Car className="w-4 h-4 text-orange-600" />
                          <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${statusConfig[d.status].dot} rounded-full border-2 border-white`} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{d.name}</p>
                          <p className="text-xs text-slate-400">{d.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-700">{d.vehicle}</p>
                      <p className="text-xs text-slate-400">{d.plate}</p>
                    </td>
                    <td className="px-5 py-4"><span className="flex items-center gap-1 text-slate-600"><MapPin className="w-3.5 h-3.5" />{d.zone}</span></td>
                    <td className="px-5 py-4 text-center"><span className="flex items-center gap-1 justify-center"><Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /><span className="font-bold">{d.rating}</span></span></td>
                    <td className="px-5 py-4 text-right font-bold text-slate-900">{d.todayRides}</td>
                    <td className="px-5 py-4 text-right font-bold text-emerald-600">{d.earnings}</td>
                    <td className="px-5 py-4 text-center">
                      <span className={`${statusConfig[d.status].bg} px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusConfig[d.status].dot} ${d.status === 'online' || d.status === 'on-trip' ? 'animate-pulse' : ''}`} />
                        {statusConfig[d.status].label}
                      </span>
                    </td>
                  </tr>
                  {expandedDriver === d.id && (
                    <tr className="bg-slate-50/80">
                      <td colSpan={7} className="px-5 py-4">
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-sm">
                          <div><p className="text-slate-400 text-xs font-medium mb-1">Vehicle Type</p><p className="font-bold"><span className={`${vehicleColors[d.vehicleType]} px-2 py-0.5 rounded text-xs`}>{d.vehicleType}</span></p></div>
                          <div><p className="text-slate-400 text-xs font-medium mb-1">Total Rides</p><p className="font-bold text-slate-700">{d.ridesCompleted.toLocaleString()}</p></div>
                          <div><p className="text-slate-400 text-xs font-medium mb-1">Phone</p><p className="font-bold text-slate-700 flex items-center gap-1"><Smartphone className="w-3.5 h-3.5" />{d.phone}</p></div>
                          <div><p className="text-slate-400 text-xs font-medium mb-1">Joined</p><p className="font-bold text-slate-700">{d.joined}</p></div>
                          <div className="flex items-end gap-2">
                            {d.status === 'suspended' && (
                              <button className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 border border-emerald-200"><CheckCircle className="w-3.5 h-3.5" /> Reactivate</button>
                            )}
                            {(d.status === 'online' || d.status === 'offline') && (
                              <button className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 border border-red-200"><Ban className="w-3.5 h-3.5" /> Suspend</button>
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
          Showing {filtered.length} of {drivers.length} drivers
        </div>
      </div>
    </div>
  );
}
