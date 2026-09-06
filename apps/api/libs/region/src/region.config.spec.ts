import {
  getActiveRegionCodes,
  DEFAULT_REGION,
  REGION_CONFIGS,
  SUPPORTED_COUNTRIES,
  getActiveRegions,
  getRegionConfig,
  isActiveRegion,
  isSupportedRegion,
} from './region.config';

/**
 * Which markets the server trades in, and which it merely describes.
 *
 * These are two different questions and the registry conflated them:
 * `isActive` was `true` on all ten entries, so `getActiveRegions()` reported
 * the whole registry as live and any code the registry knew about was accepted
 * as a trading market — a client could scope itself into a closed one just by
 * sending its `X-Region-Code` header.
 *
 * The distinction is easy to undo by accident because the obvious-looking
 * `isSupportedRegion` is the permissive one, and because nothing here throws:
 * a request scoped to the wrong market returns plausible-looking data.
 */
describe('region registry', () => {
  describe('trading markets', () => {
    it('always includes the home market', () => {
      expect(getActiveRegionCodes()).toContain(DEFAULT_REGION);
      expect(isActiveRegion(DEFAULT_REGION)).toBe(true);
    });

    it('does not treat every known country as a trading market', () => {
      const known = SUPPORTED_COUNTRIES.filter((c) => !getActiveRegionCodes().includes(c));
      // Whichever are not configured must be refused for new business.
      for (const code of known) {
        expect(isActiveRegion(code)).toBe(false);
      }
    });

    it('still describes closed markets, so stored records stay readable', () => {
      // An order or invoice from a closed market must keep resolving its own
      // currency and tax rules after the market stops taking new business.
      for (const code of SUPPORTED_COUNTRIES) {
        expect(isSupportedRegion(code)).toBe(true);
        expect(getRegionConfig(code)).toBeDefined();
      }
    });

    it('rejects empty and unknown codes rather than defaulting them in', () => {
      expect(isActiveRegion(undefined)).toBe(false);
      expect(isActiveRegion(null)).toBe(false);
      expect(isActiveRegion('')).toBe(false);
      expect(isActiveRegion('ZZ')).toBe(false);
    });

    it('reads ACTIVE_REGIONS when asked, not when the module was imported', () => {
      const previous = process.env.ACTIVE_REGIONS;
      try {
        process.env.ACTIVE_REGIONS = 'QA,IN';
        expect(isActiveRegion('IN')).toBe(true);
        expect(getActiveRegionCodes()).toEqual(['QA', 'IN']);
        process.env.ACTIVE_REGIONS = 'QA';
        expect(isActiveRegion('IN')).toBe(false);
      } finally {
        if (previous === undefined) delete process.env.ACTIVE_REGIONS;
        else process.env.ACTIVE_REGIONS = previous;
      }
    });

    it('accepts a lowercase code, since headers and cookies carry them', () => {
      expect(isActiveRegion(DEFAULT_REGION.toLowerCase())).toBe(true);
    });

    it('lists only trading markets', () => {
      const active = getActiveRegions().map((r) => r.code);
      expect(active.length).toBe(getActiveRegionCodes().length);
      for (const code of active) {
        expect(isActiveRegion(code)).toBe(true);
      }
    });
  });

  describe('tax rules', () => {
    it('gives every region a tax rule, so nothing has to assume one', () => {
      // The invoice builder hardcoded India's 18% GST because there was no
      // server-side table to read. Every entry carries its own now.
      for (const code of SUPPORTED_COUNTRIES) {
        const region = REGION_CONFIGS[code];
        expect(region.tax).toBeDefined();
        expect(typeof region.tax.rate).toBe('number');
        expect(region.tax.name).toBeTruthy();
      }
    });

    it('records Qatar as levying no consumption tax', () => {
      // A zero rate is a real answer, not a missing one — the invoice must omit
      // the tax row rather than print a heading with 0 beside it.
      expect(REGION_CONFIGS.QA.tax.rate).toBe(0);
    });

    it("keeps India's GST intact for orders already placed there", () => {
      expect(REGION_CONFIGS.IN.tax.rate).toBe(18);
      expect(REGION_CONFIGS.IN.tax.name).toBe('GST');
    });
  });

  describe('currency', () => {
    it('gives the home market a currency that is not the rupee', () => {
      const home = getRegionConfig(DEFAULT_REGION);
      expect(home?.currencyCode).toBeTruthy();
      expect(home?.currencyCode).not.toBe('INR');
    });

    it('never returns a country code where a currency is expected', () => {
      // The invoice endpoint fell back to `order.regionCode`, producing
      // "QA 249.00". Currency codes and country codes are both two-or-three
      // letter strings, so nothing catches that but an assertion.
      for (const code of SUPPORTED_COUNTRIES) {
        expect(REGION_CONFIGS[code].currencyCode).not.toBe(code);
      }
    });
  });
});
