import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HealthController } from './health.controller';

const catalog = { stats: () => ({ status: 'up' as const, detail: 'grpc' }) };
const okRedis = { health: async () => ({ status: 'up' as const, detail: 'PONG' }) };
const emulated = { health: async () => ({ status: 'degraded' as const, emulated: true }) };

/**
 * The board is gated on the permission `system.health`, not on a role, so the
 * token a spec presents has to carry the claim a real one does. SUPER_ADMIN
 * signs in with the wildcard rather than an enumerated list.
 */
const staff = { user: { role: 'SUPER_ADMIN', adminPermissions: ['*'] } } as any;

/** An `admin`: the enumerated list, which includes `system.health`. */
const admin = {
  user: { role: 'ADMIN', adminPermissions: ['dashboard.view', 'system.health', 'audit.logs'] },
} as any;

/**
 * A `regional_admin`: everything an admin can do inside one market, and
 * deliberately NOT `system.health` — platform topology is not a market's.
 */
const regionalAdmin = {
  user: {
    role: 'ADMIN',
    regionCode: 'QA',
    regionLocked: true,
    adminPermissions: ['dashboard.view', 'orders.view', 'sellers.view', 'audit.logs'],
  },
} as any;

/** Captures the status codes the handler puts on the response. */
const sink = () => {
  const codes: number[] = [];
  return { res: { status: (c: number) => codes.push(c) } as any, codes };
};

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
  it('aggregates dependencies on /health/ready with a per-dependency status', async () => {
    const ds = { query: vi.fn(async () => [{ ok: 1 }]) };
    const c = new HealthController(okRedis as any, catalog as any, ds as any);
    const ready = (await c.readiness(sink().res, staff)) as any;
    expect(ready.checks.postgresql.status).toBe('up');
    expect(ds.query).toHaveBeenCalledWith('SELECT 1');
  });

  /**
   * Liveness answers from the process alone. It used to call `readiness()` on
   * every hit — a query, a PING and two socket connects per probe interval —
   * which is both wasteful and the wrong shape: what liveness reports must not
   * depend on a store, or a blinking dependency starts restarting healthy pods
   * the moment anyone points a `livenessProbe` at it.
   */
  it('liveness runs no dependency check and never leaves 200', async () => {
    const ds = { query: vi.fn() };
    const c = new HealthController(okRedis as any, catalog as any, ds as any);
    const r = await c.liveness();
    expect(r.status).toBe('ok');
    expect(ds.query).not.toHaveBeenCalled();
  });

  it('is degraded — not ready — when Redis is the emulator, and still 200', async () => {
    const ds = { query: vi.fn(async () => [{ ok: 1 }]) };
    const c = new HealthController(emulated as any, catalog as any, ds as any);
    const { res, codes } = sink();
    const r = (await c.readiness(res, staff)) as any;
    expect(r.checks.redis.emulated).toBe(true);
    expect(r.status).toBe('degraded');
    expect(codes).toEqual([200]);
  });

  it('reports the database down when the query fails, not when the port is open', async () => {
    const ds = {
      query: vi.fn(async () => {
        throw new Error('database "kartseek_db" does not exist');
      }),
    };
    const c = new HealthController(okRedis as any, catalog as any, ds as any);
    const { res, codes } = sink();
    const r = (await c.readiness(res, staff)) as any;
    expect(r.checks.postgresql.status).toBe('down');
    expect(r.checks.postgresql.error).toContain('does not exist');
    // 503, or Kubernetes keeps routing traffic to a gateway with no database.
    expect(codes).toEqual([503]);
  });

  it('gives an anonymous caller no ports, no brokers and no host names', async () => {
    const c = new HealthController(okRedis as any, catalog as any, null);
    const anon = c.services({ user: undefined } as any);
    expect(JSON.stringify(anon)).not.toMatch(/\d{4}/);
    expect(anon).toEqual({ status: 'ok', totalServices: expect.any(Number) });
  });

  it('gives a SUPER_ADMIN the full catalogue', async () => {
    const c = new HealthController(okRedis as any, catalog as any, null);
    const full = c.services(staff) as any;
    expect(full.services['order-service']).toBeDefined();
    expect(full.transport.kafka).toContain('brokers');
    expect(full.totalServices).toBe(Object.keys(full.services).length);
  });

  /**
   * The gate is `perm:system.health`, not a role (dispatch addendum item 1).
   *
   * A regional admin's remit is one market's records. The full board is the
   * platform's internal topology — 26 ports, every gRPC URL, the broker list,
   * the database name and the user the gateway connects as — which belongs to
   * no market, so `regional_admin` does not carry the key and the board reduces
   * for them exactly as it does for an anonymous caller.
   *
   * The reduction is deliberately not a 403: these routes are `@Public()`
   * because a kubelet holds no token, and a probe that can fail authorisation
   * restarts healthy pods.
   */
  it('reduces the catalogue for a regional admin, who holds no system.health', () => {
    const c = new HealthController(okRedis as any, catalog as any, null);
    const reduced = c.services(regionalAdmin) as any;
    expect(reduced).toEqual({ status: 'ok', totalServices: expect.any(Number) });
    expect(JSON.stringify(reduced)).not.toMatch(/\d{4}/);
  });

  it('gives an admin who holds system.health the full catalogue', () => {
    const c = new HealthController(okRedis as any, catalog as any, null);
    expect((c.services(admin) as any).services['order-service']).toBeDefined();
  });

  it('reduces the board for a revoked token, which arrives with no user at all', async () => {
    // `JwtAuthGuard` rejects a revoked session before the handler runs, so
    // `request.user` is unset and the claim cannot be read. Reducing — rather
    // than throwing — is what keeps the probe answering while the caller loses
    // the privileged view.
    const c = new HealthController(okRedis as any, catalog as any, null);
    const { res } = sink();
    const revoked = (await c.readiness(res, { user: undefined } as any)) as any;
    expect(revoked.config).toBeUndefined();
    expect(typeof revoked.checks.redis).toBe('string');
  });

  it('does not privilege a role string on its own, however senior it reads', () => {
    // The old gate was `role === ADMIN || role === SUPER_ADMIN`. A token that
    // says SUPER_ADMIN but carries no permission claim was never minted by this
    // platform's login, and it does not open the board.
    const c = new HealthController(okRedis as any, catalog as any, null);
    const roleOnly = { user: { role: 'SUPER_ADMIN' } } as any;
    expect(c.services(roleOnly)).toEqual({ status: 'ok', totalServices: expect.any(Number) });
  });

  /**
   * The anonymous readiness body is the verdict and one word per dependency.
   * It used to keep `error` verbatim, and a connection-level Postgres failure
   * throws `connect ECONNREFUSED <host>:<port>` — so an unauthenticated caller
   * learned the internal address of the database during an outage, which is the
   * disclosure AUD2-072 exists to close, at the worst possible moment.
   */
  it('reduces an anonymous readiness to states, keeping no driver text', async () => {
    const ds = {
      query: vi.fn(async () => {
        throw new Error('connect ECONNREFUSED 10.0.0.7:5432');
      }),
    };
    const c = new HealthController(okRedis as any, catalog as any, ds as any);
    const { res, codes } = sink();
    const anon = (await c.readiness(res)) as any;
    expect(codes).toEqual([503]);
    expect(anon.config).toBeUndefined();
    expect(anon.checks.postgresql).toBe('down');
    expect(anon.checks.redis).toBe('up');
    const wire = JSON.stringify(anon);
    expect(wire).not.toMatch(/ECONNREFUSED/);
    expect(wire).not.toMatch(/10\.0\.0\.7/);
    expect(wire).not.toMatch(/\d{4}/);

    const board = (await c.readiness(sink().res, staff)) as any;
    expect(board.config).toBeDefined();
    expect(board.checks.postgresql.error).toContain('ECONNREFUSED');
  });

  it('reports the database down when no DataSource is bound at all', async () => {
    const c = new HealthController(okRedis as any, catalog as any, null);
    const { res, codes } = sink();
    const r = (await c.readiness(res, staff)) as any;
    expect(r.checks.postgresql.status).toBe('down');
    expect(r.status).toBe('down');
    expect(codes).toEqual([503]);
  });

  it('reduces /health/metrics for anonymous callers, the same way as the board', async () => {
    const c = new HealthController(okRedis as any, catalog as any, null);
    expect(await c.metrics({ user: undefined } as any)).toEqual({ status: 'ok' });
    const full = (await c.metrics(staff)) as any;
    expect(full.memory).toBeDefined();
    expect(full.nodeVersion).toBe(process.version);
  });
});
