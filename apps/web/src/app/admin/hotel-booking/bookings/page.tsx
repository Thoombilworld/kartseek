'use client';
import { useHotelRegionFilter } from '@/hooks/useHotelRegionFilter';
import React, { useState, useEffect } from 'react';
import { CalendarCheck, Search, Eye, XCircle, Clock, CheckCircle, ArrowRight } from 'lucide-react';
import { adminHotelApi } from '@/lib/api/admin-hotel';
const bookings=[
  {id:'HBK-001',hotel:'The Grand Palace Hotel',guest:'Sarah K.',room:'Deluxe King',checkin:'2026-07-01',checkout:'2026-07-03',nights:2,guests:2,rooms:1,amount:1035,currency:'AED',status:'confirmed',paymentStatus:'paid',bookedAt:'2026-06-14',commission:155},
  {id:'HBK-002',hotel:'Seaside Family Resort',guest:'Amit P.',room:'Family Suite',checkin:'2026-07-05',checkout:'2026-07-08',nights:3,guests:4,rooms:1,amount:2814,currency:'INR',status:'confirmed',paymentStatus:'paid',bookedAt:'2026-06-12',commission:422},
  {id:'HBK-003',hotel:'Budget Inn Express',guest:'John D.',room:'Standard Room',checkin:'2026-06-28',checkout:'2026-06-30',nights:2,guests:1,rooms:1,amount:276,currency:'SAR',status:'cancelled',paymentStatus:'refunded',bookedAt:'2026-06-10',commission:0},
  {id:'HBK-004',hotel:'The Grand Palace Hotel',guest:'Maria L.',room:'Executive Suite',checkin:'2026-06-25',checkout:'2026-06-27',nights:2,guests:2,rooms:1,amount:1954,currency:'AED',status:'checked-in',paymentStatus:'paid',bookedAt:'2026-06-08',commission:293},
  {id:'HBK-005',hotel:'Heritage Boutique Hotel',guest:'David W.',room:'Heritage Suite',checkin:'2026-06-20',checkout:'2026-06-23',nights:3,guests:2,rooms:1,amount:2850,currency:'GBP',status:'completed',paymentStatus:'paid',bookedAt:'2026-06-01',commission:427},
];
const stCfg:Record<string,{bg:string;l:string}>={confirmed:{bg:'bg-blue-100 text-blue-700',l:'Confirmed'},'checked-in':{bg:'bg-emerald-100 text-emerald-700',l:'Checked In'},completed:{bg:'bg-slate-100 text-slate-600',l:'Completed'},cancelled:{bg:'bg-red-100 text-red-700',l:'Cancelled'}};
export default function BookingsPage(){
  const { regionLabel, isFiltered, formatPrice } = useHotelRegionFilter([]);
  const [search,setSearch]=useState('');const [sf,setSf]=useState('All');
  const f=bookings.filter(b=>{const ms=b.guest.toLowerCase().includes(search.toLowerCase())||b.hotel.toLowerCase().includes(search.toLowerCase())||b.id.toLowerCase().includes(search.toLowerCase());const fs=sf==='All'||b.status===sf;return ms&&fs;});
  return(<div className="space-y-6">
    <div><h1 className="text-2xl font-bold text-slate-900">Booking Management</h1><p className="text-slate-500 text-sm">View and manage all hotel bookings across properties.</p></div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4"><p className="text-2xl font-black text-blue-700">{bookings.filter(b=>b.status==='confirmed').length}</p><p className="text-xs font-medium text-blue-600">Confirmed</p></div>
      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4"><p className="text-2xl font-black text-emerald-700">{bookings.filter(b=>b.status==='checked-in').length}</p><p className="text-xs font-medium text-emerald-600">Checked In</p></div>
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4"><p className="text-2xl font-black text-slate-700">{bookings.filter(b=>b.status==='completed').length}</p><p className="text-xs font-medium text-slate-500">Completed</p></div>
      <div className="bg-red-50 border border-red-100 rounded-xl p-4"><p className="text-2xl font-black text-red-700">{bookings.filter(b=>b.status==='cancelled').length}</p><p className="text-xs font-medium text-red-600">Cancelled</p></div>
    </div>
    <div className="flex gap-3"><div className="flex-1 relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input placeholder="Search bookings..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"/></div>
      <select aria-label="Filter by status" value={sf} onChange={e=>setSf(e.target.value)} className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white"><option value="All">All Status</option><option value="confirmed">Confirmed</option><option value="checked-in">Checked In</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div>
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left text-sm">
      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200"><tr><th className="px-5 py-3.5 font-semibold">Booking</th><th className="px-5 py-3.5 font-semibold">Hotel</th><th className="px-5 py-3.5 font-semibold">Dates</th><th className="px-5 py-3.5 font-semibold text-right">Amount</th><th className="px-5 py-3.5 font-semibold text-right">Commission</th><th className="px-5 py-3.5 font-semibold text-center">Status</th><th className="px-5 py-3.5 font-semibold text-center">Actions</th></tr></thead>
      <tbody className="divide-y divide-slate-100">{f.map(b=>(
        <tr key={b.id} className="hover:bg-slate-50/50">
          <td className="px-5 py-4"><p className="font-bold text-slate-900">{b.guest}</p><p className="text-xs text-slate-400">{b.id} • {b.room} • {b.guests} guests</p></td>
          <td className="px-5 py-4 text-sm text-slate-600">{b.hotel}</td>
          <td className="px-5 py-4"><p className="text-sm font-medium text-slate-900">{b.checkin} <ArrowRight className="w-3 h-3 inline text-slate-400"/> {b.checkout}</p><p className="text-xs text-slate-400">{b.nights} nights</p></td>
          <td className="px-5 py-4 text-right font-bold">{b.currency} {b.amount.toLocaleString()}</td>
          <td className="px-5 py-4 text-right text-sm text-emerald-600 font-bold">{b.currency} {b.commission}</td>
          <td className="px-5 py-4 text-center"><span className={`${stCfg[b.status].bg} px-2.5 py-1 rounded-full text-xs font-bold`}>{stCfg[b.status].l}</span></td>
          <td className="px-5 py-4 text-center"><button title="View booking details" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><Eye className="w-3.5 h-3.5"/></button></td>
        </tr>
      ))}</tbody></table></div></div>
  </div>);
}
