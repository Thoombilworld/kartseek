import {
  ACTIVE_COUNTRY_CODES,
  DEFAULT_COUNTRY,
  formatActiveCountryList,
  getActiveCountries,
  getCurrencySymbolFor,
  getLocationSearchPlaceholder,
  hasPostalCode,
} from '@/lib/localization';
import { TRUST_BADGES } from '@/lib/marketplace/home-content';
import { GROCERY_FAQ } from '@/lib/demo-data/grocery-home';
import { forRegion } from '@/lib/marketplace/pricing';

/**
 * Copy that names a market, a currency or a payment rail.
 *
 * Every one of these was hardcoded to India on a storefront trading in Qatar,
 * and each failed silently: a rupee glyph renders, a PIN-code placeholder
 * renders, a nine-country list renders. Nothing throws, so only assertions
 * catch a regression here.
 */
describe('market-specific copy', () => {
  describe('country lists in body copy', () => {
    it('names exactly the trading markets', () => {
      const prose = formatActiveCountryList();
      for (const c of getActiveCountries()) {
        expect(prose).toContain(c.name);
      }
    });

    it('does not advertise markets the platform has closed', () => {
      const prose = formatActiveCountryList();
      const closed = ['India', 'United Kingdom', 'United States'].filter(
        (name) => !getActiveCountries().some((c) => c.name === name),
      );
      for (const name of closed) {
        expect(prose).not.toContain(name);
      }
    });

    it('never repeats a country, which is how the pharmacy copy read', () => {
      // The original said "India, India, Qatar, UAE, …".
      const names = formatActiveCountryList()
        .split(/,\s*|\s+and\s+/)
        .filter(Boolean);
      expect(new Set(names).size).toBe(names.length);
    });

    it('uses endonyms when the surrounding copy is not English', () => {
      const native = formatActiveCountryList('و', true);
      for (const c of getActiveCountries()) {
        expect(native).toContain(c.nativeName);
      }
    });
  });

  describe('location search placeholder', () => {
    it('does not ask for a postal code where the country issues none', () => {
      expect(hasPostalCode(DEFAULT_COUNTRY)).toBe(false);
      const placeholder = getLocationSearchPlaceholder(DEFAULT_COUNTRY);
      expect(placeholder.toLowerCase()).not.toContain('pin code');
      expect(placeholder.toLowerCase()).not.toContain('postal');
      expect(placeholder.toLowerCase()).not.toContain('zip');
    });

    it('names the postal field where one exists', () => {
      // India is the case that motivated the original hardcoded string.
      expect(getLocationSearchPlaceholder('IN').toLowerCase()).toContain('pin code');
    });
  });

  describe('trust badges', () => {
    it('offers no India-only payment or tax claim in the home market', () => {
      const shown = forRegion(TRUST_BADGES, DEFAULT_COUNTRY);
      expect(shown.length).toBeGreaterThan(0);
      const text = shown.map((b) => `${b.title} ${b.subtitle}`).join(' ');
      for (const term of ['UPI', 'GPay', 'PhonePe', 'Paytm', 'GST', 'India']) {
        expect(text).not.toContain(term);
      }
    });

    it('keeps one free-delivery threshold per market, not one shared number', () => {
      for (const code of ACTIVE_COUNTRY_CODES) {
        const thresholds = forRegion(TRUST_BADGES, code).filter((b) => b.thresholdAmount);
        // A second one would mean two different free-delivery promises at once.
        expect(thresholds.length).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('grocery FAQ', () => {
    it('answers the payment question exactly once per market', () => {
      for (const code of ACTIVE_COUNTRY_CODES) {
        const answers = forRegion(GROCERY_FAQ, code).filter(
          (f) => f.q === 'What payment methods are accepted?',
        );
        expect(answers).toHaveLength(1);
      }
    });

    it('does not quote Indian payment rails to the home market', () => {
      const text = forRegion(GROCERY_FAQ, DEFAULT_COUNTRY)
        .map((f) => f.a)
        .join(' ');
      for (const term of ['UPI', 'PhonePe', 'Paytm', 'net banking', '₹']) {
        expect(text).not.toContain(term);
      }
    });
  });

  describe('currency symbols', () => {
    it('resolves the home market to its own symbol, not the rupee', () => {
      expect(getCurrencySymbolFor(DEFAULT_COUNTRY)).not.toContain('₹');
      expect(getCurrencySymbolFor(DEFAULT_COUNTRY)).toBeTruthy();
    });
  });
});
