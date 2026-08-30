'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Filter, ChevronDown, ChevronUp, ArrowUpDown,
  X, SlidersHorizontal,
} from 'lucide-react';
import { discountPercent } from '@/lib/marketplace/pricing';
import { useRegion } from '@/lib/contexts/region-context';
import { ProductCard } from '../../components/product-card';

import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
import { apiFetch } from '@/lib/api-fetch';
import { mapCatalogList } from '@/lib/api/map-catalog-product';
// ── Types ────────────────────────────────────────────────────────────────────
interface CatProduct {
  id: string;
  title: string;
  brand: string;
  price: number;
  mrp: number;
  rating: number;
  reviews: string;
  createdAt?: string;
  badge?: string;
  imageUrl?: string;
  /** Every catalogue image, primary first — the card swipes through them. */
  images?: string[];
  /** Variant axes from the catalogue, rendered as swatches / size counts. */
  variantAxes?: { variantName: string; variantOptions: string[] }[];
}

interface PriceRange {
  label: string;
  min: number;
  max: number;
}

const PRICE_RANGES: PriceRange[] = [
  { label: 'under-1000', min: 0, max: 1000 },
  { label: '1000-5000', min: 1000, max: 5000 },
  { label: '5000-20000', min: 5000, max: 20000 },
  { label: '20000-50000', min: 20000, max: 50000 },
  { label: 'over-50000', min: 50000, max: Infinity },
];

const RATING_OPTIONS = [
  { label: '4★ & above', min: 4 },
  { label: '3★ & above', min: 3 },
  { label: '2★ & above', min: 2 },
];

const DISCOUNT_OPTIONS = [
  { label: '10% or more', min: 10 },
  { label: '25% or more', min: 25 },
  { label: '50% or more', min: 50 },
];

type SortOption = 'recommended' | 'price-low' | 'price-high' | 'rating' | 'discount' | 'best-selling' | 'newest';

const SORT_LABELS: Record<SortOption, string> = {
  recommended: 'Recommended',
  'price-low': 'Price: Low to High',
  'price-high': 'Price: High to Low',
  rating: 'Highest Rated',
  'best-selling': 'Best Selling',
  newest: 'Newest Arrivals',
  discount: 'Biggest Discount',
};

// ── Component ────────────────────────────────────────────────────────────────
export default function CategoryFilters({
  products: initialProducts,
  categoryName,
  iconName,
  loadMorePath,
  pageSize = 48,
}: {
  products: CatProduct[];
  categoryName: string;
  iconName: string;
  /**
   * Gateway path for the next page, e.g. `/marketplace/products?category=phones`.
   * Omitted when the caller has no more to offer, which keeps the control
   * hidden rather than showing a button that finds nothing.
   */
  loadMorePath?: string;
  /** How many the server rendered, and how many each further page holds. */
  pageSize?: number;
}) {
  const { formatCurrencyValue: formatPrice } = useRegion();

  /**
   * The first page is server-rendered — that is what carries the ItemList and
   * BreadcrumbList JSON-LD, and what a crawler sees — so it is the seed here
   * rather than something this component fetches. Further pages append to it.
   */
  const [products, setProducts] = useState<CatProduct[]>(initialProducts);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exhausted, setExhausted] = useState(initialProducts.length < pageSize);
  const [loadError, setLoadError] = useState(false);

  // A fresh server render (different category, or a filter in the URL) replaces
  // the accumulated list rather than appending to the previous category's.
  useEffect(() => {
    setProducts(initialProducts);
    setPage(1);
    setExhausted(initialProducts.length < pageSize);
    setLoadError(false);
  }, [initialProducts, pageSize]);

  const loadMore = async () => {
    if (!loadMorePath || loadingMore || exhausted) return;
    setLoadingMore(true);
    setLoadError(false);
    try {
      const next = page + 1;
      const sep = loadMorePath.includes('?') ? '&' : '?';
      const res = await apiFetch(`${loadMorePath}${sep}page=${next}&limit=${pageSize}`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(String(res.status));
      const rows = mapCatalogList(await res.json()) as unknown as CatProduct[];
      setProducts((prev) => [...prev, ...rows]);
      setPage(next);
      setExhausted(rows.length < pageSize);
    } catch {
      // Keeps what is on screen and offers a retry — a failed second page must
      // not empty the first.
      setLoadError(true);
    } finally {
      setLoadingMore(false);
    }
  };

  // Build dynamic price range labels using the user's currency
  const priceRangeLabels = useMemo(() => {
    const fmt = formatPrice;
    return PRICE_RANGES.map(r => {
      if (r.max === Infinity) return `Over ${fmt(r.min)}`;
      if (r.min === 0) return `Under ${fmt(r.max)}`;
      return `${fmt(r.min)} – ${fmt(r.max)}`;
    });
  }, [formatPrice]);

  // ── Filter state ──
  const [selectedPrices, setSelectedPrices] = useState<Set<string>>(new Set());
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set());
  const [selectedRatings, setSelectedRatings] = useState<Set<number>>(new Set());
  const [selectedDiscounts, setSelectedDiscounts] = useState<Set<number>>(new Set());
  const [sortBy, setSortBy] = useState<SortOption>('recommended');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // ── Collapsed filter sections ──
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const toggleSection = (section: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section); else next.add(section);
      return next;
    });
  };

  // ── Derived data ──
  const allBrands = useMemo(() => Array.from(new Set(products.map(p => p.brand))).sort(), [products]);

  const activeFilterCount = selectedPrices.size + selectedBrands.size + selectedRatings.size + selectedDiscounts.size;

  // ── Filtered + sorted products ──
  const filtered = useMemo(() => {
    let result = [...products];

    // Price filter
    if (selectedPrices.size > 0) {
      const ranges = PRICE_RANGES.filter(r => selectedPrices.has(r.label));
      result = result.filter(p => ranges.some(r => p.price >= r.min && p.price < r.max));
    }

    // Brand filter
    if (selectedBrands.size > 0) {
      result = result.filter(p => selectedBrands.has(p.brand));
    }

    // Rating filter (take the highest selected minimum)
    if (selectedRatings.size > 0) {
      const minRating = Math.max(...selectedRatings);
      result = result.filter(p => p.rating >= minRating);
    }

    // Discount filter (take the highest selected minimum)
    if (selectedDiscounts.size > 0) {
      const minDiscount = Math.max(...selectedDiscounts);
      result = result.filter(p => discountPercent(p.mrp, p.price) >= minDiscount);
    }

    // Sort
    switch (sortBy) {
      case 'price-low':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'discount':
        result.sort((a, b) => discountPercent(b.mrp, b.price) - discountPercent(a.mrp, a.price));
        break;
      // Review count as the units-sold proxy — the same stand-in the backend's
      // own `popular` sort uses, so the two orderings agree.
      case 'best-selling':
        result.sort((a, b) => (Number(b.reviews) || 0) - (Number(a.reviews) || 0));
        break;
      // Undated products sort last rather than being treated as brand new.
      case 'newest':
        result.sort((a, b) => {
          const at = a.createdAt ? Date.parse(a.createdAt) : 0;
          const bt = b.createdAt ? Date.parse(b.createdAt) : 0;
          return bt - at;
        });
        break;
      default: // 'recommended' — keep original order
        break;
    }

    return result;
  }, [products, selectedPrices, selectedBrands, selectedRatings, selectedDiscounts, sortBy]);

  // ── Helpers ──
  const toggleSet = <T,>(setter: React.Dispatch<React.SetStateAction<Set<T>>>, value: T) => {
    setter(prev => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value); else next.add(value);
      return next;
    });
  };

  const clearAllFilters = () => {
    setSelectedPrices(new Set());
    setSelectedBrands(new Set());
    setSelectedRatings(new Set());
    setSelectedDiscounts(new Set());
  };

  // ── Filter sidebar content (shared between desktop and mobile) ──
  const filterContent = (
    <div className="space-y-5">
      {/* Price Range */}
      <div>
        <button onClick={() => toggleSection('price')} className="w-full font-semibold text-sm text-slate-800 mb-2.5 flex items-center justify-between">
          Price Range {collapsedSections.has('price') ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
        </button>
        {!collapsedSections.has('price') && (
          <div className="space-y-2">
            {PRICE_RANGES.map((p, idx) => (
              <label key={p.label} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:text-blue-600">
                <input
                  type="checkbox"
                  checked={selectedPrices.has(p.label)}
                  onChange={() => toggleSet(setSelectedPrices, p.label)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                />
                {priceRangeLabels[idx]}
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Brand */}
      <div>
        <button onClick={() => toggleSection('brand')} className="w-full font-semibold text-sm text-slate-800 mb-2.5 flex items-center justify-between">
          Brand {collapsedSections.has('brand') ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
        </button>
        {!collapsedSections.has('brand') && (
          <div className="space-y-2">
            {allBrands.map(b => (
              <label key={b} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:text-blue-600">
                <input
                  type="checkbox"
                  checked={selectedBrands.has(b)}
                  onChange={() => toggleSet(setSelectedBrands, b)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                />
                {b}
                <span className="ml-auto text-[10px] text-slate-400">
                  ({products.filter(p => p.brand === b).length})
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Rating */}
      <div>
        <button onClick={() => toggleSection('rating')} className="w-full font-semibold text-sm text-slate-800 mb-2.5 flex items-center justify-between">
          Customer Rating {collapsedSections.has('rating') ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
        </button>
        {!collapsedSections.has('rating') && (
          <div className="space-y-2">
            {RATING_OPTIONS.map(r => (
              <label key={r.label} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:text-blue-600">
                <input
                  type="checkbox"
                  checked={selectedRatings.has(r.min)}
                  onChange={() => toggleSet(setSelectedRatings, r.min)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                />
                {r.label}
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Discount */}
      <div>
        <button onClick={() => toggleSection('discount')} className="w-full font-semibold text-sm text-slate-800 mb-2.5 flex items-center justify-between">
          Discount {collapsedSections.has('discount') ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
        </button>
        {!collapsedSections.has('discount') && (
          <div className="space-y-2">
            {DISCOUNT_OPTIONS.map(d => (
              <label key={d.label} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:text-blue-600">
                <input
                  type="checkbox"
                  checked={selectedDiscounts.has(d.min)}
                  onChange={() => toggleSet(setSelectedDiscounts, d.min)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                />
                {d.label}
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-3 xs:px-4 pt-4 md:pt-6 pb-4 flex flex-col md:flex-row gap-6">
      {/* ── Mobile Filter Toggle ── */}
      <button
        onClick={() => setMobileFiltersOpen(true)}
        className="md:hidden flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm"
      >
        <SlidersHorizontal className="w-4 h-4" />
        Filters {activeFilterCount > 0 && <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{activeFilterCount}</span>}
      </button>

      {/* ── Mobile Filter Drawer ── */}
      {mobileFiltersOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[200] md:hidden" onClick={() => setMobileFiltersOpen(false)} ><DismissOnEscape onDismiss={() => setMobileFiltersOpen(false)} /></div>
          <div className="fixed inset-y-0 left-0 w-[85%] max-w-sm bg-white z-[201] md:hidden shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-slate-700" />
                <h2 className="font-bold text-base text-slate-900">Filters</h2>
              </div>
              <div className="flex items-center gap-3">
                {activeFilterCount > 0 && (
                  <button onClick={clearAllFilters} className="text-xs text-red-600 font-semibold">Clear All</button>
                )}
                <button title="Close filters" onClick={() => setMobileFiltersOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
            </div>
            <div className="p-4">{filterContent}</div>
            <div className="sticky bottom-0 p-4 bg-white border-t border-slate-100">
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl text-sm hover:bg-blue-700 transition-colors"
              >
                Show {filtered.length} Products
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Desktop Filters Sidebar ── */}
      <aside className="w-full md:w-60 flex-shrink-0 hidden md:block">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sticky top-[calc(var(--mp-header-h)+1rem)]">
          <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-100">
            <Filter className="w-5 h-5 text-slate-700" />
            <h2 className="font-bold text-base text-slate-900">Filters</h2>
            {activeFilterCount > 0 && (
              <button onClick={clearAllFilters} className="ml-auto text-xs text-red-600 font-semibold hover:underline">
                Clear All
              </button>
            )}
          </div>
          {filterContent}
        </div>
      </aside>

      {/* ── Product Grid ── */}
      <main id="main-content" className="flex-1">
        {/* Active Filters Chips */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs text-slate-500 font-semibold">Active:</span>
            {Array.from(selectedPrices).map(p => (
              <button key={p} onClick={() => toggleSet(setSelectedPrices, p)}
                className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium border border-blue-100 hover:bg-blue-100 transition-colors">
                {p} <X className="w-3 h-3" />
              </button>
            ))}
            {Array.from(selectedBrands).map(b => (
              <button key={b} onClick={() => toggleSet(setSelectedBrands, b)}
                className="inline-flex items-center gap-1 text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full font-medium border border-purple-100 hover:bg-purple-100 transition-colors">
                {b} <X className="w-3 h-3" />
              </button>
            ))}
            {Array.from(selectedRatings).map(r => (
              <button key={r} onClick={() => toggleSet(setSelectedRatings, r)}
                className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full font-medium border border-amber-100 hover:bg-amber-100 transition-colors">
                {r}★+ <X className="w-3 h-3" />
              </button>
            ))}
            {Array.from(selectedDiscounts).map(d => (
              <button key={d} onClick={() => toggleSet(setSelectedDiscounts, d)}
                className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-full font-medium border border-green-100 hover:bg-green-100 transition-colors">
                {d}%+ off <X className="w-3 h-3" />
              </button>
            ))}
            <button onClick={clearAllFilters} className="text-xs text-red-600 font-semibold hover:underline ml-1">
              Clear All
            </button>
          </div>
        )}

        {/* Sort Bar */}
        <div className="flex items-center justify-between mb-5 bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
          <p className="text-sm text-slate-600">
            Showing <span className="font-bold text-slate-900">{filtered.length}</span>
            {filtered.length !== products.length && <span className="text-slate-400"> of {products.length}</span>}
            {' '}results for &quot;{categoryName}&quot;
          </p>
          <div className="relative">
            <button
              onClick={() => setShowSortDropdown(v => !v)}
              className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-all"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              Sort: {SORT_LABELS[sortBy]} <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>
            {showSortDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowSortDropdown(false)} ><DismissOnEscape onDismiss={() => setShowSortDropdown(false)} /></div>
                <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl shadow-lg border border-slate-100 z-50 py-1.5">
                  {(Object.keys(SORT_LABELS) as SortOption[]).map(key => (
                    <button
                      key={key}
                      onClick={() => { setSortBy(key); setShowSortDropdown(false); }}
                      className={`w-full text-left px-3.5 py-2.5 text-sm font-medium transition-colors ${sortBy === key ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'}`}
                    >
                      {SORT_LABELS[key]}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Product Grid */}
        {filtered.length === 0 ? (
          /* Two different situations wore the same message. "No products found —
             try adjusting your filters" is useful when filters actually excluded
             everything, and actively misleading when the category arrived empty
             and no filter is set: it blames the customer for a result they had
             no part in, and hides a catalogue problem behind advice. Branch on
             whether any filter is active. */
          <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Filter className="w-8 h-8 text-slate-300" />
            </div>
            {activeFilterCount > 0 ? (
              <>
                <h3 className="text-lg font-bold text-slate-900 mb-2">No products match your filters</h3>
                <p className="text-sm text-slate-500 mb-4">
                  {products.length} {products.length === 1 ? 'product' : 'products'} in this category, none matching the current selection.
                </p>
                <button onClick={clearAllFilters} className="btn btn-primary text-sm">
                  Clear All Filters
                </button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Nothing here yet</h3>
                <p className="text-sm text-slate-500">
                  This category has no products listed at the moment. Please check back soon.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {filtered.map((product, i) => (
              <ProductCard
                key={product.id}
                product={{ ...product, icon: iconName }}
                formatCurrencyValue={formatPrice}
                // The first row is the page's largest contentful paint.
                priority={i < 4}
              />
            ))}
          </div>
        )}

        {/* A button rather than scroll-triggered loading, unlike the mobile
            grids and the /best-sellers feed. This page has filters and a sort
            above it: loading silently on scroll while a shopper is narrowing
            results moves the ground under them, and the count beside the
            filters would keep changing on its own. */}
        {loadMorePath && !exhausted && filtered.length > 0 && (
          <div className="mt-8 text-center">
            {loadError && (
              <p role="alert" className="text-sm text-red-600 mb-3">
                We couldn&apos;t load more products. The ones above are still here.
              </p>
            )}
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 disabled:opacity-60 text-slate-700 font-bold px-6 py-3 rounded-xl text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              {loadingMore ? 'Loading…' : loadError ? 'Try again' : 'Show more products'}
            </button>
          </div>
        )}

        {exhausted && products.length > pageSize && (
          <p className="mt-8 text-center text-sm text-slate-400">
            {/* Repeats the count below the grid (Baymard #531) — the figure at
                the top is off-screen by the time a shopper reaches the end. */}
            Showing all {filtered.length}
            {filtered.length !== products.length ? ` of ${products.length}` : ''}
            {' '}product{filtered.length === 1 ? '' : 's'} in {categoryName}.
          </p>
        )}
      </main>
    </div>
  );
}
