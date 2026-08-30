'use client';
import { useHotelRegionFilter } from '@/hooks/useHotelRegionFilter';
import React, { useState, useEffect } from 'react';
import { Building2, Search, Star, MapPin, Phone, Mail, Globe, CheckCircle, XCircle, Clock, Eye, FileCheck, BedDouble, Users } from 'lucide-react';
import { adminHotelApi } from '@/lib/api/admin-hotel';

const hotels = [
  { id:'HTL-001',name:'The Grand Palace Hotel',city:'Dubai',country:'AE',address:'Sheikh Zayed Road, Downtown Dubai',owner:'Ahmed Al Maktoum',email:'ahmed@grandpalace.ae',phone:'+971 50 123 4567',rating:4.8,starRating:5,type:'Luxury',rooms:120,images:4,amenities:12,status:'active',verified:true,documents:['Trade License','Tourism License','Insurance','Fire Safety'],registeredAt:'2025-01-15'},
  { id:'HTL-002',name:'KARTSEEK Business Suites',city:'Doha',country:'QA',address:'West Bay, Doha',owner:'Khalid Al Thani',email:'khalid@kbsuites.qa',phone:'+974 55 987 6543',rating:4.6,starRating:4,type:'Business',rooms:85,images:6,amenities:10,status:'active',verified:true,documents:['Trade License','Tourism License','Insurance'],registeredAt:'2025-03-20'},
  { id:'HTL-003',name:'Seaside Family Resort',city:'Mumbai',country:'IN',address:'Marine Drive, South Mumbai',owner:'Priya Sharma',email:'priya@seaside.in',phone:'+91 98765 43210',rating:4.7,starRating:5,type:'Resort',rooms:200,images:8,amenities:15,status:'active',verified:true,documents:['FSSAI','GST Registration','Fire NOC','Tourism License'],registeredAt:'2024-11-10'},
  { id:'HTL-004',name:'Budget Inn Express',city:'Riyadh',country:'SA',address:'Olaya Street, Riyadh',owner:'Omar Al Saud',email:'omar@budgetinn.sa',phone:'+966 50 111 2222',rating:4.1,starRating:3,type:'Budget',rooms:40,images:2,amenities:5,status:'suspended',verified:false,documents:['Trade License'],registeredAt:'2025-06-01'},
  { id:'HTL-006',name:'Oasis Desert Resort',city:'Muscat',country:'OM',address:'Al Bustan, Muscat',owner:'Said Al Busaidi',email:'said@oasis.om',phone:'+968 99 123 456',rating:0,starRating:4,type:'Resort',rooms:60,images:0,amenities:0,status:'pending',verified:false,documents:[],registeredAt:'2026-06-10'},
];

export default function HotelListPage(){
  const { regionLabel, isFiltered, formatPrice } = useHotelRegionFilter([]);
  const [search,setSearch]=useState('');
  const [filter,setFilter]=useState('All');
  const filtered=hotels.filter(h=>{
    const ms=h.name.toLowerCase().includes(search.toLowerCase())||h.city.toLowerCase().includes(search.toLowerCase());
    const fs=filter==='All'||h.status===filter;
    return ms&&fs;
  });

  return(<div className="space-y-6">
    <div><h1 className="text-2xl font-bold text-slate-900">Hotel Management</h1><p className="text-slate-500 text-sm">Onboard, verify, and manage all hotel properties.</p></div>

    <div className="flex gap-3 flex-wrap">
      <div className="flex-1 min-w-[200px] relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input placeholder="Search by name or city..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"/></div>
      <select aria-label="Filter by status" value={filter} onChange={e=>setFilter(e.target.value)} className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white"><option value="All">All Status</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="pending">Pending</option></select>
    </div>

    <div className="grid gap-4">
      {filtered.map(h=>(<div key={h.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-bold text-lg text-slate-900">{h.name}</h3>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${h.status==='active'?'bg-emerald-100 text-emerald-700':h.status==='pending'?'bg-blue-100 text-blue-700':'bg-amber-100 text-amber-700'}`}>{h.status.charAt(0).toUpperCase()+h.status.slice(1)}</span>
              <span className="text-xs text-amber-500 font-bold">{'⭐'.repeat(h.starRating)}</span>
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-slate-500 mb-3">
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3"/>{h.address}</span>
              <span className="flex items-center gap-1"><Globe className="w-3 h-3"/>{h.city}, {h.country}</span>
              <span className="flex items-center gap-1"><Users className="w-3 h-3"/>{h.owner}</span>
              <span className="flex items-center gap-1"><Phone className="w-3 h-3"/>{h.phone}</span>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded text-[10px] font-bold">{h.type}</span>
              <span className="bg-slate-50 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold"><BedDouble className="w-3 h-3 inline mr-1"/>{h.rooms} Rooms</span>
              {h.rating>0&&<span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold"><Star className="w-3 h-3 inline mr-1"/>{h.rating}</span>}
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${h.verified?'bg-emerald-50 text-emerald-700':'bg-red-50 text-red-700'}`}><FileCheck className="w-3 h-3 inline mr-1"/>{h.verified?'Verified':'Unverified'}</span>
            </div>
            {h.documents.length>0&&<div className="flex flex-wrap gap-1">{h.documents.map(d=><span key={d} className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[9px] font-medium">{d}</span>)}</div>}
          </div>
          <div className="flex flex-col gap-2">
            {h.status==='pending'&&<button className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3"/>Approve</button>}
            <button className="bg-white hover:bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 flex items-center gap-1"><Eye className="w-3 h-3"/>View</button>
          </div>
        </div>
      </div>))}
    </div>
  </div>);
}
