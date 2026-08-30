'use client';

import React, { useState } from 'react';
import { Building2, Search, MapPin, Star, CheckCircle, Clock, XCircle, Eye, Edit, Ban, BedDouble } from 'lucide-react';

const hotels = [
  { id: 'HT-001', name: 'The Grand Mumbai', location: 'Colaba', rating: 4.8, rooms: 120, occupancy: '82%', revenue: '₹18.5L', status: 'active', type: 'Luxury', joined: 'Jan 2025' },
  { id: 'HT-002', name: 'Sea View Resort', location: 'Juhu Beach', rating: 4.6, rooms: 80, occupancy: '76%', revenue: '₹9.2L', status: 'active', type: 'Resort', joined: 'Dec 2024' },
  { id: 'HT-003', name: 'Business Inn', location: 'BKC', rating: 4.4, rooms: 60, occupancy: '88%', revenue: '₹6.8L', status: 'active', type: 'Business', joined: 'Feb 2025' },
  { id: 'HT-004', name: 'Heritage Palace Hotel', location: 'Fort', rating: 4.9, rooms: 45, occupancy: '91%', revenue: '₹12.4L', status: 'active', type: 'Heritage', joined: 'Nov 2024' },
  { id: 'HT-005', name: 'Budget Stay Express', location: 'Andheri East', rating: 4.1, rooms: 100, occupancy: '72%', revenue: '₹4.2L', status: 'active', type: 'Budget', joined: 'Mar 2025' },
  { id: 'HT-006', name: 'Boutique Bandra', location: 'Bandra West', rating: 4.7, rooms: 25, occupancy: '85%', revenue: '₹3.8L', status: 'active', type: 'Boutique', joined: 'Apr 2025' },
  { id: 'HT-007', name: 'Sunrise Lodge', location: 'Powai', rating: 3.9, rooms: 35, occupancy: '45%', revenue: '₹1.2L', status: 'pending', type: 'Budget', joined: 'Jun 2025' },
];

const statusCfg: Record<string, { bg: string; label: string }> = {
  active: { bg: 'bg-emerald-100 text-emerald-700', label: 'Active' },
  pending: { bg: 'bg-amber-100 text-amber-700', label: 'Pending' },
  suspended: { bg: 'bg-red-100 text-red-700', label: 'Suspended' },
};

export default function FranchiseHotelsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const filtered = hotels.filter(h => {
    const s = h.name.toLowerCase().includes(search.toLowerCase()) || h.location.toLowerCase().includes(search.toLowerCase());
    const st = statusFilter === 'All' || h.status === statusFilter;
    return s && st;
  });

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-white">Hotels Management</h1><p className="text-slate-400 mt-1">View and manage all registered hotels in your zone</p></div>
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search hotels..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/40" />
        </div>
        <select title="Filter by status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-lg text-white text-sm">
          <option value="All">All Status</option><option value="active">Active</option><option value="pending">Pending</option><option value="suspended">Suspended</option>
        </select>
      </div>
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700/50"><h2 className="text-lg font-semibold text-white">All Hotels ({filtered.length})</h2></div>
        <div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-slate-700/50 text-left">
          {['Hotel', 'Location', 'Type', 'Rooms', 'Rating', 'Occupancy', 'Revenue', 'Status', 'Actions'].map(h => (
            <th key={h} className="px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
          ))}
        </tr></thead><tbody className="divide-y divide-slate-700/30">
          {filtered.map(h => (
            <tr key={h.id} className="hover:bg-slate-700/20 transition-colors">
              <td className="px-5 py-4"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg bg-rose-500/10 flex items-center justify-center"><Building2 className="w-4 h-4 text-rose-400" /></div><div><p className="font-medium text-white text-sm">{h.name}</p><p className="text-xs text-slate-500">{h.id}</p></div></div></td>
              <td className="px-5 py-4 text-sm text-slate-300"><div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-500" />{h.location}</div></td>
              <td className="px-5 py-4 text-sm text-slate-300">{h.type}</td>
              <td className="px-5 py-4 text-sm text-slate-300">{h.rooms}</td>
              <td className="px-5 py-4 text-sm text-slate-300"><div className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />{h.rating}</div></td>
              <td className="px-5 py-4"><div className="flex items-center gap-2"><div className="w-14 h-1.5 bg-slate-700 rounded-full overflow-hidden"><div className={`h-full bg-rose-500 rounded-full w-[${h.occupancy}]`} /></div><span className="text-sm text-slate-300">{h.occupancy}</span></div></td>
              <td className="px-5 py-4 text-sm font-medium text-white">{h.revenue}</td>
              <td className="px-5 py-4"><span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusCfg[h.status]?.bg}`}>{statusCfg[h.status]?.label}</span></td>
              <td className="px-5 py-4"><div className="flex items-center gap-1">
                <button title="View hotel" className="p-1.5 rounded-md hover:bg-slate-700/50 text-slate-400 hover:text-white"><Eye className="w-4 h-4" /></button>
                <button title="Edit hotel" className="p-1.5 rounded-md hover:bg-slate-700/50 text-slate-400 hover:text-white"><Edit className="w-4 h-4" /></button>
              </div></td>
            </tr>
          ))}
        </tbody></table></div>
      </div>
    </div>
  );
}
