'use client';
import React, { useState } from 'react';
import { CheckCircle, XCircle, Eye, Search, Download, FileText, AlertTriangle } from 'lucide-react';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';
import { useRegion } from '@/lib/contexts/region-context';
import { CountryFlag } from '@/components/shared/country-flag';
import { adminMarketplaceApi } from '@/lib/modules/admin-marketplace-api';
import {
  useAdminData,
  useAdminAction,
  AdminToast,
  AdminLoadingSkeleton,
  AdminErrorBanner,
} from '@/hooks/useAdminData';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
const SELLERS = [
  {
    id: 'SLR-9201',
    name: 'Heritage Silk House',
    country: 'India',
    category: 'Fashion',
    email: 'info@heritagesilk.in',
    gstin: '27AAPCS1234A1Z5',
    pan: 'AAPCS1234A',
    kyc: 'Under Review',
    business: 'Proprietorship',
    submitted: '31 May 2026',
    docs: ['GST Certificate', 'PAN Card', 'Aadhar', 'Business Registration'],
  },
  {
    id: 'SLR-9202',
    name: 'Gulf Electronics FZE',
    country: 'UAE',
    category: 'Electronics',
    email: 'info@gulfelectronics.ae',
    tradeLicense: 'DED-2024-482910',
    trn: '100482910500003',
    kyc: 'Documents Uploaded',
    business: 'FZE',
    submitted: '31 May 2026',
    docs: ['Trade License', 'TRN Certificate', 'Passport Copy', 'Bank Statement'],
  },
  {
    id: 'SLR-9203',
    name: 'London Luxury Goods',
    country: 'UK',
    category: 'Jewellery',
    email: 'info@londonluxury.co.uk',
    companyReg: '12345678',
    vatNumber: 'GB123456789',
    kyc: 'Under Review',
    business: 'Ltd',
    submitted: '30 May 2026',
    docs: ['Companies House Certificate', 'VAT Certificate', 'Passport', 'Bank Details'],
  },
  {
    id: 'SLR-9204',
    name: 'Doha Fresh Market',
    country: 'Qatar',
    category: 'Grocery',
    email: 'info@dohafresh.qa',
    crNumber: 'QAT-2024-CR-78291',
    kyc: 'Under Review',
    business: 'WLL',
    submitted: '30 May 2026',
    docs: ['Commercial Registration', 'Tax Card', 'Bank Statement', 'Signatory ID'],
  },
  {
    id: 'SLR-9205',
    name: 'Riyadh Tech Hub',
    country: 'Saudi Arabia',
    category: 'Electronics',
    email: 'info@riyadhtech.sa',
    crNumber: 'SAU-CR-2024-112',
    vatNumber: '302345678900003',
    kyc: 'Documents Uploaded',
    business: 'LLC',
    submitted: '29 May 2026',
    docs: ['Commercial Registration', 'VAT Certificate', 'IBAN Details', 'Authorized ID'],
  },
];

export default function SellerApprovalsPage() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [rejReason, setRejReason] = useState('');

  const { selectedRegion } = useRegion();
  const country = selectedRegion !== 'ALL' ? selectedRegion : undefined;

  const {
    data: apiData,
    loading,
    error,
    refetch,
    toast,
    showToast,
  } = useAdminData(() => adminMarketplaceApi.getPendingSellers(country), [country]);
  const { execute } = useAdminAction(showToast);

  const {
    filtered: regionFiltered,
    regionLabel,
    isFiltered: isRegionFiltered,
  } = useMarketplaceRegionFilter(SELLERS);
  const filtered = regionFiltered.filter(
    (s) => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.id.includes(search),
  );
  const sel = SELLERS.find((s) => s.id === selected);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Seller Approvals</h1>
          <p className="text-slate-500 text-sm mt-1">
            {isRegionFiltered ? `${regionLabel} — ` : ''}Review KYC and approve/reject new seller
            applications by country compliance
          </p>
        </div>
        <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or ID..."
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
            <p className="text-sm font-bold text-slate-700">
              {filtered.length} pending applications
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {filtered.map((s) => (
              <div
                key={s.id}
                onClick={() => setSelected(s.id)}
                role="button"
                tabIndex={0}
                onKeyDown={activateOnKey(() => setSelected(s.id))}
                className={`flex items-start gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors ${selected === s.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
              >
                <CountryFlag
                  code={
                    s.country === 'India'
                      ? 'IN'
                      : s.country === 'UAE'
                        ? 'AE'
                        : s.country === 'UK'
                          ? 'GB'
                          : s.country === 'Qatar'
                            ? 'QA'
                            : s.country === 'Saudi Arabia'
                              ? 'SA'
                              : 'QA'
                  }
                  size="lg"
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-900">{s.name}</p>
                    <span className="text-[10px] font-mono text-slate-400">{s.id}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {s.country} · {s.category} · {s.business}
                  </p>
                  <div className="flex gap-2 mt-1.5 flex-wrap">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.kyc === 'Under Review' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}
                    >
                      {s.kyc}
                    </span>
                    <span className="text-[10px] text-slate-400">{s.submitted}</span>
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg"
                    title="Approve"
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowRejectModal(s.id);
                    }}
                    className="p-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg"
                    title="Reject"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {sel ? (
            <>
              <div className="px-5 py-4 border-b border-slate-200">
                <p className="font-black text-slate-900">{sel.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {sel.id} · {sel.country}
                </p>
              </div>
              <div className="p-5 space-y-4 text-sm overflow-y-auto max-h-[500px]">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Country</p>
                    <p className="font-bold">{sel.country}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Category</p>
                    <p className="font-bold">{sel.category}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Email</p>
                    <p className="text-blue-600">{sel.email}</p>
                  </div>
                  {'gstin' in sel && (
                    <div className="col-span-2">
                      <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">GSTIN</p>
                      <p className="font-mono font-bold">{(sel as any).gstin}</p>
                    </div>
                  )}
                  {'trn' in sel && (
                    <div className="col-span-2">
                      <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">TRN</p>
                      <p className="font-mono font-bold">{(sel as any).trn}</p>
                    </div>
                  )}
                  {'vatNumber' in sel && (
                    <div className="col-span-2">
                      <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">
                        VAT Number
                      </p>
                      <p className="font-mono font-bold">{(sel as any).vatNumber}</p>
                    </div>
                  )}
                  {'crNumber' in sel && (
                    <div className="col-span-2">
                      <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">
                        CR Number
                      </p>
                      <p className="font-mono font-bold">{(sel as any).crNumber}</p>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold mb-2">
                    Documents ({sel.docs.length})
                  </p>
                  <div className="space-y-1.5">
                    {sel.docs.map((doc, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg border border-slate-100"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-xs font-medium">{doc}</span>
                        </div>
                        <button className="text-blue-600 text-xs font-bold">View</button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors">
                    <CheckCircle className="w-4 h-4" /> Approve Seller
                  </button>
                  <button
                    onClick={() => setShowRejectModal(sel.id)}
                    className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 border border-red-200 transition-colors"
                  >
                    <XCircle className="w-4 h-4" /> Reject with Reason
                  </button>
                  <button className="w-full bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 border border-amber-200 transition-colors">
                    <AlertTriangle className="w-4 h-4" /> Request Correction
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-slate-300">
              <Eye className="w-10 h-10 mb-3" />
              <p className="text-sm">Select a seller to review</p>
            </div>
          )}
        </div>
      </div>

      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-black text-slate-900 mb-2">Reject Seller Application</h3>
            <p className="text-sm text-slate-500 mb-4">
              The seller will be notified and this action will be logged.
            </p>
            <select className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-red-400">
              <option value="">Select reason...</option>
              <option>Incomplete KYC documents</option>
              <option>Invalid Tax ID / GSTIN / TRN</option>
              <option>Suspicious business details</option>
              <option>Category not permitted for country</option>
              <option>Duplicate seller account</option>
              <option>Failed compliance check</option>
              <option>Bank details mismatch</option>
              <option>Other</option>
            </select>
            <textarea
              value={rejReason}
              onChange={(e) => setRejReason(e.target.value)}
              placeholder="Additional notes (optional)..."
              rows={3}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowRejectModal(null)}
                className="flex-1 bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl text-sm"
              >
                Cancel
              </button>
              <button className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
      {loading && <AdminLoadingSkeleton rows={4} />}
      {error && !loading && <AdminErrorBanner error={error} onRetry={refetch} />}
      <AdminToast toast={toast} />
    </div>
  );
}
