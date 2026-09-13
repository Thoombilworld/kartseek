'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ShoppingBag, Star, TrendingUp } from 'lucide-react';
import { apiFetch } from '@/lib/api-fetch';
import { mapCatalogList } from '@/lib/api/map-catalog-product';
import { discountPercent } from '@/lib/marketplace/pricing';
import { productPath } from '@/lib/marketplace/product-url';
import { useRegion } from '@/lib/contexts/region-context';
import { ProductThumb, THUMB_SIZES } from '@/components/marketplace/product-thumb';
import type { HomeProduct } from '@/lib/marketplace/types';

/** How many cards the band shows; the marketplace's own /trending page has the rest. */
const LIMIT = 8;

/**
 * The super-app home's "Trending Products" band, from the live catalogue.
 *
 * It used to map `TRENDING_PRODUCTS` from the demo bundle — eight products
 * whose ids exist in no database — so every card on the platform's front door
 * linked to a product page that 404'd, and the band rendered whether or not
 * the marketplace was reachable. This asks `/marketplace/trending` for the
 * active market, through `apiFetch` so the region headers travel, and renders
 * nothing at all when there is nothing to show: an empty band would be a
 * promise of activity the catalogue has not made.
 */
export function MarketplaceTrendingRail() {
  const { formatCurrencyValue, selectedRegion } = useRegion();
  const [products, setProducts] = useState<HomeProduct[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch(`/marketplace/trending?limit=${LIMIT}`, {
          signal: AbortSignal.timeout(6000),
        });
        if (!res.ok) throw new Error(String(res.status));
        const rows = mapCatalogList(await res.json());
        if (!cancelled) setProducts(rows.filter((p) => p.id).slice(0, LIMIT));
      } catch {
        // No rows, no band. The marketplace's own pages report their outages.
        if (!cancelled) setProducts([]);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Re-fetched on a market switch: trending is composed per market.
  }, [selectedRegion]);

  if (products.length === 0) return null;

  return (
    <section
      aria-label="Trending products"
      className="relative -mx-3 xs:-mx-4 md:-mx-6 lg:-mx-8 3xl:-mx-12 4xl:-mx-16 px-3 xs:px-4 md:px-6 lg:px-8 3xl:px-12 4xl:px-16 py-8 md:py-10 overflow-hidden"
    >
      {/* Gradient background — marketplace module identity. The negative margin
          cancels <main>'s padding at every breakpoint. */}
      <div className="absolute inset-0 bg-linear-to-br from-blue-600 via-indigo-600 to-blue-700" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_-10%,rgba(255,255,255,0.15),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_110%,rgba(0,0,0,0.15),transparent_50%)]" />
      <div className="absolute inset-0 opacity-[0.04] bg-cross-pattern" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
                <ShoppingBag className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                Trending Products
              </h2>
            </div>
            <p className="text-white/70 text-sm font-medium ml-10">
              Most popular across all categories
            </p>
          </div>
          <Link
            href="/marketplace/trending"
            id="view-all-trending"
            className="hidden md:flex items-center gap-1.5 bg-white/20 hover:bg-white/30 backdrop-blur text-white text-sm font-bold px-4 py-2 rounded-xl transition-all"
          >
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2 snap-x snap-mandatory">
          {products.map((product) => {
            const discount = discountPercent(product.mrp, product.price);
            const rating = Number(product.rating) || 0;
            return (
              <Link
                key={product.id}
                href={productPath(product)}
                id={`trending-${product.id}`}
                className="snap-start shrink-0 w-[220px] md:w-[240px] bg-white rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group"
              >
                <div className="relative">
                  <ProductThumb
                    src={product.imageUrl}
                    alt={product.title}
                    brand={product.brand}
                    sizes={THUMB_SIZES.grid4}
                    className="rounded-none"
                  />
                  {product.badge && (
                    <div className="absolute top-2.5 left-2.5 bg-violet-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider shadow-sm flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> {product.badge}
                    </div>
                  )}
                  {rating > 0 && (
                    <div className="absolute top-2.5 right-2.5 bg-green-600 text-white px-1.5 py-0.5 rounded-md text-[11px] font-bold flex items-center gap-0.5 shadow-sm">
                      <Star className="w-3 h-3 fill-current" /> {rating.toFixed(1)}
                    </div>
                  )}
                </div>

                <div className="p-3.5">
                  {product.brand && (
                    <p className="text-[10px] text-slate-400 font-semibold mb-0.5 uppercase tracking-widest truncate">
                      {product.brand}
                    </p>
                  )}
                  <h3 className="font-bold text-slate-900 text-sm mb-1.5 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
                    {product.title}
                  </h3>
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span className="font-bold text-lg text-slate-900">
                      {formatCurrencyValue(product.price)}
                    </span>
                    {product.mrp > product.price && (
                      <>
                        <span className="text-[11px] text-slate-400 line-through">
                          {formatCurrencyValue(product.mrp)}
                        </span>
                        <span className="text-[11px] text-green-600 font-bold">
                          {discount}% off
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <Link
          href="/marketplace/trending"
          id="mobile-view-all-trending"
          className="md:hidden flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur text-white text-sm font-bold px-5 py-3 rounded-xl mt-5 transition-all w-full"
        >
          Browse All Products <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
