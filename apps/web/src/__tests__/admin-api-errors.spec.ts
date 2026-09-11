/**
 * A rejected admin request produces one readable sentence, and never a crash.
 *
 * The gateway's `ValidationPipe` puts an **array** in `message` —
 * `["property ip should not exist", "property reason should not exist"]` — while
 * every consumer of `AdminApiResponse.error` treats it as a string. React
 * renders an array by concatenating it, so the known
 * `POST /admin/security/bans` 400 read
 * `property ip should not existproperty durationSeconds should not exist`; and
 * `classifyApiFailure`, which does `.toLowerCase()`, would have thrown outright
 * on one, turning a 400 into a blank page instead of a named failure.
 */
import { apiErrorMessage } from '@/lib/api/admin-core';
import { classifyApiFailure } from '../components/admin/api-states';

describe('apiErrorMessage', () => {
  it('joins a class-validator array into one legible line', () => {
    expect(
      apiErrorMessage(
        ['property ip should not exist', 'property reason should not exist'],
        'Request failed (400)',
      ),
    ).toBe('property ip should not exist; property reason should not exist');
  });

  it('passes a plain string through untouched — the server owns its wording', () => {
    expect(apiErrorMessage('Missing required permissions: security.manage', 'x')).toBe(
      'Missing required permissions: security.manage',
    );
  });

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['an empty string', ''],
    ['an empty array', []],
    ['an array of blanks', ['', null]],
    // `[object Object]` in front of an administrator is worse than a fallback
    // that at least names the status.
    ['an object', { error: 'nope' }],
    ['a number', 500],
  ])('falls back to the caller’s sentence for %s', (_label, message) => {
    expect(apiErrorMessage(message, 'Request failed (500)')).toBe('Request failed (500)');
  });
});

describe('classifyApiFailure never throws on a non-string message', () => {
  it('reads an array as one message and still spots a refusal', () => {
    expect(classifyApiFailure(['Missing required permissions: security.manage'])).toBe('forbidden');
    expect(classifyApiFailure(['property ip should not exist'])).toBe('unreachable');
  });

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['an object', { message: 'forbidden' }],
    ['a number', 403],
  ])('treats %s as unreachable rather than crashing', (_label, message) => {
    expect(() => classifyApiFailure(message)).not.toThrow();
    expect(classifyApiFailure(message)).toBe('unreachable');
  });

  it('still classifies the strings it always did', () => {
    expect(classifyApiFailure('Missing required permissions: audit.logs')).toBe('forbidden');
    expect(classifyApiFailure('Your account is restricted to the QA market')).toBe('forbidden');
    expect(classifyApiFailure('Network error — API Gateway unreachable')).toBe('unreachable');
  });
});
