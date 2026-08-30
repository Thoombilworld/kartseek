'use client';

/// KARTSEEK — useTranslation Hook
/// Provides type-safe, locale-aware access to all translated strings.

import { useCallback, useMemo } from 'react';
import { useRegion } from '@/lib/contexts/region-context';
import { translations, getRegionOverrides } from './locales';
import type { TranslationKeys } from './types';
import type { SupportedLocale } from './config';

// ─── Interpolation ───────────────────────────────────────────────────────────

/**
 * Replace `{{key}}` placeholders in a string with values from the params object.
 * @example interpolate('Hello {{name}}!', { name: 'World' }) → 'Hello World!'
 */
function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = params[key];
    return val !== undefined ? String(val) : `{{${key}}}`;
  });
}

// ─── Namespace accessor type ─────────────────────────────────────────────────

type Namespace = keyof TranslationKeys;

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Primary hook for accessing translated strings.
 *
 * @param ns - Optional namespace to scope the `t()` function.
 *             When provided, keys are scoped to that namespace.
 *
 * @returns `{ t, locale, dir, isRtl, setLocale }`
 *
 * @example
 * // Unscoped — pass full dotted key
 * const { t } = useTranslation();
 * t('common', 'loading');       // → "Loading…"
 * t('nav', 'home');             // → "Home"
 *
 * @example
 * // Scoped to a namespace
 * const { t } = useTranslation('grocery');
 * t('title');                   // → "Grocery"
 * t('freshGroceries');          // → "Fresh Groceries"
 *
 * @example
 * // Interpolation with params
 * const { t } = useTranslation('home');
 * t('loyaltyPoints', { points: 1420 }); // → "1,420 pts"
 */
export function useTranslation(): {
  t: <NS extends Namespace>(ns: NS, key: keyof TranslationKeys[NS], params?: Record<string, string | number>) => string;
  locale: SupportedLocale;
  dir: 'ltr' | 'rtl';
  isRtl: boolean;
  setLocale: (lang: SupportedLocale) => void;
};
export function useTranslation<NS extends Namespace>(ns: NS): {
  t: (key: keyof TranslationKeys[NS], params?: Record<string, string | number>) => string;
  locale: SupportedLocale;
  dir: 'ltr' | 'rtl';
  isRtl: boolean;
  setLocale: (lang: SupportedLocale) => void;
};
export function useTranslation<NS extends Namespace>(ns?: NS) {
  const { currentLanguage, setCurrentLanguage, isRtl, dir, selectedRegion } = useRegion();

  const dict = useMemo(() => {
    return translations[currentLanguage] || translations['en'];
  }, [currentLanguage]);

  /**
   * Region-specific wording layered over the chosen language — Qatari English
   * says "No VAT applies in Qatar" where base English says "Inclusive of all
   * taxes". Undefined when the region has no overrides.
   */
  const overrides = useMemo(
    () => getRegionOverrides(selectedRegion, currentLanguage),
    [selectedRegion, currentLanguage],
  );

  // Fallback dict is always English
  const fallback = translations['en'];

  /**
   * Resolve a translated string.
   * - If scoped (ns provided at hook level), `t(key)` is sufficient.
   * - If unscoped, `t(namespace, key)` is required.
   * - Falls back to English if key is missing in the active locale.
   */
  const t = useCallback(
    (...args: any[]) => {
      let namespace: Namespace;
      let key: string;
      let params: Record<string, string | number> | undefined;

      if (ns) {
        // Scoped: t(key, params?)
        namespace = ns;
        key = args[0] as string;
        params = args[1] as Record<string, string | number> | undefined;
      } else {
        // Unscoped: t(namespace, key, params?)
        namespace = args[0] as Namespace;
        key = args[1] as string;
        params = args[2] as Record<string, string | number> | undefined;
      }

      // Region override → current language → English.
      const ovDict = overrides?.[namespace] as Record<string, string> | undefined;
      const nsDict = dict[namespace] as Record<string, string> | undefined;
      const fbDict = fallback[namespace] as Record<string, string> | undefined;
      const value = ovDict?.[key] ?? nsDict?.[key] ?? fbDict?.[key] ?? `${String(namespace)}.${key}`;

      return interpolate(value, params);
    },
    [dict, fallback, overrides, ns],
  );

  return {
    t,
    locale: currentLanguage,
    dir,
    isRtl,
    setLocale: setCurrentLanguage,
  };
}

// ─── Static helper (for non-React usage) ─────────────────────────────────────

/**
 * Get a translation value statically without React context.
 * Useful for server-side rendering or utility functions.
 *
 * Pass `country` to pick up region-specific wording — server components know
 * the region from the cookie before any provider has mounted.
 */
export function getTranslation<NS extends Namespace>(
  locale: SupportedLocale,
  ns: NS,
  key: keyof TranslationKeys[NS],
  params?: Record<string, string | number>,
  country?: string,
): string {
  const dict = translations[locale] || translations['en'];
  const fallback = translations['en'];
  const overrides = getRegionOverrides(country, locale);
  const ovDict = overrides?.[ns] as Record<string, string> | undefined;
  const nsDict = dict[ns] as Record<string, string> | undefined;
  const fbDict = fallback[ns] as Record<string, string> | undefined;
  const value = ovDict?.[key as string] ?? nsDict?.[key as string] ?? fbDict?.[key as string] ?? `${String(ns)}.${String(key)}`;
  return interpolate(value, params);
}

export default useTranslation;
