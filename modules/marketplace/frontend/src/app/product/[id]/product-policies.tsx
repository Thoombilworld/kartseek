import React from 'react';
import { Truck, ShieldCheck, Package, Receipt } from 'lucide-react';
import { formatMoney, getCountry } from '@/lib/localization';
import { getMarketplaceDeliveryRule } from '@/lib/marketplace/delivery';
import type { ProductDetail } from '@/lib/marketplace/product-detail';

/**
 * Delivery, tax, warranty and box contents — each line backed by data.
 *
 * What is NOT here, and why: the page used to print "1 Year Brand Warranty"
 * and "7 Days Replacement Policy" under every product in the catalogue. No
 * column, attribute or market rule held either figure; they were copy. A
 * warranty now appears only when the product carries a `warranty` attribute,
 * and there is no return-policy field anywhere in the data, so nothing is
 * claimed about returns rather than a promise checkout would not honour.
 *
 * The delivery rule and the tax treatment are per market and come from the
 * localization registry — the same table the cart charges from.
 */
export function ProductPolicies({ product }: { product: ProductDetail }) {
  const market = product.market;
  const country = getCountry(market);
  const delivery = getMarketplaceDeliveryRule(market);
  const tax = country.tax;
  const offered = product.availability.status !== 'unavailable';

  const rows: Array<{ icon: React.ElementType; title: string; body: string; key: string }> = [];

  if (offered) {
    rows.push({
      key: 'delivery',
      icon: Truck,
      title:
        delivery.freeAbove > 0
          ? `Free delivery on orders over ${formatMoney(delivery.freeAbove, { country: market })}`
          : 'Free delivery',
      body:
        delivery.fee > 0
          ? `${formatMoney(delivery.fee, { country: market })} delivery below that, to your door across ${country.name}.`
          : `Delivered to your door across ${country.name}.`,
    });
  }

  if (tax && tax.rate > 0) {
    rows.push({
      key: 'tax',
      icon: Receipt,
      title: tax.inclusive ? `Price includes ${tax.name}` : `${tax.name} added at checkout`,
      body: tax.inclusive
        ? `${tax.rate}% ${tax.name} is included in the price shown.`
        : `${tax.rate}% ${tax.name} is applied to the order total at checkout.`,
    });
  }

  if (product.warranty) {
    rows.push({
      key: 'warranty',
      icon: ShieldCheck,
      title: 'Warranty',
      body: product.warranty,
    });
  }

  if (product.whatsIncluded.length > 0) {
    rows.push({
      key: 'included',
      icon: Package,
      title: "What's in the box",
      body: product.whatsIncluded.join(' · '),
    });
  }

  if (rows.length === 0) return null;

  return (
    <div
      className="bg-slate-50 rounded-sm p-4 mt-6 space-y-3 border border-slate-200"
      data-testid="product-policies"
    >
      {rows.map(({ icon: Icon, title, body, key }) => (
        <div key={key} className="flex items-start gap-3">
          <Icon className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">{title}</h3>
            <p className="text-slate-500 text-xs">{body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
