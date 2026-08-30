'use client';

import { useRegion } from '@/lib/contexts/region-context';

/**
 * Client-side price tag component for server-rendered marketplace pages.
 * Formats price and MRP according to the user's detected region.
 */
export function PriceTag({ price, mrp, discount }: { price: number; mrp: number; discount: number }) {
  const { formatCurrencyValue } = useRegion();

  return (
    // Wraps as a unit so a narrow card never splits a price mid-value or
    // pushes the discount past its edge.
    <div className="flex items-baseline flex-wrap gap-x-2 gap-y-0.5">
      <span className="font-bold text-base text-slate-900 whitespace-nowrap">{formatCurrencyValue(price)}</span>
      {mrp > price && (
        <span className="flex items-baseline gap-1.5 whitespace-nowrap">
          <span className="text-[11px] text-slate-500 line-through">{formatCurrencyValue(mrp)}</span>
          <span className="text-[11px] text-green-600 font-semibold">{discount}% off</span>
        </span>
      )}
    </div>
  );
}
