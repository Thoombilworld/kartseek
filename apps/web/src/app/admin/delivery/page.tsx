'use client';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';
import React, { useState } from 'react';
import { Truck, Clock, MapPin, Users, Package, CheckCircle, AlertTriangle, Search, Ban, Eye, ChevronDown, ChevronUp, Phone, Star, XCircle, RefreshCcw } from 'lucide-react';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
type Delivery = {
  id: string; partner: string; partnerId: string; phone: string; from: string; to: string;
  status: 'assigned' | 'picked-up' | 'in-transit' | 'delivered' | 'failed'; eta: string;
  module: string; customer: string; amount: string; rating: number;
};

const init: Delivery[] = [
  { id:'DLV-78432',partner:'Ravi Kumar',partnerId:'DRV-001',phone:'+91 98765 43210',from:'City Supermart, Colaba',to:'Marine Drive',status:'in-transit',eta:'8 min',module:'Grocery',customer:'Rahul K.',amount:'₹1,487',rating:4.8},
  { id:'DLV-78431',partner:'Amit Singh',partnerId:'DRV-002',phone:'+91 98765 43211',from:'Burger King, Andheri',to:'Versova',status:'picked-up',eta:'15 min',module:'Restaurant',customer:'Priya S.',amount:'₹650',rating:4.5},
  { id:'DLV-78430',partner:'Priya M.',partnerId:'DRV-010',phone:'+91 98765 43212',from:'MedPlus, Bandra',to:'Khar West',status:'in-transit',eta:'5 min',module:'Pharmacy',customer:'Anil M.',amount:'₹245',rating:4.7},
  { id:'DLV-78429',partner:'Sunil D.',partnerId:'DRV-011',phone:'+91 98765 43213',from:'Warehouse A, Powai',to:'Dadar',status:'assigned',eta:'22 min',module:'Marketplace',customer:'Sneha R.',amount:'₹12,495',rating:4.3},
  { id:'DLV-78428',partner:'Deepak R.',partnerId:'DRV-004',phone:'+91 98765 43214',from:'Pizza Palace, Worli',to:'Lower Parel',status:'delivered',eta:'—',module:'Restaurant',customer:'Vikram T.',amount:'₹890',rating:4.1},
  { id:'DLV-78427',partner:'Mohan K.',partnerId:'DRV-012',phone:'+91 98765 43215',from:'Nature\'s Basket, Juhu',to:'Bandra',status:'delivered',eta:'—',module:'Grocery',customer:'Deepa N.',amount:'₹2,340',rating:4.6},
  { id:'DLV-78426',partner:'Naveen P.',partnerId:'DRV-013',phone:'+91 98765 43216',from:'Samsung Store, Phoenix',to:'Thane',status:'failed',eta:'—',module:'Marketplace',customer:'Rajesh K.',amount:'₹79,999',rating:0},
  { id:'DLV-78425',partner:'Farhan S.',partnerId:'DRV-014',phone:'+91 98765 43217',from:'Apollo Pharmacy, Kurla',to:'Ghatkopar',status:'in-transit',eta:'12 min',module:'Pharmacy',customer:'Meera P.',amount:'₹1,650',rating:4.4},
];

const sCfg:Record<string,{bg:string;l:string}>={
  assigned:{bg:'bg-amber-100 text-amber-700',l:'Assigned'},'picked-up':{bg:'bg-blue-100 text-blue-700',l:'Picked Up'},
  'in-transit':{bg:'bg-indigo-100 text-indigo-700',l:'In Transit'},delivered:{bg:'bg-emerald-100 text-emerald-700',l:'Delivered'},
  failed:{bg:'bg-red-100 text-red-700',l:'Failed'},
};
const modC:Record<string,string>={Marketplace:'bg-blue-100 text-blue-700',Grocery:'bg-green-100 text-green-700',Restaurant:'bg-orange-100 text-orange-700',Pharmacy:'bg-cyan-100 text-cyan-700'};

export default function DeliveryPage(){
  const { regionLabel, isFiltered } = useMarketplaceRegionFilter([]);
  const [search,setSearch]=useState('');const [sf,setSf]=useState('All');const [exp,setExp]=useState<string|null>(null);
  const [data,setData]=useState(init);
  const f=data.filter(d=>{const ms=d.partner.toLowerCase().includes(search.toLowerCase())||d.id.toLowerCase().includes(search.toLowerCase())||d.customer.toLowerCase().includes(search.toLowerCase());const mst=sf==='All'||d.status===sf;return ms&&mst;});
  const reassign=(id:string)=>setData(p=>p.map(d=>d.id===id?{...d,status:'assigned' as const,eta:'20 min',partner:'Auto-Assigned'}:d));

  const active=data.filter(d=>d.status==='in-transit'||d.status==='picked-up'||d.status==='assigned').length;
  const delivered=data.filter(d=>d.status==='delivered').length;
  const failed=data.filter(d=>d.status==='failed').length;

  return(<div className="max-w-7xl mx-auto space-y-6">
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div><h1 className="text-2xl font-bold text-slate-900">Delivery Operations</h1><p className="text-slate-500 text-sm">Live tracking, partner management, route monitoring, and issue resolution.</p></div>
      <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-bold"><span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> Live Tracking</span>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <div className="bg-linear-to-br from-indigo-500 to-indigo-600 p-4 rounded-xl shadow-md text-white"><Truck className="w-5 h-5 opacity-80"/><p className="text-2xl font-black mt-2">1,247</p><p className="text-xs font-medium opacity-80">Active Deliveries</p></div>
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><Users className="w-5 h-5 text-purple-500"/><p className="text-2xl font-black text-slate-900 mt-2">842</p><p className="text-xs text-slate-500 font-medium">Partners Online</p></div>
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><Clock className="w-5 h-5 text-blue-500"/><p className="text-2xl font-black text-slate-900 mt-2">24 min</p><p className="text-xs text-slate-500 font-medium">Avg Delivery Time</p></div>
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><CheckCircle className="w-5 h-5 text-emerald-500"/><p className="text-2xl font-black text-slate-900 mt-2">96.2%</p><p className="text-xs text-slate-500 font-medium">On-Time Rate</p></div>
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><AlertTriangle className="w-5 h-5 text-red-500"/><p className="text-2xl font-black text-slate-900 mt-2">{failed}</p><p className="text-xs text-slate-500 font-medium">Failed Deliveries</p></div>
    </div>
    {/* Map */}
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between"><h2 className="font-bold text-slate-900">Live Delivery Map</h2><span className="text-xs text-slate-400">{active} deliveries in progress</span></div>
      <div className="h-48 bg-linear-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center text-slate-400 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{backgroundImage:'radial-gradient(circle, #64748b 1px, transparent 1px)',backgroundSize:'20px 20px'}}/>
        <MapPin className="w-10 h-10 mb-2 opacity-50 text-indigo-400"/><p className="font-bold text-sm text-slate-500">Real-Time Delivery Tracking</p><p className="text-xs text-slate-400">842 partners online across 12 cities</p>
      </div>
    </div>
    {/* Table */}
    <div className="flex flex-col md:flex-row gap-3">
      <div className="flex-1 relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input placeholder="Search by ID, partner, or customer..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"/></div>
      <select value={sf} onChange={e=>setSf(e.target.value)} className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white"><option value="All">All Status</option><option value="assigned">Assigned</option><option value="picked-up">Picked Up</option><option value="in-transit">In Transit</option><option value="delivered">Delivered</option><option value="failed">Failed</option></select>
    </div>
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left text-sm">
      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200"><tr><th className="px-5 py-3.5 font-semibold">Order</th><th className="px-5 py-3.5 font-semibold">Partner</th><th className="px-5 py-3.5 font-semibold">Module</th><th className="px-5 py-3.5 font-semibold text-center">ETA</th><th className="px-5 py-3.5 font-semibold text-right">Amount</th><th className="px-5 py-3.5 font-semibold text-center">Status</th><th className="px-5 py-3.5 font-semibold text-center">Actions</th></tr></thead>
      <tbody className="divide-y divide-slate-100">{f.map(d=>(<React.Fragment key={d.id}>
        <tr className="hover:bg-slate-50/50 cursor-pointer" onClick={()=>setExp(exp===d.id?null:d.id)} tabIndex={0} onKeyDown={activateOnKey(()=>setExp(exp===d.id?null:d.id))}>
          <td className="px-5 py-4"><p className="font-bold text-slate-900">{d.id}</p><p className="text-xs text-slate-400">{d.customer}</p></td>
          <td className="px-5 py-4"><p className="font-medium text-slate-700">{d.partner}</p><p className="text-xs text-slate-400">{d.partnerId}</p></td>
          <td className="px-5 py-4"><span className={`${modC[d.module]||'bg-slate-100 text-slate-600'} px-2.5 py-1 rounded-md text-xs font-bold`}>{d.module}</span></td>
          <td className="px-5 py-4 text-center font-bold">{d.eta}</td>
          <td className="px-5 py-4 text-right font-bold">{d.amount}</td>
          <td className="px-5 py-4 text-center"><span className={`${sCfg[d.status].bg} px-2.5 py-1 rounded-full text-xs font-bold`}>{sCfg[d.status].l}</span></td>
          <td className="px-5 py-4 text-center">
            {d.status==='failed'&&<button onClick={e=>{e.stopPropagation();reassign(d.id)}} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"><RefreshCcw className="w-3 h-3"/> Reassign</button>}
            {d.status!=='failed'&&<button onClick={e=>e.stopPropagation()} className="p-1.5 hover:bg-slate-100 rounded-lg">{exp===d.id?<ChevronUp className="w-4 h-4 text-slate-400"/>:<ChevronDown className="w-4 h-4 text-slate-400"/>}</button>}
          </td>
        </tr>
        {exp===d.id&&(<tr className="bg-slate-50/80"><td colSpan={7} className="px-5 py-5">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm mb-4">
            <div><p className="text-slate-400 text-xs font-medium mb-1">Partner Contact</p><p className="text-xs text-slate-700 flex items-center gap-1"><Phone className="w-3 h-3"/>{d.phone}</p></div>
            <div><p className="text-slate-400 text-xs font-medium mb-1">Pickup</p><p className="font-bold text-xs text-slate-700">{d.from}</p></div>
            <div><p className="text-slate-400 text-xs font-medium mb-1">Drop</p><p className="font-bold text-xs text-slate-700">{d.to}</p></div>
            <div><p className="text-slate-400 text-xs font-medium mb-1">Partner Rating</p><p className="font-bold text-slate-700">{d.rating>0?d.rating:'N/A'}</p></div>
            <div><p className="text-slate-400 text-xs font-medium mb-1">Order Value</p><p className="font-black text-emerald-600">{d.amount}</p></div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
            {d.status==='failed'&&<button onClick={()=>reassign(d.id)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1"><RefreshCcw className="w-3.5 h-3.5"/> Reassign Partner</button>}
            <button className="bg-white hover:bg-slate-50 text-slate-600 px-4 py-2 rounded-lg text-xs font-bold border border-slate-200 flex items-center gap-1"><Eye className="w-3.5 h-3.5"/> Track Live</button>
            <button className="bg-white hover:bg-red-50 text-red-600 px-4 py-2 rounded-lg text-xs font-bold border border-red-200 flex items-center gap-1"><XCircle className="w-3.5 h-3.5"/> Cancel Delivery</button>
          </div>
        </td></tr>)}
      </React.Fragment>))}</tbody></table></div>
      <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/50 text-sm text-slate-500">Showing {f.length} of {data.length} deliveries</div>
    </div>
  </div>);
}
