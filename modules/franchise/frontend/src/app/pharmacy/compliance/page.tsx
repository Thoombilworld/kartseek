'use client';
import React, { useState } from 'react';
import { ShieldCheck, AlertTriangle, Clock, FileText, CheckCircle, XCircle, Upload, Eye, Calendar, Search } from 'lucide-react';

const STORES = [
  { id:'PH-001', name:'MedPlus Pharmacy', license:'PH-IN-2024-1234', expiry:'Dec 31, 2026', status:'verified', daysLeft:180, documents:['Drug License','GST','FSSAI'] },
  { id:'PH-002', name:'Apollo Pharmacy', license:'PH-IN-2024-5678', expiry:'Mar 15, 2027', status:'verified', daysLeft:254, documents:['Drug License','GST','FSSAI','Narcotics License'] },
  { id:'PH-003', name:'HealthFirst', license:'PH-IN-2023-9012', expiry:'Aug 10, 2026', status:'expiring', daysLeft:36, documents:['Drug License','GST'] },
  { id:'PH-004', name:'NetMeds Express', license:'PH-IN-2024-3456', expiry:'Nov 20, 2026', status:'verified', daysLeft:138, documents:['Drug License','GST','FSSAI'] },
  { id:'PH-005', name:'PharmEasy Store', license:'PH-IN-2024-7890', expiry:'Jan 5, 2027', status:'under_review', daysLeft:184, documents:['Drug License','GST'] },
  { id:'PH-006', name:'Care Chemist', license:'PH-IN-2023-1111', expiry:'Jun 15, 2026', status:'expired', daysLeft:-20, documents:['Drug License'] },
];

const STATUS_CFG: Record<string,{label:string,color:string,bg:string,icon:React.ComponentType<any>}> = {
  verified: { label:'Verified', color:'text-green-700', bg:'bg-green-50 border-green-200', icon:ShieldCheck },
  expiring: { label:'Expiring Soon', color:'text-amber-700', bg:'bg-amber-50 border-amber-200', icon:Clock },
  under_review: { label:'Under Review', color:'text-blue-700', bg:'bg-blue-50 border-blue-200', icon:Clock },
  expired: { label:'Expired', color:'text-red-700', bg:'bg-red-50 border-red-200', icon:XCircle }
};

export default function FranchisePharmacyCompliancePage() {
  const [search, setSearch] = useState('');
  const filtered = STORES.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()));

  const verified = STORES.filter(s => s.status === 'verified').length;
  const expiring = STORES.filter(s => s.status === 'expiring').length;
  const expired = STORES.filter(s => s.status === 'expired').length;

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Pharmacy Compliance</h1>
          <p className="text-sm text-slate-500">License verification and regulatory compliance for pharmacy stores.</p>
        </div>
        <div className="relative">
          <input type="text" placeholder="Search stores..." value={search} onChange={e=>setSearch(e.target.value)}
            className="pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm w-64 focus:outline-none focus:ring-2 focus:ring-teal-500" />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center"><FileText className="w-5 h-5 text-slate-500" /></div>
          <div><p className="text-xs text-slate-500">Total Stores</p><p className="text-xl font-black">{STORES.length}</p></div>
        </div>
        <div className="bg-white border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center"><ShieldCheck className="w-5 h-5 text-green-600" /></div>
          <div><p className="text-xs text-green-600">Verified</p><p className="text-xl font-black text-green-700">{verified}</p></div>
        </div>
        <div className="bg-white border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-amber-600" /></div>
          <div><p className="text-xs text-amber-600">Expiring</p><p className="text-xl font-black text-amber-700">{expiring}</p></div>
        </div>
        <div className="bg-white border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center"><XCircle className="w-5 h-5 text-red-600" /></div>
          <div><p className="text-xs text-red-600">Expired</p><p className="text-xl font-black text-red-700">{expired}</p></div>
        </div>
      </div>

      {/* Store cards */}
      <div className="space-y-4">
        {filtered.map(store => {
          const cfg = STATUS_CFG[store.status];
          const StatusIcon = cfg.icon;
          return (
            <div key={store.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-teal-300 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{store.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">License: {store.license}</p>
                </div>
                <span className={`px-3 py-1 border rounded-full text-[11px] font-bold flex items-center gap-1 ${cfg.bg} ${cfg.color}`}>
                  <StatusIcon className="w-3 h-3" /> {cfg.label}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-[10px] text-slate-400">Expires</p>
                    <p className={`text-sm font-bold ${store.daysLeft < 0 ? 'text-red-600' : store.daysLeft < 60 ? 'text-amber-600' : 'text-slate-900'}`}>
                      {store.expiry} {store.daysLeft > 0 ? `(${store.daysLeft}d left)` : '(EXPIRED)'}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 mb-1">Documents</p>
                  <div className="flex flex-wrap gap-1">
                    {store.documents.map(d => <span key={d} className="px-2 py-0.5 bg-slate-50 text-slate-600 text-[10px] font-medium rounded-full">{d}</span>)}
                  </div>
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <button className="px-3 py-1.5 bg-slate-50 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-100 flex items-center gap-1">
                    <Eye className="w-3 h-3" /> View
                  </button>
                  {(store.status === 'expired' || store.status === 'expiring') && (
                    <button className="px-3 py-1.5 bg-amber-50 text-amber-700 text-xs font-bold rounded-lg hover:bg-amber-100 flex items-center gap-1">
                      <Upload className="w-3 h-3" /> Request Renewal
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
