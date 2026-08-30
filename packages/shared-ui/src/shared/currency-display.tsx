'use client';

import React from 'react';
import { formatCurrency, getCurrencySymbol } from '@/lib/locale-utils';

interface CurrencyDisplayProps {
  amount: number;
  countryCode?: string;
  currencyCode?: string;
  compact?: boolean;
  showCode?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Locale-aware currency display component.
 * Automatically formats the amount based on the user's country.
 *
 * @example
 * <CurrencyDisplay amount={1234.50} countryCode="QA" />  // "﷼ 1,234.50"
 * <CurrencyDisplay amount={1234.50} countryCode="IN" />  // "₹ 1,234.50"
 */
export function CurrencyDisplay({
  amount,
  countryCode = 'QA',
  currencyCode,
  compact = false,
  showCode = false,
  className = '',
  size = 'md',
}: CurrencyDisplayProps) {
  const formatted = formatCurrency(amount, { countryCode, currencyCode, compact, showCode });

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg font-semibold',
    xl: 'text-2xl font-bold',
  };

  return (
    <span className={`${sizeClasses[size]} tabular-nums ${className}`}>
      {formatted}
    </span>
  );
}

/**
 * Displays just the currency symbol for a country.
 */
export function CurrencySymbol({ countryCode = 'QA', className = '' }: { countryCode?: string; className?: string }) {
  return <span className={className}>{getCurrencySymbol(countryCode)}</span>;
}

export default CurrencyDisplay;
