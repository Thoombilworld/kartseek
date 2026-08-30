'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Search, SlidersHorizontal, ChevronDown, Star, Truck, Heart,
  X, ArrowUpDown, Filter, Mic, Camera, Grid3X3, List,
} from 'lucide-react';
import { useRegion } from '@/lib/contexts/region-context';
import { searchMarketplace, getProducts } from '@/lib/api/marketplace';
import { buyBoxPrice } from '@/lib/api/map-catalog-product';
import { useCartContext } from '@/lib/contexts/cart-context';
import { ProductThumb, THUMB_SIZES } from '@/components/marketplace/product-thumb';
import { useToast } from '@/lib/contexts/toast-context';
import { useWishlist } from '@/lib/contexts/wishlist-context';
import { useRequireAuth } from '@/lib/contexts/login-prompt';

import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
import { productPath } from '@/lib/marketplace/product-url';
// ── Product normalizer — maps the backend Product shape → search-card shape ──
// Search is the one catalogue read served over gRPC, so rows arrive as the proto
// ProductResponse rather than the entity: the list price is `price` (not `mrp`),
// the payable one is `discountedPrice`, and `images` is an array of plain strings
// rather than `{ url }` rows. Reading `p.mrp` alone collapsed mrp onto the selling
// price, so every search result showed 0% off; reading `images[0].url` left every
// search card without a picture.
function normalizeProduct(p: any) {
  const price = buyBoxPrice(p);
  const mrp = Number(p.mrp ?? p.price ?? price);
  return {
    id: p.id,
    title: p.name ?? p.title ?? 'Product',
    brand: p.brand?.name ?? (typeof p.brand === 'string' ? p.brand : ''),
    category: p.category?.name ?? (typeof p.category === 'string' ? p.category : ''),
    price,
    mrp,
    rating: Number(p.averageRating ?? p.rating ?? 0),
    reviews: Number(p.reviewCount ?? p.reviews ?? 0),
    badge: p.badge ?? '',
    delivery: p.delivery ?? 'Free delivery',
    image: (typeof p.images?.[0] === 'string' ? p.images[0] : p.images?.[0]?.url) ?? p.image ?? p.imageUrl ?? '',
  };
}

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Customer Rating' },
  { value: 'discount', label: 'Biggest Discount' },
  { value: 'newest', label: 'Newest First' },
];

/**
 * Count the distinct values of one facet across a result set.
 *
 * The brand and category filters used to be two hard-coded arrays — Apple,
 * Samsung, … Dyson — rendered identically on every search. They advertised
 * brands the catalogue may not carry, omitted the ones it does, and carried no
 * counts, so ticking one could only ever narrow the list to nothing. Facets
 * have to come from the results they filter.
 */
function facetCounts(products: { brand: string; category: string }[], key: 'brand' | 'category') {
  const counts = new Map<string, number>();
  for (const p of products) {
    const value = p[key]?.trim();
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([value, count]) => ({ value, count }));
}

function discountPct(mrp: number, price: number) {
  return Math.round(((mrp - price) / mrp) * 100);
}
function SearchPageContent() {
  const { formatCurrencyValue: fmt } = useRegion();
  const cart = useCartContext();
  const toast = useToast();
  const wishlist = useWishlist();
  const requireAuth = useRequireAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [sort, setSort] = useState('relevance');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 250000]);
  const [minRating, setMinRating] = useState(0);

  const q = searchParams.get('q') || '';

  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Fetch results from the real marketplace API whenever the query changes.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    (async () => {
      try {
        const res: any = q
          ? await searchMarketplace(q, { limit: 48 })
          : await getProducts({ limit: '48' });
        const list = res?.data ?? res?.products ?? res?.results ?? [];
        if (!cancelled) setAllProducts(Array.isArray(list) ? list.map(normalizeProduct) : []);
      } catch {
        if (!cancelled) { setError(true); setAllProducts([]); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [q, reloadKey]);

  // Filter + sort the fetched products client-side (facets within the result page).
  // `skip` lets a facet's own dimension be excluded when counting it, so ticking
  // "Apple" does not collapse the brand list to Apple alone — the standard
  // behaviour on every marketplace this is modelled on.
  const matches = (p: any, skip?: 'brand' | 'category') => {
    const needle = q.toLowerCase();
    const matchQuery = !q
      || p.title.toLowerCase().includes(needle)
      || p.brand.toLowerCase().includes(needle)
      || p.category.toLowerCase().includes(needle);
    const matchBrand = skip === 'brand' || selectedBrands.length === 0 || selectedBrands.includes(p.brand);
    const matchCat = skip === 'category' || selectedCats.length === 0 || selectedCats.includes(p.category);
    const matchPrice = p.price >= priceRange[0] && p.price <= priceRange[1];
    const matchRating = p.rating >= minRating;
    return matchQuery && matchBrand && matchCat && matchPrice && matchRating;
  };

  let results = allProducts.filter((p) => matches(p));

  const brandFacets = facetCounts(allProducts.filter((p) => matches(p, 'brand')), 'brand');
  const categoryFacets = facetCounts(allProducts.filter((p) => matches(p, 'category')), 'category');

  if (sort === 'price_asc') results = [...results].sort((a, b) => a.price - b.price);
  else if (sort === 'price_desc') results = [...results].sort((a, b) => b.price - a.price);
  else if (sort === 'rating') results = [...results].sort((a, b) => b.rating - a.rating);
  else if (sort === 'discount') results = [...results].sort((a, b) => discountPct(b.mrp, b.price) - discountPct(a.mrp, a.price));

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/search?q=${encodeURIComponent(query)}`);
  }

  function toggleBrand(b: string) {
    setSelectedBrands(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b]);
  }
  function toggleCat(c: string) {
    setSelectedCats(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  }
  /**
   * Save or unsave a result.
   *
   * This used to be `setWishlist(...)` and nothing else — the heart filled in,
   * no request was made, and the next reload emptied it. Same shape as the
   * brand-follow bug: local optimism with no server behind it. The shared
   * wishlist context owns the state and the write now.
   */
  function toggleWishlist(id: string) {
    requireAuth({
      reason: 'to save items to your wishlist',
      onAuthenticated: () => {
        void wishlist.toggle(id).then((ok) => {
          if (ok) toast.success(wishlist.has(id) ? 'Removed from wishlist' : 'Saved to wishlist');
        });
      },
    });
  }

  /**
   * Quick-add from a result card.
   *
   * Both the grid and the list card rendered an "Add to Cart" button with full
   * hover styling and no `onClick` at all — the primary commerce action on the
   * search page did nothing, while the wishlist heart beside it worked. No
   * `variantId` is sent: a card cannot know which variant the shopper wants, and
   * the product page is where that choice is made. Matching `ProductActions`,
   * which sends `undefined` rather than `"{}"` so the same product does not land
   * in the cart under two different line keys.
   */
  function handleAddToCart(p: any) {
    cart.add({
      id: String(p.id),
      name: p.title ?? p.name ?? 'Product',
      price: Number(p.price) || 0,
      quantity: 1,
      imageUrl: p.imageUrl || '',
      brand: typeof p.brand === 'string' ? p.brand : p.brand?.name || '',
    });
    toast.success(`Added ${p.title ?? 'item'} to cart`);
  }
  function clearAll() {
    setSelectedBrands([]); setSelectedCats([]); setPriceRange([0, 250000]); setMinRating(0);
  }

  const activeFilters = selectedBrands.length + selectedCats.length + (minRating > 0 ? 1 : 0);
  const [mobileFiltersOpen, setMobileFiltersOpen] = React.useState(false);


  return (
    <div className="min-h-screen bg-slate-50">
      {/* Search Header */}
      <div className="bg-white border-b border-slate-200 sticky top-(--mp-header-h) z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <form onSubmit={handleSearch} className="flex gap-2 items-center">
            <div className="flex-1 flex items-center gap-2 bg-slate-100 rounded-lg px-4 py-2.5 border border-slate-200 focus-within:border-blue-400 focus-within:bg-white transition-colors">
              <Search className="w-5 h-5 text-slate-400 shrink-0" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search products, brands, categories..."
                className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 outline-none"
                autoFocus
              />
              {query && <button type="button" title="Clear search" onClick={() => setQuery('')}><X className="w-4 h-4 text-slate-400" /></button>}
              <div className="w-px h-5 bg-slate-300" />
              {/* Voice and image search have no implementation behind them —
                  no speech recognition, no visual-search endpoint. They were
                  rendered as live controls, so tapping either did nothing and
                  read as a broken search bar. Marked unavailable until the
                  feature exists rather than left looking clickable. */}
              <button type="button" disabled title="Voice search — coming soon" aria-label="Voice search — coming soon">
                <Mic className="w-4 h-4 text-slate-300 cursor-not-allowed" />
              </button>
              <button type="button" disabled title="Image search — coming soon" aria-label="Image search — coming soon">
                <Camera className="w-4 h-4 text-slate-300 cursor-not-allowed" />
              </button>
            </div>
            <button type="submit" className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors">
              Search
            </button>
          </form>
          {q && (
            <p className="text-xs text-slate-500 mt-2">
              Showing <span className="font-bold text-slate-900">{results.length}</span> results for <span className="font-bold text-blue-600">"{q}"</span>
            </p>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 xs:px-4 py-3 flex gap-6">

        {/* Sidebar Filters — Desktop */}
        <aside className="hidden lg:block w-64 shrink-0 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">Filters</h3>
              {activeFilters > 0 && (
                <button onClick={clearAll} className="text-xs text-blue-600 font-bold hover:underline">Clear All</button>
              )}
            </div>

            {/* Category Filter — derived from the results, with counts */}
            {categoryFacets.length > 0 && (
              <div className="mb-5">
                <h4 className="text-sm font-bold text-slate-700 mb-2">Category</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {categoryFacets.map(({ value, count }) => (
                    <label key={value} className="flex items-center gap-2 cursor-pointer group">
                      <input type="checkbox" checked={selectedCats.includes(value)} onChange={() => toggleCat(value)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4" />
                      <span className="text-sm text-slate-600 group-hover:text-slate-900 flex-1">{value}</span>
                      <span className="text-xs text-slate-400">({count})</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Brand Filter — derived from the results, with counts */}
            {brandFacets.length > 0 && (
              <div className="mb-5">
                <h4 className="text-sm font-bold text-slate-700 mb-2">Brand</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {brandFacets.map(({ value, count }) => (
                    <label key={value} className="flex items-center gap-2 cursor-pointer group">
                      <input type="checkbox" checked={selectedBrands.includes(value)} onChange={() => toggleBrand(value)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4" />
                      <span className="text-sm text-slate-600 group-hover:text-slate-900 flex-1">{value}</span>
                      <span className="text-xs text-slate-400">({count})</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Rating Filter */}
            <div className="mb-5">
              <h4 className="text-sm font-bold text-slate-700 mb-2">Customer Rating</h4>
              <div className="space-y-2">
                {[4, 3, 2].map(r => (
                  <button key={r} onClick={() => setMinRating(minRating === r ? 0 : r)}
                    className={`flex items-center gap-2 text-sm w-full text-left px-2 py-1 rounded-lg transition-colors ${minRating === r ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                    <Star className={`w-4 h-4 ${minRating === r ? 'fill-blue-500 text-blue-500' : 'fill-yellow-400 text-yellow-400'}`} />
                    {r}★ & above
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div>
              <h4 className="text-sm font-bold text-slate-700 mb-2">Price Range</h4>
              <div className="flex gap-2">
                <input type="number" value={priceRange[0]} onChange={e => setPriceRange([+e.target.value, priceRange[1]])}
                  className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-700" placeholder="Min" />
                <input type="number" value={priceRange[1]} onChange={e => setPriceRange([priceRange[0], +e.target.value])}
                  className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-700" placeholder="Max" />
              </div>
            </div>
          </div>
        </aside>

        {/* Main Results */}
        <div className="flex-1">
          {/* Sort Bar */}
          <div className="flex items-center justify-between mb-4 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm">
            <div className="flex items-center gap-2">
              <button onClick={() => { setShowFilters(!showFilters); setMobileFiltersOpen(true); }}
                className="lg:hidden flex items-center gap-2 text-sm font-bold text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50">

                <Filter className="w-4 h-4" />
                Filters {activeFilters > 0 && <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{activeFilters}</span>}
              </button>
              <span className="text-xs text-slate-400 hidden lg:block">{results.length} results</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <ArrowUpDown className="w-4 h-4 text-slate-400" />
                <select value={sort} onChange={e => setSort(e.target.value)} title="Sort results"
                  className="text-sm font-medium text-slate-700 bg-transparent border-none outline-none cursor-pointer">
                  {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="hidden md:flex items-center gap-1 border border-slate-200 rounded-lg overflow-hidden">
                <button title="Grid view" onClick={() => setViewMode('grid')} className={`p-1.5 ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-slate-400'}`}><Grid3X3 className="w-4 h-4" /></button>
                <button title="List view" onClick={() => setViewMode('list')} className={`p-1.5 ${viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'text-slate-400'}`}><List className="w-4 h-4" /></button>
              </div>
            </div>
          </div>

          {/* Active Filter Chips */}
          {activeFilters > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {selectedBrands.map(b => (
                <span key={b} className="flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded-full border border-blue-200">
                  {b} <button title={`Remove ${b} filter`} onClick={() => toggleBrand(b)}><X className="w-3 h-3" /></button>
                </span>
              ))}
              {selectedCats.map(c => (
                <span key={c} className="flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200">
                  {c} <button title={`Remove ${c} filter`} onClick={() => toggleCat(c)}><X className="w-3 h-3" /></button>
                </span>
              ))}
              {minRating > 0 && (
                <span className="flex items-center gap-1 bg-amber-50 text-amber-700 text-xs font-bold px-3 py-1 rounded-full border border-amber-200">
                  {minRating}★+ <button title="Remove rating filter" onClick={() => setMinRating(0)}><X className="w-3 h-3" /></button>
                </span>
              )}
            </div>
          )}

          {/* Products */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-xl overflow-hidden animate-pulse">
                  <div className="aspect-square bg-slate-100" />
                  <div className="p-3 space-y-2">
                    <div className="h-2 bg-slate-100 rounded w-1/3" />
                    <div className="h-3 bg-slate-100 rounded w-full" />
                    <div className="h-3 bg-slate-100 rounded w-2/3" />
                    <div className="h-4 bg-slate-100 rounded w-1/2 mt-2" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Search className="w-16 h-16 text-slate-200 mb-4" />
              <h3 className="text-xl font-bold text-slate-700 mb-2">Couldn&apos;t load results</h3>
              <p className="text-slate-500 text-sm mb-4">Something went wrong while searching. Please try again.</p>
              <button onClick={() => setReloadKey(k => k + 1)} className="bg-blue-600 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-blue-700">Retry</button>
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Search className="w-16 h-16 text-slate-200 mb-4" />
              <h3 className="text-xl font-bold text-slate-700 mb-2">No results found</h3>
              <p className="text-slate-500 text-sm mb-4">Try different keywords or remove filters</p>
              <button onClick={clearAll} className="bg-blue-600 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-blue-700">Clear Filters</button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">

              {results.map(p => {
                const disc = discountPct(p.mrp, p.price);
                return (
                  <div key={p.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow group relative">
                    {p.badge && <div className="absolute top-2 left-2 z-10 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">{p.badge}</div>}
                    <button title="Add to wishlist" onClick={() => toggleWishlist(p.id)} className="absolute top-2 right-2 z-10 p-1.5 bg-white rounded-full shadow-sm border border-slate-100">
                      <Heart className={`w-4 h-4 ${wishlist.has(p.id) ? 'fill-red-500 text-red-500' : 'text-slate-300'}`} />
                    </button>
                    <Link href={productPath(p)}>
                      <ProductThumb
                        src={p.image}
                        alt={p.title}
                        brand={p.brand}
                        sizes={THUMB_SIZES.grid4}
                      />
                      <div className="p-3">
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">{p.brand}</p>
                        <h3 className="text-sm font-medium text-slate-800 line-clamp-2 leading-snug mb-1.5">{p.title}</h3>
                        <div className="flex items-center gap-1 mb-2">
                          <span className="bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">{p.rating} ★</span>
                          <span className="text-[11px] text-slate-400">({p.reviews.toLocaleString()})</span>
                        </div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-bold text-base text-slate-900">{fmt(p.price)}</span>
                          {disc > 0 && <span className="text-[11px] text-green-600 font-bold">{disc}% off</span>}
                        </div>
                        {p.mrp > p.price && <span className="text-[10px] text-slate-400 line-through">{fmt(p.mrp)}</span>}
                        <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1"><Truck className="w-3 h-3" /> {p.delivery}</p>
                      </div>
                    </Link>
                    <div className="px-3 pb-3">
                      <button onClick={() => handleAddToCart(p)} className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 rounded-lg transition-colors">Add to Cart</button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // List view
            <div className="space-y-3">
              {results.map(p => {
                const disc = discountPct(p.mrp, p.price);
                return (
                  <div key={p.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow flex">
                    <Link href={productPath(p)} className="flex flex-1">
                      <div className="w-36 shrink-0">
                        <ProductThumb
                          src={p.image}
                          alt={p.title}
                          brand={p.brand}
                          sizes={THUMB_SIZES.row}
                          zoomOnHover={false}
                        />
                      </div>
                      <div className="p-4 flex-1">
                        <p className="text-[10px] text-blue-600 font-bold uppercase mb-1">{p.brand}</p>
                        <h3 className="text-sm font-semibold text-slate-800 mb-1">{p.title}</h3>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">{p.rating} ★</span>
                          <span className="text-xs text-slate-400">{p.reviews.toLocaleString()} ratings</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="font-bold text-lg text-slate-900">{fmt(p.price)}</span>
                          {p.mrp > p.price && <span className="text-sm text-slate-400 line-through">{fmt(p.mrp)}</span>}
                          {disc > 0 && <span className="text-sm text-green-600 font-bold">{disc}% off</span>}
                        </div>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1"><Truck className="w-3 h-3 text-slate-400" /> {p.delivery}</p>
                      </div>
                    </Link>
                    <div className="flex flex-col justify-center gap-2 p-4 shrink-0">
                      <button onClick={() => handleAddToCart(p)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-4 rounded-lg transition-colors whitespace-nowrap">Add to Cart</button>
                      <button onClick={() => toggleWishlist(p.id)} className={`text-xs font-bold py-2 px-4 rounded-lg border transition-colors whitespace-nowrap ${wishlist.has(p.id) ? 'border-red-300 text-red-500 bg-red-50' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                        {wishlist.has(p.id) ? '♥ Saved' : '♡ Wishlist'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile Filter Bottom-Sheet Drawer ───────────────────────────── */}
      {mobileFiltersOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[200] lg:hidden" onClick={() => setMobileFiltersOpen(false)} ><DismissOnEscape onDismiss={() => setMobileFiltersOpen(false)} /></div>
          <div className="fixed inset-x-0 bottom-0 bg-white z-[201] lg:hidden rounded-t-2xl shadow-2xl max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-900">Filters</h2>
              <div className="flex items-center gap-3">
                {activeFilters > 0 && <button onClick={clearAll} className="text-xs text-red-600 font-semibold">Clear All</button>}
                <button onClick={() => setMobileFiltersOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
            </div>
            <div className="p-4 space-y-5">
              {/* Category */}
              {categoryFacets.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-slate-700 mb-2">Category</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {categoryFacets.map(({ value, count }) => (
                      <button key={value} onClick={() => toggleCat(value)}
                        className={`text-sm py-2 px-3 rounded-lg border font-medium transition-colors text-left ${
                          selectedCats.includes(value) ? 'bg-blue-50 border-blue-400 text-blue-700' : 'border-slate-200 text-slate-600'
                        }`}>{value} <span className="text-slate-400">({count})</span></button>
                    ))}
                  </div>
                </div>
              )}
              {/* Brand */}
              {brandFacets.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-slate-700 mb-2">Brand</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {brandFacets.map(({ value, count }) => (
                      <button key={value} onClick={() => toggleBrand(value)}
                        className={`text-sm py-2 px-3 rounded-lg border font-medium transition-colors text-left ${
                          selectedBrands.includes(value) ? 'bg-blue-50 border-blue-400 text-blue-700' : 'border-slate-200 text-slate-600'
                        }`}>{value} <span className="text-slate-400">({count})</span></button>
                    ))}
                  </div>
                </div>
              )}
              {/* Rating */}
              <div>
                <h4 className="text-sm font-bold text-slate-700 mb-2">Rating</h4>
                <div className="flex gap-2">
                  {[4,3,2].map(r => (
                    <button key={r} onClick={() => setMinRating(minRating === r ? 0 : r)}
                      className={`flex-1 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                        minRating === r ? 'bg-blue-50 border-blue-400 text-blue-700' : 'border-slate-200 text-slate-600'
                      }`}>{r}★+</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="sticky bottom-0 p-4 bg-white border-t border-slate-100">
              <button onClick={() => setMobileFiltersOpen(false)}
                className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl text-sm hover:bg-blue-700 transition-colors">
                Show {results.length} Results
              </button>
            </div>
          </div>
        </>
      )}
    </div>

  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Search className="w-12 h-12 text-slate-300 mx-auto mb-3 animate-pulse" />
          <p className="text-slate-500 text-sm">Searching...</p>
        </div>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}
