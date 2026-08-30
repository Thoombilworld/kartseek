/**
 * Where a grocery brand's logo comes from.
 *
 * Resolution order, first hit wins:
 *
 *   1. `logoUrl` on the brand record — an absolute URL, so a licensed asset can
 *      live on the CDN without being committed here.
 *   2. `/grocery/brands/<slug>.svg` — a file in `public/`. Dropping a licensed
 *      logo at that path replaces the generated mark with no code change.
 *   3. The generated round mark, which is what ships today.
 *
 * On using official logos: brand marks are trademarks, and the right to display
 * one usually comes from the supply agreement with that brand rather than from
 * the file being publicly downloadable. The resolver deliberately makes swapping
 * them a file-drop rather than a code change, so whoever holds those agreements
 * can apply them without touching this module.
 */

/** Filenames present in `public/grocery/brands/`, without the extension. */
const GENERATED_MARKS = new Set([
  'nestle', 'almarai', 'nadec', 'al-rawabi', 'al-meera', 'lulu', 'carrefour',
  'amul', 'britannia', 'tata', 'parle', 'haldirams', 'fortune', 'aashirvaad', 'mother-dairy',
  'al-ain', 'emirates', 'masafi', 'al-islami', 'sadia', 'americana', 'baladna', 'ghadeer',
  'brookside', 'cadbury', 'fage', 'lay-s', 'nescafe', 'tropicana', 'surf-excel',
  'farm-direct', 'farm-fresh', 'ocean-catch', 'organic-farm', 'store-brand',
]);

export function brandSlug(name: string): string {
  return name
    // Fold diacritics first. "Nestlé" otherwise slugified to `nestl-` — the é is
    // not in [a-z0-9] so it became a separator — and every accented brand
    // silently resolved to the neutral fallback mark.
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export interface BrandLogoInput {
  name: string;
  /** Absolute URL to a licensed logo, when one has been supplied. */
  logoUrl?: string;
}

export function brandLogoUrl(brand: BrandLogoInput | string): string {
  if (typeof brand !== 'string' && brand.logoUrl && /^https?:\/\//.test(brand.logoUrl)) {
    return brand.logoUrl;
  }
  const name = typeof brand === 'string' ? brand : brand.name;
  const slug = brandSlug(name);
  // A brand with no asset gets the neutral mark rather than a 404 — a broken
  // image in a brand row is worse than a plain one.
  return `/grocery/brands/${GENERATED_MARKS.has(slug) ? slug : 'store-brand'}.svg`;
}

/** True when the resolved logo is a real asset rather than the neutral fallback. */
export function hasBrandLogo(brand: BrandLogoInput | string): boolean {
  const name = typeof brand === 'string' ? brand : brand.name;
  return GENERATED_MARKS.has(brandSlug(name));
}
