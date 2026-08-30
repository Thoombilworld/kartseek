import { buildContentSecurityPolicy } from '../../config/csp.cjs';

/**
 * The sign-in page reports "We could not reach the sign-in service. Check your
 * connection" for exactly one reason: `fetch()` rejected before producing a
 * response, so `api-endpoints.ts` never got a status to turn into an `ApiError`.
 *
 * A `connect-src` that omits the gateway is one of the ways to make that happen,
 * and the quietest: the request never leaves the page, nothing reaches the
 * server logs, and the copy blames the customer's connection. The allowlist was
 * a hardcoded pair of hostnames with a localhost escape hatch that only existed
 * when NODE_ENV was `development`, so every production build — a local
 * `next start`, a container, a preview deploy, any API domain that is not
 * `api.kartseek.com` — had its own gateway blocked by its own page.
 *
 * These assert that whatever origin the app is configured to call is an origin
 * the page is permitted to call.
 */

function connectSrc(csp: string): string {
  const directive = csp.split('; ').find((d) => d.startsWith('connect-src'));
  if (!directive) throw new Error(`no connect-src in CSP: ${csp}`);
  return directive;
}

describe('Content-Security-Policy connect-src', () => {
  it('allows the configured API origin in production', () => {
    const csp = buildContentSecurityPolicy({
      nodeEnv: 'production',
      apiUrl: 'https://api.kartseek.io/api/v1',
      wsUrl: 'https://api.kartseek.io',
    });

    expect(connectSrc(csp)).toContain('https://api.kartseek.io');
  });

  /**
   * `next build && next start` against the local gateway. NODE_ENV is
   * `production`, so the development-only localhost entry is gone and sign-in
   * fails with the connection error while curl against the same gateway works.
   */
  it('allows a localhost API origin when the production build points at one', () => {
    const csp = buildContentSecurityPolicy({
      nodeEnv: 'production',
      apiUrl: 'http://localhost:3001/api/v1',
      wsUrl: 'http://localhost:3001',
    });

    expect(connectSrc(csp)).toContain('http://localhost:3001');
  });

  it('allows the configured websocket origin', () => {
    const csp = buildContentSecurityPolicy({
      nodeEnv: 'production',
      apiUrl: 'https://api.kartseek.io/api/v1',
      wsUrl: 'https://realtime.kartseek.io',
    });

    expect(connectSrc(csp)).toContain('https://realtime.kartseek.io');
  });

  /**
   * `upgrade-insecure-requests` rewrites http:// to https:// before the request
   * is sent. Chrome exempts localhost, but a LAN or bare-IP gateway is not
   * exempt: allowing its origin in connect-src is not enough on its own.
   */
  it('does not force https when the gateway is served over plain http', () => {
    const csp = buildContentSecurityPolicy({
      nodeEnv: 'production',
      apiUrl: 'http://10.0.0.5:3001/api/v1',
      wsUrl: 'http://10.0.0.5:3001',
    });

    expect(connectSrc(csp)).toContain('http://10.0.0.5:3001');
    expect(csp).not.toContain('upgrade-insecure-requests');
  });

  it('keeps upgrade-insecure-requests for an https deployment', () => {
    const csp = buildContentSecurityPolicy({
      nodeEnv: 'production',
      apiUrl: 'https://api.kartseek.com/api/v1',
      wsUrl: 'https://api.kartseek.com',
    });

    expect(csp).toContain('upgrade-insecure-requests');
  });

  it('still allows the geocoding providers the location detector needs', () => {
    const csp = buildContentSecurityPolicy({
      nodeEnv: 'production',
      apiUrl: 'https://api.kartseek.com/api/v1',
    });

    expect(connectSrc(csp)).toContain('https://nominatim.openstreetmap.org');
    expect(connectSrc(csp)).toContain('https://ipapi.co');
  });

  it('keeps localhost open in development, where no API URL may be set', () => {
    const csp = buildContentSecurityPolicy({ nodeEnv: 'development' });

    expect(connectSrc(csp)).toContain('http://localhost:*');
  });

  it('never emits a duplicate source', () => {
    const sources = connectSrc(
      buildContentSecurityPolicy({
        nodeEnv: 'production',
        apiUrl: 'https://api.kartseek.com/api/v1',
        wsUrl: 'https://api.kartseek.com',
      }),
    )
      .replace('connect-src ', '')
      .split(' ');

    expect(sources).toHaveLength(new Set(sources).size);
  });
});
