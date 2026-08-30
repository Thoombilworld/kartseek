'use client';
import { useTaxiRegionFilter } from '@/hooks/useTaxiRegionFilter';
import React, { useState, useEffect } from 'react';
import { CountryFlag } from '@/components/shared/country-flag';
import {
  Shield, CheckCircle, XCircle, Clock, Eye, FileText, ChevronDown,
  ChevronUp, AlertTriangle, Building2, Users, Car, MessageSquare,
  ThumbsUp, ThumbsDown, Info,
} from 'lucide-react';
import { adminTaxiApi } from '@/lib/api/admin-taxi';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
// ─── Types ──────────────────────────────────────────────────────────────────────
type ApprovalTab = 'vendors' | 'drivers' | 'documents';
type ItemStatus = 'pending' | 'approved' | 'rejected';

interface VendorApproval {
  id: string; name: string; country: string; code: string; flag: string; fleetSize: string;
  docsUploaded: number; docsTotal: number; submittedAt: string; status: ItemStatus;
  email: string; phone: string; city: string;
}

interface DriverApproval {
  id: string; driverName: string; vendorName: string; vendorId: string;
  country: string; code: string; flag: string; vehicle: string; plate: string;
  docsUploaded: number; docsTotal: number; submittedAt: string; status: ItemStatus;
}

interface DocApproval {
  id: string; ownerName: string; ownerType: 'vendor' | 'driver';
  docType: string; fileName: string; country: string; code: string; flag: string;
  submittedAt: string; status: ItemStatus; expiresAt?: string;
}

// ─── Mock Data ──────────────────────────────────────────────────────────────────
const vendorQueue: VendorApproval[] = [
  { id: 'VND-4821', name: 'QuickRide Fleet', country: 'India', code: 'IN', flag: '🇮🇳', fleetSize: 'Medium (11-50)', docsUploaded: 6, docsTotal: 6, submittedAt: 'Jun 17, 2026', status: 'pending', email: 'quickride@fleet.co.in', phone: '+91 712 345 678', city: 'Mumbai' },
  { id: 'VND-4822', name: 'SpeedCab India', country: 'India', code: 'IN', flag: '🇮🇳', fleetSize: 'Large (50+)', docsUploaded: 5, docsTotal: 6, submittedAt: 'Jun 16, 2026', status: 'pending', email: 'speedcab@india.com', phone: '+91 98765 43210', city: 'Mumbai' },
  { id: 'VND-4823', name: 'SafeRide UAE', country: 'UAE', code: 'AE', flag: '🇦🇪', fleetSize: 'Small (1-10)', docsUploaded: 6, docsTotal: 6, submittedAt: 'Jun 15, 2026', status: 'pending', email: 'saferide@uae.ae', phone: '+971 50 123 4567', city: 'Dubai' },
  { id: 'VND-4820', name: 'GreenCab London', country: 'UK', code: 'GB', flag: '🇬🇧', fleetSize: 'Medium (11-50)', docsUploaded: 6, docsTotal: 6, submittedAt: 'Jun 14, 2026', status: 'approved', email: 'greencab@london.uk', phone: '+44 7700 900000', city: 'London' },
];

const driverQueue: DriverApproval[] = [
  { id: 'DRV-2201', driverName: 'Amit Sharma', vendorName: 'QuickRide Fleet', vendorId: 'VND-4821', country: 'India', code: 'IN', flag: '🇮🇳', vehicle: 'Toyota Vitz', plate: 'MH 01 AB 1234', docsUploaded: 6, docsTotal: 6, submittedAt: 'Jun 17, 2026', status: 'pending' },
  { id: 'DRV-2202', driverName: 'Priya Patel', vendorName: 'QuickRide Fleet', vendorId: 'VND-4821', country: 'India', code: 'IN', flag: '🇮🇳', vehicle: 'Nissan Note', plate: 'MH 02 CD 5678', docsUploaded: 5, docsTotal: 6, submittedAt: 'Jun 17, 2026', status: 'pending' },
  { id: 'DRV-2203', driverName: 'Rajesh Patel', vendorName: 'SpeedCab India', vendorId: 'VND-4822', country: 'India', code: 'IN', flag: '🇮🇳', vehicle: 'Maruti Swift', plate: 'MH02-AB-1234', docsUploaded: 6, docsTotal: 6, submittedAt: 'Jun 16, 2026', status: 'pending' },
  { id: 'DRV-2204', driverName: 'Ahmed Al-Fahim', vendorName: 'SafeRide UAE', vendorId: 'VND-4823', country: 'UAE', code: 'AE', flag: '🇦🇪', vehicle: 'Toyota Camry', plate: 'DXB A-12345', docsUploaded: 6, docsTotal: 6, submittedAt: 'Jun 15, 2026', status: 'pending' },
];

const docQueue: DocApproval[] = [
  { id: 'DOC-9901', ownerName: 'Amit Sharma', ownerType: 'driver', docType: 'Commercial Vehicle Badge', fileName: 'psv_badge_kimani.pdf', country: 'India', code: 'IN', flag: '🇮🇳', submittedAt: 'Jun 17, 2026', status: 'pending', expiresAt: 'Dec 2027' },
  { id: 'DOC-9902', ownerName: 'QuickRide Fleet', ownerType: 'vendor', docType: 'Fleet Insurance Certificate', fileName: 'fleet_insurance_2026.pdf', country: 'India', code: 'IN', flag: '🇮🇳', submittedAt: 'Jun 17, 2026', status: 'pending', expiresAt: 'Jun 2027' },
  { id: 'DOC-9903', ownerName: 'Rajesh Patel', ownerType: 'driver', docType: 'Vehicle RC Book', fileName: 'rc_book_swift.pdf', country: 'India', code: 'IN', flag: '🇮🇳', submittedAt: 'Jun 16, 2026', status: 'pending' },
  { id: 'DOC-9904', ownerName: 'Ahmed Al-Fahim', ownerType: 'driver', docType: 'RTA Driver Permit', fileName: 'rta_permit_ahmed.pdf', country: 'UAE', code: 'AE', flag: '🇦🇪', submittedAt: 'Jun 15, 2026', status: 'pending', expiresAt: 'Mar 2028' },
];

const STATUS_BADGE: Record<string, { bg: string; label: string }> = {
  pending: { bg: 'bg-amber-100 text-amber-700', label: 'Pending' },
  approved: { bg: 'bg-emerald-100 text-emerald-700', label: 'Approved' },
  rejected: { bg: 'bg-red-100 text-red-700', label: 'Rejected' },
};

export default function PendingApprovalsPage() {
  const { regionLabel, isFiltered, formatPrice } = useTaxiRegionFilter([]);
  const [tab, setTab] = useState<ApprovalTab>('vendors');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const pendingVendors = vendorQueue.filter(v => v.status === 'pending').length;
  const pendingDrivers = driverQueue.filter(d => d.status === 'pending').length;
  const pendingDocs = docQueue.filter(d => d.status === 'pending').length;

  const tabs: { key: ApprovalTab; label: string; count: number; icon: React.ElementType }[] = [
    { key: 'vendors', label: 'Vendors', count: pendingVendors, icon: Building2 },
    { key: 'drivers', label: 'Drivers', count: pendingDrivers, icon: Users },
    { key: 'documents', label: 'Documents', count: pendingDocs, icon: FileText },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
          <Shield className="w-6 h-6 text-amber-500" /> Pending Approvals
        </h1>
        <p className="text-slate-500 text-sm mt-1">Review and approve vendor registrations, driver onboarding, and document submissions.</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-center">
          <p className="text-3xl font-black text-amber-600">{pendingVendors + pendingDrivers + pendingDocs}</p>
          <p className="text-xs font-bold text-amber-700">Total Pending</p>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-xl text-center">
          <p className="text-3xl font-black text-blue-600">{pendingVendors}</p>
          <p className="text-xs font-bold text-slate-500">Vendor Applications</p>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-xl text-center">
          <p className="text-3xl font-black text-indigo-600">{pendingDrivers}</p>
          <p className="text-xs font-bold text-slate-500">Driver Submissions</p>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-xl text-center">
          <p className="text-3xl font-black text-violet-600">{pendingDocs}</p>
          <p className="text-xs font-bold text-slate-500">Document Reviews</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-colors ${tab === t.key ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            id={`tab-${t.key}`}>
            <t.icon className="w-4 h-4" />
            {t.label}
            {t.count > 0 && <span className="bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{t.count}</span>}
          </button>
        ))}
      </div>

      {/* Reject Modal Inline */}
      {rejectId && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-bold text-red-800">Rejection Reason for {rejectId}</p>
          <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3}
            className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-300 bg-white" placeholder="Provide a reason for rejection..." id="reject-reason" />
          <div className="flex gap-2">
            <button onClick={() => { setRejectId(null); setRejectReason(''); }} className="px-4 py-2 bg-white text-slate-600 rounded-lg text-xs font-bold border border-slate-200">Cancel</button>
            <button onClick={() => { setRejectId(null); setRejectReason(''); }} className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold" id="confirm-reject">Confirm Rejection</button>
          </div>
        </div>
      )}

      {/* Vendors Tab */}
      {tab === 'vendors' && (
        <div className="space-y-3">
          {vendorQueue.map(v => (
            <div key={v.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50/50" onClick={() => setExpanded(expanded === v.id ? null : v.id)} role="button" tabIndex={0} onKeyDown={activateOnKey(() => setExpanded(expanded === v.id ? null : v.id))}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-linear-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center text-white font-black text-xs">{v.name.split(' ').map(w => w[0]).join('').slice(0, 2)}</div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{v.name}</p>
                    <p className="text-xs text-slate-400">{v.id} · <CountryFlag code={v.code} size="sm" /> {v.country} · {v.city}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${v.docsUploaded === v.docsTotal ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{v.docsUploaded}/{v.docsTotal} docs</span>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${STATUS_BADGE[v.status].bg}`}>{STATUS_BADGE[v.status].label}</span>
                  <span className="text-xs text-slate-400">{v.submittedAt}</span>
                  {expanded === v.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </div>
              {expanded === v.id && (
                <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50">
                  <div className="grid grid-cols-4 gap-4 text-sm mb-4">
                    <div><p className="text-slate-400 text-xs">Email</p><p className="font-bold text-xs">{v.email}</p></div>
                    <div><p className="text-slate-400 text-xs">Phone</p><p className="font-bold text-xs">{v.phone}</p></div>
                    <div><p className="text-slate-400 text-xs">Fleet Size</p><p className="font-bold text-xs">{v.fleetSize}</p></div>
                    <div><p className="text-slate-400 text-xs">Country</p><p className="font-bold text-xs"><CountryFlag code={v.code} size="sm" /> {v.country}</p></div>
                  </div>
                  {v.status === 'pending' && (
                    <div className="flex gap-2">
                      <button className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors" id={`approve-${v.id}`}><ThumbsUp className="w-3 h-3" /> Approve</button>
                      <button onClick={(e) => { e.stopPropagation(); setRejectId(v.id); }} className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors" id={`reject-${v.id}`}><ThumbsDown className="w-3 h-3" /> Reject</button>
                      <button className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors" id={`info-${v.id}`}><Info className="w-3 h-3" /> Request More Info</button>
                      <button className="flex items-center gap-1.5 px-4 py-2 bg-white text-slate-600 rounded-lg text-xs font-bold border border-slate-200" id={`view-docs-${v.id}`}><Eye className="w-3 h-3" /> View Documents</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Drivers Tab */}
      {tab === 'drivers' && (
        <div className="space-y-3">
          {driverQueue.map(d => (
            <div key={d.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50/50" onClick={() => setExpanded(expanded === d.id ? null : d.id)} role="button" tabIndex={0} onKeyDown={activateOnKey(() => setExpanded(expanded === d.id ? null : d.id))}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-linear-to-br from-indigo-400 to-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-xs">{d.driverName.split(' ').map(w => w[0]).join('')}</div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{d.driverName}</p>
                    <p className="text-xs text-slate-400">{d.id} · Vendor: {d.vendorName} · <CountryFlag code={d.code} size="sm" /> {d.country}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500"><Car className="w-3 h-3 inline mr-1" />{d.vehicle} · {d.plate}</span>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${d.docsUploaded === d.docsTotal ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{d.docsUploaded}/{d.docsTotal} docs</span>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${STATUS_BADGE[d.status].bg}`}>{STATUS_BADGE[d.status].label}</span>
                  {expanded === d.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </div>
              {expanded === d.id && d.status === 'pending' && (
                <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50 flex gap-2">
                  <button className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold" id={`approve-${d.id}`}><ThumbsUp className="w-3 h-3" /> Approve Driver</button>
                  <button onClick={(e) => { e.stopPropagation(); setRejectId(d.id); }} className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold" id={`reject-${d.id}`}><ThumbsDown className="w-3 h-3" /> Reject</button>
                  <button className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold" id={`info-${d.id}`}><MessageSquare className="w-3 h-3" /> Request Docs</button>
                  <button className="flex items-center gap-1.5 px-4 py-2 bg-white text-slate-600 rounded-lg text-xs font-bold border border-slate-200" id={`view-${d.id}`}><Eye className="w-3 h-3" /> View All Docs</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Documents Tab */}
      {tab === 'documents' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr><th className="px-5 py-3 font-semibold">Document</th><th className="px-4 py-3 font-semibold">Owner</th><th className="px-4 py-3 font-semibold">Country</th><th className="px-4 py-3 font-semibold">Expires</th><th className="px-4 py-3 font-semibold text-center">Status</th><th className="px-4 py-3 font-semibold text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {docQueue.map(doc => (
                <tr key={doc.id} className="hover:bg-slate-50/50">
                  <td className="px-5 py-3">
                    <p className="font-bold text-slate-900 text-xs">{doc.docType}</p>
                    <p className="text-[10px] text-slate-400">{doc.fileName}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-bold">{doc.ownerName}</p>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${doc.ownerType === 'vendor' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>{doc.ownerType}</span>
                  </td>
                  <td className="px-4 py-3 text-xs"><CountryFlag code={doc.code} size="sm" /> {doc.country}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{doc.expiresAt || '—'}</td>
                  <td className="px-4 py-3 text-center"><span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${STATUS_BADGE[doc.status].bg}`}>{STATUS_BADGE[doc.status].label}</span></td>
                  <td className="px-4 py-3 text-right">
                    {doc.status === 'pending' && (
                      <div className="flex gap-1.5 justify-end">
                        <button className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200" title="Approve" id={`approve-doc-${doc.id}`}><CheckCircle className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setRejectId(doc.id)} className="p-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200" title="Reject" id={`reject-doc-${doc.id}`}><XCircle className="w-3.5 h-3.5" /></button>
                        <button className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200" title="View" id={`view-doc-${doc.id}`}><Eye className="w-3.5 h-3.5" /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
