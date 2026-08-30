'use client';
import React, { useState, useEffect } from 'react';
import { Hotel, Search, Star, Eye, Ban, CheckCircle, Clock, XCircle, DollarSign, AlertTriangle, ChevronDown, ChevronUp, Phone, FileCheck, CalendarCheck, Building2, TrendingUp, BedDouble, Users, BarChart3, Percent } from 'lucide-react';
import { BarFill } from '@/components/bar-fill';
import { useHotelRegionFilter } from '@/hooks/useHotelRegionFilter';
import { adminHotelApi } from '@/lib/api/admin-hotel';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
type HotelStatus = 'active' | 'suspended' | 'blocked' | 'pending';

interface HotelEntry {
  id: string; name: string; city: string; country: string; owner: string; phone: string;
  rating: number; bookings: number; revenue: number; rooms: number; occupancy: number;
  status: HotelStatus; license: string; expiry: string; complaints: number; lastActive: string;
  type: string; starRating: number;
}

const init: HotelEntry[] = [
  // cspell:disable-next-line
  { id:'HTL-001',name:'The Grand Palace Hotel',city:'Dubai',country:'AE',owner:'Ahmed Al Maktoum',phone:'+971 50 123 4567',rating:4.8,bookings:3200,revenue:5140000,rooms:120,occupancy:87,status:'active',license:'Verified',expiry:'Mar 2028',complaints:3,lastActive:'Now',type:'Luxury',starRating:5},
  // cspell:disable-next-line
  { id:'HTL-002',name:'KARTSEEK Business Suites',city:'Doha',country:'QA',owner:'Khalid Al Thani',phone:'+974 55 987 6543',rating:4.6,bookings:1800,revenue:980000,rooms:85,occupancy:72,status:'active',license:'Verified',expiry:'Jun 2027',complaints:1,lastActive:'5 min ago',type:'Business',starRating:4},
  { id:'HTL-003',name:'Seaside Family Resort',city:'Mumbai',country:'IN',owner:'Priya Sharma',phone:'+91 98765 43210',rating:4.7,bookings:4500,revenue:28000000,rooms:200,occupancy:91,status:'active',license:'Verified',expiry:'Dec 2027',complaints:8,lastActive:'1 hr ago',type:'Resort',starRating:5},
  { id:'HTL-004',name:'Budget Inn Express',city:'Riyadh',country:'SA',owner:'Omar Al Saud',phone:'+966 50 111 2222',rating:4.1,bookings:650,revenue:320000,rooms:40,occupancy:35,status:'suspended',license:'Under Review',expiry:'Under Review',complaints:15,lastActive:'3 days ago',type:'Budget',starRating:3},
  { id:'HTL-005',name:'Heritage Boutique Hotel',city:'London',country:'GB',owner:'James Clarke',phone:'+44 20 7123 4567',rating:4.9,bookings:2100,revenue:1200000,rooms:45,occupancy:95,status:'active',license:'Verified',expiry:'Sep 2028',complaints:0,lastActive:'Now',type:'Boutique',starRating:5},
  // cspell:disable-next-line
  { id:'HTL-006',name:'Oasis Desert Resort',city:'Muscat',country:'OM',owner:'Said Al Busaidi',phone:'+968 99 123 456',rating:0,bookings:0,revenue:0,rooms:60,occupancy:0,status:'pending',license:'Pending',expiry:'Pending',complaints:0,lastActive:'New',type:'Resort',starRating:4},
  { id:'HTL-007',name:'Taj Lake Palace',city:'Udaipur',country:'IN',owner:'Vikram Singh',phone:'+91 87654 32100',rating:4.9,bookings:3100,revenue:45000000,rooms:75,occupancy:94,status:'active',license:'Verified',expiry:'Oct 2028',complaints:1,lastActive:'Now',type:'Luxury',starRating:5},
  { id:'HTL-008',name:'Address Downtown',city:'Abu Dhabi',country:'AE',owner:'Hassan Malik',phone:'+971 55 456 7890',rating:4.7,bookings:2700,revenue:3800000,rooms:160,occupancy:82,status:'active',license:'Verified',expiry:'Mar 2028',complaints:2,lastActive:'10 min ago',type:'Luxury',starRating:5},
  { id:'HTL-009',name:'Mama Noura Hotel',city:'Jeddah',country:'SA',owner:'Khalid Al-Rashid',phone:'+966 55 789 0123',rating:4.3,bookings:1900,revenue:720000,rooms:90,occupancy:68,status:'active',license:'Verified',expiry:'Jun 2027',complaints:4,lastActive:'30 min ago',type:'Business',starRating:4},
];

const sCfg:Record<string,{bg:string;l:string}>={active:{bg:'bg-emerald-100 text-emerald-700',l:'Active'},suspended:{bg:'bg-amber-100 text-amber-700',l:'Suspended'},blocked:{bg:'bg-red-100 text-red-700',l:'Blocked'},pending:{bg:'bg-blue-100 text-blue-700',l:'Pending'}};

export default function HotelBookingAdminPage(){
  const [search,setSearch]=useState('');const [sf,setSf]=useState('All');const [exp,setExp]=useState<string|null>(null);
  const [data,setData]=useState<HotelEntry[]>(init);
  const [source, setSource] = useState<'api' | 'demo'>('demo');
  const { filtered: regionFiltered, regionLabel, isFiltered, formatPrice, tourismLicense } = useHotelRegionFilter(data);

  useEffect(() => {
    (async () => {
      try {
        const res = await adminHotelApi.getHotels({ limit: 50 });
        if (res.success && Array.isArray((res.data as any)?.data) && (res.data as any).data.length > 0) {
          setData((res.data as any).data);
          setSource('api');
        }
      } catch { /* keep demo data */ }
    })();
  }, []);

  const f=regionFiltered.filter(r=>{const ms=r.name.toLowerCase().includes(search.toLowerCase());const mst=sf==='All'||r.status===sf;return ms&&mst;});
  const toggle=(id:string,to:HotelStatus)=>setData(p=>p.map(r=>r.id===id?{...r,status:r.status===to?'active':to}:r));
  const approve=(id:string)=>setData(p=>p.map(r=>r.id===id?{...r,status:'active' as HotelStatus,license:'Verified'}:r));

  const totalBookings = regionFiltered.reduce((s,r)=>s+r.bookings,0);
  const totalRooms = regionFiltered.reduce((s,r)=>s+r.rooms,0);
  const activeHotels = regionFiltered.filter(r=>r.status==='active');
  const avgOccupancy = activeHotels.length > 0 ? Math.round(activeHotels.reduce((s,r)=>s+r.occupancy,0)/activeHotels.length) : 0;

  return(<div className="space-y-6">
    {/* Header */}
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div><h1 className="text-2xl font-bold text-slate-900">Hotel Booking Dashboard</h1><p className="text-slate-500 text-sm">{isFiltered ? `${regionLabel} — ` : ''}Complete overview of hotel operations, {tourismLicense} compliance, and performance.</p></div>
      <div className="flex gap-2 text-xs">
        <span className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full font-bold">{regionFiltered.filter(r=>r.status==='active').length} Active</span>
        <span className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full font-bold">{regionFiltered.filter(r=>r.status==='pending').length} Pending</span>
        <span className="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full font-bold">{regionFiltered.filter(r=>r.status==='suspended').length} Suspended</span>
      </div>
    </div>

    {/* KPI Cards */}
    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
      <div className="bg-linear-to-br from-rose-500 to-rose-600 p-5 rounded-xl shadow-md text-white"><Hotel className="w-5 h-5 opacity-80"/><p className="text-3xl font-black mt-3">{regionFiltered.length}</p><p className="text-sm font-medium opacity-80 mt-1">Hotels</p></div>
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"><DollarSign className="w-5 h-5 text-emerald-500"/><p className="text-2xl font-black text-slate-900 mt-3">{formatPrice(regionFiltered.reduce((s,r)=>s+r.revenue,0))}</p><p className="text-sm text-slate-500 font-medium mt-1">Total Revenue</p></div>
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"><CalendarCheck className="w-5 h-5 text-blue-500"/><p className="text-2xl font-black text-slate-900 mt-3">{totalBookings.toLocaleString()}</p><p className="text-sm text-slate-500 font-medium mt-1">Total Bookings</p></div>
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"><BedDouble className="w-5 h-5 text-purple-500"/><p className="text-2xl font-black text-slate-900 mt-3">{totalRooms.toLocaleString()}</p><p className="text-sm text-slate-500 font-medium mt-1">Total Rooms</p></div>
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"><TrendingUp className="w-5 h-5 text-teal-500"/><p className="text-2xl font-black text-slate-900 mt-3">{avgOccupancy}%</p><p className="text-sm text-slate-500 font-medium mt-1">Avg Occupancy</p></div>
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"><AlertTriangle className="w-5 h-5 text-red-500"/><p className="text-2xl font-black text-slate-900 mt-3">{regionFiltered.filter(r=>r.license!=='Verified'&&r.license!=='Pending').length}</p><p className="text-sm text-slate-500 font-medium mt-1">License Alerts</p></div>
    </div>

    {/* Filters */}
    <div className="flex gap-3"><div className="flex-1 relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input placeholder="Search hotels..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"/></div>
      <select aria-label="Filter by status" value={sf} onChange={e=>setSf(e.target.value)} className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white"><option value="All">All Status</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="blocked">Blocked</option><option value="pending">Pending</option></select></div>

    {/* Table */}
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left text-sm">
      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200"><tr><th className="px-5 py-3.5 font-semibold">Hotel</th><th className="px-5 py-3.5 font-semibold text-center">Type</th><th className="px-5 py-3.5 font-semibold text-center">License</th><th className="px-5 py-3.5 font-semibold text-right">Bookings</th><th className="px-5 py-3.5 font-semibold text-right">Rooms</th><th className="px-5 py-3.5 font-semibold text-center">Occupancy</th><th className="px-5 py-3.5 font-semibold text-center">Status</th><th className="px-5 py-3.5 font-semibold text-center"></th></tr></thead>
      <tbody className="divide-y divide-slate-100">{f.map(r=>(<React.Fragment key={r.id}>
        <tr className={`hover:bg-slate-50/50 cursor-pointer ${r.status==='blocked'?'opacity-60':''}`} onClick={()=>setExp(exp===r.id?null:r.id)} tabIndex={0} onKeyDown={activateOnKey(()=>setExp(exp===r.id?null:r.id))}>
          <td className="px-5 py-4"><p className="font-bold text-slate-900">{r.name}</p><p className="text-xs text-slate-400">{r.id} • {r.city}, {r.country} • {'⭐'.repeat(r.starRating)}</p></td>
          <td className="px-5 py-4 text-center"><span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded text-xs font-bold">{r.type}</span></td>
          <td className="px-5 py-4 text-center"><span className={`px-2 py-0.5 rounded text-xs font-bold ${r.license==='Verified'?'bg-emerald-100 text-emerald-700':r.license==='Pending'?'bg-blue-100 text-blue-700':'bg-amber-100 text-amber-700'}`}>{r.license}</span></td>
          <td className="px-5 py-4 text-right font-bold">{r.bookings.toLocaleString()}</td>
          <td className="px-5 py-4 text-right text-slate-600">{r.rooms}</td>
          <td className="px-5 py-4 text-center"><div className="flex items-center justify-center gap-2"><div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden"><BarFill width={`${r.occupancy}%`} className={`h-full rounded-full ${r.occupancy>80?'bg-emerald-500':r.occupancy>50?'bg-amber-500':'bg-red-500'}`}/></div><span className="text-xs font-bold text-slate-600">{r.occupancy}%</span></div></td>
          <td className="px-5 py-4 text-center"><span className={`${sCfg[r.status].bg} px-2.5 py-1 rounded-full text-xs font-bold`}>{sCfg[r.status].l}</span></td>
          <td className="px-5 py-4 text-center">{exp===r.id?<ChevronUp className="w-4 h-4 text-slate-400"/>:<ChevronDown className="w-4 h-4 text-slate-400"/>}</td>
        </tr>
        {exp===r.id&&(<tr className="bg-slate-50/80"><td colSpan={8} className="px-5 py-5">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm mb-4">
            <div><p className="text-slate-400 text-xs font-medium mb-1">Owner</p><p className="font-bold text-slate-700">{r.owner}</p><p className="text-xs text-slate-500 flex items-center gap-1 mt-1"><Phone className="w-3 h-3"/>{r.phone}</p></div>
            <div><p className="text-slate-400 text-xs font-medium mb-1">Revenue</p><p className="font-bold text-slate-900">{formatPrice(r.revenue)}</p></div>
            <div><p className="text-slate-400 text-xs font-medium mb-1">License Expiry</p><p className={`font-bold ${r.expiry==='Under Review'?'text-amber-600':'text-emerald-600'}`}>{r.expiry}</p></div>
            <div><p className="text-slate-400 text-xs font-medium mb-1">Rating</p><p className="font-bold text-slate-900 flex items-center gap-1">{r.rating>0?<><Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400"/>{r.rating}</>:'N/A'}</p></div>
            <div><p className="text-slate-400 text-xs font-medium mb-1">Complaints</p><p className={`font-bold ${r.complaints>10?'text-red-600':'text-slate-900'}`}>{r.complaints}</p></div>
            <div><p className="text-slate-400 text-xs font-medium mb-1">Last Active</p><p className="font-bold text-slate-700">{r.lastActive}</p></div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
            {r.status==='pending'&&<><button onClick={()=>approve(r.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5"/> Approve</button><button className="bg-white hover:bg-red-50 text-red-600 px-4 py-2 rounded-lg text-xs font-bold border border-red-200 flex items-center gap-1"><XCircle className="w-3.5 h-3.5"/> Reject</button></>}
            {r.status!=='pending'&&r.status!=='blocked'&&<button onClick={()=>toggle(r.id,'suspended')} className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1 ${r.status==='suspended'?'bg-emerald-600 hover:bg-emerald-700 text-white':'bg-amber-100 hover:bg-amber-200 text-amber-700'}`}>{r.status==='suspended'?<><CheckCircle className="w-3.5 h-3.5"/> Unsuspend</>:<><Clock className="w-3.5 h-3.5"/> Suspend</>}</button>}
            <button onClick={()=>toggle(r.id,'blocked')} className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1 ${r.status==='blocked'?'bg-emerald-600 hover:bg-emerald-700 text-white':'bg-red-600 hover:bg-red-700 text-white'}`}>{r.status==='blocked'?<><CheckCircle className="w-3.5 h-3.5"/> Unblock</>:<><Ban className="w-3.5 h-3.5"/> Block</>}</button>
            <button className="bg-white hover:bg-slate-50 text-slate-600 px-4 py-2 rounded-lg text-xs font-bold border border-slate-200 flex items-center gap-1"><Eye className="w-3.5 h-3.5"/> View Portal</button>
          </div>
        </td></tr>)}
      </React.Fragment>))}</tbody></table></div></div>
  </div>);
}
