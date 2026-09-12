import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger } from '@nestjs/common';
import { RedisService } from './redis.service';
import { RedisUnavailableError } from './redis-unavailable.error';

/**
 * The emulator is a development device, and production must not have one.
 *
 * `useMemory()` engaged on `isSkipped || !client || status !== 'ready'` with no
 * environment gate, and only the first of those three is a deliberate opt-in.
 * The other two are what a real, unrecovered outage looks like — ioredis's
 * `retryStrategy` retries for ever, so `status` sits at `reconnecting` and never
 * reaches a terminal state. So a production Redis outage read as `degraded`,
 * answered HTTP 200, stayed in the load balancer, and every pod quietly diverged
 * onto private in-process sessions, carts, rate limits, refresh slots and OTPs.
 * That is AUD2-024 relabelled from `up` to `degraded`, not closed.
 *
 * In production there is now no emulator at all: an unready client makes
 * `health()` report `down` (readiness 503) and every operation throw
 * `RedisUnavailableError`, which the shared filter maps to 503. Nothing is
 * written into a Map no other pod can read.
 */
const cfg = (values: Record<string, string> = {}) =>
  ({
    get: (key: string, fallback?: unknown) => values[key] ?? fallback,
  }) as any;

/** A service with a client that is connected-but-not-ready, without a socket. */
function withUnreadyClient(status = 'reconnecting') {
  const svc = new RedisService(cfg());
  (svc as any).isSkipped = false;
  (svc as any).client = { status, ping: async () => 'PONG' };
  return svc;
}

let silenced: ReturnType<typeof vi.spyOn>[];
beforeEach(() => {
  silenced = [
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {}),
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {}),
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {}),
  ];
});
afterEach(() => {
  for (const s of silenced) s.mockRestore();
  vi.unstubAllEnvs();
});

describe('RedisService in production', () => {
  beforeEach(() => vi.stubEnv('NODE_ENV', 'production'));

  it('reports down — never degraded — when the client cannot reach ready', async () => {
    const svc = withUnreadyClient();
    const h = await svc.health();
    expect(h.status).toBe('down');
    expect(h.emulated).toBeUndefined();
    expect(h.reason).toBe('not-ready');
  });

  it('makes every operation fail loudly rather than succeed in memory', async () => {
    const svc = withUnreadyClient();
    await expect(svc.get('session:u1')).rejects.toThrow(RedisUnavailableError);
    await expect(svc.set('session:u1', 'x')).rejects.toThrow(RedisUnavailableError);
    await expect(svc.del('session:u1')).rejects.toThrow(/redis is unavailable/i);
    // Nothing was written into the emulator on the way out.
    expect((svc as any).memoryDb.size).toBe(0);
  });

  it('reports down when no client was constructed at all', async () => {
    const svc = new RedisService(cfg());
    (svc as any).isSkipped = false;
    (svc as any).client = null;
    const h = await svc.health();
    expect(h.status).toBe('down');
    expect(h.reason).toBe('no-client');
  });

  it('does not fabricate a skipped state when the client fails to construct', async () => {
    // `onModuleInit` used to set `isSkipped = true` on a construction failure,
    // which in production would have reported the outage as a deliberate
    // `skipped` — the one verdict that says "this was on purpose", and the one
    // that would have told an operator the missing Redis was intended.
    //
    // The failure is induced through ConfigService rather than by feeding
    // ioredis a bad host: the constructor reads its options inside the same
    // `try`, so a throwing `get()` exercises the real catch path without
    // opening a socket or depending on what ioredis happens to validate.
    const exploding = {
      get: (key: string) => {
        if (key === 'REDIS_HOST') throw new Error('config unavailable');
        return undefined;
      },
    } as any;
    const svc = new RedisService(exploding);
    svc.onModuleInit();
    expect((svc as any).isSkipped).toBe(false);
    expect((svc as any).client).toBeNull();

    const h = await svc.health();
    expect(h.status).toBe('down');
    expect(h.reason).toBe('no-client');
    expect(h.error).toContain('config unavailable');
  });
});

describe('RedisService in development', () => {
  beforeEach(() => vi.stubEnv('NODE_ENV', 'development'));

  it('still serves from the emulator when the client is not ready, and says why', async () => {
    const svc = withUnreadyClient();
    const h = await svc.health();
    expect(h.status).toBe('degraded');
    expect(h.emulated).toBe(true);
    expect(h.reason).toBe('not-ready');
    expect(h.detail).toContain('not ready');
    await expect(svc.set('k', 'v')).resolves.toBeUndefined();
    expect(await svc.get('k')).toBe('v');
  });

  it('distinguishes a deliberate SKIP_REDIS from an unintended outage', async () => {
    const svc = new RedisService(cfg({ SKIP_REDIS: 'true' }));
    svc.onModuleInit();
    const h = await svc.health();
    expect(h.status).toBe('skipped');
    expect(h.reason).toBe('skipped');
    expect(h.emulated).toBe(true);

    // The same process, the same emulator — but a different reason, which is
    // what makes an unintended dev outage visible instead of looking chosen.
    expect((await withUnreadyClient().health()).reason).toBe('not-ready');
  });

  it('does hand the emulator to a development process whose client cannot be constructed', async () => {
    const exploding = {
      get: (key: string) => {
        if (key === 'REDIS_HOST') throw new Error('config unavailable');
        return undefined;
      },
    } as any;
    const svc = new RedisService(exploding);
    svc.onModuleInit();
    expect((svc as any).isSkipped).toBe(true);
    await expect(svc.set('k', 'v')).resolves.toBeUndefined();
  });

  it('reports up only on a literal PONG from a ready client', async () => {
    const svc = new RedisService(cfg());
    (svc as any).isSkipped = false;
    (svc as any).client = { status: 'ready', ping: async () => 'PONG' };
    const h = await svc.health();
    expect(h.status).toBe('up');
    expect(h.emulated).toBeUndefined();
  });
});
