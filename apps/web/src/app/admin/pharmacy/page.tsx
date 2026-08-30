'use client';
import React, { useState, useEffect } from 'react';
import { Pill, Search, Star, Eye, Ban, CheckCircle, Clock, XCircle, DollarSign, AlertTriangle, ChevronDown, ChevronUp, Phone, FileCheck, ShoppingCart, Store, Package, TrendingUp } from 'lucide-react';
import { usePharmacyRegionFilter } from '@/hooks/usePharmacyRegionFilter';
import { adminPharmacyApi } from '@/lib/api/admin-pharmacy';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
const init = [
  { id:'PH-001',country:'India',name:'MedPlus Pharmacy',city:'Hyderabad',owner:'Dr. Ravi K.',phone:'+91 98765 43210',rating:4.6,orders:3800,revenue:1800000,rxOrders:1200,status:'active' as const,license:'Verified',expiry:'Mar 2027',complaints:4,lastActive:'Now',categories:['Medicines','Baby Care','First Aid'],products:142},
  { id:'PH-002',country:'India',name:'Apollo Pharmacy',city:'Chennai',owner:'Priya S.',phone:'+91 98765 43211',rating:4.8,orders:5200,revenue:2800000,rxOrders:2100,status:'active' as const,license:'Verified',expiry:'Jun 2027',complaints:2,lastActive:'10 min ago',categories:['Medicines','Vitamins','Skin Care','Prescription'],products:284},
  { id:'PH-003',country:'India',name:'Netmeds Express',city:'Mumbai',owner:'Rohit M.',phone:'+91 98765 43212',rating:4.4,orders:2400,revenue:1200000,rxOrders:800,status:'active' as const,license:'Verified',expiry:'Dec 2026',complaints:6,lastActive:'1 hr ago',categories:['Medicines','Wellness','Women\'s Health'],products:98},
  { id:'PH-004',country:'India',name:'HealthFirst',city:'Delhi',owner:'Amit G.',phone:'+91 98765 43213',rating:3.9,orders:950,revenue:420000,rxOrders:300,status:'suspended' as const,license:'Expired',expiry:'Expired',complaints:18,lastActive:'5 days ago',categories:['Medicines'],products:45},
  { id:'PH-005',country:'India',name:'QuickMeds',city:'Pune',owner:'Deepak R.',phone:'+91 98765 43214',rating:2.5,orders:120,revenue:60000,rxOrders:40,status:'blocked' as const,license:'Revoked',expiry:'Revoked',complaints:32,lastActive:'Blocked',categories:['Medicines','First Aid'],products:12},
  { id:'PH-006',country:'India',name:'CarePharm Plus',city:'Bangalore',owner:'Dr. Sunita',phone:'+91 98765 43215',rating:0,orders:0,revenue:0,rxOrders:0,status:'pending' as const,license:'Under Review',expiry:'Pending',complaints:0,lastActive:'New',categories:['Elderly Care','Medical Equipment'],products:0},
  { id:'PH-007',country:'UAE',name:'Life Pharmacy',city:'Dubai',owner:'Ahmed R.',phone:'+971 50 111 2222',rating:4.7,orders:4100,revenue:920000,rxOrders:1800,status:'active' as const,license:'Verified',expiry:'Sep 2027',complaints:3,lastActive:'Now',categories:['Medicines','Beauty','Baby Care'],products:320},
  { id:'PH-008',country:'UAE',name:'Aster Pharmacy',city:'Abu Dhabi',owner:'Fatima K.',phone:'+971 55 333 4444',rating:4.5,orders:3200,revenue:780000,rxOrders:1400,status:'active' as const,license:'Verified',expiry:'Jan 2028',complaints:1,lastActive:'5 min ago',categories:['Medicines','Vitamins','Prescription'],products:250},
  { id:'PH-009',country:'Saudi Arabia',name:'Al Nahdi Pharmacy',city:'Riyadh',owner:'Mohammed S.',phone:'+966 50 555 6666',rating:4.8,orders:6500,revenue:1400000,rxOrders:3200,status:'active' as const,license:'Verified',expiry:'Dec 2027',complaints:2,lastActive:'Now',categories:['Medicines','Beauty','Wellness'],products:410},
  { id:'PH-010',country:'Saudi Arabia',name:'Whites Pharmacy',city:'Jeddah',owner:'Khalid A.',phone:'+966 55 777 8888',rating:4.3,orders:2800,revenue:650000,rxOrders:1100,status:'active' as const,license:'Verified',expiry:'Aug 2027',complaints:5,lastActive:'15 min ago',categories:['Medicines','First Aid'],products:185},
];

const sCfg:Record<string,{bg:string;l:string}>={active:{bg:'bg-emerald-100 text-emerald-700',l:'Active'},suspended:{bg:'bg-amber-100 text-amber-700',l:'Suspended'},blocked:{bg:'bg-red-100 text-red-700',l:'Blocked'},pending:{bg:'bg-blue-100 text-blue-700',l:'Pending'}};

export default function PharmacyAdminPage(){
  const [search,setSearch]=useState('');const [sf,setSf]=useState('All');const [exp,setExp]=useState<string|null>(null);
  const [data,setData]=useState(init);
  const [source, setSource] = useState<'api' | 'demo'>('demo');
  const { filtered: regionFiltered, regionLabel, isFiltered, formatPrice, drugLicense } = usePharmacyRegionFilter(data);

  useEffect(() => {
    (async () => {
      try {
        const res = await adminPharmacyApi.getStores({ limit: 50 });
        if (res.success && Array.isArray((res.data as any)?.data) && (res.data as any).data.length > 0) {
          setData((res.data as any).data);
          setSource('api');
        }
      } catch { /* keep demo data */ }
    })();
  }, []);

  const f=regionFiltered.filter(r=>{const ms=r.name.toLowerCase().includes(search.toLowerCase());const mst=sf==='All'||r.status===sf;return ms&&mst;});
  const toggle=(id:string,to:'blocked'|'suspended')=>setData(p=>p.map(r=>r.id===id?{...r,status:r.status===to?'active' as const:to}:r));
  const approve=(id:string)=>setData(p=>p.map(r=>r.id===id?{...r,status:'active' as const,license:'Verified'}:r));

  const totalOrders = regionFiltered.reduce((s,r)=>s+r.orders,0);
  const totalProducts = regionFiltered.reduce((s,r)=>s+r.products,0);

  return(<div className="space-y-6">
    {/* Header */}
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div><h1 className="text-2xl font-bold text-slate-900">Pharmacy Dashboard</h1><p className="text-slate-500 text-sm">{isFiltered ? `${regionLabel} — ` : ''}Overview of all pharmacy operations, {drugLicense} compliance, and performance.</p></div>
      <div className="flex gap-2 text-xs">
        <span className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full font-bold">{regionFiltered.filter(r=>r.status==='active').length} Active</span>
        <span className="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full font-bold">{regionFiltered.filter(r=>r.status==='pending').length} Pending</span>
        <span className="bg-red-100 text-red-700 px-3 py-1.5 rounded-full font-bold">{regionFiltered.filter(r=>r.license==='Expired'||r.license==='Revoked').length} License Issues</span>
      </div>
    </div>

    {/* KPI Cards */}
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <div className="bg-linear-to-br from-cyan-500 to-cyan-600 p-5 rounded-xl shadow-md text-white"><Pill className="w-5 h-5 opacity-80"/><p className="text-3xl font-black mt-3">{regionFiltered.length}</p><p className="text-sm font-medium opacity-80 mt-1">Pharmacies</p></div>
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"><DollarSign className="w-5 h-5 text-emerald-500"/><p className="text-2xl font-black text-slate-900 mt-3">{formatPrice(regionFiltered.reduce((s,r)=>s+r.revenue,0))}</p><p className="text-sm text-slate-500 font-medium mt-1">Revenue (MTD)</p></div>
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"><ShoppingCart className="w-5 h-5 text-blue-500"/><p className="text-2xl font-black text-slate-900 mt-3">{totalOrders.toLocaleString()}</p><p className="text-sm text-slate-500 font-medium mt-1">Total Orders</p></div>
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"><Package className="w-5 h-5 text-purple-500"/><p className="text-2xl font-black text-slate-900 mt-3">{totalProducts.toLocaleString()}</p><p className="text-sm text-slate-500 font-medium mt-1">Products</p></div>
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"><AlertTriangle className="w-5 h-5 text-red-500"/><p className="text-2xl font-black text-slate-900 mt-3">{regionFiltered.filter(r=>r.license!=='Verified'&&r.license!=='Under Review').length}</p><p className="text-sm text-slate-500 font-medium mt-1">License Alerts</p></div>
    </div>

    {/* Filters */}
    <div className="flex gap-3"><div className="flex-1 relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input placeholder="Search pharmacies..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white"/></div>
      <select title="Status filter" value={sf} onChange={e=>setSf(e.target.value)} className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white"><option value="All">All Status</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="blocked">Blocked</option><option value="pending">Pending</option></select></div>

    {/* Table */}
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left text-sm">
      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200"><tr><th className="px-5 py-3.5 font-semibold">Pharmacy</th><th className="px-5 py-3.5 font-semibold text-center">License</th><th className="px-5 py-3.5 font-semibold text-right">Orders</th><th className="px-5 py-3.5 font-semibold text-right">Products</th><th className="px-5 py-3.5 font-semibold text-center">Complaints</th><th className="px-5 py-3.5 font-semibold text-center">Status</th><th className="px-5 py-3.5 font-semibold text-center"></th></tr></thead>
      <tbody className="divide-y divide-slate-100">{f.map(r=>(<React.Fragment key={r.id}>
        <tr className={`hover:bg-slate-50/50 cursor-pointer ${r.status==='blocked'?'opacity-60':''}`} onClick={()=>setExp(exp===r.id?null:r.id)} tabIndex={0} onKeyDown={activateOnKey(()=>setExp(exp===r.id?null:r.id))}>
          <td className="px-5 py-4"><p className="font-bold text-slate-900">{r.name}</p><p className="text-xs text-slate-400">{r.id} • {r.city}</p></td>
          <td className="px-5 py-4 text-center"><span className={`px-2 py-0.5 rounded text-xs font-bold ${r.license==='Verified'?'bg-emerald-100 text-emerald-700':r.license==='Under Review'?'bg-amber-100 text-amber-700':'bg-red-100 text-red-700'}`}>{r.license}</span></td>
          <td className="px-5 py-4 text-right font-bold">{r.orders.toLocaleString()}</td>
          <td className="px-5 py-4 text-right text-slate-600">{r.products}</td>
          <td className="px-5 py-4 text-center"><span className={`px-2 py-0.5 rounded text-xs font-bold ${r.complaints>10?'bg-red-100 text-red-700':'bg-slate-100 text-slate-600'}`}>{r.complaints}</span></td>
          <td className="px-5 py-4 text-center"><span className={`${sCfg[r.status].bg} px-2.5 py-1 rounded-full text-xs font-bold`}>{sCfg[r.status].l}</span></td>
          <td className="px-5 py-4 text-center">{exp===r.id?<ChevronUp className="w-4 h-4 text-slate-400"/>:<ChevronDown className="w-4 h-4 text-slate-400"/>}</td>
        </tr>
        {exp===r.id&&(<tr className="bg-slate-50/80"><td colSpan={7} className="px-5 py-5">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm mb-4">
            <div><p className="text-slate-400 text-xs font-medium mb-1">Owner</p><p className="font-bold text-slate-700">{r.owner}</p><p className="text-xs text-slate-500 flex items-center gap-1 mt-1"><Phone className="w-3 h-3"/>{r.phone}</p></div>
            <div><p className="text-slate-400 text-xs font-medium mb-1">Revenue</p><p className="font-bold text-slate-900">{formatPrice(r.revenue)}</p></div>
            <div><p className="text-slate-400 text-xs font-medium mb-1">Rx Orders</p><p className="font-bold text-slate-900">{r.rxOrders.toLocaleString()}</p></div>
            <div><p className="text-slate-400 text-xs font-medium mb-1">License Expiry</p><p className={`font-bold ${r.expiry==='Expired'||r.expiry==='Revoked'?'text-red-600':'text-emerald-600'}`}>{r.expiry}</p></div>
            <div><p className="text-slate-400 text-xs font-medium mb-1">Rating</p><p className="font-bold text-slate-900 flex items-center gap-1">{r.rating>0?<><Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400"/>{r.rating}</>:'N/A'}</p></div>
            <div><p className="text-slate-400 text-xs font-medium mb-1">Categories</p><div className="flex flex-wrap gap-1 mt-1">{r.categories.map(c=><span key={c} className="bg-cyan-50 text-cyan-700 text-[10px] font-bold px-2 py-0.5 rounded">{c}</span>)}</div></div>
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
