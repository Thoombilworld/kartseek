'use client';

import React from 'react';
import { ShoppingCart, Heart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCartContext } from '@/lib/contexts/cart-context';
import { useToast } from '@/lib/contexts/toast-context';
import { useVariants } from './variant-context';

export function ProductActions({ product, qty = 1 }: { product: any, qty?: number }) {
  const cart = useCartContext();
  const toast = useToast();
  const router = useRouter();
  // The page's one variant selection. This component used to render its own
  // second set of variant buttons off `metadata.variantDimensions`, entirely
  // unconnected to the selector above it — two pickers, two answers, and the
  // one that decided what went in the cart was the one nobody was looking at.
  const variants = useVariants();

  const selected = variants?.selected ?? null;
  const blocked = !!variants && variants.axes.length > 0 && (!selected || selected.stock <= 0);

  const handleAddToCart = () => {
    // Never add a line the seller cannot fulfil. Before this the button always
    // succeeded: it added the parent product at the parent's price with a
    // stringified attribute map as the "variant id" — not a SKU any order can
    // resolve — so an out-of-stock 512GB choice became an in-stock 128GB line
    // at the 128GB price.
    if (blocked) {
      toast.error(selected
        ? 'That option is out of stock. Please choose another.'
        : 'Please choose an available option first.');
      return;
    }

    cart.add({
      id: product.id,
      name: selected?.name ? `${product.title} — ${selected.name}` : product.title,
      // The SKU's own price when one is selected; `effectivePrice` falls back
      // to the buy-box price for a product with no variants.
      price: Number(variants?.effectivePrice ?? product.listing?.sellingPrice ?? product.mrp ?? 0),
      quantity: qty,
      // `metadata.imageGalleryUrls` is empty for every catalogue product — the
      // images live in the `images` relation — so cart lines had no picture.
      imageUrl: variants?.images?.[0] || product.images?.[0]?.url || product.metadata?.imageGalleryUrls?.[0] || '',
      variantId: selected?.id,
      brand: product.brand?.name || 'Unknown',
    });
    toast.success(`Added ${selected?.name ? `${product.title} (${selected.name})` : product.title} to cart`);
  };

  const handleBuyNow = () => {
    handleAddToCart();
    // Marketplace has its own checkout (coupons, wallet, stepped flow) — the
    // cart page already routes here, so Buy Now must not diverge to /checkout.
    router.push('/checkout');
  };

  return (
    <>
      {/* Action Buttons — inline on tablet/desktop */}
      <div className="hidden md:flex gap-3 mt-6">
        <button
          onClick={handleAddToCart}
          disabled={blocked}
          className="flex-1 bg-[#ff9f00] hover:bg-[#f39800] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-sm flex items-center justify-center gap-2 transition-transform transform active:scale-95 shadow-sm text-sm uppercase tracking-wide"
        >
          <ShoppingCart className="w-5 h-5" /> Add to Cart
        </button>
        <button
          onClick={handleBuyNow}
          disabled={blocked}
          className="flex-1 bg-[#fb641b] hover:bg-[#f35914] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-sm flex items-center justify-center transition-transform transform active:scale-95 shadow-sm text-sm uppercase tracking-wide"
        >
          Buy Now
        </button>
        <button
          title="Add to Wishlist"
          onClick={() => toast.success('Added to Wishlist')}
          className="w-12 bg-white border border-slate-200 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-sm flex items-center justify-center transition-colors shadow-sm"
        >
          <Heart className="w-5 h-5" />
        </button>
      </div>

      {/* Action Buttons — sticky bar on mobile, above the bottom nav.
          Same handlers as the desktop row; the page used to render a separate
          decorative bar here with no click handlers at all. */}
      <div
        className="md:hidden fixed left-0 right-0 z-40 bg-white border-t border-slate-200 px-3 py-2.5 flex gap-2 shadow-[0_-4px_16px_-2px_rgba(0,0,0,0.08)]"
        style={{ bottom: 'calc(3.75rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <button
          onClick={handleAddToCart}
          disabled={blocked}
          className="flex-1 bg-[#ff9f00] disabled:bg-slate-300 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-sm active:scale-95 transition-transform"
        >
          <ShoppingCart className="w-4 h-4" /> Add to Cart
        </button>
        <button
          onClick={handleBuyNow}
          disabled={blocked}
          className="flex-1 bg-[#fb641b] disabled:bg-slate-300 text-white font-bold py-3 rounded-xl flex items-center justify-center text-sm active:scale-95 transition-transform"
        >
          Buy Now
        </button>
        <button
          title="Add to Wishlist"
          aria-label="Add to Wishlist"
          onClick={() => toast.success('Added to Wishlist')}
          className="w-12 shrink-0 border border-slate-200 text-slate-400 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
        >
          <Heart className="w-5 h-5" />
        </button>
      </div>
    </>
  );
}
