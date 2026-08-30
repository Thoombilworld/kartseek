'use client';
import { useDoctorRegionFilter } from '@/hooks/useDoctorRegionFilter';
import React, { useState } from 'react';
import { FileCheck, Search, CheckCircle, XCircle, Eye, Clock, Download, AlertTriangle } from 'lucide-react';

const DOCS = [
  { id: 'd1', provider: 'Dr. Meera Nair', providerType: 'Doctor', docType: 'Medical License', file: 'medical_license.pdf', size: '2.1 MB', uploadedAt: 'Jun 12, 2026', status: 'pending' as const },
  { id: 'd2', provider: 'Coast General Hospital', providerType: 'Hospital', docType: 'Establishment License', file: 'est_license.pdf', size: '3.5 MB', uploadedAt: 'Jun 11, 2026', status: 'pending' as const },
  { id: 'd3', provider: 'Apollo Hospital', providerType: 'Hospital', docType: 'Tax Certificate', file: 'gst_cert.pdf', size: '1.2 MB', uploadedAt: 'Jun 11, 2026', status: 'pending' as const },
  { id: 'd4', provider: 'MP Shah Hospital', providerType: 'Hospital', docType: 'Insurance Certificate', file: 'insurance.pdf', size: '2.8 MB', uploadedAt: 'Jun 10, 2026', status: 'pending' as const },
  { id: 'd5', provider: 'Family Health Clinic', providerType: 'Clinic', docType: 'Registration Certificate', file: 'reg_cert.pdf', size: '1.5 MB', uploadedAt: 'Jun 9, 2026', status: 'pending' as const },
  { id: 'd6', provider: 'Dr. Vikram Tiwari', providerType: 'Doctor', docType: 'ID Proof', file: 'national_id.jpg', size: '850 KB', uploadedAt: 'Jun 8, 2026', status: 'rejected' as const },
  { id: 'd7', provider: 'Dr. Amara Okonkwo', providerType: 'Doctor', docType: 'Medical License', file: 'medical_license.pdf', size: '2.0 MB', uploadedAt: 'Jan 15, 2026', status: 'verified' as const },
  { id: 'd8', provider: 'Mumbai Hospital', providerType: 'Hospital', docType: 'Establishment License', file: 'est_license.pdf', size: '4.1 MB', uploadedAt: 'Jan 10, 2020', status: 'verified' as const },
];

const sCfg: Record<string, { bg: string; l: string }> = { pending: { bg: 'bg-amber-50 text-amber-700 border-amber-200', l: 'Pending' }, verified: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', l: 'Verified' }, rejected: { bg: 'bg-red-50 text-red-700 border-red-200', l: 'Rejected' } };

export default function AdminDocumentsPage() {
  const { regionLabel, isFiltered, formatPrice } = useDoctorRegionFilter([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setSf] = useState('pending');
  const [data, setData] = useState(DOCS);

  const filtered = data.filter(d => {
    const ms = d.provider.toLowerCase().includes(search.toLowerCase()) || d.docType.toLowerCase().includes(search.toLowerCase());
    const mf = statusFilter === 'all' || d.status === statusFilter;
    return ms && mf;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div><h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><FileCheck className="w-6 h-6 text-amber-600" /> Document Verification</h1><p className="text-sm text-slate-500 mt-1">Review and verify provider documents</p></div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4"><p className="text-2xl font-black text-amber-700">{data.filter(d=>d.status==='pending').length}</p><p className="text-xs text-amber-600">Pending Review</p></div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4"><p className="text-2xl font-black text-emerald-700">{data.filter(d=>d.status==='verified').length}</p><p className="text-xs text-emerald-600">Verified</p></div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4"><p className="text-2xl font-black text-red-700">{data.filter(d=>d.status==='rejected').length}</p><p className="text-xs text-red-600">Rejected</p></div>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative"><Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input placeholder="Search by provider or document type..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 bg-white" /></div>
        <div className="flex gap-2">{['pending','all','verified','rejected'].map(s => (<button key={s} onClick={() => setSf(s)} className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${statusFilter === s ? 'bg-amber-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{s === 'all' ? 'All' : s.charAt(0).toUpperCase()+s.slice(1)}</button>))}</div>
      </div>
      <div className="space-y-3">
        {filtered.map(d => (
          <div key={d.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center shrink-0"><FileCheck className="w-6 h-6 text-amber-600" /></div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-900 text-sm">{d.docType}</p>
              <p className="text-[11px] text-slate-400">From: {d.provider} ({d.providerType}) · {d.file} · {d.size}</p>
              <p className="text-[11px] text-slate-400">Uploaded: {d.uploadedAt}</p>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${sCfg[d.status]?.bg}`}>{sCfg[d.status]?.l}</span>
            <div className="flex gap-1.5 shrink-0">
              <button className="p-1.5 bg-slate-50 text-slate-500 rounded-lg hover:bg-slate-100 transition-colors" title="View"><Eye className="w-4 h-4" /></button>
              {d.status === 'pending' && (
                <>
                  <button onClick={() => setData(ds => ds.map(x => x.id === d.id ? {...x, status: 'verified' as const} : x))} className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors" title="Approve"><CheckCircle className="w-4 h-4" /></button>
                  <button onClick={() => setData(ds => ds.map(x => x.id === d.id ? {...x, status: 'rejected' as const} : x))} className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors" title="Reject"><XCircle className="w-4 h-4" /></button>
                </>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="py-16 text-center bg-white rounded-2xl border border-slate-200"><FileCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500 font-semibold">No documents found</p></div>}
      </div>
    </div>
  );
}
