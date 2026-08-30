'use client';
import React, { useState, useEffect } from 'react';
import { UtensilsCrossed, Search, Star, Eye, Ban, CheckCircle, Clock, XCircle, DollarSign, AlertTriangle, ChevronDown, ChevronUp, Phone, Bike, ShoppingBag, Utensils, CalendarDays, ClipboardCheck, Wifi, WifiOff } from 'lucide-react';
import { adminRestaurantApi } from '@/lib/api/admin-restaurant';
import { useRestaurantRegionFilter } from '@/hooks/useRestaurantRegionFilter';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
type Restaurant={id:string;name:string;cuisine:string;city:string;country:string;owner:string;phone:string;rating:number;orders:number;revenue:number;avgTime:string;refundRate:string;complaints:number;status:'active'|'suspended'|'blocked'|'pending';fssai:string;lastActive:string};

const init:Restaurant[] = [
  { id:'RES-001',name:'Burger King (Andheri)',cuisine:'Fast Food',city:'Mumbai',country:'India',owner:'Sunil P.',phone:'+91 98765 43210',rating:4.5,orders:6100,revenue:3100000,avgTime:'28 min',refundRate:'2.1%',complaints:5,status:'active',fssai:'Verified',lastActive:'Now'},
  { id:'RES-002',name:'Pizza Palace',cuisine:'Italian',city:'Mumbai',country:'India',owner:'Marco D.',phone:'+91 98765 43211',rating:4.7,orders:5200,revenue:2600000,avgTime:'32 min',refundRate:'1.5%',complaints:3,status:'active',fssai:'Verified',lastActive:'15 min ago'},
  { id:'RES-003',name:'Sushi Kingdom',cuisine:'Japanese',city:'Mumbai',country:'India',owner:'Kenji T.',phone:'+91 98765 43212',rating:4.9,orders:4400,revenue:3800000,avgTime:'25 min',refundRate:'0.8%',complaints:1,status:'active',fssai:'Verified',lastActive:'5 min ago'},
  { id:'RES-004',name:'Biryani House',cuisine:'Indian',city:'Hyderabad',country:'India',owner:'Karim A.',phone:'+91 98765 43213',rating:4.6,orders:8900,revenue:4200000,avgTime:'35 min',refundRate:'2.8%',complaints:8,status:'active',fssai:'Verified',lastActive:'10 min ago'},
  { id:'RES-005',name:'China Garden',cuisine:'Chinese',city:'Delhi',country:'India',owner:'Lin W.',phone:'+91 98765 43214',rating:3.8,orders:1200,revenue:600000,avgTime:'45 min',refundRate:'8.2%',complaints:22,status:'suspended',fssai:'Verified',lastActive:'2 days ago'},
  { id:'RES-006',name:'Street Bites',cuisine:'Street Food',city:'Mumbai',country:'India',owner:'Ramesh K.',phone:'+91 98765 43215',rating:2.1,orders:80,revenue:40000,avgTime:'55 min',refundRate:'15%',complaints:35,status:'blocked',fssai:'Expired',lastActive:'Blocked'},
  { id:'RES-007',name:'Thai Orchid',cuisine:'Thai',city:'Bangalore',country:'India',owner:'Somsak P.',phone:'+91 98765 43216',rating:0,orders:0,revenue:0,avgTime:'—',refundRate:'0%',complaints:0,status:'pending',fssai:'Pending',lastActive:'New'},
  { id:'RES-008',name:'Al Mahara Seafood',cuisine:'Seafood',city:'Dubai',country:'UAE',owner:'Ahmed K.',phone:'+971 50 123 4567',rating:4.8,orders:3200,revenue:850000,avgTime:'30 min',refundRate:'1.2%',complaints:2,status:'active',fssai:'Verified',lastActive:'Now'},
  { id:'RES-009',name:'Zuma Dubai',cuisine:'Japanese',city:'Abu Dhabi',country:'UAE',owner:'Hassan M.',phone:'+971 55 987 6543',rating:4.9,orders:2800,revenue:1200000,avgTime:'28 min',refundRate:'0.5%',complaints:0,status:'active',fssai:'Verified',lastActive:'5 min ago'},
  { id:'RES-010',name:'Al Baik',cuisine:'Fast Food',city:'Riyadh',country:'Saudi Arabia',owner:'Mohammed A.',phone:'+966 50 123 4567',rating:4.7,orders:9200,revenue:1500000,avgTime:'22 min',refundRate:'1.0%',complaints:3,status:'active',fssai:'Verified',lastActive:'Now'},
  { id:'RES-011',name:'Mama Noura',cuisine:'Arabic',city:'Jeddah',country:'Saudi Arabia',owner:'Khalid S.',phone:'+966 55 987 6543',rating:4.5,orders:7500,revenue:980000,avgTime:'35 min',refundRate:'2.0%',complaints:5,status:'active',fssai:'Verified',lastActive:'10 min ago'},
];

const sCfg:Record<string,{bg:string;l:string}>={active:{bg:'bg-emerald-100 text-emerald-700',l:'Active'},suspended:{bg:'bg-amber-100 text-amber-700',l:'Suspended'},blocked:{bg:'bg-red-100 text-red-700',l:'Blocked'},pending:{bg:'bg-blue-100 text-blue-700',l:'Pending'}};

export default function RestauraRTOdminPage(){
  const [search,setSearch]=useState('');const [sf,setSf]=useState('All');const [exp,setExp]=useState<string|null>(null);
  const [data,setData]=useState<Restaurant[]>(init);
  const [source, setSource] = useState<'api' | 'demo'>('demo');
  const { filtered: regionFiltered, regionLabel, isFiltered, formatPrice, foodLicense } = useRestaurantRegionFilter(data);

  useEffect(() => {
    (async () => {
      try {
        const res = await adminRestaurantApi.getRestaurants({ limit: 50 });
        if (res.success && Array.isArray((res.data as any)?.data) && (res.data as any).data.length > 0) {
          const mapped = (res.data as any).data.map((r: any) => ({
            id: r.id, name: r.name, cuisine: r.cuisine ?? 'N/A', city: r.city ?? '', country: r.country ?? '',
            owner: r.owner ?? '', phone: r.phone ?? '', rating: r.rating ?? 0, orders: r.totalOrders ?? 0,
            revenue: r.revenue ?? 0, avgTime: r.avgDeliveryTime ?? '—', refundRate: r.refundRate ?? '0%',
            complaints: r.complaints ?? 0, status: r.status ?? 'active', fssai: r.fssai ?? 'Pending', lastActive: r.lastActive ?? 'N/A',
          }));
          setData(mapped);
          setSource('api');
        }
      } catch { /* keep demo data */ }
    })();
  }, []);

  const f=regionFiltered.filter(r=>{const ms=r.name.toLowerCase().includes(search.toLowerCase());const mst=sf==='All'||r.status===sf;return ms&&mst;});
  const toggle=(id:string,to:'blocked'|'suspended')=>setData(p=>p.map(r=>r.id===id?{...r,status:r.status===to?'active':to}:r));
  const approve=(id:string)=>setData(p=>p.map(r=>r.id===id?{...r,status:'active' as const}:r));

  return(<div className="space-y-6">
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div><h1 className="text-2xl font-bold text-slate-900">Restaurants — Partner Control</h1><p className="text-slate-500 text-sm">{isFiltered ? `${regionLabel} — ` : ''}Full management: {foodLicense} compliance, quality monitoring, block/unblock.</p></div>
      <div className="flex gap-2 text-xs"><span className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full font-bold">{regionFiltered.filter(r=>r.status==='active').length} Active</span><span className="bg-red-100 text-red-700 px-3 py-1.5 rounded-full font-bold">{regionFiltered.filter(r=>r.status==='blocked').length} Blocked</span></div>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <div className="bg-linear-to-br from-orange-500 to-orange-600 p-5 rounded-xl shadow-md text-white"><UtensilsCrossed className="w-5 h-5 opacity-80"/><p className="text-3xl font-black mt-3">{regionFiltered.length}</p><p className="text-sm font-medium opacity-80 mt-1">Restaurants</p></div>
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"><DollarSign className="w-5 h-5 text-emerald-500"/><p className="text-2xl font-black text-slate-900 mt-3">{formatPrice(regionFiltered.reduce((s,r)=>s+r.revenue,0))}</p><p className="text-sm text-slate-500 font-medium mt-1">Total Revenue</p></div>
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"><Clock className="w-5 h-5 text-blue-500"/><p className="text-2xl font-black text-slate-900 mt-3">31 min</p><p className="text-sm text-slate-500 font-medium mt-1">Avg Delivery</p></div>
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"><AlertTriangle className="w-5 h-5 text-red-500"/><p className="text-2xl font-black text-slate-900 mt-3">{regionFiltered.filter(r=>r.complaints>10).length}</p><p className="text-sm text-slate-500 font-medium mt-1">Quality Alerts</p></div>
      <a href="/admin/restaurant/approvals" className="bg-blue-50 border border-blue-200 p-5 rounded-xl shadow-sm hover:bg-blue-100 transition-colors block"><ClipboardCheck className="w-5 h-5 text-blue-600"/><p className="text-2xl font-black text-blue-900 mt-3">{regionFiltered.filter(r=>r.status==='pending').length}</p><p className="text-sm text-blue-600 font-medium mt-1">Pending Approvals</p></a>
    </div>
    {/* Order Type Breakdown */}
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 shadow-sm">
        <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center"><Bike className="w-5 h-5 text-orange-600"/></div>
        <div><p className="text-xs text-slate-500 font-medium">Delivery Orders</p><p className="text-xl font-black text-slate-900">18,420</p></div>
        <span className="ml-auto text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">+8%</span>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 shadow-sm">
        <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center"><ShoppingBag className="w-5 h-5 text-purple-600"/></div>
        <div><p className="text-xs text-slate-500 font-medium">Takeaway Orders</p><p className="text-xl font-black text-slate-900">5,810</p></div>
        <span className="ml-auto text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">+14%</span>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 shadow-sm">
        <div className="w-10 h-10 bg-rose-50 rounded-lg flex items-center justify-center"><CalendarDays className="w-5 h-5 text-rose-600"/></div>
        <div><p className="text-xs text-slate-500 font-medium">Table Bookings</p><p className="text-xl font-black text-slate-900">1,240</p></div>
        <span className="ml-auto text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">+22%</span>
      </div>
    </div>
    <div className="flex gap-3"><div className="flex-1 relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input placeholder="Search restaurants..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"/></div>
      <select value={sf} onChange={e=>setSf(e.target.value)} title="Filter by status" className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white"><option value="All">All</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="blocked">Blocked</option><option value="pending">Pending</option></select></div>
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left text-sm">
      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200"><tr><th className="px-5 py-3.5 font-semibold">Restaurant</th><th className="px-5 py-3.5 font-semibold text-center">Rating</th><th className="px-5 py-3.5 font-semibold text-right">Orders</th><th className="px-5 py-3.5 font-semibold text-center">Avg Time</th><th className="px-5 py-3.5 font-semibold text-center">Complaints</th><th className="px-5 py-3.5 font-semibold text-center">Status</th><th className="px-5 py-3.5 font-semibold text-center"></th></tr></thead>
      <tbody className="divide-y divide-slate-100">{f.map(r=>(<React.Fragment key={r.id}>
        <tr className={`hover:bg-slate-50/50 transition-colors cursor-pointer ${r.status==='blocked'?'opacity-60':''}`} onClick={()=>setExp(exp===r.id?null:r.id)} tabIndex={0} onKeyDown={activateOnKey(()=>setExp(exp===r.id?null:r.id))}>
          <td className="px-5 py-4"><p className="font-bold text-slate-900">{r.name}</p><p className="text-xs text-slate-400">{r.id} • {r.cuisine} • {r.city}</p></td>
          <td className="px-5 py-4 text-center">{r.rating>0?<span className="inline-flex items-center gap-0.5"><Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400"/><span className="font-bold">{r.rating}</span></span>:<span className="text-slate-400 text-xs">N/A</span>}</td>
          <td className="px-5 py-4 text-right font-bold">{r.orders.toLocaleString()}</td>
          <td className="px-5 py-4 text-center">{r.avgTime}</td>
          <td className="px-5 py-4 text-center"><span className={`px-2 py-0.5 rounded text-xs font-bold ${r.complaints>10?'bg-red-100 text-red-700':'bg-slate-100 text-slate-600'}`}>{r.complaints}</span></td>
          <td className="px-5 py-4 text-center"><span className={`${sCfg[r.status].bg} px-2.5 py-1 rounded-full text-xs font-bold`}>{sCfg[r.status].l}</span></td>
          <td className="px-5 py-4 text-center">{exp===r.id?<ChevronUp className="w-4 h-4 text-slate-400"/>:<ChevronDown className="w-4 h-4 text-slate-400"/>}</td>
        </tr>
        {exp===r.id&&(<tr className="bg-slate-50/80"><td colSpan={7} className="px-5 py-5">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm mb-4">
            <div><p className="text-slate-400 text-xs font-medium mb-1">Owner</p><p className="font-bold text-slate-700">{r.owner}</p><p className="text-xs text-slate-500 flex items-center gap-1 mt-1"><Phone className="w-3 h-3"/>{r.phone}</p></div>
            <div><p className="text-slate-400 text-xs font-medium mb-1">Revenue</p><p className="font-bold text-slate-900">{formatPrice(r.revenue)}</p></div>
            <div><p className="text-slate-400 text-xs font-medium mb-1">Refund Rate</p><p className={`font-bold ${parseFloat(r.refundRate)>5?'text-red-600':'text-emerald-600'}`}>{r.refundRate}</p></div>
            <div><p className="text-slate-400 text-xs font-medium mb-1">FSSAI</p><p className={`font-bold text-xs ${r.fssai==='Verified'?'text-emerald-600':'text-red-600'}`}>{r.fssai}</p></div>
            <div><p className="text-slate-400 text-xs font-medium mb-1">Last Active</p><p className="font-bold text-slate-700">{r.lastActive}</p></div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
            {r.status==='pending'&&<><button onClick={()=>approve(r.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5"/> Approve</button><button className="bg-white hover:bg-red-50 text-red-600 px-4 py-2 rounded-lg text-xs font-bold border border-red-200 flex items-center gap-1"><XCircle className="w-3.5 h-3.5"/> Reject</button></>}
            {r.status!=='pending'&&r.status!=='blocked'&&<button onClick={()=>toggle(r.id,'suspended')} className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1 ${r.status==='suspended'?'bg-emerald-600 hover:bg-emerald-700 text-white':'bg-amber-100 hover:bg-amber-200 text-amber-700'}`}>{r.status==='suspended'?<><CheckCircle className="w-3.5 h-3.5"/> Unsuspend</>:<><Clock className="w-3.5 h-3.5"/> Suspend</>}</button>}
            <button onClick={()=>toggle(r.id,'blocked')} className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1 ${r.status==='blocked'?'bg-emerald-600 hover:bg-emerald-700 text-white':'bg-red-600 hover:bg-red-700 text-white'}`}>{r.status==='blocked'?<><CheckCircle className="w-3.5 h-3.5"/> Unblock</>:<><Ban className="w-3.5 h-3.5"/> Block</>}</button>
            <a href="/seller/restaurant/dashboard" target="_blank" className="bg-white hover:bg-slate-50 text-slate-600 px-4 py-2 rounded-lg text-xs font-bold border border-slate-200 flex items-center gap-1"><Eye className="w-3.5 h-3.5"/> View Portal</a>
            <a href="/admin/restaurant/approvals" className="bg-white hover:bg-slate-50 text-slate-600 px-4 py-2 rounded-lg text-xs font-bold border border-slate-200 flex items-center gap-1"><Utensils className="w-3.5 h-3.5"/> Menu Audit</a>
          </div>
        </td></tr>)}
      </React.Fragment>))}</tbody></table></div></div>
  </div>);
}
