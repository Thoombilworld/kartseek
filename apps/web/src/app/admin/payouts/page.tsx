'use client';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';
import { adminCoreApi } from '@/lib/api/admin-core';
import React, { useState, useEffect } from 'react';
import { DollarSign, Search, CheckCircle, Clock, XCircle, AlertTriangle, Download, Eye, RefreshCcw, Landmark, ArrowUpRight, ChevronDown, ChevronUp } from 'lucide-react';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
type Payout = {
  id: string; partner: string; partnerId: string; module: string; grossSales: string; commission: string;
  commRate: string; netPayout: string; method: string; bankAcc: string;
  status: 'pending' | 'approved' | 'processing' | 'settled' | 'failed'; date: string; settledAt: string;
};

const payouts: Payout[] = [
  { id:'PAY-4821',partner:'Burger King (Andheri)',partnerId:'RES-001',module:'Restaurant',grossSales:'₹2,45,000',commission:'₹49,000',commRate:'20%',netPayout:'₹1,96,000',method:'NEFT',bankAcc:'HDFC ****4521',status:'pending',date:'Today',settledAt:'—'},
  { id:'PAY-4820',partner:'Apple India Store',partnerId:'MV-001',module:'Marketplace',grossSales:'₹8,20,000',commission:'₹98,400',commRate:'12%',netPayout:'₹7,21,600',method:'NEFT',bankAcc:'ICICI ****7832',status:'approved',date:'Today',settledAt:'—'},
  { id:'PAY-4819',partner:'MedPlus Pharmacy',partnerId:'PH-001',module:'Pharmacy',grossSales:'₹1,80,000',commission:'₹27,000',commRate:'15%',netPayout:'₹1,53,000',method:'IMPS',bankAcc:'SBI ****2145',status:'settled',date:'Yesterday',settledAt:'29 May, 2:15 PM'},
  { id:'PAY-4818',partner:'MetroFleet Logistics',partnerId:'TXV-002',module:'Taxi',grossSales:'₹84,000',commission:'₹8,400',commRate:'10%',netPayout:'₹75,600',method:'NEFT',bankAcc:'BOB ****9087',status:'failed',date:'Yesterday',settledAt:'Bank Error'},
  { id:'PAY-4817',partner:'City Supermart',partnerId:'GS-001',module:'Grocery',grossSales:'₹4,20,000',commission:'₹63,000',commRate:'15%',netPayout:'₹3,57,000',method:'NEFT',bankAcc:'HDFC ****1234',status:'settled',date:'28 May',settledAt:'28 May, 6:30 PM'},
  { id:'PAY-4816',partner:'Dr. Anjali Mehta',partnerId:'DOC-001',module:'Doctor',grossSales:'₹63,000',commission:'₹9,450',commRate:'15%',netPayout:'₹53,550',method:'UPI',bankAcc:'upi@oksbi',status:'processing',date:'Today',settledAt:'—'},
  { id:'PAY-4815',partner:'QuickRide Fleet',partnerId:'TXV-001',module:'Taxi',grossSales:'₹1,24,000',commission:'₹12,400',commRate:'10%',netPayout:'₹1,11,600',method:'NEFT',bankAcc:'Axis ****5678',status:'settled',date:'28 May',settledAt:'28 May, 4:00 PM'},
  { id:'PAY-4814',partner:'Pizza Palace',partnerId:'RES-002',module:'Restaurant',grossSales:'₹1,80,000',commission:'₹36,000',commRate:'20%',netPayout:'₹1,44,000',method:'NEFT',bankAcc:'HDFC ****8901',status:'pending',date:'Today',settledAt:'—'},
  { id:'PAY-4813',partner:'Ravi Kumar (Driver)',partnerId:'DRV-001',module:'Delivery',grossSales:'₹12,400',commission:'₹0',commRate:'0%',netPayout:'₹12,400',method:'IMPS',bankAcc:'SBI ****3456',status:'settled',date:'28 May',settledAt:'28 May, 8:00 PM'},
  { id:'PAY-4812',partner:'Mumbai South Franchise',partnerId:'FR-001',module:'Franchise',grossSales:'₹3,40,000',commission:'₹1,18,200',commRate:'—',netPayout:'₹1,18,200',method:'NEFT',bankAcc:'ICICI ****6789',status:'approved',date:'Today',settledAt:'—'},
];

/**
 * A status the API returns that this map does not know about must render as
 * itself, not crash. `sCfg[p.status].bg` threw
 * `Cannot read properties of undefined (reading 'bg')` for any value outside
 * the five below — and because it is inside the table body, one unexpected row
 * blanked the whole Payouts page.
 */
const sFallback = { bg: 'bg-slate-100 text-slate-600', icon: null as React.ReactNode };
const sCfg: Record<string,{bg:string;icon:React.ReactNode}> = {
  pending:{bg:'bg-amber-100 text-amber-700',icon:<Clock className="w-3.5 h-3.5"/>},
  approved:{bg:'bg-blue-100 text-blue-700',icon:<CheckCircle className="w-3.5 h-3.5"/>},
  processing:{bg:'bg-indigo-100 text-indigo-700',icon:<RefreshCcw className="w-3.5 h-3.5"/>},
  settled:{bg:'bg-emerald-100 text-emerald-700',icon:<CheckCircle className="w-3.5 h-3.5"/>},
  failed:{bg:'bg-red-100 text-red-700',icon:<XCircle className="w-3.5 h-3.5"/>},
};

const modC:Record<string,string>={Marketplace:'bg-blue-100 text-blue-700',Grocery:'bg-green-100 text-green-700',Restaurant:'bg-orange-100 text-orange-700',Pharmacy:'bg-cyan-100 text-cyan-700',Doctor:'bg-purple-100 text-purple-700',Taxi:'bg-amber-100 text-amber-700',Delivery:'bg-violet-100 text-violet-700',Franchise:'bg-teal-100 text-teal-700'};

export default function PayoutsPage(){
  const { regionLabel, isFiltered } = useMarketplaceRegionFilter([]);
  const [search,setSearch]=useState('');const [sf,setSf]=useState('All');const [mf,setMf]=useState('All');const [exp,setExp]=useState<string|null>(null);
  const [data,setData]=useState(payouts);

  const adminId = typeof window !== 'undefined' ? localStorage.getItem('adminUserId') || 'admin' : 'admin';

  // Fetch payout data from backend on mount
  useEffect(() => {
    (async () => {
      const res = await adminCoreApi.getPayouts();
      if (res.success && Array.isArray((res.data as any)?.data)) {
        const apiPayouts = (res.data as any).data;
        if (apiPayouts.length > 0) setData(apiPayouts);
      }
    })();
  }, []);

  const f=data.filter(p=>{
    // Coerced, because the rows come from `getPayouts()` and the API's shape is
    // not this page's to assume: a payout row without a `partner` threw
    // `Cannot read properties of undefined (reading 'toLowerCase')` during the
    // filter, which is above the table in the render — so one bad row removed
    // the whole page rather than itself.
    const partner=String(p.partner??'');
    const id=String(p.id??'');
    const q=search.toLowerCase();
    const ms=partner.toLowerCase().includes(q)||id.toLowerCase().includes(q);
    const mst=sf==='All'||p.status===sf;const mm=mf==='All'||p.module===mf;return ms&&mst&&mm;
  });

  const approvePayout = async (id:string) => {
    setData(pr=>pr.map(p=>p.id===id?{...p,status:'approved' as const}:p));
    await adminCoreApi.approvePayout(id, adminId);
    await adminCoreApi.addAuditLog({ action: 'payout.approved', adminId, entityType: 'payout', entityId: id });
  };
  const retryPayout = async (id:string) => {
    setData(pr=>pr.map(p=>p.id===id?{...p,status:'processing' as const}:p));
    await adminCoreApi.retryPayout(id, adminId);
    await adminCoreApi.addAuditLog({ action: 'payout.retried', adminId, entityType: 'payout', entityId: id });
  };

  const totalPending=data.filter(p=>p.status==='pending').length;
  const totalSettled=data.filter(p=>p.status==='settled').length;

  return(<div className="max-w-7xl mx-auto space-y-6">
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div><h1 className="text-2xl font-bold text-slate-900">Payouts & Settlements</h1><p className="text-slate-500 text-sm">Manage, approve, and track financial settlements for all partners across modules.</p></div>
      <button className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-4 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm"><Download className="w-4 h-4"/> Export Report</button>
    </div>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-linear-to-br from-emerald-500 to-emerald-600 p-5 rounded-xl shadow-md text-white"><DollarSign className="w-5 h-5 opacity-80"/><p className="text-3xl font-black mt-3">₹14.2M</p><p className="text-sm font-medium opacity-80 mt-1">Pending Approval</p><p className="text-xs font-bold opacity-70 mt-1">{totalPending} partners</p></div>
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"><CheckCircle className="w-5 h-5 text-emerald-500"/><p className="text-2xl font-black text-slate-900 mt-3">₹8.4M</p><p className="text-sm text-slate-500 font-medium mt-1">Settled (7 Days)</p><p className="text-xs text-emerald-600 font-bold mt-1">{totalSettled} transfers</p></div>
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"><Landmark className="w-5 h-5 text-indigo-500"/><p className="text-2xl font-black text-slate-900 mt-3">₹1.8M</p><p className="text-sm text-slate-500 font-medium mt-1">Platform Commission</p><p className="text-xs text-indigo-600 font-bold mt-1">7-day earnings</p></div>
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"><AlertTriangle className="w-5 h-5 text-red-500"/><p className="text-2xl font-black text-slate-900 mt-3">₹112K</p><p className="text-sm text-slate-500 font-medium mt-1">Failed Transfers</p><p className="text-xs text-red-600 font-bold mt-1">{data.filter(p=>p.status==='failed').length} need retry</p></div>
    </div>

    <div className="flex flex-col md:flex-row gap-3">
      <div className="flex-1 relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input placeholder="Search by partner name or payout ID..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"/></div>
      <select title="Module filter" value={mf} onChange={e=>setMf(e.target.value)} className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white"><option value="All">All Modules</option><option value="Marketplace">Marketplace</option><option value="Grocery">Grocery</option><option value="Restaurant">Restaurant</option><option value="Pharmacy">Pharmacy</option><option value="Doctor">Doctor</option><option value="Taxi">Taxi</option><option value="Delivery">Delivery</option><option value="Franchise">Franchise</option></select>
      <select title="Status filter" value={sf} onChange={e=>setSf(e.target.value)} className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white"><option value="All">All Status</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="processing">Processing</option><option value="settled">Settled</option><option value="failed">Failed</option></select>
    </div>

    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left text-sm">
      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200"><tr><th className="px-5 py-3.5 font-semibold">Partner</th><th className="px-5 py-3.5 font-semibold">Module</th><th className="px-5 py-3.5 font-semibold text-right">Gross Sales</th><th className="px-5 py-3.5 font-semibold text-right">Commission</th><th className="px-5 py-3.5 font-semibold text-right">Net Payout</th><th className="px-5 py-3.5 font-semibold text-center">Status</th><th className="px-5 py-3.5 font-semibold text-center">Actions</th></tr></thead>
      <tbody className="divide-y divide-slate-100">{f.map(p=>(<React.Fragment key={p.id}>
        <tr className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={()=>setExp(exp===p.id?null:p.id)} tabIndex={0} onKeyDown={activateOnKey(()=>setExp(exp===p.id?null:p.id))}>
          <td className="px-5 py-4"><p className="font-bold text-slate-900">{p.partner}</p><p className="text-xs text-slate-400">{p.id} • {p.date}</p></td>
          <td className="px-5 py-4"><span className={`${modC[p.module]||'bg-slate-100 text-slate-600'} px-2.5 py-1 rounded-md text-xs font-bold`}>{p.module}</span></td>
          <td className="px-5 py-4 text-right font-medium text-slate-900">{p.grossSales}</td>
          <td className="px-5 py-4 text-right"><span className="text-red-600 font-medium">-{p.commission}</span><span className="text-xs text-slate-400 ml-1">({p.commRate})</span></td>
          <td className="px-5 py-4 text-right font-black text-emerald-600">{p.netPayout}</td>
          <td className="px-5 py-4 text-center"><span className={`${(sCfg[p.status] ?? sFallback).bg} px-2.5 py-1 rounded-full text-xs font-bold capitalize inline-flex items-center gap-1`}>{(sCfg[p.status] ?? sFallback).icon} {p.status ?? 'unknown'}</span></td>
          <td className="px-5 py-4 text-center">
            {p.status==='pending'&&<button onClick={e=>{e.stopPropagation();approvePayout(p.id)}} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg">Approve</button>}
            {p.status==='failed'&&<button onClick={e=>{e.stopPropagation();retryPayout(p.id)}} className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold px-4 py-2 rounded-lg">Retry</button>}
            {p.status==='settled'&&<button onClick={e=>e.stopPropagation()} className="text-blue-600 text-xs font-bold hover:underline">Invoice</button>}
            {(p.status==='approved'||p.status==='processing')&&<span className="text-xs text-slate-400">In progress</span>}
          </td>
        </tr>
        {exp===p.id&&(<tr className="bg-slate-50/80"><td colSpan={7} className="px-5 py-5">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div><p className="text-slate-400 text-xs font-medium mb-1">Partner ID</p><p className="font-bold text-slate-700">{p.partnerId}</p></div>
            <div><p className="text-slate-400 text-xs font-medium mb-1">Transfer Method</p><p className="font-bold text-slate-700">{p.method}</p></div>
            <div><p className="text-slate-400 text-xs font-medium mb-1">Bank Account</p><p className="font-bold text-slate-700">{p.bankAcc}</p></div>
            <div><p className="text-slate-400 text-xs font-medium mb-1">Settled At</p><p className="font-bold text-slate-700">{p.settledAt}</p></div>
            <div><p className="text-slate-400 text-xs font-medium mb-1">Net Payout</p><p className="font-black text-emerald-600 text-lg">{p.netPayout}</p></div>
          </div>
        </td></tr>)}
      </React.Fragment>))}</tbody></table></div>
      <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/50 text-sm text-slate-500">Showing {f.length} of {data.length} payouts</div>
    </div>
  </div>);
}
