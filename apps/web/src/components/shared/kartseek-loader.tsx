'use client';

import React from 'react';
import { SkeletonPage } from '@/components/ui';

/**
 * Branded KARTSEEK loading spinner with pulse animation.
 * Use `size="sm" | "md" | "lg"` and optional `message`.
 */
export function KartseekLoader({
  size = 'md',
  message,
}: {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}) {
  const dims = { sm: 'w-8 h-8', md: 'w-14 h-14', lg: 'w-20 h-20' }[size];
  const textSize = { sm: 'text-xs', md: 'text-sm', lg: 'text-base' }[size];
  const logoSize = { sm: 'text-xs', md: 'text-lg', lg: 'text-[28px]' }[size];

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      {/* Animated logo mark */}
      <div className={`${dims} relative`}>
        <div className="absolute inset-0 rounded-2xl bg-linear-to-br from-blue-600 to-indigo-600 animate-pulse" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`${logoSize} text-white font-black tracking-tighter select-none`}>
            K
          </span>
        </div>
        {/* Spinning ring */}
        <div className="absolute -inset-1 rounded-2xl border-2 border-blue-200 border-t-blue-600 animate-spin" />
      </div>
      {message && (
        <p className={`${textSize} font-medium text-slate-500 animate-pulse`}>{message}</p>
      )}
    </div>
  );
}

/**
 * Full-page loading screen with KARTSEEK branding.
 */
export function FullPageLoader({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-[9999] bg-white/80 backdrop-blur-sm flex items-center justify-center">
      <KartseekLoader size="lg" message={message} />
    </div>
  );
}

/**
 * Full-page skeleton layout — shows structural placeholders during initial loads.
 * Provides a smoother perceived loading experience than a spinner.
 */
export function SkeletonPageLoader({
  message,
  className,
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div className={`px-4 md:px-8 py-6 ${className ?? ''}`}>
      {message && (
        <p className="text-sm font-medium text-slate-400 mb-4 animate-pulse">{message}</p>
      )}
      <SkeletonPage />
    </div>
  );
}

