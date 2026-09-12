import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RedisService } from '@app/redis';
import { HEALTH_CHECK, worstOf, type DependencyStatus, type HealthCheck } from './health.types';

export const HEALTH_SERVICE_NAME = Symbol('HEALTH_SERVICE_NAME');
/** What the registry says this service owns — see the constructor's last two arguments. */
export const HEALTH_EXPECTS_DATABASE = Symbol('HEALTH_EXPECTS_DATABASE');
export const HEALTH_EXPECTS_REDIS = Symbol('HEALTH_EXPECTS_REDIS');

/**
 * The one health implementation for every deployable.
 *
 * `live()` answers from the process alone — a liveness probe that consults a
 * database restarts a healthy pod when the database blinks.
 *
 * `ready()` is the opposite: it must prove Application → Database → Query →
 * Result. The previous gateway readiness opened a TCP socket to DB_HOST:DB_PORT
 * and called that "up", which cannot distinguish a listening Postgres from the
 * right database with the right password — a wrong password, a missing database
 * and a failed DataSource all reported up (AUD2-069). So this runs the query.
 */
@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startedAt = Date.now();

  constructor(
    @Inject(HEALTH_SERVICE_NAME) private readonly serviceName: string,
    @Optional() @Inject(DataSource) private readonly dataSource: DataSource | null,
    @Optional() @Inject(RedisService) private readonly redis: RedisService | null,
    @Optional() @Inject(HEALTH_CHECK) private readonly extra: HealthCheck[] | null,
    /**
     * The registry's declaration, passed through by `HealthModule.register`:
     * `services.yaml` gives this entry a `database` / lists `redis` in its
     * `dependsOn`. Without it an absent dependency is indistinguishable from a
     * dependency this service was never meant to have — a module whose
     * `TypeOrmModule.forRoot` failed to register would simply omit the
     * `database` key and answer `ready`, which is the same unfalsifiable health
     * one level up from the TCP probe this class replaces.
     */
    @Optional() @Inject(HEALTH_EXPECTS_DATABASE) private readonly expectsDatabase = false,
    @Optional() @Inject(HEALTH_EXPECTS_REDIS) private readonly expectsRedis = false,
  ) {}

  async live() {
    return {
      status: 'ok',
      service: this.serviceName,
      uptime: Math.round((Date.now() - this.startedAt) / 1000),
      nodeVersion: process.version,
      environment: process.env.NODE_ENV ?? 'development',
      timestamp: new Date().toISOString(),
    };
  }

  async ready() {
    const checks: Record<string, DependencyStatus> = {};

    if (this.dataSource) checks['database'] = await this.database();
    else if (this.expectsDatabase)
      checks['database'] = {
        status: 'down',
        error:
          'no DataSource is bound in this process, but the registry says this service owns one',
      };

    if (this.redis) checks['redis'] = await this.redisCheck();
    else if (this.expectsRedis)
      checks['redis'] = {
        status: 'down',
        error:
          'no RedisService is bound in this process, but the registry says this service needs one',
      };

    for (const c of this.extra ?? []) checks[c.name] = await this.guard(c);

    // `down` and `degraded` are separate verdicts because the controller turns
    // this field into the HTTP status a readiness probe reads: `down` is a 503
    // that takes the process out of the load balancer, `degraded` is a 200 that
    // keeps it in. Collapsing both — as this first did — makes a dead database
    // indistinguishable from an emulated cache and 503 unreachable.
    return {
      status: worstOf(checks),
      service: this.serviceName,
      timestamp: new Date().toISOString(),
      checks,
    };
  }

  /** `SELECT 1` through the service's own DataSource — credentials, database and pool included. */
  private async database(): Promise<DependencyStatus> {
    const t0 = Date.now();
    try {
      await this.dataSource!.query('SELECT 1');
      return { status: 'up', latencyMs: Date.now() - t0, detail: 'SELECT 1' };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`[health] database check failed: ${message}`);
      return { status: 'down', latencyMs: Date.now() - t0, detail: 'SELECT 1', error: message };
    }
  }

  private async redisCheck(): Promise<DependencyStatus> {
    try {
      return await this.redis!.health();
    } catch (err) {
      return { status: 'down', error: err instanceof Error ? err.message : String(err) };
    }
  }

  private async guard(c: HealthCheck): Promise<DependencyStatus> {
    try {
      return await c.run();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`[health] ${c.name} check failed: ${message}`);
      return { status: 'down', error: message };
    }
  }
}
