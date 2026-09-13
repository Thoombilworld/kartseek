'use client';

import React, { useEffect, useState } from 'react';
import { CreditCard, Repeat, ChevronDown } from 'lucide-react';
import { getProductOffers, type ProductOffersResponse } from '@/lib/api/marketplace';
import { useRegion } from '@/lib/contexts/region-context';

/**
 * Bank and exchange offers that apply to this product in this market.
 *
 * Fetched from the browser with the market header rather than server-side
 * without one: the offers are per market (an Indian card offer must not show
 * on the Qatar page), and the old server fetch carried no region at all and
 * listed every active offer in the table under every product.
 *
 * Renders nothing while loading and nothing when there are none — an "Offers"
 * heading over an empty list would promise a discount that does not exist.
 */
export function ProductOffers({ productId, market }: { productId: string; market: string }) {
  const { formatCurrencyValue } = useRegion();
  const [offers, setOffers] = useState<ProductOffersResponse | null>(null);

  useEffect(() => {
    if (!productId) return;
    let cancelled = false;
    getProductOffers(productId, market)
      .then((res) => {
        if (cancelled) return;
        const body: any = res ?? {};
        setOffers({
          bankOffers: Array.isArray(body.bankOffers) ? body.bankOffers : [],
          exchangeOffers: Array.isArray(body.exchangeOffers) ? body.exchangeOffers : [],
        });
      })
      .catch(() => {
        // No offers is the honest render for an unreachable offers service.
        if (!cancelled) setOffers(null);
      });
    return () => {
      cancelled = true;
    };
  }, [productId, market]);

  if (!offers) return null;
  const bank = offers.bankOffers.filter((o) => o?.title);
  const exchange = offers.exchangeOffers.filter((o) => o?.title);
  if (bank.length === 0 && exchange.length === 0) return null;

  const describe = (o: ProductOffersResponse['bankOffers'][number]): string => {
    const value = Number(o.discountValue);
    const min = Number(o.minOrderValue);
    const parts: string[] = [];
    if (value > 0) {
      parts.push(
        String(o.discountType).toUpperCase() === 'FLAT'
          ? `${formatCurrencyValue(value)} off`
          : `${value}% off${Number(o.maxDiscount) > 0 ? ` up to ${formatCurrencyValue(Number(o.maxDiscount))}` : ''}`,
      );
    }
    if (min > 0) parts.push(`on orders over ${formatCurrencyValue(min)}`);
    if (o.bankName)
      parts.push(
        `with ${o.bankName}${o.cardType && o.cardType !== 'ALL' ? ` ${String(o.cardType).toLowerCase()} cards` : ''}`,
      );
    return parts.join(' ');
  };

  return (
    <section aria-label="Offers" className="mt-5 space-y-3" data-testid="product-offers">
      {bank.length > 0 && (
        <div>
          <h2 className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-1.5">
            <CreditCard className="w-4 h-4 text-green-600" aria-hidden="true" /> Bank offers
          </h2>
          <ul className="space-y-1.5">
            {bank.map((o) => (
              <li key={o.id} className="text-xs text-slate-700 flex items-start gap-2">
                <span className="text-green-500 mt-0.5" aria-hidden="true">
                  •
                </span>
                <div>
                  <span className="font-semibold">{o.title}</span>
                  {describe(o) && <span className="text-slate-500"> — {describe(o)}</span>}
                  {o.termsAndConditions && (
                    <details className="mt-0.5">
                      <summary className="text-blue-600 font-bold cursor-pointer inline-flex items-center gap-0.5 select-none">
                        T&amp;C <ChevronDown className="w-3 h-3" aria-hidden="true" />
                      </summary>
                      <p className="text-slate-500 mt-1 whitespace-pre-line">
                        {o.termsAndConditions}
                      </p>
                    </details>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {exchange.length > 0 && (
        <div>
          <h2 className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-1.5">
            <Repeat className="w-4 h-4 text-violet-600" aria-hidden="true" /> Exchange offer
          </h2>
          <ul className="space-y-1.5">
            {exchange.map((o) => (
              <li key={o.id} className="text-xs text-slate-700 flex items-start gap-2">
                <span className="text-violet-500 mt-0.5" aria-hidden="true">
                  •
                </span>
                <div>
                  <span className="font-semibold">{o.title}</span>
                  {Number(o.maxExchangeValue) > 0 && (
                    <span className="text-slate-500">
                      {' '}
                      — up to {formatCurrencyValue(Number(o.maxExchangeValue))} off with exchange
                    </span>
                  )}
                  {o.description && <p className="text-slate-500 mt-0.5">{o.description}</p>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
