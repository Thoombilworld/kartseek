/**
 * The cities and services the `/{city}/{service}` local-SEO route serves.
 *
 * Kept here rather than inside the page because `sitemap.ts` has to publish
 * exactly this set. It previously kept its own longer copy — 24 cities the
 * route does not serve, each of which rendered through a `{ country: 'Qatar' }`
 * fallback and presented, say, Houston as a Qatari city. One registry, imported
 * by both, is what stops the two drifting again.
 */

export interface CityInfo {
  country: string;
  /** ISO-3166 alpha-2, matching the region registry in `lib/localization`. */
  code: string;
}

/**
 * Slugs are lowercase and hyphenated, without exception. `Mumbai` and `Delhi`
 * used to sit here in title case beside `mumbai` and `new-delhi`, which made
 * `generateStaticParams` build `/Mumbai/restaurants` as a second URL for a page
 * that already existed at `/mumbai/restaurants`.
 */
export const CITY_COUNTRY: Record<string, CityInfo> = {
  doha: { country: 'Qatar', code: 'QA' },
  'al-wakrah': { country: 'Qatar', code: 'QA' },
  lusail: { country: 'Qatar', code: 'QA' },
  'new-delhi': { country: 'India', code: 'IN' },
  mumbai: { country: 'India', code: 'IN' },
  bangalore: { country: 'India', code: 'IN' },
  dubai: { country: 'UAE', code: 'AE' },
  'abu-dhabi': { country: 'UAE', code: 'AE' },
  riyadh: { country: 'Saudi Arabia', code: 'SA' },
  jeddah: { country: 'Saudi Arabia', code: 'SA' },
  london: { country: 'United Kingdom', code: 'GB' },
  'new-york': { country: 'United States', code: 'US' },
  manama: { country: 'Bahrain', code: 'BH' },
  'kuwait-city': { country: 'Kuwait', code: 'KW' },
  muscat: { country: 'Oman', code: 'OM' },
};

/** Service slugs, and the module each one links through to. */
export const CITY_SERVICES = ['restaurants', 'pharmacies', 'doctors', 'taxi', 'grocery-stores'] as const;

export type CityService = (typeof CITY_SERVICES)[number];
