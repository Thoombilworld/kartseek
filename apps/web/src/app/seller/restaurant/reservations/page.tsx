'use client';
import React, { useState, useEffect } from 'react';
import {
  CalendarCheck, Users, Clock, Phone, ChevronLeft, ChevronRight,
  Check, X, UserPlus, MessageSquare, Star, Filter,
} from 'lucide-react';
import { vendorRestaurantApi } from '@/lib/api/vendor-restaurant';

type ReservationStatus = 'pending' | 'confirmed' | 'seated' | 'completed' | 'no_show' | 'cancelled';

interface Reservation {
  id: string; customer: string; phone: string; guests: number;
  date: string; time: string; status: ReservationStatus;
  table?: string; area?: string; specialRequests?: string;
  preOrderItems?: string[];
}

const STATUS_CONFIG: Record<ReservationStatus, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: 'text-amber-700', bg: 'bg-amber-50' },
  confirmed: { label: 'Confirmed', color: 'text-blue-700', bg: 'bg-blue-50' },
  seated: { label: 'Seated', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  completed: { label: 'Completed', color: 'text-green-700', bg: 'bg-green-50' },
  no_show: { label: 'No Show', color: 'text-red-700', bg: 'bg-red-50' },
  cancelled: { label: 'Cancelled', color: 'text-slate-500', bg: 'bg-slate-100' },
};

const MOCK_RESERVATIONS: Reservation[] = [
  { id: 'RES-201', customer: 'Amit Kumar', phone: '+91 98765 43210', guests: 4, date: 'Today', time: '7:30 PM', status: 'pending', area: 'Main Hall', specialRequests: 'Birthday celebration — need a cake stand', preOrderItems: ['Family Biryani Pack', 'Gulab Jamun (6)'] },
  { id: 'RES-202', customer: 'Sara Williams', phone: '+91 87654 32109', guests: 2, date: 'Today', time: '8:00 PM', status: 'confirmed', table: 'R-02', area: 'Rooftop' },
  { id: 'RES-203', customer: 'David Chen', phone: '+91 76543 21098', guests: 6, date: 'Today', time: '1:00 PM', status: 'seated', table: 'F-01', area: 'Family Section', specialRequests: 'High chair needed for toddler' },
  { id: 'RES-204', customer: 'Priya Patel', phone: '+91 65432 10987', guests: 8, date: 'Today', time: '12:30 PM', status: 'completed', table: 'P-01', area: 'Private Dining' },
  { id: 'RES-205', customer: 'Omar Al-Farsi', phone: '+91 54321 09876', guests: 3, date: 'Today', time: '6:00 PM', status: 'no_show', area: 'Main Hall' },
  { id: 'RES-206', customer: 'Lisa Zhang', phone: '+91 43210 98765', guests: 2, date: 'Tomorrow', time: '7:00 PM', status: 'pending', area: 'Rooftop', specialRequests: 'Window table preferred' },
  { id: 'RES-207', customer: 'Rahul Mehta', phone: '+91 32109 87654', guests: 10, date: 'Tomorrow', time: '8:00 PM', status: 'confirmed', table: 'P-02', area: 'Private Dining', preOrderItems: ['2x Family Biryani', '4x Tandoori Chicken', 'Dessert Platter'] },
];

const TIME_SLOTS = ['12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM'];

export default function ReservationsPage() {
  const [reservations, setReservations] = useState(MOCK_RESERVATIONS);
  const [statusFilter, setStatusFilter] = useState<'all' | ReservationStatus>('all');
  const [dateFilter, setDateFilter] = useState('Today');

  const filtered = reservations.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (dateFilter !== 'All' && r.date !== dateFilter) return false;
    return true;
  });

  const updateStatus = (id: string, status: ReservationStatus) => {
    setReservations((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
  };

  const pendingCount = reservations.filter((r) => r.status === 'pending').length;
  const totalGuests = reservations.filter((r) => ['pending', 'confirmed', 'seated'].includes(r.status) && r.date === 'Today')
    .reduce((s, r) => s + r.guests, 0);

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-rose-600" /> Reservations
          </h1>
          <p className="text-sm text-slate-500">Manage table bookings, guest arrivals, and pre-orders.</p>
        </div>
        <button className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-sm shadow-sm flex items-center gap-2">
          <UserPlus className="w-4 h-4" /> Add Reservation
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Pending', value: pendingCount, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Confirmed', value: reservations.filter((r) => r.status === 'confirmed').length, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Seated', value: reservations.filter((r) => r.status === 'seated').length, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Expected Guests', value: totalGuests, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'No Shows', value: reservations.filter((r) => r.status === 'no_show').length, color: 'text-red-600', bg: 'bg-red-50' },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center border border-slate-100 shadow-sm`}>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1.5">
          {['Today', 'Tomorrow', 'All'].map((d) => (
            <button key={d} onClick={() => setDateFilter(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${dateFilter === d ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {d}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {[{ val: 'all', label: 'All' }, ...Object.entries(STATUS_CONFIG).map(([val, cfg]) => ({ val, label: cfg.label }))].map((f) => (
            <button key={f.val} onClick={() => setStatusFilter(f.val as typeof statusFilter)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap ${statusFilter === f.val ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reservation Cards */}
      <div className="space-y-3">
        {filtered.map((res) => {
          const cfg = STATUS_CONFIG[res.status];
          return (
            <div key={res.id} className={`bg-white rounded-2xl border-2 shadow-sm p-5 transition-all hover:shadow-md ${
              res.status === 'pending' ? 'border-amber-200' : 'border-slate-100'
            }`}>
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                {/* Guest Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-black text-slate-900">{res.customer}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                    {res.table && <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">{res.table}</span>}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {res.guests} guests</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {res.date} at {res.time}</span>
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {res.phone}</span>
                    {res.area && <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-medium">{res.area}</span>}
                  </div>

                  {res.specialRequests && (
                    <div className="mt-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5 flex items-start gap-2">
                      <MessageSquare className="w-3 h-3 text-amber-600 mt-0.5 shrink-0" />
                      <p className="text-[10px] text-amber-800 font-medium">{res.specialRequests}</p>
                    </div>
                  )}

                  {res.preOrderItems && (
                    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold text-slate-400">PRE-ORDER:</span>
                      {res.preOrderItems.map((item) => (
                        <span key={item} className="text-[10px] bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full font-medium">{item}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {res.status === 'pending' && (
                    <>
                      <button onClick={() => updateStatus(res.id, 'confirmed')}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm">
                        <Check className="w-3.5 h-3.5" /> Confirm
                      </button>
                      <button onClick={() => updateStatus(res.id, 'cancelled')}
                        className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-xl text-xs flex items-center gap-1.5 border border-red-200">
                        <X className="w-3.5 h-3.5" /> Decline
                      </button>
                    </>
                  )}
                  {res.status === 'confirmed' && (
                    <button onClick={() => updateStatus(res.id, 'seated')}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm">
                      <UserPlus className="w-3.5 h-3.5" /> Seat Guest
                    </button>
                  )}
                  {res.status === 'seated' && (
                    <button onClick={() => updateStatus(res.id, 'completed')}
                      className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm">
                      <Check className="w-3.5 h-3.5" /> Complete
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <CalendarCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-slate-500 font-bold">No reservations found</h3>
        </div>
      )}
    </div>
  );
}
