/// KARTSEEK — i18n Barrel Export
/// Single entry point for all i18n utilities.

// Config
export {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  RTL_LOCALES,
  LOCALE_NAMES,
  COUNTRY_LOCALE_MAP,
  isRtlLocale,
  getCountryConfig,
  type SupportedLocale,
} from './config';

// Types
export type { TranslationKeys, TranslationKeyPath } from './types';

// Translation dictionaries
export { translations } from './locales';

// React hook
export { useTranslation, getTranslation } from './useTranslation';
