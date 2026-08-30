'use client';
import React, { useState } from 'react';
import { Target, Search, X, ChevronLeft, ChevronRight, Download, Eye, CheckCircle, XCircle, Pause, Play, BarChart3, TrendingUp, IndianRupee, MousePointer } from 'lucide-react';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';
import { CountryFlag } from '@/components/shared/country-flag';
import MarketplaceEmptyState from '@/components/admin/marketplace/marketplace-empty-state';
import { adminMarketplaceApi } from '@/lib/modules/admin-marketplace-api';
import { useAdminData, useAdminAction, AdminToast, AdminLoadingSkeleton, AdminErrorBanner } from '@/hooks/useAdminData';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
const COUNTRY_TO_CODE: Record<string, string> = { India: 'IN', UAE: 'AE', UK: 'GB', 'Saudi Arabia': 'SA' };

type SponsoredProduct = {
  id: string; product: string; seller: string; country: string;
  status: 'Active' | 'Pending' | 'Paused' | 'Rejected' | 'Ended';
  budget: number; spent: number; impressions: number; clicks: number; conversions: number;
  cpc: number; ctr: number; roas: number;
  startDate: string; endDate: string; bidType: 'CPC' | 'CPM';
};

const SPONSORED: SponsoredProduct[] = [
  { id: 'SP-001', product: 'iPhone 15 Pro Max 256GB', seller: 'Apple India Store', country: 'India', status: 'Active', budget: 50000, spent: 32400, impressions: 245000, clicks: 8900, conversions: 420, cpc: 3.64, ctr: 3.63, roas: 12.8, startDate: '2026-06-01', endDate: '2026-06-30', bidType: 'CPC' },
  { id: 'SP-002', product: 'Samsung Galaxy S24 Ultra', seller: 'Samsung Official', country: 'India', status: 'Active', budget: 35000, spent: 18900, impressions: 180000, clicks: 5400, conversions: 210, cpc: 3.50, ctr: 3.0, roas: 8.4, startDate: '2026-06-05', endDate: '2026-06-30', bidType: 'CPC' },
  { id: 'SP-003', product: 'Nike Air Jordan 1 Retro', seller: 'Nike India', country: 'India', status: 'Pending', budget: 20000, spent: 0, impressions: 0, clicks: 0, conversions: 0, cpc: 5.0, ctr: 0, roas: 0, startDate: '2026-06-10', endDate: '2026-06-25', bidType: 'CPC' },
  { id: 'SP-004', product: 'Dyson V15 Detect', seller: 'Gulf Electronics FZE', country: 'UAE', status: 'Active', budget: 15000, spent: 9800, impressions: 120000, clicks: 3200, conversions: 95, cpc: 3.06, ctr: 2.67, roas: 6.2, startDate: '2026-06-01', endDate: '2026-06-20', bidType: 'CPC' },
  { id: 'SP-005', product: 'Silk Saree Collection', seller: 'Heritage Silk House', country: 'India', status: 'Paused', budget: 10000, spent: 4500, impressions: 65000, clicks: 1800, conversions: 45, cpc: 2.50, ctr: 2.77, roas: 5.1, startDate: '2026-06-01', endDate: '2026-06-15', bidType: 'CPC' },
  { id: 'SP-006', product: 'Galaxy Z Fold5', seller: 'Gulf Electronics FZE', country: 'UAE', status: 'Rejected', budget: 25000, spent: 0, impressions: 0, clicks: 0, conversions: 0, cpc: 8.0, ctr: 0, roas: 0, startDate: '2026-06-08', endDate: '2026-06-30', bidType: 'CPC' },
  { id: 'SP-007', product: 'Power Bank 20000mAh', seller: 'QuickMart Express', country: 'India', status: 'Ended', budget: 5000, spent: 5000, impressions: 95000, clicks: 4200, conversions: 180, cpc: 1.19, ctr: 4.42, roas: 14.2, startDate: '2026-05-15', endDate: '2026-05-31', bidType: 'CPC' },
];

const STATUS_STYLES: Record<string, string> = { Active: 'bg-emerald-50 text-emerald-700', Pending: 'bg-amber-50 text-amber-700', Paused: 'bg-slate-100 text-slate-600', Rejected: 'bg-red-50 text-red-700', Ended: 'bg-slate-100 text-slate-500' };

// ── Sponsored Detail Drawer ──────────────────────────────────────────────────
function SponsoredDrawer({ item: s, onClose, onApprove, onReject, onPause, onResume, formatCurrency }: { item: SponsoredProduct; onClose: () => void; onApprove: () => void; onReject: () => void; onPause: () => void; onResume: () => void; formatCurrency: (n: number) => string }) {
  const budgetPct = Math.round((s.spent / s.budget) * 100);
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} ><DismissOnEscape onDismiss={onClose} /></div>
      <div className="relative w-full max-w-md bg-white shadow-2xl overflow-y-auto animate-slide-left">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div><h2 className="text-lg font-black text-slate-900">{s.product}</h2><p className="text-xs text-slate-500">{s.id} · {s.seller}</p></div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex gap-2">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${STATUS_STYLES[s.status]}`}>{s.status}</span>
            <span className="text-[10px] font-bold bg-purple-50 text-purple-700 px-2 py-1 rounded-md">{s.bidType}</span>
            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-md"><CountryFlag code={COUNTRY_TO_CODE[s.country] || 'IN'} size="sm" /> {s.country}</span>
          </div>

          {/* Budget Bar */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-5 text-white">
            <div className="flex justify-between items-end"><div><p className="text-sm font-bold opacity-80">Budget</p><p className="text-2xl font-black">{formatCurrency(s.spent)} / {formatCurrency(s.budget)}</p></div><p className="text-3xl font-black opacity-60">{budgetPct}%</p></div>
            <div className="h-2 bg-white/20 rounded-full mt-3 overflow-hidden"><div className={`h-full rounded-full transition-all ${budgetPct > 90 ? 'bg-red-400' : budgetPct > 60 ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${Math.min(100, budgetPct)}%` }} /></div>
            <p className="text-xs opacity-60 mt-2">{s.startDate} → {s.endDate}</p>
          </div>

          {/* Performance Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-4 text-center"><BarChart3 className="w-5 h-5 text-blue-500 mx-auto mb-1" /><p className="text-lg font-black text-slate-900">{s.impressions.toLocaleString()}</p><p className="text-[10px] text-slate-500">Impressions</p></div>
            <div className="bg-slate-50 rounded-xl p-4 text-center"><MousePointer className="w-5 h-5 text-amber-500 mx-auto mb-1" /><p className="text-lg font-black text-slate-900">{s.clicks.toLocaleString()}</p><p className="text-[10px] text-slate-500">Clicks</p></div>
            <div className="bg-slate-50 rounded-xl p-4 text-center"><Target className="w-5 h-5 text-emerald-500 mx-auto mb-1" /><p className="text-lg font-black text-slate-900">{s.conversions}</p><p className="text-[10px] text-slate-500">Conversions</p></div>
            <div className="bg-slate-50 rounded-xl p-4 text-center"><TrendingUp className="w-5 h-5 text-purple-500 mx-auto mb-1" /><p className="text-lg font-black text-slate-900">{s.roas}x</p><p className="text-[10px] text-slate-500">ROAS</p></div>
          </div>

          {/* CPC & CTR */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-xl p-3"><p className="text-[10px] text-blue-600">Cost Per Click</p><p className="text-lg font-black text-blue-700">{formatCurrency(s.cpc)}</p></div>
            <div className="bg-emerald-50 rounded-xl p-3"><p className="text-[10px] text-emerald-600">Click-Through Rate</p><p className="text-lg font-black text-emerald-700">{s.ctr}%</p></div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {s.status === 'Pending' && <>
              <button onClick={onApprove} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"><CheckCircle className="w-4 h-4" /> Approve</button>
              <button onClick={onReject} className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"><XCircle className="w-4 h-4" /> Reject</button>
            </>}
            {s.status === 'Active' && <button onClick={onPause} className="flex-1 bg-amber-50 hover:bg-amber-100 text-amber-700 py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"><Pause className="w-4 h-4" /> Pause</button>}
            {s.status === 'Paused' && <button onClick={onResume} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"><Play className="w-4 h-4" /> Resume</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Reject Modal ─────────────────────────────────────────────────────────────
function RejectModal({ itemId, onConfirm, onClose }: { itemId: string; onConfirm: (reason: string) => void; onClose: () => void }) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} ><DismissOnEscape onDismiss={onClose} /></div>
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center gap-3 mb-4"><XCircle className="w-6 h-6 text-red-500" /><h3 className="text-lg font-black text-slate-900">Reject Ad</h3></div>
        <p className="text-sm text-slate-600 mb-4">{itemId}</p>
        <select value={reason} onChange={e => setReason(e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm mb-4 outline-none">
          <option value="">Select reason...</option>
          <option value="Misleading claims">Misleading claims</option>
          <option value="Prohibited product">Prohibited product category</option>
          <option value="Low quality creative">Low quality creative/images</option>
          <option value="Policy violation">Policy violation</option>
          <option value="Bid too low">Bid amount too low</option>
        </select>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-bold transition-colors">Cancel</button>
          <button onClick={() => onConfirm(reason)} disabled={!reason} className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white py-2.5 rounded-xl text-sm font-bold transition-colors">Reject</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function SponsoredProductsPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<SponsoredProduct | null>(null);
  const [rejectItem, setRejectItem] = useState<SponsoredProduct | null>(null);
  const PAGE_SIZE = 5;

  const { data: apiData, loading, error, refetch, toast, showToast } = useAdminData(() => adminMarketplaceApi.getSponsoredProducts({ status: filter !== 'all' ? filter : undefined }), [filter]);
  const { execute } = useAdminAction(showToast);

  const { filtered: regionFiltered, regionLabel, isFiltered, formatCurrencyValue } = useMarketplaceRegionFilter(SPONSORED);
  const fmt = (n: number) => formatCurrencyValue(n);

  const filtered = regionFiltered.filter(s => {
    if (filter !== 'all' && s.status !== filter) return false;
    if (search && !s.product.toLowerCase().includes(search.toLowerCase()) && !s.seller.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalSpent = regionFiltered.reduce((a, s) => a + s.spent, 0);
  const totalImpressions = regionFiltered.reduce((a, s) => a + s.impressions, 0);

  const handleApprove = (s: SponsoredProduct) => { execute(() => adminMarketplaceApi.updateSponsoredProduct(s.id, { status: 'Active' }), `${s.id} approved`, () => refetch()); setSelected(null); };
  const handleReject = (reason: string) => { if (!rejectItem) return; execute(() => adminMarketplaceApi.updateSponsoredProduct(rejectItem.id, { status: 'Rejected', reason }), `${rejectItem.id} rejected`, () => refetch()); setRejectItem(null); setSelected(null); };
  const handlePause = (s: SponsoredProduct) => { execute(() => adminMarketplaceApi.updateSponsoredProduct(s.id, { status: 'Paused' }), `${s.id} paused`, () => refetch()); setSelected(null); };
  const handleResume = (s: SponsoredProduct) => { execute(() => adminMarketplaceApi.updateSponsoredProduct(s.id, { status: 'Active' }), `${s.id} resumed`, () => refetch()); setSelected(null); };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div><h1 className="text-2xl font-black text-slate-900">Sponsored Products</h1><p className="text-sm text-slate-500 mt-0.5">{isFiltered ? `${regionLabel} — ` : ''}Manage seller advertising campaigns and ad placements</p></div>
        <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50"><Download className="w-4 h-4" /> Export</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[{ l: 'Active Ads', v: regionFiltered.filter(s => s.status === 'Active').length, c: 'text-emerald-600' }, { l: 'Pending', v: regionFiltered.filter(s => s.status === 'Pending').length, c: 'text-amber-600' }, { l: 'Total Spend', v: fmt(totalSpent), c: 'text-blue-600' }, { l: 'Impressions', v: (totalImpressions / 1000).toFixed(0) + 'K', c: 'text-purple-600' }, { l: 'Avg ROAS', v: regionFiltered.filter(s => s.roas > 0).length ? (regionFiltered.reduce((a, s) => a + s.roas, 0) / regionFiltered.filter(s => s.roas > 0).length).toFixed(1) + 'x' : '0x', c: 'text-slate-900' }].map(k => (
          <div key={k.l} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><p className={`text-2xl font-black ${k.c}`}>{k.v}</p><p className="text-xs text-slate-500 mt-1">{k.l}</p></div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search product or seller..." className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-200" /></div>
        <div className="flex gap-2">{['all', 'Active', 'Pending', 'Paused', 'Rejected', 'Ended'].map(s => (<button key={s} onClick={() => { setFilter(s); setPage(1); }} className={`px-3 py-2 text-xs font-bold rounded-xl border transition-colors ${filter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{s === 'all' ? 'All' : s}</button>))}</div>
      </div>

      {loading && <AdminLoadingSkeleton rows={4} />}
      {error && !loading && <AdminErrorBanner error={error} onRetry={refetch} />}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs">Product</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-500 text-xs">Budget</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-500 text-xs">Impressions</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-500 text-xs">Clicks</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-500 text-xs">CTR</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-500 text-xs">ROAS</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Status</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paged.length === 0 ? (
              <tr><td colSpan={8}><MarketplaceEmptyState title="No sponsored products found" icon={Target} /></td></tr>
            ) : paged.map(s => (
              <tr key={s.id} className="hover:bg-slate-50/50 cursor-pointer transition-colors" onClick={() => setSelected(s)} tabIndex={0} onKeyDown={activateOnKey(() => setSelected(s))}>
                <td className="px-4 py-3.5"><p className="font-bold text-slate-900 text-xs">{s.product}</p><p className="text-[10px] text-slate-400">{s.seller} · <CountryFlag code={COUNTRY_TO_CODE[s.country] || 'IN'} size="sm" /></p></td>
                <td className="px-4 py-3.5 text-right"><span className="text-xs font-bold">{fmt(s.spent)}</span><span className="text-[10px] text-slate-400">/{fmt(s.budget)}</span></td>
                <td className="px-4 py-3.5 text-right font-bold">{s.impressions.toLocaleString()}</td>
                <td className="px-4 py-3.5 text-right font-bold">{s.clicks.toLocaleString()}</td>
                <td className="px-4 py-3.5 text-right"><span className={`font-bold ${s.ctr >= 3 ? 'text-emerald-600' : s.ctr >= 2 ? 'text-amber-600' : 'text-red-600'}`}>{s.ctr}%</span></td>
                <td className="px-4 py-3.5 text-right"><span className={`font-bold ${s.roas >= 8 ? 'text-emerald-600' : s.roas >= 4 ? 'text-amber-600' : 'text-slate-600'}`}>{s.roas}x</span></td>
                <td className="px-4 py-3.5 text-center"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${STATUS_STYLES[s.status]}`}>{s.status}</span></td>
                <td className="px-4 py-3.5 text-center" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-center gap-1">
                    {s.status === 'Pending' && <>
                      <button onClick={() => handleApprove(s)} className="p-1.5 hover:bg-emerald-50 rounded-lg"><CheckCircle className="w-4 h-4 text-emerald-500" /></button>
                      <button onClick={() => setRejectItem(s)} className="p-1.5 hover:bg-red-50 rounded-lg"><XCircle className="w-4 h-4 text-red-500" /></button>
                    </>}
                    {s.status === 'Active' && <button onClick={() => handlePause(s)} className="p-1.5 hover:bg-amber-50 rounded-lg"><Pause className="w-4 h-4 text-amber-500" /></button>}
                    <button onClick={() => setSelected(s)} className="p-1.5 hover:bg-slate-100 rounded-lg"><Eye className="w-4 h-4 text-slate-400" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (<div className="flex items-center justify-between px-2"><p className="text-xs text-slate-500">{filtered.length} ads</p><div className="flex items-center gap-2"><button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button><span className="text-xs font-bold">{page}/{totalPages}</span><button onClick={() => setPage(p => p + 1)} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button></div></div>)}

      {selected && <SponsoredDrawer item={selected} onClose={() => setSelected(null)} onApprove={() => handleApprove(selected)} onReject={() => setRejectItem(selected)} onPause={() => handlePause(selected)} onResume={() => handleResume(selected)} formatCurrency={fmt} />}
      {rejectItem && <RejectModal itemId={rejectItem.id} onConfirm={handleReject} onClose={() => setRejectItem(null)} />}
      <AdminToast toast={toast} />
    </div>
  );
}
