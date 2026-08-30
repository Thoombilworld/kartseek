/**
 * The one place the API Gateway's base URL is resolved.
 *
 * `http://localhost:3001/api/v1` was written as an inline fallback in about a
 * dozen modules and again in the `next.config.mjs` rewrite. That is fine until a
 * deploy forgets one of the environment variables: nothing fails loudly, the
 * bundle simply ships pointing at a host that does not exist outside a
 * developer's laptop, and the storefront looks "offline" with no error naming
 * the cause.
 *
 * Resolution order:
 *   - browser: `NEXT_PUBLIC_API_URL` (inlined at build time)
 *   - server:  `API_URL`, then `NEXT_PUBLIC_API_URL`
 *   - neither: the localhost default in development; a thrown error in
 *     production, so a misconfigured deploy fails at startup rather than
 *     silently at request time.
 */

const DEV_DEFAULT = 'http://localhost:3001/api/v1';

function resolve(): string {
  const fromEnv =
    typeof window !== 'undefined'
      ? process.env.NEXT_PUBLIC_API_URL
      : process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL;

  if (fromEnv) return fromEnv.replace(/\/$/, '');

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'API base URL is not configured. Set API_URL (server) and NEXT_PUBLIC_API_URL (browser) ' +
      'to the API Gateway origin, e.g. https://api.kartseek.com/api/v1.',
    );
  }

  return DEV_DEFAULT;
}

/** Gateway origin including the `/api/v1` prefix, with no trailing slash. */
export const API_BASE_URL = resolve();

/**
 * WebSocket origin — the **bare** host, with no `/api/v1` suffix.
 *
 * A separate variable on purpose: socket.io connects to the origin and appends
 * its own path, so reusing `API_BASE_URL` here would produce
 * `https://host/api/v1/socket.io` and fail the handshake. Same fail-loud rule as
 * above, because a production bundle pointed at `localhost:3001` for realtime
 * simply never connects and the UI shows stale data with no error.
 */
export const WS_BASE_URL = (() => {
  const fromEnv = process.env.NEXT_PUBLIC_WS_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'WebSocket URL is not configured. Set NEXT_PUBLIC_WS_URL to the gateway origin ' +
      '(no /api/v1 suffix), e.g. https://api.kartseek.com.',
    );
  }

  return 'http://localhost:3001';
})();
