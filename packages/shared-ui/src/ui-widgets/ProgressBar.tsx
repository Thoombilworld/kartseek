'use client';

import React, { useRef, useEffect } from 'react';

/**
 * Dynamic-width progress bar that sets width via DOM ref
 * to avoid inline style lint warnings in consumer components.
 */
export function ProgressBar({
  value,
  className = '',
}: {
  /** Percentage 0–100 */
  value: number;
  /** Tailwind classes for color, height, rounding, etc. */
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.width = `${Math.min(100, Math.max(0, value))}%`;
    }
  }, [value]);

  return <div ref={ref} className={className} />;
}
