'use client';

import React, { useEffect, useState } from 'react';
import { ProductCard } from '../../components/product-card';
import { getProducts } from '@/lib/api/marketplace';
import { buyBoxPrice } from '@/lib/api/map-catalog-product';
import { productImageList } from '@/lib/product-image';
import { useRegion } from '@/lib/contexts/region-context';

/**
 * "Similar products", scoped to the category the product is actually in.
 *
 * Two things were wrong. The prop carried `category.id` — a uuid — while the
 * catalogue filters on `category.slug`; and the query sent it under the key
 * `categoryId`, which the gateway does not read at all. An unrecognised filter
 * is ignored rather than rejected, so the request came back with the entire
 * catalogue and the "similar products" rail under a phone listed books. Sending
 * the slug under `category` is what actually narrows it.
 */
export function ProductRecommendations({ categorySlug, excludeProductId }: { categorySlug?: string; excludeProductId?: string }) {
  const { formatCurrencyValue } = useRegion();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecommendations() {
      try {
        // With no category there is nothing to be similar to; showing an
        // arbitrary slice of the catalogue is worse than showing nothing.
        if (!categorySlug) { setProducts([]); setLoading(false); return; }
        const response = await getProducts({ category: categorySlug, limit: '12' });
        const rawList = response?.data ?? (Array.isArray(response) ? response : []);
        // Normalise raw API products to the HomeProduct shape ProductCard expects.
        // The API returns `brand` as an object — rendering it directly crashes React
        // with "Objects are not valid as a React child".
        const normalised = (Array.isArray(rawList) ? rawList : [])
          // A product is not "similar" to itself.
          .filter((p: any) => p?.id !== excludeProductId)
          .map((p: any) => ({
          id: p.id,
          title: p.name ?? p.title ?? 'Product',
          brand: typeof p.brand === 'string' ? p.brand : (p.brand?.name ?? ''),
          // `listings[0]` is not necessarily the buy-box winner, and decimal
          // columns arrive as strings — both handled by the shared helper.
          price: buyBoxPrice(p),
          mrp: Number(p.mrp ?? p.price ?? 0),
          rating: Number(p.averageRating ?? p.rating ?? 0),
          reviews: String(p.reviewCount ?? p.reviews ?? '0'),
          badge: p.badge || undefined,
          imageUrl: productImageList(p)[0],
          images: productImageList(p),
          icon: p.category?.icon ?? undefined,
          category: p.category?.slug ?? '',
          delivery: p.delivery ?? undefined,
        }));
        setProducts(normalised);
      } catch (err) {
        console.warn('Failed to fetch recommendations from API', err);
        // We no longer fallback to mock data; empty state handles it gracefully
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }
    fetchRecommendations();
  }, [categorySlug, excludeProductId]);

  if (loading) {
    return (
      <div className="bg-white rounded-sm shadow-sm border border-slate-200 p-5 mt-4">
        <h2 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-200 pb-2">Related Product Recommendations</h2>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="w-48 h-64 bg-slate-100 animate-pulse rounded-lg flex-shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  if (!products || products.length === 0) return null;

  // Was a local `₹${v.toLocaleString('en-IN')}` — Indian symbol and Indian
  // grouping printed to every market, including the Qatar storefront this
  // defaults to. The region formatter is the single source for both.

  return (
    <div className="bg-white rounded-sm shadow-sm border border-slate-200 p-5 mt-4">
      <h2 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-200 pb-2">Related Product Recommendations</h2>
      <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
        {products.map(p => (
          <div key={p.id} className="w-48 flex-shrink-0">
            <ProductCard product={p} formatCurrencyValue={formatCurrencyValue} />
          </div>
        ))}
      </div>
    </div>
  );
}
