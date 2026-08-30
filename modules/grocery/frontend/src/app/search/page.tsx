'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, ArrowLeft, Star, Clock, MapPin, Plus, Minus, SlidersHorizontal, ChevronDown, X, Truck } from 'lucide-react';
// The seven fixture arrays and `GROCERY_STORES` went with the local-search
// fallback that read them; only the shared helpers and the types remain.
import { groceryDiscountPercent } from '@/lib/demo-data/grocery-home';
import type { GroceryStore, GroceryProduct } from '@/lib/demo-data/grocery-home';
import { useGroceryLocale } from '@/i18n/grocery-locale';
import { groceryApi } from '@/lib/grocery-api';
import { useGroceryCart, type GroceryCartItem } from '@/lib/contexts/grocery-cart-context';
import { StoreSwitchDialog } from '@/components/grocery/store-switch-dialog';
import { useAsyncData } from '@/lib/hooks/use-async-data';
import { storePath, productPath } from '@/lib/grocery/urls';

import { ProductThumb, THUMB_SIZES } from '@/components/marketplace/product-thumb';
import { zoneHref } from '@/lib/routes/zone-href';
/**
 * A search result tile.
 *
 * ADD incremented a local `qty` and put nothing in any basket — the same defect
 * the store and category tiles had.
 */

function SearchProductCard({
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
        <div className="absolute top-2 left-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded z-10">{discount}% OFF</div>
      )}
      <Link href={zoneHref(productPath({ id: product.id, name: product.name, storeName: product.storeName }))} className="block">
        {/* One square well per tile. ProductThumb measures object-fit per image
            rather than assuming, and falls back to the emoji when a product has
            no picture — so the grid keeps its rhythm either way. */}
        <div className="w-full aspect-square bg-linear-to-br from-slate-50 to-slate-100 rounded-lg mb-2 overflow-hidden">
          {product.imageUrl ? (
            <ProductThumb src={product.imageUrl} alt={product.name} sizes={THUMB_SIZES.grid4} className="rounded-lg" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"><span className="text-4xl">{product.emoji}</span></div>
          )}
        </div>
        <div className="flex-1">
          <p className="text-[9px] text-slate-400 uppercase tracking-widest font-semibold mb-0.5">{product.brand}</p>
          {product.storeName && (
            <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5 mb-0.5">
              <span className="w-2.5 h-2.5 bg-emerald-100 rounded-full inline-flex items-center justify-center text-[7px]">🏪</span>
              {product.storeName}
            </p>
          )}
          <h3 className="font-semibold text-slate-800 text-sm leading-tight mb-1 line-clamp-2 group-hover:text-green-600 transition-colors">{product.name}</h3>
          <p className="text-xs text-slate-500 font-medium mb-2">{product.weight}</p>
        </div>
      </Link>
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-50">
        <div className="flex flex-col">
          <span className="font-bold text-sm text-slate-900">{formatPrice(product.price)}</span>
          {product.mrp > product.price && <span className="text-[10px] text-slate-400 line-through">{formatPrice(product.mrp)}</span>}
        </div>
        {qty === 0 ? (
          <button onClick={() => setQty(1)} className="bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-lg px-4 min-h-[44px] text-sm font-bold transition-colors flex items-center justify-center gap-1">{tr('ADD')}<Plus className="w-4 h-4" />
          </button>
        ) : (
          <div className="flex items-center bg-green-600 text-white rounded-lg overflow-hidden">
            <button onClick={() => setQty(Math.max(0, qty - 1))} className="min-h-[44px] min-w-[36px] flex items-center justify-center hover:bg-green-700" aria-label={tr('Decrease')}><Minus className="w-4 h-4" /></button>
            <span className="text-sm font-bold px-1 min-w-[20px] text-center">{qty}</span>
            <button onClick={() => setQty(qty + 1)} className="min-h-[44px] min-w-[36px] flex items-center justify-center hover:bg-green-700" aria-label={tr('Increase')}><Plus className="w-4 h-4" /></button>
          </div>
        )}
      </div>
    </div>
  );
}

function SearchContent() {
  const { tr } = useGroceryLocale();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [sortBy, setSortBy] = useState<'relevance' | 'price-low' | 'price-high'>('relevance');
  const [pendingItem, setPendingItem] = useState<GroceryCartItem | null>(null);
  const { add, clear: clearCart, storeName: cartStoreName } = useGroceryCart();

  // Debounced so a request does not go out per keystroke. Only the timer is
  // cancelled here; discarding a request that has already left is the job of
  // `useAsyncData` below.
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  /**
   * The debounce alone did not make this safe. Clearing the timer stops a request
   * that has not been sent yet, but once two are in flight — easy on a slow
   * connection, where 300ms of typing pause happens often — whichever *returned*
   * last won. Searching for "milk" could settle on the results for "mil".
   * `useAsyncData` drops a response whose query has since been superseded.
   */
  const { data: searchHits, loading: searching, error: searchError } = useAsyncData<GroceryProduct[]>(
    async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) return [];
      const res = await groceryApi.searchProducts(debouncedQuery);
      // Normalised so store name and the headline variant's pricing are always
      // present, whichever shape the catalogue returned.
      return ((res.results ?? []) as any[]).map((p: any) => ({
        id: p.id, name: p.name, brand: p.brand || 'Store Brand',
        weight: p.weightVariants?.[0]?.weight || p.weight || '1 unit',
        unit: p.weightVariants?.[0]?.weight?.replace(/[0-9\s]/g, '') || p.unit || 'unit',
        price: Number(p.weightVariants?.[0]?.price ?? p.price ?? 0),
        mrp: Number(p.weightVariants?.[0]?.mrp ?? p.mrp ?? p.price ?? 0),
        imageUrl: typeof p.imageUrl === 'string' ? p.imageUrl : undefined,
        emoji: '🛒',
        category: p.category || 'grocery',
        inStock: p.isAvailable ?? p.inStock ?? true,
        storeName: p.storeName || '',
        storeId: p.storeId,
      }));
    },
    [debouncedQuery],
  );
  // A failed search is not "no matches" — the banner says which it was, and the
  // stale hits are cleared so nothing unbuyable is left on screen. Memoised
  // because the sort below takes this as a dependency; a bare ternary would hand
  // it a new array every render.
  const apiResults = useMemo(
    () => (searchError ? [] : (searchHits ?? [])),
    [searchError, searchHits],
  );

  // Dynamic page title for SEO
  useEffect(() => {
    document.title = query ? `Search: ${query} — KARTSEEK Grocery` : 'Search — KARTSEEK Grocery';
  }, [query]);

  /**
   * Results come from the catalogue, not from the demo fixtures.
   *
   * This used to search `ALL_PRODUCTS` locally, append the API's hits on top and
   * fall back to the local list entirely when the request failed — so a search for
   * "milk" during an outage returned a full page of products that cannot be bought,
   * indistinguishable from a working search. Store matching came from
   * `GROCERY_STORES`, the demo catalogue, for the same reason.
   */
  const results = useMemo(() => {
    const sorted = [...apiResults];
    if (sortBy === 'price-low') sorted.sort((a, b) => a.price - b.price);
    if (sortBy === 'price-high') sorted.sort((a, b) => b.price - a.price);
    return { products: sorted, stores: [] as GroceryStore[] };
  }, [sortBy, apiResults]);

  return (
    <div className="max-w-7xl 3xl:max-w-app-wide mx-auto px-2 2xs:px-3 xs:px-4 md:px-6 xl:px-8 py-4 xs:py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="touch-target -ml-2 shrink-0 text-slate-500 hover:text-green-600 transition-colors" aria-label={tr('Back')}>
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 relative">
          {/* The page's only search field had no accessible name — a placeholder
              is not one, so a screen reader announced it as an unlabelled text
              box. `type="search"` also gives it the right role. */}
          <input
            type="search" value={query} onChange={e => setQuery(e.target.value)} autoFocus
            aria-label={tr('Search groceries')}
            placeholder={tr('Search for groceries, stores, brands...')}
            className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500/20 focus:border-green-400 outline-none text-sm"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3.5 top-3" title={tr('Clear search')}>
              <X className="w-4 h-4 text-slate-400 hover:text-red-500" />
            </button>
          )}
        </div>
      </div>

      {/* Stores */}
      {results.stores.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-bold text-slate-800 mb-3">Stores ({results.stores.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {results.stores.slice(0, 4).map(store => (
              <Link key={store.id} href={zoneHref(storePath(store))} className="bg-white border border-slate-200/80 rounded-xl p-3 flex items-center gap-3 hover:shadow-md transition-shadow group">
                <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center shrink-0">
                  <span className="text-2xl">{store.emoji}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm text-slate-800 group-hover:text-green-600 transition-colors truncate">{store.name}</h3>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                    <span className="flex items-center gap-0.5"><Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500" /> {store.rating}</span>
                    <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" /> {store.deliveryTime}</span>
                    <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" /> {store.distance}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Products */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-800">Products ({results.products.length})</h2>
          <div className="flex items-center gap-2">
            <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)} aria-label={tr('Sort products')} className="text-sm border border-slate-200 rounded-lg px-2 min-h-[44px] bg-white outline-none focus:ring-2 focus:ring-green-500/20">
              <option value="relevance">{tr('Sort by: Relevance')}</option>
              <option value="price-low">{tr('Price: Low to High')}</option>
              <option value="price-high">{tr('Price: High to Low')}</option>
            </select>
          </div>
        </div>

        {searching ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 xs:gap-3" aria-busy="true">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-56 bg-white border border-slate-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : searchError ? (
          <div role="alert" className="bg-white border border-red-200 rounded-xl p-12 text-center">
            <span className="text-5xl mb-4 block" aria-hidden="true">⚠️</span>
            <h3 className="text-lg font-bold text-slate-700 mb-1">{tr('Search is unavailable')}</h3>
            <p className="text-sm text-slate-500 mb-4">{searchError}</p>
            <button onClick={() => setQuery(q => q)} className="text-green-600 font-semibold text-sm hover:underline">{tr('Try again')}</button>
          </div>
        ) : !query || query.length < 2 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
            <span className="text-5xl mb-4 block" aria-hidden="true">🔍</span>
            <h3 className="text-lg font-bold text-slate-700 mb-1">{tr('Search the catalogue')}</h3>
            <p className="text-sm text-slate-500">{tr('Type at least two characters to start.')}</p>
          </div>
        ) : results.products.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
            <span className="text-5xl mb-4 block" aria-hidden="true">🔍</span>
            <h3 className="text-lg font-bold text-slate-700 mb-1">{tr('No results found')}</h3>
            <p className="text-sm text-slate-500 mb-4">Nothing in the catalogue matches “{query}”.</p>
            <button onClick={() => setQuery('')} className="text-green-600 font-semibold text-sm hover:underline">{tr('Clear Search')}</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 xs:gap-3">
            {results.products.map(product => (
              <SearchProductCard key={product.id} product={product} onStoreConflict={setPendingItem} />
            ))}
          </div>
        )}
      </section>

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

export default function GrocerySearchPage() {
  const { tr } = useGroceryLocale();
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">{tr('Loading search...')}</div>}>
      <SearchContent />
    </Suspense>
  );
}
