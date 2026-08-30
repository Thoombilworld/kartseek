'use client';

import React, { useState } from 'react';
import { Building2, TrendingUp, Calendar, BedDouble, Search, CheckCircle, Clock, XCircle, Eye, Edit, Ban, Star, MapPin, DollarSign } from 'lucide-react';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
const hotels = [
  { id: 'HT-001', name: 'The Grand Mumbai', location: 'Colaba', rating: 4.8, rooms: 120, todayBookings: 45, occupancy: '82%', revenue: '₹18.5L', status: 'active', type: 'Luxury', joined: 'Jan 2025', avgNightRate: '₹8,500' },
  { id: 'HT-002', name: 'Sea View Resort', location: 'Juhu Beach', rating: 4.6, rooms: 80, todayBookings: 32, occupancy: '76%', revenue: '₹9.2L', status: 'active', type: 'Resort', joined: 'Dec 2024', avgNightRate: '₹5,200' },
  { id: 'HT-003', name: 'Business Inn', location: 'BKC', rating: 4.4, rooms: 60, todayBookings: 28, occupancy: '88%', revenue: '₹6.8L', status: 'active', type: 'Business', joined: 'Feb 2025', avgNightRate: '₹4,500' },
  { id: 'HT-004', name: 'Heritage Palace Hotel', location: 'Fort', rating: 4.9, rooms: 45, todayBookings: 22, occupancy: '91%', revenue: '₹12.4L', status: 'active', type: 'Heritage', joined: 'Nov 2024', avgNightRate: '₹12,000' },
  { id: 'HT-005', name: 'Budget Stay Express', location: 'Andheri East', rating: 4.1, rooms: 100, todayBookings: 65, occupancy: '72%', revenue: '₹4.2L', status: 'active', type: 'Budget', joined: 'Mar 2025', avgNightRate: '₹1,800' },
  { id: 'HT-006', name: 'Boutique Bandra', location: 'Bandra West', rating: 4.7, rooms: 25, todayBookings: 18, occupancy: '85%', revenue: '₹3.8L', status: 'active', type: 'Boutique', joined: 'Apr 2025', avgNightRate: '₹6,200' },
  { id: 'HT-007', name: 'Sunrise Lodge', location: 'Powai', rating: 3.9, rooms: 35, todayBookings: 8, occupancy: '45%', revenue: '₹1.2L', status: 'pending', type: 'Budget', joined: 'Jun 2025', avgNightRate: '₹2,200' },
  { id: 'HT-008', name: 'Royal Residency', location: 'Worli', rating: 3.5, rooms: 50, todayBookings: 0, occupancy: '0%', revenue: '₹0', status: 'suspended', type: 'Luxury', joined: 'May 2025', avgNightRate: '₹9,000' },
];

const statusConfig: Record<string, { bg: string; icon: React.ReactNode; label: string }> = {
  active: { bg: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle className="w-3.5 h-3.5" />, label: 'Active' },
  pending: { bg: 'bg-amber-100 text-amber-700', icon: <Clock className="w-3.5 h-3.5" />, label: 'Pending' },
  suspended: { bg: 'bg-red-100 text-red-700', icon: <XCircle className="w-3.5 h-3.5" />, label: 'Suspended' },
};

const typeColors: Record<string, string> = {
  Luxury: 'bg-purple-100 text-purple-700', Resort: 'bg-teal-100 text-teal-700', Business: 'bg-blue-100 text-blue-700',
  Heritage: 'bg-amber-100 text-amber-700', Budget: 'bg-slate-100 text-slate-700', Boutique: 'bg-pink-100 text-pink-700',
};

export default function FranchiseHotelBookingPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [expandedHotel, setExpandedHotel] = useState<string | null>(null);

  const filtered = hotels.filter(h => {
    const matchSearch = h.name.toLowerCase().includes(search.toLowerCase()) || h.location.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || h.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const activeCount = hotels.filter(h => h.status === 'active').length;
  const totalRooms = hotels.reduce((a, h) => a + h.rooms, 0);
  const todayBookings = hotels.reduce((a, h) => a + h.todayBookings, 0);
  const avgOccupancy = Math.round(hotels.filter(h => h.status === 'active').reduce((a, h) => a + parseInt(h.occupancy), 0) / activeCount);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Hotel Booking — Franchise Zone</h1>
        <p className="text-slate-400 mt-1">Monitor and manage hotels within your franchise territory</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Hotels', value: activeCount.toString(), icon: Building2, color: 'text-rose-400', bg: 'bg-rose-500/10' },
          { label: 'Total Rooms', value: totalRooms.toLocaleString(), icon: BedDouble, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: "Today's Bookings", value: todayBookings.toString(), icon: Calendar, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Avg Occupancy', value: `${avgOccupancy}%`, icon: TrendingUp, color: 'text-amber-400', bg: 'bg-amber-500/10' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-400 text-sm font-medium">{kpi.label}</span>
              <div className={`${kpi.bg} p-2 rounded-lg`}><kpi.icon className={`w-5 h-5 ${kpi.color}`} /></div>
            </div>
            <p className="text-2xl font-bold text-white">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search hotels by name or location..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/40" />
          </div>
          <select title="Filter by status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/40">
            <option value="All">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Hotels Table */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700/50">
          <h2 className="text-lg font-semibold text-white">Hotels in Zone ({filtered.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-slate-700/50 text-left">
              {['Hotel', 'Location', 'Type', 'Rooms', 'Occupancy', 'Revenue', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-slate-700/30">
              {filtered.map(hotel => (
                <React.Fragment key={hotel.id}>
                  <tr className="hover:bg-slate-700/20 transition-colors cursor-pointer" onClick={() => setExpandedHotel(expandedHotel === hotel.id ? null : hotel.id)} tabIndex={0} onKeyDown={activateOnKey(() => setExpandedHotel(expandedHotel === hotel.id ? null : hotel.id))}>
                    <td className="px-5 py-4"><div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-rose-500/10 flex items-center justify-center"><Building2 className="w-4.5 h-4.5 text-rose-400" /></div>
                      <div><p className="font-medium text-white text-sm">{hotel.name}</p><p className="text-xs text-slate-500">{hotel.id} · Since {hotel.joined}</p></div>
                    </div></td>
                    <td className="px-5 py-4"><div className="flex items-center gap-1.5 text-sm text-slate-300"><MapPin className="w-3.5 h-3.5 text-slate-500" />{hotel.location}</div></td>
                    <td className="px-5 py-4"><span className={`px-2 py-1 rounded-md text-xs font-medium ${typeColors[hotel.type] || 'bg-slate-100 text-slate-700'}`}>{hotel.type}</span></td>
                    <td className="px-5 py-4 text-sm text-slate-300">{hotel.rooms}</td>
                    <td className="px-5 py-4"><div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden"><div className={`h-full bg-rose-500 rounded-full w-[${hotel.occupancy}]`} /></div>
                      <span className="text-sm text-slate-300">{hotel.occupancy}</span>
                    </div></td>
                    <td className="px-5 py-4 text-sm font-medium text-white">{hotel.revenue}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig[hotel.status]?.bg}`}>
                        {statusConfig[hotel.status]?.icon}{statusConfig[hotel.status]?.label}
                      </span>
                    </td>
                    <td className="px-5 py-4"><div className="flex items-center gap-1">
                      <button title="View hotel" className="p-1.5 rounded-md hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"><Eye className="w-4 h-4" /></button>
                      <button title="Edit hotel" className="p-1.5 rounded-md hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"><Edit className="w-4 h-4" /></button>
                      <button title="Suspend hotel" className="p-1.5 rounded-md hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors"><Ban className="w-4 h-4" /></button>
                    </div></td>
                  </tr>
                  {expandedHotel === hotel.id && (
                    <tr><td colSpan={8} className="px-5 py-4 bg-slate-900/40">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div><p className="text-xs text-slate-500">Rating</p><p className="text-sm text-white flex items-center gap-1"><Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />{hotel.rating}</p></div>
                        <div><p className="text-xs text-slate-500">Today&apos;s Bookings</p><p className="text-sm text-white">{hotel.todayBookings}</p></div>
                        <div><p className="text-xs text-slate-500">Avg Night Rate</p><p className="text-sm text-white">{hotel.avgNightRate}</p></div>
                        <div><p className="text-xs text-slate-500">Total Revenue</p><p className="text-sm text-emerald-400 font-medium">{hotel.revenue}</p></div>
                      </div>
                    </td></tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
