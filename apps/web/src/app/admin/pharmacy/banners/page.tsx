'use client';
import { usePharmacyRegionFilter } from '@/hooks/usePharmacyRegionFilter';
import React, { useState } from 'react';
import { Image, Plus, Trash2, Eye, EyeOff, Calendar } from 'lucide-react';

const initBanners = [
  { id:'B01',title:'Flat 25% OFF',subtitle:'On all OTC medicines',position:'Home Top',status:'active' as const,clicks:2400,startDate:'10 Jun 2026',endDate:'20 Jun 2026' },
  { id:'B02',title:'Free Delivery Week',subtitle:'Orders above ₹499',position:'Home Middle',status:'active' as const,clicks:1800,startDate:'12 Jun 2026',endDate:'19 Jun 2026' },
  { id:'B03',title:'Baby Care Sale',subtitle:'Up to 30% off',position:'Category',status:'scheduled' as const,clicks:0,startDate:'15 Jun 2026',endDate:'25 Jun 2026' },
  { id:'B04',title:'Diabetes Awareness',subtitle:'Free glucose check',position:'Home Bottom',status:'expired' as const,clicks:3200,startDate:'1 Jun 2026',endDate:'10 Jun 2026' },
];

const stCfg:Record<string,string>={active:'bg-emerald-100 text-emerald-700',scheduled:'bg-blue-100 text-blue-700',expired:'bg-slate-100 text-slate-500'};

export default function PharmacyBannersPage() {
  const { regionLabel, isFiltered, formatPrice } = usePharmacyRegionFilter([]);
  const [data,setData]=useState(initBanners);
  const toggle=(id:string)=>setData(p=>p.map(b=>b.id===id?{...b,status:b.status==='active'?'expired' as const:'active' as const}:b));

  return(<div className="space-y-6">
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div><h1 className="text-2xl font-bold text-slate-900">Banner Management</h1><p className="text-slate-500 text-sm">Manage promotional banners shown on customer pharmacy pages.</p></div>
      <button className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2"><Plus className="w-4 h-4"/>Add Banner</button>
    </div>
    <div className="grid gap-4">{data.map(b=>(
      <div key={b.id} className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-linear-to-br from-cyan-500 to-cyan-600 rounded-xl flex items-center justify-center"><Image className="w-7 h-7 text-white"/></div>
            <div><p className="font-bold text-slate-900 text-lg">{b.title}</p><p className="text-sm text-slate-500">{b.subtitle}</p>
              <div className="flex gap-3 mt-2 text-xs text-slate-400"><span className="flex items-center gap-1"><Calendar className="w-3 h-3"/>{b.startDate} – {b.endDate}</span><span>Position: {b.position}</span><span>Clicks: {b.clicks.toLocaleString()}</span></div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`${stCfg[b.status]} px-2.5 py-1 rounded-full text-xs font-bold capitalize`}>{b.status}</span>
            <button onClick={()=>toggle(b.id)} className="p-2 rounded-lg hover:bg-slate-100">{b.status==='active'?<EyeOff className="w-4 h-4 text-slate-400"/>:<Eye className="w-4 h-4 text-emerald-500"/>}</button>
            <button className="p-2 rounded-lg hover:bg-red-50" aria-label="Delete"><Trash2 className="w-4 h-4 text-red-400"/></button>
          </div>
        </div>
      </div>
    ))}</div>
  </div>);
}
