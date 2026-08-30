import { getRequestConfig } from 'next-intl/server';
import { headers, cookies } from 'next/headers';
import { resolveLocaleForCountry } from './config';
import { DEFAULT_COUNTRY, isCountryCode } from '@/lib/localization';

/**
 * Locales that have a bundle under `../messages`.
 *
 * Deliberately narrower than the set of languages the registry offers: the
 * region registry decides what a market *may* be served in, this decides what
 * next-intl actually has strings for. The two drift as markets are added, and
 * that drift used to be fatal — `import('../messages/ta.json')` threw for every
 * language without a file, so a Tamil-speaking visitor to the Indian storefront
 * got a 500 rather than a page.
 *
 * Most of the app reads translations through `useTranslation`, which has its own
 * dictionaries covering every offered language; this only backs the next-intl
 * surface.
 */
const AVAILABLE_MESSAGE_LOCALES = ['en', 'ar', 'hi'] as const;
const FALLBACK_LOCALE = 'en';

function hasMessages(locale: string): boolean {
  return (AVAILABLE_MESSAGE_LOCALES as readonly string[]).includes(locale);
}

export default getRequestConfig(async () => {
  // The edge proxy resolves both and forwards them as request headers; the
  // cookies cover the requests its matcher skips.
  const [headersList, cookieStore] = await Promise.all([headers(), cookies()]);

  const rawCountry = headersList.get('x-country-code') ?? cookieStore.get('kartseek_country')?.value;
  const country = isCountryCode(rawCountry) ? rawCountry!.toUpperCase() : DEFAULT_COUNTRY;

  // Constrained to what this market serves, so a stale cookie cannot put the
  // page into a language the region has no catalogue or support for.
  const locale = resolveLocaleForCountry(
    headersList.get('x-detected-language') ?? cookieStore.get('kartseek_language')?.value,
    country,
  );

  // Keep the resolved locale — it still drives direction, formatting and the
  // language switcher — but fall back to English strings when this locale has
  // no bundle. A partially translated page beats a crashed one.
  const messagesLocale = hasMessages(locale) ? locale : FALLBACK_LOCALE;

  return {
    locale,
    messages: (await import(`../messages/${messagesLocale}.json`)).default,
  };
});
