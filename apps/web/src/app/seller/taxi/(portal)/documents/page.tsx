'use client';
import React, { useState, useEffect } from 'react';
import { FileText, Upload, CheckCircle, Clock, XCircle, AlertTriangle, Eye } from 'lucide-react';
import { vendorTaxiApi } from '@/lib/api/vendor-taxi';

const sCfg: Record<string, { bg: string; l: string }> = { approved: { bg: 'bg-emerald-100 text-emerald-700', l: 'Approved' }, pending: { bg: 'bg-blue-100 text-blue-700', l: 'Pending' }, rejected: { bg: 'bg-red-100 text-red-700', l: 'Rejected' }, expired: { bg: 'bg-amber-100 text-amber-700', l: 'Expired' } };

type DocStatus = 'approved' | 'pending' | 'rejected' | 'expired';

const docs: Array<{
  id: string; type: string; name: string; status: DocStatus;
  expiresAt: string | null; uploadedAt: string; reviewedAt: string | null;
}> = [
  { id: 'D1', type: 'business_license', name: 'Business License', status: 'approved', expiresAt: '2027-03-18', uploadedAt: '2025-03-15', reviewedAt: '2025-03-18' },
  { id: 'D2', type: 'tax_certificate', name: 'GST Certificate', status: 'approved', expiresAt: '2026-12-31', uploadedAt: '2025-03-15', reviewedAt: '2025-03-18' },
  { id: 'D3', type: 'insurance_certificate', name: 'Fleet Insurance', status: 'approved', expiresAt: '2026-08-15', uploadedAt: '2025-03-16', reviewedAt: '2025-03-19' },
  { id: 'D4', type: 'address_proof', name: 'Office Address Proof', status: 'pending', expiresAt: null, uploadedAt: '2026-06-10', reviewedAt: null },
  { id: 'D5', type: 'fleet_registration', name: 'Fleet Registration', status: 'rejected', expiresAt: null, uploadedAt: '2026-06-05', reviewedAt: '2026-06-08' },
];

const requiredDocs = ['business_license', 'tax_certificate', 'insurance_certificate', 'address_proof', 'fleet_registration'];
const missingDocs = requiredDocs.filter(r => !docs.find(d => d.type === r && d.status !== 'rejected'));

export default function VendorDocumentsPage() {
  const approvedCount = docs.filter(d => d.status === 'approved').length;
  const pendingCount = docs.filter(d => d.status === 'pending').length;
  const progress = Math.round((approvedCount / requiredDocs.length) * 100);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><FileText className="w-6 h-6 text-indigo-600" /> Documents</h1>
        <p className="text-slate-500 text-sm mt-1">Upload and manage your vendor compliance documents. All documents require Super Admin approval.</p>
      </div>

      {/* Progress */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-700">Document Compliance</h3>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${progress === 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{progress}% Complete</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2.5 mb-2">
          <div className={`h-2.5 rounded-full transition-all ${progress === 100 ? 'bg-emerald-500' : progress >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${progress}%` }} />
        </div>
        <p className="text-xs text-slate-500">{approvedCount} of {requiredDocs.length} required documents approved{pendingCount > 0 ? `, ${pendingCount} pending review` : ''}</p>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr><th className="px-5 py-3 font-semibold">Document</th><th className="px-4 py-3 font-semibold text-center">Status</th><th className="px-4 py-3 font-semibold">Uploaded</th><th className="px-4 py-3 font-semibold">Expires</th><th className="px-4 py-3 font-semibold text-center">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {docs.map(d => (
                <tr key={d.id} className="hover:bg-slate-50/50">
                  <td className="px-5 py-3"><p className="font-bold text-slate-900 text-xs">{d.name}</p><p className="text-[10px] text-slate-400 font-mono">{d.type}</p></td>
                  <td className="px-4 py-3 text-center"><span className={`${sCfg[d.status].bg} px-2.5 py-1 rounded-full text-[10px] font-bold`}>{sCfg[d.status].l}</span></td>
                  <td className="px-4 py-3 text-xs text-slate-500">{d.uploadedAt}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{d.expiresAt || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex gap-1.5 justify-center">
                      {d.status === 'approved' && <button className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold flex items-center gap-1" id={`view-${d.id}`}><Eye className="w-3 h-3" /> View</button>}
                      {(d.status === 'rejected' || d.status === 'expired') && <button className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1" id={`resubmit-${d.id}`}><Upload className="w-3 h-3" /> Resubmit</button>}
                      {d.status === 'pending' && <span className="text-[10px] text-blue-500 font-bold flex items-center gap-1"><Clock className="w-3 h-3" /> Under Review</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload */}
      <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-amber-400 transition-colors">
        <Upload className="w-8 h-8 text-slate-300 mx-auto mb-3" />
        <p className="text-sm font-bold text-slate-700 mb-1">Upload New Document</p>
        <p className="text-xs text-slate-400 mb-4">PDF, JPG or PNG, max 10MB</p>
        <button className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-md transition-colors" id="upload-doc-btn">Choose File</button>
      </div>
    </div>
  );
}
