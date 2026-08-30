'use client';
import React, { useState, useEffect } from 'react';
import { FileCheck, Upload, CheckCircle, Clock, XCircle, Eye, Download, AlertTriangle } from 'lucide-react';
import { vendorDoctorApi } from '@/lib/api/vendor-doctor';

const DOCUMENTS = [
  { id: 'd1', name: 'Medical License', type: 'medical_license', file: 'medical_license_2026.pdf', size: '2.1 MB', status: 'verified', uploadedAt: 'Jan 15, 2026', verifiedAt: 'Jan 18, 2026', expiry: 'Dec 31, 2027' },
  { id: 'd2', name: 'MBBS Degree Certificate', type: 'degree_certificate', file: 'mbbs_degree.pdf', size: '1.4 MB', status: 'verified', uploadedAt: 'Jan 15, 2026', verifiedAt: 'Jan 18, 2026', expiry: null },
  { id: 'd3', name: 'MD Specialization', type: 'degree_certificate', file: 'md_certificate.pdf', size: '1.8 MB', status: 'verified', uploadedAt: 'Jan 15, 2026', verifiedAt: 'Jan 20, 2026', expiry: null },
  { id: 'd4', name: 'ID Proof (National ID)', type: 'id_proof', file: 'national_id.jpg', size: '850 KB', status: 'verified', uploadedAt: 'Jan 15, 2026', verifiedAt: 'Jan 17, 2026', expiry: 'Mar 15, 2030' },
  { id: 'd5', name: 'Professional Indemnity Insurance', type: 'insurance', file: 'insurance_policy.pdf', size: '3.2 MB', status: 'pending', uploadedAt: 'Jun 10, 2026', verifiedAt: null, expiry: 'Jun 30, 2027' },
  { id: 'd6', name: 'Tax Compliance Certificate', type: 'tax_certificate', file: 'kra_compliance.pdf', size: '540 KB', status: 'rejected', uploadedAt: 'Jun 5, 2026', verifiedAt: null, expiry: null },
];

const STATUS_CFG: Record<string, { icon: any; bg: string; label: string }> = {
  verified: { icon: CheckCircle, bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Verified' },
  pending: { icon: Clock, bg: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Pending Review' },
  rejected: { icon: XCircle, bg: 'bg-red-50 text-red-700 border-red-200', label: 'Rejected' },
  expired: { icon: AlertTriangle, bg: 'bg-orange-50 text-orange-700 border-orange-200', label: 'Expired' },
};

export default function DocumentsPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div><h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><FileCheck className="w-6 h-6 text-violet-600" /> Documents & Verification</h1><p className="text-sm text-slate-500 mt-1">Upload and manage your verification documents</p></div>
        <button className="bg-violet-600 hover:bg-violet-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors shadow-sm"><Upload className="w-4 h-4" /> Upload Document</button>
      </div>
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm"><p className="text-2xl font-black text-slate-900">{DOCUMENTS.length}</p><p className="text-xs text-slate-500 font-medium">Total Documents</p></div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4"><p className="text-2xl font-black text-emerald-700">{DOCUMENTS.filter(d=>d.status==='verified').length}</p><p className="text-xs text-emerald-600 font-medium">Verified</p></div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4"><p className="text-2xl font-black text-amber-700">{DOCUMENTS.filter(d=>d.status==='pending').length}</p><p className="text-xs text-amber-600 font-medium">Pending</p></div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4"><p className="text-2xl font-black text-red-700">{DOCUMENTS.filter(d=>d.status==='rejected').length}</p><p className="text-xs text-red-600 font-medium">Rejected</p></div>
      </div>
      {/* Document List */}
      <div className="space-y-3">
        {DOCUMENTS.map(d => {
          const cfg = STATUS_CFG[d.status];
          const Icon = cfg.icon;
          return (
            <div key={d.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 flex items-center gap-4">
              <div className="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center shrink-0"><FileCheck className="w-6 h-6 text-violet-600" /></div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 text-sm">{d.name}</p>
                <p className="text-[11px] text-slate-400">{d.file} · {d.size} · Uploaded {d.uploadedAt}</p>
                {d.expiry && <p className="text-[11px] text-slate-400">Expires: {d.expiry}</p>}
                {d.status === 'rejected' && <p className="text-[11px] text-red-500 mt-1">Reason: Document quality too low. Please re-upload a clear scan.</p>}
              </div>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${cfg.bg}`}><Icon className="w-3.5 h-3.5" />{cfg.label}</span>
              <div className="flex gap-1.5 shrink-0">
                <button className="p-1.5 bg-slate-50 text-slate-500 rounded-lg hover:bg-slate-100 transition-colors" title="View"><Eye className="w-4 h-4" /></button>
                {d.status === 'rejected' && <button className="p-1.5 bg-violet-50 text-violet-600 rounded-lg hover:bg-violet-100 transition-colors" title="Re-upload"><Upload className="w-4 h-4" /></button>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
