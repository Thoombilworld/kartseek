'use client';
import { usePharmacyRegionFilter } from '@/hooks/usePharmacyRegionFilter';
import React, { useState } from 'react';
import { RotateCcw, Search, CheckCircle, XCircle, Eye, DollarSign, Clock } from 'lucide-react';

const initRefunds = [
  { id:'RF-001',orderId:'PO-1006',customer:'Grace M.',store:'BabyMed Pharmacy',amount:'₹680',reason:'Items damaged in transit',status:'pending' as const,date:'12 Jun 2026' },
  { id:'RF-002',orderId:'PO-0998',customer:'Alex K.',store:'HealthPlus Pharmacy',amount:'₹120',reason:'Wrong product delivered',status:'approved' as const,date:'11 Jun 2026' },
  { id:'RF-003',orderId:'PO-0985',customer:'Sarah L.',store:'Apollo Pharmacy',amount:'₹350',reason:'Product expired',status:'approved' as const,date:'10 Jun 2026' },
  { id:'RF-004',orderId:'PO-0972',customer:'Peter N.',store:'Netmeds Express',amount:'₹1,250',reason:'Customer changed mind',status:'rejected' as const,date:'9 Jun 2026' },
  { id:'RF-005',orderId:'PO-0960',customer:'John K.',store:'MedPlus Pharmacy',amount:'₹85',reason:'Duplicate order',status:'approved' as const,date:'8 Jun 2026' },
];

const stCfg:Record<string,{bg:string;l:string}>={pending:{bg:'bg-amber-100 text-amber-700',l:'Pending'},approved:{bg:'bg-emerald-100 text-emerald-700',l:'Approved'},rejected:{bg:'bg-red-100 text-red-700',l:'Rejected'}};

export default function PharmacyRefundsPage() {
  const { regionLabel, isFiltered, formatPrice } = usePharmacyRegionFilter([]);
  const [search,setSearch]=useState('');const [sf,setSf]=useState('All');
  const [data,setData]=useState(initRefunds);
  const filtered=data.filter(r=>{const ms=r.id.toLowerCase().includes(search.toLowerCase())||r.customer.toLowerCase().includes(search.toLowerCase());const mst=sf==='All'||r.status===sf;return ms&&mst;});
  const approve=(id:string)=>setData(p=>p.map(r=>r.id===id?{...r,status:'approved' as const}:r));
  const reject=(id:string)=>setData(p=>p.map(r=>r.id===id?{...r,status:'rejected' as const}:r));

  const totalPending=data.filter(r=>r.status==='pending').length;
  const totalApproved=data.filter(r=>r.status==='approved').length;

  return(<div className="space-y-6">
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div><h1 className="text-2xl font-bold text-slate-900">Refund Management</h1><p className="text-slate-500 text-sm">Review and process customer refund requests for pharmacy orders.</p></div>
      <div className="flex gap-2 text-xs">
        <span className="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full font-bold">{totalPending} Pending</span>
        <span className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full font-bold">{totalApproved} Approved</span>
      </div>
    </div>
    <div className="flex gap-3"><div className="flex-1 relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input placeholder="Search refunds..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white"/></div>
      <select value={sf} onChange={e=>setSf(e.target.value)} className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white"><option value="All">All Status</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></div>
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left text-sm">
      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200"><tr><th className="px-5 py-3.5 font-semibold">Refund ID</th><th className="px-5 py-3.5 font-semibold">Customer</th><th className="px-5 py-3.5 font-semibold">Store</th><th className="px-5 py-3.5 font-semibold text-right">Amount</th><th className="px-5 py-3.5 font-semibold">Reason</th><th className="px-5 py-3.5 font-semibold text-center">Status</th><th className="px-5 py-3.5 font-semibold text-center">Actions</th></tr></thead>
      <tbody className="divide-y divide-slate-100">{filtered.map(r=>(
        <tr key={r.id} className="hover:bg-slate-50/50">
          <td className="px-5 py-4"><p className="font-bold text-slate-900">{r.id}</p><p className="text-xs text-slate-400">Order: {r.orderId} • {r.date}</p></td>
          <td className="px-5 py-4 font-medium text-slate-700">{r.customer}</td>
          <td className="px-5 py-4 text-xs text-slate-600">{r.store}</td>
          <td className="px-5 py-4 text-right font-bold text-slate-900">{r.amount}</td>
          <td className="px-5 py-4 text-xs text-slate-600 max-w-48 truncate">{r.reason}</td>
          <td className="px-5 py-4 text-center"><span className={`${stCfg[r.status].bg} px-2.5 py-1 rounded-full text-xs font-bold`}>{stCfg[r.status].l}</span></td>
          <td className="px-5 py-4 text-center"><div className="flex items-center justify-center gap-1">
            {r.status==='pending'&&<><button onClick={()=>approve(r.id)} className="p-1.5 rounded-lg hover:bg-emerald-50" title="Approve"><CheckCircle className="w-4 h-4 text-emerald-500"/></button><button onClick={()=>reject(r.id)} className="p-1.5 rounded-lg hover:bg-red-50" title="Reject"><XCircle className="w-4 h-4 text-red-400"/></button></>}
            <button className="p-1.5 rounded-lg hover:bg-slate-100" title="View"><Eye className="w-4 h-4 text-slate-400"/></button>
          </div></td>
        </tr>
      ))}</tbody>
    </table></div></div>
  </div>);
}
