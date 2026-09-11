import { describe, it, expect } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { assertRecordInScope, marketScopeOf, resolveMarket } from './market-scope';

const reqAs = (user: Record<string, unknown>) => ({
  user,
  method: 'GET',
  originalUrl: '/api/v1/admin/test',
  headers: { 'x-request-id': 'req-1' },
});

const qaAdmin = { id: 'u-qa', role: 'ADMIN', regionCode: 'QA', regionLocked: true };
const globalAdmin = { id: 'u-g', role: 'ADMIN' };
const superAdmin = { id: 'u-s', role: 'SUPER_ADMIN', regionCode: 'QA', regionLocked: true };

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
});
