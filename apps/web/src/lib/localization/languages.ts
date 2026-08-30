/// KARTSEEK — Language registry
///
/// The single list of languages the platform can render. Which of these a user
/// is actually offered is decided per country by `countries.ts` — in Qatar the
/// answer is Arabic and English only.

import type { LanguageCode, LanguageMeta } from './types';

export const LANGUAGES: Record<LanguageCode, LanguageMeta> = {
  en: { code: 'en', name: 'English',   nativeName: 'English',   rtl: false, intl: 'en',    flagCountry: 'GB' },
  ar: { code: 'ar', name: 'Arabic',    nativeName: 'العربية',   rtl: true,  intl: 'ar',    flagCountry: 'QA' },
  hi: { code: 'hi', name: 'Hindi',     nativeName: 'हिन्दी',     rtl: false, intl: 'hi-IN', flagCountry: 'IN' },
  ta: { code: 'ta', name: 'Tamil',     nativeName: 'தமிழ்',      rtl: false, intl: 'ta-IN', flagCountry: 'IN' },
  ml: { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം',    rtl: false, intl: 'ml-IN', flagCountry: 'IN' },
  es: { code: 'es', name: 'Spanish',   nativeName: 'Español',   rtl: false, intl: 'es',    flagCountry: 'ES' },
};

export const ALL_LANGUAGE_CODES = Object.keys(LANGUAGES) as LanguageCode[];

export function isLanguageCode(value: string | undefined | null): value is LanguageCode {
  return !!value && value in LANGUAGES;
}

export function getLanguage(code: string): LanguageMeta {
  return LANGUAGES[code as LanguageCode] ?? LANGUAGES.en;
}

export function isRtl(code: string): boolean {
  return getLanguage(code).rtl;
}

export function getDirection(code: string): 'rtl' | 'ltr' {
  return isRtl(code) ? 'rtl' : 'ltr';
}

/**
 * Normalise anything that looks like a locale down to a bare language code:
 * `ar-QA` → `ar`, `en_GB` → `en`, `ar-qa` → `ar`.
 *
 * The cookie, the `Accept-Language` header and legacy `en-qa`/`ar-qa` values
 * that predate this registry all arrive in different shapes.
 */
export function normaliseLanguage(value: string | undefined | null): LanguageCode | null {
  if (!value) return null;
  const base = value.trim().toLowerCase().split(/[-_]/)[0];
  return isLanguageCode(base) ? base : null;
}
