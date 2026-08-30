import {
  ACTIVE_COUNTRY_CODES,
  DEFAULT_COUNTRY,
  isActiveCountry,
  isCountryCode,
  getCountry,
  resolveTradingCountry,
  getActiveCountries,
} from '@/lib/localization';

/**
 * Which markets a shopper can reach, and which the platform merely knows about.
 *
 * These are two different questions and the codebase conflated them: `isActive`
 * was `true` on all twenty registry entries and nothing filtered on it, so a
 * path segment, a stale cookie or a geo header naming any of them put the
 * storefront into that market — its currency, its payment rails, its address
 * form — whether or not the business trades there.
 *
 * The separation is easy to undo by accident, because the obvious-looking
 * `isCountryCode` is the permissive one. These cases pin both halves.
 */
describe('trading markets', () => {
  it('restricts trading to the configured markets', () => {
    // Qatar is the home market and must always be reachable, or the storefront
    // has nowhere to fall back to.
    expect(ACTIVE_COUNTRY_CODES).toContain(DEFAULT_COUNTRY);
    expect(isActiveCountry(DEFAULT_COUNTRY)).toBe(true);
  });

  it('does not treat every known country as a trading market', () => {
    const known = ['IN', 'AE', 'SA', 'GB', 'US'].filter((c) => !ACTIVE_COUNTRY_CODES.includes(c as never));
    // Whichever of those are not configured must be refused.
    for (const code of known) {
      expect(isActiveCountry(code)).toBe(false);
    }
  });

  it('still describes non-trading countries, so stored records stay readable', () => {
    // The distinction that matters: an invoice from an Indian seller has to keep
    // resolving India's currency and tax-id label after the market is closed.
    expect(isCountryCode('IN')).toBe(true);
    expect(getCountry('IN').code).toBe('IN');
    expect(getCountry('IN').currency).not.toBe(getCountry(DEFAULT_COUNTRY).currency);
  });

  it('falls back to the home market when asked to trade in a closed one', () => {
    expect(resolveTradingCountry('IN').code).toBe(DEFAULT_COUNTRY);
    expect(resolveTradingCountry('ZZ').code).toBe(DEFAULT_COUNTRY);
    expect(resolveTradingCountry(undefined).code).toBe(DEFAULT_COUNTRY);
    expect(resolveTradingCountry(null).code).toBe(DEFAULT_COUNTRY);
  });

  it('offers only trading markets in the switcher', () => {
    const offered = getActiveCountries().map((c) => c.code);
    expect(offered.length).toBe(ACTIVE_COUNTRY_CODES.length);
    for (const code of offered) {
      expect(isActiveCountry(code)).toBe(true);
    }
  });

  it('accepts a lowercase code, since cookies and paths carry them', () => {
    expect(isActiveCountry(DEFAULT_COUNTRY.toLowerCase())).toBe(true);
    expect(resolveTradingCountry(DEFAULT_COUNTRY.toLowerCase()).code).toBe(DEFAULT_COUNTRY);
  });
});
