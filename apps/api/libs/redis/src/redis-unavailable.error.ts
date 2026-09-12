/**
 * Redis could not serve this operation, and there is no emulator to stand in.
 *
 * Thrown only when `NODE_ENV === 'production'`. Outside production an
 * unreachable Redis is absorbed by the in-memory emulator, which is a
 * development convenience; in production that emulator would hand each pod its
 * own private, non-shared, non-persistent copy of every session, cart, refresh
 * slot, rate-limit bucket and OTP — a silent divergence that looks like the
 * platform working. Failing the request is the honest answer, and the shared
 * `AllExceptionsFilter` maps this to 503 so a caller and a load balancer both
 * see an unavailable dependency rather than a wrong answer.
 *
 * Matched by `name` in the filter so `@app/common` needs no import from
 * `@app/redis`, the same way `EntityNotFoundError` is matched without importing
 * typeorm.
 */
export class RedisUnavailableError extends Error {
  /** Why the store could not serve: no client, a client that never reached `ready`, or a failed command. */
  readonly reason: string;

  constructor(reason: string) {
    super(`Redis is unavailable and this environment has no in-memory fallback (${reason}).`);
    this.name = 'RedisUnavailableError';
    this.reason = reason;
  }
}
