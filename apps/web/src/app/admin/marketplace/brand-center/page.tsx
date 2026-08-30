'use client';
import React, { useState } from 'react';
import { Crown, CheckCircle, XCircle, AlertTriangle, Eye, Search, Star, Globe } from 'lucide-react';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';
import { CountryFlag } from '@/components/shared/country-flag';
import { adminMarketplaceApi } from '@/lib/modules/admin-marketplace-api';
import { useAdminData, useAdminAction, AdminToast, AdminLoadingSkeleton, AdminErrorBanner } from '@/hooks/useAdminData';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
const BRANDS = [
  { id: 'BRD-2201', name: 'TechNova Electronics', seller: 'TechNova Ltd', country: 'UAE', categories: ['Mobiles', 'Electronics'], trademark: true, authLetter: false, logo: true, submitted: '30 May 2026', status: 'Under Review' },
  { id: 'BRD-2202', name: 'SilkRoute Couture', seller: 'SR Fashion Pvt Ltd', country: 'India', categories: ['Fashion', 'Footwear'], trademark: true, authLetter: true, logo: true, submitted: '28 May 2026', status: 'Under Review' },
  { id: 'BRD-2203', name: 'Doha Home Decor', seller: 'DHD LLC', country: 'Qatar', categories: ['Home & Kitchen', 'Furniture'], trademark: false, authLetter: false, logo: true, submitted: '27 May 2026', status: 'Correction Requested' },
  { id: 'BRD-2204', name: 'AppleCore Tech (Fake)', seller: 'Suspicious Store', country: 'India', categories: ['Electronics'], trademark: false, authLetter: false, logo: false, submitted: '26 May 2026', status: 'Rejected' },
  { id: 'BRD-2205', name: 'Riyadh Luxury Goods', seller: 'RLG Trading Co', country: 'Saudi Arabia', categories: ['Jewellery', 'Watches'], trademark: true, authLetter: true, logo: true, submitted: '25 May 2026', status: 'Approved' },
];

const COUNTRY_TO_CODE: Record<string, string> = { India: 'IN', UAE: 'AE', UK: 'GB', Qatar: 'QA', 'Saudi Arabia': 'SA' };

const STATUS_STYLES: Record<string, string> = {
  'Under Review': 'bg-amber-100 text-amber-700',
  'Approved': 'bg-emerald-100 text-emerald-700',
  'Rejected': 'bg-red-100 text-red-700',
  'Correction Requested': 'bg-blue-100 text-blue-700',
};

export default function BrandCenterPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selected, setSelected] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);

  const { data: apiData, loading, error, refetch, toast, showToast } = useAdminData(
    () => adminMarketplaceApi.getBrands(),
    []
  );
  const { execute } = useAdminAction(showToast);

  const { filtered: regionFiltered, regionLabel, isFiltered: isRegionFiltered } = useMarketplaceRegionFilter(BRANDS);
  const filtered = regionFiltered.filter(b =>
    (statusFilter === 'All' || b.status === statusFilter) &&
    (!search || b.name.toLowerCase().includes(search.toLowerCase()) || b.seller.toLowerCase().includes(search.toLowerCase()))
  );
  const sel = BRANDS.find(b => b.id === selected);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Brand Center — Approval Control</h1>
        <p className="text-slate-500 text-sm mt-1">{isRegionFiltered ? `${regionLabel} — ` : ''}All new brand submissions from sellers require approval before products can be listed under the brand.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[['Under Review', regionFiltered.filter(b => b.status === 'Under Review').length, 'bg-amber-100 text-amber-600'],
          ['Approved', regionFiltered.filter(b => b.status === 'Approved').length, 'bg-emerald-100 text-emerald-600'],
          ['Rejected', regionFiltered.filter(b => b.status === 'Rejected').length, 'bg-red-100 text-red-600'],
          ['Correction Req.', regionFiltered.filter(b => b.status === 'Correction Requested').length, 'bg-blue-100 text-blue-600'],
        ].map(([label, count, color]) => (
          <div key={label as string} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${color}`}><Crown className="w-4 h-4" /></div>
            <p className="text-2xl font-black text-slate-900">{count}</p>
            <p className="text-xs text-slate-500 font-medium mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search brand or seller..." className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
        </div>
        <div className="flex gap-1">
          {['All', 'Under Review', 'Approved', 'Rejected', 'Correction Requested'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-2 text-xs font-bold rounded-xl border transition-colors ${statusFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>{s}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Brand List */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
            <p className="text-sm font-bold text-slate-700">{filtered.length} brand submissions</p>
          </div>
          <div className="divide-y divide-slate-100">
            {filtered.map(b => (
              <div key={b.id} onClick={() => setSelected(b.id)} role="button" tabIndex={0} onKeyDown={activateOnKey(() => setSelected(b.id))} className={`flex items-start gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors ${selected === b.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}>
                <div className="w-12 h-12 bg-linear-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center shrink-0">
                  <Crown className="w-6 h-6 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-slate-900">{b.name}</p>
                    <span className="text-[10px] font-mono text-slate-400">{b.id}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5"><CountryFlag code={COUNTRY_TO_CODE[b.country] || 'QA'} size="xs" /> {b.country} · by {b.seller}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[b.status]}`}>{b.status}</span>
                    <span className="text-[10px] text-slate-400">{b.submitted}</span>
                    {b.trademark && <span className="text-[10px] bg-purple-100 text-purple-700 font-bold px-1.5 py-0.5 rounded">TM</span>}
                    {b.authLetter && <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded">AUTH</span>}
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {b.status !== 'Approved' && b.status !== 'Rejected' && (
                    <>
                      <button onClick={e => e.stopPropagation()} className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg" title="Approve"><CheckCircle className="w-4 h-4" /></button>
                      <button onClick={e => { e.stopPropagation(); setShowRejectModal(b.id); }} className="p-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg" title="Reject"><XCircle className="w-4 h-4" /></button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Brand Detail */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {sel ? (
            <>
              <div className="p-5 border-b border-slate-200 bg-linear-to-br from-slate-50 to-white">
                <div className="w-16 h-16 bg-linear-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mb-3">
                  <Crown className="w-8 h-8 text-indigo-600" />
                </div>
                <p className="font-black text-slate-900">{sel.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{sel.id}</p>
                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-2 ${STATUS_STYLES[sel.status]}`}>{sel.status}</span>
              </div>
              <div className="p-5 space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Seller</p><p className="font-bold">{sel.seller}</p></div>
                  <div><p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Country</p><p className="font-bold"><CountryFlag code={COUNTRY_TO_CODE[sel.country] || 'QA'} size="xs" /> {sel.country}</p></div>
                  <div className="col-span-2"><p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Categories</p><div className="flex flex-wrap gap-1">{sel.categories.map(c => <span key={c} className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded">{c}</span>)}</div></div>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold mb-2">Compliance Documents</p>
                  <div className="space-y-2">
                    {[['Trademark Certificate', sel.trademark], ['Authorization Letter', sel.authLetter], ['Brand Logo', sel.logo]].map(([label, uploaded]) => (
                      <div key={label as string} className={`flex items-center justify-between px-3 py-2 rounded-lg border ${uploaded ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex items-center gap-2">
                          {uploaded ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-slate-400" />}
                          <span className="text-xs font-medium">{label as string}</span>
                        </div>
                        <span className={`text-[10px] font-bold ${uploaded ? 'text-emerald-600' : 'text-slate-400'}`}>{uploaded ? 'Uploaded' : 'Missing'}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {sel.status !== 'Approved' && sel.status !== 'Rejected' && (
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"><CheckCircle className="w-4 h-4" /> Approve Brand</button>
                    <button onClick={() => setShowRejectModal(sel.id)} className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 border border-red-200 transition-colors"><XCircle className="w-4 h-4" /> Reject</button>
                    <button className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 border border-blue-200 transition-colors"><AlertTriangle className="w-4 h-4" /> Request Correction</button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-slate-300">
              <Crown className="w-10 h-10 mb-3" />
              <p className="text-sm">Select a brand to review</p>
            </div>
          )}
        </div>
      </div>

      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-black text-slate-900 mb-2">Reject Brand Application</h3>
            <p className="text-sm text-slate-500 mb-4">Seller will be notified with the rejection reason.</p>
            <select className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm mb-3 focus:outline-none">
              <option>Missing trademark certificate</option>
              <option>Brand name conflicts with existing brand</option>
              <option>Potential IP infringement</option>
              <option>Incomplete documentation</option>
              <option>Unauthorized reseller</option>
              <option>Brand not eligible for this country</option>
              <option>Other</option>
            </select>
            <textarea placeholder="Additional notes..." rows={3} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setShowRejectModal(null)} className="flex-1 bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl text-sm">Cancel</button>
              <button className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">Confirm Rejection</button>
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
