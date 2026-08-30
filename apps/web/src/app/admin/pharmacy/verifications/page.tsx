'use client';
import { usePharmacyRegionFilter } from '@/hooks/usePharmacyRegionFilter';
import React, { useState, useEffect } from 'react';
import { FileCheck, Search, CheckCircle, XCircle, Eye, AlertTriangle, Shield } from 'lucide-react';
import { adminPharmacyApi } from '@/lib/api/admin-pharmacy';

const initVerifications = [
  { id:'VF-001',store:'CarePharm Plus',type:'Pharmacy License',status:'pending' as const,submitted:'12 Jun 2026',docType:'PDF',notes:'New store application. License from Bangalore authority.',owner:'Dr. Sunita' },
  { id:'VF-002',store:'HealthFirst',type:'License Renewal',status:'pending' as const,submitted:'11 Jun 2026',docType:'PDF',notes:'License expired 5 Jun 2026. Renewal document submitted.',owner:'Amit G.' },
  { id:'VF-003',store:'Apollo Pharmacy',type:'Pharmacist Registration',status:'approved' as const,submitted:'10 Jun 2026',docType:'PDF',notes:'Dr. Priya S. — RPH-88220. Verified against state board.',owner:'Priya S.' },
  { id:'VF-004',store:'MedPlus Pharmacy',type:'FSSAI Certificate',status:'approved' as const,submitted:'8 Jun 2026',docType:'JPG',notes:'FSSAI license valid till Mar 2027.',owner:'Dr. Ravi K.' },
  { id:'VF-005',store:'QuickMeds',type:'Narcotics License',status:'rejected' as const,submitted:'6 Jun 2026',docType:'PDF',notes:'Rejected — document appears forged. Escalated to compliance.',owner:'Deepak R.' },
  { id:'VF-006',store:'Netmeds Express',type:'Prescription Verification',status:'pending' as const,submitted:'13 Jun 2026',docType:'JPG',notes:'Rx for Schedule H1 drug. Requires pharmacist review.',owner:'Rohit M.' },
];

const stCfg:Record<string,{bg:string;l:string}>={pending:{bg:'bg-amber-100 text-amber-700',l:'Pending'},approved:{bg:'bg-emerald-100 text-emerald-700',l:'Approved'},rejected:{bg:'bg-red-100 text-red-700',l:'Rejected'}};

export default function PharmacyVerificationsPage() {
  const { regionLabel, isFiltered, formatPrice } = usePharmacyRegionFilter([]);
  const [search,setSearch]=useState('');const [sf,setSf]=useState('All');const [tf,setTf]=useState('All');
  const [data,setData]=useState(initVerifications);

  const types = [...new Set(data.map(v=>v.type))];
  const filtered=data.filter(v=>{
    const ms=v.store.toLowerCase().includes(search.toLowerCase())||v.id.toLowerCase().includes(search.toLowerCase());
    const mst=sf==='All'||v.status===sf;
    const mt=tf==='All'||v.type===tf;
    return ms&&mst&&mt;
  });

  const approve=(id:string)=>setData(p=>p.map(v=>v.id===id?{...v,status:'approved' as const}:v));
  const reject=(id:string)=>setData(p=>p.map(v=>v.id===id?{...v,status:'rejected' as const}:v));

  return(<div className="space-y-6">
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div><h1 className="text-2xl font-bold text-slate-900">Verifications & Compliance</h1><p className="text-slate-500 text-sm">Review and verify pharmacy licenses, pharmacist registrations, and prescription compliance documents.</p></div>
      <div className="flex gap-2 text-xs">
        <span className="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full font-bold">{data.filter(v=>v.status==='pending').length} Pending</span>
        <span className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full font-bold">{data.filter(v=>v.status==='approved').length} Verified</span>
        <span className="bg-red-100 text-red-700 px-3 py-1.5 rounded-full font-bold">{data.filter(v=>v.status==='rejected').length} Rejected</span>
      </div>
    </div>

    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5"/>
      <div><p className="text-sm font-bold text-amber-800">Compliance Notice</p><p className="text-xs text-amber-700 mt-0.5">All pharmacy stores must have verified licenses before they can list Rx products. Expired or revoked licenses automatically suspend the store.</p></div>
    </div>

    <div className="flex flex-wrap gap-3">
      <div className="flex-1 relative min-w-48"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input placeholder="Search verifications..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white"/></div>
      <select value={sf} onChange={e=>setSf(e.target.value)} className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white"><option value="All">All Status</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select>
      <select value={tf} onChange={e=>setTf(e.target.value)} className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white"><option value="All">All Types</option>{types.map(t=><option key={t} value={t}>{t}</option>)}</select>
    </div>

    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left text-sm">
      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200"><tr><th className="px-5 py-3.5 font-semibold">Document</th><th className="px-5 py-3.5 font-semibold">Store</th><th className="px-5 py-3.5 font-semibold">Type</th><th className="px-5 py-3.5 font-semibold text-center">Format</th><th className="px-5 py-3.5 font-semibold text-center">Status</th><th className="px-5 py-3.5 font-semibold text-center">Actions</th></tr></thead>
      <tbody className="divide-y divide-slate-100">{filtered.map(v=>(
        <tr key={v.id} className="hover:bg-slate-50/50">
          <td className="px-5 py-4"><p className="font-bold text-slate-900">{v.id}</p><p className="text-xs text-slate-400">{v.submitted} • {v.owner}</p></td>
          <td className="px-5 py-4 font-medium text-slate-700">{v.store}</td>
          <td className="px-5 py-4"><span className="bg-cyan-50 text-cyan-700 text-xs font-bold px-2 py-0.5 rounded">{v.type}</span></td>
          <td className="px-5 py-4 text-center"><span className={`text-xs font-bold ${v.docType==='PDF'?'text-red-500':'text-blue-500'}`}>{v.docType}</span></td>
          <td className="px-5 py-4 text-center"><span className={`${stCfg[v.status].bg} px-2.5 py-1 rounded-full text-xs font-bold`}>{stCfg[v.status].l}</span></td>
          <td className="px-5 py-4 text-center"><div className="flex items-center justify-center gap-1">
            {v.status==='pending'&&<><button onClick={()=>approve(v.id)} className="p-1.5 rounded-lg hover:bg-emerald-50" title="Approve"><CheckCircle className="w-4 h-4 text-emerald-500"/></button><button onClick={()=>reject(v.id)} className="p-1.5 rounded-lg hover:bg-red-50" title="Reject"><XCircle className="w-4 h-4 text-red-400"/></button></>}
            <button className="p-1.5 rounded-lg hover:bg-slate-100" title="View Document"><Eye className="w-4 h-4 text-slate-400"/></button>
          </div></td>
        </tr>
      ))}</tbody>
    </table></div></div>

    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <h2 className="font-bold text-slate-900 mb-3 flex items-center gap-2"><Shield className="w-5 h-5 text-cyan-600"/>Document Notes</h2>
      <div className="space-y-2">{data.filter(v=>v.notes).slice(0,4).map(v=>(
        <div key={v.id} className="bg-slate-50 rounded-lg p-3 flex items-start gap-3">
          <span className={`${stCfg[v.status].bg} px-2 py-0.5 rounded text-[10px] font-bold shrink-0 mt-0.5`}>{v.id}</span>
          <div><p className="text-xs text-slate-700 font-medium">{v.notes}</p><p className="text-[10px] text-slate-400 mt-1">{v.store} — {v.type}</p></div>
        </div>
      ))}</div>
    </div>
  </div>);
}
