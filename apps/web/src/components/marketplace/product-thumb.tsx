'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ImageOff, ShoppingBasket } from 'lucide-react';
import { productImageSources } from '@/lib/product-image';

/**
 * The one product image frame.
 *
 * Every listing surface used to bring its own well: `h-32` on the home grid,
 * `h-36` on offers and recently-viewed, `h-32 sm:h-40` on search, `h-40` on the
 * brand page, `h-44` on the wishlist, `aspect-square` on the shared card — over
 * four different backgrounds and four different paddings. Two cards of identical
 * width therefore rendered the same photograph at noticeably different sizes,
 * which is the "inconsistent spacing" this component exists to end. Fixed pixel
 * heights are the root cause: the column width is fluid and the frame was not,
 * so the ratio drifted at every breakpoint. The frame here is a ratio, never a
 * height.
 *
 * ── Filling the frame ───────────────────────────────────────────────────────
 * Catalogue photography is not square. `object-contain` in a square frame
 * therefore left bars whose size varied per product — a 3:2 photo lost a third
 * of the frame, a square one lost none — and that unevenness read as broken
 * rather than as deliberate. `object-cover` everywhere fixes the unevenness and
 * introduces a worse fault: a tall bottle or a wide laptop gets cut out of its
 * own picture.
 *
 * So the fit is chosen per image, from the dimensions the browser reports once
 * the file is decoded:
 *
 *   • crop ≤ MAX_CROP on either axis → `object-cover`, edge to edge. The frame
 *     is completely full and the loss is not perceptible.
 *   • anything more → `object-contain` over a blurred, over-scaled copy of the
 *     same image. The product stays whole and the frame still reads as full,
 *     matted in the product's own colours rather than in an arbitrary grey.
 *
 * The backdrop is deliberately quiet — heavily blurred under a scrim — because
 * it is a mat, not a second picture.
 */

/** Crop we will accept before switching to a matted contain. 25% of one axis. */
const MAX_CROP = 0.25;

/** Aspect band that survives a cover crop of at most `MAX_CROP`. */
const MIN_RATIO = 1 - MAX_CROP;        // 0.75 — portrait limit
const MAX_RATIO = 1 / (1 - MAX_CROP);  // 1.333 — landscape limit

type Fit = 'cover' | 'contain';

function fitFor(naturalWidth: number, naturalHeight: number): Fit {
  if (!naturalWidth || !naturalHeight) return 'contain';
  const ratio = naturalWidth / naturalHeight;
  return ratio >= MIN_RATIO && ratio <= MAX_RATIO ? 'cover' : 'contain';
}

/**
 * `sizes` presets, one per grid density in use.
 *
 * A `srcSet` without a matching `sizes` is worse than no `srcSet` at all: the
 * browser assumes the image spans the viewport and downloads the largest
 * candidate every time.
 */
export const THUMB_SIZES = {
  /** 2 cols on phones → 3 at md → 4 at lg, inside the 1280px container. */
  grid4: '(min-width: 1280px) 288px, (min-width: 1024px) 23vw, (min-width: 768px) 31vw, 46vw',
  /** 2 → 3 → 5, used by recently-viewed and the carousels. */
  grid5: '(min-width: 1280px) 232px, (min-width: 1024px) 19vw, (min-width: 768px) 31vw, 46vw',
  /** Fixed-width thumbnail in a horizontal list row. */
  row: '144px',
} as const;

export interface ProductThumbProps {
  /** Primary image URL. Falsy renders the fallback immediately. */
  src?: string;
  /** Describes the product, not the file — it is the only text a crawler gets. */
  alt: string;
  /** Rendered as a monogram when the image is missing or fails. */
  brand?: string;
  /** Icon shown when there is no brand to monogram. */
  fallbackIcon?: React.ElementType;
  /** Skip lazy-loading for above-the-fold rows: this is the listing's LCP. */
  priority?: boolean;
  /** Match to the grid the frame sits in. Defaults to the 4-column listing. */
  sizes?: string;
  /** Scale the image on hover of the enclosing `.group`. */
  zoomOnHover?: boolean;
  /** Extra classes for the frame itself (radius, ring, margin). */
  className?: string;
}

export function ProductThumb({
  src,
  alt,
  brand,
  fallbackIcon: FallbackIcon = ShoppingBasket,
  priority,
  sizes = THUMB_SIZES.grid4,
  zoomOnHover = true,
  className = '',
}: ProductThumbProps) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [fit, setFit] = useState<Fit>('contain');
  const imgRef = useRef<HTMLImageElement | null>(null);
  const sources = productImageSources(src);

  const settle = useCallback((el: HTMLImageElement | null) => {
    if (!el) return;
    if (el.naturalWidth > 0) {
      setFit(fitFor(el.naturalWidth, el.naturalHeight));
      setStatus('ready');
    } else {
      setStatus('failed');
    }
  }, []);

  // A cached or server-rendered image can finish decoding before React attaches
  // `onLoad`, so that event never fires: the frame stays on its skeleton over a
  // fully-downloaded photo, and the fit is never measured. `complete` is the
  // state the missed event would have reported.
  useEffect(() => {
    setStatus('loading');
    const el = imgRef.current;
    if (el?.complete) settle(el);
  }, [src, settle]);

  const showFallback = !sources || status === 'failed';

  return (
    <div className={`relative w-full aspect-square overflow-hidden bg-white ${className}`}>
      {!showFallback && (
        <>
          {/* Mat: the image's own colours, blurred past legibility, filling
              whatever the contained photo leaves behind. Only rendered when
              there is actually a gap to fill. */}
          {fit === 'contain' && status === 'ready' && (
            <>
              <img
                src={sources.src}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full scale-125 object-cover blur-2xl"
              />
              <div className="absolute inset-0 bg-white/70" aria-hidden="true" />
            </>
          )}

          <img
            ref={imgRef}
            src={sources.src}
            srcSet={sources.srcSet}
            sizes={sizes}
            alt={alt}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            decoding="async"
            draggable={false}
            onLoad={(e) => settle(e.currentTarget)}
            onError={() => setStatus('failed')}
            className={[
              'relative h-full w-full transition-[opacity,transform] duration-500 ease-out',
              // Contain gets a hair of padding so a studio shot on white does not
              // touch the frame edge. Cover gets none — filling it is the point.
              fit === 'cover' ? 'object-cover' : 'object-contain p-2.5',
              zoomOnHover ? 'group-hover:scale-[1.06] motion-reduce:group-hover:scale-100' : '',
              status === 'ready' ? 'opacity-100' : 'opacity-0',
            ].join(' ')}
          />
        </>
      )}

      {!showFallback && status === 'loading' && (
        <div
          className="absolute inset-0 animate-pulse bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 motion-reduce:animate-none"
          aria-hidden="true"
        />
      )}

      {showFallback && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-slate-50 via-white to-slate-100">
          {brand ? (
            <span className="text-3xl font-black tracking-tight text-slate-300 transition-colors duration-300 group-hover:text-blue-400">
              {brand.slice(0, 2).toUpperCase()}
            </span>
          ) : (
            <FallbackIcon className="h-10 w-10 text-slate-300 transition-colors duration-300 group-hover:text-blue-400" />
          )}
          <ImageOff className="h-3 w-3 text-slate-300" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}

export default ProductThumb;
