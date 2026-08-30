'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Megaphone, Search, AlertTriangle, RefreshCw, Star, X } from 'lucide-react';
import { groceryApi } from '@/lib/grocery-api';
import { StoreGate } from '@/components/seller/grocery/store-gate';
import type { GrocerySellerStore } from '@/lib/hooks/use-grocery-seller-store';
import { useAsyncData } from '@/lib/hooks/use-async-data';

/**
 * Promoted products.
 *
 * Another `MOCK_DATA` template page with `groceryApi` imported and unused — though
 * unlike most of the portal's stubs, this one does have a real endpoint behind it:
 * `GET /grocery/stores/:storeId/promotions`, backed by `grocery_items.isPromoted`,
 * which is also what pushes a product to the top of the storefront listing.
 */
export default function GroceryPromotionsPage() {
  return <StoreGate>{(store) => <PromotionsContent store={store} />}</StoreGate>;
}

interface Promotion {
  productId: string;
  name: string;
  category: string;
  isPromoted: boolean;
  rating: number;
  reviewCount: number;
}

function PromotionsContent({ store }: { store: GrocerySellerStore }) {
  const [search, setSearch] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: promotionsData, loading, error, reload } = useAsyncData<Promotion[]>(
    async () => {
      const res = await groceryApi.getStorePromotions(store.id);
      return (res?.promotions ?? []) as Promotion[];
    },
    [store.id],
  );
  const promotions = error ? [] : (promotionsData ?? []);

  const unpromote = async (p: Promotion) => {
    setBusyId(p.productId);
    setActionError(null);
    try {
      await groceryApi.toggleProductPromotion(store.id, p.productId, false);
      await reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not update this product');
    } finally {
      setBusyId(null);
    }
  };

  const rows = promotions.filter((p) =>
    !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.category?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Megaphone className="w-7 h-7 text-violet-600" /> Promotions
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Promoted products appear first in your storefront listing.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/seller/grocery/products" className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-violet-700 transition-colors">
            Promote a product
          </Link>
          <button onClick={() => reload()} className="p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50" aria-label="Refresh promotions">
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
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search promoted products…" aria-label="Search promotions"
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-violet-500 outline-none"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Product</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-500">Category</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-500">Rating</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-400">Loading promotions…</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center">
                    <Megaphone className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-500">
                      {error ? 'Promotions unavailable.' : 'Nothing is promoted right now.'}
                    </p>
                    {!error && (
                      <Link href="/seller/grocery/products" className="text-sm font-semibold text-violet-600 hover:underline mt-2 inline-block">
                        Choose a product to promote
                      </Link>
                    )}
                  </td>
                </tr>
              )}
              {rows.map((p) => (
                <tr key={p.productId} className={`hover:bg-slate-50/50 transition-colors ${busyId === p.productId ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3.5">
                    <Link href={`/grocery/product/${p.productId}`} className="font-semibold text-slate-800 hover:text-violet-600">{p.name}</Link>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600">{p.category || '—'}</td>
                  <td className="px-4 py-3.5 text-center">
                    {Number(p.rating) > 0 ? (
                      <span className="inline-flex items-center gap-0.5 text-xs">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />{Number(p.rating).toFixed(1)}
                        <span className="text-slate-400">({p.reviewCount})</span>
                      </span>
                    ) : <span className="text-slate-400 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <button
                      onClick={() => void unpromote(p)}
                      disabled={busyId === p.productId}
                      className="inline-flex items-center gap-1 bg-slate-100 hover:bg-red-100 hover:text-red-600 disabled:opacity-50 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                    >
                      <X className="w-3.5 h-3.5" /> Stop promoting
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
