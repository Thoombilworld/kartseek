import React, { cache } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { categoryMeta, SITE_URL } from '@/lib/seo/metadata';
import { ChevronRight, SlidersHorizontal, ShoppingBasket } from 'lucide-react';
import { getProducts, getSubcategoryById } from '@/lib/api/marketplace';
import { ProductCard } from '../../components/product-card';
import SubcategoryFilters from './subcategory-filters';
import { buyBoxPrice, buyBoxMrp } from '@/lib/api/map-catalog-product';
import { productImageList } from '@/lib/product-image';
import { itemListSchema, breadcrumbSchema } from '@/lib/seo/schema';
import { JsonLd } from '@/components/seo/json-ld';
import { productPath } from '@/lib/marketplace/product-url';
import { requestCurrency, requestCountry } from '@/lib/localization/request-region';

/** Memoised so `generateMetadata` and the page body share one lookup. */
const loadSubcategory = cache(async (id: string) => {
  try {
    return await getSubcategoryById(id);
  } catch {
    return null;
  }
});

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sort?: string; minPrice?: string; maxPrice?: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const filters = await searchParams;
  const decodedId = decodeURIComponent(id);
  const subcategory = await loadSubcategory(decodedId);
  const name =
    subcategory?.name ??
    decodedId.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

  const meta = categoryMeta({
    name,
    slug: subcategory?.slug ?? decodedId,
    count: Number(subcategory?.productCount) || undefined,
    description: subcategory?.description || undefined,
  });

  // `categoryMeta` builds its canonical under /category; this route is its own.
  const canonical = `/marketplace/subcategory/${subcategory?.slug ?? decodedId}`;

  // Sort and price filters reorder and narrow one set of products. Indexing
  // each permutation puts near-identical pages in competition with the listing
  // itself, so only the unfiltered view is offered.
  const isFiltered = Boolean(filters.sort || filters.minPrice || filters.maxPrice);

  return {
    ...meta,
    alternates: { canonical: `${SITE_URL}${canonical}` },
    ...(isFiltered && { robots: { index: false, follow: true } }),
  };
}

export default async function SubcategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sort?: string; minPrice?: string; maxPrice?: string }>;
}) {
  const { id } = await params;
  const filters = await searchParams;
  const decodedId = decodeURIComponent(id);

  // Memoised above — `generateMetadata` already resolved this for the request.
  const subcategory: any = await loadSubcategory(decodedId);

  const displayName =
    subcategory?.name ??
    decodedId.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
  // Slug first, deliberately. `/marketplace/category/[id]` filters the catalogue
  // on `category.slug`, so a uuid in that segment matches nothing and the parent
  // category renders "No products found" — the same defect the product page's
  // breadcrumb had. The `parentCategoryId` this used to read first is a uuid by
  // name and happens to be null on all 113 category rows today, which is the
  // only reason the link works at all; it would have broken the moment that
  // column was populated.
  const parentCategorySlug = subcategory?.parent?.slug ?? '';

  // Filter by the resolved subcategory's slug rather than the raw route
  // segment — the catalogue matches on `subcategory.slug`, so a uuid in the URL
  // silently matches nothing and is indistinguishable from an empty
  // subcategory. `getSubcategoryById` accepts either key, so this makes the page
  // correct whichever identifier the link carried.
  const filterSlug = subcategory?.slug ?? decodedId;

  let products: any[] = [];
  let loadFailed = false;
  try {
    const res: any = await getProducts({
      subcategory: filterSlug,
      ...(filters.sort ? { sort: filters.sort } : {}),
      ...(filters.minPrice ? { minPrice: filters.minPrice } : {}),
      ...(filters.maxPrice ? { maxPrice: filters.maxPrice } : {}),
      limit: '48',
      // Server component: the market must travel explicitly (see category page).
      country: await requestCountry(),
    });
    const list = res?.data ?? res?.products ?? [];
    products = Array.isArray(list)
      ? list.map((p: any) => ({
          id: p.id,
          title: p.name ?? p.title ?? 'Product',
          brand: p.brand?.name ?? (typeof p.brand === 'string' ? p.brand : ''),
          price: buyBoxPrice(p),
          mrp: buyBoxMrp(p),
          rating: Number(p.averageRating ?? p.rating ?? 0),
          reviews: String(p.reviewCount ?? p.reviews ?? '0'),
          badge: p.badge || undefined,
          imageUrl: productImageList(p)[0],
          images: productImageList(p),
          delivery: p.delivery ?? undefined,
          variantAxes: p.variantAxes ?? undefined,
        }))
      : [];
  } catch {
    products = [];
    loadFailed = true;
  }

  // See the note on `category/[id]/page.tsx` — listings emitted no structured
  // data at all, so a subcategory read to a crawler as an untyped page of links.
  const listCurrency = await requestCurrency();
  const listJsonLd = itemListSchema(
    products.map((p: any) => ({
      name: p.title,
      url: productPath(p),
      image: p.imageUrl,
      price: p.price,
      currency: listCurrency,
    })),
    displayName,
  );
  const trail = [
    { name: 'Home', url: '/marketplace' },
    { name: 'Categories', url: '/marketplace/category-list' },
    { name: displayName, url: `/marketplace/subcategory/${decodedId}` },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 pb-mobile-nav">
      {!loadFailed && products.length > 0 && (
        <JsonLd data={[listJsonLd, breadcrumbSchema(trail)]} />
      )}
      {/* Hero */}
      <section className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <nav className="text-sm text-white/60 mb-3 flex items-center gap-1.5">
            <Link href="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3 h-3" />
            <Link href="/category-list" className="hover:text-white transition-colors">
              Categories
            </Link>
            {parentCategorySlug && (
              <>
                <ChevronRight className="w-3 h-3" />
                <Link
                  href={`/category/${parentCategorySlug}`}
                  className="hover:text-white transition-colors"
                >
                  {subcategory?.parent?.name ??
                    parentCategorySlug
                      .replace(/-/g, ' ')
                      .replace(/\b\w/g, (c: string) => c.toUpperCase())}
                </Link>
              </>
            )}
            <ChevronRight className="w-3 h-3" />
            <span className="text-white font-semibold">{displayName}</span>
          </nav>
          <h1 className="text-2xl font-extrabold">{displayName}</h1>
          <p className="text-white/70 mt-1">
            {loadFailed
              ? 'Product list unavailable'
              : `${products.length} ${products.length === 1 ? 'product' : 'products'} found`}
          </p>
        </div>
      </section>

      {/* Load failure banner */}
      {loadFailed && (
        <div className="max-w-7xl mx-auto px-4 pt-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-amber-900">
                Couldn&apos;t load products for this subcategory
              </p>
              <p className="text-xs text-amber-800/80 mt-0.5">
                The catalog service didn&apos;t respond. Try again or browse other categories.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link
                href={`/subcategory/${id}`}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
              >
                Retry
              </Link>
              <Link
                href="/category-list"
                className="border border-amber-300 text-amber-900 text-xs font-semibold px-4 py-2 rounded-lg hover:bg-amber-100 transition-colors"
              >
                Browse categories
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Product grid with client-side filter/sort */}
      <SubcategoryFilters products={products} subcategoryName={displayName} subcategoryId={id} />
    </div>
  );
}
