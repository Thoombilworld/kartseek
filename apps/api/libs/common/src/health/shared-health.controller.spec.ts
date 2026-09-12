import { describe, it, expect, vi } from 'vitest';
import { SharedHealthController } from './shared-health.controller';

/**
 * What `readinessProbe` actually reads.
 *
 * Kubernetes' `httpGet` probe and Docker's `curl -f` HEALTHCHECK decide pass or
 * fail from the **status line alone** — neither parses the body. So a readiness
 * route that answers `200 OK` with `{"status":"down"}` is, to the only consumer
 * that can act on it, indistinguishable from a healthy pod: the endpoint reaches
 * the database, discovers it is gone, and still tells the load balancer to keep
 * sending production traffic. That is the same unfalsifiable health as the TCP
 * probe this work replaced, one layer up, which is why these cases assert the
 * code and not the JSON.
 */
const sink = () => {
  const codes: number[] = [];
  return { res: { status: (c: number) => codes.push(c) }, codes };
};

const svc = (status: string, checks: Record<string, unknown>) =>
  ({
    live: async () => ({ status: 'ok', service: 's' }),
    ready: async () => ({ status, service: 's', timestamp: 'T', checks }),
  }) as any;

describe('SharedHealthController readiness transport', () => {
  it('answers 503 when a dependency is down', async () => {
    const { res, codes } = sink();
    const c = new SharedHealthController(
      svc('down', { database: { status: 'down', error: 'connect ECONNREFUSED 10.0.0.7:5432' } }),
    );
    const body = await c.ready(res as any);
    expect(codes).toEqual([503]);
    expect(body.status).toBe('down');
  });

  it('answers 200 when merely degraded — a probe must not evict for a warm cache', async () => {
    const { res, codes } = sink();
    const c = new SharedHealthController(
      svc('degraded', { redis: { status: 'degraded', emulated: true } }),
    );
    await c.ready(res as any);
    expect(codes).toEqual([200]);
  });

  it('answers 200 when ready', async () => {
    const { res, codes } = sink();
    const c = new SharedHealthController(
      svc('ready', { database: { status: 'up', latencyMs: 2, detail: 'SELECT 1' } }),
    );
    await c.ready(res as any);
    expect(codes).toEqual([200]);
  });

  /**
   * These 25 processes run no authentication at all, so every caller of
   * `/health/ready` is anonymous. A connection-level Postgres failure throws
   * `connect ECONNREFUSED <host>:<port>`, which would put the internal address
   * of the database into an unauthenticated body during the one moment — a real
   * outage — when that is worst. The wire carries the verdict; the reason goes
   * to the service's own log, where `HealthService` already writes it.
   */
  it('never puts driver error text, a host or a port on the wire', async () => {
    const { res } = sink();
    const c = new SharedHealthController(
      svc('down', {
        database: {
          status: 'down',
          latencyMs: 14,
          detail: 'SELECT 1',
          error: 'connect ECONNREFUSED 10.0.0.7:5432',
        },
        redis: { status: 'up', latencyMs: 1, detail: 'PONG' },
      }),
    );
    const body = await c.ready(res as any);
    expect(body).toEqual({ status: 'down', checks: { database: 'down', redis: 'up' } });
    const wire = JSON.stringify(body);
    expect(wire).not.toMatch(/ECONNREFUSED/);
    expect(wire).not.toMatch(/10\.0\.0\.7/);
    expect(wire).not.toMatch(/\d{4}/);
    expect(wire).not.toMatch(/SELECT 1/);
  });

  it('liveness stays a process answer: no dependency sweep, no status override', async () => {
    const { res, codes } = sink();
    const ready = vi.fn();
    const c = new SharedHealthController({
      live: async () => ({ status: 'ok', service: 'order-service' }),
      ready,
    } as any);
    expect((await c.live()).status).toBe('ok');
    expect(ready).not.toHaveBeenCalled();
    expect(codes).toEqual([]);
    void res;
  });
});
