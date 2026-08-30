'use client';

/**
 * My offers — and the form for adding one to a product already in the catalogue.
 *
 * The portal could only ever *create products*: "Add Product" posts a new
 * catalogue entry, mints a GTIN and takes the seller through title, images,
 * category and description. For a seller stocking an item KartSeek already
 * carries — the common case for any real merchant — that was the wrong shape
 * entirely. It produced a duplicate catalogue entry competing with the original
 * in search, split the reviews across two pages, and left the buy box with
 * nothing to arbitrate.
 *
 * Here the seller identifies the existing product (by barcode, or by searching
 * the catalogue) and supplies only what is theirs to set: price, stock,
 * condition, their own SKU. The catalogue content stays with the product.
 */

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Store, Search, Loader2, Plus, X, CheckCircle2, Clock, XCircle,
  PackageSearch, Barcode, AlertTriangle,
} from 'lucide-react';
import { sellerApi, type SellerListing } from '@/lib/modules/seller-api';
import { useSellerData } from '@/lib/hooks/use-seller-data';
import { useSellerMoney } from '@/lib/hooks/use-seller-money';
import { SellerDataState } from '@/components/seller/marketplace/data-state';
import { ApiError } from '@/lib/api-endpoints';

type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

const STATUS_UI: Record<ApprovalStatus, { label: string; className: string; icon: typeof Clock }> = {
  PENDING: { label: 'Awaiting review', className: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
  APPROVED: { label: 'Live', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  REJECTED: { label: 'Rejected', className: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
};

const CONDITIONS = ['NEW', 'REFURBISHED', 'USED'] as const;

interface CatalogueMatch {
  id: string;
  name: string;
  mrp: number;
  gtin: string;
  image?: string;
}

function toMatch(p: any): CatalogueMatch {
  const images: any[] = Array.isArray(p?.images) ? p.images : [];
  return {
    id: String(p?.id ?? ''),
    name: String(p?.name ?? 'Untitled product'),
    mrp: Number(p?.mrp) || 0,
    gtin: String(p?.globalTradeItemNumber ?? ''),
    image: (images.find((i) => i?.isPrimary) ?? images[0])?.url,
  };
}

export default function SellerListingsPage() {
  const { format: fmt } = useSellerMoney();

  const listingsRes = useSellerData<{ data: SellerListing[]; total: number }>(
    () => sellerApi.getListings({ limit: 100 }),
  );
  const listings = listingsRes.data?.data ?? [];

  // ── The "add an offer" form ────────────────────────────────────────────────
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [matches, setMatches] = useState<CatalogueMatch[]>([]);
  const [searched, setSearched] = useState(false);
  const [picked, setPicked] = useState<CatalogueMatch | null>(null);

  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [condition, setCondition] = useState<(typeof CONDITIONS)[number]>('NEW');
  const [sku, setSku] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');

  const runSearch = useCallback(async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setFormError('');
    try {
      const res: any = await sellerApi.searchCatalogue(q);
      // The gateway wraps list payloads twice — rows sit at data.data.
      const rows: any[] = res?.data?.data ?? res?.data ?? [];
      setMatches(rows.map(toMatch).filter((m) => m.id));
    } catch (err) {
      setMatches([]);
      setFormError(err instanceof ApiError ? err.message : 'Could not search the catalogue.');
    } finally {
      setSearching(false);
      setSearched(true);
    }
  }, [query]);

  const resetForm = () => {
    setOpen(false);
    setQuery(''); setMatches([]); setSearched(false); setPicked(null);
    setPrice(''); setStock(''); setCondition('NEW'); setSku('');
    setFormError('');
  };

  const submit = async () => {
    if (!picked) return;
    const sellingPrice = Number(price);
    const stockQuantity = Number(stock);

    // Checked here as well as server-side so the seller is told immediately —
    // the server refuses both of these too, and its answer is the one that
    // counts.
    if (!Number.isFinite(sellingPrice) || sellingPrice <= 0) {
      setFormError('Enter a selling price greater than zero.');
      return;
    }
    if (!Number.isFinite(stockQuantity) || stockQuantity < 0) {
      setFormError('Enter the number of units you have, zero or more.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      const res: any = await sellerApi.createListing({
        productId: picked.id,
        sellingPrice,
        stock: stockQuantity,
        condition,
        sku: sku.trim() || undefined,
      });
      setNotice(
        res?.message
        ?? `Offer on ${picked.name} submitted for review. It goes on sale once an admin approves it.`,
      );
      resetForm();
      listingsRes.reload();
    } catch (err) {
      // The gateway now forwards the service's real status and message —
      // "You already offer this product", "That product has not been approved
      // yet" — rather than collapsing every failure into a 503.
      setFormError(err instanceof ApiError ? err.message : 'Could not create this offer.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Store className="w-7 h-7 text-blue-600" />My Offers
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Your price and stock on products already in the KartSeek catalogue.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-bold transition-colors"
        >
          {open ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {open ? 'Cancel' : 'Offer on a product'}
        </button>
      </div>

      {notice && (
        <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-4 py-3 text-sm">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{notice}</span>
          <button onClick={() => setNotice('')} className="ml-auto text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Add an offer ──────────────────────────────────────────────────── */}
      {open && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div>
            <label htmlFor="catalogue-search" className="block text-sm font-bold text-slate-700 mb-1">
              Which product are you selling?
            </label>
            <p className="text-xs text-slate-500 mb-2">
              Search by name, or paste the barcode (EAN/UPC) printed on the box.
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  id="catalogue-search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); runSearch(); } }}
                  placeholder="e.g. Wireless Earbuds, or 8901234567890"
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <button
                type="button"
                onClick={runSearch}
                disabled={!query.trim() || searching}
                className="bg-slate-900 text-white text-sm font-bold px-4 py-2.5 rounded-lg disabled:opacity-50 flex items-center gap-2"
              >
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Search
              </button>
            </div>
          </div>

          {searched && matches.length === 0 && !searching && (
            <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-600">
              <PackageSearch className="w-4 h-4 mt-0.5 shrink-0 text-slate-400" />
              <span>
                Nothing in the catalogue matches that. If this product is genuinely new to
                KartSeek,{' '}
                <Link href="/seller/marketplace/products/add" className="text-blue-600 font-bold hover:underline">
                  create it as a new product
                </Link>{' '}
                instead — that route takes the images, category and description too.
              </span>
            </div>
          )}

          {matches.length > 0 && !picked && (
            <ul className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-64 overflow-y-auto">
              {matches.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => { setPicked(m); setFormError(''); }}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-800 truncate">{m.name}</div>
                      {m.gtin && (
                        <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <Barcode className="w-3 h-3" />{m.gtin}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 shrink-0">List {fmt(m.mrp)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {picked && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-blue-900 truncate">{picked.name}</div>
                  <div className="text-xs text-blue-700">List price {fmt(picked.mrp)}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setPicked(null)}
                  className="text-blue-600 hover:text-blue-800 text-xs font-bold"
                >
                  Change
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="offer-price" className="block text-sm font-bold text-slate-700 mb-1">
                    Your selling price
                  </label>
                  <input
                    id="offer-price"
                    type="number" min="1" step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    The lowest in-stock offer wins the buy box.
                  </p>
                </div>

                <div>
                  <label htmlFor="offer-stock" className="block text-sm font-bold text-slate-700 mb-1">
                    Units in stock
                  </label>
                  <input
                    id="offer-stock"
                    type="number" min="0" step="1"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="offer-condition" className="block text-sm font-bold text-slate-700 mb-1">
                    Condition
                  </label>
                  <select
                    id="offer-condition"
                    value={condition}
                    onChange={(e) => setCondition(e.target.value as (typeof CONDITIONS)[number])}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    {CONDITIONS.map((c) => (
                      <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="offer-sku" className="block text-sm font-bold text-slate-700 mb-1">
                    Your SKU <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <input
                    id="offer-sku"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="Generated if you leave this blank"
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Unique within your account only — other sellers may use the same code.
                  </p>
                </div>
              </div>

              {formError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={submit}
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-5 py-2.5 rounded-lg disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Submit offer for review
                </button>
                <p className="text-xs text-slate-500">
                  Your offer is reviewed before it goes on sale.
                </p>
              </div>
            </div>
          )}

          {formError && !picked && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Existing offers ───────────────────────────────────────────────── */}
      <SellerDataState
        loading={listingsRes.loading}
        error={listingsRes.error}
        unavailable={listingsRes.unavailable}
        isEmpty={listings.length === 0}
        feature="Offers"
        onRetry={listingsRes.reload}
        emptyTitle="No offers yet"
        emptyDescription="Offers you make on products already in the catalogue appear here."
      >
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="text-left font-bold px-4 py-3">Product</th>
                  <th className="text-left font-bold px-4 py-3">SKU</th>
                  <th className="text-right font-bold px-4 py-3">Your price</th>
                  <th className="text-right font-bold px-4 py-3">Stock</th>
                  <th className="text-left font-bold px-4 py-3">Status</th>
                  <th className="text-left font-bold px-4 py-3">Buy box</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {listings.map((l) => {
                  const raw = String(l.approvalStatus ?? 'PENDING').toUpperCase();
                  const status = (raw in STATUS_UI ? raw : 'PENDING') as ApprovalStatus;
                  const ui = STATUS_UI[status];
                  return (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{l.product?.name ?? '—'}</div>
                        {status === 'REJECTED' && l.rejectionReason && (
                          <div className="text-xs text-red-600 mt-0.5">{l.rejectionReason}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{l.sellerSku}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">{fmt(l.sellingPrice)}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${Number(l.stockQuantity) === 0 ? 'text-red-600' : 'text-slate-700'}`}>
                        {Number(l.stockQuantity) || 0}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full border ${ui.className}`}>
                          <ui.icon className="w-3 h-3" />{ui.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {l.isBuyBoxWinner ? (
                          <span className="text-xs font-bold text-blue-600">Winning</span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </SellerDataState>
    </div>
  );
}
