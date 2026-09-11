import { describe, it, expect } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import {
  assertInMarket,
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
});

describe('assertInMarket', () => {
  it('does nothing without a scope (global admin)', () => {
    expect(() => assertInMarket('IN', undefined, 'seller')).not.toThrow();
  });
  it('accepts a record in the scoped market, case-insensitively', () => {
    expect(() => assertInMarket('qa', 'QA', 'seller')).not.toThrow();
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
