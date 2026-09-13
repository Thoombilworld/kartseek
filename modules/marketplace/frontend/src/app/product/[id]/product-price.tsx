'use client';

import { useRegion } from '@/lib/contexts/region-context';
import { getListPriceLabels } from '@/lib/localization';
import { useVariants } from './variant-context';

/**
 * The price block: payable price, struck-through list price, saving, and the
 * market's tax treatment.
 *
 * The selected SKU's price wins when there is one — a 512GB phone is not the
 * price of the 128GB — and the figures are the backend's: the buy-box offer
 * for this market, or the SKU's own `sellingPrice`. Nothing is computed here
 * except the percentage shown beside the saving, from those two numbers.
 *
 * Prices arrive as decimal strings from Postgres; coerced once at the caller
 * and once more here because the props are typed `number` but originate in an
 * `any` response.
 */
export function ProductPriceDisplay({
  sellingPrice,
  mrp,
  offered = true,
}: {
  sellingPrice: number;
  mrp: number;
  /** False when no seller offers the product in this market. */
  offered?: boolean;
}) {
  const { formatCurrencyValue, country } = useRegion();
  const variants = useVariants();
  const listPriceLabels = getListPriceLabels(country.code);
  const tax = country.tax;

  const price = Number(variants?.selected ? variants.effectivePrice : sellingPrice) || 0;
  const list = Number(variants?.selected ? variants.effectiveMrp : mrp) || 0;
  const discounted = list > price && price > 0;
  const discount = discounted ? Math.round(((list - price) / list) * 100) : 0;

  // A product no seller offers here has no price to show. Saying so is honest;
  // a list price alone would read as the amount charged.
  if (!offered || price <= 0) {
    return (
      <div className="mb-2" data-testid="product-price">
        <span className="text-xl font-bold text-slate-500">Price unavailable</span>
        <p className="text-sm text-slate-400 mt-1">
          This product is not currently offered by any seller in your market.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-2" data-testid="product-price">
      <div className="flex items-end gap-3 flex-wrap">
        <span
          className="text-3xl md:text-4xl font-black text-slate-900"
          data-testid="product-price-payable"
        >
          {formatCurrencyValue(price)}
        </span>
        {discounted && (
          <>
            <span
              className="text-lg text-slate-400 line-through mb-1"
              data-testid="product-price-list"
            >
              <span className="sr-only">{listPriceLabels.short} </span>
              {formatCurrencyValue(list)}
            </span>
            <span className="text-green-600 font-bold mb-1">{discount}% off</span>
          </>
        )}
      </div>
      <p className="text-xs text-slate-500 mt-1">
        {discounted && (
          <span className="text-green-700 font-semibold mr-2">
            {listPriceLabels.savings}: {formatCurrencyValue(list - price)}
          </span>
        )}
        {tax && tax.rate > 0
          ? tax.inclusive
            ? `Inclusive of ${tax.name}`
            : `Excludes ${tax.name}, added at checkout`
          : 'No sales tax applies in this market'}
      </p>
    </div>
  );
}
