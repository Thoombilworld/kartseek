'use client';

import { useRegion } from '@/lib/contexts/region-context';
import { useVariants } from './variant-context';

/**
 * Client-side price display component for the product detail page.
 * Uses useRegion() to format prices according to the user's detected country.
 *
 * The selected variant's price wins when there is one. Variants carry their own
 * `sellingPrice` — a 512GB phone is not the price of the 128GB — and this
 * showed the parent listing's price whatever was selected, so the page quoted
 * one number and the cart charged another.
 */
export function ProductPriceDisplay({ sellingPrice, mrp }: { sellingPrice: number; mrp: number }) {
  const { formatCurrencyValue } = useRegion();
  const variants = useVariants();

  // Coerce here as well as at the caller: these props are typed `number`, but
  // they originate in an `any`-typed API response whose `decimal` columns are
  // strings on the wire, so TypeScript cannot actually enforce the annotation.
  const price = Number(variants?.selected ? variants.effectivePrice : sellingPrice) || 0;
  const list = Number(variants?.selected ? variants.effectiveMrp : mrp) || 0;
  const discounted = list > price && price > 0;
  const discount = discounted ? Math.round(((list - price) / list) * 100) : 0;

  // A product no seller has listed and with no MRP has no price to show. Saying
  // so is honest; "₹ 0.00" reads as free.
  if (price <= 0) {
    return (
      <div className="mb-2">
        <span className="text-xl font-bold text-slate-500">Price unavailable</span>
        <p className="text-sm text-slate-400 mt-1">This product is not currently offered by any seller.</p>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-3 mb-2">
      <span className="text-4xl font-black text-slate-900">{formatCurrencyValue(price)}</span>
      {discounted && (
        <>
          <span className="text-lg text-slate-400 line-through mb-1">{formatCurrencyValue(list)}</span>
          <span className="text-green-600 font-bold mb-1">{discount}% off</span>
        </>
      )}
    </div>
  );
}
