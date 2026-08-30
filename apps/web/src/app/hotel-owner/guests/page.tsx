'use client';
import React, { useState } from 'react';
import { UserCheck, UserX, Search, CheckCircle, Clock, ArrowRight, BedDouble, Phone, Mail, Key, QrCode, AlertCircle, User } from 'lucide-react';

import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
type Guest = {
  id: string; bookingId: string; name: string; email: string; phone: string;
  room: string; roomNumber: string; checkin: string; checkout: string;
  status: 'pending' | 'checked_in' | 'checked_out'; idVerified: boolean;
  specialRequests: string;
};

const GUESTS: Guest[] = [
  { id: 'G-001', bookingId: 'HBK-001', name: 'Sarah K.', email: 'sarah@email.com', phone: '+971 50 123 4567', room: 'Deluxe King', roomNumber: '101', checkin: 'Jul 1, 14:00', checkout: 'Jul 3, 12:00', status: 'checked_in', idVerified: true, specialRequests: 'Late check-in requested' },
  { id: 'G-002', bookingId: 'HBK-002', name: 'Amit P.', email: 'amit@email.com', phone: '+91 98765 43210', room: 'Executive Suite', roomNumber: '201', checkin: 'Jul 2, 14:00', checkout: 'Jul 5, 12:00', status: 'pending', idVerified: false, specialRequests: 'Airport pickup needed' },
  { id: 'G-003', bookingId: 'HBK-003', name: 'John D.', email: 'john@email.com', phone: '+44 7700 900123', room: 'Premium Twin', roomNumber: '202', checkin: 'Jun 28, 14:00', checkout: 'Jun 30, 12:00', status: 'checked_in', idVerified: true, specialRequests: 'Extra pillows' },
  { id: 'G-004', bookingId: 'HBK-004', name: 'Maria L.', email: 'maria@email.com', phone: '+971 55 987 6543', room: 'Family Suite', roomNumber: '301', checkin: 'Jun 20, 14:00', checkout: 'Jun 23, 12:00', status: 'checked_out', idVerified: true, specialRequests: 'Baby crib' },
];

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Arriving', color: 'bg-amber-100 text-amber-700' },
  checked_in: { label: 'Checked In', color: 'bg-emerald-100 text-emerald-700' },
  checked_out: { label: 'Checked Out', color: 'bg-slate-100 text-slate-600' },
};

export default function GuestManagementPage() {
  const [guests, setGuests] = useState(GUESTS);
  const [filter, setFilter] = useState('all');
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const checkIn = (id: string) => {
    setGuests(prev => prev.map(g => g.id === id ? { ...g, status: 'checked_in' as const, idVerified: true } : g));
    setSelectedGuest(null);
    showToast('Guest checked in successfully');
  };

  const checkOut = (id: string) => {
    setGuests(prev => prev.map(g => g.id === id ? { ...g, status: 'checked_out' as const } : g));
    setSelectedGuest(null);
    showToast('Guest checked out successfully');
  };

  const filtered = guests.filter(g => filter === 'all' || g.status === filter);

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-slate-900">Guest Management</h1><p className="text-slate-500 text-sm">Check-in, check-out, and manage your guests.</p></div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Arriving Today', count: guests.filter(g => g.status === 'pending').length, color: 'bg-amber-50', icon: <Clock className="w-5 h-5 text-amber-500" /> },
          { label: 'In-House', count: guests.filter(g => g.status === 'checked_in').length, color: 'bg-emerald-50', icon: <UserCheck className="w-5 h-5 text-emerald-500" /> },
          { label: 'Departed', count: guests.filter(g => g.status === 'checked_out').length, color: 'bg-slate-100', icon: <UserX className="w-5 h-5 text-slate-500" /> },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>{s.icon}</div>
            <div><p className="text-2xl font-bold text-slate-900">{s.count}</p><p className="text-[10px] text-slate-400">{s.label}</p></div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'pending', 'checked_in', 'checked_out'] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${filter === s ? 'bg-rose-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {s === 'all' ? 'All' : STATUS_CFG[s].label}
          </button>
        ))}
      </div>

      {/* Guest Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Guest</th>
                <th className="px-5 py-3.5 font-semibold">Room</th>
                <th className="px-5 py-3.5 font-semibold">Dates</th>
                <th className="px-5 py-3.5 font-semibold text-center">ID Verified</th>
                <th className="px-5 py-3.5 font-semibold text-center">Status</th>
                <th className="px-5 py-3.5 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(guest => (
                <tr key={guest.id} className="hover:bg-slate-50/50">
                  <td className="px-5 py-4"><p className="font-bold text-slate-900">{guest.name}</p><p className="text-xs text-slate-400">{guest.bookingId}</p></td>
                  <td className="px-5 py-4"><p className="text-sm text-slate-700">{guest.room}</p><p className="text-xs text-slate-400">Room {guest.roomNumber}</p></td>
                  <td className="px-5 py-4 text-xs text-slate-600">{guest.checkin} <ArrowRight className="w-3 h-3 inline text-slate-300" /> {guest.checkout}</td>
                  <td className="px-5 py-4 text-center">{guest.idVerified ? <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" /> : <AlertCircle className="w-4 h-4 text-amber-500 mx-auto" />}</td>
                  <td className="px-5 py-4 text-center"><span className={`text-[10px] font-bold px-2 py-1 rounded-full ${STATUS_CFG[guest.status].color}`}>{STATUS_CFG[guest.status].label}</span></td>
                  <td className="px-5 py-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {guest.status === 'pending' && <button onClick={() => checkIn(guest.id)} className="text-[10px] font-bold bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1"><UserCheck className="w-3 h-3" /> Check In</button>}
                      {guest.status === 'checked_in' && <button onClick={() => checkOut(guest.id)} className="text-[10px] font-bold bg-slate-600 text-white px-3 py-1.5 rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-1"><UserX className="w-3 h-3" /> Check Out</button>}
                      <button onClick={() => setSelectedGuest(guest)} className="text-xs text-rose-600 font-medium hover:underline ml-2">View</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Guest Detail Modal */}
      {selectedGuest && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelectedGuest(null)}><DismissOnEscape onDismiss={() => setSelectedGuest(null)} />
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">{selectedGuest.name}</h2>
              <button onClick={() => setSelectedGuest(null)} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Booking</span><span className="font-bold">{selectedGuest.bookingId}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Room</span><span>{selectedGuest.room} — #{selectedGuest.roomNumber}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Email</span><span>{selectedGuest.email}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Phone</span><span>{selectedGuest.phone}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Check-in</span><span>{selectedGuest.checkin}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Check-out</span><span>{selectedGuest.checkout}</span></div>
              {selectedGuest.specialRequests && <div className="p-3 bg-amber-50 rounded-xl text-xs"><p className="font-bold text-amber-800 mb-0.5">Special Requests</p><p className="text-amber-600">{selectedGuest.specialRequests}</p></div>}
            </div>
            <div className="flex gap-3 mt-6">
              {selectedGuest.status === 'pending' && <button onClick={() => checkIn(selectedGuest.id)} className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"><UserCheck className="w-4 h-4" /> Check In</button>}
              {selectedGuest.status === 'checked_in' && <button onClick={() => checkOut(selectedGuest.id)} className="flex-1 bg-slate-700 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"><UserX className="w-4 h-4" /> Check Out</button>}
              <button onClick={() => setSelectedGuest(null)} className="flex-1 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-400" /> {toast}</div>}
    </div>
  );
}
