import { cookies, headers } from 'next/headers';
import { getCurrencyCode } from './currency';
import { DEFAULT_COUNTRY, isActiveCountry } from './countries';
import type { CountryCode } from './types';

/**
 * The trading market for the current server request.
 *
 * The edge proxy resolves the region before the page renders and puts it on
 * `X-Country-Code`, falling back to the `kartseek_country` cookie. Server
 * components had no shared way to read that, so each one either duplicated the
 * lookup or — more often — hardcoded a value: `currency: 'INR'` sat in the
 * `ItemList` structured data of the brand, category and subcategory pages,
 * publishing Indian pricing to search engines for a storefront trading in
 * Qatari riyals.
 *
 * Gated on `isActiveCountry`, not `isCountryCode`: this is the currency a
 * shopper is quoted, so it must be a market the platform actually trades in.
 */
export async function requestCountry(): Promise<CountryCode> {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const raw = headerStore.get('X-Country-Code') ?? cookieStore.get('kartseek_country')?.value;
  return isActiveCountry(raw) ? (raw!.toUpperCase() as CountryCode) : DEFAULT_COUNTRY;
}

/** ISO currency code for the current request's trading market. */
export async function requestCurrency(): Promise<string> {
  return getCurrencyCode(await requestCountry());
}
