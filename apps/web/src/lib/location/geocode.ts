/**
 * Turning a place name into coordinates, and back.
 *
 * Every store query on the platform is coordinate-based — `/grocery/stores`
 * accepts `lat`/`lng` and nothing else — so a shopper who types an area name
 * has no way to reach it without a geocoding step. Grocery's "Change" control
 * had none: it wrote the typed text into a label and called a refetch that
 * re-ran GPS, so a shopper in Doha could type "Al Wakrah" and get the same
 * West Bay shops back under a new heading.
 *
 * OpenStreetMap's Nominatim is the provider, already allowed by the app's CSP
 * (`connect-src` lists it alongside ipapi.co) and already used for the reverse
 * lookup on the grocery homepage. Results are constrained to the shopper's
 * country so "Al Khor" cannot resolve to a same-named place elsewhere.
 *
 * Nominatim asks that callers identify themselves and stay under one request a
 * second. These are user-initiated lookups — one per explicit "Change" — so
 * the rate is inherently low, but the referrer identifies the app and failures
 * are non-fatal by design: the caller keeps whatever location it already had.
 */

export interface GeocodedPlace {
  label: string;
  lat: number;
  lng: number;
}

const ENDPOINT = 'https://nominatim.openstreetmap.org';

/** Best match for a free-text area within one country, or null. */
export async function geocodeArea(
  query: string,
  countryCode?: string,
  signal?: AbortSignal,
): Promise<GeocodedPlace | null> {
  const q = query.trim();
  if (!q) return null;

  const params = new URLSearchParams({ q, format: 'json', limit: '1', addressdetails: '1' });
  // Constrain to the trading country so a name that exists in several places
  // resolves to the one the shopper actually means.
  if (countryCode) params.set('countrycodes', countryCode.toLowerCase());

  try {
    const res = await fetch(`${ENDPOINT}/search?${params.toString()}`, { signal });
    if (!res.ok) return null;
    const rows = await res.json();
    const hit = Array.isArray(rows) ? rows[0] : null;
    if (!hit?.lat || !hit?.lon) return null;

    const a = hit.address ?? {};
    // Prefer the most specific locality the provider gives us; `display_name`
    // is a full postal-style string and reads badly in a one-line header.
    const label =
      a.suburb || a.neighbourhood || a.city_district || a.village || a.town || a.city || q;

    return { label, lat: Number(hit.lat), lng: Number(hit.lon) };
  } catch {
    // Offline, blocked, or aborted — the caller keeps its existing location.
    return null;
  }
}

/** Place name for a coordinate pair, or null. */
export async function reverseGeocode(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<string | null> {
  try {
    const res = await fetch(`${ENDPOINT}/reverse?lat=${lat}&lon=${lng}&format=json`, { signal });
    if (!res.ok) return null;
    const data = await res.json();
    const a = data?.address ?? {};
    return a.suburb || a.neighbourhood || a.city_district || a.village || a.town || a.city || null;
  } catch {
    return null;
  }
}
