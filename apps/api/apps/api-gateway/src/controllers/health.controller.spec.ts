import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HealthController } from './health.controller';

const catalog = { stats: () => ({ status: 'up' as const, detail: 'grpc' }) };
const okRedis = { health: async () => ({ status: 'up' as const, detail: 'PONG' }) };
const emulated = { health: async () => ({ status: 'degraded' as const, emulated: true }) };

/**
 * Kafka and Mongo are the two checks that still open a socket, deliberately —
 * a broker handshake on every probe interval is not worth its cost. A unit spec
 * must not depend on whether a broker happens to be running on the machine it
 * is run on, so both are moved onto their documented "not attempted" branch:
 * `SKIP_KAFKA` is the gateway's own switch, and an unparseable `MONGO_URI` is
 * the branch that answers `unknown` without touching the network. Neither is a
 * substitute for the live probe — see the task report's dependency-flip proof.
 */
beforeEach(() => {
  vi.stubEnv('SKIP_KAFKA', 'true');
  vi.stubEnv('MONGO_URI', 'not-a-mongo-uri');
});
afterEach(() => vi.unstubAllEnvs());

describe('gateway health', () => {
  it('aggregates dependencies on /health with a per-dependency status', async () => {
    const ds = { query: vi.fn(async () => [{ ok: 1 }]) };
    const c = new HealthController(okRedis as any, catalog as any, ds as any);
    const r = await c.liveness();
    expect(r.status).toBe('ok');
    const ready = await c.readiness();
    expect(ready.checks.postgresql.status).toBe('up');
    expect(ds.query).toHaveBeenCalledWith('SELECT 1');
  });

  it('is degraded — not ready — when Redis is the emulator', async () => {
    const ds = { query: vi.fn(async () => [{ ok: 1 }]) };
    const c = new HealthController(emulated as any, catalog as any, ds as any);
    const r = await c.readiness();
    expect(r.checks.redis.emulated).toBe(true);
    expect(r.status).toBe('degraded');
  });

  it('reports the database down when the query fails, not when the port is open', async () => {
    const ds = {
      query: vi.fn(async () => {
        throw new Error('database "kartseek_db" does not exist');
      }),
    };
    const c = new HealthController(okRedis as any, catalog as any, ds as any);
    const r = await c.readiness();
    expect(r.checks.postgresql.status).toBe('down');
    expect(r.checks.postgresql.error).toContain('does not exist');
  });

  it('gives an anonymous caller no ports, no brokers and no host names', async () => {
    const c = new HealthController(okRedis as any, catalog as any, null);
    const anon = c.services({ user: undefined } as any);
    expect(JSON.stringify(anon)).not.toMatch(/\d{4}/);
    expect(anon).toEqual({ status: 'ok', totalServices: expect.any(Number) });
  });

  it('gives a SUPER_ADMIN the full catalogue', async () => {
    const c = new HealthController(okRedis as any, catalog as any, null);
    const full = c.services({ user: { role: 'super_admin' } } as any) as any;
    expect(full.services['order-service']).toBeDefined();
    expect(full.transport.kafka).toContain('brokers');
    expect(full.totalServices).toBe(Object.keys(full.services).length);
  });

  it('strips the config block and every detail from an anonymous readiness', async () => {
    const ds = { query: vi.fn(async () => [{ ok: 1 }]) };
    const c = new HealthController(okRedis as any, catalog as any, ds as any);
    const anon = (await c.readiness()) as any;
    expect(anon.config).toBeUndefined();
    for (const check of Object.values<any>(anon.checks)) expect(check.detail).toBeUndefined();
    // Status and latency stay — that is what a load balancer reads.
    expect(anon.checks.postgresql.status).toBe('up');

    const staff = (await c.readiness({ user: { role: 'super_admin' } } as any)) as any;
    expect(staff.config).toBeDefined();
    expect(staff.checks.postgresql.detail).toContain('SELECT 1');
  });

  it('reports the database down when no DataSource is bound at all', async () => {
    const c = new HealthController(okRedis as any, catalog as any, null);
    const r = await c.readiness();
    expect(r.checks.postgresql.status).toBe('down');
    expect(r.status).toBe('down');
  });
});
