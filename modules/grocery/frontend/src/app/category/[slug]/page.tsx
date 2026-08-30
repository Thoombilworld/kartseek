'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, ChevronDown, ChevronRight, Star, Clock, Plus, Minus, SlidersHorizontal, Truck } from 'lucide-react';
// The seven fixture arrays this file used to concatenate into `ALL_PRODUCTS` are
// gone with the fallbacks that read them; only the shared formatters and the type
// are still needed from this module.
import { GROCERY_CATEGORIES, groceryDiscountPercent } from '@/lib/demo-data/grocery-home';
import type { GroceryProduct } from '@/lib/demo-data/grocery-home';
import { useGroceryLocale } from '@/i18n/grocery-locale';
import { groceryApi } from '@/lib/grocery-api';
import { useGroceryCart, type GroceryCartItem } from '@/lib/contexts/grocery-cart-context';
import { StoreSwitchDialog } from '@/components/grocery/store-switch-dialog';
import { AutoScrollRow } from '@/components/grocery/auto-scroll-row';
import { StoreThumb } from '@/components/grocery/store-thumb';
import type { GroceryStoreApi } from '@/lib/grocery-api';
import { storePath, productPath } from '@/lib/grocery/urls';

import { ProductThumb, THUMB_SIZES } from '@/components/marketplace/product-thumb';
import { useAsyncData } from '@/lib/hooks/use-async-data';
/**
 * A product tile in the category grid.
 *
 * ADD held a local `qty` and put nothing anywhere — the same defect the store
 * page's tiles had. It writes to the shared basket now, and respects the
 * single-store rule.
 */
function CategoryProductCard({
  product,
  onStoreConflict,
}: {
  product: GroceryProduct;
  onStoreConflict?: (item: GroceryCartItem) => void;
}) {
  const { formatPrice, tr } = useGroceryLocale();
  const { add, setQuantity, quantityOf, wouldReplaceCart } = useGroceryCart();
  const discount = groceryDiscountPercent(product.mrp, product.price);
  const storeId = product.storeId ?? '';
  const qty = quantityOf(product.id, product.weight);

  const asCartItem = (quantity: number): GroceryCartItem => ({
    productId: product.id,
    weight: product.weight,
    name: product.name,
    brand: product.brand,
    price: product.price,
    mrp: product.mrp,
    quantity,
    emoji: product.emoji,
    storeId,
    storeName: product.storeName ?? 'Store',
  });

  const setQty = (next: number) => {
    if (qty === 0 && next > 0 && wouldReplaceCart(storeId)) {
      onStoreConflict?.(asCartItem(1));
      return;
    }
    if (qty === 0) add(asCartItem(next));
    else setQuantity(product.id, product.weight, next);
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-xl p-3 flex flex-col relative group hover:shadow-md transition-all duration-200">
      {discount > 0 && (
        <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded z-10">{discount}% OFF</div>
      )}
      {product.freshLabel && (
        <div className="absolute top-2 right-2 bg-green-100 text-green-700 text-xs font-bold px-1.5 py-0.5 rounded z-10">{product.freshLabel}</div>
      )}
      {product.isVeg === false && (
        <div className={`absolute top-2 ${discount > 0 ? 'left-16' : 'left-2'} bg-red-600 text-white text-xs font-bold px-1.5 py-0.5 rounded z-10`}>{tr('NON-VEG')}</div>
      )}

      {/* Square well, image when the product has one, emoji otherwise — so the
          grid keeps its rhythm and no URL is ever rendered as text. */}
      <Link href={productPath({ id: product.id, name: product.name, storeName: product.storeName })} className="w-full aspect-square bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg mb-2.5 overflow-hidden flex items-center justify-center group-hover:from-green-50 group-hover:to-emerald-50 transition-colors">
        {product.imageUrl
          ? <ProductThumb src={product.imageUrl} alt={product.name} sizes={THUMB_SIZES.grid4} className="rounded-lg" />
          : <span className="text-4xl group-hover:scale-110 transition-transform duration-200">{product.emoji}</span>}
      </Link>

      <div className="flex-1">
        <p className="text-xs text-slate-400 font-medium">{product.brand}</p>
        {product.storeName && (
          <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5 mt-0.5">
            <span className="w-2.5 h-2.5 bg-emerald-100 rounded-full inline-flex items-center justify-center text-[7px]">🏪</span>
            {product.storeName}
          </p>
        )}
        <Link href={productPath({ id: product.id, name: product.name, storeName: product.storeName })} className="font-bold text-sm text-slate-900 line-clamp-2 hover:text-green-700 transition-colors">
          {product.name}
        </Link>
        <p className="text-xs text-slate-400 mt-0.5">{product.weight}</p>
      </div>

      <div className="mt-2 flex items-end justify-between">
        <div>
          <span className="text-sm font-black text-slate-900">{formatPrice(product.price)}</span>
          {product.mrp > product.price && <span className="text-xs text-slate-400 line-through ml-1">{formatPrice(product.mrp)}</span>}
        </div>
        {qty === 0 ? (
          <button onClick={() => setQty(1)} aria-label={`Add ${product.name} to cart`} className="min-h-[44px] px-4 bg-green-50 text-green-700 font-bold text-sm rounded-lg border border-green-200 hover:bg-green-100 transition-colors">
            ADD
          </button>
        ) : (
          <div className="flex items-center bg-green-600 rounded-lg overflow-hidden">
            <button onClick={() => setQty(Math.max(0, qty - 1))} aria-label={tr('Decrease quantity')} className="min-h-[44px] min-w-[36px] flex items-center justify-center text-white hover:bg-green-700 transition-colors">
              <Minus className="w-4 h-4" />
            </button>
            <span className="px-1 text-white text-sm font-bold min-w-[20px] text-center">{qty}</span>
            <button onClick={() => setQty(qty + 1)} aria-label={tr('Increase quantity')} className="min-h-[44px] min-w-[36px] flex items-center justify-center text-white hover:bg-green-700 transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * "Browse everything", not a category.
 *
 * The bottom nav's Categories tab and the homepage's "Shop by Category" heading
 * both link here, but no such row exists in `grocery_categories` — so the page
 * looked the slug up, found nothing, and invented a category called "All
 * Groceries" with a stock blurb ("Browse our curated selection of quality
 * grocery products."). It then filtered products on `category = 'all-groceries'`
 * and stores on the same value, both of which match nothing, leaving the app's
 * primary browse destination empty under a heading reading "Stores with All
 * Groceries".
 *
 * Treated as a sentinel it means the opposite of a filter: list the market's
 * whole catalogue and every shop serving it.
 */
const ALL_GROCERIES = 'all-groceries';

export default function CategoryPage() {
  const { tr } = useGroceryLocale();
  const params = useParams();
  const slug = params.slug as string;
  const [sortBy, setSortBy] = useState<'relevance' | 'price-low' | 'price-high' | 'discount'>('relevance');
  const [apiProducts, setApiProducts] = useState<GroceryProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingItem, setPendingItem] = useState<GroceryCartItem | null>(null);
  const { add, clear: clearCart, storeName: cartStoreName } = useGroceryCart();

  const isAll = slug === ALL_GROCERIES;
  const category = GROCERY_CATEGORIES.find(c => c.id === slug);
  const categoryName = isAll
    ? tr('All Groceries')
    : category?.name || slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const categoryEmoji = category?.emoji || '🛒';
  const categoryGradient = category?.gradient || 'from-green-600 to-emerald-500';
  // Only a category we actually know describes itself. An unrecognised slug gets
  // no blurb rather than a stock one that makes an empty page look intentional.
  const categoryDesc = isAll
    ? tr('Everything on sale near you, across every aisle.')
    : category?.description || '';

  /**
   * Products in this category.
   *
   * This used to call `searchProducts('fruits vegetables')` — a full-text search
   * for the slug with its hyphens swapped for spaces — and then read `res.data`,
   * a key the search response does not carry (it is `results`). So the request
   * matched only where a product *name* contained those words, and its result was
   * discarded regardless. `listProducts({ category })` filters on
   * `grocery_items.category`, which is what the slug actually keys.
   */
  useEffect(() => {
    groceryApi.listProducts(isAll ? { limit: 50 } : { category: slug, limit: 50 })
      .then((res: any) => {
        if (res?.data?.length > 0) {
          const mapped: GroceryProduct[] = res.data.map((p: any) => ({
            id: p.id, name: p.name, brand: p.brand || 'Store Brand',
            imageUrl: typeof p.imageUrl === 'string' ? p.imageUrl : undefined,
            emoji: '🛒', price: Number(p.weightVariants?.[0]?.price ?? 0),
            mrp: Number(p.weightVariants?.[0]?.mrp ?? 0), weight: p.weightVariants?.[0]?.weight || '1 unit',
            unit: p.weightVariants?.[0]?.weight?.replace(/[0-9\s]/g, '') || 'unit',
            category: p.category || slug, isVeg: p.isVeg, inStock: p.isAvailable ?? true,
            // No stand-in: the API now returns the real shop, and a product with
            // none should show no shop rather than one that does not exist.
            storeName: p.storeName || '', storeId: p.storeId,
          }));
          setApiProducts(mapped);
        }
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : 'Could not load this category'))
      .finally(() => setLoading(false));
  }, [slug, isAll]);

  // Dynamic page title for SEO
  useEffect(() => {
    document.title = `${categoryName} — KARTSEEK Grocery`;
  }, [categoryName]);

  /**
   * The category's products, from the catalogue only.
   *
   * Three separate fallbacks to the bundled fixtures used to sit here: the
   * category listing was built from `ALL_PRODUCTS`, an empty result was replaced
   * with `ALL_PRODUCTS.slice(0, 12)` — twelve arbitrary demo items shown under any
   * category that had nothing — and the API's own results were then merged on top
   * of that. A category with no stock looked identical to a busy one.
   */
  const products = useMemo(() => {
    const sorted = [...apiProducts];
    if (sortBy === 'price-low') sorted.sort((a, b) => a.price - b.price);
    if (sortBy === 'price-high') sorted.sort((a, b) => b.price - a.price);
    if (sortBy === 'discount') sorted.sort((a, b) => groceryDiscountPercent(b.mrp, b.price) - groceryDiscountPercent(a.mrp, a.price));
    return sorted;
  }, [sortBy, apiProducts]);

  /**
   * Shops that stock this category.
   *
   * Browsing a category showed a product grid and nothing about where any of it
   * came from, so there was no route from "I want fish" to "these shops sell
   * fish" — the thing a grocery shopper is usually deciding. An empty result
   * renders nothing rather than a placeholder: no shop stocking a category is a
   * real answer.
   */
  // `useAsyncData` discards a response whose slug has since changed, so moving
  // between categories quickly cannot settle on the previous one's store list.
  const { data: storesData, loading: storesLoading } = useAsyncData<GroceryStoreApi[]>(
    async () => (
      (isAll
        ? await groceryApi.getNearbyStores(undefined, undefined, 1, 12)
        : await groceryApi.getStoresByCategory(slug))?.data ?? []
    ) as GroceryStoreApi[],
    [slug, isAll],
  );
  const categoryStores = storesData ?? [];

  // Related categories
  const relatedCategories = GROCERY_CATEGORIES.filter(c => c.id !== slug).slice(0, 8);

  return (
    <div className="min-h-screen pb-12">
      {/* Category Hero */}
      <div className={`bg-gradient-to-r ${categoryGradient} relative overflow-hidden`}>
        <div className="max-w-7xl 3xl:max-w-app-wide mx-auto px-3 xs:px-4 md:px-8 py-5 xs:py-8 md:py-12 relative z-10">
          <div className="flex items-center gap-2 text-white/70 text-sm mb-2 xs:mb-4">
            <Link href="/" className="hover:text-white transition-colors inline-flex items-center min-h-[44px]">{tr('Grocery')}</Link>
            <span>/</span>
            <span className="text-white font-medium">{categoryName}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-4xl xs:text-5xl md:text-6xl">{categoryEmoji}</span>
            <div>
              <h1 className="text-xl xs:text-2xl md:text-4xl font-black text-white mb-1 xs:mb-2">{categoryName}</h1>
              <p className="text-white/80 text-xs xs:text-sm md:text-base max-w-lg">{categoryDesc}</p>
            </div>
          </div>
        </div>
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-white/5 rounded-full blur-2xl" />
      </div>

      <div className="max-w-7xl 3xl:max-w-app-wide mx-auto px-2 2xs:px-3 xs:px-4 md:px-8 mt-4 xs:mt-6">
        {/*
          Shops stocking this category, as a grid rather than a side rail.
          Choosing a shop is the decision that comes first — a shopper picking
          "Fresh Fish" wants to know who sells it near them, and the products
          below only mean anything once that is settled. This was a narrow
          horizontal strip that silently rendered nothing while loading and
          nothing again when no shop stocked the category, so an empty result
          was indistinguishable from a slow one.
        */}
        <section className="mb-8">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-lg font-bold text-slate-900">
              {isAll ? tr('Stores near you') : `${tr('Stores with')} ${categoryName}`}
            </h2>
            {categoryStores.length > 0 && (
              <Link href="/stores" className="text-sm font-semibold text-green-600 hover:text-green-700">
                {tr('View all')}
              </Link>
            )}
          </div>

          {storesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-24 bg-white border border-slate-200 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : categoryStores.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
              <p className="text-sm font-semibold text-slate-700">
                {tr('No store near you is stocking this category right now.')}
              </p>
              <Link
                href="/stores"
                className="inline-block mt-3 bg-green-600 text-white font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-green-700 transition-colors"
              >
                {tr('Browse stores')}
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {categoryStores.map((st) => (
                <Link
                  key={st.id}
                  href={storePath(st)}
                  className="group flex items-center gap-3 bg-white rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-green-300 transition-all p-3 min-h-[44px]"
                >
                  <StoreThumb logoUrl={st.logoUrl} emoji="🛒" name={st.name} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800 truncate group-hover:text-green-700 transition-colors">{st.name}</p>
                    <p className="text-xs text-slate-500 truncate">{st.address || ''}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {Number(st.rating) > 0 && (
                        <span className="text-xs text-amber-600 font-semibold">★ {Number(st.rating).toFixed(1)}</span>
                      )}
                      {Number(st.deliveryFee) === 0 && (
                        <span className="text-[10px] bg-green-50 text-green-700 font-bold px-1.5 py-0.5 rounded">
                          {tr('Free Delivery')}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-green-600 shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Filter & Sort Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-1 text-sm text-slate-600 hover:text-green-600 transition-colors">
              <ArrowLeft className="w-4 h-4" />{tr('Back')}</Link>
            <span className="text-slate-300">|</span>
            <span className="text-sm text-slate-500 font-medium">{products.length} products</span>
          </div>
          <div className="flex items-center gap-2">
            <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)} aria-label={tr('Sort products')} className="text-sm font-medium text-slate-600 border border-slate-200 px-3 min-h-[44px] rounded-lg bg-white outline-none focus:ring-2 focus:ring-green-500/20">
              <option value="relevance">{tr('Sort by: Relevance')}</option>
              <option value="price-low">{tr('Price: Low to High')}</option>
              <option value="price-high">{tr('Price: High to Low')}</option>
              <option value="discount">{tr('Discount: Highest First')}</option>
            </select>
          </div>
        </div>

        {/* Related Categories */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-4 snap-x -mx-2 px-2 2xs:-mx-3 2xs:px-3 xs:-mx-4 xs:px-4">
          {relatedCategories.map(cat => (
            <Link key={cat.id} href={`/category/${cat.id}`} className={`snap-start shrink-0 px-3.5 min-h-[44px] rounded-full text-sm font-semibold transition-colors flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-green-50 hover:text-green-600 hover:border-green-200`}>
              <span>{cat.emoji}</span> {cat.name}
            </Link>
          ))}
        </div>

        {/* Product Grid. An empty category and a failed request are different
            answers — the page used to render twelve arbitrary demo products for
            both. */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 xs:gap-3 md:gap-4" aria-busy="true">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-56 bg-white border border-slate-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : loadError ? (
          <div role="alert" className="bg-white border border-red-200 rounded-xl p-12 text-center">
            <span className="text-4xl mb-3 block" aria-hidden="true">⚠️</span>
            <h2 className="text-lg font-bold text-slate-700 mb-1">{tr('We could not load this category')}</h2>
            <p className="text-sm text-slate-500 mb-4">{loadError}</p>
            <button onClick={() => window.location.reload()} className="text-green-600 font-semibold text-sm hover:underline">{tr('Try again')}</button>
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
            <span className="text-4xl mb-3 block" aria-hidden="true">{categoryEmoji}</span>
            <h2 className="text-lg font-bold text-slate-700 mb-1">Nothing in {categoryName} yet</h2>
            <p className="text-sm text-slate-500 mb-4">{tr('No store near you is stocking this category right now.')}</p>
            <Link href="/stores" className="text-green-600 font-semibold text-sm hover:underline">{tr('Browse stores')}</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 xs:gap-3 md:gap-4">
            {products.map(product => (
              <CategoryProductCard key={product.id} product={product} onStoreConflict={setPendingItem} />
            ))}
          </div>
        )}
      </div>

      {pendingItem && (
        <StoreSwitchDialog
          currentStoreName={cartStoreName ?? 'another store'}
          newStoreName={pendingItem.storeName}
          onCancel={() => setPendingItem(null)}
          onReplace={() => { clearCart(); add(pendingItem); setPendingItem(null); }}
        />
      )}
    </div>
  );
}
