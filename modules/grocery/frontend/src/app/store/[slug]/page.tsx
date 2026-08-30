'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  MapPin, Star, Clock, Search, ChevronRight, Plus, Minus, Info,
  ShoppingCart, ArrowLeft, Truck, Shield, RefreshCw, Store as StoreIcon,
} from 'lucide-react';
import {
  findStoreById, GROCERY_STORES,
  groceryDiscountPercent,
} from '@/lib/demo-data/grocery-home';
import { useGroceryLocale } from '@/i18n/grocery-locale';
import type { GroceryProduct } from '@/lib/demo-data/grocery-home';
import { getFlashDealsByStore, type FlashDeal } from '@/lib/demo-data/grocery-home';
import { groceryApi } from '@/lib/grocery-api';
import { useGroceryCart, type GroceryCartItem } from '@/lib/contexts/grocery-cart-context';
import { StoreSwitchDialog } from '@/components/grocery/store-switch-dialog';
import { parseIdParam, storePath, isCanonicalStoreParam, productPath } from '@/lib/grocery/urls';
import { deliveryWindow } from '@/lib/grocery/delivery-estimate';
import { ProductThumb, THUMB_SIZES } from '@/components/marketplace/product-thumb';

import { brandLogoUrl } from '@/lib/grocery/brand-logo';
import { AutoScrollRow } from '@/components/grocery/auto-scroll-row';
// ── Store Categories for sidebar ──────────────────────────────────────────

const STORE_CATEGORIES = [
  { id: 'all', name: 'All Products', emoji: '🛒' },
  { id: 'fruits-vegetables', name: 'Fruits & Vegetables', emoji: '🥬' },
  { id: 'fresh-meat', name: 'Fresh Meat', emoji: '🥩' },
  { id: 'fresh-fish', name: 'Fresh Fish', emoji: '🐟' },
  { id: 'dairy-bread-eggs', name: 'Dairy, Bread & Eggs', emoji: '🥛' },
  { id: 'rice-flour-pulses', name: 'Rice, Flour & Pulses', emoji: '🌾' },
  { id: 'cooking-oil-ghee', name: 'Cooking Oil & Ghee', emoji: '🫒' },
  { id: 'masala-spices', name: 'Masala & Spices', emoji: '🌶️' },
  { id: 'snacks-packaged', name: 'Snacks & Packaged', emoji: '🍪' },
  { id: 'beverages', name: 'Beverages', emoji: '☕' },
  { id: 'household-cleaning', name: 'Household', emoji: '🧹' },
  { id: 'personal-care', name: 'Personal Care', emoji: '🧴' },
  { id: 'baby-care', name: 'Baby Care', emoji: '👶' },
  { id: 'pet-care', name: 'Pet Care', emoji: '🐾' },
];

// ── Flash Deals Countdown ─────────────────────────────────────────────────

function FlashCountdown({ endTime }: { endTime: string }) {
  const [timeLeft, setTimeLeft] = React.useState('');
  React.useEffect(() => {
    const tick = () => {
      const diff = new Date(endTime).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('Ended'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [endTime]);
  return <span className="font-mono font-black text-white">{timeLeft}</span>;
}

// ── Flash Deals Banner (in-store) ─────────────────────────────────────────


function FlashDealsBanner({ storeId, storeName }: { storeId: string; storeName: string }) {
  const { formatPrice, tr } = useGroceryLocale();
  /**
   * This shop's live deals, from the API.
   *
   * It read `getFlashDealsByStore()` — the bundled demo array — so a shop with
   * no promotions still showed a countdown, a stock bar and discounted prices
   * it had never offered. `grocery_flash_deals` is the only place a real
   * promotion exists, and an empty result hides the banner entirely.
   */
  const [deals, setDeals] = React.useState<FlashDeal[]>([]);
  React.useEffect(() => {
    let cancelled = false;
    groceryApi
      .getStoreFlashDeals(storeId)
      .then((res: any) => {
        if (cancelled) return;
        /**
         * Coerce the money columns.
         *
         * `originalPrice`, `flashPrice` and the counters are Postgres `numeric`,
         * and node-postgres returns that type as a **string** ("14.00") to avoid
         * silent float precision loss. `formatPrice` calls `.toFixed()`, so the
         * banner threw `amount.toFixed is not a function` and the error boundary
         * blanked the whole store page.
         *
         * It went unnoticed because `grocery_flash_deals` was empty — the
         * component returns null on an empty list, so the crash only appears the
         * moment a shop has its first real promotion.
         */
        const deals = (res?.deals ?? []).map((d: any) => ({
          ...d,
          originalPrice: Number(d.originalPrice),
          flashPrice: Number(d.flashPrice),
          discountPercent: Number(d.discountPercent),
          stockLimit: Number(d.stockLimit),
          soldCount: Number(d.soldCount),
          // Joined from the product by the service; the deal row itself only
          // denormalises name, emoji and category.
          imageUrl: typeof d.imageUrl === 'string' ? d.imageUrl : undefined,
        }));
        setDeals(deals);
      })
      .catch(() => { if (!cancelled) setDeals([]); });
    return () => { cancelled = true; };
  }, [storeId]);
  // Deal quantities go into the same basket as everything else. They were tracked
  // in a local `cartQty` map and reported through `onCartChange`, so a flash-deal
  // item counted towards the sticky bar's total and then did not exist at checkout.
  const { add, setQuantity, quantityOf } = useGroceryCart();

  if (deals.length === 0) return null;

  const soonestEnd = deals.reduce((min, d) => d.endTime < min ? d.endTime : min, deals[0].endTime);

  const updateQty = (deal: FlashDeal, delta: number) => {
    // Flash deals are declared against a product, not a specific weight variant.
    // The order API matches on `weight`, so the first variant's label is what the
    // deal is redeemed as; a deal on a multi-variant product needs its own field
    // before that can be anything else.
    const weight = '1 unit';
    const current = quantityOf(deal.productId, weight);
    const next = Math.max(0, current + delta);
    const stockLeft = deal.stockLimit - deal.soldCount;
    if (current === 0 && next > 0) {
      add({
        productId: deal.productId,
        weight,
        name: deal.productName,
        price: deal.flashPrice,
        mrp: deal.originalPrice,
        quantity: next,
        emoji: deal.productEmoji,
        storeId,
        storeName,
        maxQuantity: stockLeft,
      });
    } else {
      setQuantity(deal.productId, weight, next);
    }
  };

  return (
    <div className="mb-6">
      {/* Banner Header */}
      <div className="bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 rounded-t-2xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl animate-pulse">⚡</span>
          <h3 className="text-base font-black text-white tracking-tight">{tr('Flash Deals')}</h3>
          <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">{tr('LIVE')}</span>
        </div>
        <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1">
          <Clock className="w-3 h-3 text-white" />
          <span className="text-white/70 text-xs">{tr('Ends in')}</span>
          <FlashCountdown endTime={soonestEnd} />
        </div>
      </div>

      {/* Deal Products */}
      <div className="bg-gradient-to-b from-orange-50 to-white border-2 border-t-0 border-orange-200/60 rounded-b-2xl p-4">
        {/* The same carousel the store rails use: pauses on hover, focus and
            touch, honours prefers-reduced-motion, and offers arrows on desktop.
            Was a bare overflow strip with no affordance that more deals existed. */}
        <AutoScrollRow className="pb-1" speed={22}>
          {deals.map(deal => {
            const qty = quantityOf(deal.productId, '1 unit');
            const stockLeft = deal.stockLimit - deal.soldCount;
            const stockPercent = Math.round((deal.soldCount / deal.stockLimit) * 100);
            return (
              <div key={deal.id} className="shrink-0 w-[180px] bg-white border border-orange-200/60 rounded-xl p-3 relative group hover:shadow-md transition-all">
                {/* Discount badge */}
                <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm z-10">
                  -{deal.discountPercent}%
                </div>

                {/* Product */}
                <div className="text-center mb-2">
                  {/* Square well so every deal card is the same height whether
                      or not its product has a photo — a rail of mixed heights is
                      what made this section look unfinished. */}
                  <div className="w-full aspect-square bg-white rounded-lg mb-1.5 overflow-hidden flex items-center justify-center">
                    {(deal as { imageUrl?: string }).imageUrl ? (
                      <ProductThumb
                        src={(deal as { imageUrl?: string }).imageUrl!}
                        alt={deal.productName}
                        sizes={THUMB_SIZES.grid4}
                        className="rounded-lg"
                      />
                    ) : (
                      <span className="text-4xl">{deal.productEmoji}</span>
                    )}
                  </div>
                  <p className="text-xs font-bold text-slate-800 line-clamp-2 leading-tight">{deal.productName}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{deal.category}</p>
                </div>

                {/* Price */}
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-red-600 font-black text-sm">{formatPrice(deal.flashPrice)}</span>
                  <span className="text-slate-400 text-xs line-through">{formatPrice(deal.originalPrice)}</span>
                </div>

                {/* Stock progress */}
                <div className="mb-2">
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${stockPercent > 80 ? 'bg-red-500' : stockPercent > 50 ? 'bg-orange-400' : 'bg-green-500'}`}
                      style={{ width: `${stockPercent}%` }}
                    />
                  </div>
                  <p className="text-[9px] text-slate-400 mt-0.5 text-center">
                    {stockLeft <= 5 ? <span className="text-red-500 font-bold">Only {stockLeft} left!</span> : `${stockLeft} of ${deal.stockLimit} left`}
                  </p>
                </div>

                {/* Add to cart */}
                {qty === 0 ? (
                  <button
                    onClick={() => updateQty(deal, 1)}
                    className="w-full bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold text-xs py-2 rounded-lg hover:from-red-600 hover:to-orange-600 transition-all flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </button>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => updateQty(deal, -1)} className="w-7 h-7 bg-red-100 text-red-600 rounded-lg flex items-center justify-center font-bold text-sm">-</button>
                    <span className="text-sm font-bold w-6 text-center">{qty}</span>
                    <button onClick={() => updateQty(deal, 1)} className="w-7 h-7 bg-green-100 text-green-600 rounded-lg flex items-center justify-center font-bold text-sm">+</button>
                  </div>
                )}
              </div>
            );
          })}
        </AutoScrollRow>
      </div>
    </div>
  );
}

// ── Product Card (In-Store) ───────────────────────────────────────────────

/**
 * The stepper writes straight to the shared grocery basket.
 *
 * It used to hold `useState(0)` and call an `onCartChange` that accumulated into a
 * page-local record used for nothing but a floating total — pressing ADD put
 * nothing anywhere the cart page or the checkout could see, and the count reset the
 * moment you navigated to the product.
 */
function StoreProductCard({
  product,
  storeName,
  onStoreConflict,
}: {
  product: GroceryProduct;
  storeName: string;
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
    storeName: product.storeName ?? storeName,
  });

  const updateQty = (newQty: number) => {
    // A basket can only hold one store's items — ask before discarding the other
    // store's, rather than silently replacing what the customer already chose.
    if (qty === 0 && newQty > 0 && wouldReplaceCart(storeId)) {
      onStoreConflict?.(asCartItem(1));
      return;
    }
    if (qty === 0) add(asCartItem(newQty));
    else setQuantity(product.id, product.weight, newQty);
  };

  // `imageUrl` is only treated as a picture when it looks like one — the
  // column has historically carried emoji.
  const raw = (product as { imageUrl?: unknown }).imageUrl;
  const productImage = typeof raw === 'string' && /^(https?:\/\/|\/)/.test(raw) ? raw : undefined;

  return (
    <div className="bg-white border border-slate-200/80 rounded-xl p-3 flex flex-col relative group hover:shadow-md transition-all duration-200">
      {discount > 0 && (
        <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded z-10">{discount}% OFF</div>
      )}
      {product.isVeg === false && (
        <div className={`absolute top-2 ${discount > 0 ? 'left-16' : 'left-2'} bg-red-600 text-white text-xs font-bold px-1.5 py-0.5 rounded z-10`}>{tr('NON-VEG')}</div>
      )}
      {product.freshLabel && (
        <div className="absolute top-2 right-2 bg-green-100 text-green-700 text-xs font-bold px-1.5 py-0.5 rounded z-10">{product.freshLabel}</div>
      )}

      <Link href={productPath({ id: product.id, name: product.name, storeName: product.storeName })} className="block">
        {/* One square well per tile, whether the product has a picture or not,
            so the grid keeps its rhythm. ProductThumb measures the object-fit
            per image rather than assuming, and is what cart and wishlist
            already use — this page was the last grocery grid still emoji-only. */}
        <div className="w-full aspect-square bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg mb-2 overflow-hidden">
          {productImage ? (
            <ProductThumb
              src={productImage}
              alt={product.name}
              sizes={THUMB_SIZES.grid4}
              className="rounded-lg"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-4xl group-hover:scale-110 transition-transform duration-200">{product.emoji}</span>
            </div>
          )}
        </div>

        <div className="flex-1">
          <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-0.5">{product.brand}</p>
          {product.storeName && (
            <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5 mb-0.5">
              <span className="w-2.5 h-2.5 bg-emerald-100 rounded-full inline-flex items-center justify-center text-[7px]">🏪</span>
              {product.storeName}
            </p>
          )}
          {/* Two lines are reserved, not merely allowed. `line-clamp-2` caps a long
              name but does not pad a short one, so "Lamb Leg" sat 17px shorter than
              "Greek Yogurt (Natural)" and the grid's rows stepped up and down. */}
          <h3 className="font-semibold text-slate-800 text-sm leading-tight mb-1 line-clamp-2 min-h-[2.125rem] group-hover:text-green-600 transition-colors">{product.name}</h3>
          <p className="text-base text-slate-500 font-medium mb-2">{product.weight}</p>
        </div>
      </Link>

      <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-50">
        {/* The struck-through list price keeps its line whether or not there is
            one to show. Rendered conditionally, a discounted tile stood ~16px
            taller than its neighbours and the grid lost its baseline row to
            row — six of this store's sixteen products are on a flash deal. */}
        <div className="flex flex-col">
          <span className="font-bold text-sm text-slate-900">{formatPrice(product.price)}</span>
          <span
            aria-hidden={product.mrp > product.price ? undefined : 'true'}
            className={`text-sm line-through ${product.mrp > product.price ? 'text-slate-400' : 'invisible'}`}
          >
            {product.mrp > product.price ? formatPrice(product.mrp) : ' '}
          </span>
        </div>
        {product.inStock ? (
          qty === 0 ? (
            <button
              onClick={() => updateQty(1)}
              className="bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-lg px-3 py-1.5 text-sm font-bold transition-colors flex items-center gap-1"
            >{tr('ADD')}<Plus className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center gap-1 bg-green-600 text-white rounded-lg overflow-hidden">
              <button onClick={() => updateQty(Math.max(0, qty - 1))} className="px-2 py-1.5 hover:bg-green-700 transition-colors" aria-label={tr('Decrease')}>
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-sm font-bold px-1 min-w-[20px] text-center">{qty}</span>
              <button onClick={() => updateQty(qty + 1)} className="px-2 py-1.5 hover:bg-green-700 transition-colors" aria-label={tr('Increase')}>
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )
        ) : (
          <span className="text-sm font-bold text-slate-400">{tr('Out of stock')}</span>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// STORE DETAIL PAGE
// ══════════════════════════════════════════════════════════════════════════

export default function GroceryStorePage() {
  const params = useParams();
  const routeParam = params.slug as string;
  const router = useRouter();
  const { formatPrice, tr } = useGroceryLocale();

  /**
   * The uuid the URL carries, and nothing else.
   *
   * The route segment is now `<store-name>-<uuid>` rather than a bare uuid.
   * Only the uuid reaches the API — the slug in front of it is decorative, so a
   * stale or hand-edited one cannot change which store is fetched. A segment
   * carrying no uuid parses to `null`, which is how the page tells "look this
   * up" apart from "this was never one of our URLs".
   */
  const { id: parsedStoreId } = parseIdParam(routeParam);
  const slug = parsedStoreId ?? routeParam;

  /**
   * The shop, or nothing.
   *
   * This used to start from an invented store built out of the URL slug — name
   * re-cased from the path, rating 4.5, "500+" reviews, minimum order 199, tags
   * ["Essentials", "Fresh", "Daily Needs"] — and merely overlay whatever the API
   * returned. Every id therefore rendered a plausible local business, which is
   * why this route was withheld from the index. `GET /grocery/stores/:id` now
   * answers 404 for an id it does not have, so the page can tell a real shop
   * from one that was never there.
   */
  type StoreView = {
    id: string; name: string; category: string; rating: number; reviewCount: string;
    deliveryTime: string; distance: string; minOrder: number; deliveryFee: number;
    tags: string[]; isOpen: boolean; emoji: string; section: string[]; offerBadge?: string;
    logoUrl?: string; bannerUrl?: string;
  };
  const [store, setStore] = useState<StoreView | null>(null);
  const [storeMissing, setStoreMissing] = useState(false);

  /**
   * Store artwork, only when the value is URL-shaped.
   *
   * `logoUrl` has historically carried an emoji in seed data, so handing it
   * straight to an <img> means a failed request and a broken frame.
   */
  const urlish = (v: unknown) => (typeof v === 'string' && /^(https?:\/\/|\/)/.test(v) ? v : undefined);
  const storeBanner = urlish(store?.bannerUrl);
  const storeLogo = urlish(store?.logoUrl);
  // Empty until the fetch resolves — the page shows its loading state rather
  // than a shelf of demo items that is then swapped out.
  const [allProducts, setAllProducts] = useState<GroceryProduct[]>([]);
  const [source, setSource] = useState<'api' | 'demo'>('demo');
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeSub, setActiveSub] = useState('all');
  const [activeBrand, setActiveBrand] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // The sticky bar reflects the real basket. It used to total a page-local record
  // that only this page wrote to, so it disagreed with the header badge and with
  // /grocery/cart, and reset to "0 items" on every navigation back here.
  const { count: cartCount, subtotal: cartTotal, add: addToCart, clear: clearCart, storeName: cartStoreName } = useGroceryCart();

  /** Pending add that would replace another store's basket. */
  const [pendingItem, setPendingItem] = useState<GroceryCartItem | null>(null);

  // Fetch live API data on mount
  useEffect(() => {
    const fetchFromApi = async () => {
      try {
        const [storeRes, productsRes] = await Promise.allSettled([
          groceryApi.getStoreById(slug),
          groceryApi.getProducts(slug),
        ]);

        // Resolve the store's registered name from API (or keep demo name)
        let resolvedStoreName = '';
        if (storeRes.status === 'rejected') setStoreMissing(true);
        if (storeRes.status === 'fulfilled' && storeRes.value) {
          const s = storeRes.value as any;
          resolvedStoreName = s.name || '';

          // Send the visitor to the canonical URL once the real name is known.
          //
          // A bare uuid, a stale slug from before a rename, or anything a
          // shopper hand-edited all resolve to the same store, which is what
          // makes the id-in-path design work — but leaving them addressable
          // means one shop occupies several indexable URLs. `replace` rather
          // than `push` so the non-canonical form does not sit in history and
          // send the back button in a loop.
          if (s.id && !isCanonicalStoreParam(routeParam, { id: s.id, slug: s.slug, name: s.name })) {
            router.replace(storePath({ id: s.id, slug: s.slug, name: s.name }));
          }

          // Every field comes from the row. Nothing is carried over from a
          // previous shape, because there is no longer a fabricated one to
          // carry over from.
          setStore({
            id: s.id ?? slug,
            name: s.name ?? '',
            category: s.storeTypes?.[0] ?? 'Grocery Store',
            rating: Number(s.rating ?? 0),
            reviewCount: String(s.totalOrders ?? 0),
            deliveryTime: deliveryWindow(),
            distance: '',
            minOrder: Number(s.minOrderAmount ?? 0),
            deliveryFee: Number(s.deliveryFee ?? 0),
            tags: Array.isArray(s.tags) ? s.tags : [],
            isOpen: !!s.isOnline && s.status === 'APPROVED',
            emoji: '🏪',
            section: Array.isArray(s.storeTypes) ? s.storeTypes : [],
            logoUrl: typeof s.logoUrl === 'string' ? s.logoUrl : undefined,
            bannerUrl: typeof s.bannerUrl === 'string' ? s.bannerUrl : undefined,
            offerBadge: typeof s.offerBadge === 'string' ? s.offerBadge : undefined,
          });
        }

        if (productsRes.status === 'fulfilled' && productsRes.value) {
          const apiProducts = (productsRes.value as any).data ?? [];
          if (apiProducts.length > 0) {
            // Map API products to GroceryProduct shape — using resolved store name
            const mapped = apiProducts.map((p: any) => ({
              id: p.id, name: p.name, brand: p.brand || 'Store Brand',
              weight: p.weightVariants?.[0]?.weight || '1 unit',
              unit: p.weightVariants?.[0]?.weight?.replace(/[0-9\s]/g, '') || 'unit',
              price: Number(p.weightVariants?.[0]?.price ?? p.price ?? 0),
              mrp: Number(p.weightVariants?.[0]?.mrp ?? p.mrp ?? p.price ?? 0),
              // `imageUrl` belongs in `imageUrl`. Assigning it to `emoji`
              // meant the tile rendered the URL as literal text and the real
              // picture was never reachable — the same mismapping the home
              // page had for store logos.
              imageUrl: typeof p.imageUrl === 'string' ? p.imageUrl : undefined,
              emoji: '🛒',
              category: p.category || 'uncategorized',
              // Supplied by the catalogue for every row and previously dropped,
              // which is why the shelf could only be filtered one level deep.
              subCategory: p.subCategory || undefined,
              isVeg: p.isVeg, freshLabel: p.freshLabel || null,
              rating: Number(p.rating ?? 0), reviews: p.reviewCount ?? 0,
              inStock: p.isAvailable ?? true,
              storeId: p.storeId || slug,
              storeName: p.storeName || resolvedStoreName,
            }));
            // The shop's shelf is what the shop actually stocks.
            //
            // Demo items used to be appended to the API's, so Lulu Hypermarket
            // showed 47 products of which 31 were invented — "Kashmir Apple",
            // "Fresh Tomatoes" and so on, carrying ids like `gp-tomato`. Their
            // links could not resolve (no uuid to look up), the category counts
            // in the sidebar were inflated by them, and anything added to the
            // basket from one failed at checkout.
            setAllProducts(mapped);
            setSource('api');
          }
        }
      } catch {
        // Keep demo data on error
      } finally {
        setIsLoading(false);
      }
    };
    fetchFromApi();
    // `store.name` is read inside but deliberately not a dependency: this effect
    // *sets* the store, so depending on the name would refetch the catalogue every
    // time it resolved. The pre-fetch value is only a placeholder used for one line.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  /**
   * The shelf, narrowed by the facets the shopper has picked.
   *
   * All filtering happens here, in memory, over the products already fetched —
   * so choosing a category, a sub-category or a brand re-renders the grid
   * without a navigation or a second request. Only the store's own catalogue is
   * ever in scope.
   */
  /**
   * Sub-categories offered *within the chosen category*.
   *
   * Scoped rather than global: offering every sub-category in the shop while a
   * category is selected produces combinations that match nothing.
   */
  const subCategories = useMemo(() => {
    const pool = activeCategory === 'all' ? allProducts : allProducts.filter(p => p.category === activeCategory);
    return [...new Set(pool.map(p => p.subCategory).filter(Boolean) as string[])].sort();
  }, [allProducts, activeCategory]);

  /**
   * A facet that no longer exists in the current slice counts as cleared.
   *
   * Derived here rather than reset from an effect. An effect would run *after*
   * the render that already applied the stale facet, so switching category
   * flashed an empty grid for a frame before correcting itself — and resetting
   * state from an effect is the cascading-render pattern React warns about.
   */
  const effectiveSub = activeSub !== 'all' && subCategories.includes(activeSub) ? activeSub : 'all';

  /** Brands present in the current category/sub-category slice, for the same reason. */
  const brands = useMemo(() => {
    let pool = allProducts;
    if (activeCategory !== 'all') pool = pool.filter(p => p.category === activeCategory);
    if (effectiveSub !== 'all') pool = pool.filter(p => p.subCategory === effectiveSub);
    return [...new Set(pool.map(p => p.brand).filter(Boolean))].sort();
  }, [allProducts, activeCategory, effectiveSub]);

  const effectiveBrand = activeBrand !== 'all' && brands.includes(activeBrand) ? activeBrand : 'all';

  /**
   * The shelf, narrowed by the facets in force.
   *
   * All three compose, and all are applied in memory over the products already
   * fetched — choosing a category, sub-category or brand re-renders the grid
   * with no navigation and no second request.
   */
  const filteredProducts = useMemo(() => {
    let products = allProducts;
    if (activeCategory !== 'all') products = products.filter(p => p.category === activeCategory);
    if (effectiveSub !== 'all') products = products.filter(p => p.subCategory === effectiveSub);
    if (effectiveBrand !== 'all') products = products.filter(p => p.brand === effectiveBrand);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      products = products.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.subCategory ?? '').toLowerCase().includes(q)
      );
    }
    return products;
  }, [allProducts, activeCategory, effectiveSub, effectiveBrand, searchQuery]);


  // Count products per category
  const categoryCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    allProducts.forEach(p => {
      map[p.category] = (map[p.category] || 0) + 1;
    });
    return map;
  }, [allProducts]);

  if (isLoading) {
    return (
      <div className="bg-slate-50 min-h-screen pb-24 animate-pulse">
        <div className="bg-white border-b border-slate-200">
          <div className="h-36 md:h-52 w-full bg-gradient-to-r from-green-100 to-emerald-100" />
          <div className="max-w-7xl mx-auto px-4 py-4 space-y-3">
            <div className="h-6 bg-slate-200 rounded w-1/3" />
            <div className="h-4 bg-slate-100 rounded w-1/2" />
            <div className="flex gap-4">
              <div className="h-4 bg-slate-100 rounded w-20" />
              <div className="h-4 bg-slate-100 rounded w-24" />
              <div className="h-4 bg-slate-100 rounded w-16" />
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-4 space-y-3">
                <div className="h-24 bg-slate-100 rounded-lg" />
                <div className="h-4 bg-slate-200 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
                <div className="h-8 bg-green-100 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // No such shop. The page used to render an invented one at this point.
  if (storeMissing || !store) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <span className="text-5xl" aria-hidden="true">🏪</span>
        <h1 className="text-xl font-bold text-slate-800 mt-4 mb-1">{tr('Store not found')}</h1>
        <p className="text-sm text-slate-500 mb-6">{tr('This store is not delivering in your area right now.')}</p>
        <Link href="/stores" className="inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-colors">
          {tr('Browse stores')}<ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-24">
      {/* ── Store Banner ──────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200">
        {/*
          The banner is the store's own artwork when it has some.

          `bannerUrl` and `logoUrl` are both populated on every store row, but
          this header ignored them: it painted a fixed green gradient with the
          emoji blown up to 100px behind it, so every shop on the platform had an
          identical masthead. The gradient stays as the ground beneath, which is
          what shows while the image loads and for a store with no artwork yet.
        */}
        <div className="h-36 md:h-52 w-full bg-gradient-to-r from-green-800 via-green-700 to-emerald-600 relative overflow-hidden">
          {storeBanner ? (
            <img
              src={storeBanner}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover"
              loading="eager"
            />
          ) : (
            <span className="absolute right-8 top-1/2 -translate-y-1/2 text-[100px] opacity-15">{store.emoji}</span>
          )}
          {/* Scrim sits above the photo so the store name stays legible over a
              light image — without it, white-on-white was possible. */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          <div className="absolute bottom-4 left-4 md:left-8 right-4 flex items-end gap-4">
            {/* Circular crest, matching the brand marks elsewhere in the module. */}
            <div className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-full shadow-lg overflow-hidden flex items-center justify-center shrink-0">
              {storeLogo
                ? <img src={storeLogo} alt={store.name} className="w-full h-full object-cover" loading="eager" />
                : <span className="text-3xl md:text-4xl">{store.emoji}</span>}
            </div>
            <div className="flex-1 pb-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl md:text-3xl font-bold text-white">{store.name}</h1>
                {store.isOpen ? (
                  <span className="bg-green-500/80 backdrop-blur-sm text-white text-xs font-bold px-2 py-0.5 rounded-full">{tr('OPEN')}</span>
                ) : (
                  <span className="bg-red-500/80 backdrop-blur-sm text-white text-xs font-bold px-2 py-0.5 rounded-full">{tr('CLOSED')}</span>
                )}
              </div>
              <p className="text-sm text-green-100 flex items-center gap-1.5">
                <MapPin className="w-4 h-4" /> {store.category} • {store.distance} away
              </p>
            </div>
          </div>
          <Link href="/" className="absolute top-4 left-4 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full backdrop-blur-sm transition-colors" aria-label={tr('Back to grocery')}>
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>

        {/* Store Info Bar */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-5 text-sm font-medium">
            <div className="flex items-center gap-1.5 text-slate-700">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> {store.rating}
              <span className="text-slate-400">({store.reviewCount})</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-700">
              <Clock className="w-4 h-4 text-blue-500" /> {store.deliveryTime}
            </div>
            <div className="flex items-center gap-1.5 text-slate-700">
              <Truck className="w-4 h-4 text-green-500" />
              {store.deliveryFee === 0 ? <span className="text-green-600 font-semibold">{tr('Free Delivery')}</span> : formatPrice(store.deliveryFee)}
            </div>
            <div className="hidden md:flex items-center gap-1.5 text-slate-500 text-base">
              Min. order {formatPrice(store.minOrder)}
            </div>
          </div>

          {/* Search Inside Store */}
          <div className="w-full md:w-auto relative flex-1 md:max-w-sm">
            <input
              type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder={`Search inside ${store.name}...`}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 rounded-lg outline-none focus:ring-2 focus:ring-green-500 border border-slate-200 transition-all text-sm"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
        </div>

        {/* Offer badges */}
        {store.offerBadge && (
          <div className="max-w-7xl mx-auto px-4 md:px-8 pb-3">
            <div className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 text-base font-bold px-3 py-1.5 rounded-full border border-red-200">
              🎉 {store.offerBadge} on this store
            </div>
          </div>
        )}
      </div>

      {/*
        Promotions sit directly under the storefront header, above the shelf.

        They were rendered between the category chips and the product grid, so on
        a phone a shopper scrolled past the entire filter strip before learning
        the shop had a sale on. A promotion is a reason to keep reading; it
        belongs where it is seen first. The banner hides itself entirely when
        `grocery_flash_deals` has nothing for this store, so a shop with no
        promotion gets no empty frame.
      */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-4">
        <FlashDealsBanner storeId={slug} storeName={store.name} />
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-5 flex flex-col md:flex-row gap-5">
        {/* ── Desktop Category Sidebar ─────────────────────── */}
        <aside className="hidden md:block w-56 shrink-0">
          <div className="bg-white rounded-xl border border-slate-200 p-3 sticky top-20 shadow-sm">
            <h3 className="font-bold text-slate-900 text-sm mb-3 px-2">{tr('Categories')}</h3>
            <ul className="space-y-0.5">
              {STORE_CATEGORIES.map(cat => {
                const count = cat.id === 'all' ? allProducts.length : (categoryCountMap[cat.id] || 0);
                if (cat.id !== 'all' && count === 0) return null;
                return (
                  <li key={cat.id}>
                    <button
                      onClick={() => setActiveCategory(cat.id)}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${
                        activeCategory === cat.id
                          ? 'bg-green-50 text-green-700 font-bold border-l-4 border-green-600'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-sm">{cat.emoji}</span> {cat.name}
                      </span>
                      <span className="text-sm text-slate-400">{count}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

        {/* ── Mobile Horizontal Category Chips ─────────────── */}
        <div className="md:hidden flex gap-2 overflow-x-auto hide-scrollbar pb-2 snap-x -mx-4 px-4">
          {STORE_CATEGORIES.map(cat => {
            const count = cat.id === 'all' ? allProducts.length : (categoryCountMap[cat.id] || 0);
            if (cat.id !== 'all' && count === 0) return null;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`snap-start shrink-0 px-3 py-1.5 rounded-full text-base font-semibold transition-colors flex items-center gap-1.5 ${
                  activeCategory === cat.id
                    ? 'bg-green-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="text-sm">{cat.emoji}</span> {cat.name}
              </button>
            );
          })}
        </div>

        {/* ── Product Grid ─────────────────────────────────── */}
        {/* No `id="main-content"` here — the grocery layout already owns that
            landmark. Two elements shared the id, which is invalid HTML and sent
            the skip-to-content link to the layout wrapper rather than the shelf. */}
        {/*
            `min-w-0`, or this column will not scroll.

            A flex item defaults to `min-width: auto`, which refuses to shrink
            below the intrinsic width of its content. The brand strip inside is
            1717px of chips, so this column grew to 1451px inside a 1274px row —
            481px of it past the right edge of a 1280px screen, clipped by the
            layout's `overflow-x-clip`. The strip's own `overflow-x-auto` then
            had almost nothing to scroll, because the overflow had been resolved
            by making the *container* too wide instead. Cards ran off the screen
            and no amount of swiping or wheeling brought them back.
        */}
        <main className="flex-1 min-w-0">
          {/*
            Sub-category and brand facets.

            Both narrow the grid in memory — no navigation, no refetch — and both
            are scoped to what is already selected, so every chip on screen
            returns at least one product. They render only when the shop offers
            more than one option, because a filter with a single choice is not a
            filter.
          */}
          {subCategories.length > 1 && (
            <div className="mb-3">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{tr('Sub-category')}</p>
              <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                <button
                  onClick={() => setActiveSub('all')}
                  aria-pressed={effectiveSub === 'all'}
                  className={`shrink-0 px-3 min-h-[36px] rounded-full text-sm font-semibold transition-colors ${effectiveSub === 'all' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >{tr('All')}</button>
                {subCategories.map(sub => (
                  <button
                    key={sub}
                    onClick={() => setActiveSub(sub)}
                    aria-pressed={effectiveSub === sub}
                    className={`shrink-0 px-3 min-h-[36px] rounded-full text-sm font-semibold transition-colors ${effectiveSub === sub ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >{sub}</button>
                ))}
              </div>
            </div>
          )}

          {brands.length > 1 && (
            <div className="mb-4">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{tr('Brand')}</p>
              {/* Auto-scrolls, but stops dead on hover, touch or focus — a filter
                  the shopper is reaching for must not move under the cursor.
                  Slower than the deal rail because these are small targets. */}
              <AutoScrollRow className="pb-1" speed={16}>
                <button
                  onClick={() => setActiveBrand('all')}
                  aria-pressed={effectiveBrand === 'all'}
                  className={`shrink-0 px-3 min-h-[36px] rounded-full text-sm font-semibold transition-colors ${effectiveBrand === 'all' ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >{tr('All brands')}</button>
                {brands.map(b => (
                  <button
                    key={b}
                    onClick={() => setActiveBrand(b)}
                    aria-pressed={effectiveBrand === b}
                    className={`shrink-0 pl-1.5 pr-3 min-h-[36px] rounded-full text-sm font-semibold transition-colors flex items-center gap-1.5 ${effectiveBrand === b ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    {/* The mark is decorative — the brand name sits beside it, so a
                        shopper who does not recognise a logo can still read the
                        chip and a screen reader announces the name, not an image. */}
                    <img
                      src={brandLogoUrl(b)}
                      alt=""
                      aria-hidden="true"
                      width={22}
                      height={22}
                      loading="lazy"
                      className="w-[22px] h-[22px] rounded-full shrink-0 bg-white"
                    />
                    {b}
                  </button>
                ))}
              </AutoScrollRow>
            </div>
          )}

          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">
              {STORE_CATEGORIES.find(c => c.id === activeCategory)?.name || 'All Products'}
              {effectiveSub !== 'all' && <span className="text-slate-500"> · {effectiveSub}</span>}
              {effectiveBrand !== 'all' && <span className="text-slate-500"> · {effectiveBrand}</span>}
              <span className="text-sm font-normal text-slate-500 ml-2">({filteredProducts.length} items)</span>
            </h2>
            {(effectiveSub !== 'all' || effectiveBrand !== 'all') && (
              <button
                onClick={() => { setActiveSub('all'); setActiveBrand('all'); }}
                className="text-sm font-semibold text-green-600 hover:text-green-700 min-h-[36px]"
              >{tr('Clear filters')}</button>
            )}
          </div>

          {filteredProducts.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
              <span className="text-5xl mb-4 block">🔍</span>
              <h3 className="text-lg font-bold text-slate-700 mb-1">{tr('No products found')}</h3>
              <p className="text-sm text-slate-500 mb-4">
                {searchQuery ? `No results for "${searchQuery}"` : 'This category is empty'}
              </p>
              <button onClick={() => { setActiveCategory('all'); setSearchQuery(''); }} className="text-green-600 font-semibold text-sm hover:underline">{tr('View All Products')}</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 ph:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredProducts.map(product => (
                <StoreProductCard key={product.id} product={product} storeName={store.name} onStoreConflict={setPendingItem} />
              ))}
            </div>
          )}

          {/* ── Store Policies ──────────────────────────────── */}
          <div className="mt-8 bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-4">{tr('Store Information')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center shrink-0"><Truck className="w-4 h-4 text-green-600" /></div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">{tr('Delivery Policy')}</p>
                  <p className="text-base text-slate-500 mt-0.5">Delivery within {store.deliveryTime}. {store.deliveryFee === 0 ? 'Free delivery on all orders.' : `${formatPrice(store.deliveryFee)} delivery fee.`} Min. order {formatPrice(store.minOrder)}.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center shrink-0"><RefreshCw className="w-4 h-4 text-blue-600" /></div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">{tr('Return & Refund')}</p>
                  <p className="text-base text-slate-500 mt-0.5">Easy returns within 24 hours for damaged, expired, or wrong items. Instant refund to your payment method.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center shrink-0"><Shield className="w-4 h-4 text-amber-600" /></div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">{tr('Quality Guarantee')}</p>
                  <p className="text-base text-slate-500 mt-0.5">All products are quality checked. Fresh items delivered chilled with proper packaging.</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ── Sticky Bottom Cart Bar ─────────────────────────── */}
      {/*
          `above-bottom-nav` rather than `bottom-0`: at `bottom-0` this sat under
          the mobile nav, which is `fixed bottom-0 z-50` against this bar's z-40.
          61 of its 77px were covered and its "View Cart" button was not tappable
          — `elementFromPoint` at the button's centre returned the nav.

          Only shown with something in the basket. It used to render regardless,
          so an empty cart got a permanent "0 items • QR0.00 / View Cart" bar
          eating 77px at the bottom of every store page.
      */}
      {cartCount > 0 && (
      <div className="fixed above-bottom-nav left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-4px_6px_rgba(0,0,0,0.05)] z-40 p-3 md:p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-base text-slate-500 font-medium">{tr('Your Cart')}</p>
              <p className="font-bold text-slate-900">{cartCount} item{cartCount !== 1 ? 's' : ''} • {formatPrice(cartTotal)}</p>
            </div>
          </div>
          <Link href="/cart" className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-bold transition-colors shadow-sm text-sm flex items-center gap-2">{tr('View Cart')}<ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
      )}

      {/* Raised when a tile tries to add an item from a different store than the
          one already in the basket — the order API accepts exactly one storeId. */}
      {pendingItem && (
        <StoreSwitchDialog
          currentStoreName={cartStoreName ?? 'another store'}
          newStoreName={pendingItem.storeName}
          onCancel={() => setPendingItem(null)}
          onReplace={() => { clearCart(); addToCart(pendingItem); setPendingItem(null); }}
        />
      )}
    </div>
  );
}
