'use client';
import React from 'react';
import { CalendarCheck, BedDouble, DollarSign, Star, TrendingUp, Users, AlertTriangle, Clock, ArrowRight, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function HotelOwnerDashboard() {
  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-linear-to-r from-rose-600 to-pink-600 rounded-2xl p-6 text-white shadow-lg">
        <h1 className="text-2xl font-black mb-1">Welcome back, Ahmed! 👋</h1>
        <p className="text-white/80 text-sm">Here&apos;s what&apos;s happening at The Grand Palace Hotel today.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <CalendarCheck className="w-5 h-5 text-blue-500 mb-2" />
          <p className="text-2xl font-black text-slate-900">12</p>
          <p className="text-xs text-slate-500 font-medium">Today&apos;s Bookings</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <Users className="w-5 h-5 text-emerald-500 mb-2" />
          <p className="text-2xl font-black text-slate-900">8</p>
          <p className="text-xs text-slate-500 font-medium">Upcoming Check-ins</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <TrendingUp className="w-5 h-5 text-rose-500 mb-2" />
          <p className="text-2xl font-black text-slate-900">87%</p>
          <p className="text-xs text-slate-500 font-medium">Occupancy Rate</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <Star className="w-5 h-5 text-amber-500 mb-2" />
          <p className="text-2xl font-black text-slate-900">4.8</p>
          <p className="text-xs text-slate-500 font-medium">Customer Rating</p>
        </div>
      </div>

      {/* Revenue & Payouts */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5">
          <DollarSign className="w-5 h-5 text-emerald-600 mb-2" />
          <p className="text-xs text-emerald-600 font-medium mb-1">Monthly Revenue</p>
          <p className="text-2xl font-black text-emerald-700">AED 120,000</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-5">
          <DollarSign className="w-5 h-5 text-amber-600 mb-2" />
          <p className="text-xs text-amber-600 font-medium mb-1">Pending Payout</p>
          <p className="text-2xl font-black text-amber-700">AED 45,000</p>
          <p className="text-[10px] text-amber-500 mt-1">Commission: AED 18K · Tax: AED 12K</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
          <BedDouble className="w-5 h-5 text-blue-600 mb-2" />
          <p className="text-xs text-blue-600 font-medium mb-1">Room Availability</p>
          <p className="text-2xl font-black text-blue-700">16 / 120</p>
          <p className="text-[10px] text-blue-500 mt-1">104 occupied · 0 maintenance</p>
        </div>
      </div>

      {/* Alerts */}
      <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
        <div><p className="text-sm font-bold text-red-700">Low Inventory Alert</p><p className="text-xs text-red-600">Executive Suite has only 1 room available. Consider adjusting pricing or availability.</p></div>
      </div>

      {/* Today's Activity */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Upcoming Check-ins */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-rose-500" /> Today&apos;s Check-ins</h3>
          <div className="space-y-3">
            {[
              { guest: 'Sarah K.', room: 'Deluxe King', time: '14:00', status: 'confirmed' },
              { guest: 'John D.', room: 'Executive Suite', time: '15:00', status: 'confirmed' },
              { guest: 'Maria L.', room: 'Premium Twin', time: '16:30', status: 'pending' },
            ].map((ci, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div><p className="font-bold text-sm text-slate-900">{ci.guest}</p><p className="text-xs text-slate-400">{ci.room} · {ci.time}</p></div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ci.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{ci.status === 'confirmed' ? 'Confirmed' : 'Pending'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Reviews */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Star className="w-4 h-4 text-amber-500" /> Recent Reviews</h3>
          <div className="space-y-3">
            {[
              { guest: 'Sarah K.', rating: 5, comment: 'Absolutely stunning hotel!', date: 'Jun 1' },
              { guest: 'Amit P.', rating: 4, comment: 'Great location, clean rooms.', date: 'May 28' },
            ].map((r, i) => (
              <div key={i} className="p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-bold text-sm text-slate-900">{r.guest}</p>
                  <div className="flex gap-0.5">{Array.from({ length: 5 }).map((_, j) => <Star key={j} className={`w-3 h-3 ${j < r.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />)}</div>
                </div>
                <p className="text-xs text-slate-500">{r.comment}</p>
              </div>
            ))}
            <Link href="/hotel-owner/reviews" className="text-xs font-semibold text-rose-600 flex items-center gap-1 hover:gap-2 transition-all">View all reviews <ArrowRight className="w-3 h-3" /></Link>
          </div>
        </div>
      </div>
    </div>
  );
}
