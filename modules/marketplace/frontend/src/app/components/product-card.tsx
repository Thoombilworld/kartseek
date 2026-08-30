'use client';

import React, { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Heart, Star, Truck, ShoppingCart, Check, Loader2,
  ChevronLeft, ChevronRight,
  Smartphone, Laptop, Shirt, Sofa, Dumbbell, Baby, Sparkles, BookOpen,
  Car, ShoppingBasket, Tv, Headphones,
} from 'lucide-react';
import { addToWishlist, removeFromWishlist } from '@/lib/api/marketplace';
import { useCartContext } from '@/lib/contexts/cart-context';
import { useToast } from '@/lib/contexts/toast-context';
import { formatReviewCount } from '@/lib/product-image';
import { ProductThumb, THUMB_SIZES } from '@/components/marketplace/product-thumb';
import { swatchFill, isColourAxis, variantAxisLabel } from '@/lib/marketplace/variant-display';
import { productPath } from '@/lib/marketplace/product-url';

/**
 * What a card needs to render, stated structurally rather than as one concrete
 * type. `HomeProduct` satisfies it, and so do the narrower rows the category and
 * subcategory pages map out of the catalogue — those grids can now share this
 * component without first being widened into a shape they have no use for.
 */
export interface ProductCardModel {
  id: string;
  title: string;
  brand?: string;
  price: number;
  mrp: number;
  rating?: number | string;
  reviews?: string | number;
  badge?: string;
  badgeColor?: string;
  /** lucide icon name, used only as an image fallback */
  icon?: string;
  category?: string;
  delivery?: string;
  imageUrl?: string;
  /**
   * Every image the catalogue holds for this product, primary first.
   *
   * The card showed one photograph and there was no way to see another without
   * opening the product — the gesture every competing storefront supports on a
   * grid. `imageUrl` stays as the single-image shorthand and is used when this
   * is absent.
   */
  images?: string[];
  /** Bundled placeholder: renders, but never links to a detail page that 404s. */
  displayOnly?: boolean;
  /** Pickable variant axes, e.g. `[{ variantName: 'Colour', variantOptions: [...] }]`. */
  variantAxes?: { variantName: string; variantOptions: string[] }[];
}

/**
 * The card's images, de-duplicated and primary-first.
 *
 * `imageUrl` is the row the mappers already resolved as primary, so it leads
 * even when it also appears in `images` — the catalogue does not guarantee that
 * `images[0]` is the primary one (it is ordered by `sortOrder`, and seeded rows
 * carry `isPrimary` on a later row).
 */
function cardImages(product: Pick<ProductCardModel, 'imageUrl' | 'images'>): string[] {
  const all = [product.imageUrl, ...(product.images ?? [])]
    .map((url) => (typeof url === 'string' ? url.trim() : ''))
    .filter(Boolean);
  return [...new Set(all)];
}

/** Above this the dots become unreadable and the track a scroll trap. */
const MAX_CARD_IMAGES = 6;

const ICON_MAP: Record<string, React.ElementType> = {
  Smartphone, Laptop, Shirt, Sofa, Dumbbell, Baby, Sparkles, BookOpen,
  Car, ShoppingBasket, Tv, Headphones,
};

function discountPercent(mrp: number, price: number): number {
  if (!mrp || !price || mrp <= price) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
}

/**
 * The card's image well — a swipeable track when the product has more than one
 * photograph.
 *
 * Built on native scroll-snap rather than a drag handler, for the same reason
 * the detail gallery is: the browser then supplies momentum, rubber-banding,
 * trackpad gestures and the accessibility tree for free, and a horizontal drag
 * scrolls the track instead of being interpreted as a click on the card's link.
 * A tap still opens the product, which is what a tap on a product photograph
 * should do.
 *
 * `overscroll-x-contain` stops a swipe past the last image from turning into a
 * browser back-navigation on iOS.
 */
function ProductMedia({
  images,
  title,
  brand,
  iconName,
  priority,
}: {
  images: string[];
  title: string;
  brand?: string;
  iconName?: string;
  priority?: boolean;
}) {
  const [active, setActive] = useState(0);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const scrollingTo = useRef<number | null>(null);
  const count = images.length;

  const goTo = useCallback((index: number, e?: React.MouseEvent) => {
    // The whole card is a link; a control inside it must not navigate.
    e?.preventDefault();
    e?.stopPropagation();
    const track = trackRef.current;
    if (!track) return;
    const next = Math.max(0, Math.min(index, count - 1));
    setActive(next);
    scrollingTo.current = next;
    track.scrollTo({ left: next * track.clientWidth, behavior: 'smooth' });
  }, [count]);

  // Keep the dots in step with a finger-driven scroll.
  const handleScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    const index = Math.round(track.scrollLeft / track.clientWidth);
    if (scrollingTo.current !== null) {
      if (index === scrollingTo.current) scrollingTo.current = null;
      return;
    }
    setActive((prev) => (index !== prev && index >= 0 && index < count ? index : prev));
  }, [count]);

  const frame = (
    <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-white border border-slate-100">
      {count <= 1 ? (
        <ProductThumb
          src={images[0]}
          alt={title}
          brand={brand}
          fallbackIcon={(iconName && ICON_MAP[iconName]) || undefined}
          sizes={THUMB_SIZES.grid4}
          priority={priority}
        />
      ) : (
        <>
          <div
            ref={trackRef}
            onScroll={handleScroll}
            className="flex h-full overflow-x-auto snap-x snap-mandatory hide-scrollbar overscroll-x-contain"
            style={{ scrollbarWidth: 'none' }}
            aria-label={`${title} — ${count} images, swipe to browse`}
          >
            {images.map((url, i) => (
              <div key={url} className="relative shrink-0 w-full h-full snap-center">
                <ProductThumb
                  src={url}
                  alt={i === 0 ? title : `${title} — image ${i + 1}`}
                  brand={brand}
                  fallbackIcon={(iconName && ICON_MAP[iconName]) || undefined}
                  sizes={THUMB_SIZES.grid4}
                  // Only the leading frame competes for bandwidth on first paint;
                  // the rest sit off-screen in the track.
                  priority={priority && i === 0}
                />
              </div>
            ))}
          </div>

          {/* Dots. Sized as real touch targets — on a phone these are the only
              indication that the card holds more than one photograph. */}
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-0.5 z-10">
            {images.map((url, i) => (
              <button
                key={url}
                type="button"
                onClick={(e) => goTo(i, e)}
                className="px-0.5 py-2 flex items-center"
                aria-label={`Show image ${i + 1} of ${count}`}
                aria-current={i === active ? 'true' : undefined}
              >
                <span
                  className={`block h-1.5 rounded-full transition-all duration-300 ${
                    i === active ? 'w-3.5 bg-slate-700' : 'w-1.5 bg-slate-300'
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Arrows are a pointer affordance: hidden on touch, where the swipe
              is the gesture, and hidden until the card is hovered so they do
              not sit permanently over the product. */}
          <button
            type="button"
            onClick={(e) => goTo(active - 1, e)}
            disabled={active === 0}
            aria-label="Previous image"
            className="hidden md:flex absolute left-1 top-1/2 -translate-y-1/2 p-1 rounded-full bg-white/90 border border-slate-200 shadow-sm text-slate-600 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity disabled:opacity-0 z-10"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => goTo(active + 1, e)}
            disabled={active === count - 1}
            aria-label="Next image"
            className="hidden md:flex absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-full bg-white/90 border border-slate-200 shadow-sm text-slate-600 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity disabled:opacity-0 z-10"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </>
      )}
    </div>
  );

  return frame;
}

export interface ProductCardProps {
  product: ProductCardModel;
  formatCurrencyValue: (n: number) => string;
  /** Set on the first row of a grid so its images are not lazy-loaded. */
  priority?: boolean;
}

/**
 * The single marketplace product card.
 *
 * Every listing surface renders this one component. Category, subcategory and
 * the home grid each used to carry their own copy, which is how they drifted
 * apart: one had a working wishlist and the others a button that did nothing,
 * one hard-coded "Free Delivery" regardless of the product, and only one showed
 * a badge. Anything that must differ between surfaces belongs in a prop.
 */
export function ProductCard({ product, formatCurrencyValue, priority }: ProductCardProps) {
  const discount = discountPercent(product.mrp, product.price);
  const savings = product.mrp > product.price ? product.mrp - product.price : 0;

  const [wishlisted, setWishlisted] = useState(false);
  const [wishBusy, setWishBusy] = useState(false);
  const [cartState, setCartState] = useState<'idle' | 'adding' | 'added'>('idle');

  // The shared cart, not a direct API call. This card used to POST to
  // /marketplace/cart itself, which broke it in three separate ways: the header
  // badge never moved (the API result was never fed back into cart state), the
  // request fired even when signed out — where every cart route is behind
  // JwtAuthGuard and there is no guest cart, so it was rejected and logged as a
  // gateway ERROR — and any failure was swallowed into a silent reset, so the
  // button simply looked dead. The detail page always used this context, which
  // is why "Add to Cart" appeared to work there and nowhere else.
  const cart = useCartContext();
  const toast = useToast();

  const stop = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); };

  const handleWishlist = async (e: React.MouseEvent) => {
    stop(e);
    if (wishBusy) return;
    const next = !wishlisted;
    setWishlisted(next);            // optimistic
    setWishBusy(true);
    try {
      if (next) await addToWishlist(product.id);
      else await removeFromWishlist(product.id);
    } catch {
      // Reverting the heart with no explanation reads as the button being
      // broken. The usual cause is simply not being signed in — wishlist routes
      // are behind JwtAuthGuard — so say that rather than leaving it a mystery.
      setWishlisted(!next);
      toast.error('Sign in to save items to your wishlist.');
    } finally {
      setWishBusy(false);
    }
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    stop(e);
    if (cartState === 'adding') return;
    setCartState('adding');
    try {
      cart.add({
        id: product.id,
        name: product.title,
        price: product.price,
        quantity: 1,
        imageUrl: product.imageUrl,
        brand: product.brand,
      });
      setCartState('added');
      toast.success(`Added ${product.title} to cart`);
      setTimeout(() => setCartState('idle'), 1800);
    } catch {
      // A failure here is a genuine fault rather than a rejected request, so it
      // must be visible. Resetting the button in silence is what made this look
      // like a dead control instead of an error.
      setCartState('idle');
      toast.error('Could not add this item to your cart. Please try again.');
    }
  };

  // The detail route is keyed on the product id; a card without one can only ever
  // navigate to a 404, so it renders as a plain div. `displayOnly` marks a bundled
  // placeholder shown while the catalogue is unreachable — same reasoning.
  const linkable = !!product.id && !product.displayOnly;
  const Card = linkable ? Link : 'div';
  const cardProps = linkable ? { href: productPath(product) } : {};

  const rating = Number(product.rating) || 0;

  return (
    <Card
      {...(cardProps as any)}
      className="group relative flex flex-col h-full bg-white border border-slate-200/70 rounded-2xl p-2.5 sm:p-3 transition-[box-shadow,transform,border-color] duration-300 hover:border-slate-300 hover:shadow-[0_12px_32px_-12px_rgba(15,23,42,0.25)] hover:-translate-y-0.5 focus-within:ring-2 focus-within:ring-blue-500/40"
    >
      {/* ── Media ── */}
      <div className="relative">
        <ProductMedia
          images={cardImages(product).slice(0, MAX_CARD_IMAGES)}
          title={product.title}
          brand={product.brand}
          iconName={product.icon}
          priority={priority}
        />

        {/* Badge takes precedence over the derived discount ribbon — a curated
            "BESTSELLER" outranks a number the card worked out for itself. */}
        {product.badge ? (
          <span className={`absolute top-2 left-2 ${product.badgeColor || 'bg-slate-900'} text-white text-[10px] font-bold px-2 py-0.5 rounded-md z-10 uppercase tracking-wide shadow-sm`}>
            {product.badge}
          </span>
        ) : discount > 0 ? (
          <span className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md z-10 shadow-sm">
            {discount}% OFF
          </span>
        ) : null}

        <button
          type="button"
          className={`absolute top-2 right-2 p-1.5 rounded-full z-10 shadow-sm border backdrop-blur-sm transition-all duration-200 ${
            wishlisted
              ? 'bg-red-50 text-red-500 border-red-100'
              : 'bg-white/85 text-slate-400 hover:text-red-500 hover:bg-red-50 border-slate-100'
          } ${wishBusy ? 'opacity-70' : ''}`}
          title={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          aria-label={wishlisted ? `Remove ${product.title} from wishlist` : `Add ${product.title} to wishlist`}
          aria-pressed={wishlisted}
          onClick={handleWishlist}
        >
          <Heart className={`w-4 h-4 transition-transform ${wishlisted ? 'fill-red-500 scale-110' : ''}`} />
        </button>
      </div>

      {/* ── Details ── */}
      <div className="flex-1 flex flex-col pt-3">
        {product.brand && (
          <p className="text-[10px] text-slate-400 font-semibold mb-1 uppercase tracking-[0.08em] truncate">
            {product.brand}
          </p>
        )}

        <h3 className="font-medium text-slate-800 text-[13px] sm:text-sm mb-2 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
          {product.title}
        </h3>

        {/* An unrated product shows nothing rather than a made-up "4.0" — a
            fabricated rating on a brand-new listing is worse than none. */}
        {rating > 0 && (
          <div className="flex items-center gap-1.5 mb-2">
            <span className="bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
              {rating.toFixed(1)} <Star className="w-2.5 h-2.5 fill-white" />
            </span>
            <span className="text-[11px] text-slate-400">({formatReviewCount(product.reviews)})</span>
          </div>
        )}

        {/* Variant availability — what a shopper scans a grid for ("does it come
            in black? does it come in my size?"). Read-only here: picking a
            specific SKU belongs on the detail page, where stock is known. */}
        <VariantPreview axes={product.variantAxes} />

        <div className="mt-auto">
          {/* Wraps as a unit — an unwrapped row split the price mid-value on
              narrow phones. */}
          <div className="flex items-baseline flex-wrap gap-x-2 gap-y-0.5">
            <span className="font-bold text-base sm:text-lg text-slate-900 whitespace-nowrap tracking-tight">
              {formatCurrencyValue(product.price)}
            </span>
            {savings > 0 && (
              <span className="flex items-baseline gap-1.5 whitespace-nowrap">
                <span className="text-[11px] text-slate-400 line-through">{formatCurrencyValue(product.mrp)}</span>
                <span className="text-[11px] text-green-600 font-bold">{discount}% off</span>
              </span>
            )}
          </div>

          {savings > 0 && (
            <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">
              You save {formatCurrencyValue(savings)}
            </p>
          )}

          {/* Only rendered when the catalogue actually supplied a promise. The
              category grid printed a flat "Free Delivery" on every card, which
              was a claim the data never made. */}
          {product.delivery && (
            <p className="text-[10px] text-slate-500 mt-1.5 flex items-center gap-1">
              <Truck className="w-3 h-3 text-blue-500 shrink-0" />
              {product.delivery === 'Tomorrow' ? (
                <span className="text-blue-600 font-semibold">Get it by Tomorrow</span>
              ) : (
                <span className="truncate">Delivery in {product.delivery}</span>
              )}
            </p>
          )}

          {linkable && (
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={cartState === 'adding'}
              aria-label={`Add ${product.title} to cart`}
              className={`mt-2.5 w-full flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all duration-300 border ${
                cartState === 'added'
                  ? 'bg-green-600 border-green-600 text-white'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-blue-600 hover:border-blue-600 hover:text-white'
              }`}
            >
              {cartState === 'adding' ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Adding…</>
              ) : cartState === 'added' ? (
                <><Check className="w-3.5 h-3.5" /> Added to Cart</>
              ) : (
                <><ShoppingCart className="w-3.5 h-3.5" /> Add to Cart</>
              )}
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}

/**
 * Compact variant availability for a card.
 *
 * Colour axes render as swatches (capped, with an overflow count so a 12-colour
 * product doesn't blow the card's height); every other axis renders as a count
 * — "4 sizes" says what a shopper needs at grid level, where listing S/M/L/XL
 * individually would just be noise.
 */
function VariantPreview({ axes }: { axes?: { variantName: string; variantOptions: string[] }[] }) {
  if (!axes?.length) return null;

  const colour = axes.find((a) => isColourAxis(a.variantName));
  const others = axes.filter((a) => a !== colour && a.variantOptions.length > 1);
  if (!colour && others.length === 0) return null;

  const MAX_SWATCHES = 4;
  const shown = colour?.variantOptions.slice(0, MAX_SWATCHES) ?? [];
  const overflow = (colour?.variantOptions.length ?? 0) - shown.length;

  return (
    <div className="flex items-center gap-2 mb-2 min-h-5">
      {colour && (
        <div className="flex items-center gap-1" aria-label={`Available colours: ${colour.variantOptions.join(', ')}`}>
          {shown.map((name) => {
            const fill = swatchFill(name);
            return (
              <span
                key={name}
                title={name}
                className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0"
                // Unmapped colour names get a neutral chip rather than a wrong
                // one — inventing a fill would misrepresent the product.
                style={{ backgroundColor: fill ?? '#e2e8f0' }}
              />
            );
          })}
          {overflow > 0 && <span className="text-[10px] text-slate-400 font-medium">+{overflow}</span>}
        </div>
      )}
      {others.map((a) => (
        <span key={a.variantName} className="text-[10px] text-slate-500 font-medium">
          {variantAxisLabel(a.variantName, a.variantOptions.length)}
        </span>
      ))}
    </div>
  );
}

/** Grid-shaped placeholder used while a listing is still being fetched. */
export function ProductCardSkeleton() {
  return (
    <div className="bg-white border border-slate-200/70 rounded-2xl p-2.5 sm:p-3 flex flex-col h-full">
      <div className="w-full aspect-square rounded-xl bg-slate-100 animate-pulse" />
      <div className="pt-3 space-y-2">
        <div className="h-2 w-1/3 rounded bg-slate-100 animate-pulse" />
        <div className="h-3 w-full rounded bg-slate-100 animate-pulse" />
        <div className="h-3 w-2/3 rounded bg-slate-100 animate-pulse" />
        <div className="h-4 w-1/2 rounded bg-slate-100 animate-pulse mt-3" />
      </div>
    </div>
  );
}
