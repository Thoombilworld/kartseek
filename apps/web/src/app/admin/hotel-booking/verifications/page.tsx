'use client';
import { useHotelRegionFilter } from '@/hooks/useHotelRegionFilter';
import React, { useState, useEffect } from 'react';
import { FileCheck, CheckCircle, Clock, XCircle, AlertTriangle, Eye, Download } from 'lucide-react';
import { adminHotelApi } from '@/lib/api/admin-hotel';
const docs=[
  {id:'DOC-001',hotel:'The Grand Palace Hotel',hotelId:'HTL-001',type:'Trade License',country:'AE',uploadedAt:'2025-01-15',expiresAt:'2028-03-15',status:'approved',reviewedBy:'Admin',reviewedAt:'2025-01-18'},
  {id:'DOC-002',hotel:'The Grand Palace Hotel',hotelId:'HTL-001',type:'Tourism License',country:'AE',uploadedAt:'2025-01-15',expiresAt:'2028-03-15',status:'approved',reviewedBy:'Admin',reviewedAt:'2025-01-18'},
  {id:'DOC-003',hotel:'Seaside Family Resort',hotelId:'HTL-003',type:'FSSAI Certificate',country:'IN',uploadedAt:'2024-11-10',expiresAt:'2027-11-10',status:'approved',reviewedBy:'Admin',reviewedAt:'2024-11-15'},
  {id:'DOC-004',hotel:'Budget Inn Express',hotelId:'HTL-004',type:'Trade License',country:'SA',uploadedAt:'2025-06-01',expiresAt:'2025-12-31',status:'under_review',reviewedBy:null,reviewedAt:null},
  {id:'DOC-005',hotel:'Oasis Desert Resort',hotelId:'HTL-006',type:'Trade License',country:'OM',uploadedAt:'2026-06-10',expiresAt:null,status:'pending',reviewedBy:null,reviewedAt:null},
  {id:'DOC-006',hotel:'Oasis Desert Resort',hotelId:'HTL-006',type:'Tourism License',country:'OM',uploadedAt:'2026-06-10',expiresAt:null,status:'pending',reviewedBy:null,reviewedAt:null},
];
const stCfg:Record<string,{bg:string;l:string;icon:any}>={approved:{bg:'bg-emerald-100 text-emerald-700',l:'Approved',icon:CheckCircle},under_review:{bg:'bg-amber-100 text-amber-700',l:'Under Review',icon:Clock},pending:{bg:'bg-blue-100 text-blue-700',l:'Pending',icon:Clock},rejected:{bg:'bg-red-100 text-red-700',l:'Rejected',icon:XCircle},expired:{bg:'bg-red-100 text-red-700',l:'Expired',icon:AlertTriangle}};
export default function VerificationsPage(){
  const { regionLabel, isFiltered, formatPrice } = useHotelRegionFilter([]);
  return(<div className="space-y-6">
    <div><h1 className="text-2xl font-bold text-slate-900">Verifications & Compliance</h1><p className="text-slate-500 text-sm">Review hotel licenses, legal documents, and country-wise compliance.</p></div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4"><p className="text-2xl font-black text-emerald-700">{docs.filter(d=>d.status==='approved').length}</p><p className="text-xs font-medium text-emerald-600">Approved</p></div>
      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4"><p className="text-2xl font-black text-amber-700">{docs.filter(d=>d.status==='under_review').length}</p><p className="text-xs font-medium text-amber-600">Under Review</p></div>
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4"><p className="text-2xl font-black text-blue-700">{docs.filter(d=>d.status==='pending').length}</p><p className="text-xs font-medium text-blue-600">Pending</p></div>
      <div className="bg-red-50 border border-red-100 rounded-xl p-4"><p className="text-2xl font-black text-red-700">0</p><p className="text-xs font-medium text-red-600">Expired / Rejected</p></div>
    </div>
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left text-sm">
      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200"><tr><th className="px-5 py-3.5 font-semibold">Document</th><th className="px-5 py-3.5 font-semibold">Hotel</th><th className="px-5 py-3.5 font-semibold text-center">Country</th><th className="px-5 py-3.5 font-semibold text-center">Expires</th><th className="px-5 py-3.5 font-semibold text-center">Status</th><th className="px-5 py-3.5 font-semibold text-center">Actions</th></tr></thead>
      <tbody className="divide-y divide-slate-100">{docs.map(d=>{const st=stCfg[d.status];const StIcon=st.icon;return(
        <tr key={d.id} className="hover:bg-slate-50/50">
          <td className="px-5 py-4"><p className="font-bold text-slate-900">{d.type}</p><p className="text-xs text-slate-400">{d.id} • Uploaded {d.uploadedAt}</p></td>
          <td className="px-5 py-4 text-sm text-slate-600">{d.hotel}</td>
          <td className="px-5 py-4 text-center"><span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-bold">{d.country}</span></td>
          <td className="px-5 py-4 text-center text-sm">{d.expiresAt||'—'}</td>
          <td className="px-5 py-4 text-center"><span className={`${st.bg} px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1`}><StIcon className="w-3 h-3"/>{st.l}</span></td>
          <td className="px-5 py-4 text-center"><div className="flex justify-center gap-1">
            <button title="View" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><Eye className="w-3.5 h-3.5"/></button>
            <button title="Download" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><Download className="w-3.5 h-3.5"/></button>
            {(d.status==='pending'||d.status==='under_review')&&<><button title="Approve" className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600"><CheckCircle className="w-3.5 h-3.5"/></button><button title="Reject" className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"><XCircle className="w-3.5 h-3.5"/></button></>}
          </div></td>
        </tr>
      );})}</tbody></table></div></div>
  </div>);
}
