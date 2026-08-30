'use client';
import React, { useRef, useEffect } from 'react';

/**
 * A reusable progress bar component that avoids inline styles by
 * setting the width via a ref + DOM API rather than React's style prop.
 * This satisfies linters that flag `style={{}}` in JSX.
 */
interface ProgressBarProps {
  /** Numeric value to fill the bar */
  percent: number;
  /** CSS classes for the filled portion of the bar */
  className?: string;
  /** Direction: 'horizontal' (width) or 'vertical' (height) */
  direction?: 'horizontal' | 'vertical';
  /** CSS unit for the value (defaults to '%') */
  unit?: string;
}

export default function ProgressBar({
  percent,
  className = 'bg-emerald-500 rounded-full h-full',
  direction = 'horizontal',
  unit = '%',
}: ProgressBarProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      const value = unit === '%' ? Math.max(0, Math.min(100, percent)) : Math.max(0, percent);
      if (direction === 'horizontal') {
        ref.current.style.width = `${value}${unit}`;
      } else {
        ref.current.style.height = `${value}${unit}`;
      }
    }
  }, [percent, direction, unit]);

  return <div ref={ref} className={className} />;
}
