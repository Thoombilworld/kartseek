'use client';
import React, { useState, useEffect } from 'react';
import { ShieldCheck, Globe, Upload, CheckCircle, Clock, AlertTriangle, FileText, X } from 'lucide-react';
import ProgressBar from '@/components/seller/progress-bar';
import { CountryFlag } from '@/components/shared/country-flag';
import { vendorRestaurantApi } from '@/lib/api/vendor-restaurant';

// ── Country Compliance Configs ───────────────────────────────────────────────

interface ComplianceDoc {
  id: string; name: string; description: string; required: boolean;
  status: 'uploaded' | 'pending' | 'expired' | 'not_required';
  expiryDate?: string;
}

interface CountryConfig {
  code: string; name: string; flag: string; currency: string; taxName: string; taxRate: string;
  documents: ComplianceDoc[];
}

const COUNTRIES: CountryConfig[] = [
  {
    code: 'IN', name: 'India', flag: '🇮🇳', currency: 'INR', taxName: 'GST', taxRate: '5%/12%/18%',
    documents: [
      { id: 'gst', name: 'GST Registration', description: 'Goods and Services Tax registration certificate', required: true, status: 'uploaded' },
      { id: 'fssai', name: 'FSSAI License', description: 'Food Safety and Standards Authority of India license', required: true, status: 'uploaded', expiryDate: 'Dec 2027' },
      { id: 'pan', name: 'PAN Card', description: 'Permanent Account Number card', required: true, status: 'uploaded' },
      { id: 'biz-reg', name: 'Business Registration', description: 'Certificate of incorporation or partnership deed', required: true, status: 'pending' },
    ],
  },
  {
    code: 'QA', name: 'Qatar', flag: '🇶🇦', currency: 'QAR', taxName: 'No VAT', taxRate: '0%',
    documents: [
      { id: 'cr', name: 'Commercial Registration (CR)', description: 'Ministry of Commerce registration', required: true, status: 'not_required' },
      { id: 'trade', name: 'Trade License', description: 'Valid trade license for food services', required: true, status: 'not_required' },
      { id: 'muni', name: 'Municipality Approval', description: 'Municipality food establishment permit', required: true, status: 'not_required' },
      { id: 'food-safety', name: 'Food Safety Permit', description: 'Ministry of Public Health food safety certificate', required: true, status: 'not_required' },
    ],
  },
  {
    code: 'AE', name: 'UAE', flag: '🇦🇪', currency: 'AED', taxName: 'VAT', taxRate: '5%',
    documents: [
      { id: 'trade', name: 'Trade License', description: 'DED or free zone trade license', required: true, status: 'not_required' },
      { id: 'muni', name: 'Municipality Approval', description: 'Food establishment permit from municipality', required: true, status: 'not_required' },
      { id: 'vat', name: 'VAT Registration', description: 'Federal Tax Authority VAT registration', required: true, status: 'not_required' },
    ],
  },
  {
    code: 'GB', name: 'United Kingdom', flag: '🇬🇧', currency: 'GBP', taxName: 'VAT', taxRate: '20%',
    documents: [
      { id: 'fsa', name: 'FSA Registration', description: 'Food Standards Agency registration for food business', required: true, status: 'not_required' },
      { id: 'biz-reg', name: 'Business Registration', description: 'Companies House registration', required: true, status: 'not_required' },
      { id: 'hygiene', name: 'Food Hygiene Rating', description: 'Local authority food hygiene rating scheme', required: false, status: 'not_required' },
    ],
  },
  {
    code: 'US', name: 'United States', flag: '🇺🇸', currency: 'USD', taxName: 'Sales Tax', taxRate: 'State-specific',
    documents: [
      { id: 'food-permit', name: 'Food Service Permit', description: 'Health department food service establishment permit', required: true, status: 'not_required' },
      { id: 'state-license', name: 'State Restaurant License', description: 'State-specific restaurant operating license', required: true, status: 'not_required' },
      { id: 'ein', name: 'EIN / Tax ID', description: 'Employer Identification Number', required: true, status: 'not_required' },
      { id: 'fire', name: 'Fire Safety Certificate', description: 'Fire department inspection certificate', required: false, status: 'not_required' },
    ],
  },
];

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  uploaded: { label: 'Verified', color: 'text-emerald-700', bg: 'bg-emerald-50', icon: CheckCircle },
  pending: { label: 'Pending Review', color: 'text-amber-700', bg: 'bg-amber-50', icon: Clock },
  expired: { label: 'Expired', color: 'text-red-700', bg: 'bg-red-50', icon: AlertTriangle },
  not_required: { label: 'Not Required', color: 'text-slate-500', bg: 'bg-slate-100', icon: FileText },
};

export default function CompliancePage() {
  const [selectedCountry, setSelectedCountry] = useState('IN');
  const country = COUNTRIES.find((c) => c.code === selectedCountry) || COUNTRIES[0];

  const uploadedCount = country.documents.filter((d) => d.status === 'uploaded').length;
  const requiredCount = country.documents.filter((d) => d.required).length;
  const completionPct = requiredCount > 0 ? Math.round((uploadedCount / requiredCount) * 100) : 0;

  return (
    <div className="max-w-[1000px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-blue-600" /> Compliance & Licensing
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage country-specific documents, licenses, and food safety certifications.</p>
      </div>

      {/* Country Selector */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-900 flex items-center gap-2"><Globe className="w-4 h-4 text-blue-500" /> Restaurant Country</h2>
          <span className="text-xs font-bold text-slate-500">Auto-detected based on registration</span>
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {COUNTRIES.map((c) => (
            <button key={c.code} onClick={() => setSelectedCountry(c.code)}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold border-2 transition-all whitespace-nowrap flex items-center gap-2 ${
                selectedCountry === c.code ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}>
              <CountryFlag code={c.code} size="md" /> {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Country Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm text-center">
          <p className="text-3xl font-black text-slate-900"><CountryFlag code={country.code} size="sm" /></p>
          <p className="font-bold text-sm text-slate-700 mt-1">{country.name}</p>
          <p className="text-xs text-slate-500">{country.currency}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm text-center">
          <p className="text-sm font-bold text-slate-500 mb-1">{country.taxName}</p>
          <p className="text-2xl font-black text-blue-600">{country.taxRate}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm text-center">
          <p className="text-sm font-bold text-slate-500 mb-1">Compliance</p>
          <p className={`text-2xl font-black ${completionPct === 100 ? 'text-emerald-600' : completionPct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
            {completionPct}%
          </p>
          <div className="mt-2 bg-slate-100 rounded-full h-1.5 w-full">
            <ProgressBar percent={completionPct} className={`rounded-full h-1.5 transition-all ${completionPct === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} />
          </div>
        </div>
      </div>

      {/* Documents */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">Required Documents — {country.name}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{uploadedCount} of {requiredCount} required documents verified</p>
        </div>
        <div className="divide-y divide-slate-100">
          {country.documents.map((doc) => {
            const badge = STATUS_BADGE[doc.status];
            const Icon = badge.icon;
            return (
              <div key={doc.id} className="p-5 flex items-start justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-slate-900">{doc.name}</h3>
                    {doc.required && <span className="text-[9px] font-black text-red-600 bg-red-50 px-1.5 py-0.5 rounded">REQUIRED</span>}
                  </div>
                  <p className="text-xs text-slate-500">{doc.description}</p>
                  {doc.expiryDate && (
                    <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Expires: {doc.expiryDate}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${badge.color} ${badge.bg}`}>
                    <Icon className="w-3.5 h-3.5" /> {badge.label}
                  </span>
                  {doc.status !== 'uploaded' && doc.status !== 'not_required' && (
                    <label className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5 transition-colors">
                      <Upload className="w-3.5 h-3.5" /> Upload
                      <input type="file" className="hidden" title={`Upload ${doc.name}`}  aria-label="file"/>
                    </label>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Compliance Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-xs font-bold text-blue-800 mb-1">🌍 Multi-Country Support</p>
        <p className="text-xs text-blue-600">
          When you register in a new country, the system will automatically show the required documents for that jurisdiction.
          All documents are reviewed by the compliance team within 24-48 hours.
        </p>
      </div>
    </div>
  );
}
