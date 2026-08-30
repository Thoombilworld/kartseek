'use client';
import React, { useState } from 'react';
import { CalendarCheck, ArrowRight, Eye, X, User, BedDouble, CreditCard, Phone, Mail, CheckCircle } from 'lucide-react';

import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
type Booking = { id: string; guest: string; email: string; phone: string; room: string; checkin: string; checkout: string; nights: number; guests: number; amount: number; currency: string; status: string; paymentMethod: string; specialRequests: string };
const stCfg: Record<string, { bg: string; l: string }> = { confirmed: { bg: 'bg-blue-100 text-blue-700', l: 'Confirmed' }, checked_in: { bg: 'bg-emerald-100 text-emerald-700', l: 'Checked In' }, completed: { bg: 'bg-slate-100 text-slate-600', l: 'Completed' }, cancelled: { bg: 'bg-red-100 text-red-700', l: 'Cancelled' } };

const INITIAL: Booking[] = [
  { id: 'HBK-001', guest: 'Sarah K.', email: 'sarah@email.com', phone: '+971 50 123 4567', room: 'Deluxe King', checkin: '2026-07-01', checkout: '2026-07-03', nights: 2, guests: 2, amount: 1035, currency: 'AED', status: 'confirmed', paymentMethod: 'Visa ending 4242', specialRequests: 'Late check-in requested (11 PM)' },
  { id: 'HBK-002', guest: 'Amit P.', email: 'amit@email.com', phone: '+91 98765 43210', room: 'Executive Suite', checkin: '2026-07-02', checkout: '2026-07-05', nights: 3, guests: 2, amount: 2925, currency: 'AED', status: 'confirmed', paymentMethod: 'Mastercard ending 8888', specialRequests: 'Airport pickup needed' },
  { id: 'HBK-003', guest: 'John D.', email: 'john@email.com', phone: '+44 7700 900123', room: 'Premium Twin', checkin: '2026-06-28', checkout: '2026-06-30', nights: 2, guests: 1, amount: 1196, currency: 'AED', status: 'checked_in', paymentMethod: 'Amex ending 1234', specialRequests: 'Extra pillows' },
  { id: 'HBK-004', guest: 'Maria L.', email: 'maria@email.com', phone: '+971 55 987 6543', room: 'Family Suite', checkin: '2026-06-20', checkout: '2026-06-23', nights: 3, guests: 4, amount: 3381, currency: 'AED', status: 'completed', paymentMethod: 'Visa ending 5555', specialRequests: 'Baby crib in room' },
  { id: 'HBK-005', guest: 'David W.', email: 'david@email.com', phone: '+1 555 123 4567', room: 'Deluxe King', checkin: '2026-06-18', checkout: '2026-06-19', nights: 1, guests: 2, amount: 517, currency: 'AED', status: 'cancelled', paymentMethod: 'PayPal', specialRequests: '' },
];

export default function OwnerBookingsPage() {
  const [bookings, setBookings] = useState(INITIAL);
  const [sf, setSf] = useState('All');
  const [selected, setSelected] = useState<Booking | null>(null);
  const [toast, setToast] = useState('');
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const f = bookings.filter(b => sf === 'All' || b.status === sf);

  const updateStatus = (id: string, newStatus: string) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: newStatus } : b));
    setSelected(prev => prev && prev.id === id ? { ...prev, status: newStatus } : prev);
    showToast(`Booking ${id} status updated to ${stCfg[newStatus]?.l || newStatus}`);
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-slate-900">Booking Management</h1><p className="text-slate-500 text-sm">View and manage guest bookings.</p></div>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {['All', 'confirmed', 'checked_in', 'completed', 'cancelled'].map(s => (
          <button key={s} onClick={() => setSf(s)} className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${sf === s ? 'bg-rose-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{s === 'All' ? 'All' : stCfg[s].l}</button>
        ))}
      </div>
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr><th className="px-5 py-3.5 font-semibold">Guest</th><th className="px-5 py-3.5 font-semibold">Room</th><th className="px-5 py-3.5 font-semibold">Dates</th><th className="px-5 py-3.5 font-semibold text-right">Amount</th><th className="px-5 py-3.5 font-semibold text-center">Status</th><th className="px-5 py-3.5 font-semibold text-center">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">{f.map(b => (
              <tr key={b.id} className="hover:bg-slate-50/50">
                <td className="px-5 py-4"><p className="font-bold text-slate-900">{b.guest}</p><p className="text-xs text-slate-400">{b.id} · {b.guests} guests</p></td>
                <td className="px-5 py-4 text-sm text-slate-600">{b.room}</td>
                <td className="px-5 py-4"><p className="text-sm text-slate-900">{b.checkin} <ArrowRight className="w-3 h-3 inline text-slate-400" /> {b.checkout}</p><p className="text-xs text-slate-400">{b.nights} nights</p></td>
                <td className="px-5 py-4 text-right font-bold">{b.currency} {b.amount.toLocaleString()}</td>
                <td className="px-5 py-4 text-center"><span className={`${stCfg[b.status].bg} px-2.5 py-1 rounded-full text-xs font-bold`}>{stCfg[b.status].l}</span></td>
                <td className="px-5 py-4 text-center"><button title="View booking" onClick={() => setSelected(b)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"><Eye className="w-3.5 h-3.5" /></button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      {/* Booking Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}><DismissOnEscape onDismiss={() => setSelected(null)} />
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-900">Booking {selected.id}</h3>
              <button onClick={() => setSelected(null)} title="Close" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-5 space-y-5">
              {/* Guest Info */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase">Guest Information</p>
                <div className="flex items-center gap-3"><User className="w-4 h-4 text-slate-400" /><span className="font-bold text-slate-900">{selected.guest}</span><span className={`${stCfg[selected.status].bg} px-2 py-0.5 rounded-full text-[10px] font-bold`}>{stCfg[selected.status].l}</span></div>
                <div className="flex items-center gap-3"><Mail className="w-4 h-4 text-slate-400" /><span className="text-sm text-slate-600">{selected.email}</span></div>
                <div className="flex items-center gap-3"><Phone className="w-4 h-4 text-slate-400" /><span className="text-sm text-slate-600">{selected.phone}</span></div>
              </div>
              {/* Stay Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-xl p-3"><p className="text-[10px] font-bold text-blue-500 uppercase">Room</p><p className="font-bold text-blue-900 flex items-center gap-1"><BedDouble className="w-3.5 h-3.5" />{selected.room}</p></div>
                <div className="bg-emerald-50 rounded-xl p-3"><p className="text-[10px] font-bold text-emerald-500 uppercase">Total</p><p className="font-bold text-emerald-900 flex items-center gap-1"><CreditCard className="w-3.5 h-3.5" />{selected.currency} {selected.amount.toLocaleString()}</p></div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 space-y-1">
                <p className="text-xs font-bold text-slate-400 uppercase">Stay Period</p>
                <p className="text-sm text-slate-900 font-medium">{selected.checkin} → {selected.checkout} <span className="text-slate-400">({selected.nights} nights, {selected.guests} guests)</span></p>
                <p className="text-xs text-slate-500">Payment: {selected.paymentMethod}</p>
                {selected.specialRequests && <p className="text-xs text-slate-500">Special requests: {selected.specialRequests}</p>}
              </div>
              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                {selected.status === 'confirmed' && (
                  <button onClick={() => updateStatus(selected.id, 'checked_in')} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors">Check In</button>
                )}
                {selected.status === 'checked_in' && (
                  <button onClick={() => updateStatus(selected.id, 'completed')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors">Check Out</button>
                )}
                {(selected.status === 'confirmed' || selected.status === 'checked_in') && (
                  <button onClick={() => updateStatus(selected.id, 'cancelled')} className="bg-white hover:bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-bold border border-red-200 transition-colors">Cancel Booking</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50">
          <CheckCircle className="w-4 h-4" /><span className="text-sm font-bold">{toast}</span>
        </div>
      )}
    </div>
  );
}
