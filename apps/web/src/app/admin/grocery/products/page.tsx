'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, Eye, Star, AlertTriangle, RefreshCw, ChevronLeft, ChevronRight, Package } from 'lucide-react';
import { useGroceryRegionFilter } from '@/hooks/useGroceryRegionFilter';
import { adminGroceryApi } from '@/lib/api/admin-grocery';
import { GROCERY_CATEGORIES } from '@/lib/modules/grocery-categories';
import { useAsyncData } from '@/lib/hooks/use-async-data';

/**
 * Grocery catalogue, platform-wide.
 *
 * The page imported `adminGroceryApi` and never called it. Twelve products were
 * written into the file, and "Approve"/"Reject" mutated that local array — a
 * moderator could work through the whole queue and change nothing. There is no
 * per-product approval state on `grocery_items` either, so those two buttons were
 * describing a workflow that does not exist; what the platform actually has is
 * availability, which the seller controls and this screen now reports.
 */

const PAGE_SIZE = 30;

interface AdminProductRow {
  id: string;
  name: string;
  category: string;
  subCategory?: string;
  brand?: string;
  storeId: string;
  imageUrl?: string;
  isAvailable: boolean;
  isPromoted: boolean;
  rating: number;
  reviewCount: number;
  weightVariants?: Array<{ weight: string; price: number; mrp: number; stock: number }>;
}

export default function AdminGroceryProductsPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [page, setPage] = useState(1);
  /**
   * Moderation.
   *
   * Seller-submitted products were not appearing here at all: the admin
   * catalogue call reached `getProducts` without an actor, so the
   * approved-only filter added for shoppers applied to the moderator too.
   * The endpoint now returns every listing with its `approvalStatus`; this is
   * the screen that acts on it.
   */
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [acting, setActing] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const decide = async (id: string, decision: 'approve' | 'reject') => {
    setActing(id);
    setActionError(null);
    try {
      // A rejection has to say why — the seller sees the reason.
      const reason = decision === 'reject'
        ? (typeof window !== 'undefined' ? window.prompt('Why is this listing rejected?')?.trim() : '')
        : '';
      if (decision === 'reject' && !reason) { setActing(null); return; }

      const res = decision === 'approve'
        ? await adminGroceryApi.approveProduct(id)
        : await adminGroceryApi.rejectProduct(id, reason as string);
      if (!res.success) throw new Error(res.error ?? `Could not ${decision} the listing`);
      await reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : `Could not ${decision} the listing`);
    } finally {
      setActing(null);
    }
  };

  // Category and page can both change mid-flight; `useAsyncData` drops a
  // response whose inputs have since been superseded, so the grid cannot settle
  // on the previous category's page.
  const { data, loading, error, reload } = useAsyncData(
    async () => {
      // "Awaiting review" has its own endpoint. The catalogue call paginates
      // every product in the platform, so filtering its first page for PENDING
      // rows showed nothing even when listings were waiting — which is what
      // "products are not showing up for approval" actually was.
      const res = statusFilter === 'PENDING'
        ? await adminGroceryApi.getPendingProducts({ page, limit: PAGE_SIZE })
        : await adminGroceryApi.getProducts({
            page, limit: PAGE_SIZE,
            category: category === 'All' ? undefined : category,
          });
      if (!res.success) throw new Error(res.error ?? 'Could not load the grocery catalogue');
      return res.data;
    },
    [page, category, statusFilter],
  );

  const products = (data?.data ?? []) as unknown as AdminProductRow[];
  const total = Number(data?.total ?? 0);

  const { formatPrice } = useGroceryRegionFilter(products);

  // The catalogue endpoint filters by category server-side; the free-text box
  // narrows the loaded page, which is why it is applied here rather than sent.
  const rows = products.filter((p) => {
    // Applied to the loaded page, like the search box above it — the catalogue
    // endpoint paginates server-side and does not filter on moderation state.
    // The PENDING view comes pre-filtered from the queue endpoint; the others
    // are narrowed here, on the loaded page, like the search box.
    if (statusFilter !== 'ALL' && statusFilter !== 'PENDING'
        && (p as any).approvalStatus !== statusFilter) return false;
    return !search
      || p.name?.toLowerCase().includes(search.toLowerCase())
      || p.brand?.toLowerCase().includes(search.toLowerCase());
  });

  const pendingOnPage = statusFilter === 'PENDING'
    ? Number(data?.total ?? 0)
    : products.filter((p) => (p as any).approvalStatus === 'PENDING').length;

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const available = products.filter((p) => p.isAvailable).length;
  const outOfStock = products.filter((p) => !(p.weightVariants ?? []).some((v) => Number(v.stock ?? 0) > 0)).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Grocery Catalogue</h1>
          <p className="text-sm text-slate-500">Every product listed by every grocery store</p>
        </div>
        <div className="flex gap-2 text-xs self-start">
          <span className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-full font-bold">{loading ? '—' : total.toLocaleString()} total</span>
          <span className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full font-bold">{available} available</span>
          <span className="bg-red-100 text-red-700 px-3 py-1.5 rounded-full font-bold">{outOfStock} out of stock</span>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-start justify-between gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          <span className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{error}</span>
          <button onClick={reload} className="font-bold shrink-0 flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5" /> Retry</button>
        </div>
      )}

      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search this page by product or brand…"
            aria-label="Search products"
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-green-500 bg-white"
          />
          {/* Moderation filter. Defaults to what needs a decision, because that
              is why a moderator opens this screen. */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            aria-label="Filter by approval status"
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white min-h-11"
          >
            <option value="PENDING">Awaiting review{pendingOnPage ? ` (${pendingOnPage})` : ''}</option>
            <option value="ALL">All statuses</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          aria-label="Filter by category"
          className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white max-w-[220px]"
        >
          <option value="All">All categories</option>
          {GROCERY_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {/* A failed decision has to be visible — it was set and never rendered,
            so a rejected approve looked like nothing happened. */}
        {actionError && (
          <div role="alert" className="mb-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <span className="text-sm text-red-700">{actionError}</span>
            <button onClick={() => setActionError(null)} className="ml-auto text-xs font-bold text-red-600 min-h-11 px-2">Dismiss</button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold">Product</th>
                <th className="px-4 py-3 font-semibold">Brand</th>
                <th className="px-4 py-3 font-semibold text-right">Price</th>
                <th className="px-4 py-3 font-semibold text-center">Stock</th>
                <th className="px-4 py-3 font-semibold text-center">Rating</th>
                <th className="px-4 py-3 font-semibold text-center">Approval</th>
                <th className="px-4 py-3 font-semibold text-center">Listing</th>
                <th className="px-4 py-3 font-semibold text-center">Decision</th>
                <th className="px-4 py-3 font-semibold text-center"><span className="sr-only">View</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-400">Loading catalogue…</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-400">
                    {error ? 'Catalogue unavailable.' : 'No products match this filter.'}
                  </td>
                </tr>
              )}
              {rows.map((p) => {
                const variant = p.weightVariants?.[0];
                const stock = (p.weightVariants ?? []).reduce((s, v) => s + Number(v.stock ?? 0), 0);
                return (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-slate-300 shrink-0" />{p.name}
                      </p>
                      <p className="text-xs text-slate-400">{[p.category, p.subCategory].filter(Boolean).join(' • ')}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{p.brand || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      {variant ? (
                        <>
                          <span className="font-bold text-sm">{formatPrice(Number(variant.price))}</span>
                          {Number(variant.mrp) > Number(variant.price) && (
                            <span className="text-[10px] text-slate-400 line-through ml-1">{formatPrice(Number(variant.mrp))}</span>
                          )}
                        </>
                      ) : <span className="text-xs text-slate-400">no variants</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${stock === 0 ? 'bg-red-100 text-red-700' : stock <= 10 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                        {stock}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {p.rating > 0 ? (
                        <span className="inline-flex items-center gap-0.5 text-xs">
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />{Number(p.rating).toFixed(1)}
                          <span className="text-slate-400">({p.reviewCount})</span>
                        </span>
                      ) : <span className="text-slate-400 text-xs">—</span>}
                    </td>
                    {/* Moderation state — distinct from `isAvailable`, which is the
                        seller's own in-stock switch. A listing can be in stock and
                        still be waiting for approval. */}
                    <td className="px-4 py-3 text-center">
                      {(() => {
                        const st = (p as any).approvalStatus ?? 'APPROVED';
                        const tone = st === 'APPROVED' ? 'bg-emerald-100 text-emerald-700'
                          : st === 'REJECTED' ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700';
                        return (
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${tone}`} title={(p as any).rejectionReason ?? undefined}>
                            {st === 'PENDING' ? 'Awaiting review' : st.charAt(0) + st.slice(1).toLowerCase()}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${p.isAvailable ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {p.isAvailable ? 'Listed' : 'Hidden'}
                      </span>
                      {p.isPromoted && <span className="ml-1 bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded text-[10px] font-bold">Promoted</span>}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {((p as any).approvalStatus ?? 'APPROVED') === 'APPROVED' ? (
                        <button
                          onClick={() => decide(p.id, 'reject')}
                          disabled={acting === p.id}
                          className="text-xs font-bold text-red-600 hover:text-red-700 disabled:opacity-50 min-h-11 px-2"
                        >
                          Reject
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <button
                            onClick={() => decide(p.id, 'approve')}
                            disabled={acting === p.id}
                            className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg px-3 py-2 disabled:opacity-50 min-h-11"
                          >
                            {acting === p.id ? '…' : 'Approve'}
                          </button>
                          {(p as any).approvalStatus === 'PENDING' && (
                            <button
                              onClick={() => decide(p.id, 'reject')}
                              disabled={acting === p.id}
                              className="text-xs font-bold text-red-600 hover:text-red-700 disabled:opacity-50 min-h-11 px-2"
                            >
                              Reject
                            </button>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link href={`/grocery/product/${p.id}`} className="inline-flex text-slate-400 hover:text-green-600" aria-label={`View ${p.name}`}>
                        <Eye className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {pageCount > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm">
            <span className="text-slate-500">Page {page} of {pageCount}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold disabled:opacity-40 hover:bg-slate-50 flex items-center gap-1">
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <button onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={page >= pageCount} className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold disabled:opacity-40 hover:bg-slate-50 flex items-center gap-1">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
