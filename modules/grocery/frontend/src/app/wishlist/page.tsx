'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Heart, ShoppingCart, Trash2, ArrowLeft, Star, Store, AlertTriangle } from 'lucide-react';
import { AuthGate } from '@/components/shared/auth-gate';
import { useGroceryLocale } from '@/i18n/grocery-locale';
import { groceryDiscountPercent } from '@/lib/demo-data/grocery-home';
import { useGroceryWishlist } from '@/lib/hooks/use-grocery-wishlist';
import { useGroceryCart, type GroceryCartItem } from '@/lib/contexts/grocery-cart-context';
import { StoreSwitchDialog } from '@/components/grocery/store-switch-dialog';
import { ProductThumb, THUMB_SIZES } from '@/components/marketplace/product-thumb';
import { productPath } from '@/lib/grocery/urls';
import { zoneHref } from '@/lib/routes/zone-href';

/**
 * Saved grocery products.
 *
 * This page rendered five items copied out of the demo catalogue: "Remove" spliced
 * a local array, "Add" was a button with no handler at all, and nothing was ever
 * read from or written to the wishlist API — which had existed the whole time. It
 * now reads the customer's real wishlist and both buttons do what they say.
 */
export default function GroceryWishlistPage() {
  return (
    <AuthGate reason="Sign in to see the products you've saved.">
      <GroceryWishlistContent />
    </AuthGate>
  );
}

function GroceryWishlistContent() {
  const { formatPrice, tr } = useGroceryLocale();
  const { items, loading, error, toggle, refresh } = useGroceryWishlist();
  const { add, wouldReplaceCart, clear: clearCart, storeName: cartStoreName, quantityOf } = useGroceryCart();

  const [removing, setRemoving] = useState<string | null>(null);
  const [pendingItem, setPendingItem] = useState<GroceryCartItem | null>(null);

  const removeItem = async (productId: string, storeId: string) => {
    setRemoving(productId);
    try { await toggle(productId, storeId); }
    finally { setRemoving(null); }
  };

  const addItem = (item: (typeof items)[number]) => {
    const variant = item.weightVariants?.[0];
    if (!variant || !item.inStock) return;
    const cartItem: GroceryCartItem = {
      productId: item.productId,
      weight: variant.weight,
      name: item.productName,
      brand: item.brand ?? undefined,
      price: Number(variant.price),
      mrp: Number(variant.mrp),
      quantity: 1,
      imageUrl: item.imageUrl ?? undefined,
      storeId: item.storeId,
      storeName: cartStoreName ?? 'Store',
      maxQuantity: Number(variant.stock ?? 0),
    };
    if (wouldReplaceCart(item.storeId)) { setPendingItem(cartItem); return; }
    add(cartItem);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="p-2 bg-white rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors" aria-label={tr('Back to grocery')}>
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{tr('My Wishlist')}</h1>
          <p className="text-sm text-slate-500">
            {loading ? 'Loading…' : `${items.length} saved ${items.length === 1 ? 'item' : 'items'}`}
          </p>
        </div>
        <Heart className="w-6 h-6 text-red-500 fill-red-500 ml-auto" />
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 mb-4">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p>{error}</p>
            <button onClick={() => void refresh()} className="mt-1 font-semibold underline">{tr('Try again')}</button>
          </div>
        </div>
      )}

      {loading && items.length === 0 && (
        <div className="space-y-3" aria-busy="true">
          <div className="h-28 bg-white border border-slate-200 rounded-xl animate-pulse" />
          <div className="h-28 bg-white border border-slate-200 rounded-xl animate-pulse" />
        </div>
      )}

      {!loading && items.length === 0 && !error ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 mx-auto mb-4 bg-red-50 rounded-full flex items-center justify-center">
            <Heart className="w-10 h-10 text-red-300" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">{tr('Your wishlist is empty')}</h2>
          <p className="text-slate-500 mb-6">{tr('Save products you love by tapping the heart icon')}</p>
          <Link href="/stores" className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors">
            <ShoppingCart className="w-4 h-4" />{tr('Browse Groceries')}</Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map(item => {
            const variant = item.weightVariants?.[0];
            const price = variant ? Number(variant.price) : item.price ?? 0;
            const mrp = variant ? Number(variant.mrp) : item.mrp ?? price;
            const discount = groceryDiscountPercent(mrp, price);
            const isRemoving = removing === item.productId;
            const inCart = variant ? quantityOf(item.productId, variant.weight) : 0;
            const purchasable = item.available && item.inStock && !!variant;

            return (
              <li
                key={item.productId}
                className={`bg-white border border-slate-200/80 rounded-xl p-4 flex items-center gap-4 shadow-sm transition-all duration-300 ${isRemoving ? 'opacity-40' : 'opacity-100'}`}
              >
                {/* Product image */}
                <Link href={zoneHref(productPath({ id: item.productId, name: item.productName }))} className="shrink-0 w-20 h-20">
                  <div className="w-20 h-20 relative">
                    {item.imageUrl
                      ? <ProductThumb src={item.imageUrl} alt={item.productName} sizes={THUMB_SIZES.row} className="rounded-xl" />
                      : (
                        <div className="w-20 h-20 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl flex items-center justify-center">
                          <ShoppingCart className="w-7 h-7 text-slate-300" />
                        </div>
                      )}
                    {discount > 0 && (
                      <span className="absolute -top-1 -left-1 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-lg">{discount}%</span>
                    )}
                  </div>
                </Link>

                {/* Product info */}
                <div className="flex-1 min-w-0">
                  <Link href={zoneHref(productPath({ id: item.productId, name: item.productName }))}>
                    <h2 className="font-semibold text-slate-800 text-sm line-clamp-1 hover:text-green-600 transition-colors">{item.productName}</h2>
                  </Link>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {[variant?.weight, item.brand].filter(Boolean).join(' · ') || '—'}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    {/* The rating was the literal string "4.5" under every item. */}
                    {item.rating != null && item.rating > 0 && (
                      <>
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span className="text-xs text-slate-600">{item.rating.toFixed(1)}</span>
                        {item.reviewCount > 0 && <span className="text-xs text-slate-400">({item.reviewCount})</span>}
                        <span className="text-slate-300 mx-1">·</span>
                      </>
                    )}
                    <Store className="w-3 h-3 text-slate-400" />
                    <span className="text-xs text-slate-500 truncate">{item.category ?? 'Grocery'}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="font-bold text-base text-slate-900">{formatPrice(price)}</span>
                    {mrp > price && <span className="text-xs text-slate-400 line-through">{formatPrice(mrp)}</span>}
                    {!purchasable && (
                      <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                        {item.available ? 'Out of stock' : 'No longer sold'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={() => addItem(item)}
                    disabled={!purchasable}
                    className="px-4 py-2 min-h-[36px] bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" /> {inCart > 0 ? `In cart (${inCart})` : 'Add'}
                  </button>
                  <button
                    onClick={() => void removeItem(item.productId, item.storeId)}
                    disabled={isRemoving}
                    className="px-4 py-2 min-h-[36px] text-red-500 bg-red-50 text-xs font-medium rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />{tr('Remove')}</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

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
