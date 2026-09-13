import React, { cache } from 'react';
import type { Metadata } from 'next';
import { getCategoryById, getProducts } from '@/lib/api/marketplace';
import { categoryMeta } from '@/lib/seo/metadata';
import { itemListSchema, breadcrumbSchema } from '@/lib/seo/schema';
import { JsonLd } from '@/components/seo/json-ld';
import { productPath } from '@/lib/marketplace/product-url';
import { requestCurrency, requestCountry } from '@/lib/localization/request-region';
import { CatalogFilters } from '../../components/catalog-filters';
import {
  CatalogListingHeader,
  CatalogListingNotice,
  type ListingChip,
  type TrailStep,
} from '../../components/catalog-listing';
import { catalogRows, mapCatalogRow, type CatalogCardRow } from '../../components/catalog-row';

/**
 * `/category/[id]` — a listing for one node of the category tree.
 *
 * Data flow, in one direction:
 *
 *   URL (slug or uuid) → getCategoryById → the canonical category row
 *   category.slug + market → getProducts → the first page of cards
 *   both → this server render → CatalogFilters (client), keyed on identity
 *
 * There is no second source. No client fetch re-requests the first page, no
 * effect copies server props into state, and nothing bundled stands in when
 * the catalogue is unreachable — the page says so instead.
 *
 * `getCategoryById` is memoised for the request so `generateMetadata` and the
 * page body share one lookup.
 */
const loadCategory = cache(async (id: string) => {
  try {
    return await getCategoryById(id);
  } catch {
    return null;
  }
});

/** A readable name for a slug when the category could not be resolved. */
function titleFromSlug(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ subcategory?: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const { subcategory } = await searchParams;
  const category = await loadCategory(id);
  const name = category?.name || titleFromSlug(id);

  const meta = categoryMeta({
    name,
    slug: category?.slug ?? id,
    count: Number(category?.productCount) || undefined,
    description: category?.description || undefined,
  });

  // A filtered view is the same set of products under a different arrangement.
  // Left indexable it competes with the category page it was cut from, so the
  // filter is excluded and its canonical points back at the unfiltered listing
  // that `categoryMeta` already produced.
  if (subcategory) {
    return { ...meta, robots: { index: false, follow: true } };
  }
  return meta;
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ subcategory?: string }>;
}) {
  const { id } = await params;
  const { subcategory: activeSub } = await searchParams;

  // Memoised above — `generateMetadata` already resolved this for the request.
  const category = await loadCategory(id);
  const categoryName = category?.name || titleFromSlug(id);

  // This route addresses BOTH levels of the category tree — the homepage grid
  // and /category-list link every row here, subcategories included. A product
  // stores its parent in `category_id` and its child in `subcategory_id`, so
  // filtering a subcategory slug as `category=` matches nothing. Everything
  // below branches on what the slug actually resolved to.
  const isSubcategoryRoute = Boolean(category?.isSubcategory ?? category?.parent);
  const parentCategory: { name?: string; slug?: string } | null = category?.parent ?? null;

  // Real subcategory rows only: they carry slugs, so they can be filtered. A
  // leaf legitimately has none, and nothing bundled is grafted on in that case.
  const subcategories: { label: string; slug: string }[] = Array.isArray(category?.subcategories)
    ? category.subcategories
        .filter((c: any) => c?.name && c?.slug)
        .map((c: any) => ({ label: c.name, slug: c.slug }))
    : [];

  // Filter by the **resolved** category's slug, not by the raw route segment:
  // the catalogue filters on `category.slug`, so a uuid in the URL would match
  // nothing and be indistinguishable from an empty category. Falling back to
  // the raw segment keeps the page working when the lookup itself failed.
  const filterSlug = category?.slug ?? id;

  // The market this request browses. Resolved once, used for the server query,
  // the "show more" continuation and the client component's identity key, so
  // every row on the page comes from one market.
  const country = await requestCountry();

  let products: CatalogCardRow[] = [];
  let loadFailed = false;
  try {
    const res: any = await getProducts({
      ...(isSubcategoryRoute
        ? { subcategory: filterSlug }
        : { category: filterSlug, ...(activeSub ? { subcategory: activeSub } : {}) }),
      limit: '48',
      // A server component cannot send the region header (it comes from the
      // browser cookie), so the market travels explicitly — without it the
      // gateway scoped this listing by IP and India saw Qatari offers.
      country,
    });
    products = catalogRows(res).map(mapCatalogRow);
  } catch {
    products = [];
    loadFailed = true;
  }

  // Structured data: the same trail the visible breadcrumb renders, so the
  // two cannot disagree. Emitted only when the fetch succeeded — an ItemList
  // of zero products on a failed load tells a crawler the category is empty.
  const trail: TrailStep[] = [
    { name: 'Home', href: '/' },
    { name: 'Categories', href: '/category-list' },
    ...(parentCategory?.slug
      ? [
          {
            name: parentCategory.name ?? parentCategory.slug,
            href: `/category/${parentCategory.slug}`,
          },
        ]
      : []),
    { name: categoryName },
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
    categoryName,
  );
  const breadcrumbJsonLd = breadcrumbSchema(
    trail.map((step) => ({
      name: step.name,
      url: step.href
        ? `/marketplace${step.href === '/' ? '' : step.href}`
        : `/marketplace/category/${filterSlug}`,
    })),
  );

  const chips: ListingChip[] = subcategories.map(({ label, slug }) => ({
    label,
    href: `/category/${id}?subcategory=${encodeURIComponent(slug)}`,
    active: slug === activeSub,
  }));

  const countLabel = loadFailed
    ? 'Product list unavailable'
    : `${products.length} ${products.length === 1 ? 'product' : 'products'}${
        activeSub && !isSubcategoryRoute ? ' in this subcategory' : ''
      }`;

  const loadMorePath = isSubcategoryRoute
    ? `/products?subcategory=${encodeURIComponent(filterSlug)}&country=${country}`
    : `/products?category=${encodeURIComponent(filterSlug)}${
        activeSub ? `&subcategory=${encodeURIComponent(activeSub)}` : ''
      }&country=${country}`;

  return (
    <div className="min-h-screen pb-mobile-nav">
      {!loadFailed && products.length > 0 && <JsonLd data={[listJsonLd, breadcrumbJsonLd]} />}

      <CatalogListingHeader
        trail={trail}
        title={categoryName}
        iconName={category?.icon}
        countLabel={countLabel}
        chips={chips}
        clearHref={activeSub && !isSubcategoryRoute ? `/category/${id}` : undefined}
      />

      {loadFailed && <CatalogListingNotice retryHref={`/category/${id}`} />}

      {/* Keyed on the listing's identity — category, subcategory filter and
          market — so React mounts a fresh instance whenever any of them
          changes. The server render is the only source of the product list;
          the client component holds it as initial state and must never carry
          one listing's rows, filters or pages into another. */}
      <CatalogFilters
        key={`${category?.id ?? filterSlug}:${activeSub ?? ''}:${country}`}
        products={products}
        listingName={categoryName}
        iconName={category?.icon || undefined}
        pageSize={48}
        // Same filter AND same market as the server query, so page 2 continues
        // the same listing rather than a differently-scoped one.
        loadMorePath={loadMorePath}
      />
    </div>
  );
}
