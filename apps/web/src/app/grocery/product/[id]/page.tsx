'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Star, Clock, MapPin, Plus, Minus, Heart, Share2, ShoppingCart, Shield, Truck, RefreshCw, ChevronRight } from 'lucide-react';
import { groceryDiscountPercent } from '@/lib/demo-data/grocery-home';
import type { GroceryProduct } from '@/lib/demo-data/grocery-home';
import { groceryApi } from '@/lib/grocery-api';
import { useGroceryCart, type GroceryCartItem } from '@/lib/contexts/grocery-cart-context';
import { useGroceryWishlist } from '@/lib/hooks/use-grocery-wishlist';
import { useAuth } from '@/lib/contexts/auth-context';
import { StoreSwitchDialog } from '@/components/grocery/store-switch-dialog';
import { useAsyncData } from '@/lib/hooks/use-async-data';
import { useGroceryLocale } from '@/i18n/grocery-locale';
import { parseIdParam, productPath, isCanonicalProductParam } from '@/lib/grocery/urls';
import { deliveryWindow } from '@/lib/grocery/delivery-estimate';

import { ProductThumb, THUMB_SIZES } from '@/components/marketplace/product-thumb';

interface SimilarTile {
  id: string; name: string; brand: string; price: number; mrp: number;
  weight: string; emoji: string; imageUrl?: string; storeName: string;
}

function SimilarProductCard({ product }: { product: SimilarTile }) {
  const { formatPrice } = useGroceryLocale();
  const discount = groceryDiscountPercent(product.mrp, product.price);
  return (
    <Link href={productPath({ id: product.id, name: product.name, storeName: product.storeName })} className="bg-white border border-slate-200/80 rounded-xl p-3 flex flex-col group hover:shadow-md transition-all min-w-[140px]">
      <div className="w-full aspect-square bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg mb-2 flex items-center justify-center relative overflow-hidden">
        {(product as { imageUrl?: string }).imageUrl
          ? <ProductThumb src={(product as { imageUrl?: string }).imageUrl!} alt={product.name} sizes={THUMB_SIZES.grid4} className="rounded-lg" />
          : <span className="text-3xl">{product.emoji}</span>}
        {discount > 0 && <span className="absolute top-1 left-1 bg-red-500 text-white text-[8px] font-bold px-1 py-0.5 rounded">{discount}% OFF</span>}
      </div>
      <h4 className="text-xs font-semibold text-slate-800 line-clamp-2 mb-1 group-hover:text-green-600">{product.name}</h4>
      <p className="text-[10px] text-slate-500 mb-1">{product.weight}</p>
      <span className="font-bold text-sm text-slate-900">{formatPrice(product.price)}</span>
    </Link>
  );
}

export default function GroceryProductDetailPage() {
  const { formatPrice, tr } = useGroceryLocale();
  const params = useParams();
  const router = useRouter();
  const routeParam = params.id as string;

  /**
   * The uuid the URL carries. The names in front of it are decorative.
   *
   * The segment is now `<store-name>-<product-name>-<uuid>`. Only the uuid is
   * sent to the API, so a stale slug — after a rename, or hand-edited — still
   * resolves to the right product rather than to a different one or to nothing.
   */
  const { id: parsedProductId } = parseIdParam(routeParam);
  const productId = parsedProductId ?? routeParam;
  // Starts at 1: "Add to Cart" with a quantity of zero is not a meaningful state,
  // and the old page used 0 as an "added yet?" flag rather than a quantity.
  const [qty, setQty] = useState(1);
  const { add, quantityOf, subtotal: cartSubtotal, wouldReplaceCart, clear: clearCart } = useGroceryCart();
  const { isSaved, toggle: toggleWishlist, requiresSignIn } = useGroceryWishlist();
  const [pendingItem, setPendingItem] = useState<GroceryCartItem | null>(null);

  /**
   * The product, or nothing.
   *
   * There used to be a `demoProduct` fallback that built a product out of the
   * URL slug — brand "KARTSEEK Select", 500 g, QR199 / QR249 — whenever the
   * catalogue did not answer. It rendered as an ordinary product page with an
   * invented price and no sign anything was wrong, which is exactly where every
   * "Similar Products" tile led, since those came from bundled fixtures whose
   * ids the API has never held.
   */
  const { data: loaded, loading, error } = useAsyncData(
    async () => groceryApi.getProduct(productId),
    [productId],
  );

  /** Which weight/pack the shopper is buying. */
  const [variantIndex, setVariantIndex] = useState(0);

  const variants: Array<{ weight: string; price: number; mrp: number; stock: number }> = useMemo(() => {
    const raw = (loaded as any)?.weightVariants;
    return Array.isArray(raw) ? raw.map((v: any) => ({
      weight: String(v?.weight ?? ''),
      price: Number(v?.price ?? 0),
      mrp: Number(v?.mrp ?? 0),
      stock: Number(v?.stock ?? 0),
    })) : [];
  }, [loaded]);

  /*
   * A different product resets the pack choice and the quantity.
   *
   * Adjusted during render against the last id seen, which is React's own
   * pattern for deriving state from a changing prop — an effect that calls
   * setState renders the new product once with the previous product's selection
   * still applied, so a 500g choice carried over onto an item that only sells
   * 250g. Clamping below stops a shorter variant list stranding the index.
   */
  const [seenProductId, setSeenProductId] = useState(productId);
  if (seenProductId !== productId) {
    setSeenProductId(productId);
    setVariantIndex(0);
    setQty(1);
  }
  const variant = variants[Math.min(variantIndex, Math.max(0, variants.length - 1))];

  const product = useMemo(() => {
    const p = loaded as any;
    if (!p?.id) return null;
    return {
      id: p.id as string,
      name: (p.name as string) || '',
      brand: (p.brand as string) || '',
      description: typeof p.description === 'string' ? p.description : '',
      weight: variant?.weight ?? '',
      price: Number(variant?.price ?? 0),
      mrp: Number(variant?.mrp ?? 0),
      imageUrl: typeof p.imageUrl === 'string' ? p.imageUrl : undefined,
      emoji: '🛒',
      category: (p.category as string) || '',
      subCategory: (p.subCategory as string) || '',
      rating: Number(p.rating ?? 0),
      reviews: Number(p.reviewCount ?? 0),
      inStock: (p.isAvailable ?? true) && Number(variant?.stock ?? 0) > 0,
      storeName: (p.storeName as string) || '',
      storeId: (p.storeId as string) || '',
      storeSlug: (p.storeSlug as string) || '',
      isVeg: p.isVeg as boolean | undefined,
    };
  }, [loaded, variant]);

  /** Live stock for the selected variant; caps the stepper and disables ADD at 0. */
  const stock = variant ? variant.stock : null;

  // Converge on the canonical URL once the lookup has supplied the store name.
  //
  // Most callers link a product without knowing its shop — a search hit, a
  // wishlist row — so they emit `<product>-<uuid>`. This upgrades that to the
  // fuller `<store>-<product>-<uuid>`, which is why no call site has to join the
  // two itself.
  useEffect(() => {
    const p = loaded as any;
    if (!p?.id) return;
    const canonical = { id: p.id, name: p.name, storeName: p.storeName };
    if (!isCanonicalProductParam(routeParam, canonical)) router.replace(productPath(canonical));
  }, [loaded, routeParam, router]);

  /**
   * What else a shopper might buy, from the live catalogue.
   *
   * This was `ALL_PRODUCTS.filter(...)` over the bundled demo fixtures, so every
   * tile linked to an id such as `gp-tomato` that no store stocks — landing on
   * the invented page described above, priced QR199.
   */
  const { data: similarData } = useAsyncData(
    async () => {
      const res: any = await groceryApi.listProducts({ category: product?.category, limit: 12 });
      return (res?.data ?? []) as any[];
    },
    [product?.category],
    { enabled: !!product?.category },
  );

  const similar = useMemo(() => (similarData ?? [])
    .filter((p: any) => p?.id && p.id !== product?.id)
    .slice(0, 6)
    .map((p: any) => {
      const v = Array.isArray(p.weightVariants) ? p.weightVariants[0] : undefined;
      return {
        id: p.id, name: p.name, brand: p.brand || '',
        price: Number(v?.price ?? 0), mrp: Number(v?.mrp ?? 0),
        weight: v?.weight || '', emoji: '🛒',
        imageUrl: typeof p.imageUrl === 'string' ? p.imageUrl : undefined,
        storeName: p.storeName || '',
      };
    }), [similarData, product?.id]);

  // No `document.title` here. Setting the title from a client effect bypasses
  // the metadata system entirely: it produces no canonical, no Open Graph tags
  // and no description, and it wrote a *product name* into the title for ids
  // this page had invented — the name above is derived from the URL slug when
  // the catalogue does not answer. The title now comes from the route's own
  // layout, which withholds the page from the index for exactly that reason.

  const discount = product ? groceryDiscountPercent(product.mrp, product.price) : 0;

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6" aria-busy="true">
        <div className="h-4 w-48 bg-slate-100 rounded animate-pulse mb-6" />
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-2/5 aspect-square bg-slate-100 rounded-2xl animate-pulse" />
          <div className="lg:w-3/5 space-y-4">
            <div className="h-8 w-2/3 bg-slate-100 rounded animate-pulse" />
            <div className="h-24 bg-slate-100 rounded-xl animate-pulse" />
            <div className="h-20 bg-slate-100 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // The catalogue does not have this id. The page used to invent a product here
  // rather than say so.
  if (!product) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <span className="text-5xl" aria-hidden="true">🔍</span>
        <h1 className="text-xl font-bold text-slate-800 mt-4 mb-1">{tr('Product not found')}</h1>
        <p className="text-sm text-slate-500 mb-6">
          {error ? tr('We could not load this product. Please try again.') : tr('This product is no longer available in your area.')}
        </p>
        <Link href="/grocery/category/all-groceries" className="inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-colors">
          {tr('Browse groceries')}<ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const inCart = quantityOf(product.id, product.weight);
  const wishlisted = isSaved(product.id);

  const asCartItem = (quantity: number): GroceryCartItem => ({
    productId: product.id,
    weight: product.weight,
    name: product.name,
    brand: product.brand,
    price: product.price,
    mrp: product.mrp,
    quantity,
    emoji: product.emoji,
    storeId: product.storeId ?? '',
    storeName: product.storeName ?? 'Store',
    ...(stock != null ? { maxQuantity: stock } : {}),
  });

  const handleAddToCart = () => {
    if (!product.inStock || !product.storeId) return;
    if (wouldReplaceCart(product.storeId)) {
      setPendingItem(asCartItem(qty));
      return;
    }
    add(asCartItem(qty));
  };




  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
        <Link href="/grocery" className="hover:text-green-600 transition-colors">{tr('Grocery')}</Link>
        <ChevronRight className="w-3 h-3" />
        <Link href={`/grocery/category/${product.category}`} className="hover:text-green-600 transition-colors capitalize">{product.category.replace(/-/g, ' ')}</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-slate-800 font-medium truncate max-w-[200px]">{product.name}</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Product Image */}
        <div className="lg:w-2/5">
          {/* The product's own picture. This slot rendered the emoji only, so a
              catalogue row with an image still showed a glyph at 140px — the
              mapping carried `imageUrl` through but nothing consumed it. */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 xs:p-6 lg:p-8 flex items-center justify-center relative aspect-square shadow-sm overflow-hidden">
            {(product as { imageUrl?: string }).imageUrl ? (
              <ProductThumb
                src={(product as { imageUrl?: string }).imageUrl!}
                alt={product.name}
                sizes="(min-width: 1024px) 480px, 92vw"
                priority
                className="rounded-xl"
              />
            ) : (
              <span className="text-[100px] md:text-[140px]">{product.emoji}</span>
            )}
            {discount > 0 && (
              <div className="absolute top-4 left-4 bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-lg shadow-sm">{discount}% OFF</div>
            )}
            {product.isVeg === false && (
              <div className="absolute bottom-4 left-4 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-lg">{tr('NON-VEG')}</div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-3">
            {/* Saves to the customer's account. `setWishlisted(!wishlisted)`
                toggled a local boolean that nothing read and nothing stored. */}
            <button
              onClick={() => { if (product.storeId) void toggleWishlist(product.id, product.storeId); }}
              disabled={requiresSignIn || !product.storeId}
              title={requiresSignIn ? 'Sign in to save items' : undefined}
              aria-pressed={wishlisted}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 min-h-[44px] rounded-xl border font-semibold text-sm transition-colors disabled:opacity-50 ${wishlisted ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              <Heart className={`w-4 h-4 ${wishlisted ? 'fill-current' : ''}`} /> {wishlisted ? 'Wishlisted' : 'Wishlist'}
            </button>
            <button onClick={() => { if (navigator.share) { navigator.share({ title: product.name, url: window.location.href }); } else { navigator.clipboard.writeText(window.location.href); alert('Link copied!'); } }} className="flex-1 flex items-center justify-center gap-2 py-2.5 min-h-[44px] rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 font-semibold text-sm transition-colors">
              <Share2 className="w-4 h-4" />{tr('Share')}</button>
          </div>
        </div>

        {/* Product Info */}
        <div className="lg:w-3/5 space-y-5">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-1">{product.brand}</p>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">{product.name}</h1>
            <p className="text-sm text-slate-500 font-medium">{product.weight}</p>
            {product.storeName && (
              <Link
                href={`/grocery/store/${product.storeId || product.storeName?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`}
                className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 min-h-[44px] bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-colors"
              >
                <span className="text-sm">🏪</span> Sold by: {product.storeName}
              </Link>
            )}
          </div>

          {/*
            Pack size.

            The page read `weightVariants[0]` and nothing else, so a product
            stocked as 250 g at QR15 and 500 g at QR28 only ever sold the 250 g —
            the larger pack was unreachable and its price never shown. Rendered
            only when there is a genuine choice.
          */}
          {variants.length > 1 && (
            <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm">
              <p className="text-sm font-semibold text-slate-700 mb-2">{tr('Pack size')}</p>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={tr('Pack size')}>
                {variants.map((v, i) => {
                  const selected = i === variantIndex;
                  const soldOut = v.stock <= 0;
                  return (
                    <button
                      key={`${v.weight}-${i}`}
                      role="radio"
                      aria-checked={selected}
                      disabled={soldOut}
                      onClick={() => { setVariantIndex(i); setQty(1); }}
                      className={`min-h-[44px] px-3 py-2 rounded-xl border text-sm font-semibold transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed ${selected ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}
                    >
                      <span className="block">{v.weight}</span>
                      <span className="block text-xs font-bold">{formatPrice(v.price)}</span>
                      {soldOut && <span className="block text-[10px] font-medium text-slate-400">{tr('Sold out')}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* The seller's own copy. `grocery_items.description` has always been
              returned by the API and no part of this page rendered it, so a
              seller who wrote one had it shown nowhere. Omitted rather than
              padded when the column is empty. */}
          {product.description && (
            <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm">
              <h2 className="text-sm font-bold text-slate-800 mb-1.5">{tr('About this product')}</h2>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{product.description}</p>
            </div>
          )}

          {/* Price */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm">
            <div className="flex items-end gap-3 mb-2">
              <span className="text-3xl font-black text-slate-900">{formatPrice(product.price)}</span>
              {product.mrp > product.price && (
                <>
                  <span className="text-lg text-slate-400 line-through">{formatPrice(product.mrp)}</span>
                  <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">You save {formatPrice(product.mrp - product.price)}</span>
                </>
              )}
            </div>
            <p className="text-xs text-slate-500">(Inclusive of all taxes)</p>
          </div>

          {/* Quantity + Add to Cart.
              The button used to do `if (qty === 0) setQty(1)` — it incremented a
              number on this page and added nothing to anything. */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm flex items-center gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">{tr('Quantity')}</p>
              <div className="flex items-center gap-1 border border-slate-200 rounded-lg overflow-hidden">
                <button onClick={() => setQty(q => Math.max(1, q - 1))} disabled={qty <= 1} className="min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-slate-50 disabled:opacity-40 text-slate-600 transition-colors" aria-label={tr('Decrease quantity')}>
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-4 py-2 text-sm font-bold text-slate-900 min-w-[40px] text-center" aria-live="polite">{qty}</span>
                <button
                  onClick={() => setQty(q => (stock != null ? Math.min(q + 1, stock) : q + 1))}
                  disabled={stock != null && qty >= stock}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-slate-50 disabled:opacity-40 text-slate-600 transition-colors"
                  aria-label={tr('Increase quantity')}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {stock != null && stock > 0 && stock <= 5 && (
                <p className="text-[11px] text-amber-600 font-semibold mt-1">Only {stock} left</p>
              )}
            </div>
            <button
              onClick={handleAddToCart}
              disabled={!product.inStock || !product.storeId}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold transition-colors shadow-sm text-sm flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              {!product.inStock ? 'Out of stock' : inCart > 0 ? 'Add more' : 'Add to Cart'}
              {product.inStock && ` • ${formatPrice(product.price * qty)}`}
            </button>
          </div>

          {/* Shown once this product is actually in the basket, with the real
              basket total rather than this page's local quantity. */}
          {inCart > 0 && (
            <Link href="/grocery/cart" className="flex items-center justify-between bg-green-600 hover:bg-green-700 text-white rounded-xl px-5 py-3.5 shadow-lg transition-colors">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                <span className="font-bold text-sm">{inCart} in your cart</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">{formatPrice(cartSubtotal)}</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </Link>
          )}

          {/* Delivery & Policies */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-center">
              <Truck className="w-5 h-5 text-green-600 mx-auto mb-1" />
              <p className="text-xs font-semibold text-green-700">{deliveryWindow()}</p>
              <p className="text-[10px] text-green-600">{tr('Express delivery')}</p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-center">
              <RefreshCw className="w-5 h-5 text-blue-600 mx-auto mb-1" />
              <p className="text-xs font-semibold text-blue-700">{tr('Easy Return')}</p>
              <p className="text-[10px] text-blue-600">{tr('Within 24 hours')}</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-center">
              <Shield className="w-5 h-5 text-amber-600 mx-auto mb-1" />
              <p className="text-xs font-semibold text-amber-700">{tr('Quality Check')}</p>
              <p className="text-[10px] text-amber-600">100% guaranteed</p>
            </div>
          </div>

          {/* The nutrition panel that stood here was six fixed values — 45 kcal,
              2.3 g protein and so on — printed under the heading "Nutritional
              Information (per 100g)" for every product in the catalogue, food or
              not. `grocery_items` carries no nutrition columns, so nothing backed
              it; stating a calorie count for a food product on no evidence is
              worse than showing none. Restore it when the catalogue can answer. */}
        </div>
      </div>

      {/* "Frequently Bought Together" stood here, filled by
          `ALL_PRODUCTS.filter(p => p.category !== product.category).slice(0, 4)`
          — four arbitrary demo fixtures from any other aisle, presented as a
          purchase pattern. Nothing records what is actually bought together, so
          the section is gone until order history can answer it. */}

      {/* Similar Products */}
      {similar.length > 0 && (
        <section className="mt-6 bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4">{tr('Similar Products')}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {similar.map(p => <SimilarProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* ── Reviews Section ──────────────────────────────────────── */}
      {/* Reviews need the real store — `'store-freshmart-qa'` was a hardcoded
          fallback, so a product whose store had not resolved posted its review
          against an unrelated shop. */}
      {product.storeId
        ? <ReviewsSection productId={product.id} storeId={product.storeId} />
        : null}

      {pendingItem && (
        <StoreSwitchDialog
          currentStoreName="another store"
          newStoreName={pendingItem.storeName}
          onCancel={() => setPendingItem(null)}
          onReplace={() => { clearCart(); add(pendingItem); setPendingItem(null); }}
        />
      )}
    </div>
  );
}

// ── Reviews Section Component ──────────────────────────────────────────────

/**
 * Real reviews for this product.
 *
 * The list was three reviews written into the file ("Fatima A.", "Mohammed R.",
 * "Sarah K.") shown under every product in the catalogue, and submitting one only
 * unshifted a row into that local array — `submitReview` was called with
 * `customerId: 'demo-customer'` and its result was discarded, `catch {}` and all.
 */
function ReviewsSection({ productId, storeId }: { productId: string; storeId: string }) {
  const { tr } = useGroceryLocale();
  const { user, isAuthenticated } = useAuth();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: loadedReviews, loading, error: loadError, reload: loadReviews } = useAsyncData<any[]>(
    async () => {
      const res = await groceryApi.getProductReviews(storeId, productId, 1, 50);
      return (res?.data ?? []) as any[];
    },
    [storeId, productId],
  );
  const reviews = loadError ? [] : (loadedReviews ?? []);

  const avgRating = reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : '0';
  const ratingCounts = [5, 4, 3, 2, 1].map(n => ({ stars: n, count: reviews.filter(r => r.rating === n).length }));

  const handleSubmit = async () => {
    if (rating === 0 || !user?.id) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      // The gateway takes the reviewer from the token; sending the id keeps the
      // request self-describing. The service rejects a second review from the same
      // customer, which is why the failure has to be shown rather than swallowed.
      await groceryApi.submitReview(storeId, productId, {
        customerId: user.id,
        customerName: user.name || undefined,
        rating,
        comment: comment.trim() || undefined,
      });
      setRating(0);
      setComment('');
      setShowForm(false);
      await loadReviews();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Could not submit your review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mt-8 bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-slate-900">{tr('Ratings & Reviews')}</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          disabled={!isAuthenticated}
          title={!isAuthenticated ? 'Sign in to write a review' : undefined}
          className="px-4 py-2 min-h-[44px] bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
        >{tr('Write a Review')}</button>
      </div>

      {loadError && (
        <p role="alert" className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{loadError}</p>
      )}
      {submitError && (
        <p role="alert" className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{submitError}</p>
      )}
      {loading && (
        <div className="space-y-2 mb-4" aria-busy="true">
          <div className="h-16 bg-slate-100 rounded-lg animate-pulse" />
          <div className="h-16 bg-slate-100 rounded-lg animate-pulse" />
        </div>
      )}
      {!loading && !loadError && reviews.length === 0 && (
        <p className="text-sm text-slate-500 mb-4">{tr('No reviews yet — be the first to review this product.')}</p>
      )}

      {/* Rating Summary */}
      <div className="flex gap-8 mb-6 pb-6 border-b border-slate-100">
        <div className="flex flex-col items-center">
          <span className="text-4xl font-bold text-slate-900">{avgRating}</span>
          <div className="flex gap-0.5 mt-1">
            {[1, 2, 3, 4, 5].map(s => (
              <Star key={s} className={`w-4 h-4 ${s <= Math.round(Number(avgRating)) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
            ))}
          </div>
          <span className="text-xs text-slate-500 mt-1">{reviews.length} reviews</span>
        </div>
        <div className="flex-1 space-y-1">
          {ratingCounts.map(({ stars, count }) => (
            <div key={stars} className="flex items-center gap-2">
              <span className="text-xs text-slate-600 w-4">{stars}</span>
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${reviews.length > 0 ? (count / reviews.length) * 100 : 0}%` }} />
              </div>
              <span className="text-xs text-slate-500 w-6 text-right">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Write Review Form */}
      {showForm && (
        <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">{tr('Your Rating')}</h3>
          <div className="flex gap-1 mb-4">
            {[1, 2, 3, 4, 5].map(s => (
              <button
                key={s}
                onMouseEnter={() => setHoverRating(s)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(s)}
                className="transition-transform hover:scale-110"
              >
                <Star className={`w-8 h-8 ${s <= (hoverRating || rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-300'} transition-colors`} />
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder={tr('Share your experience with this product...')}
            className="w-full p-3 border border-slate-200 rounded-lg text-sm resize-none h-20 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
          />
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">{tr('Cancel')}</button>
            <button
              onClick={handleSubmit}
              disabled={rating === 0 || submitting}
              className="px-5 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.map(review => (
          <div key={review.id} className="flex gap-3 py-4 border-b border-slate-50 last:border-0">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {(review.customerName || 'A')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-slate-800">{review.customerName || 'Anonymous'}</span>
                {review.isVerifiedPurchase && (
                  <span className="text-[10px] font-medium text-green-700 bg-green-50 px-1.5 py-0.5 rounded-full">✓ Verified Purchase</span>
                )}
              </div>
              <div className="flex items-center gap-1 mb-1.5">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} className={`w-3.5 h-3.5 ${s <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                ))}
                <span className="text-xs text-slate-400 ml-2">
                  {new Date(review.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              {review.comment && <p className="text-sm text-slate-600 leading-relaxed">{review.comment}</p>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
