import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException, Logger } from '@nestjs/common';
import { assertInMarket } from '@app/common';
import {
  assertRecordInScope,
  marketScopeOf,
  refuseLockedAdmin,
  resolveMarket,
} from './market-scope';

const reqAs = (user: Record<string, unknown>) => ({
  user,
  method: 'GET',
  originalUrl: '/api/v1/admin/test',
  headers: { 'x-request-id': 'req-1' },
});

const qaAdmin = { id: 'u-qa', role: 'ADMIN', regionCode: 'QA', regionLocked: true };
const inAdmin = { id: 'u-in', role: 'ADMIN', regionCode: 'IN', regionLocked: true };
const globalAdmin = { id: 'u-g', role: 'ADMIN' };
const superAdmin = { id: 'u-s', role: 'SUPER_ADMIN', regionCode: 'QA', regionLocked: true };
const brokenLockAdmin = {
  id: 'u-b',
  role: 'ADMIN',
  regionCode: 'NOT-A-COUNTRY',
  regionLocked: true,
};

/** `'allowed'` or `'refused'` — so two implementations can be compared as data. */
function verdict(fn: () => void): string {
  try {
    fn();
    return 'allowed';
  } catch {
    return 'refused';
  }
}
const silent = { warn: () => undefined };

describe('marketScopeOf', () => {
  it('locks a region-locked ADMIN to their market', () => {
    expect(marketScopeOf(reqAs(qaAdmin))).toMatchObject({
      locked: true,
      region: 'QA',
      userId: 'u-qa',
    });
  });
  it('never locks SUPER_ADMIN, whatever the columns say', () => {
    expect(marketScopeOf(reqAs(superAdmin)).locked).toBe(false);
  });
  it('treats an unlocked ADMIN as global', () => {
    expect(marketScopeOf(reqAs(globalAdmin)).locked).toBe(false);
  });
  it('does not lock on a regionCode without the lock flag', () => {
    expect(marketScopeOf(reqAs({ role: 'ADMIN', regionCode: 'QA' })).locked).toBe(false);
  });
});

describe('resolveMarket', () => {
  it('returns the request unchanged for a global admin (undefined = every market)', () => {
    expect(resolveMarket(reqAs(globalAdmin), 'in')).toBe('IN');
    expect(resolveMarket(reqAs(globalAdmin), undefined)).toBeUndefined();
  });
  it('returns the locked market when nothing or the same market is requested', () => {
    expect(resolveMarket(reqAs(qaAdmin), undefined, 'those users')).toBe('QA');
    expect(resolveMarket(reqAs(qaAdmin), 'qa', 'those users')).toBe('QA');
  });
  it('refuses another market with the platform wording', () => {
    expect(() => resolveMarket(reqAs(qaAdmin), 'IN', 'those users')).toThrow(ForbiddenException);
    expect(() => resolveMarket(reqAs(qaAdmin), 'IN', 'those users')).toThrow(
      'Your account is restricted to the QA market; those users belongs to IN.',
    );
  });
});

describe('assertRecordInScope', () => {
  it('lets a global admin touch anything', () => {
    expect(() => assertRecordInScope(reqAs(globalAdmin), 'IN', 'that seller')).not.toThrow();
  });
  it('lets a locked admin touch their own market', () => {
    expect(() => assertRecordInScope(reqAs(qaAdmin), 'qa', 'that seller')).not.toThrow();
  });
  it('refuses another market and a global record', () => {
    expect(() => assertRecordInScope(reqAs(qaAdmin), 'IN', 'that seller')).toThrow(
      ForbiddenException,
    );
    expect(() => assertRecordInScope(reqAs(qaAdmin), null, 'that banner')).toThrow(
      'that banner belongs to every market',
    );
  });

  /**
   * The record side normalises, exactly as `assertInMarket` does in
   * `@app/common` — finding A-3 of the whole-branch review.
   *
   * This comparator was a raw `String(recordRegion).toUpperCase() === scope
   * .region`, while every backend comparison went through `normaliseMarket`.
   * `marketplace.sellers.region_code` is an unbounded, unvalidated, nullable
   * varchar written straight from `input.countryCode`, and the dev database
   * holds `IN-MH`, `IND`, `NOT-A-COUNTRY` and an XSS payload in it. So a seller
   * stored as `IN-MH` was refused for the IN admin who owns that market —
   * invisible to them, 403 on approve. That is the AUD2-079 symptom Task 5
   * fixed on the restaurant side, still live on the gateway side.
   *
   * Capability loss, not leakage: the LOCK side cannot hold garbage (the staff
   * DTOs validate `^[A-Za-z]{2}$` and `resolveMarket` refuses an unreadable
   * lock at source), so no junk value could ever EQUAL a scope.
   */
  it('resolves a sub-region on the record to its market, like assertInMarket', () => {
    // IN-MH is Maharashtra. The platform's unit of scope is the country, and
    // the IN admin owns it.
    expect(() => assertRecordInScope(reqAs(inAdmin), 'IN-MH', 'that seller')).not.toThrow();
    expect(() => assertRecordInScope(reqAs(inAdmin), 'in-mh', 'that seller')).not.toThrow();
    expect(() => assertRecordInScope(reqAs(inAdmin), 'IN_MH', 'that seller')).not.toThrow();
    // And a sub-region of ANOTHER market is still refused, resolved to that
    // market in the copy rather than echoed back as the sub-region.
    expect(() => assertRecordInScope(reqAs(inAdmin), 'QA-DOH', 'that seller')).toThrow(
      'Your account is restricted to the IN market; that seller belongs to QA.',
    );
  });

  it('treats an alpha-3 or junk market on the record as unattributed, like assertInMarket', () => {
    // `normaliseMarket` validates against `REGION_CONFIGS`, so `IND` and `KEN`
    // are NOT the countries they look like — that strictness is what stopped
    // `NOT-A-COUNTRY` becoming Norway. An unreadable row market therefore reads
    // as "no market yet" and is refused for a locked caller, which is the same
    // outcome `assertInMarket` gives and the same outcome as before this fix.
    // The change is that it is now refused for the RIGHT reason, and says so.
    for (const bad of ['IND', 'NOT-A-COUNTRY', '<SCRIPT>ALERT(1)</SCRIPT>']) {
      expect(() => assertRecordInScope(reqAs(inAdmin), bad, 'that seller')).toThrow(
        'that seller belongs to every market',
      );
    }
    // A global admin is unaffected by any of it.
    expect(() => assertRecordInScope(reqAs(globalAdmin), 'IND', 'that seller')).not.toThrow();
  });

  it('reaches the same VERDICT as assertInMarket for every market spelling', () => {
    // One rule, two implementations, and this is the assertion that keeps them
    // one rule: whatever the row holds, the gateway comparator and the backend
    // comparator either both refuse or both allow.
    //
    // Verdicts, not messages. The two halves have deliberately different copy —
    // the gateway speaks to a request ("Your account is restricted to the IN
    // market; …") and `@app/common` to a record ("This that row belongs to …")
    // — and each string is asserted verbatim by its own file's tests. What must
    // never differ is the answer.
    for (const value of ['IN', 'in', 'IN-MH', 'IND', 'QA', 'NOT-A-COUNTRY', null, undefined]) {
      const gateway = verdict(() => assertRecordInScope(reqAs(inAdmin), value, 'that row'));
      const backend = verdict(() => assertInMarket(value, 'IN', 'that row', silent));
      expect(`${String(value)}: ${gateway}`).toBe(`${String(value)}: ${backend}`);
    }
  });

  it('refuses a locked caller whose own market cannot be read, rather than comparing', () => {
    // The lock arrives here through `marketScopeOf`, which does not validate —
    // only `resolveMarket` does. A record comparison against an unreadable lock
    // would be `null === undefined`, which is `false`, so it happened to fail
    // closed; it now refuses with the platform's unattributable copy and says
    // in the log that the CLAIM was the problem, not the row.
    expect(() => assertRecordInScope(reqAs(brokenLockAdmin), 'IN', 'that seller')).toThrow(
      'This that seller cannot be attributed to a market yet.',
    );
  });
});

describe('refuseLockedAdmin', () => {
  it('lets a global admin and a SUPER_ADMIN through', () => {
    expect(() => refuseLockedAdmin(reqAs(globalAdmin), 'marketplace settings')).not.toThrow();
    expect(() => refuseLockedAdmin(reqAs(superAdmin), 'marketplace settings')).not.toThrow();
  });
  it('refuses a locked admin with the platform wording', () => {
    expect(() => refuseLockedAdmin(reqAs(qaAdmin), 'marketplace settings')).toThrow(
      ForbiddenException,
    );
    expect(() => refuseLockedAdmin(reqAs(qaAdmin), 'marketplace settings')).toThrow(
      'Your account is restricted to the QA market; marketplace settings belongs to every market.',
    );
  });
  it('keeps the copy a spec pins when one is passed', () => {
    expect(() =>
      refuseLockedAdmin(
        reqAs(qaAdmin),
        'catalogue taxonomy',
        'Catalogue taxonomy is managed globally.',
      ),
    ).toThrow('Catalogue taxonomy is managed globally.');
  });
  it('logs the denial with the [region-scope-denied] prefix', () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    try {
      expect(() => refuseLockedAdmin(reqAs(qaAdmin), 'SEO settings')).toThrow(ForbiddenException);
      expect(String(warn.mock.calls[0][0])).toContain('[region-scope-denied]');
      expect(String(warn.mock.calls[0][0])).toContain('target=every market');
    } finally {
      warn.mockRestore();
    }
  });
});

/**
 * A lock this platform cannot read is refused at the source.
 *
 * `users.region_code` is admin-editable, so a staff account can carry a market
 * the registry has never heard of. Downstream that value is only safe while it
 * stays in the `scope` slot — and controllers routinely collapse the two slots
 * into one payload field (`region: d?.scope ?? d?.regionCode`), where an
 * unreadable value is deliberately IGNORED. Ignored means no predicate: every
 * market's rows, to an admin restricted to one.
 *
 * That is strictly worse than the bug the strict `normaliseMarket` fixed. Before
 * it, a malformed claim normalised to a plausible market and the list filtered
 * to the wrong ONE market; afterwards it would have returned ALL of them. So
 * the refusal has to happen before any controller can put the value anywhere.
 */
describe('an unreadable lock cannot address any market', () => {
  const brokenLock = { id: 'u-x', role: 'ADMIN', regionCode: 'NOT-A-COUNTRY', regionLocked: true };
  const alphaThree = { id: 'u-3', role: 'ADMIN', regionCode: 'QAT', regionLocked: true };
  const unknownIso = { id: 'u-z', role: 'ADMIN', regionCode: 'ZZ', regionLocked: true };

  it('refuses resolveMarket for a claim that is not a known market', () => {
    for (const user of [brokenLock, alphaThree, unknownIso]) {
      expect(() => resolveMarket(reqAs(user), undefined, 'those stores')).toThrow(
        ForbiddenException,
      );
    }
  });

  it('uses the fixed unattributable copy, and logs the claim that caused it', () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    try {
      expect(() => resolveMarket(reqAs(brokenLock), undefined, 'those stores')).toThrow(
        'This those stores cannot be attributed to a market yet.',
      );
      const line = warn.mock.calls.map((c) => String(c[0])).join('\n');
      expect(line).toContain('[region-scope-denied]');
      expect(line).toContain('NOT-A-COUNTRY');
      expect(line).toContain('rather than');
    } finally {
      warn.mockRestore();
    }
  });

  it('refuses whatever the request names, so a filter cannot rescue it', () => {
    // The collapse `d?.scope ?? d?.regionCode` would otherwise put the broken
    // lock into the filter slot and lose the predicate entirely.
    expect(() => resolveMarket(reqAs(brokenLock), 'QA', 'those stores')).toThrow(
      ForbiddenException,
    );
    expect(() => resolveMarket(reqAs(brokenLock), 'NOT-A-COUNTRY', 'those stores')).toThrow(
      ForbiddenException,
    );
  });

  it('still serves a locked admin whose market IS known', () => {
    expect(resolveMarket(reqAs(qaAdmin), undefined, 'those stores')).toBe('QA');
    expect(resolveMarket(reqAs({ ...qaAdmin, regionCode: 'qa' }), undefined, 'x')).toBe('QA');
    // A stored sub-region normalises to its country and is not a broken lock.
    expect(resolveMarket(reqAs({ ...qaAdmin, regionCode: 'QA-DOH' }), undefined, 'x')).toBe(
      'QA-DOH',
    );
  });

  it('leaves a global admin alone — there is no lock to be unreadable', () => {
    expect(resolveMarket(reqAs(globalAdmin), 'NOT-A-COUNTRY', 'x')).toBe('NOT-A-COUNTRY');
    expect(resolveMarket(reqAs(globalAdmin), undefined, 'x')).toBeUndefined();
    // SUPER_ADMIN is never locked, so a junk claim on one is inert.
    expect(
      resolveMarket(reqAs({ ...superAdmin, regionCode: 'ZZ' }), undefined, 'x'),
    ).toBeUndefined();
  });
});
