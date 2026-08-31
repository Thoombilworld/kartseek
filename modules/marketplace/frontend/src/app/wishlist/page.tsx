'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, ShoppingCart, Trash2, Star, Truck, Bell, ArrowRight, Package } from 'lucide-react';
import { useRegion } from '@/lib/contexts/region-context';
import { getWishlist, removeFromWishlist, addToCart as apiAddToCart, createPriceAlert } from '@/lib/api/marketplace';
import { buyBoxPrice } from '@/lib/api/map-catalog-product';
import { ProductThumb, THUMB_SIZES } from '@/components/marketplace/product-thumb';
import { productPath } from '@/lib/marketplace/product-url';
import { zoneHref } from '@/lib/routes/zone-href';
import { LoadFailed } from '@/components/shared/load-failed';

interface WishlistCard {
  id: string; title: string; brand: string; category: string;
  price: number; mrp: number; rating: number; reviews: number;
  image: string; inStock: boolean; priceDropped: boolean; oldPrice: number;
}

/** Saved product entity → the shape this page renders. */
function toCard(p: any): WishlistCard {
  const mrp = Number(p?.mrp ?? 0) || 0;
  const price = buyBoxPrice(p);
  const images: any[] = Array.isArray(p?.images) ? p.images : [];
  return {
    id: String(p?.id ?? ''),
    title: p?.name ?? p?.title ?? 'Product',
    brand: p?.brand?.name ?? (typeof p?.brand === 'string' ? p.brand : ''),
    category: p?.category?.name ?? '',
    price,
    mrp,
    rating: Number(p?.averageRating ?? 0) || 0,
    reviews: Number(p?.reviewCount ?? 0) || 0,
    image: (images.find((i: any) => i?.isPrimary) ?? images[0])?.url ?? '',
    inStock: true,
    // The API has no price-history yet, so nothing can honestly claim a drop.
    priceDropped: false,
    oldPrice: price,
  };
}

function disc(mrp: number, price: number) { return Math.round(((mrp - price) / mrp) * 100); }

export default function WishlistPage() {
  const { formatCurrencyValue: fmt } = useRegion();
  // Was a hardcoded array whose ids ('p1', 'p3'…) are not in the catalogue, so
  // every saved item linked to a product page that 404'd — and the heart button
  // on product cards, which does call the API, had no effect on what showed here.
  const [items, setItems] = useState<WishlistCard[]>([]);
  // Distinguishes "the request failed" from "you have no wishlist".
  // The catch below emptied the list and recorded nothing, so an
  // unreachable service rendered the empty state and told the customer
  // something untrue about their account.
  const [loadFailed, setLoadFailed] = useState(false);
  const [watching, setWatching] = useState(false);
  const [watchResult, setWatchResult] = useState<{ message: string; failed: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [addedToCart, setAddedToCart] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    getWishlist()
      .then((res: any) => {
        if (cancelled) return;
        const rows = res?.products ?? res?.data?.products ?? res?.data ?? [];
        setItems((Array.isArray(rows) ? rows : []).map(toCard).filter(c => c.id));
      })
      .catch(() => { if (!cancelled) { setItems([]); setLoadFailed(true); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  function removeItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id));   // optimistic
    removeFromWishlist(id).catch(() => {});
  }
  function addToCart(id: string) {
    setAddedToCart(prev => [...prev, id]);
    apiAddToCart(id, 1).catch(() => setAddedToCart(prev => prev.filter(x => x !== id)));
  }

  /**
   * Watch every saved item for a price drop.
   *
   * Reports partial success honestly. Some items legitimately cannot be
   * watched — a saved product whose only listing has since gone offline has no
   * price to compare against, and the API refuses those rather than storing a
   * row that can never fire. Claiming "alerts set" for all of them would be the
   * fabricated-success pattern this control used to be an example of.
   */
  async function watchAllPrices() {
    setWatching(true);
    setWatchResult(null);
    const results = await Promise.allSettled(items.map(i => createPriceAlert(i.id)));
    const ok = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.length - ok;
    setWatching(false);
    setWatchResult(
      ok === 0
        ? { message: 'None of these could be watched right now. Please try again.', failed: true }
        : failed === 0
          ? { message: `Watching ${ok} item${ok === 1 ? '' : 's'} for price drops.`, failed: false }
          : { message: `Watching ${ok} of ${results.length}. The rest have no live price to track.`, failed: true },
    );
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-3 xs:px-4 py-6">
        <div className="h-7 w-48 bg-slate-200 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="aspect-square bg-slate-100 animate-pulse" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-slate-100 rounded animate-pulse w-2/3" />
                <div className="h-4 bg-slate-100 rounded animate-pulse w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (loadFailed) {
    return <LoadFailed title="We could not load your wishlist" onRetry={() => window.location.reload()} />;
  }

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <div className="w-24 h-24 rounded-full bg-red-50 flex items-center justify-center mb-6">
          <Heart className="w-12 h-12 text-red-300" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Your Wishlist is Empty</h2>
        <p className="text-slate-500 mb-6 max-w-sm">Save items you love by clicking the heart icon on any product.</p>
        <Link href="/" className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center gap-2">
          <Package className="w-5 h-5" /> Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-3 xs:px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Wishlist</h1>
          <p className="text-slate-500 text-sm mt-1">{items.length} item{items.length !== 1 ? 's' : ''} saved</p>
        </div>
        {/* This was a handlerless button advertising a service that did not
            exist, and was removed rather than stubbed. `POST
            /marketplace/products/:id/price-alert` exists now, so it is back and
            does what it says: one alert per saved item, each watching the price
            the shopper is looking at right now. */}
        {items.length > 0 && (
          <div className="text-right">
            <button
              type="button"
              onClick={watchAllPrices}
              disabled={watching}
              className="flex items-center gap-2 text-sm text-blue-600 font-bold hover:underline disabled:opacity-60 disabled:no-underline"
            >
              <Bell className="w-4 h-4" />
              {watching ? 'Setting alerts…' : 'Notify me of price drops'}
            </button>
            {watchResult && (
              <p className={`text-xs mt-1 ${watchResult.failed ? 'text-amber-600' : 'text-emerald-600'}`} role="status">
                {watchResult.message}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Price Drop Alert */}
      {items.some(i => i.priceDropped) && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <p className="font-bold text-green-800 text-sm">Price drops on {items.filter(i => i.priceDropped).length} item(s)!</p>
            <p className="text-green-600 text-xs">Prices have dropped since you saved them. Grab them now!</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {items.map(item => {
          const d = disc(item.mrp, item.price);
          const inCart = addedToCart.includes(item.id);
          return (
            <div key={item.id} className={`bg-white border ${item.priceDropped ? 'border-green-300' : 'border-slate-200'} rounded-xl overflow-hidden hover:shadow-md transition-shadow relative group`}>
              {item.priceDropped && (
                <div className="absolute top-2 left-2 z-10 bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Price Dropped!
                </div>
              )}
              {!item.inStock && (
                <div className="absolute inset-0 bg-white/70 z-20 flex items-center justify-center rounded-xl">
                  <span className="bg-slate-800 text-white text-sm font-bold px-4 py-2 rounded-lg">Out of Stock</span>
                </div>
              )}
              <button title="Remove from wishlist" onClick={() => removeItem(item.id)} className="absolute top-2 right-2 z-10 p-1.5 bg-white rounded-full shadow-sm border border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:border-red-200">
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
              <Link href={zoneHref(productPath(item))}>
                <ProductThumb
                  src={item.image}
                  alt={item.title}
                  brand={item.brand}
                  sizes={THUMB_SIZES.grid4}
                />
                <div className="p-3">
                  <p className="text-[10px] text-blue-600 font-bold uppercase mb-1">{item.brand}</p>
                  <h3 className="text-sm font-medium text-slate-800 line-clamp-2 leading-snug mb-2">{item.title}</h3>
                  <div className="flex items-center gap-1 mb-2">
                    <span className="bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">{item.rating} ★</span>
                    <span className="text-[11px] text-slate-400">({item.reviews.toLocaleString()})</span>
                  </div>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-bold text-base text-slate-900">{fmt(item.price)}</span>
                    {item.mrp > item.price && <span className="text-xs text-slate-400 line-through">{fmt(item.mrp)}</span>}
                    {d > 0 && <span className="text-xs text-green-600 font-bold">{d}% off</span>}
                  </div>
                  {item.priceDropped && (
                    <p className="text-[10px] text-green-600 mt-0.5">Was {fmt(item.oldPrice)}</p>
                  )}
                  <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1"><Truck className="w-3 h-3" /> Free delivery</p>
                </div>
              </Link>
              <div className="px-3 pb-3 flex gap-2">
                <button
                  disabled={!item.inStock}
                  onClick={() => addToCart(item.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-lg transition-colors ${
                    inCart ? 'bg-green-100 text-green-700 border border-green-300' :
                    item.inStock ? 'bg-blue-600 hover:bg-blue-700 text-white' :
                    'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  {inCart ? 'Added!' : 'Add to Cart'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Continue Shopping */}
      <div className="mt-8 text-center">
        <Link href="/" className="inline-flex items-center gap-2 text-blue-600 font-bold hover:underline">
          Continue Shopping <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
