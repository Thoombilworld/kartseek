'use client';
import React, { useState, useEffect } from 'react';
import { FileCheck, AlertTriangle, Clock, CheckCircle2, Upload, Search, Building2, Calendar, ExternalLink, Shield } from 'lucide-react';
import { adminHotelApi } from '@/lib/api/admin-hotel';

interface ComplianceItem {
  id: string; hotelName: string; hotelId: string; city: string; country: string;
  licenseNumber: string; licenseExpiry: string; status: 'valid' | 'expiring' | 'expired' | 'missing';
  documents: Array<{ name: string; uploaded: boolean; verified: boolean }>;
  lastInspection: string;
}

const COMPLIANCE: ComplianceItem[] = [
  { id: 'c-001', hotelName: 'The Grand Palace Hotel', hotelId: 'htl-001', city: 'Dubai', country: 'AE',
    licenseNumber: 'DET-2024-001234', licenseExpiry: '2027-03-15', status: 'valid',
    documents: [{ name: 'Trade License', uploaded: true, verified: true }, { name: 'Tourism License', uploaded: true, verified: true }, { name: 'Fire Safety Certificate', uploaded: true, verified: false }, { name: 'Health Inspection', uploaded: true, verified: true }],
    lastInspection: '2026-05-10' },
  { id: 'c-002', hotelName: 'KARTSEEK Business Suites', hotelId: 'htl-002', city: 'Dubai', country: 'AE',
    licenseNumber: 'DET-2024-005678', licenseExpiry: '2026-08-20', status: 'expiring',
    documents: [{ name: 'Trade License', uploaded: true, verified: true }, { name: 'Tourism License', uploaded: true, verified: true }, { name: 'Fire Safety Certificate', uploaded: false, verified: false }, { name: 'Health Inspection', uploaded: true, verified: true }],
    lastInspection: '2026-03-22' },
  { id: 'c-003', hotelName: 'Seaside Family Resort', hotelId: 'htl-003', city: 'Dubai', country: 'AE',
    licenseNumber: 'DET-2023-009012', licenseExpiry: '2026-06-30', status: 'expired',
    documents: [{ name: 'Trade License', uploaded: true, verified: true }, { name: 'Tourism License', uploaded: true, verified: false }, { name: 'Fire Safety Certificate', uploaded: true, verified: true }, { name: 'Health Inspection', uploaded: false, verified: false }],
    lastInspection: '2025-12-01' },
  { id: 'c-004', hotelName: 'Heritage Boutique Hotel', hotelId: 'htl-005', city: 'Dubai', country: 'AE',
    licenseNumber: '', licenseExpiry: '', status: 'missing',
    documents: [{ name: 'Trade License', uploaded: false, verified: false }, { name: 'Tourism License', uploaded: false, verified: false }, { name: 'Fire Safety Certificate', uploaded: false, verified: false }, { name: 'Health Inspection', uploaded: false, verified: false }],
    lastInspection: '' },
];

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  valid: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'VALID' },
  expiring: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'EXPIRING SOON' },
  expired: { bg: 'bg-red-100', text: 'text-red-700', label: 'EXPIRED' },
  missing: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'MISSING' },
};

export default function CompliancePage() {
  const [items, setItems] = useState(COMPLIANCE);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');

  const filtered = items.filter(i => {
    if (filter !== 'all' && i.status !== filter) return false;
    if (search && !i.hotelName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: items.length,
    valid: items.filter(i => i.status === 'valid').length,
    expiring: items.filter(i => i.status === 'expiring').length,
    expired: items.filter(i => i.status === 'expired').length,
    missing: items.filter(i => i.status === 'missing').length,
    docsUploaded: items.flatMap(i => i.documents).filter(d => d.uploaded).length,
    docsVerified: items.flatMap(i => i.documents).filter(d => d.verified).length,
    totalDocs: items.flatMap(i => i.documents).length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Compliance Tracker</h1>
        <p className="text-sm text-slate-500 mt-1">Monitor licenses, certifications, and regulatory requirements</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Total Hotels', value: stats.total, icon: Building2, bg: 'bg-blue-100 text-blue-600' },
          { label: 'Fully Compliant', value: stats.valid, icon: CheckCircle2, bg: 'bg-emerald-100 text-emerald-600' },
          { label: 'Expiring Soon', value: stats.expiring, icon: Clock, bg: 'bg-amber-100 text-amber-600' },
          { label: 'Expired', value: stats.expired, icon: AlertTriangle, bg: 'bg-red-100 text-red-600' },
          { label: 'Docs Verified', value: `${stats.docsVerified}/${stats.totalDocs}`, icon: FileCheck, bg: 'bg-purple-100 text-purple-600' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className={`w-8 h-8 ${s.bg} rounded-xl flex items-center justify-center mb-2`}>
              <s.icon className="w-4 h-4" />
            </div>
            <p className="text-xl font-black text-slate-900">{s.value}</p>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search hotels..."
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-rose-500" />
        </div>
        {['all', 'valid', 'expiring', 'expired', 'missing'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-2 text-xs font-bold rounded-xl transition-colors ${
              filter === f ? 'bg-rose-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-rose-300'
            }`}>
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Hotel Compliance Cards */}
      <div className="space-y-4">
        {filtered.map(item => {
          const style = STATUS_STYLES[item.status];
          const daysToExpiry = item.licenseExpiry ? Math.ceil((new Date(item.licenseExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
          const docProgress = Math.round(item.documents.filter(d => d.verified).length / item.documents.length * 100);

          return (
            <div key={item.id} className={`bg-white rounded-2xl border shadow-sm p-5 ${
              item.status === 'expired' ? 'border-red-200' : item.status === 'expiring' ? 'border-amber-200' : 'border-slate-100'
            }`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900">{item.hotelName}</h4>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${style.bg} ${style.text}`}>{style.label}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                    <span>{item.city}, {item.country}</span>
                    {item.licenseNumber && <span>License: {item.licenseNumber}</span>}
                    {item.licenseExpiry && (
                      <span className={daysToExpiry && daysToExpiry < 90 ? 'text-red-600 font-bold' : ''}>
                        Expires: {item.licenseExpiry} {daysToExpiry !== null && daysToExpiry > 0 ? `(${daysToExpiry}d)` : daysToExpiry !== null && daysToExpiry <= 0 ? '(OVERDUE)' : ''}
                      </span>
                    )}
                    {item.lastInspection && <span>Last inspection: {item.lastInspection}</span>}
                  </div>
                </div>
                <button className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" /> View Hotel
                </button>
              </div>

              {/* Document Checklist */}
              <div className="grid grid-cols-4 gap-3">
                {item.documents.map((doc, i) => (
                  <div key={i} className={`p-3 rounded-xl border text-center transition-all ${
                    doc.verified ? 'bg-emerald-50 border-emerald-200' :
                    doc.uploaded ? 'bg-amber-50 border-amber-200' :
                    'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-center justify-center gap-1 mb-1">
                      {doc.verified ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> :
                       doc.uploaded ? <Clock className="w-3.5 h-3.5 text-amber-600" /> :
                       <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                    </div>
                    <p className="text-[10px] font-bold text-slate-700">{doc.name}</p>
                    <p className={`text-[9px] font-bold mt-0.5 ${
                      doc.verified ? 'text-emerald-600' : doc.uploaded ? 'text-amber-600' : 'text-red-500'
                    }`}>
                      {doc.verified ? 'VERIFIED' : doc.uploaded ? 'PENDING' : 'MISSING'}
                    </p>
                  </div>
                ))}
              </div>

              {/* Progress Bar */}
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${docProgress}%` }} />
                </div>
                <span className="text-[10px] font-bold text-slate-400">{docProgress}% verified</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
