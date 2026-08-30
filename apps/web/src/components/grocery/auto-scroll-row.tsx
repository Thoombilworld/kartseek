'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * A horizontally scrolling row that advances on its own.
 *
 * Store rows were plain `overflow-x-auto` strips: on a desktop viewport the
 * cards past the fold were invisible and nothing suggested they existed, since
 * there is no touch affordance and the scrollbar is hidden.
 *
 * Three things this has to get right, none of which a bare `setInterval` does:
 *
 *  - **It must stop when the shopper is involved.** Auto-advancing under
 *    someone's finger or while they are reading a card is worse than not moving
 *    at all, so pointer-over, focus-within and an in-progress drag all pause it.
 *  - **It must respect `prefers-reduced-motion`.** Vestibular disorders make
 *    unrequested motion genuinely unpleasant, and WCAG 2.2 treats auto-moving
 *    content as something the user must be able to stop. Reduced-motion users
 *    get the arrows and no automatic movement.
 *  - **It must not fight a hidden tab.** `requestAnimationFrame` stops in a
 *    background tab, so using it as the clock means the row does not silently
 *    race ahead while nobody is looking.
 */
export function AutoScrollRow({
  children,
  className = '',
  /** Pixels per second. Slow enough to read a card as it passes. */
  speed = 28,
  /** Milliseconds of stillness before motion resumes after interaction. */
  resumeAfter = 2500,
}: {
  children: React.ReactNode;
  className?: string;
  speed?: number;
  resumeAfter?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Only worth animating — or showing arrows for — when there is somewhere to go.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setOverflows(el.scrollWidth > el.clientWidth + 8);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [children]);

  useEffect(() => {
    const el = ref.current;
    if (!el || paused || !overflows) return;

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (reduced?.matches) return;

    let raf = 0;
    let last = 0;
    /**
     * The position is accumulated here as a float rather than read back from
     * `el.scrollLeft` each frame.
     *
     * At 28px/s a frame advances ~0.47px. Reading the property back returns a
     * value the engine has rounded, so `el.scrollLeft + dx` threw away the
     * remainder every frame: the row advanced in irregular 0px/1px steps
     * instead of smoothly, which is the shudder this row had.
     */
    let pos = el.scrollLeft;

    const step = (now: number) => {
      if (last) {
        const max = Math.max(0, el.scrollWidth - el.clientWidth);
        const next = pos + (speed * (now - last)) / 1000;
        /*
         * Wrap only when this row's own advance runs off the end.
         *
         * The test used to be `if (pos >= max - 1) pos = 0`, which fires
         * whatever put the position there. A shopper who scrolled to the last
         * card was therefore thrown back to the first one the moment the row
         * resumed — within a second or two of letting go, and every time they
         * tried again. Reaching the end by scrolling now simply stops there;
         * only the animation crossing the end from before it wraps.
         *
         * Wrapping rather than reversing, still: a row that ping-pongs reads as
         * broken.
         */
        pos = pos < max - 1 && next >= max - 1 ? 0 : Math.min(next, max);
        // `scrollTo` with an explicit instant behaviour, because the element
        // carries `scroll-behavior: smooth` for the arrow buttons. Without the
        // override each per-frame write started a *new* smooth scroll that the
        // next frame interrupted — the browser's own interpolation fighting a
        // 60Hz write loop, which is the other half of the vibration.
        el.scrollTo({ left: pos, behavior: 'instant' as ScrollBehavior });
      }
      last = now;
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [paused, overflows, speed]);

  const holdThenResume = useCallback(() => {
    setPaused(true);
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => setPaused(false), resumeAfter);
  }, [resumeAfter]);

  useEffect(() => () => { if (resumeTimer.current) clearTimeout(resumeTimer.current); }, []);

  const nudge = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    holdThenResume();
    el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.8), behavior: 'smooth' });
  };

  return (
    <div className="relative group/row">
      <div
        ref={ref}
        // `group/row` + focus-within keeps it still for keyboard users tabbing
        // through the cards, who would otherwise be chasing a moving target.
        onPointerEnter={() => setPaused(true)}
        onPointerLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
        onTouchStart={holdThenResume}
        onWheel={holdThenResume}
        className={`flex gap-3 overflow-x-auto hide-scrollbar scroll-smooth ${className}`}
      >
        {children}
      </div>

      {overflows && (
        <>
          {/* Arrows are the accessible stop-and-steer control: pointer users get
              them on hover, keyboard users on focus. */}
          <button
            type="button"
            onClick={() => nudge(-1)}
            aria-label="Scroll left"
            className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 z-10 w-9 h-9 items-center justify-center rounded-full bg-white/95 border border-slate-200 shadow-md text-slate-600 opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 transition-opacity"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => nudge(1)}
            aria-label="Scroll right"
            className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 z-10 w-9 h-9 items-center justify-center rounded-full bg-white/95 border border-slate-200 shadow-md text-slate-600 opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 transition-opacity"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}
    </div>
  );
}
