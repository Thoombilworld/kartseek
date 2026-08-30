'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, SlidersHorizontal } from 'lucide-react';
import { useRegion } from '@/lib/contexts/region-context';
import { apiFetch } from '@/lib/api-fetch';
import { mapCatalogList } from '@/lib/api/map-catalog-product';
import type { HomeProduct } from '@/lib/marketplace/types';
import { ProductCard, ProductCardSkeleton } from './product-card';

/**
 * One catalogue feed rendered as a sortable product grid.
 *
 * Shared by /best-sellers, /new-arrivals, /trending and /recommended, which were
 * four near-identical files. Consolidating them fixes three things those copies
 * each got wrong:
 *
 * 1. They called `fetch('/api/v1/…')` directly. That reaches the gateway through
 *    the Next rewrite, but carries none of the region headers `apiFetch` adds, so
 *    the gateway fell back to geolocating the *server's* egress IP and the feed
 *    ignored the market the shopper had selected. `apiFetch` sends them.
 *
 * 2. They seeded state with a bundled demo array (`useState(BEST_SELLERS)`) and
 *    only replaced it if the request returned rows. When the backend was
 *    unreachable the page showed demo products as though they were real, and
 *    every card linked to `/marketplace/product/<demo id>`, which 404s. This
 *    renders an explicit empty state instead.
 *
 * 3. Their sort dropdowns listed "Most Popular" and "Newest First" but the
 *    switch had no case for either, so both fell through to `return 0` and did
 *    nothing. Sorting is now applied for every option offered.
 *
 * ── Pagination ──────────────────────────────────────────────────────────────
 * The feed used to render whatever the first response held and stop. Beyond the
 * obvious — a shopper could not reach the rest of the catalogue — it also
 * capped how much of the store a crawler could discover from any entry point,
 * which undercut the sitemap and the ItemList markup on the listing pages.
 *
 * Pages load on scroll rather than behind a "Load more" button, matching the
 * mobile grids. Sorting is client-side over everything loaded so far, which is
 * honest as long as the label says "Recommended" for the server's own order —
 * re-sorting a partial set under "Price: Low to High" would otherwise imply the
 * cheapest item in the catalogue is on screen when it may be three pages down.
 * That is why the sort control resets the feed and refetches from page one.
 */

export type FeedSortKey = 'relevance' | 'price-asc' | 'price-desc' | 'rating' | 'discount';

const SORT_LABELS: Record<FeedSortKey, string> = {
  relevance: 'Recommended',
  'price-asc': 'Price: Low to High',
  'price-desc': 'Price: High to Low',
  rating: 'Highest Rated',
  discount: 'Biggest Discount',
};

const discountOf = (p: HomeProduct) => {
  const mrp = Number(p.mrp) || 0;
  const price = Number(p.price) || 0;
  return mrp > price && mrp > 0 ? (mrp - price) / mrp : 0;
};

export function CatalogFeedPage({
  path,
  title,
  subtitle,
  heroClass,
  icon: Icon,
  countLabel,
  rankBadge,
  emptyMessage = 'No products to show here yet. Please check back soon.',
}: {
  /** Gateway path without the `/api/v1` prefix, e.g. `/marketplace/best-sellers`. */
  path: string;
  title: string;
  subtitle: string;
  heroClass: string;
  icon: React.ElementType;
  countLabel: (n: number) => string;
  /** Renders a "#1 Best Seller"-style ribbon on the first few cards. */
  rankBadge?: (index: number) => string | null;
  emptyMessage?: string;
}) {
  const { formatCurrencyValue, selectedRegion } = useRegion();
  const [products, setProducts] = useState<HomeProduct[]>([]);
  const [sort, setSort] = useState<FeedSortKey>('relevance');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  /** A next-page failure, as distinct from the feed genuinely running out. */
  const [loadError, setLoadError] = useState(false);
  const pageRef = React.useRef(0);

  /** Matches the gateway's default page size. */
  const PAGE_SIZE = 20;

  /**
   * Load one page and append it.
   *
   * `reset` starts over — used on mount, on a region change and whenever the
   * sort changes, because a sort applied to a partial set would misrepresent
   * which product is cheapest or best-rated across the whole feed.
   */
  const loadPage = React.useCallback(async (reset: boolean) => {
    const page = reset ? 1 : pageRef.current + 1;
    if (reset) { setLoading(true); setFailed(false); setExhausted(false); setLoadError(false); }
    else { setLoadingMore(true); setLoadError(false); }

    try {
      const sep = path.includes('?') ? '&' : '?';
      const res = await apiFetch(`${path}${sep}page=${page}&limit=${PAGE_SIZE}`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(String(res.status));
      const rows = mapCatalogList(await res.json());

      pageRef.current = page;
      setProducts((prev) => (reset ? rows : [...prev, ...rows]));
      // A short page means there is no next one. A feed whose endpoint ignores
      // `page` returns the same rows forever, so this is also what stops it
      // looping.
      setExhausted(rows.length < PAGE_SIZE);
      setFailed(false);
    } catch {
      // A failed *next* page must not discard the products already on screen.
      if (reset) { setProducts([]); setFailed(true); }
      // Previously this also set `exhausted`, which was survivable while a
      // scroll observer drove the loading — there was no control to re-arm. With
      // an explicit button it would be a dead end: one flaky request and the
      // button disappears behind "that's everything", claiming the shopper has
      // seen the whole catalogue when they have seen one page of it.
      else setLoadError(true);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [path]);

  // Re-fetches on region change: the backend composes each feed per market, so a
  // shopper switching country must not keep the previous market's products.
  // Sort is in the deps for the reason given in the header note.
  useEffect(() => {
    pageRef.current = 0;
    loadPage(true);
  }, [loadPage, selectedRegion, sort]);


  // The backend already returns each feed in its own meaningful order, so
  // "Recommended" keeps it rather than re-sorting client-side.
  const sorted = React.useMemo(() => {
    const rows = [...products];
    switch (sort) {
      case 'price-asc':  return rows.sort((a, b) => a.price - b.price);
      case 'price-desc': return rows.sort((a, b) => b.price - a.price);
      case 'rating':     return rows.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case 'discount':   return rows.sort((a, b) => discountOf(b) - discountOf(a));
      default:           return rows;
    }
  }, [products, sort]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      <section className={`${heroClass} text-white py-10 px-6`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Icon className="w-8 h-8" />
            <h1 className="text-3xl font-extrabold">{title}</h1>
          </div>
          <p className="text-white/80 text-lg">{subtitle}</p>
          {!loading && products.length > 0 && (
            <div className="flex items-center gap-4 mt-4">
              <span className="bg-white/20 backdrop-blur-sm text-sm font-semibold px-4 py-1.5 rounded-full">
                {/* Only a total once the feed is exhausted — until then this is
                    how many have loaded, not how many exist. */}
                {exhausted ? countLabel(products.length) : `${products.length}+ products`}
              </span>
            </div>
          )}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <nav className="text-sm text-slate-500">
            <Link href="/marketplace" className="hover:text-blue-600">Home</Link>
            <ChevronRight className="w-3 h-3 inline mx-1" />
            <span className="text-slate-800 font-medium">{title}</span>
          </nav>
          {products.length > 1 && (
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-slate-400" />
              <label htmlFor="feed-sort" className="sr-only">Sort products</label>
              <select
                id="feed-sort"
                value={sort}
                onChange={e => setSort(e.target.value as FeedSortKey)}
                className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {(Object.keys(SORT_LABELS) as FeedSortKey[]).map(key => (
                  <option key={key} value={key}>{SORT_LABELS[key]}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl py-16 text-center">
            <Icon className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <h2 className="font-bold text-slate-700 mb-1">
              {failed ? 'We couldn’t load this list' : 'Nothing here yet'}
            </h2>
            <p className="text-sm text-slate-500">
              {failed ? 'Please refresh the page to try again.' : emptyMessage}
            </p>
            <Link href="/marketplace/category-list" className="inline-block mt-4 text-sm font-bold text-blue-600 hover:underline">
              Browse all categories
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {sorted.map((product, i) => {
              // Rank ribbons follow the feed's own order, so they are hidden once
              // the shopper re-sorts — "#1 Best Seller" on whatever happens to be
              // cheapest would be a claim the ranking no longer supports.
              const badge = sort === 'relevance' ? rankBadge?.(i) : null;
              return (
                <div key={product.id} className="relative">
                  {badge && (
                    <div className="absolute -top-2 -left-1 z-20 bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-md">
                      {badge}
                    </div>
                  )}
                  <ProductCard product={product} formatCurrencyValue={formatCurrencyValue} />
                </div>
              );
            })}
          </div>
        )}

        {loadingMore && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-4">
            {Array.from({ length: 5 }).map((_, i) => <ProductCardSkeleton key={`more-${i}`} />)}
          </div>
        )}

        {/* An explicit control rather than loading on scroll.
            Baymard's product-list research (#501) recommends a "Load More"
            button over endless scrolling: it keeps the items already seen
            reachable for comparison, leaves the page footer reachable at all,
            and gives back a scroll position that means something when the
            shopper returns from a product page.

            It also matches `category/[id]`, which already used a button —
            the two main listing surfaces behaved differently for no reason a
            shopper could see. */}
        {!loading && !failed && !exhausted && products.length > 0 && (
          <div className="mt-8 text-center">
            {loadError && (
              <p role="alert" className="text-sm text-red-600 mb-3">
                We couldn&apos;t load more products. The ones above are still here.
              </p>
            )}
            <button
              type="button"
              onClick={() => loadPage(false)}
              disabled={loadingMore}
              className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 disabled:opacity-60 text-slate-700 font-bold px-6 py-3 rounded-xl text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              {loadingMore ? 'Loading…' : loadError ? 'Try again' : 'Show more products'}
            </button>
          </div>
        )}

        {exhausted && products.length > PAGE_SIZE && (
          <p className="text-center text-sm text-slate-400 mt-8">
            {/* The count belongs at the foot of the list as well as the head. */}
            That&apos;s everything — {countLabel(sorted.length)}.
          </p>
        )}
      </div>
    </div>
  );
}
