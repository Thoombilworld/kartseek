/// KARTSEEK — Locale-Aware Formatting Utilities
///
/// A compatibility surface over `@/lib/localization`. These wrappers keep the
/// call sites that already import from here working while the formatting logic
/// lives in one place. New code should import from `@/lib/localization`, or use
/// the bound helpers on `useRegion()`.

import {
  formatMoney, getCurrencySymbolFor, formatNumberFor, calculateTaxFor,
  getTaxLabelFor, formatDateFor, formatTimeFor, formatRelativeFor,
  DEFAULT_COUNTRY,
} from '@/lib/localization';

// ─── Currency Formatting ─────────────────────────────────────────────────────

interface CurrencyFormatOptions {
  countryCode?: string;
  currencyCode?: string;
  /** Language, so Arabic renders `1,234.50 ر.ق` rather than `QR 1,234.50`. */
  language?: string;
  showCode?: boolean;
  compact?: boolean;
  decimals?: number;
}

/**
 * Format a numeric amount as a locale-aware currency string.
 *
 * @example
 * formatCurrency(1234.5, { countryCode: 'QA' })  // "QR 1,234.50"
 * formatCurrency(1234.5, { countryCode: 'IN' })  // "₹ 1,234.50"
 * formatCurrency(1234.5, { countryCode: 'US' })  // "$ 1,234.50"
 */
export function formatCurrency(amount: number, opts: CurrencyFormatOptions = {}): string {
  return formatMoney(amount, {
    country: opts.countryCode ?? DEFAULT_COUNTRY,
    language: opts.language,
    currencyCode: opts.currencyCode,
    showCode: opts.showCode,
    compact: opts.compact,
    decimals: opts.decimals,
  });
}

/** Get just the currency symbol for a country. */
export function getCurrencySymbol(countryCode: string = DEFAULT_COUNTRY): string {
  return getCurrencySymbolFor(countryCode);
}

// ─── Number Formatting ───────────────────────────────────────────────────────

export function formatNumber(value: number, decimals: number = 0): string {
  return formatNumberFor(value, DEFAULT_COUNTRY, decimals);
}

export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

// ─── India-Specific Formatting ────────────────────────────────────────────────

/**
 * Format a number using Indian grouping (1,23,456 not 1,234,567).
 *
 * @example
 * formatIndianNumber(1234567) // "12,34,567"
 */
export function formatIndianNumber(n: number): string {
  return n.toLocaleString('en-IN');
}

/**
 * Format an amount as Indian Rupees with ₹ symbol.
 * Uses lakh/crore compact notation for large numbers.
 *
 * India-only by design — do not reach for this in shared UI. A component that
 * calls it renders ₹ regardless of the active region, which is exactly how
 * Qatari prices end up displayed in rupees. Use `formatCurrency` (or
 * `useRegion().formatCurrencyValue`) anywhere the region can vary.
 *
 * @example
 * formatINR(1234)    // "₹1,234"
 * formatINR(1500000, true) // "₹15.0L"
 */
export function formatINR(amount: number, compact = false): string {
  if (compact) {
    if (Math.abs(amount) >= 10_000_000) return `₹${(amount / 10_000_000).toFixed(1)}Cr`;
    if (Math.abs(amount) >= 100_000) return `₹${(amount / 100_000).toFixed(1)}L`;
    if (Math.abs(amount) >= 1_000) return `₹${(amount / 1_000).toFixed(1)}K`;
    return `₹${amount}`;
  }
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/**
 * Calculate GST breakdown for India.
 *
 * @example
 * getGSTBreakdown(1000, 18) // { cgst: 90, sgst: 90, total: 1180, gstAmount: 180 }
 */
export function getGSTBreakdown(amount: number, gstRate: 0 | 5 | 12 | 18 | 28): {
  baseAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  gstAmount: number;
  total: number;
  gstRate: number;
  gstLabel: string;
} {
  const halfRate = gstRate / 2;
  const cgst = Math.round(amount * halfRate) / 100;
  const sgst = cgst;
  const igst = Math.round(amount * gstRate) / 100;
  const gstAmount = cgst + sgst;
  return {
    baseAmount: amount,
    cgst,
    sgst,
    igst,
    gstAmount,
    total: amount + gstAmount,
    gstRate,
    gstLabel: gstRate === 0 ? 'Exempt (0%)' : `GST ${gstRate}% (CGST ${halfRate}% + SGST ${halfRate}%)`,
  };
}

// ─── Date & Time Formatting ──────────────────────────────────────────────────

/**
 * Format a date according to the country's preferred format.
 *
 * Rendered in the *region's* timezone, not the browser's — an order placed at
 * 00:30 in Doha must not show as the previous day to an operator in London.
 */
export function formatDate(date: Date | string, countryCode: string = DEFAULT_COUNTRY): string {
  return formatDateFor(date, { country: countryCode });
}

/** Format time according to the country's preferred format (12h/24h) and timezone. */
export function formatTime(date: Date | string, countryCode: string = DEFAULT_COUNTRY): string {
  return formatTimeFor(date, { country: countryCode });
}

/** Relative time display (e.g., "2 hours ago"). */
export function formatRelativeTime(date: Date | string, countryCode: string = DEFAULT_COUNTRY): string {
  return formatRelativeFor(date, { country: countryCode });
}

// ─── Tax Formatting ──────────────────────────────────────────────────────────

export function getTaxLabel(countryCode: string = DEFAULT_COUNTRY): string {
  return getTaxLabelFor(countryCode);
}

export function calculateTax(amount: number, countryCode: string = DEFAULT_COUNTRY): {
  taxAmount: number;
  totalWithTax: number;
  taxLabel: string;
  isInclusive: boolean;
  /** False where no consumption tax applies (Qatar, Kuwait) — omit the row. */
  applies: boolean;
} {
  const breakdown = calculateTaxFor(amount, countryCode);
  return {
    taxAmount: breakdown.taxAmount,
    totalWithTax: breakdown.grossAmount,
    taxLabel: breakdown.label,
    isInclusive: breakdown.inclusive,
    applies: breakdown.applies,
  };
}
