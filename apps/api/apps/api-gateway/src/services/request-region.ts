import { DEFAULT_REGION, isActiveRegion, SupportedCountryCode } from '@app/region';

/**
 * The trading market a request belongs to.
 *
 * `RegionMiddleware` resolves this before any controller runs and puts it on
 * `req.regionCode`, but most controllers never read it. Several instead passed
 * a literal `countryCode: 'IN'` down to the services — a Qatari seller opening
 * their inventory had it fetched for India, which returns another market's rows
 * or none at all — and the rest wrote `req.headers['x-region-code'] ?? 'IN'`,
 * which reintroduces the same default whenever the header is missing.
 *
 * One helper, so a market change is one edit. The header is re-validated rather
 * than trusted: it arrives from the client, and `isActiveRegion` is what keeps a
 * request from scoping itself into a market the platform has closed.
 */
/** The shape `requestRegion` needs — everything Express gives a controller. */
export interface RequestWithRegion {
  regionCode?: string;
  headers?: Record<string, unknown>;
}

export function requestRegion(req: unknown): SupportedCountryCode {
  const r = req as { regionCode?: string; headers?: Record<string, unknown> } | undefined;

  // Middleware-resolved value first — it has already been through detection.
  if (isActiveRegion(r?.regionCode)) return r!.regionCode!.toUpperCase() as SupportedCountryCode;

  const header = r?.headers?.['x-region-code'];
  const raw = Array.isArray(header) ? header[0] : header;
  if (typeof raw === 'string' && isActiveRegion(raw)) {
    return raw.toUpperCase() as SupportedCountryCode;
  }

  return DEFAULT_REGION;
}
