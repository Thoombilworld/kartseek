'use client';

import Link from 'next/link';
import { Star, BadgeCheck, Truck, Store } from 'lucide-react';
import { useRegion } from '@/lib/contexts/region-context';
import type { ProductOffer } from '@/lib/marketplace/product-detail';

/**
 * Every seller offering this product in this market, cheapest first.
 *
 * `product_listings` is keyed `(product, seller)` and the detail read returns
 * every approved, active offer from a seller who trades in the market, buy-box
 * winner first. Only the public projection of the seller reaches this
 * component — name, store slug, rating, verification — never the row.
 *
 * Deliberately informational: there is no "buy from this seller" button. Add
 * to Cart is priced server-side from the buy-box offer and the cart line
 * carries no listing id, so a button here would put the item in the basket at
 * the buy-box seller's price under another seller's name.
 */

const CONDITION_LABELS: Record<string, string> = {
  NEW: 'New',
  REFURBISHED: 'Refurbished',
  USED: 'Used',
};

export function OtherSellers({ offers }: { offers: ProductOffer[] }) {
  const { formatCurrencyValue } = useRegion();

  const sorted = [...offers]
    .filter((o) => o.sellingPrice > 0)
    .sort((a, b) => a.sellingPrice - b.sellingPrice);

  // One offer is the ordinary case and the "Sold By" card already names that
  // seller — a panel repeating it adds nothing.
  if (sorted.length < 2) return null;

  const best = sorted[0].sellingPrice;

  return (
    <section
      aria-labelledby="other-sellers-heading"
      className="bg-white rounded-sm shadow-sm border border-slate-200 p-5"
      data-testid="other-sellers"
    >
      <h2
        id="other-sellers-heading"
        className="font-bold text-slate-900 mb-1 flex items-center gap-2 border-b border-slate-200 pb-2"
      >
        <Store className="w-5 h-5 text-slate-400" aria-hidden="true" /> Other sellers on KartSeek
      </h2>
      <p className="text-xs text-slate-500 mt-2 mb-3">
        {sorted.length} sellers offer this product. Add to Cart buys the highlighted offer.
      </p>

      <ul className="divide-y divide-slate-100">
        {sorted.map((offer) => {
          const premium = offer.sellingPrice - best;
          const outOfStock = offer.stockQuantity <= 0;
          const storeHref = offer.sellerId ? `/seller/${offer.sellerId}` : null;

          return (
            <li
              key={offer.id}
              className={`py-3 first:pt-0 last:pb-0 ${offer.isBuyBoxWinner ? 'bg-blue-50/60 -mx-2 px-2 rounded-lg' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {storeHref ? (
                      <Link
                        href={storeHref}
                        className="font-bold text-sm text-blue-600 hover:underline truncate"
                      >
                        {offer.sellerName}
                      </Link>
                    ) : (
                      <span className="font-bold text-sm text-slate-700 truncate">
                        {offer.sellerName}
                      </span>
                    )}
                    {offer.verified && (
                      <BadgeCheck
                        className="w-3.5 h-3.5 text-emerald-500 shrink-0"
                        aria-label="Verified seller"
                      />
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 flex-wrap">
                    {offer.sellerRating > 0 ? (
                      <span className="flex items-center gap-0.5">
                        <Star
                          className="w-3 h-3 text-yellow-400 fill-yellow-400"
                          aria-hidden="true"
                        />
                        <span className="sr-only">Seller rating</span>
                        {offer.sellerRating.toFixed(1)}
                      </span>
                    ) : (
                      <span>New seller</span>
                    )}
                    <span aria-hidden="true">·</span>
                    <span>{CONDITION_LABELS[offer.condition] ?? offer.condition}</span>
                    {offer.isFulfilledByKartseek && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="flex items-center gap-0.5 text-blue-600 font-semibold">
                          <Truck className="w-3 h-3" aria-hidden="true" /> Fulfilled by KartSeek
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-black text-slate-900 text-sm">
                    {formatCurrencyValue(offer.sellingPrice)}
                  </div>
                  {offer.isBuyBoxWinner ? (
                    <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wide mt-0.5">
                      Default offer
                    </div>
                  ) : premium > 0 ? (
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      +{formatCurrencyValue(premium)}
                    </div>
                  ) : null}
                  {outOfStock && (
                    <div className="text-[10px] font-bold text-red-500 mt-0.5">Out of stock</div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
