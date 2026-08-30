'use client';

import React, { useState } from 'react';
import { Calendar, Search, User, Building2, Clock, CheckCircle, XCircle, Eye, MapPin } from 'lucide-react';

const bookings = [
  { id: 'BK-8001', guest: 'Rahul Sharma', hotel: 'The Grand Mumbai', room: 'Deluxe Suite', checkIn: '2025-07-09', checkOut: '2025-07-12', nights: 3, amount: '₹25,500', status: 'confirmed', guests: 2 },
  { id: 'BK-8002', guest: 'Priya Menon', hotel: 'Sea View Resort', room: 'Ocean View', checkIn: '2025-07-10', checkOut: '2025-07-13', nights: 3, amount: '₹15,600', status: 'checked-in', guests: 3 },
  { id: 'BK-8003', guest: 'Anil Kumar', hotel: 'Business Inn', room: 'Executive', checkIn: '2025-07-08', checkOut: '2025-07-09', nights: 1, amount: '₹4,500', status: 'checked-out', guests: 1 },
  { id: 'BK-8004', guest: 'Sneha Patil', hotel: 'Heritage Palace Hotel', room: 'Royal Suite', checkIn: '2025-07-11', checkOut: '2025-07-15', nights: 4, amount: '₹48,000', status: 'confirmed', guests: 2 },
  { id: 'BK-8005', guest: 'Vikram Reddy', hotel: 'Budget Stay Express', room: 'Standard', checkIn: '2025-07-09', checkOut: '2025-07-10', nights: 1, amount: '₹1,800', status: 'cancelled', guests: 1 },
  { id: 'BK-8006', guest: 'Meera Joshi', hotel: 'Boutique Bandra', room: 'Premium', checkIn: '2025-07-12', checkOut: '2025-07-14', nights: 2, amount: '₹12,400', status: 'confirmed', guests: 2 },
];

const statusColors: Record<string, string> = {
  confirmed: 'bg-blue-100 text-blue-700', 'checked-in': 'bg-emerald-100 text-emerald-700',
  'checked-out': 'bg-slate-100 text-slate-700', cancelled: 'bg-red-100 text-red-700',
};

export default function FranchiseHotelBookingsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const filtered = bookings.filter(b => {
    const s = b.guest.toLowerCase().includes(search.toLowerCase()) || b.hotel.toLowerCase().includes(search.toLowerCase()) || b.id.toLowerCase().includes(search.toLowerCase());
    const st = statusFilter === 'All' || b.status === statusFilter;
    return s && st;
  });

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-white">Bookings Overview</h1><p className="text-slate-400 mt-1">Track all hotel bookings across your franchise zone</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[{ label: 'Total Bookings', value: bookings.length, color: 'text-rose-400' }, { label: 'Confirmed', value: bookings.filter(b => b.status === 'confirmed').length, color: 'text-blue-400' }, { label: 'Checked In', value: bookings.filter(b => b.status === 'checked-in').length, color: 'text-emerald-400' }, { label: 'Cancelled', value: bookings.filter(b => b.status === 'cancelled').length, color: 'text-red-400' }].map(k => (
          <div key={k.label} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4"><p className="text-slate-400 text-sm">{k.label}</p><p className={`text-2xl font-bold ${k.color} mt-1`}>{k.value}</p></div>
        ))}
      </div>
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" placeholder="Search by guest, hotel, or booking ID..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/40" /></div>
        <select title="Filter by status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-lg text-white text-sm"><option value="All">All Status</option><option value="confirmed">Confirmed</option><option value="checked-in">Checked In</option><option value="checked-out">Checked Out</option><option value="cancelled">Cancelled</option></select>
      </div>
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-slate-700/50 text-left">
          {['Booking', 'Guest', 'Hotel', 'Room', 'Check-in', 'Check-out', 'Nights', 'Amount', 'Status'].map(h => (<th key={h} className="px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>))}
        </tr></thead><tbody className="divide-y divide-slate-700/30">
          {filtered.map(b => (
            <tr key={b.id} className="hover:bg-slate-700/20 transition-colors">
              <td className="px-5 py-4 text-sm font-medium text-white">{b.id}</td>
              <td className="px-5 py-4"><div className="flex items-center gap-2"><User className="w-4 h-4 text-slate-500" /><span className="text-sm text-white">{b.guest}</span></div></td>
              <td className="px-5 py-4 text-sm text-slate-300">{b.hotel}</td>
              <td className="px-5 py-4 text-sm text-slate-300">{b.room}</td>
              <td className="px-5 py-4 text-sm text-slate-300">{b.checkIn}</td>
              <td className="px-5 py-4 text-sm text-slate-300">{b.checkOut}</td>
              <td className="px-5 py-4 text-sm text-slate-300">{b.nights}</td>
              <td className="px-5 py-4 text-sm font-medium text-white">{b.amount}</td>
              <td className="px-5 py-4"><span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[b.status]}`}>{b.status.replace('-', ' ')}</span></td>
            </tr>
          ))}
        </tbody></table></div>
      </div>
    </div>
  );
}
