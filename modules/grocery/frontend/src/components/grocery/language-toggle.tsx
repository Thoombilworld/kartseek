'use client';

import React from 'react';
import { useRegion } from '@/lib/contexts/region-context';
import { useGroceryLocale } from '@/i18n/grocery-locale';

/**
 * English / Arabic switch for the grocery header.
 *
 * Grocery has its own header — country selector, search, cart — and never had a
 * language control, so a shopper in Doha had no way to choose. The module also
 * used to derive Arabic from the market rather than the reader, which made a
 * toggle meaningless; now that `showArabic` follows `currentLanguage`, this is
 * the control that drives it.
 *
 * It writes to the platform's language state, not a grocery-local one, so the
 * choice persists across the cookie, the `<html lang/dir>` attributes and every
 * other module. Rendered only where the market actually offers a second
 * language: a single-language market gets a dead control otherwise.
 */
export function GroceryLanguageToggle({ className = '' }: { className?: string }) {
  const { currentLanguage, setCurrentLanguage } = useRegion();
  const { config } = useGroceryLocale();

  const offersArabic =
    config.language.primary === 'ar' || config.language.secondary === 'ar';
  if (!offersArabic) return null;

  const isArabic = currentLanguage === 'ar';
  const next = isArabic ? 'en' : 'ar';

  return (
    <button
      type="button"
      onClick={() => setCurrentLanguage(next as never)}
      // The label names the language you would switch TO, which is how every
      // bilingual Gulf storefront presents it — a button reading "العربية"
      // switches to Arabic.
      aria-label={isArabic ? 'Switch to English' : 'التبديل إلى العربية'}
      title={isArabic ? 'Switch to English' : 'التبديل إلى العربية'}
      className={
        'shrink-0 min-h-[44px] min-w-[44px] px-3 rounded-lg border border-white/25 '
        + 'bg-white/10 text-white text-sm font-bold hover:bg-white/20 '
        + 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white '
        + 'transition-colors ' + className
      }
    >
      {isArabic ? 'EN' : 'ع'}
    </button>
  );
}
