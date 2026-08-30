/// KARTSEEK — XML Sitemap
///
/// Publishes the storefront's indexable URLs. Two rules govern what may go in:
///
///  1. Nothing `robots.ts` disallows. The previous version listed `/admin`,
///     `/seller/marketplace`, `/seller/restaurant`, `/seller/grocery`,
///     `/seller/pharmacy`, `/franchise`, `/franchise/opportunity`, `/cart` and
///     `/orders` — nine URLs the same repo's robots.txt blocks. Search Console
///     reports each as "Submitted URL blocked by robots.txt".
///  2. Nothing that 404s. Categories were published as `/marketplace/{slug}`;
///     the route is `/marketplace/category/{slug}`, so all twenty were dead
///     links, and the city list carried 24 cities the `/[city]/[service]` route
///     does not serve.
///
/// Both classes of error are the same underlying problem — this file kept its
/// own copies of lists that live elsewhere — so it now derives from the
/// registries themselves and asserts the result against robots.txt.

import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo/metadata';
import { isCrawlable } from './robots';
import { CITY_COUNTRY, CITY_SERVICES } from '@/lib/seo/city-registry';
import { getCategories, getProducts } from '@/lib/api/marketplace';
import { productPath } from '@/lib/marketplace/product-url';

// ─── Static Pages ───────────────────────────────────────────────────────────

/** Public entry points. Anything requiring a sign-in is deliberately absent. */
const STATIC_ROUTES = [
  '/',
  '/marketplace', '/grocery', '/restaurant', '/pharmacy', '/doctor', '/taxi', '/hotel-booking',
  // Grocery's public hubs. Each declares its own canonical and metadata; they
  // were reachable only by crawling the module homepage before. The signed-in
  // routes beneath /grocery (cart, checkout, orders, addresses) carry `noindex`
  // in their own layouts and are deliberately absent here.
  '/grocery/stores', '/grocery/deals', '/grocery/brand',
  // `/marketplace/brands` is deliberately absent: there is no `brands/page.tsx`,
  // only `brands/feed` and `brands/following`. Publishing the bare path was the
  // rule-2 violation this file's header warns about — a submitted URL that 404s.
  // `brands/following` is sign-in gated and `brands/feed` is a personalised
  // stream, so neither replaces it; a public brand directory has to exist first.
  '/marketplace/category-list', '/marketplace/deals',
  '/marketplace/flash-deals', '/marketplace/offers', '/marketplace/best-sellers',
  '/marketplace/new-arrivals', '/marketplace/trending',
  // Public, unguarded endpoints behind each of these, and each now declares its
  // own canonical. They were previously unlisted *and* inherited a canonical of
  // `/marketplace`, so they were unreachable from the sitemap and disclaimed
  // themselves in the head — indexable by neither route.
  //
  // Not added, deliberately: `/marketplace/compare` (list lives in
  // localStorage, empty for a crawler), `/marketplace/reviews` (the customer's
  // own reviews), `/marketplace/recommended` and `/marketplace/brands/feed`
  // (both personalised, the latter JWT-guarded). All four are `noIndex`.
  '/marketplace/sellers', '/marketplace/coupons', '/marketplace/gift-cards',
  '/marketplace/help', '/marketplace/exchange',
  '/about', '/careers', '/contact', '/press', '/investors', '/support',
  '/privacy', '/terms', '/cookies', '/security', '/grievance',
];

// ─── Marketplace Categories ─────────────────────────────────────────────────

/**
 * Fallback slugs, used only when the catalogue cannot be reached at build time.
 * A sitemap that silently shrinks to the static pages on a flaky build is worse
 * than one that ships a known-good baseline.
 */
const FALLBACK_CATEGORY_SLUGS = [
  'electronics', 'mobiles', 'laptops', 'fashion', 'home-kitchen',
  'beauty', 'sports', 'books', 'toys', 'automotive',
];

/** Live category slugs, or the baseline above if the catalogue is unavailable. */
async function categorySlugs(): Promise<string[]> {
  try {
    const res: any = await getCategories();
    // The gateway wraps list responses twice — rows sit at `data.data`.
    const rows: any[] = res?.data?.data ?? res?.data ?? res ?? [];
    const slugs = rows
      .map((row) => (typeof row === 'string' ? row : row?.slug))
      .filter((slug): slug is string => typeof slug === 'string' && slug.length > 0);
    return slugs.length > 0 ? [...new Set(slugs)] : FALLBACK_CATEGORY_SLUGS;
  } catch {
    return FALLBACK_CATEGORY_SLUGS;
  }
}

/**
 * Every indexable product, in canonical URL form.
 *
 * The catalogue was absent from the sitemap entirely — a storefront's product
 * pages are its most valuable indexable surface, and none of them were being
 * submitted. That mattered less while the URLs were bare uuids with nothing for
 * a query to match; now that each carries the product name, they are worth
 * publishing.
 *
 * Returns an empty list rather than a fallback if the catalogue is unreachable.
 * A guessed product URL is a submitted 404, which is the one thing a sitemap
 * must never contain (see this file's header).
 */
async function productEntries(): Promise<{ path: string; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }[]> {
  // The gateway caps `limit` at MAX_PAGE_SIZE (100) and silently clamps rather
  // than erroring, so asking for 1000 returned the first hundred products and
  // looked like a complete catalogue. Paging is the only way to get the rest.
  const PER_PAGE = 100;
  // A sitemap holds 50,000 URLs and this is a single file; 50 pages is the
  // ceiling before it needs a sitemap index, which is a separate change.
  const MAX_PAGES = 50;

  const rows: any[] = [];
  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const res: any = await getProducts({ page: String(page), limit: String(PER_PAGE) });
      const batch: any[] = res?.data?.data ?? res?.data ?? [];
      rows.push(...batch);
      // A short page is the last page.
      if (batch.length < PER_PAGE) break;
    }
  } catch {
    // Whatever was collected before the failure is still valid; a partial
    // sitemap beats none, and a guessed URL would be a submitted 404.
    if (rows.length === 0) return [];
  }

  return rows
    // A product with no id cannot be linked, and an inactive one should not be
    // advertised to a crawler.
    .filter((p) => p?.id && p?.is_active !== false)
    .map((p) => ({
      path: productPath({ id: p.id, slug: p.slug, name: p.name ?? p.title }),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    }));
}

// ─── Sitemap Generator ─────────────────────────────────────────────────────

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const paths: { path: string; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }[] = [];

  for (const route of STATIC_ROUTES) {
    paths.push({
      path: route,
      changeFrequency: route === '/' ? 'daily' : 'weekly',
      priority: route === '/' ? 1.0 : 0.7,
    });
  }

  for (const slug of await categorySlugs()) {
    paths.push({ path: `/marketplace/category/${slug}`, changeFrequency: 'daily', priority: 0.8 });
  }

  // Highest priority of anything here: these are the pages a shopper searches
  // for by name, and the only ones that can rank for a product query.
  paths.push(...await productEntries());

  // One page per city × service, straight from the registries the route itself
  // reads, so a city added there appears here and nowhere else can disagree.
  for (const city of Object.keys(CITY_COUNTRY)) {
    for (const service of CITY_SERVICES) {
      paths.push({ path: `/${city}/${service}`, changeFrequency: 'weekly', priority: 0.6 });
    }
  }

  // No `lastModified`. It used to be stamped with the current time on every
  // entry, recomputed each time the sitemap was fetched — an assertion that the
  // whole site changed a moment ago. A crawler that believes it wastes budget
  // re-fetching unchanged pages; one that catches it stops trusting the field.
  // Omitting it says nothing, which is accurate.
  //
  // The guarantee below is enforced rather than documented: a URL this file
  // publishes is a URL robots.txt permits.
  return paths
    .filter(({ path }) => isCrawlable(path))
    .map(({ path, changeFrequency, priority }) => ({
      url: `${SITE_URL}${path}`,
      changeFrequency,
      priority,
    }));
}
