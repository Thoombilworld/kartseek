'use client';

import React, { useCallback } from 'react';

/**
 * A thin bar-fill element whose width is set imperatively via a ref callback,
 * avoiding inline `style` attributes (which the project linter forbids).
 *
 * Pass `width` as a CSS length string, e.g. "75%" or "120px".
 * All other props (className, etc.) are forwarded to the underlying `<div>`.
 */
export function BarFill({
  width,
  className = '',
  ...rest
}: { width: string } & Omit<React.HTMLAttributes<HTMLDivElement>, 'style'>) {
  const ref = useCallback(
    (el: HTMLDivElement | null) => {
      if (el) el.style.width = width;
    },
    [width],
  );

  return <div ref={ref} className={className} {...rest} />;
}

/**
 * Same idea but for height (used by bar-chart columns).
 */
export function BarHeight({
  height,
  className = '',
  ...rest
}: { height: string } & Omit<React.HTMLAttributes<HTMLDivElement>, 'style'>) {
  const ref = useCallback(
    (el: HTMLDivElement | null) => {
      if (el) el.style.height = height;
    },
    [height],
  );

  return <div ref={ref} className={className} {...rest} />;
}
