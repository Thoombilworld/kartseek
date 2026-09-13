import React, { cache } from 'react';
import type { Metadata } from 'next';
import { categoryMeta, SITE_URL } from '@/lib/seo/metadata';
import { getProducts, getSubcategoryById } from '@/lib/api/marketplace';
import { itemListSchema, breadcrumbSchema } from '@/lib/seo/schema';
import { JsonLd } from '@/components/seo/json-ld';
import { productPath } from '@/lib/marketplace/product-url';
import { requestCurrency, requestCountry } from '@/lib/localization/request-region';
import { CatalogFilters } from '../../components/catalog-filters';
import {
  CatalogListingHeader,
  CatalogListingNotice,
  type TrailStep,
} from '../../components/catalog-listing';
import { catalogRows, mapCatalogRow, type CatalogCardRow } from '../../components/catalog-row';

/**
 * `/subcategory/[id]` — a listing for one leaf of the category tree.
 *
 * Same shell, same filter component and same one-way data flow as
 * `/category/[id]`; this route differs only in which column the catalogue
 * filters on (`subcategory_id`) and in accepting `?sort`, `?minPrice` and
 * `?maxPrice` as server-side query filters.
 *
 * Memoised so `generateMetadata` and the page body share one lookup.
 */
const loadSubcategory = cache(async (id: string) => {
  try {
    return await getSubcategoryById(id);
  } catch {
    return null;
  }
});

type Filters = { sort?: string; minPrice?: string; maxPrice?: string };

function titleFromSlug(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Filters>;
}): Promise<Metadata> {
  const { id } = await params;
  const filters = await searchParams;
  const decodedId = decodeURIComponent(id);
  const subcategory = await loadSubcategory(decodedId);
  const name = subcategory?.name ?? titleFromSlug(decodedId);

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
  searchParams: Promise<Filters>;
}) {
  const { id } = await params;
  const filters = await searchParams;
  const decodedId = decodeURIComponent(id);

  // Memoised above — `generateMetadata` already resolved this for the request.
  const subcategory: any = await loadSubcategory(decodedId);
  const displayName = subcategory?.name ?? titleFromSlug(decodedId);

  // Slug first, deliberately: `/category/[id]` filters on `category.slug`, so
  // the parent link must carry a slug, never a uuid.
  const parentSlug: string = subcategory?.parent?.slug ?? '';
  const parentName: string =
    subcategory?.parent?.name ?? (parentSlug ? titleFromSlug(parentSlug) : '');

  // Filter by the resolved subcategory's slug rather than the raw route
  // segment — a uuid in the URL would silently match nothing.
  const filterSlug = subcategory?.slug ?? decodedId;

  // One market for the query, the "show more" continuation and the identity key.
  const country = await requestCountry();

  const queryFilters = {
    ...(filters.sort ? { sort: filters.sort } : {}),
    ...(filters.minPrice ? { minPrice: filters.minPrice } : {}),
    ...(filters.maxPrice ? { maxPrice: filters.maxPrice } : {}),
  };

  let products: CatalogCardRow[] = [];
  let loadFailed = false;
  try {
    const res: any = await getProducts({
      subcategory: filterSlug,
      ...queryFilters,
      limit: '48',
      // Server component: the market must travel explicitly (see category page).
      country,
    });
    products = catalogRows(res).map(mapCatalogRow);
  } catch {
    products = [];
    loadFailed = true;
  }

  const trail: TrailStep[] = [
    { name: 'Home', href: '/' },
    { name: 'Categories', href: '/category-list' },
    ...(parentSlug ? [{ name: parentName, href: `/category/${parentSlug}` }] : []),
    { name: displayName },
  ];
  const listCurrency = await requestCurrency();
  const listJsonLd = itemListSchema(
    products.map((p) => ({
      name: p.title,
      url: productPath(p),
      image: p.imageUrl,
      price: p.price,
      currency: listCurrency,
    })),
    displayName,
  );
  const breadcrumbJsonLd = breadcrumbSchema(
    trail.map((step) => ({
      name: step.name,
      url: step.href
        ? `/marketplace${step.href === '/' ? '' : step.href}`
        : `/marketplace/subcategory/${filterSlug}`,
    })),
  );

  const countLabel = loadFailed
    ? 'Product list unavailable'
    : `${products.length} ${products.length === 1 ? 'product' : 'products'}`;

  const query = new URLSearchParams({ subcategory: filterSlug, ...queryFilters, country });
  const selfHref = `/subcategory/${id}`;

  return (
    <div className="min-h-screen pb-mobile-nav">
      {!loadFailed && products.length > 0 && <JsonLd data={[listJsonLd, breadcrumbJsonLd]} />}

      <CatalogListingHeader
        trail={trail}
        title={displayName}
        iconName={subcategory?.icon || subcategory?.parent?.icon}
        countLabel={countLabel}
      />

      {loadFailed && <CatalogListingNotice retryHref={selfHref} />}

      {/* Keyed on the listing's identity so filter and sort state never
          survive into a different subcategory, query or market. */}
      <CatalogFilters
        key={`${subcategory?.id ?? filterSlug}:${filters.sort ?? ''}:${filters.minPrice ?? ''}:${filters.maxPrice ?? ''}:${country}`}
        products={products}
        listingName={displayName}
        iconName={subcategory?.icon || subcategory?.parent?.icon || undefined}
        pageSize={48}
        loadMorePath={`/products?${query.toString()}`}
      />
    </div>
  );
}
