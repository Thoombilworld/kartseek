/// KARTSEEK — i18n Configuration
///
/// A compatibility view over `@/lib/localization`, which is the single source
/// of truth for every region-dependent setting. Nothing is declared twice here:
/// the maps below are projections of `COUNTRIES`, so adding a language to a
/// country in the registry adds it to every language picker in every portal.
///
/// New code should import from `@/lib/localization` directly.

import {
  COUNTRIES, COUNTRY_CODES, DEFAULT_COUNTRY, getCountry, getLanguages,
  LANGUAGES, ALL_LANGUAGE_CODES, getDirection, isRtl, normaliseLanguage,
} from '@/lib/localization';
import type { CountryCode, LanguageCode } from '@/lib/localization';

/**
 * A selectable locale is a *language*, not a language-region pair.
 *
 * The region is tracked separately and already decides the currency, calendar
 * and address format, so `en-qa` and `en` were never two different choices —
 * carrying both meant the picker offered "English" and "English (Qatar)" side
 * by side. Region-specific wording now lives in `locales/index.ts` as an
 * override layer applied on top of the base language.
 */
export type SupportedLocale = LanguageCode;

export const SUPPORTED_LOCALES = ALL_LANGUAGE_CODES;

export const DEFAULT_LOCALE: SupportedLocale = 'en';

export const RTL_LOCALES: SupportedLocale[] =
  ALL_LANGUAGE_CODES.filter((code) => LANGUAGES[code].rtl);

export const LOCALE_NAMES: Record<SupportedLocale, {
  name: string; nativeName: string; flag: string; countryCode: string;
}> = ALL_LANGUAGE_CODES.reduce((acc, code) => {
  const meta = LANGUAGES[code];
  acc[code] = {
    name: meta.name,
    nativeName: meta.nativeName,
    flag: COUNTRIES[meta.flagCountry as CountryCode]?.flag ?? '🌐',
    countryCode: meta.flagCountry,
  };
  return acc;
}, {} as Record<SupportedLocale, { name: string; nativeName: string; flag: string; countryCode: string }>);

/**
 * Per-country locale settings.
 *
 * `supportedLanguages` is what every language switcher reads — for `QA` it is
 * `['ar', 'en']` and nothing else, while `IN` carries its regional languages.
 */
export const COUNTRY_LOCALE_MAP: Record<string, {
  defaultLang: SupportedLocale;
  currency: string;
  currencySymbol: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  taxName: string;
  taxRate: number;
  taxInclusive: boolean;
  measurementSystem: 'metric' | 'imperial';
  supportedLanguages: SupportedLocale[];
}> = COUNTRY_CODES.reduce((acc, code) => {
  const c = COUNTRIES[code];
  acc[code] = {
    defaultLang: c.defaultLanguage,
    currency: c.currency.code,
    currencySymbol: c.currency.symbol,
    timezone: c.timezone,
    dateFormat: c.dateFormat,
    timeFormat: c.timeFormat,
    taxName: c.tax.name,
    taxRate: c.tax.rate,
    taxInclusive: c.tax.inclusive,
    measurementSystem: c.measurementSystem,
    supportedLanguages: c.languages,
  };
  return acc;
}, {} as Record<string, any>);

export function isRtlLocale(locale: string): boolean {
  return isRtl(locale);
}

export function getCountryConfig(countryCode: string) {
  return COUNTRY_LOCALE_MAP[countryCode.toUpperCase()] || COUNTRY_LOCALE_MAP[DEFAULT_COUNTRY];
}

/** Return 'rtl' or 'ltr' for a given locale. */
export function getLocaleDirection(locale: string): 'rtl' | 'ltr' {
  return getDirection(locale);
}

/** Type-guard to check if a string is a valid supported locale. */
export function isValidLocale(value: string): value is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/**
 * Coerce anything locale-shaped to a supported language, then to one the given
 * country actually offers.
 *
 * This is the guard that keeps Qatar on Arabic/English: a visitor arriving with
 * a `hi-IN` browser or a stale `kartseek_language=ta` cookie is resolved to the
 * Qatari default rather than being shown a language the region does not serve.
 */
export function resolveLocaleForCountry(
  locale: string | undefined | null,
  countryCode: string | undefined | null,
): SupportedLocale {
  const country = getCountry(countryCode);
  const requested = normaliseLanguage(locale);
  if (requested && country.languages.includes(requested)) return requested;
  return country.defaultLanguage;
}

/** Languages offered in a country — the source for every language switcher. */
export function getSupportedLanguages(countryCode: string | undefined | null): SupportedLocale[] {
  return getLanguages(countryCode);
}

/**
 * Maps locale codes to full BCP-47 / Intl locale strings for `Intl.*`.
 *
 * Prefer the formatters in `@/lib/localization` — they combine the language
 * with the active region, which is what actually decides grouping and calendar.
 */
export const LOCALE_TO_INTL: Record<SupportedLocale, string> =
  ALL_LANGUAGE_CODES.reduce((acc, code) => {
    acc[code] = LANGUAGES[code].intl;
    return acc;
  }, {} as Record<SupportedLocale, string>);

export { DEFAULT_COUNTRY };
export type { CountryCode };
