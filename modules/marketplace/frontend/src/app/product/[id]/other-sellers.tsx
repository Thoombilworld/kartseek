'use client';

import Link from 'next/link';
import { Star, BadgeCheck, Truck, Store } from 'lucide-react';
import { useRegion } from '@/lib/contexts/region-context';

/**
 * Every seller offering this product, cheapest first.
 *
 * The catalogue has always been able to carry competing offers — `product_listings`
 * is keyed `(product, seller)` and `getProductById` returns every approved,
 * active one with its seller attached, buy-box winner first — but nothing on the
 * storefront rendered them. The product page showed a single "Sold By" card for
 * the buy-box seller and gave no indication that anyone else stocked the item,
 * which is the difference between a marketplace and a shop window.
 *
 * Deliberately informational: there is no "buy from this seller" button.
 *
 * That is not an oversight. Add-to-cart resolves the price server-side from the
 * buy-box listing (`addResolvedItem` in the gateway, and `priceOrderItems` again
 * at checkout) and has no way to be told "this customer picked the third offer".
 * A button here would put the item in the cart at the buy-box seller's price
 * under another seller's name — silently charging one merchant's offer while the
 * customer believed they had chosen another. Showing the offers honestly is
 * worth doing now; the button waits for the cart line to carry a `listingId`.
 */

export interface SellerOffer {
  id: string;
  sellingPrice: number;
  condition: string;
  stockQuantity: number;
  isBuyBoxWinner: boolean;
  isFulfilledByKartseek: boolean;
  seller?: {
    id?: string;
    businessName?: string;
    sellerRating?: number;
    verificationStatus?: string;
  } | null;
}

const CONDITION_LABELS: Record<string, string> = {
  NEW: 'New',
  REFURBISHED: 'Refurbished',
  USED: 'Used',
};

export function OtherSellers({ offers }: { offers: SellerOffer[] }) {
  const { formatCurrencyValue } = useRegion();

  // Decimal columns arrive as strings, so the sort has to coerce or it compares
  // "1099.00" against "999.00" lexically and puts the dearer offer first.
  const sorted = [...offers]
    .filter((o) => Number(o?.sellingPrice) > 0)
    .sort((a, b) => Number(a.sellingPrice) - Number(b.sellingPrice));

  // One offer is the ordinary case and the "Sold By" card above already names
  // that seller — a panel repeating it adds nothing.
  if (sorted.length < 2) return null;

  const best = Number(sorted[0].sellingPrice);

  return (
    <div className="bg-white rounded-sm shadow-sm border border-slate-200 p-5">
      <h2 className="font-bold text-slate-900 mb-1 flex items-center gap-2 border-b border-slate-200 pb-2">
        <Store className="w-5 h-5 text-slate-400" /> Other Sellers on KartSeek
      </h2>
      <p className="text-xs text-slate-500 mt-2 mb-3">
        {sorted.length} sellers offer this product. Add to Cart buys the highlighted offer.
      </p>

      <ul className="divide-y divide-slate-100">
        {sorted.map((offer) => {
          const price = Number(offer.sellingPrice);
          const premium = price - best;
          const outOfStock = Number(offer.stockQuantity) <= 0;

          return (
            <li
              key={offer.id}
              className={`py-3 first:pt-0 last:pb-0 ${offer.isBuyBoxWinner ? 'bg-blue-50/60 -mx-2 px-2 rounded-lg' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {offer.seller?.id ? (
                      <Link
                        href={`/marketplace/seller/${offer.seller.id}`}
                        className="font-bold text-sm text-blue-600 hover:underline truncate"
                      >
                        {offer.seller.businessName || 'Seller'}
                      </Link>
                    ) : (
                      <span className="font-bold text-sm text-slate-700 truncate">
                        {offer.seller?.businessName || 'Seller'}
                      </span>
                    )}
                    {/* Only where the catalogue actually reports the seller as
                        verified. The home page used to stamp this on every card
                        unconditionally. */}
                    {offer.seller?.verificationStatus === 'VERIFIED' && (
                      <BadgeCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" aria-label="Verified seller" />
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 flex-wrap">
                    {Number(offer.seller?.sellerRating) > 0 ? (
                      <span className="flex items-center gap-0.5">
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                        {Number(offer.seller?.sellerRating).toFixed(1)}
                      </span>
                    ) : (
                      <span>New seller</span>
                    )}
                    <span>·</span>
                    <span>{CONDITION_LABELS[String(offer.condition).toUpperCase()] ?? offer.condition}</span>
                    {offer.isFulfilledByKartseek && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-0.5 text-blue-600 font-semibold">
                          <Truck className="w-3 h-3" /> Fulfilled by KartSeek
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-black text-slate-900 text-sm">{formatCurrencyValue(price)}</div>
                  {offer.isBuyBoxWinner ? (
                    <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wide mt-0.5">
                      In your cart
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
    </div>
  );
}
