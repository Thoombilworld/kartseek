'use client';
import React, { useState } from 'react';
import { Star, Search, CheckCircle, XCircle, Eye, Flag, ThumbsUp, X, ChevronLeft, ChevronRight, Download, AlertTriangle, EyeOff, MessageSquare } from 'lucide-react';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';
import { CountryFlag } from '@/components/shared/country-flag';
import MarketplaceEmptyState from '@/components/admin/marketplace/marketplace-empty-state';
import { adminMarketplaceApi } from '@/lib/modules/admin-marketplace-api';
import { useAdminData, useAdminAction, AdminToast, AdminLoadingSkeleton, AdminErrorBanner } from '@/hooks/useAdminData';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
const COUNTRY_TO_CODE: Record<string, string> = { India: 'IN', UAE: 'AE', UK: 'GB', 'Saudi Arabia': 'SA', Qatar: 'QA' };

type Review = {
  id: string; product: string; customer: string; country: string; rating: number;
  title: string; text: string; seller: string; status: 'Published' | 'Flagged' | 'Under Review' | 'Removed';
  date: string; reports: number; helpful: number; images: string[];
};

const REVIEWS: Review[] = [
  { id: 'REV-001', product: 'iPhone 15 Pro', customer: 'Rohit Sharma', country: 'India', rating: 5, title: 'Amazing phone!', text: 'Best phone I have ever used. Camera quality is outstanding. The titanium frame feels premium and the USB-C is finally here. Battery easily lasts a full day with heavy usage.', seller: 'Apple India Store', status: 'Published', date: '2026-06-06', reports: 0, helpful: 42, images: ['📸'] },
  { id: 'REV-002', product: 'Sony WH-1000XM5', customer: 'Priya Menon', country: 'India', rating: 4, title: 'Great noise cancellation', text: 'Audio is fantastic but a bit tight on my head. ANC is best in class. Multipoint connection works flawlessly.', seller: 'Sony Store', status: 'Published', date: '2026-06-05', reports: 0, helpful: 18, images: [] },
  { id: 'REV-003', product: 'Cheap Power Bank', customer: 'Anonymous', country: 'India', rating: 1, title: 'FAKE PRODUCT!!!', text: 'This is a counterfeit product. Seller is fraud. DO NOT BUY. The capacity is nowhere close to what is listed. Stopped working after 2 days.', seller: 'QuickMart Express', status: 'Flagged', date: '2026-06-05', reports: 3, helpful: 0, images: ['📸', '📸'] },
  { id: 'REV-004', product: 'MacBook Air M3', customer: 'Vikram Kumar', country: 'India', rating: 5, title: 'Worth every penny', text: 'Superb performance and battery life. Highly recommended for professionals and students alike.', seller: 'Apple India Store', status: 'Published', date: '2026-06-04', reports: 0, helpful: 35, images: [] },
  { id: 'REV-005', product: 'Samsung Galaxy S24', customer: 'Amit Patel', country: 'India', rating: 2, title: 'Competitor spam', text: 'Buy iPhone instead this is terrible phone worst purchase ever made avoid at all costs Samsung is the worst company', seller: 'Samsung Official', status: 'Under Review', date: '2026-06-04', reports: 1, helpful: 0, images: [] },
  { id: 'REV-006', product: 'Galaxy Z Fold5', customer: 'Ahmed Al-Farsi', country: 'UAE', rating: 5, title: 'Best foldable!', text: 'Amazing innovation. Worth the premium. The inner display is gorgeous and multitasking is next level.', seller: 'Gulf Electronics FZE', status: 'Published', date: '2026-06-05', reports: 0, helpful: 28, images: ['📸'] },
  { id: 'REV-007', product: 'Dyson V15', customer: 'Abdullah Al-Otaibi', country: 'Saudi Arabia', rating: 4, title: 'Powerful vacuum', text: 'Great suction power. Excellent build quality. A bit heavy for extended use but results are incredible.', seller: 'Riyadh Fashion Co', status: 'Published', date: '2026-06-04', reports: 0, helpful: 12, images: [] },
  { id: 'REV-008', product: 'Nike Air Max 90', customer: 'Sneha Nair', country: 'India', rating: 3, title: 'Wrong color received', text: 'Ordered black, received navy blue. Product itself is fine but the color mismatch is disappointing.', seller: 'Nike India', status: 'Under Review', date: '2026-06-03', reports: 0, helpful: 5, images: ['📸'] },
];

const STATUS_STYLES: Record<string, string> = { Published: 'bg-emerald-50 text-emerald-700', Flagged: 'bg-red-50 text-red-700', 'Under Review': 'bg-amber-50 text-amber-700', Removed: 'bg-slate-100 text-slate-500' };
const PAGE_SIZE = 6;

// ── Stars Component ──────────────────────────────────────────────────────────
function Stars({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const sz = size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5';
  return (<div className="flex items-center gap-0.5">{Array.from({ length: 5 }).map((_, i) => (<Star key={i} className={`${sz} ${i < rating ? 'text-amber-500 fill-amber-500' : 'text-slate-200'}`} />))}</div>);
}

// ── Review Detail Drawer ─────────────────────────────────────────────────────
function ReviewDrawer({ review: r, onClose, onApprove, onRemove, onFlag }: { review: Review; onClose: () => void; onApprove: () => void; onRemove: () => void; onFlag: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} ><DismissOnEscape onDismiss={onClose} /></div>
      <div className="relative w-full max-w-lg bg-white shadow-2xl overflow-y-auto animate-slide-left">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div><h2 className="text-lg font-black text-slate-900">{r.id}</h2><p className="text-xs text-slate-500">{r.date}</p></div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-5">
          {/* Status */}
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${STATUS_STYLES[r.status]}`}>{r.status}</span>
            {r.reports > 0 && <span className="text-[10px] font-bold text-red-600 flex items-center gap-0.5 bg-red-50 px-2 py-1 rounded-md"><Flag className="w-3 h-3" />{r.reports} reports</span>}
            <span className="text-[10px] font-bold text-slate-500 flex items-center gap-0.5"><ThumbsUp className="w-3 h-3" />{r.helpful} helpful</span>
          </div>

          {/* Product & Seller */}
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-sm font-bold text-slate-900">{r.product}</p>
            <p className="text-xs text-slate-500 mt-1">Seller: {r.seller}</p>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-3">
            <Stars rating={r.rating} size="md" />
            <span className="text-lg font-black text-slate-900">{r.rating}.0</span>
          </div>

          {/* Review Content */}
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-2">{r.title}</h3>
            <p className="text-sm text-slate-700 leading-relaxed">{r.text}</p>
          </div>

          {/* Images */}
          {r.images.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">Images ({r.images.length})</h3>
              <div className="flex gap-2">{r.images.map((img, i) => (<div key={i} className="w-20 h-20 bg-slate-100 rounded-xl flex items-center justify-center text-2xl border border-slate-200">{img}</div>))}</div>
            </div>
          )}

          {/* Reviewer */}
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-sm font-bold text-slate-900">{r.customer}</p>
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-1"><CountryFlag code={COUNTRY_TO_CODE[r.country] || 'IN'} size="sm" /> {r.country}</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {r.status !== 'Published' && (
              <button onClick={onApprove} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"><ThumbsUp className="w-4 h-4" /> Approve</button>
            )}
            {r.status !== 'Flagged' && r.status !== 'Removed' && (
              <button onClick={onFlag} className="flex-1 bg-amber-50 hover:bg-amber-100 text-amber-700 py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"><Flag className="w-4 h-4" /> Flag</button>
            )}
            {r.status !== 'Removed' && (
              <button onClick={onRemove} className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"><EyeOff className="w-4 h-4" /> Remove</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Remove Confirmation ──────────────────────────────────────────────────────
function RemoveModal({ reviewId, onConfirm, onClose }: { reviewId: string; onConfirm: (reason: string) => void; onClose: () => void }) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} ><DismissOnEscape onDismiss={onClose} /></div>
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center gap-3 mb-4"><EyeOff className="w-6 h-6 text-red-500" /><h3 className="text-lg font-black text-slate-900">Remove Review</h3></div>
        <p className="text-sm text-slate-600 mb-4">This will hide <span className="font-bold">{reviewId}</span> from customers.</p>
        <select value={reason} onChange={e => setReason(e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm mb-4 outline-none focus:ring-2 focus:ring-red-200">
          <option value="">Select reason...</option>
          <option value="Spam or fake review">Spam or fake review</option>
          <option value="Offensive language">Offensive language</option>
          <option value="Competitor sabotage">Competitor sabotage</option>
          <option value="Contains personal information">Contains personal information</option>
          <option value="Irrelevant to product">Irrelevant to product</option>
          <option value="Violates community guidelines">Violates community guidelines</option>
        </select>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-bold transition-colors">Cancel</button>
          <button onClick={() => onConfirm(reason)} disabled={!reason} className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white py-2.5 rounded-xl text-sm font-bold transition-colors">Remove</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function AdminReviewsPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState(0);
  const [page, setPage] = useState(1);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [removeReview, setRemoveReview] = useState<Review | null>(null);

  const { data: apiData, loading, error, refetch, toast, showToast } = useAdminData(
    () => adminMarketplaceApi.getReviews({ status: filter !== 'all' ? filter : undefined, rating: ratingFilter || undefined }),
    [filter, ratingFilter]
  );
  const { execute } = useAdminAction(showToast);

  const { filtered: regionFiltered, regionLabel, isFiltered } = useMarketplaceRegionFilter(REVIEWS);

  const filtered = regionFiltered.filter(r => {
    if (filter !== 'all' && r.status !== filter) return false;
    if (ratingFilter && r.rating !== ratingFilter) return false;
    if (search && !r.product.toLowerCase().includes(search.toLowerCase()) && !r.customer.toLowerCase().includes(search.toLowerCase()) && !r.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const avgRating = regionFiltered.length ? (regionFiltered.reduce((a, r) => a + r.rating, 0) / regionFiltered.length).toFixed(1) : '0';

  const handleApprove = (r: Review) => { execute(() => adminMarketplaceApi.flagReview(r.id, 'approved'), `Review ${r.id} approved`, () => refetch()); setSelectedReview(null); };
  const handleFlag = (r: Review) => { execute(() => adminMarketplaceApi.flagReview(r.id, 'flagged'), `Review ${r.id} flagged for review`, () => refetch()); setSelectedReview(null); };
  const handleRemove = (reason: string) => { if (!removeReview) return; execute(() => adminMarketplaceApi.hideReview(removeReview.id), `Review ${removeReview.id} removed`, () => refetch()); setRemoveReview(null); setSelectedReview(null); };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div><h1 className="text-2xl font-black text-slate-900">Reviews & Ratings</h1><p className="text-sm text-slate-500 mt-0.5">{isFiltered ? `${regionLabel} — ` : ''}Moderate customer reviews and manage reported content</p></div>
        <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50"><Download className="w-4 h-4" /> Export</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><p className="text-2xl font-black text-slate-900">{regionFiltered.length}</p><p className="text-xs text-slate-500 mt-1">Total</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><p className="text-2xl font-black text-amber-600 flex items-center gap-1"><Star className="w-5 h-5 fill-amber-500" />{avgRating}</p><p className="text-xs text-slate-500 mt-1">Avg Rating</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><p className="text-2xl font-black text-emerald-600">{regionFiltered.filter(r => r.status === 'Published').length}</p><p className="text-xs text-slate-500 mt-1">Published</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><p className="text-2xl font-black text-red-600">{regionFiltered.filter(r => r.status === 'Flagged').length}</p><p className="text-xs text-slate-500 mt-1">Flagged</p></div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"><p className="text-2xl font-black text-amber-600">{regionFiltered.filter(r => r.status === 'Under Review').length}</p><p className="text-xs text-slate-500 mt-1">Under Review</p></div>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" /><input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search product, customer, or review title..." className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-200" /></div>
        <div className="flex gap-2">{['all', 'Published', 'Flagged', 'Under Review'].map(s => (<button key={s} onClick={() => { setFilter(s); setPage(1); }} className={`px-3 py-2 text-xs font-bold rounded-xl border transition-colors ${filter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{s === 'all' ? 'All' : s}</button>))}</div>
        <div className="flex gap-1">{[0, 1, 2, 3, 4, 5].map(r => (<button key={r} onClick={() => { setRatingFilter(ratingFilter === r ? 0 : r); setPage(1); }} className={`px-2 py-2 text-xs font-bold rounded-xl border transition-colors ${ratingFilter === r ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{r === 0 ? '★' : `${r}★`}</button>))}</div>
      </div>

      {loading && <AdminLoadingSkeleton rows={4} />}
      {error && !loading && <AdminErrorBanner error={error} onRetry={refetch} />}

      <div className="space-y-3">
        {paged.length === 0 ? (
          <MarketplaceEmptyState title="No reviews found" icon={Star} />
        ) : paged.map(r => (
          <div key={r.id} onClick={() => setSelectedReview(r)} role="button" tabIndex={0} onKeyDown={activateOnKey(() => setSelectedReview(r))} className={`bg-white border rounded-2xl p-5 cursor-pointer hover:shadow-md transition-shadow ${r.status === 'Flagged' ? 'border-red-200 bg-red-50/20' : 'border-slate-200'}`}>
            <div className="flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="font-bold text-slate-900">{r.product}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${STATUS_STYLES[r.status]}`}>{r.status}</span>
                  {r.reports > 0 && <span className="text-[10px] font-bold text-red-600 flex items-center gap-0.5"><Flag className="w-3 h-3" />{r.reports} reports</span>}
                  {r.images.length > 0 && <span className="text-[10px] font-bold text-slate-400">📸 {r.images.length}</span>}
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Stars rating={r.rating} />
                  <span className="text-xs text-slate-500">by {r.customer} · <CountryFlag code={COUNTRY_TO_CODE[r.country] || 'IN'} size="sm" /> · {r.date}</span>
                </div>
                <p className="text-sm font-bold text-slate-800 mb-1">{r.title}</p>
                <p className="text-sm text-slate-600 line-clamp-2">{r.text}</p>
                <p className="text-xs text-slate-400 mt-2">Seller: {r.seller} · {r.id} · {r.helpful > 0 ? `👍 ${r.helpful} helpful` : ''}</p>
              </div>
              <div className="flex flex-col gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                {r.status !== 'Published' && <button onClick={() => handleApprove(r)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors"><ThumbsUp className="w-3 h-3" />Approve</button>}
                {r.status !== 'Removed' && <button onClick={() => setRemoveReview(r)} className="bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-red-200 flex items-center gap-1 transition-colors"><XCircle className="w-3 h-3" />Remove</button>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-xs text-slate-500">{filtered.length} reviews</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-xs font-bold">{page}/{totalPages}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {selectedReview && <ReviewDrawer review={selectedReview} onClose={() => setSelectedReview(null)} onApprove={() => handleApprove(selectedReview)} onRemove={() => setRemoveReview(selectedReview)} onFlag={() => handleFlag(selectedReview)} />}
      {removeReview && <RemoveModal reviewId={removeReview.id} onConfirm={handleRemove} onClose={() => setRemoveReview(null)} />}
      <AdminToast toast={toast} />
    </div>
  );
}
