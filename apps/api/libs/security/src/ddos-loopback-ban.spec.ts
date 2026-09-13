import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger } from '@nestjs/common';
import { DdosProtectionMiddleware } from './ddos-protection.middleware';
import { WsDdosGuard } from './ws-ddos.guard';
import { isLoopbackAddress, banSuppressedForLoopback } from './client-ip.util';

/**
 * A ban keyed on `127.0.0.1` in development bans the machine, not the flooder.
 *
 * Twice on 2026-09-12 a local caller crossed the strike threshold against the
 * developer's own gateway and the shield wrote `ddos:banned:127.0.0.1` into the
 * Redis the whole fleet shares: once for 15 minutes (`verify:regional`, which
 * had no pacing), once with `Retry-After: 21397` (a Playwright run). Both times
 * the casualty list was everything else on the machine — Next's SSR fetches,
 * `/health`, the smoke, the other session's probes — because on a developer's
 * box one IP is every caller. Both times the recovery was to hand-delete keys
 * the running platform owns, which is not a recovery procedure.
 *
 * The rule: in `NODE_ENV=development`, no BAN key for a loopback address. What
 * stays is everything that makes the shield a shield — the per-window 429s, the
 * strike counter, the violation records — so a local flood is still refused
 * request by request. Production is untouched: `banSuppressedForLoopback` reads
 * `NODE_ENV`, not a `DDOS_*` variable a deployment could set, so there is no
 * way to configure your way out of being banned in front of real traffic.
 */
let spies: ReturnType<typeof vi.spyOn>[];
beforeEach(() => {
  spies = [
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {}),
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {}),
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {}),
  ];
});
afterEach(() => {
  for (const s of spies) s.mockRestore();
  vi.unstubAllEnvs();
});

/** A Redis that records every write, so "no ban key" is checkable rather than assumed. */
function fakeRedis() {
  const counts = new Map<string, number>();
  return {
    sismember: vi.fn(async () => 0),
    get: vi.fn(async () => null),
    del: vi.fn(async () => undefined),
    setJSON: vi.fn(async () => undefined),
    incr: vi.fn(async (key: string) => {
      const next = (counts.get(key) ?? 0) + 1;
      counts.set(key, next);
      return next;
    }),
    expire: vi.fn(async () => undefined),
    ttl: vi.fn(async () => 0),
    set: vi.fn(async (_key: string, _value: string, _ttl?: number) => undefined),
  };
}

const req = (ip: string) =>
  ({ path: '/api/v1/orders', method: 'GET', ip, headers: {}, socket: {} }) as any;

/** Drive the strike counter past the threshold (default 5) from one address. */
async function strikeOut(mw: DdosProtectionMiddleware, ip: string, times = 6) {
  for (let i = 0; i < times; i++) {
    await (mw as any).recordStrike(ip, 'global_rate_limit', req(ip));
  }
}

const banKeys = (redis: ReturnType<typeof fakeRedis>) =>
  redis.set.mock.calls.map(([k]) => String(k)).filter((k) => k.startsWith('ddos:banned:'));

describe('the HTTP shield never bans loopback in development', () => {
  it('writes no ban key for 127.0.0.1', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const redis = fakeRedis();
    const mw = new DdosProtectionMiddleware(redis as any);
    await strikeOut(mw, '127.0.0.1');
    expect(banKeys(redis)).toEqual([]);
  });

  it('writes no ban tally either — no ban happened, so there is nothing to count', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const redis = fakeRedis();
    const mw = new DdosProtectionMiddleware(redis as any);
    await strikeOut(mw, '::1');
    const tallies = redis.incr.mock.calls
      .map(([k]) => String(k))
      .filter((k) => k.startsWith('stats:bans:'));
    expect(tallies).toEqual([]);
  });

  it('still counts the strikes and still records the violations', async () => {
    // The suppression is of the crater, not of the protection: the request that
    // earned the strike was already refused by the rate-limit layer above.
    vi.stubEnv('NODE_ENV', 'development');
    const redis = fakeRedis();
    const mw = new DdosProtectionMiddleware(redis as any);
    await strikeOut(mw, '127.0.0.1');
    expect(redis.incr.mock.calls.filter(([k]) => k === 'ddos:strikes:127.0.0.1')).toHaveLength(6);
    expect(redis.setJSON).toHaveBeenCalledTimes(6);
  });

  it('bans a real client from the same process', async () => {
    // The exemption is the address, not the environment on its own.
    vi.stubEnv('NODE_ENV', 'development');
    const redis = fakeRedis();
    const mw = new DdosProtectionMiddleware(redis as any);
    await strikeOut(mw, '198.51.100.9');
    expect(banKeys(redis)).toContain('ddos:banned:198.51.100.9');
  });

  it('bans loopback in production, exactly as before', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const redis = fakeRedis();
    const mw = new DdosProtectionMiddleware(redis as any);
    await strikeOut(mw, '127.0.0.1');
    expect(banKeys(redis)).toContain('ddos:banned:127.0.0.1');
  });

  it('bans loopback when NODE_ENV is unset, because that is not development', async () => {
    vi.stubEnv('NODE_ENV', '');
    const redis = fakeRedis();
    const mw = new DdosProtectionMiddleware(redis as any);
    await strikeOut(mw, '127.0.0.1');
    expect(banKeys(redis)).toContain('ddos:banned:127.0.0.1');
  });
});

describe('the WebSocket guard never bans loopback in development', () => {
  const socket = () => ({ id: 's1', emit: vi.fn(), disconnect: vi.fn() }) as any;

  async function wsStrikeOut(guard: WsDdosGuard, ip: string, client: any, times = 4) {
    for (let i = 0; i < times; i++) {
      await (guard as any).recordWsStrike(ip, client, 'message_flood');
    }
  }

  const wsBanKeys = (redis: ReturnType<typeof fakeRedis>) =>
    redis.set.mock.calls.map(([k]) => String(k)).filter((k) => k.startsWith('ws:banned:'));

  it('writes no ws:banned key for 127.0.0.1 and disconnects nobody', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const redis = fakeRedis();
    const client = socket();
    await wsStrikeOut(new WsDdosGuard(redis as any), '127.0.0.1', client);
    expect(wsBanKeys(redis)).toEqual([]);
    expect(client.disconnect).not.toHaveBeenCalled();
  });

  it('bans a real client from the same process', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const redis = fakeRedis();
    const client = socket();
    await wsStrikeOut(new WsDdosGuard(redis as any), '203.0.113.7', client);
    expect(wsBanKeys(redis)).toContain('ws:banned:203.0.113.7');
    expect(client.disconnect).toHaveBeenCalled();
  });

  it('bans loopback in production, exactly as before', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const redis = fakeRedis();
    await wsStrikeOut(new WsDdosGuard(redis as any), '::1', socket());
    expect(wsBanKeys(redis)).toContain('ws:banned:::1');
  });

  it('leaves a deliberate administrative ban alone in every environment', async () => {
    // `banIpFromWebSocket` is somebody deciding; this rule is about the shield
    // deciding for itself.
    vi.stubEnv('NODE_ENV', 'development');
    const redis = fakeRedis();
    await new WsDdosGuard(redis as any).banIpFromWebSocket('127.0.0.1', 60, 'by hand');
    expect(wsBanKeys(redis)).toContain('ws:banned:127.0.0.1');
  });
});

describe('which addresses count as loopback', () => {
  it('accepts the whole of 127.0.0.0/8, ::1 and the IPv4-mapped form', () => {
    for (const ip of ['127.0.0.1', '127.1.2.3', '127.255.255.254', '::1', '0:0:0:0:0:0:0:1'])
      expect(isLoopbackAddress(ip), ip).toBe(true);
    // Node reports an IPv4 peer on a dual-stack listener this way, which is
    // what `handshake.address` actually carries on Windows.
    expect(isLoopbackAddress('::ffff:127.0.0.1')).toBe(true);
    expect(isLoopbackAddress('::FFFF:127.0.0.1')).toBe(true);
  });

  it('refuses everything else, including the addresses that merely look local', () => {
    for (const ip of [
      '128.0.0.1',
      '10.0.0.1',
      '192.168.1.1',
      '172.28.0.5',
      '0.0.0.0',
      '::',
      '2001:db8::1',
      'localhost',
      '',
      undefined,
      null,
    ])
      expect(isLoopbackAddress(ip as any), String(ip)).toBe(false);
  });

  it('is only a suppression in development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(banSuppressedForLoopback('127.0.0.1')).toBe(true);
    vi.stubEnv('NODE_ENV', 'production');
    expect(banSuppressedForLoopback('127.0.0.1')).toBe(false);
    vi.stubEnv('NODE_ENV', 'test');
    expect(banSuppressedForLoopback('127.0.0.1')).toBe(false);
  });
});
