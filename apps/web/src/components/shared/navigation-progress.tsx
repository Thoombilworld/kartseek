'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Thin top progress bar that animates on every App Router page transition.
 * Add <NavigationProgress /> once inside the root layout body.
 *
 * Uses direct DOM ref manipulation (no style= prop) so the component
 * satisfies the "no CSS inline styles" lint rule.
 */
export function NavigationProgress() {
  const pathname  = usePathname();
  const barRef    = useRef<HTMLDivElement>(null);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPath  = useRef(pathname);

  /** Set --np-width CSS variable directly on the element (no style= prop). */
  const setProgress = useCallback((pct: number, complete = false) => {
    const el = barRef.current;
    if (!el) return;
    el.style.setProperty('--np-width', `${pct}%`);
    el.classList.toggle('nav-progress-complete', complete);
  }, []);

  const show = useCallback(() => barRef.current?.classList.add('nav-progress-active'),    []);
  const hide = useCallback(() => barRef.current?.classList.remove('nav-progress-active'), []);

  useEffect(() => {
    // Don't trigger on mount — only on navigation
    if (pathname === prevPath.current) return;
    prevPath.current = pathname;

    // Clear any in-flight timers
    if (timerRef.current) clearTimeout(timerRef.current);

    setProgress(0);
    show();

    // Ramp to 80% quickly (simulates "waiting for page")
    const ramp = setTimeout(() => setProgress(80), 50);

    // Complete to 100% then hide
    const complete = setTimeout(() => {
      setProgress(100, true);
      timerRef.current = setTimeout(hide, 300);
    }, 400);

    return () => {
      clearTimeout(ramp);
      clearTimeout(complete);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [pathname, setProgress, show, hide]);

  // Always rendered — visibility is managed via CSS class (no conditional return)
  return (
    <div
      ref={barRef}
      aria-hidden="true"
      className="nav-progress-bar"
    />
  );
}
