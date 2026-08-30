/// KARTSEEK — Region headers for outbound API calls
///
/// The gateway's `RegionMiddleware` resolves every request to an operational
/// region and scopes the query to it. It reads `X-Region-Code` first and only
/// falls back to IP geolocation — so a browser call that omits the header gets
/// scoped by whichever datacentre the request egressed from, not by the region
/// the customer is actually shopping in. Every client-side fetch goes through
/// here so the header is always present.

const COUNTRY_COOKIE = 'kartseek_country';
const LANGUAGE_COOKIE = 'kartseek_language';

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

/** The region the browser is currently shopping in, or undefined server-side. */
export function getActiveRegionCode(): string | undefined {
  return readCookie(COUNTRY_COOKIE)?.toUpperCase();
}

export function getActiveLanguageCode(): string | undefined {
  return readCookie(LANGUAGE_COOKIE);
}

/**
 * Region headers to merge into an outbound request.
 *
 * `ALL` is an admin filter rather than a market, so it is deliberately not
 * forwarded — sending it would make the gateway fall through to IP detection
 * and silently scope an "all regions" query to one region.
 */
export function regionHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};

  const region = getActiveRegionCode();
  if (region && region !== 'ALL') headers['X-Region-Code'] = region;

  const language = getActiveLanguageCode();
  if (language) headers['X-Language-Code'] = language;

  // Lets the backend render region-correct timestamps without re-deriving the
  // zone, and surfaces a mismatch between the device clock and the region.
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) headers['X-Timezone'] = tz;
  } catch {
    // Intl is always present in supported browsers; ignore if it is not.
  }

  return headers;
}

/**
 * Append the region as a query parameter as well as a header.
 *
 * Some catalogue endpoints take `?country=` because their responses are cached
 * per region — a header alone would let one region's cached page be served to
 * another. Returns the params unchanged when there is no region to add.
 */
export function withRegionParam<T extends Record<string, unknown>>(params?: T): T & { country?: string } {
  const region = getActiveRegionCode();
  if (!region || region === 'ALL') return (params ?? {}) as T;
  return { ...(params ?? {}), country: region } as T & { country: string };
}
