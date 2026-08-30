'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, Package, AlertTriangle } from 'lucide-react';
import { useGroceryLocale } from '@/i18n/grocery-locale';
import { groceryApi } from '@/lib/grocery-api';

/**
 * Brands available to shop.
 *
 * The page listed brands from `ALL_BRANDS` in the demo-data folder and linked each
 * to `/grocery/brand/<slug>`. Those slugs match nothing in the catalogue, so every
 * tile led to a brand page with no products — a directory of dead links.
 *
 * Brand is a free-text column on `grocery_items`, not an entity, so the honest
 * source is the catalogue itself: these are the brands customers can actually buy,
 * with the number of products behind each.
 */
export default function GroceryBrandsPage() {
  const { tr } = useGroceryLocale();
  const [products, setProducts] = useState<Array<{ brand?: string; category?: string }>>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    groceryApi.listProducts({ limit: 200 })
      .then((res: any) => { if (!cancelled) setProducts(res?.data ?? []); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load brands'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const brands = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    for (const p of products) {
      const name = (p.brand ?? '').trim();
      if (!name) continue;
      const key = name.toLowerCase();
      map.set(key, { name, count: (map.get(key)?.count ?? 0) + 1 });
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [products]);

  const rows = brands.filter((b) => !search || b.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/grocery" className="touch-target -ml-2 text-slate-500 hover:text-green-600 transition-colors" aria-label={tr('Back')}>
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">{tr('Brands')}</h1>
          <p className="text-sm text-slate-500">
            {loading ? 'Loading…' : `${brands.length} brand${brands.length === 1 ? '' : 's'} in the catalogue`}
          </p>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 mb-4">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> <p>{error}</p>
        </div>
      )}

      <div className="relative mb-5">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={tr('Search brands…')}
          aria-label={tr('Search brands')}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3" aria-busy="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 bg-white border border-slate-200 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-600 mb-1">
            {error ? 'Brands unavailable' : search ? 'No brands match' : 'No brands yet'}
          </h2>
          <p className="text-sm text-slate-400">{tr('Products in the catalogue will list their brands here.')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {rows.map((brand) => (
            // Searches the catalogue by brand name — a route that returns real
            // products, rather than a slug that matches nothing.
            <Link
              key={brand.name}
              href={`/grocery/search?q=${encodeURIComponent(brand.name)}`}
              className="bg-white border border-slate-200/80 rounded-xl p-4 text-center hover:shadow-md hover:border-green-300 transition-all group"
            >
              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center mx-auto mb-2 group-hover:bg-green-50 transition-colors">
                <Package className="w-5 h-5 text-slate-400 group-hover:text-green-600 transition-colors" />
              </div>
              <p className="text-sm font-bold text-slate-800 truncate">{brand.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">{brand.count} product{brand.count === 1 ? '' : 's'}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
