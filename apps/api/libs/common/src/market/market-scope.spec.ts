import { describe, it, expect } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  applyMarketFilter,
  assertInMarket,
  assertRecordMarket,
  isGlobalMarket,
  marketPredicate,
  normaliseMarket,
  refuseUnattributable,
} from './market-scope';

describe('normaliseMarket', () => {
  it('upper-cases and trims an ISO code', () => {
    expect(normaliseMarket(' qa ')).toBe('QA');
  });
  it('returns undefined for empty or non-string input', () => {
    expect(normaliseMarket('')).toBeUndefined();
    expect(normaliseMarket(undefined)).toBeUndefined();
    expect(normaliseMarket(42)).toBeUndefined();
  });
  it('normalises a sub-region code to its country', () => {
    expect(normaliseMarket('QA-DOH')).toBe('QA');
    expect(normaliseMarket('in_mh')).toBe('IN');
    expect(normaliseMarket('Q')).toBeUndefined();
  });
});

describe('assertInMarket', () => {
  it('does nothing without a scope (global admin)', () => {
    expect(() => assertInMarket('IN', undefined, 'seller')).not.toThrow();
  });
  it('accepts a record in the scoped market, case-insensitively', () => {
    expect(() => assertInMarket('qa', 'QA', 'seller')).not.toThrow();
  });
  it("accepts a record stored as a sub-region of the caller's country", () => {
    // Restaurant stores 'IN-MH' and 'QA-DOH'; the scope is always ISO-2. Both
    // sides go through normaliseMarket, so one rule covers both spellings.
    expect(() => assertInMarket('QA-DOH', 'QA', 'restaurant')).not.toThrow();
    expect(() => assertInMarket('IN-MH', 'QA', 'restaurant')).toThrow(
      'This restaurant belongs to IN, not to the QA market.',
    );
  });
  it('refuses a record from another market with the platform wording and a log line', () => {
    const lines: string[] = [];
    expect(() => assertInMarket('IN', 'QA', 'seller', { warn: (m) => lines.push(m) })).toThrow(
      ForbiddenException,
    );
    expect(() => assertInMarket('IN', 'QA', 'seller')).toThrow(
      'This seller belongs to IN, not to the QA market.',
    );
    expect(lines[0]).toContain('[region-scope-denied]');
  });
  it("refuses a record with no market — it is nobody's to touch regionally", () => {
    expect(() => assertInMarket(null, 'QA', 'banner')).toThrow(
      'This banner belongs to every market, not to the QA market.',
    );
  });
});

describe('marketPredicate', () => {
  it('is the scope when locked, whatever was requested', () => {
    expect(marketPredicate('QA', 'IN')).toBe('QA');
  });
  it('is the normalised request when global', () => {
    expect(marketPredicate(undefined, 'in')).toBe('IN');
    expect(marketPredicate(undefined, undefined)).toBeUndefined();
  });
});

describe('refuseUnattributable', () => {
  it('lets a global admin (no scope) through', () => {
    expect(() => refuseUnattributable(undefined, 'report')).not.toThrow();
    expect(() => refuseUnattributable('', 'report')).not.toThrow();
  });
  it('refuses a scoped admin and logs the denial with the shared prefix', () => {
    const lines: string[] = [];
    expect(() => refuseUnattributable('qa', 'report', { warn: (m) => lines.push(m) })).toThrow(
      ForbiddenException,
    );
    expect(lines[0]).toContain('[region-scope-denied]');
    expect(lines[0]).toContain('QA-scoped admin');
  });
  it("uses the default copy, and the caller's copy when a spec pins one", () => {
    expect(() => refuseUnattributable('QA', 'campaign')).toThrow(
      'This campaign cannot be attributed to a market yet.',
    );
    expect(() =>
      refuseUnattributable(
        'QA',
        'surge zone',
        undefined,
        'Surge zones cannot be attributed to a market yet.',
      ),
    ).toThrow('Surge zones cannot be attributed to a market yet.');
  });
});

/**
 * One predicate, one spelling. These tests exist because the hand-written
 * copies differed: one used `qb.where`, which REPLACES the clause, so applying
 * a status filter dropped the market boundary entirely (audit V3).
 */
describe('applyMarketFilter', () => {
  const builder = () => {
    const calls: Array<{ expression: string; params?: object }> = [];
    const qb = {
      calls,
      andWhere(expression: string, params?: object) {
        calls.push({ expression, params });
        return qb;
      },
      where() {
        throw new Error('where() replaces the clause — applyMarketFilter must never call it');
      },
    };
    return qb;
  };

  it('adds the scope as an andWhere, in the expression the caller named', () => {
    const qb = builder();
    applyMarketFilter(qb, 'p.region_code', 'qa');
    expect(qb.calls).toEqual([
      { expression: 'p.region_code = :__market', params: { __market: 'QA' } },
    ]);
  });

  it('uses the requested market only when there is no lock', () => {
    const locked = builder();
    applyMarketFilter(locked, 's.regionCode', 'QA', 'IN');
    expect(locked.calls[0].params).toEqual({ __market: 'QA' });

    const global = builder();
    applyMarketFilter(global, 's.regionCode', undefined, 'in');
    expect(global.calls[0].params).toEqual({ __market: 'IN' });
  });

  it('adds nothing at all for a global caller with no filter, and chains', () => {
    const qb = builder();
    expect(applyMarketFilter(qb, 's.regionCode', undefined, undefined)).toBe(qb);
    expect(qb.calls).toEqual([]);
  });

  it('normalises a sub-region lock to its country', () => {
    const qb = builder();
    applyMarketFilter(qb, 'r.regionCode', 'QA-DOH');
    expect(qb.calls[0].params).toEqual({ __market: 'QA' });
  });
});

describe('assertRecordMarket', () => {
  it('reports a missing id as 404, not as a market denial', () => {
    expect(() => assertRecordMarket(null, 'regionCode' as never, 'QA', 'payout')).toThrow(
      NotFoundException,
    );
    expect(() => assertRecordMarket(undefined, 'regionCode' as never, 'QA', 'payout')).toThrow(
      'No payout with that id',
    );
  });

  it('accepts a row in the caller’s market and refuses one outside it', () => {
    expect(() =>
      assertRecordMarket({ regionCode: 'QA' }, 'regionCode', 'QA', 'payout'),
    ).not.toThrow();
    expect(() => assertRecordMarket({ regionCode: 'IN' }, 'regionCode', 'QA', 'payout')).toThrow(
      'This payout belongs to IN, not to the QA market.',
    );
  });

  it('reads the column the caller named, so a differently-named market works', () => {
    expect(() =>
      assertRecordMarket({ countryCode: 'QA' }, 'countryCode', 'QA', 'settlement'),
    ).not.toThrow();
    expect(() =>
      assertRecordMarket({ countryCode: 'IN' }, 'countryCode', 'QA', 'settlement'),
    ).toThrow('This settlement belongs to IN, not to the QA market.');
  });

  it('lets a global caller through, missing id apart', () => {
    expect(() =>
      assertRecordMarket({ regionCode: null }, 'regionCode', undefined, 'payout'),
    ).not.toThrow();
  });

  it('refuses an explicitly global row, and says so in the log rather than the copy', () => {
    const lines: string[] = [];
    expect(() =>
      assertRecordMarket({ regionCode: null, isGlobal: true }, 'regionCode', 'QA', 'offer', {
        warn: (m) => lines.push(m),
      }),
    ).toThrow('This offer belongs to every market, not to the QA market.');
    expect(lines[0]).toContain('explicitly global');
  });

  it('calls an unattributed row unattributed, so a missing backfill is visible', () => {
    const lines: string[] = [];
    expect(() =>
      assertRecordMarket({ regionCode: null }, 'regionCode', 'QA', 'offer', {
        warn: (m) => lines.push(m),
      }),
    ).toThrow(ForbiddenException);
    expect(lines[0]).toContain('no market yet');
  });
});

describe('isGlobalMarket', () => {
  it('is true only for the explicit flag', () => {
    expect(isGlobalMarket({ isGlobal: true })).toBe(true);
    expect(isGlobalMarket({ isGlobal: true, regionCode: null })).toBe(true);
  });
  it('is false for an unattributed row, which is not the same thing', () => {
    expect(isGlobalMarket({ regionCode: null })).toBe(false);
    expect(isGlobalMarket({ regionCode: null, isGlobal: false })).toBe(false);
    expect(isGlobalMarket({ regionCode: null, isGlobal: null })).toBe(false);
    expect(isGlobalMarket({ regionCode: 'QA' })).toBe(false);
  });
});

/**
 * An unknown code is not a market, and must never be treated as one.
 *
 * `normaliseMarket` split on `-`/`_` and returned the first segment, so
 * `'NOT-A-COUNTRY'` became `'NO'` — Norway — and `'KEN'` became `'KE'`, Kenya.
 * `marketplace.sellers.region_code` holds both shapes in dev. Two different
 * failures came out of that:
 *
 *   • a garbage record market normalised to a *valid-looking* country, so a row
 *     could be filtered into, or asserted against, a market nobody chose;
 *   • worse, once the helper is strict, an unreadable value returns `undefined`
 *     — and `undefined` is how this module spells "global admin, no filter". A
 *     lock that cannot be read must therefore REFUSE, not widen.
 *
 * The registry is `@app/region`'s `REGION_CONFIGS`, which is the same list the
 * storefront and the gateway read. One registry, not a second copy here.
 */
describe('normaliseMarket rejects anything that is not a known country', () => {
  it('accepts a known code in any case', () => {
    expect(normaliseMarket('qa')).toBe('QA');
    expect(normaliseMarket(' IN ')).toBe('IN');
    expect(normaliseMarket('ae')).toBe('AE');
  });

  it('accepts a sub-region of a known country', () => {
    expect(normaliseMarket('QA-DOH')).toBe('QA');
    expect(normaliseMarket('in_mh')).toBe('IN');
  });

  it('refuses a string that merely starts with two letters', () => {
    // The whole point: 'NO' is Norway, and nobody meant Norway.
    expect(normaliseMarket('NOT-A-COUNTRY')).toBeUndefined();
    expect(normaliseMarket('NOPE')).toBeUndefined();
  });

  it('refuses an alpha-3 code, which the registry does not map', () => {
    expect(normaliseMarket('QAT')).toBeUndefined();
    expect(normaliseMarket('KEN')).toBeUndefined();
    expect(normaliseMarket('UAE')).toBeUndefined();
  });

  it('refuses an ISO-2 code the platform has no region for', () => {
    expect(normaliseMarket('ZZ')).toBeUndefined();
    expect(normaliseMarket('XX')).toBeUndefined();
  });

  it('refuses empty, null, non-string and injected input', () => {
    expect(normaliseMarket('')).toBeUndefined();
    expect(normaliseMarket('  ')).toBeUndefined();
    expect(normaliseMarket(null)).toBeUndefined();
    expect(normaliseMarket(undefined)).toBeUndefined();
    expect(normaliseMarket(42)).toBeUndefined();
    expect(normaliseMarket('Q')).toBeUndefined();
    expect(normaliseMarket('<SCRIPT>ALERT(1)</SCRIPT>')).toBeUndefined();
  });
});

describe('an unreadable lock fails closed rather than becoming every market', () => {
  it('refuses a list predicate built from an unrecognised scope', () => {
    // Without this, `marketPredicate('NOT-A-COUNTRY')` is `undefined`, which
    // `applyMarketFilter` reads as "global admin: add no predicate" — every
    // market's rows, from a lock that was meant to narrow.
    expect(() => marketPredicate('NOT-A-COUNTRY')).toThrow(ForbiddenException);
    expect(() => marketPredicate('ZZ')).toThrow(
      'This market scope cannot be attributed to a market yet.',
    );
  });

  it('adds no predicate for a genuinely absent scope', () => {
    expect(marketPredicate(undefined)).toBeUndefined();
    expect(marketPredicate('')).toBeUndefined();
    expect(marketPredicate('   ')).toBeUndefined();
  });

  it('refuses inside applyMarketFilter too, before any SQL is built', () => {
    const calls: string[] = [];
    const qb = {
      andWhere(e: string) {
        calls.push(e);
        return qb;
      },
    };
    expect(() => applyMarketFilter(qb, 'p.regionCode', 'NOT-A-COUNTRY')).toThrow(
      ForbiddenException,
    );
    expect(calls).toEqual([]);
  });

  it('refuses a record assert made under an unrecognised scope', () => {
    expect(() => assertInMarket('QA', 'NOT-A-COUNTRY', 'payout')).toThrow(ForbiddenException);
    expect(() => assertRecordMarket({ regionCode: 'QA' }, 'regionCode', 'ZZ', 'payout')).toThrow(
      ForbiddenException,
    );
  });

  it('refuses refuseUnattributable under an unrecognised scope', () => {
    expect(() => refuseUnattributable('NOT-A-COUNTRY', 'report')).toThrow(ForbiddenException);
  });

  it('treats an unrecognised RECORD market as unattributed, not as a country', () => {
    // The record side stays a refusal rather than a throw-before-compare: a row
    // whose market is garbage belongs to no market, so it is refused for a
    // locked reader and left alone for a global one.
    expect(() => assertInMarket('NOT-A-COUNTRY', 'QA', 'seller')).toThrow(
      'This seller belongs to every market, not to the QA market.',
    );
    expect(() => assertInMarket('NOT-A-COUNTRY', undefined, 'seller')).not.toThrow();
  });

  it('logs the code it refused, so a bad token claim is diagnosable', () => {
    const lines: string[] = [];
    expect(() =>
      assertInMarket('QA', 'NOT-A-COUNTRY', 'payout', { warn: (m) => lines.push(m) }),
    ).toThrow(ForbiddenException);
    expect(lines[0]).toContain('[region-scope-denied]');
    expect(lines[0]).toContain('NOT-A-COUNTRY');
  });
});
