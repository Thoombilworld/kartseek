'use client';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';
import { adminCoreApi } from '@/lib/api/admin-core';
import React, { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, FileText, CheckCircle2, XCircle, FileSignature, Search, Building2, User, Image as ImageIcon } from 'lucide-react';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
type KycRecord = { entityId: string; entityType: string; businessName: string; ownerName: string; gstin?: string; submittedAt: string; city?: string; state?: string; documents?: { name: string; type: string; url: string; size: string }[] };

const MOCK_QUEUE: KycRecord[] = [
  { entityId: 'PHRM-9921', entityType: 'pharmacy', businessName: 'MediCare Plus Pharmacy', ownerName: 'Dr. Suresh Mehta', gstin: '27AADCB2230M1Z2', submittedAt: new Date().toISOString(), city: 'Mumbai', state: 'MH', documents: [{ name: 'Drug License (Form 20/21)', type: 'license', url: '#', size: '2.4 MB' }, { name: 'GST Registration Certificate', type: 'gst', url: '#', size: '1.1 MB' }, { name: 'Owner PAN Card', type: 'identity', url: '#', size: '800 KB' }] },
  { entityId: 'REST-8122', entityType: 'restaurant', businessName: 'The Spice Route Kitchen', ownerName: 'Priya Sharma', submittedAt: new Date(Date.now() - 86400000).toISOString(), city: 'New Delhi', state: 'DL' },
  { entityId: 'TAXI-1102', entityType: 'taxi', businessName: 'CityRide Fleet Services', ownerName: 'Vikram S.', submittedAt: '2026-05-20T10:00:00Z', city: 'Bangalore', state: 'KA' },
];

const typeColors: Record<string, string> = { pharmacy: 'bg-blue-100 text-blue-700', restaurant: 'bg-orange-100 text-orange-700', taxi: 'bg-yellow-100 text-yellow-700', marketplace: 'bg-purple-100 text-purple-700', grocery: 'bg-green-100 text-green-700' };

export default function AdminKYCVerificationPage() {
  const { regionLabel, isFiltered } = useMarketplaceRegionFilter([]);
  const [queue, setQueue] = useState<KycRecord[]>(MOCK_QUEUE);
  const [selected, setSelected] = useState<KycRecord | null>(MOCK_QUEUE[0]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const adminId = typeof window !== 'undefined' ? localStorage.getItem('adminUserId') || 'admin' : 'admin';

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    const res = await adminCoreApi.getPendingKyc();
    if (res.success) {
      const records = ((res.data as any)?.data ?? []) as KycRecord[];
      if (records.length > 0) {
        setQueue(records);
        setSelected(records[0]);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  const handleApprove = async () => {
    if (!selected) return;
    setActionLoading(true);
    await adminCoreApi.approveKyc(selected.entityId, selected.entityType, adminId);
    await adminCoreApi.addAuditLog({ action: 'kyc.approved', adminId, entityType: selected.entityType, entityId: selected.entityId });
    setQueue(q => q.filter(r => r.entityId !== selected.entityId));
    setSelected(queue.find(r => r.entityId !== selected.entityId) || null);
    setActionLoading(false);
  };

  const handleReject = async () => {
    if (!selected) return;
    setActionLoading(true);
    await adminCoreApi.rejectKyc(selected.entityId, selected.entityType, adminId, 'Documents not matching records');
    await adminCoreApi.addAuditLog({ action: 'kyc.rejected', adminId, entityType: selected.entityType, entityId: selected.entityId });
    setQueue(q => q.filter(r => r.entityId !== selected.entityId));
    setSelected(queue.find(r => r.entityId !== selected.entityId) || null);
    setActionLoading(false);
  };

  const formatDate = (d: string) => { try { const dt = new Date(d); const now = new Date(); const diff = now.getTime() - dt.getTime(); if (diff < 86400000) return 'Today, ' + dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); if (diff < 172800000) return 'Yesterday'; return dt.toLocaleDateString([], { month: 'short', day: 'numeric' }); } catch { return d; } };

  return (
    <div className="bg-slate-50 min-h-screen p-4 md:p-8 font-sans">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">KYC &amp; Document Verification</h1>
          <p className="text-slate-500 text-sm">Review business registrations, tax documents, and licenses for new partners.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search Partner or ID..." 
              className="pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64 shadow-sm"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Verification Queue (Left 1/3) */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[700px]">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h2 className="font-bold text-slate-900 text-sm">Pending Review Queue ({queue.length})</h2>
          </div>
          <div className="overflow-auto divide-y divide-slate-100 flex-1">
            {queue.map(record => (
              <div key={record.entityId} onClick={() => setSelected(record)} role="button" tabIndex={0} onKeyDown={activateOnKey(() => setSelected(record))} className={`p-4 cursor-pointer border-l-4 transition-colors ${selected?.entityId === record.entityId ? 'bg-indigo-50/50 border-l-indigo-600' : 'hover:bg-slate-50 border-l-transparent'}`}>
                <div className="flex justify-between items-start mb-2">
                  <span className={`${typeColors[record.entityType] || 'bg-slate-100 text-slate-600'} text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider`}>{record.entityType}</span>
                  <span className="text-xs text-slate-500 font-medium">{formatDate(record.submittedAt)}</span>
                </div>
                <p className="font-bold text-slate-900 text-sm mb-0.5">{record.businessName}</p>
                <p className="text-xs text-slate-500">ID: {record.entityId} • {record.city || ''}{record.state ? `, ${record.state}` : ''}</p>
              </div>
            ))}
            {queue.length === 0 && <div className="p-8 text-center text-slate-400 text-sm">No pending KYC applications</div>}
          </div>
        </div>

        {/* Review Panel (Right 2/3) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[700px]">
          <div className="p-6 border-b border-slate-200">
            <div className="flex justify-between items-start">
               <div>
                 <div className="flex items-center gap-3 mb-2">
                   <h2 className="text-2xl font-bold text-slate-900">{selected?.businessName || 'Select a KYC application'}</h2>
                   {selected && <span className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-full border border-amber-200">Under Review</span>}
                 </div>
                 {selected && <p className="text-slate-500 flex items-center gap-4 text-sm">
                   {selected.gstin && <span className="flex items-center gap-1.5"><Building2 className="w-4 h-4" /> GSTIN: {selected.gstin}</span>}
                   <span className="flex items-center gap-1.5"><User className="w-4 h-4" /> Owner: {selected.ownerName}</span>
                 </p>}
               </div>
               <button className="text-indigo-600 text-sm font-bold hover:underline">View Full Profile</button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-6 bg-slate-50/50">
             <h3 className="font-bold text-slate-900 mb-4 text-sm uppercase tracking-wider">Submitted Documents (3)</h3>
             <div className="space-y-4">
               {/* Document 1 */}
               <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                 <div className="flex justify-between items-start mb-4">
                   <div className="flex gap-3">
                     <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0"><FileSignature className="w-5 h-5" /></div>
                     <div>
                       <p className="font-bold text-slate-900 text-sm">Drug License (Form 20/21)</p>
                       <p className="text-xs text-slate-500 mb-1">Required for Pharmacy Operations</p>
                       <a href="#" className="text-xs font-bold text-indigo-600 hover:underline">license_doc_2025.pdf (2.4 MB)</a>
                     </div>
                   </div>
                   <div className="flex gap-2">
                     <button className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 transition-colors" title="Approve Document"><CheckCircle2 className="w-4 h-4" /></button>
                     <button className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors" title="Reject Document"><XCircle className="w-4 h-4" /></button>
                   </div>
                 </div>
                 <div className="w-full h-32 bg-slate-100 rounded-lg border border-slate-200 flex flex-col items-center justify-center text-slate-400">
                   <FileText className="w-8 h-8 mb-2 opacity-50" />
                   <span className="text-xs font-medium uppercase tracking-wider">PDF Preview Area</span>
                 </div>
               </div>
               {/* Document 2 */}
               <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                 <div className="flex justify-between items-start mb-4">
                   <div className="flex gap-3">
                     <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0"><FileText className="w-5 h-5" /></div>
                     <div>
                       <p className="font-bold text-slate-900 text-sm">GST Registration Certificate</p>
                       <p className="text-xs text-slate-500 mb-1">Business Identity Proof</p>
                       <a href="#" className="text-xs font-bold text-indigo-600 hover:underline">gst_cert.pdf (1.1 MB)</a>
                     </div>
                   </div>
                   <div className="flex gap-2">
                     <button className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 transition-colors" title="Approve Document"><CheckCircle2 className="w-4 h-4" /></button>
                     <button className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors" title="Reject Document"><XCircle className="w-4 h-4" /></button>
                   </div>
                 </div>
               </div>
               {/* Document 3 */}
               <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                 <div className="flex justify-between items-start mb-4">
                   <div className="flex gap-3">
                     <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0"><ImageIcon className="w-5 h-5" /></div>
                     <div>
                       <p className="font-bold text-slate-900 text-sm">Owner PAN Card</p>
                       <p className="text-xs text-slate-500 mb-1">Identity Verification</p>
                       <a href="#" className="text-xs font-bold text-indigo-600 hover:underline">pan_front.jpg (800 KB)</a>
                     </div>
                   </div>
                   <div className="flex gap-2">
                     <button className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 transition-colors" title="Approve Document"><CheckCircle2 className="w-4 h-4" /></button>
                     <button className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors" title="Reject Document"><XCircle className="w-4 h-4" /></button>
                   </div>
                 </div>
               </div>
             </div>
          </div>

          {/* Action Footer */}
          <div className="p-4 border-t border-slate-200 bg-white flex justify-between items-center">
            <button disabled={actionLoading || !selected} onClick={handleReject} className="text-red-600 font-bold px-4 py-2 hover:bg-red-50 rounded-lg transition-colors text-sm border border-transparent hover:border-red-200 disabled:opacity-50">
              Reject Application
            </button>
            <div className="flex gap-3">
              <button className="bg-white border border-slate-300 text-slate-700 font-bold px-6 py-2 rounded-lg hover:bg-slate-50 transition-colors text-sm shadow-sm">
                Request Document Correction
              </button>
              <button disabled={actionLoading || !selected} onClick={handleApprove} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-2 rounded-lg transition-colors text-sm shadow-sm flex items-center gap-2 disabled:opacity-50">
                <CheckCircle2 className="w-4 h-4" /> {actionLoading ? 'Processing...' : 'Approve KYC'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
