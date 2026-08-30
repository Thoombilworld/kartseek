'use client';
import { useRestaurantRegionFilter } from '@/hooks/useRestaurantRegionFilter';
import React, { useState } from 'react';
import { CalendarDays, Search, Users, Clock, CheckCircle, XCircle, Phone, ChevronDown, ChevronUp, Ban } from 'lucide-react';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
type BookingStatus = 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show';

type Booking = {
  id: string; restaurant: string; city: string;
  customer: string; phone: string; guests: number; date: string; time: string;
  status: BookingStatus; preOrdered: boolean; preOrderTotal: string | null; note: string;
};

const BOOKINGS: Booking[] = [
  { id: 'TB-1001', restaurant: 'Biryani House', city: 'Hyderabad', customer: 'Amit Patel', phone: '+91 98765 12345', guests: 4, date: 'Today', time: '19:30', status: 'confirmed', preOrdered: true, preOrderTotal: '₹1,240', note: 'Window seat preferred. Anniversary dinner.' },
  { id: 'TB-1002', restaurant: 'Sushi Kingdom', city: 'Mumbai', customer: 'Sarah Williams', phone: '+91 87654 98765', guests: 2, date: 'Today', time: '20:00', status: 'pending', preOrdered: false, preOrderTotal: null, note: '' },
  { id: 'TB-1003', restaurant: 'Pizza Palace', city: 'Mumbai', customer: 'Rahul Sharma', phone: '+91 76543 21098', guests: 6, date: 'Today', time: '21:00', status: 'confirmed', preOrdered: true, preOrderTotal: '₹1,850', note: 'High chair needed for a toddler.' },
  { id: 'TB-1004', restaurant: 'Burger King (Andheri)', city: 'Mumbai', customer: 'Kavita R.', phone: '+91 65432 77889', guests: 3, date: 'Tomorrow', time: '13:00', status: 'pending', preOrdered: false, preOrderTotal: null, note: 'Birthday celebration.' },
  { id: 'TB-1005', restaurant: 'China Garden', city: 'Delhi', customer: 'Lin W.', phone: '+91 54321 11223', guests: 8, date: '02 Jun', time: '19:00', status: 'cancelled', preOrdered: false, preOrderTotal: null, note: 'Cancelled by customer.' },
  { id: 'TB-1006', restaurant: 'Biryani House', city: 'Hyderabad', customer: 'Ravi K.', phone: '+91 44321 55667', guests: 2, date: '01 Jun', time: '20:30', status: 'no_show', preOrdered: true, preOrderTotal: '₹680', note: '' },
];

const STATUS_CFG: Record<BookingStatus, { bg: string; label: string }> = {
  pending: { bg: 'bg-amber-100 text-amber-700', label: 'Pending' },
  confirmed: { bg: 'bg-blue-100 text-blue-700', label: 'Confirmed' },
  seated: { bg: 'bg-indigo-100 text-indigo-700', label: 'Seated' },
  completed: { bg: 'bg-emerald-100 text-emerald-700', label: 'Completed' },
  cancelled: { bg: 'bg-red-100 text-red-600', label: 'Cancelled' },
  no_show: { bg: 'bg-slate-100 text-slate-600', label: 'No-show' },
};

export default function AdminTableBookingsPage() {
  const { regionLabel, isFiltered, formatPrice } = useRestaurantRegionFilter([]);
  const [search, setSearch] = useState('');
  const [sf, setSf] = useState<'all' | BookingStatus>('all');
  const [exp, setExp] = useState<string | null>(null);
  const [bookings, setBookings] = useState(BOOKINGS);

  const filtered = bookings.filter(b => {
    const ms = b.id.toLowerCase().includes(search.toLowerCase()) || b.restaurant.toLowerCase().includes(search.toLowerCase()) || b.customer.toLowerCase().includes(search.toLowerCase());
    const mst = sf === 'all' || b.status === sf;
    return ms && mst;
  });

  const updateStatus = (id: string, status: BookingStatus) => setBookings(p => p.map(b => b.id === id ? { ...b, status } : b));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Table Bookings</h1>
          <p className="text-slate-500 text-sm">Monitor and manage all table reservations across all restaurants.</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs font-bold">
          <span className="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full text-center">{bookings.filter(b => b.status === 'pending').length} Pending</span>
          <span className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full text-center">{bookings.filter(b => b.status === 'confirmed').length} Confirmed</span>
          <span className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full text-center">{bookings.filter(b => b.status === 'completed').length} Completed</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 relative min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search bookings..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white" />
        </div>
        <select value={sf} onChange={e => setSf(e.target.value as any)}
          className="px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium bg-white focus:ring-2 focus:ring-emerald-500 outline-none">
          <option value="all">All Statuses</option>
          {(Object.keys(STATUS_CFG) as BookingStatus[]).map(s => <option key={s} value={s}>{STATUS_CFG[s].label}</option>)}
        </select>
      </div>

      {/* Bookings */}
      <div className="space-y-3">
        {filtered.map(b => (
          <div key={b.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 flex flex-wrap items-center gap-3 cursor-pointer hover:bg-slate-50/50"
              onClick={() => setExp(exp === b.id ? null : b.id)} role="button" tabIndex={0} onKeyDown={activateOnKey(() => setExp(exp === b.id ? null : b.id))}>
              <CalendarDays className="w-5 h-5 text-rose-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-900">{b.id}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_CFG[b.status].bg}`}>{STATUS_CFG[b.status].label}</span>
                  {b.preOrdered && <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-[10px] font-bold">Pre-ordered</span>}
                </div>
                <p className="text-sm text-slate-500">{b.restaurant} • {b.city} • {b.customer}</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{b.guests} guests</span>
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{b.date}, {b.time}</span>
              </div>
              {exp === b.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </div>

            {exp === b.id && (
              <div className="border-t border-slate-100 bg-slate-50/80 px-5 py-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                  <div><p className="text-slate-400 text-xs font-medium mb-1">Customer Phone</p><p className="font-bold text-slate-700 flex items-center gap-1"><Phone className="w-3 h-3" />{b.phone}</p></div>
                  <div><p className="text-slate-400 text-xs font-medium mb-1">Pre-order Total</p><p className="font-bold text-slate-900">{b.preOrderTotal || 'None'}</p></div>
                  <div><p className="text-slate-400 text-xs font-medium mb-1">Special Note</p><p className="font-medium text-slate-600 text-xs">{b.note || 'None'}</p></div>
                  <div><p className="text-slate-400 text-xs font-medium mb-1">Status</p><span className={`${STATUS_CFG[b.status].bg} px-2 py-0.5 rounded-full text-xs font-bold`}>{STATUS_CFG[b.status].label}</span></div>
                </div>
                {b.status === 'pending' && (
                  <div className="flex gap-2 pt-2 border-t border-slate-200">
                    <button onClick={() => updateStatus(b.id, 'confirmed')} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors">
                      <CheckCircle className="w-3.5 h-3.5" /> Confirm
                    </button>
                    <button onClick={() => updateStatus(b.id, 'cancelled')} className="bg-white hover:bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors">
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                )}
                {b.status === 'confirmed' && (
                  <div className="flex gap-2 pt-2 border-t border-slate-200">
                    <button onClick={() => updateStatus(b.id, 'seated')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors">
                      <Users className="w-3.5 h-3.5" /> Mark Seated
                    </button>
                    <button onClick={() => updateStatus(b.id, 'no_show')} className="bg-white text-slate-600 border border-slate-200 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-slate-50 transition-colors">
                      <Ban className="w-3.5 h-3.5" /> Mark No-show
                    </button>
                  </div>
                )}
                {b.status === 'seated' && (
                  <div className="pt-2 border-t border-slate-200">
                    <button onClick={() => updateStatus(b.id, 'completed')} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors">
                      <CheckCircle className="w-3.5 h-3.5" /> Mark Completed
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
