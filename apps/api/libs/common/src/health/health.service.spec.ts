import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { Logger } from '@nestjs/common';
import { HealthService } from './health.service';

/**
 * Four of these cases are failure cases, and HealthService logs every failure
 * it reports — which is the behaviour wanted in production and noise here. The
 * spy keeps the run's output to its own result lines, so a real error printed
 * during a test run still means something.
 */
let silenced: ReturnType<typeof vi.spyOn>;
beforeAll(() => {
  silenced = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
});
afterAll(() => silenced.mockRestore());

const upRedis = { health: async () => ({ status: 'up' as const, latencyMs: 1, detail: 'PONG' }) };
const emulatedRedis = {
  health: async () => ({
    status: 'degraded' as const,
    emulated: true,
    detail: 'in-memory emulator: this process has private sessions, carts and rate limits',
  }),
};

describe('HealthService', () => {
  it('reports up only after the database answered a query', async () => {
    const query = vi.fn(async () => [{ ok: 1 }]);
    const svc = new HealthService('order-service', { query } as any, upRedis as any, []);
    const r = await svc.ready();
    expect(query).toHaveBeenCalledWith('SELECT 1');
    expect(r.status).toBe('ready');
    expect(r.checks.database.status).toBe('up');
  });

  it('is not ready when the query throws, and says why', async () => {
    const query = vi.fn(async () => {
      throw new Error('password authentication failed for user "postgres"');
    });
    const svc = new HealthService('order-service', { query } as any, upRedis as any, []);
    const r = await svc.ready();
    expect(r.status).toBe('down');
    expect(r.checks.database.status).toBe('down');
    expect(r.checks.database.error).toContain('password authentication failed');
  });

  it('never calls the in-memory emulator up', async () => {
    const svc = new HealthService('cart-service', null, emulatedRedis as any, []);
    const r = await svc.ready();
    expect(r.checks.redis.status).toBe('degraded');
    expect(r.checks.redis.emulated).toBe(true);
    expect(r.checks.redis.status).not.toBe('up');
  });

  it('omits the database check for a service that owns no tables', async () => {
    const svc = new HealthService('loyalty-service', null, upRedis as any, []);
    expect((await svc.ready()).checks.database).toBeUndefined();
  });

  it('runs registered extra checks and a throwing one lands as down, not a 500', async () => {
    const svc = new HealthService('audit-log-service', null, upRedis as any, [
      {
        name: 'mongodb',
        run: async () => {
          throw new Error('connect ECONNREFUSED');
        },
      },
    ]);
    const r = await svc.ready();
    expect(r.checks.mongodb.status).toBe('down');
    expect(r.status).toBe('down');
  });

  it('liveness never touches a dependency', async () => {
    const query = vi.fn();
    const svc = new HealthService('order-service', { query } as any, upRedis as any, []);
    expect((await svc.live()).status).toBe('ok');
    expect(query).not.toHaveBeenCalled();
  });

  /**
   * The registry declares which stores a service owns, and `HealthModule.register`
   * passes that declaration in. Without it a service whose `TypeOrmModule.forRoot`
   * silently failed to register would simply have no `database` key in its checks
   * and answer `ready` — the same class of unfalsifiable health this task exists
   * to remove, one level up.
   */
  it('reports a declared database as down when no DataSource is bound', async () => {
    const svc = new HealthService('order-service', null, upRedis as any, [], true, true);
    const r = await svc.ready();
    expect(r.status).toBe('down');
    expect(r.checks.database.status).toBe('down');
    expect(r.checks.database.error).toContain('no DataSource');
  });

  it('reports a declared redis as down when no RedisService is bound', async () => {
    const query = vi.fn(async () => [{ ok: 1 }]);
    const svc = new HealthService('order-service', { query } as any, null, [], true, true);
    const r = await svc.ready();
    expect(r.status).toBe('down');
    expect(r.checks.redis.status).toBe('down');
    expect(r.checks.redis.error).toContain('no RedisService');
  });
  /**
   * `down` and `degraded` are not the same verdict, because the HTTP status the
   * controller sets keys off this field: a dependency that is *down* takes the
   * process out of the load balancer (503), while an emulated Redis or a
   * half-failing cache stays in it (200). Collapsing both into `degraded` — as
   * this service first did — makes a dead database indistinguishable from a
   * warm cache miss, and 503 unreachable.
   */
  it('separates a down dependency from a merely degraded one', async () => {
    const emulatedOnly = new HealthService('cart-service', null, emulatedRedis as any, []);
    expect((await emulatedOnly.ready()).status).toBe('degraded');

    const query = vi.fn(async () => {
      throw new Error('connect ECONNREFUSED 127.0.0.1:5432');
    });
    const dbDown = new HealthService('order-service', { query } as any, emulatedRedis as any, []);
    const r = await dbDown.ready();
    expect(r.status).toBe('down');
    expect(r.checks.redis.status).toBe('degraded');
  });

  it('is ready when every dependency answers', async () => {
    const query = vi.fn(async () => [{ ok: 1 }]);
    const svc = new HealthService('order-service', { query } as any, upRedis as any, []);
    expect((await svc.ready()).status).toBe('ready');
  });
});
