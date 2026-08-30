'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { SlidersHorizontal } from 'lucide-react';
import { useRegion } from '@/lib/contexts/region-context';
import { ProductCard } from '../../components/product-card';

interface SubProduct {
  id: string;
  title: string;
  brand: string;
  price: number;
  mrp: number;
  rating: number;
  reviews: string;
  badge?: string;
  imageUrl?: string;
  /** Every catalogue image, primary first — the card swipes through them. */
  images?: string[];
  /** Variant axes from the catalogue, rendered as swatches / size counts. */
  variantAxes?: { variantName: string; variantOptions: string[] }[];
  delivery?: string;
}

type SortKey = 'relevant' | 'price-asc' | 'price-desc' | 'rating' | 'newest';

// Bounds only — the labels are formatted in the user's currency at render time.
// These read "Under ₹1,000" hard-coded, so a shopper on the Qatar storefront
// browsed rupee brackets while every price beside them was in riyals.
const PRICE_RANGES = [
  { id: 'under-1000', min: 0, max: 1000 },
  { id: '1000-5000', min: 1000, max: 5000 },
  { id: '5000-20000', min: 5000, max: 20000 },
  { id: '20000-50000', min: 20000, max: 50000 },
  { id: 'over-50000', min: 50000, max: Infinity },
];

export default function SubcategoryFilters({
  products,
  subcategoryName,
  subcategoryId,
}: {
  products: SubProduct[];
  subcategoryName: string;
  subcategoryId: string;
}) {
  const { formatCurrencyValue } = useRegion();
  const [sort, setSort] = useState<SortKey>('relevant');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, Infinity]);
  const [minRating, setMinRating] = useState(0);

  const priceRangeLabels = useMemo(
    () => PRICE_RANGES.map(r => {
      if (r.max === Infinity) return `Over ${formatCurrencyValue(r.min)}`;
      if (r.min === 0) return `Under ${formatCurrencyValue(r.max)}`;
      return `${formatCurrencyValue(r.min)} – ${formatCurrencyValue(r.max)}`;
    }),
    [formatCurrencyValue],
  );

  const filtered = useMemo(() => {
    let result = products
      .filter(p => p.price >= priceRange[0] && p.price <= priceRange[1])
      .filter(p => (p.rating || 0) >= minRating);

    switch (sort) {
      case 'price-asc': result.sort((a, b) => a.price - b.price); break;
      case 'price-desc': result.sort((a, b) => b.price - a.price); break;
      case 'rating': result.sort((a, b) => (b.rating || 0) - (a.rating || 0)); break;
      default: break;
    }
    return result;
  }, [products, sort, priceRange, minRating]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
      {/* Sidebar Filters */}
      <aside className="w-64 shrink-0 hidden lg:block">
        <div className="bg-white border border-slate-200 rounded-xl p-5 sticky top-[calc(var(--mp-header-h,80px)+1rem)] space-y-6">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4" /> Filters
          </h3>

          {/* Price Range */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2">Price Range</h4>
            <div className="space-y-1.5">
              <button
                onClick={() => setPriceRange([0, Infinity])}
                className={`w-full text-left text-xs px-3 py-1.5 rounded-lg transition-all ${
                  priceRange[0] === 0 && priceRange[1] === Infinity
                    ? 'bg-blue-600 text-white font-bold'
                    : 'bg-slate-50 text-slate-600 hover:bg-blue-50'
                }`}
              >All Prices</button>
              {PRICE_RANGES.map((r, i) => (
                <button
                  key={r.id}
                  onClick={() => setPriceRange([r.min, r.max])}
                  className={`w-full text-left text-xs px-3 py-1.5 rounded-lg transition-all ${
                    priceRange[0] === r.min && priceRange[1] === r.max
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-slate-50 text-slate-600 hover:bg-blue-50'
                  }`}
                >{priceRangeLabels[i]}</button>
              ))}
            </div>
          </div>

          {/* Rating Filter */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2">Minimum Rating</h4>
            <div className="flex gap-2">
              {[0, 3, 3.5, 4, 4.5].map(r => (
                <button key={r} onClick={() => setMinRating(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    minRating === r ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-blue-50'
                  }`}>
                  {r === 0 ? 'All' : `${r}★+`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <p className="text-sm text-slate-500">{filtered.length} products</p>
          <select value={sort} onChange={e => setSort(e.target.value as SortKey)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            <option value="relevant">Most Relevant</option>
            <option value="price-asc">Price: Low → High</option>
            <option value="price-desc">Price: High → Low</option>
            <option value="rating">Highest Rated</option>
            <option value="newest">Newest</option>
          </select>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {filtered.map((product, i) => (
            <ProductCard
              key={product.id}
              product={product}
              formatCurrencyValue={formatCurrencyValue}
              priority={i < 4}
            />
          ))}
        </div>

        {filtered.length === 0 && (
          /* Telling someone to adjust filters they never set reads as blaming
             them for an empty catalogue, so the two cases are separated. */
          <div className="text-center py-16">
            {products.length > 0 ? (
              <>
                <p className="text-lg font-bold text-slate-700 mb-2">No products match your filters</p>
                <p className="text-slate-500 text-sm mb-4">
                  {products.length} {products.length === 1 ? 'product' : 'products'} here, none matching the current selection.
                </p>
              </>
            ) : (
              <>
                <p className="text-lg font-bold text-slate-700 mb-2">Nothing here yet</p>
                <p className="text-slate-500 text-sm mb-4">This subcategory has no products listed at the moment.</p>
              </>
            )}
            <Link href="/marketplace/category-list" className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors">
              Browse Categories
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
