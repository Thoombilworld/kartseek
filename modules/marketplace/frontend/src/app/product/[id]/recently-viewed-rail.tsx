'use client';

import React, { useEffect, useState } from 'react';
import { ProductCard } from '../../components/product-card';
import { useRegion } from '@/lib/contexts/region-context';
import { RECENTLY_VIEWED_KEY, type ViewedProduct } from './product-client-state';

/**
 * "Recently viewed", from the trail the browser keeps.
 *
 * Read after mount because the trail lives in localStorage, which the server
 * cannot see; rendered only when there is something other than the current
 * product to show. Prices are the ones recorded at the time of viewing, in
 * the market they were viewed in — the card links through to the live page.
 */
export function RecentlyViewedRail({ excludeProductId }: { excludeProductId: string }) {
  const { formatCurrencyValue, country } = useRegion();
  const [rows, setRows] = useState<ViewedProduct[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENTLY_VIEWED_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      const list: ViewedProduct[] = Array.isArray(parsed) ? parsed : [];
      setRows(
        list
          .filter((p) => p?.id && p.id !== excludeProductId && p.price > 0)
          // A price recorded in another market is in another currency.
          .filter((p) => !p.market || p.market === country.code)
          .slice(0, 8),
      );
    } catch {
      setRows([]);
    }
  }, [excludeProductId, country.code]);

  if (rows.length === 0) return null;

  return (
    <section
      aria-labelledby="recently-viewed-heading"
      className="bg-white rounded-sm shadow-sm border border-slate-200 p-5 mt-4"
    >
      <h2
        id="recently-viewed-heading"
        className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-200 pb-2"
      >
        Recently viewed
      </h2>
      <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
        {rows.map((p) => (
          <div key={p.id} className="w-44 sm:w-48 flex-shrink-0">
            <ProductCard
              product={{
                id: p.id,
                title: p.title,
                brand: p.brand,
                price: p.price,
                mrp: p.mrp,
                rating: p.rating || undefined,
                imageUrl: p.imageUrl,
              }}
              formatCurrencyValue={formatCurrencyValue}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
