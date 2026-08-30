'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, PackageSearch } from 'lucide-react';
import { groceryApi } from '@/lib/grocery-api';
import { useAsyncData } from '@/lib/hooks/use-async-data';
import { useGroceryLocale } from '@/i18n/grocery-locale';
import { ProductThumb, THUMB_SIZES } from '@/components/marketplace/product-thumb';
import { brandLogoUrl } from '@/lib/grocery/brand-logo';
import { productPath } from '@/lib/grocery/urls';

/**
 * A brand's catalogue.
 *
 * This route used to `redirect()` to `/grocery/search?q=<slug>`, which was a
 * reasonable stopgap while brand was only a free-text column — but the brands on
 * the homepage came from a curated regional list (Almarai, NADEC, LuLu,
 * Carrefour) that shared no entries with `grocery_items.brand`. Every avatar
 * therefore redirected into a search that returned nothing.
 *
 * `GET /grocery/brands/:slug/products` resolves the slug against the brands the
 * catalogue actually has and returns that brand's products, region-scoped.
 */
export default function GroceryBrandDetailPage() {
  const { formatPrice, tr } = useGroceryLocale();
  const params = useParams();
  const slug = String(params.slug ?? '');

  const { data, loading, error } = useAsyncData(
    async () => groceryApi.getProductsByBrand(slug, 1, 60),
    [slug],
  );

  const products = data?.data ?? [];
  const brandName = data?.brand ?? slug.replace(/-/g, ' ');

  return (
    <div className="max-w-7xl mx-auto px-3 xs:px-4 md:px-8 py-5">
      <div className="flex items-center gap-3 mb-5">
        <Link href="/" className="text-slate-500 hover:text-green-600" aria-label={tr('Back')}>
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <span className="w-12 h-12 rounded-full overflow-hidden bg-white border border-slate-200 shrink-0">
          <img src={brandLogoUrl(brandName)} alt="" aria-hidden="true" className="w-full h-full object-contain" />
        </span>
        <div>
          <h1 className="text-xl font-bold text-slate-900 capitalize">{brandName}</h1>
          <p className="text-sm text-slate-500">
            {loading ? tr('Loading…') : `${data?.total ?? 0} ${tr('products')}`}
          </p>
        </div>
      </div>

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 mb-4">{error}</div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 ph:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3" aria-busy="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-56 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        // A brand with nothing on sale says so, rather than showing a curated
        // page for stock that does not exist.
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <PackageSearch className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-700 mb-1">{tr('Nothing from this brand right now')}</h2>
          <p className="text-sm text-slate-500 mb-4">{tr('No store in your area is stocking it today.')}</p>
          <Link href="/" className="text-green-600 font-semibold text-sm hover:underline">{tr('Browse groceries')}</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 ph:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {products.map((p: any) => {
            const variant = p.weightVariants?.[0] ?? {};
            return (
              <Link
                key={p.id}
                href={productPath({ id: p.id, name: p.name, storeName: p.storeName })}
                className="bg-white border border-slate-200/80 rounded-xl p-3 flex flex-col group hover:shadow-md transition-all"
              >
                <div className="w-full aspect-square bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg mb-2 overflow-hidden flex items-center justify-center">
                  {p.imageUrl
                    ? <ProductThumb src={p.imageUrl} alt={p.name} sizes={THUMB_SIZES.grid4} className="rounded-lg" />
                    : <span className="text-4xl">🛒</span>}
                </div>
                <h3 className="text-sm font-semibold text-slate-800 line-clamp-2 group-hover:text-green-600">{p.name}</h3>
                <p className="text-xs text-slate-500 mb-1">{variant.weight ?? ''}</p>
                <span className="font-bold text-sm text-slate-900 mt-auto">{formatPrice(Number(variant.price ?? 0))}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
