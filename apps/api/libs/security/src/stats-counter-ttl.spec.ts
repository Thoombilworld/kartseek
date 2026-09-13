import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '@nestjs/common';
import { DdosProtectionMiddleware } from './ddos-protection.middleware';

/**
 * A console counter that can only grow is a leak with a dashboard on it.
 *
 * `redis` runs `--maxmemory-policy volatile-lru`, which may evict **only** keys
 * that carry a TTL (AUD2-031). So every `incr` with no expiry is a key that
 * lives until someone deletes it by hand, and `stats:ep:<method>:<path>:<hour>`
 * was the worst of them: one new permanent key per distinct path per hour, on
 * every request, for ever. It is read back for the last 24 hours and nothing
 * ever removed it.
 *
 * These counters cannot be derived the way `admin:counter:pending_kyc` now is —
 * there is no ban table, and a ban is itself a Redis key that expires — so they
 * stay tallies. What they gain is a bound: `incr` returns 1 exactly once per
 * key, and that is where the expiry goes.
 */
let spies: ReturnType<typeof vi.spyOn>[];
beforeEach(() => {
  spies = [
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {}),
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {}),
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {}),
  ];
  vi.stubEnv('NODE_ENV', 'development');
});
afterEach(() => {
  for (const s of spies) s.mockRestore();
  vi.unstubAllEnvs();
});

/** Counts `incr` per key so the "first write only" rule can be exercised. */
function middleware() {
  const counts = new Map<string, number>();
  const expires: Array<[string, number]> = [];
  const redis = {
    sismember: vi.fn(async () => 0),
    get: vi.fn(async () => null),
    set: vi.fn(async () => undefined),
    setJSON: vi.fn(async () => undefined),
    incr: vi.fn(async (key: string) => {
      const next = (counts.get(key) ?? 0) + 1;
      counts.set(key, next);
      return next;
    }),
    expire: vi.fn(async (key: string, ttl: number) => {
      expires.push([key, ttl]);
    }),
    ttl: vi.fn(async () => 0),
  };
  return { mw: new DdosProtectionMiddleware(redis as any), redis, expires };
}

const req = () =>
  ({
    path: '/api/v1/orders',
    method: 'GET',
    ip: '198.51.100.9',
    headers: {
      'user-agent': 'Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/140.0 Safari/537.36',
      accept: 'application/json',
      'accept-language': 'en-GB,en;q=0.9',
      'accept-encoding': 'gzip, deflate, br',
      connection: 'keep-alive',
      host: 'localhost:3001',
    },
    socket: {},
  }) as any;

const res = () =>
  ({ setHeader: () => undefined, status: () => ({ json: () => undefined }) }) as any;

describe('the per-endpoint request counter is bounded', () => {
  it('gives the hourly key an expiry', async () => {
    const { mw, expires } = middleware();
    await mw.use(req(), res(), vi.fn());
    const stat = expires.find(([k]) => k.startsWith('stats:ep:'));
    expect(stat).toBeDefined();
    // 48 hours: the dashboard reads 24.
    expect(stat![1]).toBe(172_800);
  });

  it('sets it once, not on every request', async () => {
    // `expire` on every hit would be a second round trip per request on the
    // hottest path on the platform, for no benefit.
    const { mw, expires } = middleware();
    for (let i = 0; i < 25; i++) await mw.use(req(), res(), vi.fn());
    expect(expires.filter(([k]) => k.startsWith('stats:ep:')).length).toBe(1);
  });

  it('still counts every request', async () => {
    const { mw, redis } = middleware();
    for (let i = 0; i < 5; i++) await mw.use(req(), res(), vi.fn());
    const statCalls = redis.incr.mock.calls.filter(([k]) => String(k).startsWith('stats:ep:'));
    expect(statCalls.length).toBe(5);
  });
});

/**
 * The remaining counters live on paths a unit test cannot reach without a
 * socket server or a geo lookup, so they are checked where they are written.
 * The shape is the same in each: `incr`, compare to 1, `expire`.
 */
describe('every console-facing security counter carries an expiry', () => {
  const API = path.join(__dirname, '..', '..', '..');

  const sites: Array<[string, string]> = [
    ['libs/security/src/ddos-protection.middleware.ts', 'stats:bans:'],
    ['libs/security/src/ws-ddos.guard.ts', 'stats:ws:bans:'],
    ['apps/api-gateway/src/controllers/geo-security.controller.ts', 'geo:stats:'],
    ['apps/api-gateway/src/gateways/doctor.gateway.ts', 'stats:ws:ack_failures:'],
    ['apps/api-gateway/src/gateways/taxi-tracking.gateway.ts', 'stats:ws:ack_failures:'],
  ];

  for (const [rel, key] of sites) {
    it(`${key} in ${path.basename(rel)} expires`, () => {
      const src = fs.readFileSync(path.join(API, rel), 'utf8');
      expect(src, `${rel} no longer writes ${key}`).toContain(key);
      // The idiom: the increment's result is compared to 1 and an expiry set.
      expect(src).toMatch(/\)\) === 1\) await this\.redis\.expire\(/);
    });
  }

  it('leaves no bare incr of a stats key in libs/security', () => {
    const offenders: string[] = [];
    for (const file of [
      'ddos-protection.middleware.ts',
      'ws-ddos.guard.ts',
      'ddos-monitor.service.ts',
    ]) {
      const src = fs.readFileSync(path.join(API, 'libs', 'security', 'src', file), 'utf8');
      for (const m of src.matchAll(/await this\.redis\.incr\(`(stats:[^`]*)`\)/g)) {
        offenders.push(`${file}: ${m[1]}`);
      }
    }
    // The fix is `const k = …; if ((await this.redis.incr(k)) === 1) await this.redis.expire(k, ttl);`
    expect(offenders).toEqual([]);
  });
});
