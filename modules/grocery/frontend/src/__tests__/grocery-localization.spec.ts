import {
  GROCERY_COUNTRIES,
  formatLocalPrice,
  getGroceryLocaleTag,
  t,
  type GroceryCountryCode,
} from '@/i18n/grocery-locale';
import { DEFAULT_COUNTRY, hasPostalCode, getPaymentMethods } from '@/lib/localization';
import { getBannersForCountry } from '@/lib/demo-data/grocery-country-data';

const ARABIC = /[؀-ۿ]/;
const CODES = Object.keys(GROCERY_COUNTRIES) as GroceryCountryCode[];

/**
 * Grocery's market and language behaviour.
 *
 * The module kept its own country and language state alongside the platform's,
 * and the two disagreed. None of the failures below throw: a rupee glyph
 * renders, an Arabic headline renders to an English reader, a required field
 * simply refuses to submit. Only assertions catch a regression here.
 */
describe('grocery localization', () => {
  describe('banner copy carries both languages', () => {
    it('writes base banner fields in English, not Arabic', () => {
      // Eight banners across Qatar, the UAE, Saudi and Kuwait were written in
      // Arabic in the base fields, so the carousel showed them to English
      // readers. Arabic belongs in the paired `...Ar` field.
      for (const code of CODES) {
        for (const banner of getBannersForCountry(code)) {
          for (const field of ['tag', 'headline', 'subheadline', 'cta'] as const) {
            const value = banner[field];
            if (typeof value === 'string') {
              expect(ARABIC.test(value)).toBe(false);
            }
          }
        }
      }
    });

    it('keeps Arabic in the paired fields where a market has it', () => {
      for (const code of CODES) {
        for (const banner of getBannersForCountry(code)) {
          const ar = banner.headlineAr;
          if (ar) expect(ARABIC.test(ar)).toBe(true);
        }
      }
    });
  });

  describe('translation fallback', () => {
    it('returns the English key when no Arabic exists', () => {
      expect(t('__no_such_key__', true)).toBe('__no_such_key__');
      expect(t('Deliver to', false)).toBe('Deliver to');
    });
  });

  describe('money', () => {
    it('never formats the home market in rupees', () => {
      const home = DEFAULT_COUNTRY as GroceryCountryCode;
      const out = formatLocalPrice(1234, home);
      expect(out).not.toContain('₹');
      expect(out).toContain(GROCERY_COUNTRIES[home].currency.symbol);
    });

    it('groups digits with the market own locale', () => {
      // India groups 2-2-3. The zero-decimal branch used to pass 'en-IN'
      // unconditionally, correct only because India is currently the only
      // market with zero decimals.
      expect(getGroceryLocaleTag('IN')).toBe('en-IN');
      expect(getGroceryLocaleTag('QA')).not.toBe('en-IN');
    });
  });

  describe('addresses', () => {
    it('does not demand a postal code where the country issues none', () => {
      // Qatar issues none. The grocery address form required one regardless,
      // which blocked address creation and therefore checkout.
      expect(hasPostalCode(DEFAULT_COUNTRY)).toBe(false);
    });
  });

  describe('payment', () => {
    it('offers no Indian rail in the home market', () => {
      const joined = getPaymentMethods({ country: DEFAULT_COUNTRY })
        .map((m) => m.label)
        .join(' ');
      for (const rail of ['UPI', 'PhonePe', 'Paytm', 'Net Banking']) {
        expect(joined).not.toContain(rail);
      }
      expect(joined.length).toBeGreaterThan(0);
    });

    it('marks at most one default method per market', () => {
      for (const code of CODES) {
        const defaults = getPaymentMethods({ country: code }).filter((m) => m.isDefault);
        // Two defaults would make the pre-selected option depend on array order.
        expect(defaults.length).toBeLessThanOrEqual(1);
      }
    });
  });
});
