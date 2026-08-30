'use client';
import ProgressBar from '@/components/seller/progress-bar';
import React, { useState, useEffect } from 'react';
import { ShieldCheck, FileText, UploadCloud, AlertTriangle, CheckCircle, Clock, Globe, X } from 'lucide-react';
import { CountryFlag } from '@/components/shared/country-flag';
import { vendorPharmacyApi } from '@/lib/api/vendor-pharmacy';

type Country = 'IN' | 'QA' | 'AE' | 'GB' | 'US';

interface DocReq { name: string; status: 'verified' | 'pending' | 'expired' | 'missing'; expiry?: string; regNo?: string }

const COUNTRY_CONFIG: Record<Country, { name: string; flag: string; docs: DocReq[] }> = {
  IN: {
    name: 'India', flag: '🇮🇳',
    docs: [
      { name: 'Retail Drug License (Form 20/21)', status: 'verified', expiry: 'Mar 2027', regNo: 'DL-GUR-2024-001' },
      { name: 'Wholesale Drug License (Form 20B/21B)', status: 'verified', expiry: 'Mar 2027', regNo: 'DL-GUR-2024-002' },
      { name: 'Pharmacist Registration Certificate', status: 'verified', regNo: 'RPH-88219' },
      { name: 'GST Registration', status: 'verified', regNo: '07AAACE1234F1ZP' },
      { name: 'PAN Card', status: 'verified', regNo: 'AAACE1234F' },
      { name: 'FSSAI Registration', status: 'expired', expiry: 'Jun 2025', regNo: 'FSSAI-2021-001' },
      { name: 'Schedule H1 Register', status: 'verified' },
      { name: 'Narcotic License (if Schedule X)', status: 'missing' },
    ],
  },
  QA: {
    name: 'Qatar', flag: '🇶🇦',
    docs: [
      { name: 'Pharmacy License (MOPH)', status: 'verified', regNo: 'PH-QA-2024-100' },
      { name: 'Commercial Registration (CR)', status: 'verified', regNo: 'CR-QA-88001' },
      { name: 'Trade License', status: 'pending' },
      { name: 'Ministry of Public Health Approval', status: 'verified' },
    ],
  },
  AE: {
    name: 'UAE', flag: '🇦🇪',
    docs: [
      { name: 'Pharmacy License', status: 'verified', regNo: 'PH-UAE-2024-200' },
      { name: 'DHA/DOH/MOH Approval', status: 'verified' },
      { name: 'Trade License', status: 'verified', regNo: 'TL-DXB-2024-300' },
      { name: 'VAT Registration', status: 'verified', regNo: 'VAT-AE-100200300' },
    ],
  },
  GB: {
    name: 'United Kingdom', flag: '🇬🇧',
    docs: [
      { name: 'GPhC Registration', status: 'verified', regNo: 'GPhC-2024-UK-001' },
      { name: 'Business Registration (Companies House)', status: 'verified', regNo: 'CH-12345678' },
      { name: 'NHS Pharmacy Contract', status: 'pending' },
      { name: 'VAT Registration (if applicable)', status: 'missing' },
    ],
  },
  US: {
    name: 'United States', flag: '🇺🇸',
    docs: [
      { name: 'State Pharmacy License', status: 'verified', regNo: 'SPL-CA-2024-001' },
      { name: 'DEA Registration', status: 'verified', regNo: 'DEA-AB1234567' },
      { name: 'Business Registration', status: 'verified' },
      { name: 'NPI Number', status: 'pending', regNo: 'NPI-1234567890' },
    ],
  },
};

const STATUS_CFG: Record<string, { label: string; bg: string; color: string }> = {
  verified: { label: 'Verified', bg: 'bg-emerald-100', color: 'text-emerald-700' },
  pending: { label: 'Pending', bg: 'bg-amber-100', color: 'text-amber-700' },
  expired: { label: 'Expired', bg: 'bg-red-100', color: 'text-red-700' },
  missing: { label: 'Missing', bg: 'bg-slate-200', color: 'text-slate-600' },
};

export default function PharmacyLicensesPage() {
  const [country, setCountry] = useState<Country>('IN');
  const cfg = COUNTRY_CONFIG[country];
  const verified = cfg.docs.filter((d) => d.status === 'verified').length;
  const total = cfg.docs.length;
  const pct = Math.round((verified / total) * 100);

  return (
    <div className="max-w-[1000px] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Compliance & Licenses</h1>
          <p className="text-sm text-slate-500">Manage pharmacy licenses, KYC documents, and country-specific compliance.</p>
        </div>
      </div>

      {/* Country Selector */}
      <div className="flex gap-2 overflow-x-auto">
        {(Object.entries(COUNTRY_CONFIG) as [Country, typeof COUNTRY_CONFIG['IN']][]).map(([code, c]) => (
          <button key={code} onClick={() => setCountry(code)}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              country === code ? 'bg-teal-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}>
            <CountryFlag code={code} size="md" /> {c.name}
          </button>
        ))}
      </div>

      {/* Compliance Score */}
      <div className={`rounded-2xl p-5 border-2 ${pct === 100 ? 'bg-emerald-50 border-emerald-200' : pct >= 70 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <ShieldCheck className={`w-6 h-6 ${pct === 100 ? 'text-emerald-600' : pct >= 70 ? 'text-amber-600' : 'text-red-600'}`} />
            <div>
              <h2 className="font-black text-slate-900">Compliance Score — <CountryFlag code={country} size="sm" /> {cfg.name}</h2>
              <p className="text-xs text-slate-500">{verified} of {total} documents verified</p>
            </div>
          </div>
          <span className={`text-3xl font-black ${pct === 100 ? 'text-emerald-700' : pct >= 70 ? 'text-amber-700' : 'text-red-700'}`}>{pct}%</span>
        </div>
        <div className="bg-white/50 rounded-full h-3 overflow-hidden">
          <ProgressBar percent={pct} className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-emerald-500' : pct >= 70 ? 'bg-amber-500' : 'bg-red-500'}`} />
        </div>
      </div>

      {/* Documents List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h2 className="font-black text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-600" /> Required Documents — {cfg.name}
          </h2>
          <button className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors">
            <UploadCloud className="w-3.5 h-3.5" /> Upload New
          </button>
        </div>
        <div className="divide-y divide-slate-100">
          {cfg.docs.map((doc) => {
            const st = STATUS_CFG[doc.status];
            return (
              <div key={doc.name} className={`px-5 py-4 flex items-center justify-between hover:bg-slate-50/50 ${doc.status === 'expired' ? 'bg-red-50/30' : doc.status === 'missing' ? 'bg-slate-50/30' : ''}`}>
                <div className="flex-1">
                  <p className="font-bold text-slate-800 text-sm">{doc.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {doc.regNo && <span className="text-[10px] text-slate-400 font-mono">{doc.regNo}</span>}
                    {doc.expiry && (
                      <span className={`text-[10px] font-bold flex items-center gap-1 ${doc.status === 'expired' ? 'text-red-600' : 'text-slate-400'}`}>
                        <Clock className="w-3 h-3" /> {doc.status === 'expired' ? `Expired: ${doc.expiry}` : `Valid till: ${doc.expiry}`}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`${st.bg} ${st.color} px-2.5 py-1 rounded-full text-[10px] font-black`}>{st.label}</span>
                  {(doc.status === 'expired' || doc.status === 'missing') && (
                    <button className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold text-xs rounded-lg transition-colors">
                      {doc.status === 'expired' ? 'Renew' : 'Upload'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
