'use client';
import React from 'react';
import { FileCheck, Upload, CheckCircle, Clock, Download } from 'lucide-react';
const docs=[
  {name:'Trade License',status:'verified',uploadedAt:'Jan 15, 2025',expiresAt:'Mar 15, 2028'},
  {name:'Tourism License',status:'verified',uploadedAt:'Jan 15, 2025',expiresAt:'Mar 15, 2028'},
  {name:'Fire Safety Certificate',status:'verified',uploadedAt:'Jan 20, 2025',expiresAt:'Jan 20, 2027'},
  {name:'Insurance Policy',status:'verified',uploadedAt:'Feb 1, 2025',expiresAt:'Feb 1, 2027'},
  {name:'Health & Safety Compliance',status:'pending',uploadedAt:'Jun 10, 2026',expiresAt:'Pending Review'},
];
export default function DocumentsPage(){
  return(<div className="space-y-6">
    <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold text-slate-900">Documents & Verification</h1><p className="text-slate-500 text-sm">Upload and manage hotel licenses and legal documents.</p></div><button className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5"><Upload className="w-4 h-4"/>Upload Document</button></div>
    <div className="space-y-3">{docs.map(d=>(
      <div key={d.name} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3"><FileCheck className={`w-5 h-5 ${d.status==='verified'?'text-emerald-500':'text-amber-500'}`}/><div><p className="font-bold text-slate-900">{d.name}</p><p className="text-xs text-slate-400">Uploaded {d.uploadedAt} · Expires {d.expiresAt}</p></div></div>
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${d.status==='verified'?'bg-emerald-100 text-emerald-700':'bg-amber-100 text-amber-700'}`}>{d.status==='verified'?<><CheckCircle className="w-3 h-3"/>Verified</>:<><Clock className="w-3 h-3"/>Pending</>}</span>
          <button title="Download document" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><Download className="w-3.5 h-3.5"/></button>
        </div>
      </div>
    ))}</div>
  </div>);
}
