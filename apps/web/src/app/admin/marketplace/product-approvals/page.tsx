'use client';
import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle, XCircle, AlertTriangle, Search, Eye, Package,
  RefreshCw, Clock, Store, Tag, ChevronRight, Sparkles,
  TrendingUp, BadgeCheck, ArrowUpRight,
} from 'lucide-react';
import Link from 'next/link';
import { useMarketplaceRegionFilter } from '@/hooks/useMarketplaceRegionFilter';
import { apiFetch } from '@/lib/api-fetch';
import { unwrapCatalogList } from '@/lib/api/map-catalog-product';

import { activateOnKey } from '@/lib/a11y/activate-on-key';
type ProductStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CORRECTION_REQUESTED';

interface StoreProduct {
  id: string;
  name: string;
  description: string;
  category: string;
  subcategory: string;
  price: number;
  mrp: number;
  emoji: string;
  brand: string;
  sku: string;
  sellerId: string;
  sellerName: string;
  status: ProductStatus;
  rejectionReason?: string;
  submittedAt: string;
  approvedAt?: string;
  reviewedBy?: string;
  imageCount: number;
}

interface Stats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  correctionRequested: number;
}

const APPROVAL_STATUSES: readonly ProductStatus[] = [
  'PENDING', 'APPROVED', 'REJECTED', 'CORRECTION_REQUESTED',
];

/**
 * Shape a catalogue row for this page's view model.
 *
 * Every numeric field is coerced with a zero default because the JSX calls
 * `.toLocaleString()` on `price` and `mrp` unguarded — a row with no active
 * listing (so no selling price) would otherwise take the whole page down.
 * `price` is the buy-box listing's selling price, not `mrp`: `mrp` is the list
 * price and is frequently higher than what the customer actually pays.
 */
function toStoreProduct(p: any): StoreProduct {
  const mrp = Number(p?.mrp ?? 0) || 0;
  const listings: any[] = Array.isArray(p?.listings) ? p.listings : [];
  const buyBox = listings.find((l) => l?.isBuyBoxWinner) ?? listings[0];
  const raw = String(p?.approval_status ?? p?.approvalStatus ?? 'PENDING').toUpperCase();
  return {
    id: String(p?.id ?? ''),
    name: p?.name ?? 'Untitled product',
    description: p?.short_description ?? p?.long_description ?? '',
    category: p?.category?.name ?? '',
    subcategory: p?.subcategory?.name ?? '',
    price: Number(buyBox?.sellingPrice ?? mrp) || mrp,
    mrp,
    emoji: '📦',
    brand: p?.brand?.name ?? (typeof p?.brand === 'string' ? p.brand : ''),
    sku: p?.globalTradeItemNumber ?? p?.slug ?? '',
    sellerId: String(p?.seller_id ?? p?.sellerId ?? ''),
    sellerName: p?.seller?.businessName ?? '',
    status: (APPROVAL_STATUSES as readonly string[]).includes(raw)
      ? (raw as ProductStatus)
      : 'PENDING',
    submittedAt: p?.created_at ?? p?.createdAt ?? '',
    imageCount: Array.isArray(p?.images) ? p.images.length : 0,
  };
}

const STATUS_STYLES: Record<ProductStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
  APPROVED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-red-100 text-red-700 border-red-200',
  CORRECTION_REQUESTED: 'bg-blue-100 text-blue-700 border-blue-200',
};

const STATUS_LABELS: Record<ProductStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CORRECTION_REQUESTED: 'Correction Requested',
};

const REJECTION_REASONS = [
  'Incorrect HSN/SAC code',
  'Wrong GST/tax classification',
  'Poor quality images',
  'Misleading product description',
  'Prohibited item',
  'Counterfeit/IP violation risk',
  'Incomplete product information',
  'Pricing policy violation',
  'Missing mandatory attributes',
  'Category mismatch',
  'Other',
];

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const HOMEPAGE_SECTIONS: { key: string; label: string; description: string }[] = [
  { key: '', label: 'Auto-detect (recommended)', description: 'Place based on product category' },
  { key: 'electronics', label: 'Best of Electronics', description: 'Laptops, phones, gadgets & audio' },
  { key: 'fashion', label: 'Trending in Fashion', description: 'Clothing, shoes, watches & accessories' },
  { key: 'home', label: 'Home & Kitchen Essentials', description: 'Furniture, decor & appliances' },
  { key: 'beauty', label: 'Beauty & Personal Care', description: 'Skincare, makeup & grooming' },
  { key: 'sports', label: 'Sports & Fitness', description: 'Gym, outdoor & sports gear' },
  { key: 'toys', label: 'Toys & Baby', description: 'Kids toys, baby products & games' },
  { key: 'books', label: 'Books & Stationery', description: 'Books, pens & education' },
  { key: 'general', label: 'Deals of the Day', description: 'Featured in daily deals section' },
  { key: 'trending', label: 'Trending Now', description: 'Highlighted in trending searches section' },
];

export default function ProductApprovalsPage() {
  const { regionLabel, isFiltered } = useMarketplaceRegionFilter([]);

  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | ProductStatus>('All');
  const [selected, setSelected] = useState<StoreProduct | null>(null);
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [rejectModal, setRejectModal] = useState<{ id: string; action: 'REJECTED' | 'CORRECTION_REQUESTED' } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectNote, setRejectNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      // Real backend via the gateway. This used to hit /api/marketplace/pending, a
      // Next.js route backed by an in-memory demo array — approvals there changed
      // nothing in the database. See audit 2026-07-27 (H1).
      //
      // `/products?approvalStatus=PENDING` was the wrong endpoint: the gateway
      // dropped the filter, and the read behind it (`CatalogService.getProducts`)
      // hard-codes `approval_status = 'APPROVED'` because it is the storefront
      // query — so the approvals queue listed *approved* products and could never
      // show a pending one. `/products/pending` is backed by
      // `MarketplaceAdminService.getPendingProducts`, which also returns the
      // queue counts this page renders.
      const res = await apiFetch('/admin/marketplace/products/pending', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        const payload = data.data ?? data;
        // Rows are `Product` entities (`mrp`, `brand: {name}`, `images[]`), not
        // this page's flat view model — rendering them raw left `price` undefined
        // and `price.toLocaleString()` threw, collapsing the page into the error
        // boundary.
        setProducts(unwrapCatalogList(data).map(toStoreProduct));
        if (payload?.stats) setStats(payload.stats as typeof stats);
      }
    } catch {
      showToast('Failed to load products', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await apiFetch(`/admin/marketplace/products/${id}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ homepageSection: selectedSection || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
        setProducts((prev) => prev.filter((p) => p.id !== id));
        if (selected?.id === id) { setSelected(null); setSelectedSection(''); }
        setStats((s) => s ? { ...s, pending: s.pending - 1, approved: s.approved + 1 } : s);
      } else {
        showToast(data.error || 'Approval failed', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectModal) return;
    const reason = rejectReason || 'No reason selected';
    const finalReason = rejectNote ? `${reason} — ${rejectNote}` : reason;

    setActionLoading(rejectModal.id);
    try {
      const res = await apiFetch(
        `/admin/marketplace/products/${rejectModal.id}/${rejectModal.action === 'CORRECTION_REQUESTED' ? 'request-correction' : 'reject'}`,
        {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: rejectModal.id,
          action: rejectModal.action === 'CORRECTION_REQUESTED' ? 'correction' : 'reject',
          reason: finalReason,
        }),
      },
      );
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
        setProducts((prev) => prev.filter((p) => p.id !== rejectModal.id));
        if (selected?.id === rejectModal.id) setSelected(null);
        setStats((s) => s ? { ...s, pending: s.pending - 1, rejected: s.rejected + 1 } : s);
      } else {
        showToast(data.error || 'Action failed', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setActionLoading(null);
      setRejectModal(null);
      setRejectReason('');
      setRejectNote('');
    }
  };

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = products.filter((p) => {
    const matchSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sellerName.toLowerCase().includes(search.toLowerCase()) ||
      p.id.includes(search);
    const matchStatus = filterStatus === 'All' || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Product Approvals</h1>
          <p className="text-slate-500 text-sm mt-1">{isFiltered ? `${regionLabel} — ` : ""}Review seller submissions — only Approved products appear on the marketplace.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/seller/marketplace/products/add"
            target="_blank"
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors"
          >
            <Store className="w-4 h-4" /> Test: Seller Portal
            <ArrowUpRight className="w-3 h-3" />
          </Link>
          <button
            onClick={loadProducts}
            className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-4 py-2 rounded-xl text-sm transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Stats Strip */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Pending Review', value: stats.pending, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', icon: Clock },
            { label: 'Approved', value: stats.approved, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', icon: BadgeCheck },
            { label: 'Rejected', value: stats.rejected, color: 'text-red-600', bg: 'bg-red-50 border-red-200', icon: XCircle },
            { label: 'Correction Req.', value: stats.correctionRequested, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', icon: AlertTriangle },
          ].map(({ label, value, color, bg, icon: Icon }) => (
            <div key={label} className={`${bg} border rounded-xl px-4 py-3 flex items-center gap-3`}>
              <Icon className={`w-5 h-5 ${color}`} />
              <div>
                <p className={`text-2xl font-black ${color}`}>{value}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, seller, or ID..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {(['All', 'PENDING', 'APPROVED', 'REJECTED', 'CORRECTION_REQUESTED'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterStatus(f as typeof filterStatus)}
              className={`px-3 py-2 text-xs font-bold rounded-xl border transition-colors ${filterStatus === f ? 'bg-violet-600 text-white border-violet-600' : 'bg-white border-slate-200 hover:border-violet-300 hover:text-violet-700'}`}
            >
              {f === 'All' ? 'All' : STATUS_LABELS[f as ProductStatus]}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Product List */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <p className="text-sm font-bold text-slate-700">
              {loading ? 'Loading…' : `${filtered.length} product${filtered.length !== 1 ? 's' : ''} pending review`}
            </p>
            {stats && stats.pending > 0 && (
              <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-2.5 py-1 rounded-full animate-pulse">
                {stats.pending} awaiting review
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mr-2" /> Loading products…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-300 text-center px-4">
              <Package className="w-10 h-10 mb-3" />
              <p className="text-sm font-medium text-slate-400">
                {products.length === 0 ? 'No pending submissions yet' : 'No products match your filter'}
              </p>
              <p className="text-xs text-slate-300 mt-1">
                Use the &quot;Test: Seller Portal&quot; button to submit a product
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((p) => (
                <div
                  key={p.id}
                  onClick={() => { setSelected(p); setSelectedSection(''); }} role="button" tabIndex={0} onKeyDown={activateOnKey(() => { setSelected(p); setSelectedSection(''); })}
                  className={`flex items-start gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors ${selected?.id === p.id ? 'bg-violet-50 border-l-4 border-violet-500' : ''}`}
                >
                  <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center shrink-0 text-2xl">
                    {p.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-sm line-clamp-1">{p.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{p.sellerName} · {p.category} › {p.subcategory}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLES[p.status]}`}>
                        {STATUS_LABELS[p.status]}
                      </span>
                      <span className="text-[10px] text-slate-400">₹{p.price.toLocaleString('en-IN')}</span>
                      <span className="text-[10px] text-slate-400">{timeAgo(p.submittedAt)}</span>
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      title="Approve"
                      disabled={actionLoading === p.id}
                      onClick={(e) => { e.stopPropagation(); handleApprove(p.id); }}
                      className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg disabled:opacity-50 transition-colors"
                    >
                      {actionLoading === p.id ? (
                        <div className="w-4 h-4 border-2 border-emerald-500/40 border-t-emerald-600 rounded-full animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      title="Reject"
                      onClick={(e) => { e.stopPropagation(); setRejectModal({ id: p.id, action: 'REJECTED' }); }}
                      className="p-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Detail Panel */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {selected ? (
            <>
              {/* Product image placeholder */}
              <div className="h-28 bg-linear-to-br from-violet-100 to-purple-100 flex items-center justify-center border-b border-slate-200 text-5xl">
                {selected.emoji}
              </div>
              <div className="p-5 space-y-4 overflow-y-auto max-h-[520px]">
                <div>
                  <p className="font-black text-slate-900 text-sm leading-snug">{selected.name}</p>
                  <p className="text-xs text-slate-400 mt-1">{selected.id}</p>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                    <Store className="w-3 h-3" /> {selected.sellerName}
                  </p>
                </div>

                {selected.description && (
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 rounded-xl p-3">
                    {selected.description}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Category</p><p className="font-bold text-slate-800 text-xs">{selected.category}</p></div>
                  <div><p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Subcategory</p><p className="font-bold text-slate-800 text-xs">{selected.subcategory}</p></div>
                  <div><p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Selling Price</p><p className="font-bold text-emerald-700 text-sm">₹{selected.price.toLocaleString('en-IN')}</p></div>
                  <div><p className="text-[10px] text-slate-400 uppercase font-bold mb-1">MRP</p><p className="font-bold text-slate-700 text-sm">₹{selected.mrp.toLocaleString('en-IN')}</p></div>
                  {selected.brand && <div><p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Brand</p><p className="font-bold text-slate-800 text-xs">{selected.brand}</p></div>}
                  {selected.sku && <div><p className="text-[10px] text-slate-400 uppercase font-bold mb-1">SKU</p><p className="font-mono font-bold text-slate-700 text-xs">{selected.sku}</p></div>}
                  <div><p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Images</p><p className="font-bold text-xs">{selected.imageCount} uploaded</p></div>
                  <div><p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Submitted</p><p className="font-bold text-xs text-slate-600">{timeAgo(selected.submittedAt)}</p></div>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-3">
                  {/* Homepage Section Assignment */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                      📍 Homepage Section
                    </label>
                    <select
                      aria-label="Assign homepage section"
                      value={selectedSection}
                      onChange={(e) => setSelectedSection(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
                    >
                      {HOMEPAGE_SECTIONS.map((s) => (
                        <option key={s.key} value={s.key}>{s.label}</option>
                      ))}
                    </select>
                    {selectedSection && (
                      <p className="text-[10px] text-violet-600 font-medium mt-1 flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" />
                        Will appear in: <strong>{HOMEPAGE_SECTIONS.find(s => s.key === selectedSection)?.label}</strong>
                      </p>
                    )}
                    {!selectedSection && (
                      <p className="text-[10px] text-slate-400 mt-1">
                        Will be placed based on product category automatically
                      </p>
                    )}
                  </div>
                  <button
                    disabled={actionLoading === selected.id}
                    onClick={() => handleApprove(selected.id)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    {actionLoading === selected.id ? (
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    Approve — Publish to Marketplace
                  </button>
                  <button
                    onClick={() => setRejectModal({ id: selected.id, action: 'REJECTED' })}
                    className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 border border-red-200 transition-colors"
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                  <button
                    onClick={() => setRejectModal({ id: selected.id, action: 'CORRECTION_REQUESTED' })}
                    className="w-full bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 border border-amber-200 transition-colors"
                  >
                    <AlertTriangle className="w-4 h-4" /> Request Correction
                  </button>
                  <Link
                    href="/marketplace"
                    target="_blank"
                    className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 border border-slate-200 transition-colors"
                  >
                    <Eye className="w-4 h-4" /> View Marketplace
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-slate-300 text-center px-4">
              <Package className="w-10 h-10 mb-3" />
              <p className="text-sm text-slate-400">Select a product to review</p>
              <p className="text-xs text-slate-300 mt-1">Click any row on the left</p>
            </div>
          )}
        </div>
      </div>

      {/* Approve Success CTA */}
      {stats && stats.approved > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-bold text-emerald-800 text-sm">{stats.approved} product{stats.approved !== 1 ? 's' : ''} live on marketplace</p>
              <p className="text-xs text-emerald-600">Approved products are immediately visible to customers</p>
            </div>
          </div>
          <Link
            href="/marketplace"
            target="_blank"
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors whitespace-nowrap"
          >
            <TrendingUp className="w-4 h-4" /> View Live <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-black text-slate-900 mb-1">
              {rejectModal.action === 'CORRECTION_REQUESTED' ? 'Request Correction' : 'Reject Product'}
            </h3>
            <p className="text-sm text-slate-500 mb-4">Seller will be notified with the reason.</p>
            <select
              aria-label="Rejection reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-violet-400"
            >
              <option value="">Select reason...</option>
              {REJECTION_REASONS.map((r) => <option key={r}>{r}</option>)}
            </select>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Additional notes for the seller (optional)..."
              rows={3}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-400 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setRejectModal(null); setRejectReason(''); setRejectNote(''); }}
                className="flex-1 bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl text-sm hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectConfirm}
                disabled={actionLoading !== null}
                className={`flex-1 font-bold py-2.5 rounded-xl text-sm transition-colors text-white disabled:opacity-50 ${rejectModal.action === 'CORRECTION_REQUESTED' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {actionLoading ? 'Processing…' : rejectModal.action === 'CORRECTION_REQUESTED' ? 'Send for Correction' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-white text-sm font-bold transition-all animate-in slide-in-from-bottom-2 ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
