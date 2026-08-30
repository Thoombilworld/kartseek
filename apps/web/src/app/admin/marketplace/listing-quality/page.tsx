'use client';
import React, { useState } from 'react';
import { BarChart3, Search, Eye, X, Download, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle, Image, FileText, Tag, Star } from 'lucide-react';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';
import { CountryFlag } from '@/components/shared/country-flag';
import MarketplaceEmptyState from '@/components/admin/marketplace/marketplace-empty-state';
import { useAdminData, AdminToast, AdminLoadingSkeleton, AdminErrorBanner } from '@/hooks/useAdminData';
import { adminMarketplaceApi } from '@/lib/modules/admin-marketplace-api';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
const COUNTRY_TO_CODE: Record<string, string> = { India: 'IN', UAE: 'AE', UK: 'GB' };

type ListingScore = {
  id: string; product: string; seller: string; country: string; sku: string;
  overallScore: number;
  titleScore: number; descriptionScore: number; imageScore: number; attributeScore: number; pricingScore: number;
  issues: string[];
  imageCount: number; requiredImages: number;
  descriptionLength: number; requiredDescLength: number;
  attributesFilled: number; totalAttributes: number;
  lastUpdated: string;
};

const LISTINGS: ListingScore[] = [
  { id: 'LQ-001', product: 'iPhone 15 Pro Max 256GB', seller: 'Apple India Store', country: 'India', sku: 'APL-15PM-256', overallScore: 95, titleScore: 100, descriptionScore: 90, imageScore: 100, attributeScore: 95, pricingScore: 90, issues: ['Description could include more use cases'], imageCount: 8, requiredImages: 5, descriptionLength: 850, requiredDescLength: 200, attributesFilled: 19, totalAttributes: 20, lastUpdated: '2026-06-06' },
  { id: 'LQ-002', product: 'Nike Air Jordan 1 Retro High', seller: 'Nike Official', country: 'India', sku: 'NK-AJ1-RH', overallScore: 82, titleScore: 90, descriptionScore: 75, imageScore: 80, attributeScore: 85, pricingScore: 80, issues: ['Missing lifestyle images', 'Description too short', 'Add size chart'], imageCount: 4, requiredImages: 5, descriptionLength: 180, requiredDescLength: 200, attributesFilled: 14, totalAttributes: 18, lastUpdated: '2026-06-05' },
  { id: 'LQ-003', product: 'Silk Saree Kanjeevaram', seller: 'Heritage Silk House', country: 'India', sku: 'HSH-SK-001', overallScore: 58, titleScore: 60, descriptionScore: 40, imageScore: 50, attributeScore: 70, pricingScore: 65, issues: ['Title missing fabric type', 'Only 2 images uploaded', 'No zoom-quality images', 'Missing care instructions', 'No occasion tags'], imageCount: 2, requiredImages: 5, descriptionLength: 80, requiredDescLength: 200, attributesFilled: 8, totalAttributes: 15, lastUpdated: '2026-06-04' },
  { id: 'LQ-004', product: 'Samsung Galaxy S24 Ultra', seller: 'Samsung Store', country: 'India', sku: 'SS-S24U', overallScore: 91, titleScore: 95, descriptionScore: 88, imageScore: 95, attributeScore: 90, pricingScore: 88, issues: ['Add comparison table vs S23'], imageCount: 7, requiredImages: 5, descriptionLength: 720, requiredDescLength: 200, attributesFilled: 22, totalAttributes: 24, lastUpdated: '2026-06-06' },
  { id: 'LQ-005', product: 'Generic USB Cable 1m', seller: 'QuickMart Express', country: 'India', sku: 'QM-USB-1M', overallScore: 32, titleScore: 30, descriptionScore: 20, imageScore: 30, attributeScore: 40, pricingScore: 50, issues: ['Title too generic', 'No brand mentioned', 'Single low-res image', 'No specifications', 'Missing certification info', 'No warranty details'], imageCount: 1, requiredImages: 3, descriptionLength: 25, requiredDescLength: 100, attributesFilled: 3, totalAttributes: 10, lastUpdated: '2026-06-01' },
  { id: 'LQ-006', product: 'Dyson V15 Detect Absolute', seller: 'Gulf Electronics FZE', country: 'UAE', sku: 'GE-DYS-V15', overallScore: 88, titleScore: 92, descriptionScore: 85, imageScore: 90, attributeScore: 88, pricingScore: 82, issues: ['Add Arabic description'], imageCount: 6, requiredImages: 5, descriptionLength: 640, requiredDescLength: 200, attributesFilled: 16, totalAttributes: 18, lastUpdated: '2026-06-03' },
];

const getScoreColor = (s: number) => s >= 80 ? 'text-emerald-600' : s >= 60 ? 'text-amber-600' : 'text-red-600';
const getScoreBg = (s: number) => s >= 80 ? 'bg-emerald-500' : s >= 60 ? 'bg-amber-500' : 'bg-red-500';
const getGrade = (s: number) => s >= 90 ? 'A+' : s >= 80 ? 'A' : s >= 70 ? 'B' : s >= 60 ? 'C' : s >= 40 ? 'D' : 'F';

function QualityDrawer({ item: l, onClose }: { item: ListingScore; onClose: () => void }) {
  const dims = [{ l: 'Title', s: l.titleScore, icon: Tag }, { l: 'Description', s: l.descriptionScore, icon: FileText }, { l: 'Images', s: l.imageScore, icon: Image }, { l: 'Attributes', s: l.attributeScore, icon: Star }, { l: 'Pricing', s: l.pricingScore, icon: BarChart3 }];
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} ><DismissOnEscape onDismiss={onClose} /></div>
      <div className="relative w-full max-w-md bg-white shadow-2xl overflow-y-auto animate-slide-left">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div><h2 className="text-base font-black text-slate-900">{l.product}</h2><p className="text-xs text-slate-500">{l.seller} · {l.sku}</p></div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className={`bg-gradient-to-br ${l.overallScore >= 80 ? 'from-emerald-600 to-teal-700' : l.overallScore >= 60 ? 'from-amber-500 to-orange-600' : 'from-red-500 to-red-700'} rounded-xl p-6 text-white text-center`}>
            <p className="text-sm font-bold opacity-80">Overall Quality Score</p>
            <p className="text-5xl font-black mt-1">{l.overallScore}<span className="text-2xl">/ 100</span></p>
            <p className="text-lg font-black mt-1 opacity-80">Grade: {getGrade(l.overallScore)}</p>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3">Dimension Scores</h3>
            <div className="space-y-3">
              {dims.map(d => (
                <div key={d.l} className="flex items-center gap-3">
                  <d.icon className={`w-4 h-4 ${getScoreColor(d.s)}`} />
                  <span className="text-xs text-slate-600 w-24">{d.l}</span>
                  <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${getScoreBg(d.s)}`} style={{ width: `${d.s}%` }} /></div>
                  <span className={`text-sm font-black w-10 text-right ${getScoreColor(d.s)}`}>{d.s}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 rounded-xl p-3 text-center"><p className="text-lg font-black text-blue-700">{l.imageCount}/{l.requiredImages}</p><p className="text-[10px] text-slate-500">Images</p></div>
            <div className="bg-slate-50 rounded-xl p-3 text-center"><p className="text-lg font-black text-purple-700">{l.descriptionLength}</p><p className="text-[10px] text-slate-500">Desc. Chars</p></div>
            <div className="bg-slate-50 rounded-xl p-3 text-center"><p className="text-lg font-black text-amber-700">{l.attributesFilled}/{l.totalAttributes}</p><p className="text-[10px] text-slate-500">Attributes</p></div>
          </div>

          {l.issues.length > 0 && (
            <div><h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" />Issues ({l.issues.length})</h3>
              <div className="space-y-1">{l.issues.map((issue, i) => (<div key={i} className="flex items-start gap-2 bg-amber-50 rounded-lg px-3 py-2"><AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" /><p className="text-xs text-amber-800">{issue}</p></div>))}</div>
            </div>
          )}

          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-bold transition-colors">Notify Seller to Improve</button>
        </div>
      </div>
    </div>
  );
}

export default function ListingQualityPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<ListingScore | null>(null);

  const { data: apiData, loading, error, refetch, toast } = useAdminData(() => adminMarketplaceApi.getProducts(), []);
  const { filtered: regionFiltered } = useMarketplaceRegionFilter(LISTINGS);

  const filtered = regionFiltered.filter(l => {
    if (filter === 'excellent' && l.overallScore < 80) return false;
    if (filter === 'needs-work' && (l.overallScore < 60 || l.overallScore >= 80)) return false;
    if (filter === 'poor' && l.overallScore >= 60) return false;
    if (search && !l.product.toLowerCase().includes(search.toLowerCase()) && !l.seller.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const avgScore = regionFiltered.length ? Math.round(regionFiltered.reduce((a, l) => a + l.overallScore, 0) / regionFiltered.length) : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div><h1 className="text-2xl font-black text-slate-900">Listing Quality</h1><p className="text-sm text-slate-500 mt-0.5">Automated quality scoring for product listings — title, images, description, attributes</p></div>
        <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50"><Download className="w-4 h-4" /> Export Report</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className={`bg-gradient-to-br ${avgScore >= 80 ? 'from-emerald-600 to-teal-700' : 'from-amber-500 to-orange-600'} rounded-xl p-5 text-white`}><p className="text-sm font-bold opacity-80">Avg Score</p><p className="text-2xl font-black mt-1">{avgScore}/100</p></div>
        <div className="bg-white border border-emerald-200 rounded-xl p-4 shadow-sm"><p className="text-xs text-emerald-600 font-bold">Excellent (80+)</p><p className="text-xl font-black text-emerald-600">{regionFiltered.filter(l => l.overallScore >= 80).length}</p></div>
        <div className="bg-white border border-amber-200 rounded-xl p-4 shadow-sm"><p className="text-xs text-amber-600 font-bold">Needs Work (60-79)</p><p className="text-xl font-black text-amber-600">{regionFiltered.filter(l => l.overallScore >= 60 && l.overallScore < 80).length}</p></div>
        <div className="bg-white border border-red-200 rounded-xl p-4 shadow-sm"><p className="text-xs text-red-600 font-bold">Poor (&lt;60)</p><p className="text-xl font-black text-red-600">{regionFiltered.filter(l => l.overallScore < 60).length}</p></div>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search product or seller..." className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-200" /></div>
        <div className="flex gap-2">{['all', 'excellent', 'needs-work', 'poor'].map(s => (<button key={s} onClick={() => setFilter(s)} className={`px-3 py-2 text-xs font-bold rounded-xl border transition-colors capitalize ${filter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{s === 'all' ? 'All' : s === 'needs-work' ? 'Needs Work' : s}</button>))}</div>
      </div>

      {loading && <AdminLoadingSkeleton rows={4} />}
      {error && !loading && <AdminErrorBanner error={error} onRetry={refetch} />}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200"><tr><th className="px-4 py-3 text-left font-semibold text-slate-500 text-xs">Product</th><th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Score</th><th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Title</th><th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Desc</th><th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Images</th><th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Attrs</th><th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">Issues</th><th className="px-4 py-3 text-center font-semibold text-slate-500 text-xs">View</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (<tr><td colSpan={8}><MarketplaceEmptyState title="No listings found" icon={BarChart3} /></td></tr>) : filtered.map(l => (
              <tr key={l.id} className={`hover:bg-slate-50/50 cursor-pointer transition-colors ${l.overallScore < 60 ? 'bg-red-50/30' : ''}`} onClick={() => setSelected(l)} tabIndex={0} onKeyDown={activateOnKey(() => setSelected(l))}>
                <td className="px-4 py-3.5"><p className="font-bold text-slate-900 text-xs">{l.product}</p><p className="text-[10px] text-slate-400">{l.seller} · <CountryFlag code={COUNTRY_TO_CODE[l.country] || 'IN'} size="sm" /></p></td>
                <td className="px-4 py-3.5 text-center"><span className={`text-lg font-black ${getScoreColor(l.overallScore)}`}>{l.overallScore}</span><span className="text-[10px] text-slate-400 ml-0.5">/100</span></td>
                <td className="px-4 py-3.5 text-center"><div className="w-8 h-1.5 bg-slate-100 rounded-full mx-auto overflow-hidden"><div className={`h-full rounded-full ${getScoreBg(l.titleScore)}`} style={{ width: `${l.titleScore}%` }} /></div></td>
                <td className="px-4 py-3.5 text-center"><div className="w-8 h-1.5 bg-slate-100 rounded-full mx-auto overflow-hidden"><div className={`h-full rounded-full ${getScoreBg(l.descriptionScore)}`} style={{ width: `${l.descriptionScore}%` }} /></div></td>
                <td className="px-4 py-3.5 text-center"><span className="text-[10px] font-bold text-slate-600">{l.imageCount}/{l.requiredImages}</span></td>
                <td className="px-4 py-3.5 text-center"><span className="text-[10px] font-bold text-slate-600">{l.attributesFilled}/{l.totalAttributes}</span></td>
                <td className="px-4 py-3.5 text-center">{l.issues.length > 0 ? <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md">{l.issues.length}</span> : <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" />}</td>
                <td className="px-4 py-3.5 text-center" onClick={e => e.stopPropagation()}><button onClick={() => setSelected(l)} className="p-1.5 hover:bg-slate-100 rounded-lg"><Eye className="w-4 h-4 text-slate-400" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && <QualityDrawer item={selected} onClose={() => setSelected(null)} />}
      <AdminToast toast={toast} />
    </div>
  );
}
