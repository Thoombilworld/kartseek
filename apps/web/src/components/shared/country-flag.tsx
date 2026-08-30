'use client';

import React from 'react';

// ── Country Flag Utilities ───────────────────────────────────────────────────
// Cross-platform flag display using flagcdn.com SVG images.
// Emoji flags (🇮🇳, 🇶🇦, etc.) don't render on Windows Chrome/Edge/Safari —
// only Firefox bundles its own emoji font with flag support.

const FLAG_CDN_BASE = 'https://flagcdn.com';

/** Size presets mapping to pixel dimensions */
const FLAG_SIZES = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
} as const;

export type FlagSize = keyof typeof FLAG_SIZES;

/**
 * Get the CDN URL for a country flag SVG.
 * @param code - ISO 3166-1 alpha-2 country code (e.g. "IN", "QA", "GB")
 * @returns The full URL to the flag SVG image
 */
export function getCountryFlagUrl(code: string): string {
  return `${FLAG_CDN_BASE}/${code.toLowerCase()}.svg`;
}

interface CountryFlagProps {
  /** ISO 3166-1 alpha-2 country code (e.g. "IN", "QA", "GB") */
  code: string;
  /** Preset size — defaults to 'md' (20px) */
  size?: FlagSize;
  /** Optional CSS class names */
  className?: string;
}

/**
 * Cross-platform country flag component.
 * Renders a crisp SVG flag image that works consistently across all
 * browsers and operating systems (unlike emoji flags).
 */
export function CountryFlag({ code, size = 'md', className = '' }: CountryFlagProps) {
  if (!code) return null;
  const px = FLAG_SIZES[size];

  return (
    <img
      src={getCountryFlagUrl(code)}
      alt={`${code} flag`}
      width={px}
      height={Math.round(px * 0.75)} // 4:3 aspect ratio for flags
      loading="lazy"
      decoding="async"
      className={`inline-block rounded-sm object-cover ${className}`}
      style={{ width: px, height: Math.round(px * 0.75) }}
    />
  );
}

export default CountryFlag;
