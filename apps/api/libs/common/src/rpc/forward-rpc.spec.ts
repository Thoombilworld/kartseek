import { describe, it, expect } from 'vitest';
import { HttpStatus } from '@nestjs/common';
import { toHttpException } from './forward-rpc';

/**
 * The gateway side of the same journey.
 *
 * A service's `RpcAwareExceptionsFilter` rejects with a flat
 * `{ statusCode, message, errorCode }`, and this is what the gateway turns that
 * into. The pair matters for `RedisUnavailableError`: the service now says 503,
 * and 503 has to survive the crossing — a caller that receives 500 is told the
 * platform crashed rather than that a dependency is briefly unavailable, and
 * nothing downstream will retry.
 */
describe('toHttpException', () => {
  it('carries a store-unavailable 503 across the TCP boundary as 503', () => {
    const rejection = {
      statusCode: 503,
      errorCode: 'REDIS_UNAVAILABLE',
      message: 'Redis is unavailable and this environment has no in-memory fallback (not-ready).',
    };

    const http = toHttpException(rejection, 'Cart service unavailable');

    expect(http.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
    // The service's own wording stays out of the client's response — 5xx text
    // describes internals. The label is what the caller sees.
    expect(http.message).toBe('Cart service unavailable');
  });

  it('does not flatten a service 500 into the same answer', () => {
    // 500 and 503 must stay distinguishable, or monitoring cannot tell a broken
    // service from an unavailable dependency.
    expect(toHttpException({ statusCode: 500, message: 'boom' }, 'Cart service').getStatus()).toBe(
      500,
    );
  });

  it('answers 503 when the service could not be reached at all', () => {
    // No statusCode on the rejection: nothing answered. Same code as an
    // unavailable dependency, which is correct — both mean "not now, retry".
    expect(toHttpException(new Error('connect ECONNREFUSED'), 'Cart service').getStatus()).toBe(
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  });

  it('keeps a domain 4xx and its message, which belong to the caller', () => {
    const http = toHttpException({ statusCode: 404, message: 'Cart is empty' }, 'Cart service');
    expect(http.getStatus()).toBe(404);
    expect(http.message).toBe('Cart is empty');
  });
});
