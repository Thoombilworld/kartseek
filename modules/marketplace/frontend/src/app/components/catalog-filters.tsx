'use client';

import React, { useMemo, useState } from 'react';
import {
  ArrowUpDown,
  Check,
  ChevronDown,
  ChevronUp,
  Filter,
  PackageOpen,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { discountPercent } from '@/lib/marketplace/pricing';
import { useRegion } from '@/lib/contexts/region-context';
import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
import { apiFetch } from '@/lib/api-fetch';
import { mapCatalogList } from '@/lib/api/map-catalog-product';
import { ProductCard } from './product-card';
import type { CatalogCardRow } from './catalog-row';

/**
 * The interactive half of a listing: filters, sort, the grid, "show more".
 *
 * One component for both the category and the subcategory route. Each had its
 * own — 550 and 170 lines that offered different filters, different sort
 * options and different empty states for the same kind of page.
 *
 * ── Ownership of the data ─────────────────────────────────────────────────
 * The first page is the server's: it is what the crawler sees and what the
 * ItemList JSON-LD describes, so it arrives as `products` and is the initial
 * state here, never re-fetched. The page keys this component on the listing's
 * identity (category, subcategory filter, market), so a different listing is
 * a fresh mount: no effect copies new props over old state, and no filter or
 * sort selection survives into a listing it was not made for. Further pages
 * are appended to the same market's listing, never replaced.
 */

interface PriceRange {
  id: string;
  min: number;
  max: number;
}

// Bounds only — labels are formatted in the shopper's currency at render time.
const PRICE_RANGES: PriceRange[] = [
  { id: 'under-1000', min: 0, max: 1000 },
  { id: '1000-5000', min: 1000, max: 5000 },
  { id: '5000-20000', min: 5000, max: 20000 },
  { id: '20000-50000', min: 20000, max: 50000 },
  { id: 'over-50000', min: 50000, max: Infinity },
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

type SortOption =
  | 'recommended'
  | 'price-low'
  | 'price-high'
  | 'rating'
  | 'discount'
  | 'best-selling'
  | 'newest';

const SORT_LABELS: Record<SortOption, string> = {
  recommended: 'Recommended',
  'price-low': 'Price: low to high',
  'price-high': 'Price: high to low',
  rating: 'Highest rated',
  'best-selling': 'Best selling',
  newest: 'Newest arrivals',
  discount: 'Biggest discount',
};

/**
 * One collapsible group in the filter panel. A real component, declared at
 * module scope: declared inside `CatalogFilters` it was a new component type
 * on every render, so React remounted its subtree and a checkbox lost focus
 * the moment it was ticked.
 */
function FilterSection({
  title,
  collapsed,
  onToggle,
  children,
}: {
  title: string;
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        className="w-full font-semibold text-sm text-slate-800 mb-2.5 flex items-center justify-between min-h-[36px]"
      >
        {title}
        {collapsed ? (
          <ChevronDown className="w-4 h-4 text-slate-400" aria-hidden="true" />
        ) : (
          <ChevronUp className="w-4 h-4 text-slate-400" aria-hidden="true" />
        )}
      </button>
      {!collapsed && <div className="space-y-2">{children}</div>}
    </div>
  );
}

export interface CatalogFiltersProps {
  products: CatalogCardRow[];
  /** What the count line and the empty state call this listing. */
  listingName: string;
  /** Lucide icon name — the card's image fallback. */
  iconName?: string;
  /**
   * Gateway path for the next page, e.g. `/products?category=phones&country=QA`.
   * Must carry the same filters AND the same market as the server query, so
   * page 2 continues the same listing. Omitted when there is nothing more.
   */
  loadMorePath?: string;
  /** How many the server rendered, and how many each further page holds. */
  pageSize?: number;
}

export function CatalogFilters({
  products: initialProducts,
  listingName,
  iconName,
  loadMorePath,
  pageSize = 48,
}: CatalogFiltersProps) {
  const { formatCurrencyValue: formatPrice } = useRegion();

  const [products, setProducts] = useState<CatalogCardRow[]>(initialProducts);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exhausted, setExhausted] = useState(initialProducts.length < pageSize);
  const [loadError, setLoadError] = useState(false);

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
      const rows = mapCatalogList(await res.json()) as unknown as CatalogCardRow[];
      // Append only rows this listing does not already hold: a page boundary
      // that moves under a concurrent write must not duplicate a card.
      setProducts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...rows.filter((r) => r.id && !seen.has(r.id))];
      });
      setPage(next);
      setExhausted(rows.length < pageSize);
    } catch {
      // Keep what is on screen and offer a retry — a failed second page must
      // not empty the first.
      setLoadError(true);
    } finally {
      setLoadingMore(false);
    }
  };

  const priceRangeLabels = useMemo(
    () =>
      PRICE_RANGES.map((r) => {
        if (r.max === Infinity) return `Over ${formatPrice(r.min)}`;
        if (r.min === 0) return `Under ${formatPrice(r.max)}`;
        return `${formatPrice(r.min)} – ${formatPrice(r.max)}`;
      }),
    [formatPrice],
  );

  // ── Filter state ──
  const [selectedPrices, setSelectedPrices] = useState<Set<string>>(new Set());
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set());
  const [selectedRatings, setSelectedRatings] = useState<Set<number>>(new Set());
  const [selectedDiscounts, setSelectedDiscounts] = useState<Set<number>>(new Set());
  const [sortBy, setSortBy] = useState<SortOption>('recommended');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const toggleSection = (section: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const allBrands = useMemo(
    () => Array.from(new Set(products.map((p) => p.brand).filter(Boolean))).sort(),
    [products],
  );
  const brandCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) counts.set(p.brand, (counts.get(p.brand) ?? 0) + 1);
    return counts;
  }, [products]);

  const activeFilterCount =
    selectedPrices.size + selectedBrands.size + selectedRatings.size + selectedDiscounts.size;

  const filtered = useMemo(() => {
    let result = [...products];
    if (selectedPrices.size > 0) {
      const ranges = PRICE_RANGES.filter((r) => selectedPrices.has(r.id));
      result = result.filter((p) => ranges.some((r) => p.price >= r.min && p.price < r.max));
    }
    if (selectedBrands.size > 0) result = result.filter((p) => selectedBrands.has(p.brand));
    if (selectedRatings.size > 0) {
      const minRating = Math.max(...selectedRatings);
      result = result.filter((p) => p.rating >= minRating);
    }
    if (selectedDiscounts.size > 0) {
      const minDiscount = Math.max(...selectedDiscounts);
      result = result.filter((p) => discountPercent(p.mrp, p.price) >= minDiscount);
    }
    switch (sortBy) {
      case 'price-low':
        result.sort((a, b) => a.price - b.price || a.id.localeCompare(b.id));
        break;
      case 'price-high':
        result.sort((a, b) => b.price - a.price || a.id.localeCompare(b.id));
        break;
      case 'rating':
        result.sort((a, b) => b.rating - a.rating || a.id.localeCompare(b.id));
        break;
      case 'discount':
        result.sort(
          (a, b) =>
            discountPercent(b.mrp, b.price) - discountPercent(a.mrp, a.price) ||
            a.id.localeCompare(b.id),
        );
        break;
      // Review count as the units-sold proxy — the same stand-in the backend's
      // own `popular` sort uses, so the two orderings agree.
      case 'best-selling':
        result.sort(
          (a, b) => (Number(b.reviews) || 0) - (Number(a.reviews) || 0) || a.id.localeCompare(b.id),
        );
        break;
      // Undated products sort last rather than being treated as brand new.
      case 'newest':
        result.sort((a, b) => {
          const at = a.createdAt ? Date.parse(a.createdAt) : 0;
          const bt = b.createdAt ? Date.parse(b.createdAt) : 0;
          return bt - at || a.id.localeCompare(b.id);
        });
        break;
      default:
        // 'recommended' keeps the server's order — the catalogue's ranking is
        // the source of truth, and it already ends on a stable tiebreak.
        break;
    }
    return result;
  }, [products, selectedPrices, selectedBrands, selectedRatings, selectedDiscounts, sortBy]);

  const toggleSet = <T,>(setter: React.Dispatch<React.SetStateAction<Set<T>>>, value: T) => {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const clearAllFilters = () => {
    setSelectedPrices(new Set());
    setSelectedBrands(new Set());
    setSelectedRatings(new Set());
    setSelectedDiscounts(new Set());
  };

  const section = (id: string, title: string, children: React.ReactNode) => (
    <FilterSection
      key={id}
      title={title}
      collapsed={collapsedSections.has(id)}
      onToggle={() => toggleSection(id)}
    >
      {children}
    </FilterSection>
  );

  const checkbox = (checked: boolean, onChange: () => void, label: React.ReactNode) => (
    <label className="flex items-center gap-2.5 text-sm text-slate-600 cursor-pointer hover:text-slate-900 min-h-[32px]">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="w-4 h-4 rounded border-slate-300 accent-brand-600 focus-visible:ring-2 focus-visible:ring-brand-500"
      />
      {label}
    </label>
  );

  const filterContent = (
    <div className="space-y-5">
      {section(
        'price',
        'Price',
        PRICE_RANGES.map((r, idx) => (
          <React.Fragment key={r.id}>
            {checkbox(
              selectedPrices.has(r.id),
              () => toggleSet(setSelectedPrices, r.id),
              <span>{priceRangeLabels[idx]}</span>,
            )}
          </React.Fragment>
        )),
      )}
      {allBrands.length > 0 &&
        section(
          'brand',
          'Brand',
          allBrands.map((b) => (
            <React.Fragment key={b}>
              {checkbox(
                selectedBrands.has(b),
                () => toggleSet(setSelectedBrands, b),
                <span className="flex-1 flex items-center justify-between gap-2 min-w-0">
                  <span className="truncate">{b}</span>
                  <span className="text-2xs text-slate-400 tabular-nums">{brandCounts.get(b)}</span>
                </span>,
              )}
            </React.Fragment>
          )),
        )}
      {section(
        'rating',
        'Customer rating',
        RATING_OPTIONS.map((r) => (
          <React.Fragment key={r.min}>
            {checkbox(
              selectedRatings.has(r.min),
              () => toggleSet(setSelectedRatings, r.min),
              <span>{r.label}</span>,
            )}
          </React.Fragment>
        )),
      )}
      {section(
        'discount',
        'Discount',
        DISCOUNT_OPTIONS.map((d) => (
          <React.Fragment key={d.min}>
            {checkbox(
              selectedDiscounts.has(d.min),
              () => toggleSet(setSelectedDiscounts, d.min),
              <span>{d.label}</span>,
            )}
          </React.Fragment>
        )),
      )}
    </div>
  );

  const activeChips: { key: string; label: string; onRemove: () => void }[] = [
    ...Array.from(selectedPrices).map((id) => ({
      key: `p:${id}`,
      label: priceRangeLabels[PRICE_RANGES.findIndex((r) => r.id === id)] ?? id,
      onRemove: () => toggleSet(setSelectedPrices, id),
    })),
    ...Array.from(selectedBrands).map((b) => ({
      key: `b:${b}`,
      label: b,
      onRemove: () => toggleSet(setSelectedBrands, b),
    })),
    ...Array.from(selectedRatings).map((r) => ({
      key: `r:${r}`,
      label: `${r}★ & above`,
      onRemove: () => toggleSet(setSelectedRatings, r),
    })),
    ...Array.from(selectedDiscounts).map((d) => ({
      key: `d:${d}`,
      label: `${d}% off or more`,
      onRemove: () => toggleSet(setSelectedDiscounts, d),
    })),
  ];

  return (
    <div className="max-w-7xl mx-auto px-3 xs:px-4 pt-4 md:pt-6 pb-4 flex flex-col md:flex-row gap-6">
      {/* Mobile: one control opens the drawer. */}
      <button
        type="button"
        onClick={() => setMobileFiltersOpen(true)}
        className="btn btn-outline w-full md:hidden bg-white"
        aria-haspopup="dialog"
      >
        <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
        Filters
        {activeFilterCount > 0 && (
          <span className="bg-brand-600 text-white text-2xs font-bold px-1.5 py-0.5 rounded-full tabular-nums">
            {activeFilterCount}
          </span>
        )}
      </button>

      {mobileFiltersOpen && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/40 z-[200] md:hidden"
            onClick={() => setMobileFiltersOpen(false)}
          >
            <DismissOnEscape onDismiss={() => setMobileFiltersOpen(false)} />
          </div>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
            className="fixed inset-y-0 left-0 w-[85%] max-w-sm bg-white z-[201] md:hidden shadow-modal overflow-y-auto"
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-slate-700" aria-hidden="true" />
                <h2 className="font-heading font-bold text-base text-slate-900">Filters</h2>
              </div>
              <div className="flex items-center gap-2">
                {activeFilterCount > 0 && (
                  <button type="button" onClick={clearAllFilters} className="btn btn-ghost btn-sm">
                    Clear all
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Close filters"
                  onClick={() => setMobileFiltersOpen(false)}
                  className="btn btn-ghost btn-icon"
                >
                  <X className="w-5 h-5 text-slate-500" aria-hidden="true" />
                </button>
              </div>
            </div>
            <div className="p-4">{filterContent}</div>
            <div className="sticky bottom-0 p-4 bg-white border-t border-slate-100">
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="btn btn-primary w-full"
              >
                Show {filtered.length} {filtered.length === 1 ? 'product' : 'products'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Desktop sidebar. */}
      <aside className="w-full md:w-60 shrink-0 hidden md:block">
        <div className="card p-5 sticky top-[calc(var(--mp-header-h)+1rem)]">
          <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-100">
            <Filter className="w-5 h-5 text-slate-700" aria-hidden="true" />
            <h2 className="font-heading font-bold text-base text-slate-900">Filters</h2>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="ml-auto text-xs font-semibold text-brand-700 hover:underline"
              >
                Clear all
              </button>
            )}
          </div>
          {filterContent}
        </div>
      </aside>

      <main id="main-content" className="flex-1 min-w-0">
        {activeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4" aria-label="Active filters">
            {activeChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={chip.onRemove}
                className="chip chip-active"
                aria-label={`Remove filter ${chip.label}`}
              >
                {chip.label} <X className="w-3 h-3" aria-hidden="true" />
              </button>
            ))}
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-xs font-semibold text-brand-700 hover:underline ml-1"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Sort bar */}
        <div className="card px-3 py-2.5 mb-5 flex items-center justify-between gap-3">
          <p className="text-sm text-slate-600 tabular-nums min-w-0 truncate">
            Showing <span className="font-bold text-slate-900">{filtered.length}</span>
            {filtered.length !== products.length && (
              <span className="text-slate-400"> of {products.length}</span>
            )}{' '}
            in <span className="font-semibold text-slate-800">{listingName}</span>
          </p>
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowSortDropdown((v) => !v)}
              aria-haspopup="listbox"
              aria-expanded={showSortDropdown}
              className="btn btn-outline btn-sm bg-white"
            >
              <ArrowUpDown className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Sort:</span> {SORT_LABELS[sortBy]}
              <ChevronDown className="w-4 h-4 text-slate-400" aria-hidden="true" />
            </button>
            {showSortDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowSortDropdown(false)}>
                  <DismissOnEscape onDismiss={() => setShowSortDropdown(false)} />
                </div>
                <ul
                  role="listbox"
                  aria-label="Sort products"
                  className="absolute right-0 top-full mt-1.5 w-56 card z-50 py-1.5 overflow-hidden"
                >
                  {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
                    <li key={key} role="option" aria-selected={sortBy === key}>
                      <button
                        type="button"
                        onClick={() => {
                          setSortBy(key);
                          setShowSortDropdown(false);
                        }}
                        className={`w-full flex items-center justify-between text-left px-3.5 py-2.5 text-sm font-medium transition-colors ${
                          sortBy === key
                            ? 'bg-brand-50 text-brand-700'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {SORT_LABELS[key]}
                        {sortBy === key && <Check className="w-4 h-4" aria-hidden="true" />}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="card p-10 md:p-14 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
              <PackageOpen className="w-8 h-8" aria-hidden="true" />
            </div>
            {activeFilterCount > 0 ? (
              <>
                <h3 className="font-heading text-lg font-bold text-slate-900 mb-2">
                  No products match your filters
                </h3>
                <p className="text-sm text-slate-500 mb-5">
                  {products.length} {products.length === 1 ? 'product' : 'products'} in{' '}
                  {listingName}, none matching the current selection.
                </p>
                <button type="button" onClick={clearAllFilters} className="btn btn-primary btn-sm">
                  Clear all filters
                </button>
              </>
            ) : (
              <>
                <h3 className="font-heading text-lg font-bold text-slate-900 mb-2">
                  Nothing here yet
                </h3>
                <p className="text-sm text-slate-500">
                  {listingName} has no products listed in your market at the moment. Please check
                  back soon.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="card-grid-2-4">
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

        {/* A button, not scroll-triggered loading: this page has filters and a
            sort above it, and loading silently on scroll while a shopper is
            narrowing results moves the ground under them. */}
        {loadMorePath && !exhausted && filtered.length > 0 && (
          <div className="mt-8 text-center">
            {loadError && (
              <p role="alert" className="text-sm text-red-600 mb-3">
                We couldn&apos;t load more products. The ones above are still here.
              </p>
            )}
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="btn btn-outline bg-white disabled:opacity-60"
            >
              {loadingMore ? 'Loading…' : loadError ? 'Try again' : 'Show more products'}
            </button>
          </div>
        )}

        {exhausted && products.length > pageSize && (
          <p className="mt-8 text-center text-sm text-slate-400 tabular-nums">
            Showing all {filtered.length}
            {filtered.length !== products.length ? ` of ${products.length}` : ''} product
            {filtered.length === 1 ? '' : 's'} in {listingName}.
          </p>
        )}
      </main>
    </div>
  );
}

export default CatalogFilters;
