/**
 * The browser origins the gateway will answer credentialed requests from.
 *
 * This list is enforced by the browser, not by us: an origin that is missing has
 * its preflight refused, so the request never leaves the page. `fetch()` rejects
 * with a TypeError before there is any status to read, the web client turns that
 * into "We could not reach the sign-in service. Check your connection.", and the
 * gateway logs nothing at all — the same call from curl succeeds, because curl
 * does not enforce CORS. Sign-in is where it is noticed first.
 *
 * It used to be three hardcoded localhost ports and `/https:\/\/.*\.kartseek\.com$/`.
 * That regex matches subdomains but NOT the apex `https://kartseek.com`, and no
 * environment variable could add an origin, so a storefront on the apex domain —
 * or on a preview URL, a partner domain, a LAN address — could not sign anyone
 * in. Configure additional origins with CORS_ORIGINS (comma-separated).
 */

/** Matches `kartseek.com` and any subdomain of it, anchored at both ends. */
const KARTSEEK_DOMAINS = /^https:\/\/([a-z0-9-]+\.)*kartseek\.com$/i;

/** Local ports the web portal, Swagger UI and Vite dev tools run on. */
const LOCAL_DEV_ORIGINS = [
  'http://localhost:3000', // Next.js web portal
  'http://localhost:3001', // API Gateway self (Swagger UI)
  'http://localhost:5173', // Vite dev tools
];

export interface CorsOriginEnv {
  nodeEnv?: string;
  /** CORS_ORIGINS — comma-separated list of allowed browser origins. */
  corsOrigins?: string;
  /** WEB_APP_URL — the storefront origin, already used for password-reset links. */
  webAppUrl?: string;
}

export interface ResolvedCorsOrigins {
  origins: (string | RegExp)[];
  /** Entries that were not parseable as origins, for the caller to log. */
  ignored: string[];
}

/**
 * Reduce a configured URL to its bare `scheme://host:port`, since that is the
 * form a browser puts in the `Origin` header and the `cors` package compares
 * against by string equality — `https://kartseek.qa/` would never match.
 */
function toOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function resolveCorsOrigins(env: CorsOriginEnv = {}): ResolvedCorsOrigins {
  const configured = [
    ...(env.corsOrigins ?? '').split(','),
    env.webAppUrl ?? '',
  ]
    .map((entry) => entry.trim())
    .filter(Boolean);

  const ignored = configured.filter((entry) => toOrigin(entry) === null);
  const origins = configured
    .map(toOrigin)
    .filter((origin): origin is string => origin !== null);

  // Localhost stays open outside production only. An unset NODE_ENV keeps the
  // dev origins, so nothing that works today stops working; a deploy that
  // declares itself production stops accepting credentialed requests from
  // whatever happens to be running on a developer's machine.
  if (env.nodeEnv !== 'production') {
    origins.push(...LOCAL_DEV_ORIGINS);
  }

  return {
    origins: [...new Set(origins), KARTSEEK_DOMAINS],
    ignored,
  };
}
