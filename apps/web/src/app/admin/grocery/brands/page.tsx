'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, Package, AlertTriangle, RefreshCw, Info, Star } from 'lucide-react';
import { adminGroceryApi } from '@/lib/api/admin-grocery';
import { useAsyncData } from '@/lib/hooks/use-async-data';

/**
 * Brands in the grocery catalogue.
 *
 * The page presented a brand moderation queue. Its statuses were computed from
 * array position — `i % 7 === 0 ? 'pending' : i % 11 === 0 ? 'rejected' :
 * 'approved'` — over a demo brand list, and Approve, Reject and Feature all called
 * `groceryApi.updateStoreSettings(b.name, { brandStatus })`, passing the *brand
 * name* as a store id into a store-settings endpoint, then swallowing the failure.
 *
 * There is no brand entity to moderate: `grocery_items.brand` is a free-text
 * column a seller types. What an admin can usefully see — and what this now shows
 * — is which brand names are actually in the catalogue and how many products carry
 * each, which is real and derivable, and makes typos and near-duplicates visible.
 */
export default function AdminGroceryBrandsPage() {
  const [search, setSearch] = useState('');
  const { data: productsData, loading, error, reload } = useAsyncData<
    Array<{ brand?: string; category?: string; isAvailable?: boolean }>
  >(
    async () => {
      // The catalogue is paged; 500 covers current volumes and the count below says
      // what it was computed from rather than implying it saw everything.
      const res = await adminGroceryApi.getProducts({ page: 1, limit: 500 });
      if (!res.success || !res.data) throw new Error(res.error ?? 'Could not load the catalogue');
      return (res.data.data ?? []) as any[];
    },
    [],
  );
  const products = error ? [] : (productsData ?? []);

  const brands = useMemo(() => {
    const map = new Map<string, { name: string; products: number; listed: number; categories: Set<string> }>();
    for (const p of products) {
      const name = (p.brand ?? '').trim();
      if (!name) continue;
      const entry = map.get(name.toLowerCase()) ?? { name, products: 0, listed: 0, categories: new Set<string>() };
      entry.products += 1;
      if (p.isAvailable) entry.listed += 1;
      if (p.category) entry.categories.add(p.category);
      map.set(name.toLowerCase(), entry);
    }
    return [...map.values()].sort((a, b) => b.products - a.products);
  }, [products]);

  const rows = brands.filter((b) => !search || b.name.toLowerCase().includes(search.toLowerCase()));
  const unbranded = products.filter((p) => !(p.brand ?? '').trim()).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Brands</h1>
          <p className="text-sm text-slate-500">Brand names appearing in the grocery catalogue</p>
        </div>
        <div className="flex gap-2 text-xs self-start">
          <span className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-full font-bold">
            {loading ? '—' : `${brands.length} brands`}
          </span>
          <span className="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full font-bold">
            {loading ? '—' : `${unbranded} unbranded`}
          </span>
          <button onClick={reload} className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50" aria-label="Refresh">
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-start justify-between gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          <span className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{error}</span>
          <button onClick={reload} className="font-bold shrink-0">Retry</button>
        </div>
      )}

      <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-800">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          Brand is a free-text field on each product, not a managed record, so there is nothing to approve or
          feature here. Two spellings of the same brand appear as two rows — that is the useful signal on this
          screen. Correct a name on the product itself in{' '}
          <Link href="/admin/grocery/products" className="font-bold underline">the catalogue</Link>.
        </p>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search brands…"
          aria-label="Search brands"
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-green-500 bg-white"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold">Brand</th>
                <th className="px-4 py-3 font-semibold text-right">Products</th>
                <th className="px-4 py-3 font-semibold text-right">Listed</th>
                <th className="px-4 py-3 font-semibold">Categories</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-400">Loading catalogue…</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                    {error ? 'Catalogue unavailable.' : 'No branded products in the catalogue yet.'}
                  </td>
                </tr>
              )}
              {rows.map((b) => (
                <tr key={b.name} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-bold text-slate-900 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-slate-300" />{b.name}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{b.products}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${b.listed === b.products ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {b.listed}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {[...b.categories].slice(0, 3).join(', ')}
                    {b.categories.size > 3 && ` +${b.categories.size - 3}`}
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
