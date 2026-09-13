'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  X,
  RotateCw,
  Minus,
  Plus,
  ImageOff,
} from 'lucide-react';
import { useVariants } from './variant-context';

import { DismissOnEscape } from '@/components/shared/dismiss-on-escape';
/**
 * Product image gallery.
 *
 * This was previously rendered inline by the (server) product page, which meant
 * the thumbnails were `<button>`s with no `onClick` and the main image was hard
 * -wired to `images[0]`: clicking a thumbnail did nothing, and there was no way
 * to reach any image but the first. It also had no touch handling at all, so on
 * a phone — where every competing storefront lets you swipe the hero image —
 * the gallery was inert.
 *
 * The main image is a scroll-snap track rather than a single swapped `<img>`.
 * That gets native horizontal swipe, momentum and accessibility from the
 * browser instead of a synthetic drag handler, and keeps the thumbnail rail,
 * arrows and swipe all driving one piece of state.
 *
 * Three things sit on top of that track:
 *  - a magnifier, which follows the pointer on desktop and opens a pannable
 *    full-screen view on touch;
 *  - a 360° spin viewer, shown only for products that actually ship a frame
 *    sequence — a spin control over a single photograph would be a lie;
 *  - variant awareness: the images come from the shared variant selection, so
 *    picking a colour shows that colour.
 */
export default function ProductGallery({
  images: baseImages,
  title,
  brandInitial,
  spinFrames = [],
}: {
  images: string[];
  title: string;
  brandInitial: string;
  /** Ordered frames of a 360° capture, if the product has one. */
  spinFrames?: string[];
}) {
  const variants = useVariants();
  // The selected SKU's own photographs lead when it has any; otherwise this is
  // exactly the product's gallery.
  const images = variants?.images?.length ? variants.images : baseImages;
  const selectedVariantId = variants?.selected?.id ?? null;

  const [active, setActive] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [spinOpen, setSpinOpen] = useState(false);
  const trackRef = useRef<HTMLDivElement | null>(null);
  // Set while we scroll the track ourselves, so the scroll handler doesn't
  // fight the programmatic animation and snap `active` back mid-flight.
  const scrollingTo = useRef<number | null>(null);

  const count = images.length;

  const goTo = useCallback(
    (index: number) => {
      const next = Math.max(0, Math.min(index, count - 1));
      setActive(next);
      const track = trackRef.current;
      if (!track) return;
      scrollingTo.current = next;
      track.scrollTo({ left: next * track.clientWidth, behavior: 'smooth' });
    },
    [count],
  );

  // Keep `active` in step with a finger-driven scroll.
  const handleScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    const index = Math.round(track.scrollLeft / track.clientWidth);
    if (scrollingTo.current !== null) {
      // Ignore intermediate frames of our own smooth scroll; clear once landed.
      if (index === scrollingTo.current) scrollingTo.current = null;
      return;
    }
    setActive((prev) => (index !== prev && index >= 0 && index < count ? index : prev));
  }, [count]);

  // Arrow keys move the gallery whenever it holds focus.
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      goTo(active + 1);
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goTo(active - 1);
    }
  };

  // A resize changes what one "page" of the track measures, so the current
  // image would otherwise end up scrolled half out of frame.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const onResize = () => {
      track.scrollTo({ left: active * track.clientWidth });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [active]);

  // Selecting a different SKU changes the image list under the track. Without
  // this the track keeps its old scroll offset, so a shopper who was on image 4
  // of the previous colour lands on an unrelated frame — or past the end.
  useEffect(() => {
    setActive(0);
    const track = trackRef.current;
    if (track) track.scrollTo({ left: 0 });
  }, [selectedVariantId]);

  if (count === 0) {
    return (
      <div className="aspect-square bg-white rounded-sm border border-slate-200 flex items-center justify-center overflow-hidden">
        <div className="w-full h-full bg-linear-to-br from-blue-50 via-slate-50 to-indigo-50 flex items-center justify-center">
          <span className="text-6xl font-black text-blue-200">{brandInitial}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        className="relative group"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        role="region"
        aria-roledescription="carousel"
        aria-label={`${title} images`}
      >
        <div
          ref={trackRef}
          onScroll={handleScroll}
          className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar rounded-sm border border-slate-200 bg-white overscroll-x-contain"
          style={{ scrollbarWidth: 'none' }}
        >
          {images.map((img, i) => (
            <div
              key={`${img}-${i}`}
              className="relative shrink-0 w-full aspect-square snap-center"
              aria-label={`Image ${i + 1} of ${count}`}
              aria-hidden={i !== active}
            >
              <HoverZoomImage
                src={img}
                alt={i === 0 ? title : `${title} — image ${i + 1}`}
                priority={i === 0}
                onOpen={() => {
                  setActive(i);
                  setZoomOpen(true);
                }}
              />
            </div>
          ))}
        </div>

        {/* Zoom affordance. Desktop gets the in-place magnifier by hovering the
            image; this button is what makes the feature discoverable, and is
            the only way in on a touch screen. */}
        <button
          type="button"
          onClick={() => setZoomOpen(true)}
          aria-label="Zoom image"
          className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white/90 border border-slate-200 shadow-sm text-slate-700 text-xs font-semibold hover:bg-white transition-colors"
        >
          <ZoomIn className="w-4 h-4" /> <span className="hidden sm:inline">Zoom</span>
        </button>

        {spinFrames.length >= MIN_SPIN_FRAMES && (
          <button
            type="button"
            onClick={() => setSpinOpen(true)}
            aria-label="View in 360 degrees"
            className="absolute top-2 left-2 z-10 flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-slate-900/85 text-white shadow-sm text-xs font-semibold hover:bg-slate-900 transition-colors"
          >
            <RotateCw className="w-4 h-4" /> 360°
          </button>
        )}

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => goTo(active - 1)}
              disabled={active === 0}
              aria-label="Previous image"
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 border border-slate-200 shadow-sm text-slate-700 transition-opacity hover:bg-white disabled:opacity-0 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => goTo(active + 1)}
              disabled={active === count - 1}
              aria-label="Next image"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 border border-slate-200 shadow-sm text-slate-700 transition-opacity hover:bg-white disabled:opacity-0 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Position readout — on a phone the thumbnail rail is easy to miss,
                so the hero needs to say there is more than one image. */}
            <div className="absolute bottom-2 right-2 text-[11px] font-semibold text-slate-600 bg-white/85 border border-slate-200 rounded-full px-2 py-0.5">
              {active + 1}/{count}
            </div>
          </>
        )}
      </div>

      {count > 1 && (
        <div
          className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar"
          role="tablist"
          aria-label="Product image thumbnails"
        >
          {images.map((img, i) => (
            <button
              key={`${img}-thumb-${i}`}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`View image ${i + 1}`}
              onClick={() => goTo(i)}
              className={`relative w-16 h-16 rounded-sm border-2 shrink-0 overflow-hidden transition-colors ${
                i === active ? 'border-blue-600' : 'border-slate-200 bg-white hover:border-blue-400'
              }`}
            >
              {/* Same failure handling as the main frame — a thumbnail strip of
                  broken glyphs is what the fallback above exists to avoid. */}
              <ThumbImage src={img} index={i} />
            </button>
          ))}
        </div>
      )}

      {zoomOpen && (
        <ZoomModal
          images={images}
          index={active}
          title={title}
          onIndex={setActive}
          onClose={() => setZoomOpen(false)}
        />
      )}

      {spinOpen && (
        <SpinViewer frames={spinFrames} title={title} onClose={() => setSpinOpen(false)} />
      )}
    </div>
  );
}

/** Below this a "360° view" is a handful of stills, not a rotation. */
const MIN_SPIN_FRAMES = 8;

/**
 * One gallery frame with a pointer-following magnifier.
 *
 * The magnification scales the same image and shifts its transform-origin to
 * the cursor, so no second, larger asset has to exist — catalogue images are
 * stored at a single width. Enabled only for fine pointers: on a touch screen
 * the hover state sticks after a tap and leaves the image stuck at 2× with no
 * way back, which is why the modal is the touch path.
 */
/**
 * One 64px thumbnail, falling back to an icon when the upstream image fails.
 *
 * Its own component because the failure has to be tracked per thumbnail, and a
 * hook cannot live inside the `images.map()` callback that renders the strip.
 */
function ThumbImage({ src, index }: { src: string; index: number }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className="absolute inset-0 flex items-center justify-center bg-slate-50">
        <ImageOff className="h-4 w-4 text-slate-300" aria-hidden="true" />
        <span className="sr-only">Image {index + 1} unavailable</span>
      </span>
    );
  }
  return (
    <Image
      src={src}
      alt=""
      fill
      sizes="64px"
      unoptimized={isUnoptimisable(src)}
      onError={() => setFailed(true)}
      className="object-contain p-1"
    />
  );
}

/**
 * URLs the image optimiser refuses. It answers 400 for an SVG source (and
 * `placehold.co` serves SVG), which the gallery then reported as a missing
 * photograph; served as-is the placeholder at least shows what the catalogue
 * holds.
 */
function isUnoptimisable(src: string): boolean {
  return /\.svg(\?|#|$)/i.test(src) || /(^|\/\/)(www\.)?placehold\.co\//i.test(src);
}

function HoverZoomImage({
  src,
  alt,
  priority,
  onOpen,
}: {
  src: string;
  alt: string;
  priority?: boolean;
  onOpen: () => void;
}) {
  const [origin, setOrigin] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  /**
   * Product imagery is served by third parties, and they fail.
   *
   * `ProductThumb` — every card on every listing — has always degraded to an
   * icon via `onError`. This gallery did not, so the same dead upstream that a
   * card absorbed left the detail page showing the browser's broken-image
   * glyph next to alt text. loremflickr 500s for whole tag combinations at a
   * time (10 of the 52 in this catalogue right now, 42 images across 14
   * products), so this is the normal case, not an edge one.
   */
  const [failed, setFailed] = useState(false);

  const canHover = useCallback(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(hover: hover) and (pointer: fine)').matches,
    [],
  );

  const track = (e: React.MouseEvent) => {
    if (!canHover()) return;
    const box = boxRef.current?.getBoundingClientRect();
    if (!box) return;
    const x = ((e.clientX - box.left) / box.width) * 100;
    const y = ((e.clientY - box.top) / box.height) * 100;
    setOrigin(`${Math.max(0, Math.min(100, x))}% ${Math.max(0, Math.min(100, y))}%`);
  };

  return (
    <div
      ref={boxRef}
      className="absolute inset-0 overflow-hidden cursor-zoom-in"
      onMouseMove={track}
      onMouseLeave={() => setOrigin(null)}
      onClick={onOpen}
      role="button"
      tabIndex={-1}
      aria-label={`${alt} — click to enlarge`}
    >
      <DismissOnEscape onDismiss={onOpen} />
      {failed ? (
        // Matches how ProductThumb fails on the listings: a quiet placeholder
        // that says there is no picture, rather than a broken glyph that reads
        // as a broken page. The alt text still names the product for anyone
        // who cannot see either.
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-50">
          <ImageOff className="h-10 w-10 text-slate-300" aria-hidden="true" />
          <span className="sr-only">{alt}</span>
          <span className="text-xs text-slate-400">Image unavailable</span>
        </div>
      ) : (
        <Image
          src={src}
          alt={alt}
          fill
          unoptimized={isUnoptimisable(src)}
          onError={() => setFailed(true)}
          sizes="(min-width: 768px) 50vw, 100vw"
          // Only the first image is part of the initial view; the rest sit
          // off-screen in the track and must not compete for bandwidth.
          //
          // Spelled out rather than `priority`, which Next 16 superseded. The old
          // prop still suppressed lazy-loading — the first slide correctly had no
          // `loading="lazy"` — but emitted no `fetchpriority`, so the image the
          // page is measured on queued at default priority behind every other
          // request, and Next warned about the LCP element on every product page.
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          className="object-contain p-4 transition-transform duration-200 ease-out"
          style={origin ? { transform: 'scale(2)', transformOrigin: origin } : undefined}
        />
      )}
    </div>
  );
}

/**
 * Full-screen zoom: pannable, and the only zoom path on touch.
 *
 * Panning is done with the container's scroll position rather than a transform,
 * so the image can be moved with one finger the way the platform's own photo
 * viewers behave, and the scroll bounds clamp the pan for free — a
 * transform-based pan has to clamp its own edges and gets it wrong at every
 * zoom level.
 */
function ZoomModal({
  images,
  index,
  title,
  onIndex,
  onClose,
}: {
  images: string[];
  index: number;
  title: string;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const [scale, setScale] = useState(2);
  const paneRef = useRef<HTMLDivElement | null>(null);

  // Escape closes, arrows move between images: this is a modal over the whole
  // page and must be dismissible without hunting for the button.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onIndex(Math.min(index + 1, images.length - 1));
      if (e.key === 'ArrowLeft') onIndex(Math.max(index - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    // The page behind must not scroll while a full-screen viewer is open.
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [index, images.length, onIndex, onClose]);

  // Centre the enlarged image, rather than opening at its top-left corner.
  useEffect(() => {
    const pane = paneRef.current;
    if (!pane) return;
    pane.scrollLeft = (pane.scrollWidth - pane.clientWidth) / 2;
    pane.scrollTop = (pane.scrollHeight - pane.clientHeight) / 2;
  }, [scale, index]);

  const src = images[index];

  return (
    <div
      className="fixed inset-0 z-100 bg-slate-950/95 flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={`${title} — enlarged`}
    >
      <div className="flex items-center justify-between px-4 py-3 text-white shrink-0">
        <span className="text-sm font-semibold truncate pr-4">{title}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(1, +(s - 0.5).toFixed(1)))}
            disabled={scale <= 1}
            aria-label="Zoom out"
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono w-10 text-center">{scale.toFixed(1)}×</span>
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(4, +(s + 0.5).toFixed(1)))}
            disabled={scale >= 4}
            aria-label="Zoom in"
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div ref={paneRef} className="flex-1 overflow-auto overscroll-contain">
        <div
          className="relative mx-auto"
          style={{ width: `${scale * 100}%`, aspectRatio: '1 / 1' }}
        >
          {/* A plain <img>, not next/image: the optimiser caps the served file
              at the layout width it was given, which at 4× is exactly the
              resolution the zoom exists to reveal. */}
          <img
            src={src}
            alt={title}
            className="w-full h-full object-contain select-none"
            draggable={false}
          />
        </div>
      </div>

      {images.length > 1 && (
        <div className="shrink-0 flex gap-2 overflow-x-auto hide-scrollbar px-4 py-3">
          {images.map((img, i) => (
            <button
              key={`${img}-zoom-${i}`}
              type="button"
              onClick={() => onIndex(i)}
              aria-label={`View image ${i + 1}`}
              aria-current={i === index ? 'true' : undefined}
              className={`relative w-14 h-14 shrink-0 rounded border-2 overflow-hidden bg-white ${
                i === index ? 'border-blue-400' : 'border-white/20'
              }`}
            >
              <img src={img} alt="" className="w-full h-full object-contain p-0.5" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 360° spin viewer.
 *
 * Frames advance by horizontal drag — the interaction every product spin uses —
 * with an auto-rotate that runs until the first touch, so the control explains
 * itself. Every frame is preloaded before the drag is enabled: fetching
 * mid-drag makes the object stutter and appear to jump backwards, which reads
 * as a broken viewer rather than a slow one.
 */
function SpinViewer({
  frames,
  title,
  onClose,
}: {
  frames: string[];
  title: string;
  onClose: () => void;
}) {
  const [frame, setFrame] = useState(0);
  const [ready, setReady] = useState(false);
  const [autoplay, setAutoplay] = useState(true);
  const dragFrom = useRef<{ x: number; frame: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    let loaded = 0;
    frames.forEach((src) => {
      const img = new window.Image();
      img.onload = img.onerror = () => {
        loaded += 1;
        if (!cancelled && loaded === frames.length) setReady(true);
      };
      img.src = src;
    });
    return () => {
      cancelled = true;
    };
  }, [frames]);

  useEffect(() => {
    if (!autoplay || !ready) return;
    const timer = setInterval(() => setFrame((f) => (f + 1) % frames.length), 90);
    return () => clearInterval(timer);
  }, [autoplay, ready, frames.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') {
        setAutoplay(false);
        setFrame((f) => (f + 1) % frames.length);
      }
      if (e.key === 'ArrowLeft') {
        setAutoplay(false);
        setFrame((f) => (f - 1 + frames.length) % frames.length);
      }
    };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [frames.length, onClose]);

  const startDrag = (clientX: number) => {
    setAutoplay(false);
    dragFrom.current = { x: clientX, frame };
  };

  const moveDrag = (clientX: number, width: number) => {
    const from = dragFrom.current;
    if (!from || width === 0) return;
    // One full drag across the viewer is one full revolution, which keeps the
    // gearing the same whatever the screen size.
    const delta = Math.round(((clientX - from.x) / width) * frames.length);
    const next = (((from.frame + delta) % frames.length) + frames.length) % frames.length;
    setFrame(next);
  };

  return (
    <div
      className="fixed inset-0 z-100 bg-slate-950/95 flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={`${title} — 360 degree view`}
    >
      <div className="flex items-center justify-between px-4 py-3 text-white shrink-0">
        <span className="text-sm font-semibold truncate pr-4 flex items-center gap-2">
          <RotateCw className="w-4 h-4" /> {title} — 360°
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div
        className="flex-1 flex items-center justify-center select-none touch-none cursor-ew-resize"
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          startDrag(e.clientX);
        }}
        onPointerMove={(e) => {
          if (dragFrom.current) moveDrag(e.clientX, e.currentTarget.clientWidth);
        }}
        onPointerUp={() => {
          dragFrom.current = null;
        }}
        onPointerCancel={() => {
          dragFrom.current = null;
        }}
      >
        <div className="relative w-full max-w-2xl aspect-square">
          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center text-white/70 text-sm">
              Loading 360° view…
            </div>
          )}
          {/* Every frame stays mounted and only the current one is visible: a
              single `src` swap re-decodes on each step and flickers white. */}
          {frames.map((src, i) => (
            <img
              key={src}
              src={src}
              alt={i === 0 ? `${title}, 360 degree view` : ''}
              aria-hidden={i !== frame}
              draggable={false}
              className={`absolute inset-0 w-full h-full object-contain p-6 ${i === frame && ready ? 'opacity-100' : 'opacity-0'}`}
            />
          ))}
        </div>
      </div>

      <div className="shrink-0 text-center text-white/70 text-xs pb-6 px-4">
        Drag left or right to rotate · {frame + 1}/{frames.length}
      </div>
    </div>
  );
}
