import React from 'react';
import Link from 'next/link';
import {
  Smartphone, Laptop, Shirt, Sofa, Dumbbell, Baby,
  Sparkles, BookOpen, Car, ShoppingBasket, Tv, ArrowRight,
} from 'lucide-react';
import { getCategories } from '@/lib/api/marketplace';

const ICON_MAP: Record<string, React.ElementType> = {
  Smartphone, Laptop, Shirt, Sofa, Dumbbell, Baby, Sparkles, BookOpen,
  Car, ShoppingBasket, Tv,
};

/** Uniform shape the template renders, whichever level a row sits at. */
interface NormalisedCategory {
  id: string;
  slug: string;
  label: string;
  iconName: string;
  color: string;
  imageUrl?: string;
  productCount?: number;
  subcategories: { label: string; slug: string }[];
}

/**
 * Group the flat category list into parents with their children.
 *
 * Built from `apiData.data`, not `apiData.tree`: the flat list is the one that
 * carries `parentId` and a real `productCount` per row, while `tree` is the raw
 * TypeORM closure result with neither. Grouping here also means a category
 * whose parent is missing or inactive still surfaces as a top-level entry
 * rather than disappearing from the directory entirely.
 */
function normaliseApiCategories(apiData: any): NormalisedCategory[] {
  const list: any[] = Array.isArray(apiData?.data) ? apiData.data
    : Array.isArray(apiData) ? apiData : [];
  if (!list.length) return [];

  const byId = new Map<string, any>(list.map((c) => [c.id, c]));
  const childrenOf = new Map<string, any[]>();
  for (const c of list) {
    if (!c.parentId || !byId.has(c.parentId)) continue;
    const bucket = childrenOf.get(c.parentId) ?? [];
    bucket.push(c);
    childrenOf.set(c.parentId, bucket);
  }

  return list
    .filter((c) => !c.parentId || !byId.has(c.parentId))
    .map((c) => {
      const children = childrenOf.get(c.id) ?? [];
      return {
        id: c.slug ?? c.id,
        slug: c.slug ?? c.id,
        label: c.name ?? c.label ?? 'Category',
        iconName: c.icon ?? '',
        color: 'bg-slate-100 text-slate-600',
        imageUrl: c.imageUrl ?? c.image ?? undefined,
        // The parent's own count is already the whole subtree: a product files
        // its parent in `category_id` and its child in `subcategory_id`, so it
        // is counted once against each. Adding the children back in double-
        // counted every product — the directory advertised 24 phones on a
        // category whose own page listed 12.
        productCount: Number(c.productCount ?? 0),
        subcategories: children
          .filter((s: any) => s?.name && s?.slug)
          .map((s: any) => ({ label: s.name, slug: s.slug })),
      };
    });
}

export default async function CategoriesPage() {
  let categories: NormalisedCategory[] = [];
  let failed = false;
  try {
    const apiRes = await getCategories();
    categories = normaliseApiCategories(apiRes);
  } catch {
    failed = true;
  }

  // No demo fallback. Swapping in `CATEGORIES` when the catalogue API is down
  // produced a browsable-looking directory whose every link led nowhere, and
  // hid the outage from the only people who could fix it.
  if (categories.length === 0) {
    return (
      <div className="bg-slate-50 min-h-screen pb-mobile-nav">
        <div className="max-w-7xl mx-auto px-3 xs:px-4 py-20 text-center">
          <ShoppingBasket className="w-14 h-14 text-slate-300 mx-auto mb-4" />
          <h1 className="text-xl font-black text-slate-900 mb-2">
            {failed ? 'Categories are unavailable right now' : 'No categories yet'}
          </h1>
          <p className="text-slate-500 text-sm mb-6">
            {failed
              ? 'We could not reach the catalogue. Please try again in a moment.'
              : 'The catalogue has no active categories to show.'}
          </p>
          <Link
            href="/marketplace"
            className="inline-block bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700"
          >
            Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  // Counted from what the catalogue actually holds, rather than the flat
  // "10,000+" that was printed regardless of how many products existed.
  const totalProducts = categories.reduce(
    (sum, c) => sum + (c.productCount ?? 0), 0,
  );

  return (
    <div className="bg-slate-50 min-h-screen pb-mobile-nav">
      {/* Page Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 xs:px-4 py-6">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <Link href="/marketplace" className="hover:text-blue-600 transition-colors">Home</Link>
            <span>/</span>
            <span className="text-slate-900 font-semibold">All Categories</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900">Browse All Categories</h1>
          <p className="text-slate-500 mt-1">
            {totalProducts > 0
              ? `Explore ${totalProducts.toLocaleString()} products across ${categories.length} categories`
              : `Explore ${categories.length} categories`}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 xs:px-4 pt-8">
        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {categories.map((cat) => {
            const Icon = ICON_MAP[cat.iconName] || ShoppingBasket;
            return (
              <div key={cat.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group">
                {/* Category Header */}
                <Link
                  href={`/marketplace/category/${cat.slug}`}
                  className="flex items-center gap-4 p-5 border-b border-slate-50 group-hover:bg-blue-50/30 transition-colors"
                >
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center overflow-hidden ${!cat.imageUrl ? cat.color : ''} group-hover:scale-110 transition-transform duration-200 shrink-0`}>
                    {cat.imageUrl ? (
                      <img src={cat.imageUrl} alt={cat.label} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <Icon className="w-7 h-7" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{cat.label}</h2>
                    <p className="text-xs text-slate-400">
                      {cat.subcategories.length > 0 && (
                        <>{cat.subcategories.length} subcategor{cat.subcategories.length === 1 ? 'y' : 'ies'}</>
                      )}
                      {cat.subcategories.length > 0 && (cat.productCount ?? 0) > 0 && ' · '}
                      {(cat.productCount ?? 0) > 0 && (
                        <>{cat.productCount!.toLocaleString()} product{cat.productCount === 1 ? '' : 's'}</>
                      )}
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all shrink-0" />
                </Link>

                {/* Subcategories — each link passes ?subcategory= filter */}
                <div className="p-5">
                  <div className="flex flex-wrap gap-2">
                    {cat.subcategories.map(({ label, slug }) => (
                      <Link
                        key={slug}
                        href={`/marketplace/category/${cat.slug}?subcategory=${encodeURIComponent(slug)}`}
                        className="text-sm bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 px-3.5 py-1.5 rounded-full border border-slate-100 hover:border-blue-200 transition-all font-medium"
                      >
                        {label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
