import React, { cache } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getCategoryById, getProducts } from '@/lib/api/marketplace';
import { categoryMeta } from '@/lib/seo/metadata';
import { CATEGORIES } from '@/lib/demo-data/marketplace-home';
import {
  Smartphone, Laptop, Shirt, Sofa, Dumbbell, Baby,
  Sparkles, BookOpen, Car, ShoppingBasket, Tv, Headphones,
} from 'lucide-react';
import CategoryFilters from './category-filters';
import { buyBoxPrice } from '@/lib/api/map-catalog-product';
import { productImageList } from '@/lib/product-image';
import { itemListSchema, breadcrumbSchema } from '@/lib/seo/schema';
import { JsonLd } from '@/components/seo/json-ld';
import { productPath } from '@/lib/marketplace/product-url';
import { requestCurrency } from '@/lib/localization/request-region';

/** Turn a human-readable label like "Smartphones" into a URL-safe slug */
function slugify(label: string): string {
  return label
    // Decompose accents so "Décor" slugs to `decor`, matching the catalog. Left
    // as-is, `é` fell through to the punctuation rule and produced `d-cor`,
    // which matches no subcategory row.
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const ICON_MAP: Record<string, React.ElementType> = {
  Smartphone, Laptop, Shirt, Sofa, Dumbbell, Baby, Sparkles, BookOpen,
  Car, ShoppingBasket, Tv, Headphones,
};

// ── Deterministic product data generator (no random prices) ─────────────────
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

// No mock fallbacks allowed for category data.

/**
 * Category listings are the storefront's head terms — "laptops", "womens
 * fashion" — and every one of them shared the marketplace layout's single
 * title and description. Two categories that rank for entirely different
 * queries were, to a crawler, the same page.
 *
 * `getCategoryById` is memoised for the request so the page body's own call
 * costs nothing extra.
 */
const loadCategory = cache(async (id: string) => {
  try {
    return await getCategoryById(id);
  } catch {
    return null;
  }
});

export async function generateMetadata({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ subcategory?: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const { subcategory } = await searchParams;
  const category = await loadCategory(id);
  const name = category?.name
    || id.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

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

export default async function CategoryPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ subcategory?: string }>;
}) {
  const { id } = await params;
  const { subcategory: activeSub } = await searchParams;

  // Memoised above — `generateMetadata` already resolved this for the request.
  const category = await loadCategory(id);

  const categoryName = category?.name
    || id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  // This route addresses BOTH levels of the category tree — the homepage grid
  // and /category-list link every row here, subcategories included. A product
  // stores its parent in `category_id` and its child in `subcategory_id`, so
  // filtering a subcategory slug as `category=` matches nothing. Everything
  // below branches on what the slug actually resolved to.
  const isSubcategoryRoute = Boolean(category?.isSubcategory ?? category?.parent);
  const parentCategory: { name?: string; slug?: string } | null = category?.parent ?? null;

  // Prefer real subcategory rows (they carry slugs, so they can be filtered);
  const dbSubs: { label: string; slug: string }[] = Array.isArray(category?.subcategories)
    ? category.subcategories
        .filter((c: any) => c?.name && c?.slug)
        .map((c: any) => ({ label: c.name, slug: c.slug }))
    : [];

  // Fall back to bundled demo categories when the DB is empty — this keeps
  // subcategory pills visible even before seed data is loaded. Skipped for a
  // leaf: a subcategory legitimately has no children, and the fallback would
  // graft on pills belonging to a same-named top-level demo category.
  let subcategories = dbSubs;
  if (subcategories.length === 0 && !isSubcategoryRoute) {
    const demoCat = CATEGORIES.find(c => c.id === id);
    if (demoCat) {
      subcategories = demoCat.subcategories.map(sub => ({
        label: sub,
        slug: slugify(sub),
      }));
    }
  }

  // Filter by the **resolved** category's slug, not by the raw route segment.
  //
  // This is the durable guard against the class of bug that made the product
  // page's breadcrumb render "No products found": the catalogue filters on
  // `category.slug`, so any caller that addressed this route with a uuid — as
  // `product.category?.id` did — produced a query that matched nothing. The
  // page could not tell that apart from a genuinely empty category, so it
  // showed the empty-state message and the real fault stayed invisible.
  //
  // `getCategoryById` accepts either key and hands back the canonical row, so
  // taking the slug from it makes this page correct whichever identifier the
  // link used. Falling back to the raw segment keeps the page working when the
  // metadata lookup itself failed.
  const filterSlug = category?.slug ?? id;

  // A zero result is now unambiguous, which is what lets the three states below
  // stay honest: `loadFailed` = the request broke, `categoryUnknown` = the
  // identifier matched no category, and an empty list = the category is real
  // and has nothing in it.
  const categoryUnknown = !category;

  let products: CatProduct[] = [];
  let loadFailed = false;
  try {
    const res: any = await getProducts({
      ...(isSubcategoryRoute
        ? { subcategory: filterSlug }
        : { category: filterSlug, ...(activeSub ? { subcategory: activeSub } : {}) }),
      limit: '48',
    });
    const list = res?.data ?? res?.products ?? [];
    products = (Array.isArray(list) ? list : []).map((p: any): CatProduct => {
      const price = buyBoxPrice(p);
      return {
        id: p.id,
        title: p.name ?? p.title ?? 'Product',
        brand: p.brand?.name ?? (typeof p.brand === 'string' ? p.brand : ''),
        price,
        mrp: Number(p.mrp ?? price),
        rating: Number(p.averageRating ?? p.rating ?? 0),
        reviews: String(p.reviewCount ?? p.reviews ?? 0),
        // Carried so the filter panel can offer "Newest" and "Best Selling".
        // Baymard's listing research (#511) names price, rating, best-selling
        // and newest as the four sorts a listing should support; this page had
        // the first two and no field to compute the others from.
        createdAt: p.created_at ?? p.createdAt ?? undefined,
        badge: p.badge || undefined,
        imageUrl: productImageList(p)[0],
        images: productImageList(p),
        variantAxes: p.variantAxes ?? undefined,
      };
    });
  } catch {
    products = [];
    loadFailed = true;
  }
  const iconName = category?.icon || '';
  const colorClass = 'bg-slate-100 text-slate-600'; // Default styling
  const CatIcon = ICON_MAP[iconName] || ShoppingBasket;

  // Structured data. Until now only the product detail page emitted any, so a
  // category — the page that actually ranks for "buy <category> online" — was
  // an untyped list of links to a crawler. The trail mirrors the visible
  // breadcrumb above rather than being composed separately, so the two cannot
  // disagree.
  const trail = [
    { name: 'Home', url: '/marketplace' },
    { name: 'Categories', url: '/marketplace/category-list' },
    ...(parentCategory?.slug
      ? [{ name: parentCategory.name ?? parentCategory.slug, url: `/marketplace/category/${parentCategory.slug}` }]
      : []),
    { name: categoryName, url: `/marketplace/category/${filterSlug}` },
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

  return (
    <div className="bg-slate-50 min-h-screen pb-mobile-nav">
      {/* Emitted only when the fetch succeeded — an ItemList of zero products
          on a failed load tells a crawler the category is empty. */}
      {!loadFailed && products.length > 0 && (
        <JsonLd data={[listJsonLd, breadcrumbSchema(trail)]} />
      )}

      {/* Breadcrumb + Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 xs:px-4 py-4">

          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2 flex-wrap">
            <Link href="/marketplace" className="hover:text-blue-600 transition-colors">Home</Link>
            <span>/</span>
            <Link href="/marketplace/category-list" className="hover:text-blue-600 transition-colors">Categories</Link>
            {/* A subcategory reached through this route sits one level deeper —
                show the parent so the trail is walkable in both directions. */}
            {parentCategory?.slug && (
              <>
                <span>/</span>
                <Link href={`/marketplace/category/${parentCategory.slug}`} className="hover:text-blue-600 transition-colors">
                  {parentCategory.name ?? parentCategory.slug}
                </Link>
              </>
            )}
            <span>/</span>
            <span className="text-slate-900 font-semibold">{categoryName}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClass} shrink-0`}>
              <CatIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900">{categoryName}</h1>
              <p className="text-sm text-slate-500">
                {loadFailed
                  ? 'Product list unavailable'
                  : `${products.length} ${products.length === 1 ? 'product' : 'products'} found${activeSub && !isSubcategoryRoute ? ' in this subcategory' : ''}`}
              </p>
            </div>
          </div>
          {/* Subcategory pills — these were non-interactive <span>s styled to
              look clickable. Real subcategory rows carry a slug, so they filter
              this listing for real; bundled fallback labels have no slug and can
              only feed a search query. */}
          {subcategories.length > 0 && (
            <div className="chip-row mt-4">
              {activeSub && (
                <Link
                  href={`/marketplace/category/${id}`}
                  className="text-xs bg-slate-800 text-white px-3 py-2 rounded-full font-semibold whitespace-nowrap shrink-0 min-h-9 inline-flex items-center gap-1.5 hover:bg-slate-900 transition-colors"
                >
                  Clear filter <span aria-hidden="true">×</span>
                </Link>
              )}
              {subcategories.map(({ label, slug }) => {
                const isActive = !!slug && slug === activeSub;
                const href = slug
                  ? `/marketplace/category/${id}?subcategory=${encodeURIComponent(slug)}`
                  : `/marketplace/search?q=${encodeURIComponent(label)}`;
                return (
                  <Link
                    key={slug || label}
                    href={href}
                    aria-current={isActive ? 'page' : undefined}
                    className={`text-xs px-3 py-2 rounded-full font-medium border transition-colors whitespace-nowrap shrink-0 min-h-9 inline-flex items-center ${
                      isActive
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100 active:bg-blue-200'
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>
          )}

        </div>
      </div>

      {/* A load failure is surfaced as a banner *above* the normal page, never
          in place of it — the grid and filter sidebar must stay reachable so a
          catalog hiccup doesn't leave the user on a dead end. */}
      {loadFailed && (
        <div className="max-w-7xl mx-auto px-3 xs:px-4 pt-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-amber-900">Couldn&apos;t load products for this category</p>
              <p className="text-xs text-amber-800/80 mt-0.5">
                The catalog service didn&apos;t respond, so this list is incomplete rather than empty.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link href={`/marketplace/category/${id}`} className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors">
                Retry
              </Link>
              <Link href={`/marketplace/search?q=${encodeURIComponent(categoryName)}`} className="border border-amber-300 text-amber-900 text-xs font-semibold px-4 py-2 rounded-lg hover:bg-amber-100 transition-colors">
                Search instead
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Filter + Product Grid (client component) */}
      <CategoryFilters
        products={products}
        categoryName={categoryName}
        iconName={iconName}
        pageSize={48}
        // Mirrors the server query above, so page 2 continues the same listing
        // rather than a differently-filtered one.
        loadMorePath={
          isSubcategoryRoute
            ? `/marketplace/products?subcategory=${encodeURIComponent(filterSlug)}`
            : `/marketplace/products?category=${encodeURIComponent(filterSlug)}${activeSub ? `&subcategory=${encodeURIComponent(activeSub)}` : ''}`
        }
      />
    </div>
  );
}
