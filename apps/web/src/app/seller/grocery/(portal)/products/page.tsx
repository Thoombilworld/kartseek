'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Download, Apple, Plus, AlertTriangle, RefreshCw, Trash2, Megaphone, ChevronLeft, ChevronRight } from 'lucide-react';
import { useGroceryLocale } from '@/i18n/grocery-locale';
import { groceryApi } from '@/lib/grocery-api';
import { StoreGate } from '@/components/seller/grocery/store-gate';
import type { GrocerySellerStore } from '@/lib/hooks/use-grocery-seller-store';
import { useAsyncData } from '@/lib/hooks/use-async-data';

/**
 * Seller catalogue.
 *
 * This page was generated boilerplate: a `MOCK_DATA` array of four string arrays
 * ("Fresh Milk 500ml", "Dairy", "65", …) rendered into a table, with `groceryApi`
 * imported and never called, an Export button with no handler, and `useEffect`,
 * `RefreshCw` and `Filter` imported unused. Twelve other screens in this portal
 * were built from the same template.
 *
 * It now lists the seller's real products and the Export button downloads the CSV
 * the service generates — an endpoint that was itself unreachable until the
 * gateway's `/products/export` route was moved above `/products/:productId`.
 */
export default function GroceryProductsPage() {
  return <StoreGate>{(store) => <ProductsContent store={store} />}</StoreGate>;
}

const PAGE_SIZE = 30;

interface SellerProduct {
  id: string;
  name: string;
  category: string;
  brand?: string;
  isAvailable: boolean;
  isPromoted: boolean;
  weightVariants?: Array<{ weight: string; price: number; mrp: number; stock: number; sku?: string }>;
}

function ProductsContent({ store }: { store: GrocerySellerStore }) {
  const { formatPrice } = useGroceryLocale();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Rows and their total come from one response, so they travel together — held
  // as two pieces of state they could disagree, showing page 3 of 40 alongside a
  // count from page 1.
  const { data: pageData, loading, error, reload } = useAsyncData<{ rows: SellerProduct[]; total: number }>(
    async () => {
      const res = await groceryApi.getProducts(store.id, undefined, page, PAGE_SIZE);
      return {
        rows: (res?.data ?? []) as unknown as SellerProduct[],
        total: Number(res?.total ?? 0),
      };
    },
    [store.id, page],
  );
  const products = error ? [] : (pageData?.rows ?? []);
  const total = error ? 0 : (pageData?.total ?? 0);

  const togglePromotion = async (p: SellerProduct) => {
    setBusyId(p.id);
    setActionError(null);
    try {
      await groceryApi.toggleProductPromotion(store.id, p.id, !p.isPromoted);
      await reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not update this product');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (p: SellerProduct) => {
    setBusyId(p.id);
    setActionError(null);
    try {
      await groceryApi.deleteProduct(store.id, p.id);
      await reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not delete this product');
    } finally {
      setBusyId(null);
    }
  };

  /**
   * The API returns the CSV as text rather than a file response, so the download
   * is assembled here from a Blob.
   */
  const exportCsv = async () => {
    setExporting(true);
    setActionError(null);
    try {
      const res = await groceryApi.exportProductsCsv(store.id);
      const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.filename || `products-${store.id}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not export your catalogue');
    } finally {
      setExporting(false);
    }
  };

  // Search narrows the loaded page; the endpoint paginates rather than searching.
  const rows = products.filter((p) =>
    !search
    || p.name?.toLowerCase().includes(search.toLowerCase())
    || p.brand?.toLowerCase().includes(search.toLowerCase())
    || p.category?.toLowerCase().includes(search.toLowerCase()),
  );
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Apple className="w-7 h-7 text-blue-600" /> Grocery Products
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {loading ? 'Loading…' : `${total} product${total === 1 ? '' : 's'} in ${store.name}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/seller/grocery/products/add" className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" /> Add Product
          </Link>
          <button
            onClick={() => void exportCsv()}
            disabled={exporting || total === 0}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            <Download className="w-4 h-4" /> {exporting ? 'Exporting…' : 'Export'}
          </button>
          <button onClick={() => reload()} className="p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50" aria-label="Refresh products">
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-start justify-between gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          <span className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{error}</span>
          <button onClick={() => reload()} className="font-bold shrink-0">Retry</button>
        </div>
      )}
      {actionError && (
        <div role="alert" className="flex items-start justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="font-bold shrink-0">Dismiss</button>
        </div>
      )}

      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search this page…"
          aria-label="Search products"
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Product</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Category</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-500">Price</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-500">Stock</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-500">Status</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Loading catalogue…</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <Apple className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-500">
                      {error ? 'Catalogue unavailable.' : search ? 'No products match your search.' : 'You have not added any products yet.'}
                    </p>
                  </td>
                </tr>
              )}
              {rows.map((p) => {
                const variant = p.weightVariants?.[0];
                const stock = (p.weightVariants ?? []).reduce((s, v) => s + Number(v.stock ?? 0), 0);
                return (
                  <tr key={p.id} className={`hover:bg-slate-50/50 transition-colors ${busyId === p.id ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-slate-800">{p.name}</p>
                      {p.brand && <p className="text-xs text-slate-400">{p.brand}</p>}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">{p.category || '—'}</td>
                    <td className="px-4 py-3.5 text-right">
                      {variant ? (
                        <>
                          <span className="font-bold">{formatPrice(Number(variant.price))}</span>
                          <span className="text-xs text-slate-400 block">{variant.weight}</span>
                        </>
                      ) : <span className="text-xs text-slate-400">no variants</span>}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${stock === 0 ? 'bg-red-50 text-red-700' : stock <= 10 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                        {stock === 0 ? 'Out of Stock' : stock <= 10 ? `Low (${stock})` : stock}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${p.isAvailable ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {p.isAvailable ? 'Listed' : 'Hidden'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => void togglePromotion(p)}
                          disabled={busyId === p.id}
                          title={p.isPromoted ? 'Remove from promotions' : 'Promote this product'}
                          className={`p-1.5 rounded-lg disabled:opacity-50 ${p.isPromoted ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-500 hover:bg-violet-50'}`}
                        >
                          <Megaphone className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => void remove(p)}
                          disabled={busyId === p.id}
                          title="Delete product"
                          className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-red-100 hover:text-red-600 disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
