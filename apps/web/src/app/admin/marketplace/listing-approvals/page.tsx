'use client';

/**
 * Offer moderation — the second approvals queue.
 *
 * Product approvals and offer approvals are different decisions and cannot share
 * a queue. `product-approvals` lists rows from `marketplace.products`; a seller
 * offering on a product that already exists creates **no** product row, only a
 * `product_listings` row. Their submission was therefore invisible to the
 * console: it sat PENDING with nothing able to surface it, which turns a
 * moderation gate into a silent block — the seller waits forever and no
 * reviewer ever learns there is anything to review.
 *
 * What is being judged here is the *offer*, not the item: this seller's price,
 * condition, stock and fulfilment promise on someone else's catalogue entry.
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  CheckCircle, XCircle, Clock, Store, Package, RefreshCw,
  AlertTriangle, Search, Tag, Truck, Inbox,
} from 'lucide-react';
import { apiFetch } from '@/lib/api-fetch';
import { useRegion } from '@/lib/contexts/region-context';
import { productPath } from '@/lib/marketplace/product-url';

interface PendingListing {
  id: string;
  sellerSku: string;
  sellingPrice: number;
  stockQuantity: number;
  condition: string;
  isFulfilledByKartseek: boolean;
  createdAt: string;
  product?: { id: string; name: string; mrp: number; slug?: string } | null;
  seller?: { id: string; businessName: string; sellerRating?: number; verificationStatus?: string } | null;
}

const REJECTION_REASONS = [
  'Price is implausible for this product',
  'Condition not supported for this category',
  'Seller not authorised for this brand',
  'Counterfeit / IP violation risk',
  'Stock figure not credible',
  'Fulfilment promise cannot be met',
  'Duplicate of the seller’s existing offer',
  'Other',
];

function toListing(row: any): PendingListing {
  return {
    id: String(row?.id ?? ''),
    sellerSku: String(row?.sellerSku ?? ''),
    // Decimal columns arrive as strings.
    sellingPrice: Number(row?.sellingPrice) || 0,
    stockQuantity: Number(row?.stockQuantity) || 0,
    condition: String(row?.condition ?? 'NEW').toUpperCase(),
    isFulfilledByKartseek: row?.isFulfilledByKartseek === true,
    createdAt: row?.createdAt ?? '',
    product: row?.product
      ? { id: String(row.product.id), name: String(row.product.name ?? ''), mrp: Number(row.product.mrp) || 0, slug: row.product.slug }
      : null,
    seller: row?.seller
      ? {
        id: String(row.seller.id),
        businessName: String(row.seller.businessName ?? ''),
        sellerRating: Number(row.seller.sellerRating) || 0,
        verificationStatus: row.seller.verificationStatus,
      }
      : null,
  };
}

function waitingFor(iso: string): string {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return '';
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function ListingApprovalsPage() {
  const { formatCurrencyValue } = useRegion();

  const [listings, setListings] = useState<PendingListing[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [acting, setActing] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<PendingListing | null>(null);
  const [reason, setReason] = useState(REJECTION_REASONS[0]);
  const [reasonNote, setReasonNote] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  /**
   * The queue.
   *
   * Fetched inside the effect rather than through a `useCallback` the effect
   * calls: every `setState` here happens after an `await`, inside the async
   * closure, and behind a `cancelled` guard — so a reviewer who navigates away
   * mid-request does not get a state update on an unmounted page, and the effect
   * body itself sets nothing synchronously.
   *
   * `nonce` is the refresh handle: bumping it re-runs the effect.
   */
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await apiFetch('/admin/marketplace/listings/pending?limit=100', { cache: 'no-store' });
        if (!res.ok) throw new Error(`Queue unavailable (${res.status})`);
        const body = await res.json();
        if (cancelled) return;
        // The gateway wraps this route's payload twice: `{data: {data, total}}`.
        const payload = body?.data?.data ?? body?.data ?? body;
        const rows: any[] = Array.isArray(payload) ? payload : (payload?.data ?? []);
        setLoadError('');
        setListings(rows.map(toListing).filter((l) => l.id));
        setTotal(Number(body?.data?.total ?? payload?.total ?? rows.length) || 0);
      } catch (err) {
        if (cancelled) return;
        // An empty list and a failed load are not the same thing, and a reviewer
        // must not read one as the other — "no offers waiting" would close the
        // queue on a backlog that is still there.
        setLoadError(err instanceof Error ? err.message : 'Could not load the queue.');
        setListings([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [nonce]);

  const refresh = useCallback(() => {
    setLoading(true);
    setNonce((n) => n + 1);
  }, []);

  const approve = async (listing: PendingListing) => {
    setActing(listing.id);
    try {
      const res = await apiFetch(`/admin/marketplace/listings/${listing.id}/approve`, { method: 'PATCH' });
      if (!res.ok) throw new Error(`Approval failed (${res.status})`);
      const body = await res.json();
      const wonBuyBox = body?.data?.data?.buyBoxWinnerId === listing.id || body?.data?.buyBoxWinnerId === listing.id;
      setListings((rows) => rows.filter((r) => r.id !== listing.id));
      setTotal((t) => Math.max(0, t - 1));
      showToast(
        wonBuyBox
          ? `Offer approved — it is the cheapest in-stock offer and now holds the buy box.`
          : `Offer approved and live.`,
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not approve this offer.', 'error');
    } finally {
      setActing(null);
    }
  };

  const reject = async () => {
    if (!rejecting) return;
    const full = reasonNote.trim() ? `${reason} — ${reasonNote.trim()}` : reason;
    setActing(rejecting.id);
    try {
      const res = await apiFetch(`/admin/marketplace/listings/${rejecting.id}/reject`, {
        method: 'PATCH',
        body: JSON.stringify({ reason: full }),
      });
      if (!res.ok) throw new Error(`Rejection failed (${res.status})`);
      setListings((rows) => rows.filter((r) => r.id !== rejecting.id));
      setTotal((t) => Math.max(0, t - 1));
      showToast('Offer rejected. The seller can see the reason.');
      setRejecting(null);
      setReasonNote('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not reject this offer.', 'error');
    } finally {
      setActing(null);
    }
  };

  const q = search.trim().toLowerCase();
  const visible = q
    ? listings.filter((l) =>
      (l.product?.name ?? '').toLowerCase().includes(q)
      || (l.seller?.businessName ?? '').toLowerCase().includes(q)
      || l.sellerSku.toLowerCase().includes(q))
    : listings;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Tag className="w-7 h-7 text-blue-600" />Offer Approvals
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Sellers offering on products already in the catalogue. Reviewed separately from{' '}
            <Link href="/admin/marketplace/product-approvals" className="text-blue-600 font-semibold hover:underline">
              product approvals
            </Link>.
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />Refresh
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="bg-white border border-slate-200 rounded-xl px-5 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Awaiting review</p>
            <p className="text-xl font-black text-slate-900">{total}</p>
          </div>
        </div>
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by product, seller or SKU…"
            className="w-full h-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      {toast && (
        <div className={`rounded-xl px-4 py-3 text-sm font-semibold border ${
          toast.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {toast.msg}
        </div>
      )}

      {loadError && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-bold">The queue could not be loaded.</p>
            <p className="mt-0.5">{loadError} — this is not the same as having nothing to review.</p>
            <button onClick={refresh} className="mt-2 font-bold underline">Try again</button>
          </div>
        </div>
      )}

      {loading && !loadError && (
        <div className="bg-white border border-slate-200 rounded-xl py-12 text-center text-sm text-slate-500">
          Loading the queue…
        </div>
      )}

      {!loading && !loadError && visible.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl py-12 text-center">
          <Inbox className="w-7 h-7 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-700">
            {listings.length === 0 ? 'No offers awaiting review' : 'Nothing matches that search'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {listings.length === 0
              ? 'Offers from sellers listing on existing products appear here.'
              : 'Clear the search to see the whole queue.'}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {visible.map((l) => {
          // The seller is proposing a price against the catalogue list price;
          // showing the gap is the single most useful number for a reviewer.
          const mrp = l.product?.mrp ?? 0;
          const discount = mrp > 0 && l.sellingPrice > 0
            ? Math.round(((mrp - l.sellingPrice) / mrp) * 100)
            : 0;

          return (
            <div key={l.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Package className="w-4 h-4 text-slate-400 shrink-0" />
                    {l.product?.id ? (
                      <Link
                        href={productPath(l.product)}
                        target="_blank"
                        className="font-bold text-slate-900 hover:text-blue-600 truncate"
                      >
                        {l.product.name}
                      </Link>
                    ) : (
                      <span className="font-bold text-slate-900 truncate">Unknown product</span>
                    )}
                    {waitingFor(l.createdAt) && (
                      <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 font-bold">
                        waiting {waitingFor(l.createdAt)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-2 text-sm text-slate-600 flex-wrap">
                    <Store className="w-3.5 h-3.5 text-slate-400" />
                    <Link
                      href={`/admin/marketplace/sellers`}
                      className="font-semibold text-blue-600 hover:underline"
                    >
                      {l.seller?.businessName || 'Unknown seller'}
                    </Link>
                    {l.seller?.verificationStatus && l.seller.verificationStatus !== 'VERIFIED' && (
                      <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                        seller {l.seller.verificationStatus.toLowerCase()}
                      </span>
                    )}
                    <span className="text-slate-300">·</span>
                    <span className="font-mono text-xs text-slate-500">{l.sellerSku}</span>
                  </div>

                  <div className="flex items-center gap-4 mt-3 text-sm flex-wrap">
                    <span className="font-black text-slate-900">{formatCurrencyValue(l.sellingPrice)}</span>
                    {mrp > 0 && (
                      <span className="text-xs text-slate-500">
                        list {formatCurrencyValue(mrp)}
                        {discount !== 0 && (
                          <span className={`ml-1 font-bold ${discount > 70 || discount < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            ({discount > 0 ? `${discount}% below` : `${Math.abs(discount)}% above`})
                          </span>
                        )}
                      </span>
                    )}
                    <span className={`text-xs font-semibold ${l.stockQuantity === 0 ? 'text-red-600' : 'text-slate-600'}`}>
                      {l.stockQuantity} in stock
                    </span>
                    <span className="text-xs text-slate-600">
                      {l.condition.charAt(0) + l.condition.slice(1).toLowerCase()}
                    </span>
                    {l.isFulfilledByKartseek && (
                      <span className="text-xs font-semibold text-blue-600 flex items-center gap-1">
                        <Truck className="w-3 h-3" />Fulfilled by KartSeek
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => approve(l)}
                    disabled={acting === l.id}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-4 py-2.5 rounded-lg disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRejecting(l); setReason(REJECTION_REASONS[0]); setReasonNote(''); }}
                    disabled={acting === l.id}
                    className="flex items-center gap-1.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 text-sm font-bold px-4 py-2.5 rounded-lg disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />Reject
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Rejection ─────────────────────────────────────────────────────── */}
      {rejecting && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="font-black text-lg text-slate-900">Reject this offer</h2>
            <p className="text-sm text-slate-500 mt-1">
              {rejecting.seller?.businessName} on {rejecting.product?.name}. The product and every
              other seller&apos;s offer are unaffected.
            </p>

            <label htmlFor="reject-reason" className="block text-sm font-bold text-slate-700 mt-4 mb-1">
              Reason
            </label>
            <select
              id="reject-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {REJECTION_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>

            <label htmlFor="reject-note" className="block text-sm font-bold text-slate-700 mt-4 mb-1">
              Note to the seller <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              id="reject-note"
              value={reasonNote}
              onChange={(e) => setReasonNote(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="What would they need to change to be approved?"
            />

            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setRejecting(null)}
                className="text-sm font-bold text-slate-600 px-4 py-2.5 rounded-lg hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={reject}
                disabled={acting === rejecting.id}
                className="bg-red-600 hover:bg-red-700 text-white text-sm font-bold px-4 py-2.5 rounded-lg disabled:opacity-50"
              >
                Reject offer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
