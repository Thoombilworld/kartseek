import { resolveCorsOrigins } from './cors-origins';

/**
 * A browser origin that is not on this list gets its preflight refused, so the
 * request never leaves the page. `fetch()` then rejects with a TypeError before
 * there is a status to read, and the web client reports "We could not reach the
 * sign-in service. Check your connection." — the gateway logs nothing, and the
 * same call from curl succeeds. The list used to be three hardcoded localhost
 * ports plus `/https:\/\/.*\.kartseek\.com$/`, which matches subdomains but not
 * the apex domain, so a storefront served from https://kartseek.com could not
 * sign anyone in.
 */

/** Mirrors how the `cors` package tests an origin against the configured list. */
function allows(origins: (string | RegExp)[], origin: string): boolean {
  return origins.some((allowed) =>
    typeof allowed === 'string' ? allowed === origin : allowed.test(origin),
  );
}

describe('resolveCorsOrigins', () => {
  it('allows the apex domain, not just subdomains', () => {
    const { origins } = resolveCorsOrigins({ nodeEnv: 'production' });

    expect(allows(origins, 'https://kartseek.com')).toBe(true);
    expect(allows(origins, 'https://www.kartseek.com')).toBe(true);
    expect(allows(origins, 'https://shop.kartseek.com')).toBe(true);
  });

  it('allows origins listed in CORS_ORIGINS', () => {
    const { origins } = resolveCorsOrigins({
      nodeEnv: 'production',
      corsOrigins: 'https://kartseek.qa, https://preview-42.vercel.app',
    });

    expect(allows(origins, 'https://kartseek.qa')).toBe(true);
    expect(allows(origins, 'https://preview-42.vercel.app')).toBe(true);
  });

  it('allows the configured WEB_APP_URL origin', () => {
    const { origins } = resolveCorsOrigins({
      nodeEnv: 'production',
      webAppUrl: 'https://app.kartseek.io/auth/login',
    });

    expect(allows(origins, 'https://app.kartseek.io')).toBe(true);
  });

  it('normalises a trailing slash to a bare origin', () => {
    const { origins } = resolveCorsOrigins({ corsOrigins: 'https://kartseek.qa/' });

    expect(origins).toContain('https://kartseek.qa');
  });

  it('keeps the local dev origins in development', () => {
    const { origins } = resolveCorsOrigins({ nodeEnv: 'development' });

    expect(allows(origins, 'http://localhost:3000')).toBe(true);
    expect(allows(origins, 'http://localhost:3001')).toBe(true);
    expect(allows(origins, 'http://localhost:5173')).toBe(true);
  });

  it('drops the local dev origins in production', () => {
    const { origins } = resolveCorsOrigins({ nodeEnv: 'production' });

    expect(allows(origins, 'http://localhost:3000')).toBe(false);
  });

  it('refuses look-alike domains', () => {
    const { origins } = resolveCorsOrigins({ nodeEnv: 'production' });

    expect(allows(origins, 'https://kartseek.com.evil.com')).toBe(false);
    expect(allows(origins, 'https://evilkartseek.com')).toBe(false);
    expect(allows(origins, 'https://evil.com')).toBe(false);
    expect(allows(origins, 'http://kartseek.com')).toBe(false);
  });

  /** A typo in CORS_ORIGINS must not silently widen or narrow the list. */
  it('reports entries it could not parse instead of dropping them silently', () => {
    const { origins, ignored } = resolveCorsOrigins({
      corsOrigins: 'https://good.example, not-a-url',
    });

    expect(allows(origins, 'https://good.example')).toBe(true);
    expect(ignored).toEqual(['not-a-url']);
  });

  it('does not repeat an origin that is configured twice', () => {
    const { origins } = resolveCorsOrigins({
      nodeEnv: 'production',
      corsOrigins: 'https://app.kartseek.io',
      webAppUrl: 'https://app.kartseek.io',
    });

    const strings = origins.filter((o): o is string => typeof o === 'string');
    expect(strings).toHaveLength(new Set(strings).size);
  });
});
