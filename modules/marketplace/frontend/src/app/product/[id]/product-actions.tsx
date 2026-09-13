'use client';

import React from 'react';
import { ShoppingCart, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCartContext } from '@/lib/contexts/cart-context';
import { useToast } from '@/lib/contexts/toast-context';
import { WishlistButton } from '@/components/shared/wishlist-button';
import { ShareButton } from '@/components/shared/share-button';
import { useVariants } from './variant-context';
import type { ProductDetail } from '@/lib/marketplace/product-detail';

/**
 * Add to Cart / Buy Now, inline on desktop and as a sticky bar on a phone.
 *
 * Gated on the one stock figure the page shows: a product with no SKUs and an
 * offer at zero stock used to have a live button (only variant products were
 * checked), so an unbuyable line went into the basket and checkout refused it.
 *
 * The line sent to the cart carries the product id, the SKU id and the
 * quantity. The price is display-only: the gateway prices every line itself
 * from the buy-box offer and the SKU (`PRICE_ORDER_ITEMS`), so nothing a
 * browser sends can move the amount charged.
 *
 * The heart used to raise a toast and save nothing; it is the shared
 * `WishlistButton`, which is auth-gated and writes to the account.
 */
export function ProductActions({ product }: { product: ProductDetail }) {
  const cart = useCartContext();
  const toast = useToast();
  const router = useRouter();
  const variants = useVariants();

  const selected = variants?.selected ?? null;
  const blockedReason =
    variants?.blockedReason ??
    (product.availability.status === 'in_stock' || product.availability.status === 'low_stock'
      ? null
      : 'out_of_stock');
  const blocked = blockedReason !== null;
  const quantity = variants?.quantity ?? 1;

  const explain = () => {
    switch (blockedReason) {
      case 'select_options':
        toast.error('Please choose an available option first.');
        break;
      case 'out_of_stock':
        toast.error(
          selected
            ? 'That option is out of stock. Please choose another.'
            : 'This product is out of stock.',
        );
        break;
      case 'unavailable':
        toast.error('This product is not available in your market.');
        break;
      default:
        break;
    }
  };

  const addLine = (): boolean => {
    if (blocked) {
      explain();
      return false;
    }
    cart.add({
      id: product.id,
      name: selected?.name ? `${product.name} — ${selected.name}` : product.name,
      // Display price for the optimistic cart row; the server re-prices it.
      price: Number(variants?.effectivePrice ?? product.price) || 0,
      quantity,
      imageUrl: variants?.images?.[0] || product.images[0] || '',
      variantId: selected?.id,
      brand: product.brand?.name || '',
    });
    return true;
  };

  const handleAddToCart = () => {
    if (!addLine()) return;
    toast.success(
      `Added ${quantity > 1 ? `${quantity} × ` : ''}${
        selected?.name ? `${product.name} (${selected.name})` : product.name
      } to cart`,
    );
  };

  const handleBuyNow = () => {
    if (!addLine()) return;
    // Marketplace has its own checkout (coupons, wallet, stepped flow); the
    // cart page already routes here, so Buy Now must not diverge to /checkout.
    router.push('/checkout');
  };

  const label =
    blockedReason === 'out_of_stock'
      ? 'Out of stock'
      : blockedReason === 'unavailable'
        ? 'Not available'
        : blockedReason === 'select_options'
          ? 'Choose options'
          : 'Add to Cart';

  return (
    <>
      {/* Inline on tablet/desktop */}
      <div className="hidden md:flex items-center gap-3 mt-6" data-testid="product-actions">
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={blocked}
          aria-disabled={blocked}
          className="flex-1 bg-[#ff9f00] hover:bg-[#f39800] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-sm flex items-center justify-center gap-2 transition-transform transform active:scale-95 shadow-sm text-sm uppercase tracking-wide"
        >
          <ShoppingCart className="w-5 h-5" aria-hidden="true" /> {label}
        </button>
        <button
          type="button"
          onClick={handleBuyNow}
          disabled={blocked}
          aria-disabled={blocked}
          className="flex-1 bg-[#fb641b] hover:bg-[#f35914] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-sm flex items-center justify-center gap-2 transition-transform transform active:scale-95 shadow-sm text-sm uppercase tracking-wide"
        >
          <Zap className="w-5 h-5" aria-hidden="true" /> Buy Now
        </button>
        <WishlistButton
          productId={product.id}
          className="w-12 h-12 bg-white border border-slate-200 hover:bg-red-50 rounded-sm flex items-center justify-center transition-colors shadow-sm"
        />
        <ShareButton
          title={product.name}
          text={product.shortDescription || product.name}
          className="h-12 px-3 bg-white border border-slate-200 hover:bg-slate-50 rounded-sm text-sm font-semibold text-slate-700 shadow-sm"
        />
      </div>

      {/* Sticky bar on a phone, above the bottom navigation and above the
          consent banner when it is showing — the banner is fixed too, and a
          bar under it cannot be tapped. */}
      <div
        className="md:hidden fixed left-0 right-0 z-40 bg-white border-t border-slate-200 px-3 py-2.5 flex gap-2 shadow-[0_-4px_16px_-2px_rgba(0,0,0,0.08)]"
        style={{
          bottom:
            'calc(3.75rem + env(safe-area-inset-bottom, 0px) + var(--consent-banner-height, 0px))',
        }}
        data-testid="product-actions-sticky"
      >
        <WishlistButton
          productId={product.id}
          className="w-12 shrink-0 border border-slate-200 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
        />
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={blocked}
          aria-disabled={blocked}
          className="flex-1 bg-[#ff9f00] disabled:bg-slate-300 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-sm active:scale-95 transition-transform"
        >
          <ShoppingCart className="w-4 h-4" aria-hidden="true" /> {label}
        </button>
        <button
          type="button"
          onClick={handleBuyNow}
          disabled={blocked}
          aria-disabled={blocked}
          className="flex-1 bg-[#fb641b] disabled:bg-slate-300 text-white font-bold py-3 rounded-xl flex items-center justify-center text-sm active:scale-95 transition-transform"
        >
          Buy Now
        </button>
      </div>
    </>
  );
}
