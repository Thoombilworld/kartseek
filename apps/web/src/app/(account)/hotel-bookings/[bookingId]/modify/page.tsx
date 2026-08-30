'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, CalendarDays, BedDouble, Users, AlertTriangle, Check, ArrowRight, Shield, RefreshCw } from 'lucide-react';

export default function ModifyBookingPage() {
  const { bookingId } = useParams();
  const [newCheckIn, setNewCheckIn] = useState('2026-07-05');
  const [newCheckOut, setNewCheckOut] = useState('2026-07-07');
  const [newGuests, setNewGuests] = useState(2);
  const [newRooms, setNewRooms] = useState(1);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href={`/hotel-bookings/${bookingId}`} className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center transition-colors"><ArrowLeft className="w-4 h-4" /></Link>
          <h1 className="text-lg font-bold text-slate-900">Modify Booking</h1>
        </div>
      </header>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">Modifications are subject to availability. Price may change based on new dates and room availability.</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="font-bold text-slate-900 mb-4">Change Dates</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs font-medium text-slate-600 mb-1 block" htmlFor="new-check-in">New Check-in</label><input id="new-check-in" type="date" aria-label="New check-in date" value={newCheckIn} onChange={e => setNewCheckIn(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-rose-500 transition-all" /></div>
            <div><label className="text-xs font-medium text-slate-600 mb-1 block" htmlFor="new-check-out">New Check-out</label><input id="new-check-out" type="date" aria-label="New check-out date" value={newCheckOut} onChange={e => setNewCheckOut(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-rose-500 transition-all" /></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="font-bold text-slate-900 mb-4">Change Guests & Rooms</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs font-medium text-slate-600 mb-1 block" htmlFor="guests">Guests</label><select id="guests" aria-label="Number of guests" value={newGuests} onChange={e => setNewGuests(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-rose-500">{[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} Guest{n > 1 ? 's' : ''}</option>)}</select></div>
            <div><label className="text-xs font-medium text-slate-600 mb-1 block" htmlFor="rooms">Rooms</label><select id="rooms" aria-label="Number of rooms" value={newRooms} onChange={e => setNewRooms(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-rose-500">{[1,2,3,4,5].map(n => <option key={n} value={n}>{n} Room{n > 1 ? 's' : ''}</option>)}</select></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-bold text-slate-900 mb-3">Price Comparison</h3>
          <div className="text-sm space-y-2">
            <div className="flex justify-between"><span className="text-slate-500">Original Total</span><span>AED 1,046</span></div>
            <div className="flex justify-between"><span className="text-slate-500">New Total (estimated)</span><span className="font-bold text-slate-900">AED 1,046</span></div>
            <div className="flex justify-between text-emerald-600"><span>Difference</span><span className="font-bold">AED 0</span></div>
          </div>
        </div>
        <button className="w-full bg-rose-600 text-white font-bold py-4 rounded-2xl hover:bg-rose-700 transition-colors flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4" /> Confirm Modification
        </button>
      </div>
    </div>
  );
}
