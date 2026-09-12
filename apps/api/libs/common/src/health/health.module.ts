import { Module, type DynamicModule, type Provider, type Type } from '@nestjs/common';
import { SharedHealthController } from './shared-health.controller';
import {
  HealthService,
  HEALTH_EXPECTS_DATABASE,
  HEALTH_EXPECTS_REDIS,
  HEALTH_SERVICE_NAME,
} from './health.service';
import { HEALTH_CHECK, type HealthCheck } from './health.types';

export interface HealthModuleOptions {
  /** The name the routes report, e.g. 'order-service'. */
  service: string;
  /** True when this service registers TypeOrmModule.forRoot — readiness runs SELECT 1. */
  database?: boolean;
  /** True when this service imports RedisModule — readiness pings Redis. */
  redis?: boolean;
  /**
   * Extra dependency checks for stores only this service speaks to — Mongo in
   * audit-log-service, Elasticsearch in search-service. Each class is
   * instantiated here, so its own constructor dependencies must come from a
   * `@Global()` module (`MongooseCoreModule` and `ConfigModule.forRoot({
   * isGlobal: true })` both are) or be none at all.
   */
  checks?: Type<HealthCheck>[];
}

/**
 * `HealthModule.register({ service, database, redis })` — the `/health` and
 * `/health/ready` pair, identical in all 25 non-gateway deployables.
 *
 * Neither store is imported here. `TypeOrmModule.forRoot*` publishes
 * `DataSource` from a `@Global()` core module and `RedisModule` is itself
 * `@Global()`, so whatever the host module already registered is visible to
 * this one's providers. Importing `RedisModule` again would be worse than
 * redundant: loyalty-service and franchise-service register it as
 * `RedisModule.register({ keyPrefix })`, and a second, static import would
 * stand up a SECOND ioredis connection with no prefix — so health would ping a
 * client the service does not otherwise use.
 *
 * The two flags are therefore the registry's *declaration* rather than the
 * wiring: they are what lets readiness say "this service owns a database and
 * none is bound" instead of silently omitting the check.
 *
 * `checks` are collected into an array behind `HEALTH_CHECK` by a factory
 * rather than by repeating the token — Nest has no multi-provider concept, so
 * two providers on one token leave only the last, and a token bound in the
 * *host* module is not visible to a provider declared in this one.
 */
@Module({})
export class HealthModule {
  static register(opts: HealthModuleOptions): DynamicModule {
    const checks = opts.checks ?? [];
    const providers: Provider[] = [
      ...checks,
      { provide: HEALTH_CHECK, useFactory: (...c: HealthCheck[]) => c, inject: checks },
      HealthService,
      { provide: HEALTH_SERVICE_NAME, useValue: opts.service },
      { provide: HEALTH_EXPECTS_DATABASE, useValue: opts.database ?? false },
      { provide: HEALTH_EXPECTS_REDIS, useValue: opts.redis ?? false },
    ];
    return {
      module: HealthModule,
      controllers: [SharedHealthController],
      providers,
      exports: [HealthService],
    };
  }
}
