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
