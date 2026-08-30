/**
 * The page's Content-Security-Policy, in one place.
 *
 * CommonJS on purpose: `next.config.mjs` imports it as ESM (Node resolves the
 * named export through cjs-module-lexer) and Jest requires it directly, so the
 * header the browser enforces and the header under test are the same string.
 */

/** @returns {string|null} the `scheme://host:port` of a URL, or null if unparseable. */
function originOf(url) {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/** Browsers exempt loopback from `upgrade-insecure-requests`; nothing else. */
function isLoopback(hostname) {
  return hostname === 'localhost'
    || hostname === '127.0.0.1'
    || hostname === '[::1]'
    || hostname === '::1'
    || hostname.endsWith('.localhost');
}

/** True when the URL is plain http on a host the browser will force to https. */
function isUpgradableHttp(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' && !isLoopback(parsed.hostname);
  } catch {
    return false;
  }
}

/**
 * @param {{ nodeEnv?: string, apiUrl?: string, wsUrl?: string }} env
 *   `apiUrl` is NEXT_PUBLIC_API_URL (or API_URL) and `wsUrl` is
 *   NEXT_PUBLIC_WS_URL — the same values `lib/config/api-base.ts` resolves, so
 *   the page is permitted to call whatever the client is configured to call.
 * @returns {string}
 */
function buildContentSecurityPolicy(env = {}) {
  const isDev = env.nodeEnv === 'development';

  // connect-src used to be a hardcoded pair of hostnames, with localhost added
  // only when NODE_ENV was `development`. Any other deployment — a local
  // `next start`, a container, a preview URL, a renamed API domain — had its own
  // gateway blocked by its own page: the browser refuses the connection, fetch()
  // rejects with a TypeError before there is any status to read, and the sign-in
  // page turns that into "We could not reach the sign-in service. Check your
  // connection." Nothing reaches the server, so the gateway logs stay clean and
  // the same request from curl succeeds. Derive it from the configuration
  // instead, and keep the known hosts so existing deploys are unaffected.
  const connectSrc = [
    "'self'",
    originOf(env.apiUrl),
    originOf(env.wsUrl),
    'https://api.kartseek.com',
    'https://api-staging.kartseek.com',
    // nominatim (reverse-geocode lat/lng → city) and ipapi (IP-based
    // fallback) back the delivery-location detector in the module
    // headers. Without them the fetches are refused and detection
    // fails silently to "Select Location".
    'https://nominatim.openstreetmap.org',
    'https://ipapi.co',
    isDev ? 'http://localhost:*' : null,
    'ws://localhost:*',
    'wss:',
  ].filter(Boolean);

  const directives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://maps.googleapis.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    `connect-src ${[...new Set(connectSrc)].join(' ')}`,
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ];

  // `upgrade-insecure-requests` rewrites http:// to https:// before the request
  // leaves the page, so allowing an http gateway in connect-src is not enough on
  // its own — the upgraded request goes to a port that is not serving TLS and
  // fails the same silent way. Loopback is exempt in browsers, so a local
  // production build keeps the directive.
  if (!isUpgradableHttp(env.apiUrl) && !isUpgradableHttp(env.wsUrl)) {
    directives.push('upgrade-insecure-requests');
  }

  return directives.join('; ');
}

module.exports = { buildContentSecurityPolicy, originOf };
