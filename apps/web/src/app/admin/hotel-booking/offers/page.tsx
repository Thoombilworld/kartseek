'use client';
import { useHotelRegionFilter } from '@/hooks/useHotelRegionFilter';
import React, { useState, useEffect } from 'react';
import { Gift, Edit, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { BarFill } from '@/components/bar-fill';
import { adminHotelApi } from '@/lib/api/admin-hotel';
const offers=[
  {id:'OFF-001',title:'Summer Getaway 20% OFF',code:'SUMMER20',type:'percentage',value:20,minBooking:500,currency:'AED',startDate:'2026-06-01',endDate:'2026-08-31',usageLimit:1000,used:340,status:'active',hotels:'All Hotels'},
  // cspell:disable-next-line
  {id:'OFF-002',title:'Free Breakfast Stay',code:'BREKKIE',type:'freebie',value:0,minBooking:300,currency:'AED',startDate:'2026-06-15',endDate:'2026-07-15',usageLimit:500,used:120,status:'active',hotels:'The Grand Palace Hotel, Heritage Boutique Hotel'},
  {id:'OFF-003',title:'Suite Upgrade Offer',code:'UPGRADE25',type:'upgrade',value:25,minBooking:800,currency:'AED',startDate:'2026-07-01',endDate:'2026-09-30',usageLimit:200,used:0,status:'scheduled',hotels:'The Grand Palace Hotel'},
  // cspell:disable-next-line
  {id:'OFF-004',title:'Early Bird 15% OFF',code:'EARLYBIRD15',type:'percentage',value:15,minBooking:400,currency:'AED',startDate:'2026-03-01',endDate:'2026-05-31',usageLimit:800,used:800,status:'expired',hotels:'All Hotels'},
];
const stCfg:Record<string,string>={active:'bg-emerald-100 text-emerald-700',scheduled:'bg-blue-100 text-blue-700',expired:'bg-slate-100 text-slate-500',paused:'bg-amber-100 text-amber-700'};
export default function OffersPage(){
  const { regionLabel, isFiltered, formatPrice } = useHotelRegionFilter([]);
  return(<div className="space-y-6">
    <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold text-slate-900">Offers & Campaigns</h1><p className="text-slate-500 text-sm">Manage coupons, promotions, and featured hotel deals.</p></div><button className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5"><Gift className="w-4 h-4"/>Create Offer</button></div>
    <div className="grid gap-4">{offers.map(o=>(
      <div key={o.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2"><h3 className="font-bold text-lg text-slate-900">{o.title}</h3><span className={`${stCfg[o.status]} px-2 py-0.5 rounded-full text-[10px] font-bold`}>{o.status.charAt(0).toUpperCase()+o.status.slice(1)}</span></div>
            <div className="flex flex-wrap gap-4 text-xs text-slate-500 mb-2">
              <span className="font-mono bg-slate-100 px-2 py-0.5 rounded font-bold">{o.code}</span>
              <span>{o.type==='percentage'?`${o.value}% OFF`:o.type==='upgrade'?`${o.value}% Upgrade`:'Free Benefit'}</span>
              <span>Min: {o.currency} {o.minBooking}</span>
              <span>{o.startDate} → {o.endDate}</span>
            </div>
            <p className="text-xs text-slate-400">Hotels: {o.hotels}</p>
            <div className="mt-2"><div className="flex items-center gap-2"><div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden"><BarFill width={`${(o.used/o.usageLimit)*100}%`} className="h-full rounded-full bg-rose-500"/></div><span className="text-xs font-bold text-slate-500">{o.used}/{o.usageLimit} used</span></div></div>
          </div>
          <div className="flex gap-1">
            <button title="Edit offer" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><Edit className="w-3.5 h-3.5"/></button>
            <button title="Delete offer" className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 className="w-3.5 h-3.5"/></button>
          </div>
        </div>
      </div>
    ))}</div>
  </div>);
}
