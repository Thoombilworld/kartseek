'use client';
import React, { useState } from 'react';
import { ShieldAlert, Search, Eye, X, Download, ChevronLeft, ChevronRight, CheckCircle, XCircle, AlertTriangle, Ban, Clock, Flag } from 'lucide-react';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';
import { CountryFlag } from '@/components/shared/country-flag';
import MarketplaceEmptyState from '@/components/admin/marketplace/marketplace-empty-state';
import { useAdminData, useAdminAction, AdminToast, AdminLoadingSkeleton, AdminErrorBanner } from '@/hooks/useAdminData';
import { adminMarketplaceApi } from '@/lib/modules/admin-marketplace-api';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
const COUNTRY_TO_CODE: Record<string, string> = { India: 'IN', UAE: 'AE', UK: 'GB' };

type IpViolation = {
  id: string; product: string; seller: string; country: string;
  violationType: 'Trademark' | 'Counterfeit' | 'Copyright' | 'Patent' | 'Design';
  brandAffected: string; reportedBy: string; reportDate: string;
  status: 'Open' | 'Under Review' | 'Action Taken' | 'Dismissed' | 'Escalated';
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  evidence: string; actionTaken?: string; resolution?: string;
  sellerStrikes: number;
};

const VIOLATIONS: IpViolation[] = [
  { id: 'IPV-001', product: 'AppleCore Pro Wireless Earbuds', seller: 'QuickMart Express', country: 'India', violationType: 'Trademark', brandAffected: 'Apple Inc.', reportedBy: 'Brand Protection Team', reportDate: '2026-06-06', status: 'Open', severity: 'Critical', evidence: 'Product name and packaging mimics Apple AirPods. Uses Apple-like logo. Seller has no authorization from Apple.', sellerStrikes: 2 },
  { id: 'IPV-002', product: 'NIKEE Air Max 90 Replica', seller: 'FashionDeal Hub', country: 'India', violationType: 'Counterfeit', brandAffected: 'Nike Inc.', reportedBy: 'Automated Detection', reportDate: '2026-06-05', status: 'Under Review', severity: 'Critical', evidence: 'Misspelled brand name. Product images match known counterfeit patterns. Price 90% below MSRP.', sellerStrikes: 3 },
  { id: 'IPV-003', product: 'Designer Saree Collection', seller: 'Heritage Silk House', country: 'India', violationType: 'Design', brandAffected: 'Sabyasachi', reportedBy: 'Brand Owner Report', reportDate: '2026-06-04', status: 'Under Review', severity: 'High', evidence: 'Uses identical design patterns registered by Sabyasachi. Seller claims independent creation.', sellerStrikes: 0 },
  { id: 'IPV-004', product: 'Samsung Galaxy Screen Guard', seller: 'TechGiant Store', country: 'India', violationType: 'Trademark', brandAffected: 'Samsung', reportedBy: 'Automated Detection', reportDate: '2026-06-03', status: 'Dismissed', severity: 'Low', evidence: 'Product uses "for Samsung Galaxy" in title which is acceptable nominative fair use.', resolution: 'Dismissed — nominative fair use for compatibility description', sellerStrikes: 0 },
  { id: 'IPV-005', product: 'Premium Wireless Speaker BT-500', seller: 'Gulf Electronics FZE', country: 'UAE', violationType: 'Patent', brandAffected: 'Bose Corp.', reportedBy: 'Legal Department', reportDate: '2026-06-02', status: 'Action Taken', severity: 'High', evidence: 'Speaker technology matches Bose patent US10,123,456. Active noise cancellation implementation.', actionTaken: 'Product delisted. Seller warned. Legal notice sent.', sellerStrikes: 1 },
  { id: 'IPV-006', product: 'Luxury Watch Collection Photo', seller: 'WatchWorld India', country: 'India', violationType: 'Copyright', brandAffected: 'Rolex SA', reportedBy: 'Brand Owner Report', reportDate: '2026-06-01', status: 'Escalated', severity: 'High', evidence: 'Uses copyrighted Rolex product photography without permission. Images watermark removed.', sellerStrikes: 1 },
];

const STATUS_STYLES: Record<string, string> = { Open: 'bg-red-50 text-red-700', 'Under Review': 'bg-amber-50 text-amber-700', 'Action Taken': 'bg-emerald-50 text-emerald-700', Dismissed: 'bg-slate-100 text-slate-500', Escalated: 'bg-purple-50 text-purple-700' };
const SEVERITY_STYLES: Record<string, string> = { Critical: 'bg-red-100 text-red-700', High: 'bg-orange-50 text-orange-700', Medium: 'bg-amber-50 text-amber-700', Low: 'bg-slate-100 text-slate-600' };
const TYPE_STYLES: Record<string, string> = { Trademark: 'bg-blue-50 text-blue-700', Counterfeit: 'bg-red-50 text-red-700', Copyright: 'bg-purple-50 text-purple-700', Patent: 'bg-indigo-50 text-indigo-700', Design: 'bg-amber-50 text-amber-700' };

function ViolationDrawer({ item: v, onClose, onAction }: { item: IpViolation; onClose: () => void; onAction: (action: string) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} ><DismissOnEscape onDismiss={onClose} /></div>
      <div className="relative w-full max-w-md bg-white shadow-2xl overflow-y-auto animate-slide-left">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div><h2 className="text-base font-black text-slate-900">{v.id}</h2><p className="text-xs text-slate-500">{v.reportDate}</p></div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex gap-2 flex-wrap">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${STATUS_STYLES[v.status]}`}>{v.status}</span>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${SEVERITY_STYLES[v.severity]}`}>{v.severity}</span>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${TYPE_STYLES[v.violationType]}`}>{v.violationType}</span>
          </div>

          <div className="bg-red-900 rounded-xl p-5 text-white"><p className="text-xs font-bold opacity-80 mb-1">Affected Product</p><p className="text-sm font-black">{v.product}</p><p className="text-xs opacity-60 mt-1">{v.seller} · <CountryFlag code={COUNTRY_TO_CODE[v.country] || 'IN'} size="sm" /></p></div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] text-slate-500">Brand Affected</p><p className="text-sm font-bold text-slate-900">{v.brandAffected}</p></div>
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] text-slate-500">Reported By</p><p className="text-sm font-bold text-slate-900">{v.reportedBy}</p></div>
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] text-slate-500">Seller Strikes</p><p className={`text-sm font-black ${v.sellerStrikes >= 3 ? 'text-red-600' : v.sellerStrikes >= 2 ? 'text-amber-600' : 'text-slate-900'}`}>{v.sellerStrikes}/3</p></div>
            <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] text-slate-500">Violation Type</p><p className="text-sm font-bold text-slate-900">{v.violationType}</p></div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4"><p className="text-[10px] text-amber-600 font-bold mb-1">Evidence</p><p className="text-xs text-amber-900">{v.evidence}</p></div>

          {v.actionTaken && <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4"><p className="text-[10px] text-emerald-600 font-bold mb-1">Action Taken</p><p className="text-xs text-emerald-900">{v.actionTaken}</p></div>}
          {v.resolution && <div className="bg-slate-50 border border-slate-200 rounded-xl p-4"><p className="text-[10px] text-slate-500 font-bold mb-1">Resolution</p><p className="text-xs text-slate-700">{v.resolution}</p></div>}

          {(v.status === 'Open' || v.status === 'Under Review') && (
            <div className="space-y-3">
              <button onClick={() => onAction('delist')} className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"><Ban className="w-4 h-4" /> Delist Product</button>
              <div className="flex gap-3">
                <button onClick={() => onAction('warn')} className="flex-1 bg-amber-50 hover:bg-amber-100 text-amber-700 py-2.5 rounded-xl text-sm font-bold transition-colors">Warn Seller</button>
                <button onClick={() => onAction('dismiss')} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-bold transition-colors">Dismiss</button>
              </div>
              <button onClick={() => onAction('escalate')} className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"><Flag className="w-4 h-4" /> Escalate to Legal</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function IpViolationsPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<IpViolation | null>(null);

  const { data: apiData, loading, error, refetch, toast, showToast } = useAdminData(() => adminMarketplaceApi.getProducts(), []);
  const { execute } = useAdminAction(showToast);
  const { filtered: regionFiltered } = useMarketplaceRegionFilter(VIOLATIONS);

  const filtered = regionFiltered.filter(v => {
    if (filter !== 'all' && v.status !== filter && v.severity !== filter) return false;
    if (search && !v.product.toLowerCase().includes(search.toLowerCase()) && !v.seller.toLowerCase().includes(search.toLowerCase()) && !v.brandAffected.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleAction = (v: IpViolation, action: string) => {
    const msgs: Record<string, string> = { delist: `${v.product} delisted`, warn: `Warning sent to ${v.seller}`, dismiss: `${v.id} dismissed`, escalate: `${v.id} escalated to legal` };
    execute(() => adminMarketplaceApi.updateProduct(v.id, { action }), msgs[action] || 'Action taken', () => refetch());
    setSelected(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div><h1 className="text-2xl font-black text-slate-900">IP Violations</h1><p className="text-sm text-slate-500 mt-0.5">Trademark, counterfeit, copyright, and patent violation management</p></div>
        <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50"><Download className="w-4 h-4" /> Export</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-gradient-to-br from-red-500 to-red-700 rounded-xl p-5 text-white"><p className="text-sm font-bold opacity-80">Open Cases</p><p className="text-2xl font-black mt-1">{regionFiltered.filter(v => v.status === 'Open').length}</p></div>
        <div className="bg-white border border-amber-200 rounded-xl p-4 shadow-sm"><p className="text-xs text-amber-600 font-bold">Under Review</p><p className="text-xl font-black text-amber-600">{regionFiltered.filter(v => v.status === 'Under Review').length}</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><p className="text-xs text-slate-500">Action Taken</p><p className="text-xl font-black text-emerald-600">{regionFiltered.filter(v => v.status === 'Action Taken').length}</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><p className="text-xs text-slate-500">Escalated</p><p className="text-xl font-black text-purple-600">{regionFiltered.filter(v => v.status === 'Escalated').length}</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><p className="text-xs text-slate-500">Critical</p><p className="text-xl font-black text-red-600">{regionFiltered.filter(v => v.severity === 'Critical').length}</p></div>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search product, seller, or brand..." className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-200" /></div>
        <div className="flex gap-2 flex-wrap">{['all', 'Open', 'Under Review', 'Action Taken', 'Escalated', 'Critical'].map(s => (<button key={s} onClick={() => setFilter(s)} className={`px-3 py-2 text-xs font-bold rounded-xl border transition-colors ${filter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{s === 'all' ? 'All' : s}</button>))}</div>
      </div>

      {loading && <AdminLoadingSkeleton rows={4} />}
      {error && !loading && <AdminErrorBanner error={error} onRetry={refetch} />}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200"><tr><th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs">Product / Seller</th><th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Type</th><th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs">Brand</th><th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Severity</th><th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Strikes</th><th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Status</th><th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">View</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (<tr><td colSpan={7}><MarketplaceEmptyState title="No violations found" icon={ShieldAlert} /></td></tr>) : filtered.map(v => (
              <tr key={v.id} className={`hover:bg-slate-50/50 cursor-pointer transition-colors ${v.severity === 'Critical' ? 'bg-red-50/30' : ''}`} onClick={() => setSelected(v)} tabIndex={0} onKeyDown={activateOnKey(() => setSelected(v))}>
                <td className="px-4 py-3.5"><p className="font-bold text-slate-900 text-xs">{v.product}</p><p className="text-[10px] text-slate-400">{v.seller} · <CountryFlag code={COUNTRY_TO_CODE[v.country] || 'IN'} size="sm" /></p></td>
                <td className="px-4 py-3.5 text-center"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${TYPE_STYLES[v.violationType]}`}>{v.violationType}</span></td>
                <td className="px-4 py-3.5 text-xs font-bold text-slate-900">{v.brandAffected}</td>
                <td className="px-4 py-3.5 text-center"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${SEVERITY_STYLES[v.severity]}`}>{v.severity}</span></td>
                <td className="px-4 py-3.5 text-center"><span className={`text-xs font-black ${v.sellerStrikes >= 3 ? 'text-red-600' : 'text-slate-600'}`}>{v.sellerStrikes}/3</span></td>
                <td className="px-4 py-3.5 text-center"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${STATUS_STYLES[v.status]}`}>{v.status}</span></td>
                <td className="px-4 py-3.5 text-center" onClick={e => e.stopPropagation()}><button onClick={() => setSelected(v)} className="p-1.5 hover:bg-slate-100 rounded-lg"><Eye className="w-4 h-4 text-slate-400" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && <ViolationDrawer item={selected} onClose={() => setSelected(null)} onAction={(a) => handleAction(selected, a)} />}
      <AdminToast toast={toast} />
    </div>
  );
}
