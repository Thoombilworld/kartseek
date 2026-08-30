/// KARTSEEK — Locale Registry
///
/// Two layers:
///   1. `translations` — one dictionary per *language*. This is what the
///      language switcher chooses between.
///   2. `REGION_OVERRIDES` — per country+language wording that differs from the
///      base language. Qatari English and Indian English are the same choice in
///      the picker; only their copy differs, so they belong here rather than as
///      separate selectable locales.

import type { TranslationKeys } from '../types';
import type { SupportedLocale } from '../config';

import en from './en';
import ar from './ar';
import hi from './hi';
import es from './es';
import ta from './ta';
import ml from './ml';

import enIN from './en-IN';
import enQa from './en-qa';
import arQa from './ar-qa';

/**
 * Complete mapping of language code → translation dictionary.
 * English is always the fallback.
 */
export const translations: Record<SupportedLocale, TranslationKeys> = {
  en,
  ar,
  hi,
  es,
  ta,
  ml,
};

/**
 * Region-specific wording, keyed `COUNTRY:language`.
 *
 * Merged over the base dictionary by `useTranslation`, so a key only has to be
 * listed here when the region says it differently — everything else falls
 * through to the language dictionary above.
 */
export const REGION_OVERRIDES: Partial<Record<string, Partial<TranslationKeys>>> = {
  'QA:en': enQa,
  'QA:ar': arQa,
  'IN:en': enIN,
};

/** Overrides in force for a country+language pair, or undefined if none. */
export function getRegionOverrides(
  country: string | undefined | null,
  language: SupportedLocale,
): Partial<TranslationKeys> | undefined {
  if (!country) return undefined;
  return REGION_OVERRIDES[`${country.toUpperCase()}:${language}`];
}

export default translations;
