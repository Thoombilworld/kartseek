import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { DdosProtectionMiddleware } from './ddos-protection.middleware';
import { RedisUnavailableError } from '@app/redis';

/**
 * What each half of the platform does when Redis is down — decided, and pinned.
 *
 * Two call sites logged and carried on when the store failed, and they are not
 * the same decision wearing two hats:
 *
 *   `ddos-protection.middleware.ts`  rate limiting off platform-wide
 *   `jwt-auth.guard.ts`              a revoked session stays valid
 *
 * The ruling (dispatch addendum item 2) is that they should differ, because the
 * direction of the failure differs. Rate limiting off admits traffic to a
 * platform that is already struggling — bad, and it ends when the store comes
 * back. Revocation off means a credential somebody deliberately took away works
 * again — worse, and waiting does not fix what was done with it. So revocation
 * fails CLOSED in production, and the DDoS middleware keeps failing open but
 * reports it once per outage instead of once per request.
 */
let logs: { warn: string[]; error: string[]; log: string[] };
let spies: ReturnType<typeof vi.spyOn>[];

beforeEach(() => {
  logs = { warn: [], error: [], log: [] };
  spies = [
    vi
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation((m: any) => void logs.warn.push(String(m))),
    vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation((m: any) => void logs.error.push(String(m))),
    vi.spyOn(Logger.prototype, 'log').mockImplementation((m: any) => void logs.log.push(String(m))),
  ];
});
afterEach(() => {
  for (const s of spies) s.mockRestore();
  vi.unstubAllEnvs();
});

// ── Revocation: fail closed in production ───────────────────────────────────

/** A guard whose revocation reads always hit an unreachable store. */
function guardWithDeadRedis() {
  const redis = {
    get: vi.fn(async () => {
      throw new RedisUnavailableError('not-ready');
    }),
  };
  return { guard: new JwtAuthGuard(undefined, redis as any), redis };
}

const request = () => ({
  user: { id: 'u-1', sub: 'u-1', jti: 'jti-1', type: 'access', role: 'SUPER_ADMIN' },
});

/** `assertSessionUsable` is the private half `canActivate` calls after passport. */
const check = (guard: JwtAuthGuard, req: unknown) => (guard as any).assertSessionUsable(req);

describe('a revocation check that cannot run', () => {
  it('refuses the request in production rather than admitting it', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { guard } = guardWithDeadRedis();
    await expect(check(guard, request())).rejects.toThrow(RedisUnavailableError);
  });

  it('refuses with the store-unavailable error, so the caller gets 503 and not 401', async () => {
    // 503, because the session may well be valid — the platform cannot
    // currently tell. "Your session ended" would be a claim it cannot support,
    // and it would log a user out over a cache blip.
    vi.stubEnv('NODE_ENV', 'production');
    const { guard } = guardWithDeadRedis();
    const err = await check(guard, request()).catch((e: unknown) => e);
    expect((err as Error).name).toBe('RedisUnavailableError');
    expect(err).not.toBeInstanceOf(UnauthorizedException);
  });

  it('says in the log that it refused, and why', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { guard } = guardWithDeadRedis();
    await check(guard, request()).catch(() => {});
    expect(logs.error.join('\n')).toMatch(/revocation check could not run — refusing/);
  });

  it('changes nothing outside production, where the emulator answers', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const { guard } = guardWithDeadRedis();
    await expect(check(guard, request())).resolves.toBeUndefined();
    expect(logs.warn.join('\n')).toMatch(/not production/);
  });

  it('still ends a session the store says is revoked', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const redis = {
      get: vi.fn(async (k: string) => (k.startsWith('revoked-users:') ? '1' : null)),
    };
    const guard = new JwtAuthGuard(undefined, redis as any);
    await expect(check(guard, request())).rejects.toThrow(UnauthorizedException);
  });

  it('admits a session the store says is fine', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const redis = { get: vi.fn(async () => null) };
    const guard = new JwtAuthGuard(undefined, redis as any);
    await expect(check(guard, request())).resolves.toBeUndefined();
  });
});

// ── DDoS: fail open, one warning per outage ─────────────────────────────────

/** A middleware whose very first Redis call fails, for `n` consecutive requests. */
function middlewareWithRedis(get: () => unknown) {
  const redis = {
    sismember: vi.fn(async () => {
      return get();
    }),
    get: vi.fn(async () => null),
    set: vi.fn(async () => undefined),
    setJSON: vi.fn(async () => undefined),
    incr: vi.fn(async () => 1),
    expire: vi.fn(async () => undefined),
    ttl: vi.fn(async () => 0),
  };
  return { mw: new DdosProtectionMiddleware(redis as any), redis };
}

/**
 * An ordinary browser request. The headers matter: with none of them the
 * suspicion score reaches the strike threshold, and a spec about outage
 * reporting would then be exercising the strike path instead of the healthy one.
 */
const req = () =>
  ({
    path: '/api/v1/orders',
    method: 'GET',
    ip: '198.51.100.9',
    headers: {
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36',
      accept: 'application/json',
      'accept-language': 'en-GB,en;q=0.9',
      'accept-encoding': 'gzip, deflate, br',
      connection: 'keep-alive',
      host: 'localhost:3001',
    },
    socket: {},
  }) as any;
const res = () =>
  ({
    // `setHeader` is not decoration: the middleware writes the X-RateLimit-*
    // triple on the way through, so a response double without it turns the
    // healthy path into a TypeError and hides the recovery this file is about.
    setHeader: () => undefined,
    status: () => ({ json: () => undefined }),
  }) as any;

describe('rate limiting during a store outage', () => {
  beforeEach(() => vi.stubEnv('NODE_ENV', 'development'));

  it('keeps serving — availability is the deliberate choice here', async () => {
    const { mw } = middlewareWithRedis(() => {
      throw new RedisUnavailableError('not-ready');
    });
    const next = vi.fn();
    await mw.use(req(), res(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('warns once for the outage, not once per request', async () => {
    // This is the whole finding. The log used to fill at exactly the rate of
    // the traffic nobody was limiting — thousands of identical lines during the
    // one incident an operator most needs to read the log.
    const { mw } = middlewareWithRedis(() => {
      throw new RedisUnavailableError('not-ready');
    });
    for (let i = 0; i < 50; i++) await mw.use(req(), res(), vi.fn());
    expect(logs.error.length).toBe(1);
  });

  it('makes that one line structured and greppable', async () => {
    const { mw } = middlewareWithRedis(() => {
      throw new RedisUnavailableError('not-ready');
    });
    await mw.use(req(), res(), vi.fn());
    const line = JSON.parse(logs.error[0]);
    expect(line.event).toBe('ddos.protection.failed_open');
    expect(line.ddosProtection).toBe('FAILED_OPEN');
    expect(line.reason).toContain('not-ready');
  });

  it('reports the recovery, and how many requests went unchecked', async () => {
    let dead = true;
    const { mw } = middlewareWithRedis(() => {
      if (dead) throw new RedisUnavailableError('not-ready');
      return 0;
    });
    for (let i = 0; i < 5; i++) await mw.use(req(), res(), vi.fn());
    dead = false;
    await mw.use(req(), res(), vi.fn());

    const recovery = logs.log
      .map((l) => JSON.parse(l))
      .find((l) => l.event === 'ddos.protection.recovered');
    expect(recovery).toBeDefined();
    expect(recovery.ddosProtection).toBe('ACTIVE');
    expect(recovery.requestsAllowedUnchecked).toBe(5);
  });

  it('warns again for the next outage, having recovered from the first', async () => {
    let dead = true;
    const { mw } = middlewareWithRedis(() => {
      if (dead) throw new RedisUnavailableError('not-ready');
      return 0;
    });
    await mw.use(req(), res(), vi.fn());
    dead = false;
    await mw.use(req(), res(), vi.fn());
    dead = true;
    await mw.use(req(), res(), vi.fn());
    expect(logs.error.length).toBe(2);
  });
});
