import type { HomeBrand } from './types';

/**
 * Price and discount formatting for the marketplace UI.
 *
 * Extracted from `lib/demo-data/marketplace-home.ts`, where these sat among the
 * bundled fixtures. `discountPercent` has six consumers and `formatPrice` four,
 * every one of them production — the homepage, the admin product tables, the
 * account order pages. Nothing about them is demo data.
 */

/**
 * Percentage off, rounded, or 0 when there is no saving to claim.
 *
 * Returns 0 rather than a negative number when `mrp <= price`: a listing priced
 * at or above its list price is not a discount, and a "-8% off" badge is worse
 * than no badge.
 */
export function discountPercent(mrp: number, price: number): number {
  if (mrp <= price) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
}

/**
 * @deprecated Renders Indian rupees regardless of the active market. Use
 * `formatCurrencyValue` from `useRegion()`, or `formatMoney` from
 * `@/lib/localization` outside a React tree — both follow the detected region.
 */
export function formatPrice(amount: number): string {
  return '₹' + amount.toLocaleString('en-IN');
}

/**
 * The discount label on a brand promo card, in the market's own currency.
 *
 * Falls back to the brand's pre-formatted `discount` string when there is no
 * structured amount to format, so a brand configured the old way still renders.
 */
export function buildBrandDiscount(
  brand: HomeBrand,
  formatCurrency: (amount: number) => string,
): string {
  if (!brand.discountAmount || !brand.discountType) return brand.discount;
  const amt = formatCurrency(brand.discountAmount);
  switch (brand.discountType) {
    case 'starting': return `Starting ${amt}`;
    case 'upto': return `Up to ${amt} Off`;
    case 'flat': return `Flat ${amt} Off`;
    case 'emi': return `EMI from ${amt}`;
    default: return brand.discount;
  }
}

/**
 * Narrow a list of region-targeted items to one market.
 *
 * An item with no `regions` runs everywhere — that is the shape everything had
 * before regional targeting existed, so untargeted content keeps working.
 */
export function forRegion<T extends { regions?: string[] }>(
  items: T[],
  region: string | undefined,
): T[] {
  if (!region) return items;
  const code = region.toUpperCase();
  return items.filter((item) => {
    const regions = item.regions;
    if (!Array.isArray(regions) || regions.length === 0) return true;
    return regions.map((r) => r.toUpperCase()).includes(code);
  });
}
