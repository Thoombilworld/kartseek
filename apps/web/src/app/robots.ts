/// KARTSEEK — Robots.txt Configuration
/// Controls search engine crawling behavior across the platform.

import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo/metadata';

/**
 * Paths behind a sign-in, or that exist only to act on state.
 *
 * Kept as one list because `sitemap.ts` imports it and asserts that nothing it
 * publishes is blocked here. The two files used to disagree: robots disallowed
 * `/admin/`, `/seller/`, `/franchise/`, `/cart/` and `/orders/` while the
 * sitemap listed nine URLs under exactly those prefixes, which Search Console
 * reports as "Submitted URL blocked by robots.txt" against every one of them.
 */
export const DISALLOWED_PREFIXES = [
  '/api/',
  '/admin/',
  '/auth/',
  '/checkout/',
  '/cart/',
  '/orders/',
  '/profile/',
  '/notifications/',
  '/seller/',
  '/franchise/',
  '/hotel-owner/',
  '/rewards/',
  '/_next/',
  '/private/',
];

/**
 * Crawlable but not worth indexing: results pages and filtered listings, whose
 * `?q=` / `?sort=` permutations are unbounded. They carry `noindex, follow` in
 * their own metadata rather than a `Disallow` — a blocked URL cannot be read,
 * so the crawler never sees the `noindex` and the URL can still surface. This
 * list only keeps them out of the sitemap.
 */
const NOINDEX_PREFIXES = ['/search', '/marketplace/search'];

export function isCrawlable(path: string): boolean {
  return !DISALLOWED_PREFIXES.some((p) => path === p.replace(/\/$/, '') || path.startsWith(p))
    && !NOINDEX_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`) || path.startsWith(`${p}?`));
}

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: DISALLOWED_PREFIXES,
      },
      {
        // Google AI (Gemini / AI Overviews) may read public content.
        userAgent: 'Google-Extended',
        allow: '/',
        disallow: DISALLOWED_PREFIXES,
      },
      {
        userAgent: 'GPTBot',
        allow: [
          '/marketplace/',
          '/restaurant/',
          '/doctor/',
          '/pharmacy/',
          '/grocery/',
          '/taxi/',
          '/hotel-booking/',
        ],
        disallow: DISALLOWED_PREFIXES,
      },
      {
        userAgent: 'bingbot',
        allow: '/',
        disallow: DISALLOWED_PREFIXES,
      },
      {
        userAgent: 'PerplexityBot',
        allow: '/',
        disallow: DISALLOWED_PREFIXES,
      },
      {
        userAgent: 'ClaudeBot',
        allow: '/',
        disallow: DISALLOWED_PREFIXES,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    // `host` is a Yandex extension that every other crawler ignores, and it is
    // the wrong tool for canonicalising a multi-subdomain storefront — the
    // per-page hreflang set does that.
  };
}
