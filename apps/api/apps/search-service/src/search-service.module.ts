import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '@app/redis';
import { KafkaModule } from '@app/kafka';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { HealthModule, buildEnvSchema, Joi } from '@app/common';
import { ElasticsearchHealthCheck } from './elasticsearch-health.check';

/**
 * Validated at boot, which is where a misconfiguration is cheapest.
 *
 * `buildEnvSchema()` carries the production refusal of SKIP_DB / SKIP_KAFKA /
 * SKIP_REDIS — each swaps a shared store for an in-process emulator — and that
 * refusal is only ever reached through `validationSchema`. This module called
 * a bare `ConfigModule.forRoot`, so it loaded no schema and the guard was
 * written, tested, and absent from this process.
 *
 * The port defaults must equal this service's own main.ts defaults:
 * @nestjs/config writes validated defaults BACK into process.env, and main.ts
 * reads process.env after the app is created — so a wrong default here silently
 * moves the port the service listens on, and `npm run registry:check` is what
 * catches the disagreement.
 */
const envSchema = buildEnvSchema({
  SEARCH_SERVICE_PORT: Joi.number().port().default(3033),
  SEARCH_TCP_PORT: Joi.number().port().default(4023),
});

@Module({
  imports: [
    HealthModule.register({
      service: 'search-service',
      database: false,
      redis: true,
      checks: [ElasticsearchHealthCheck],
    }),
    ConfigModule.forRoot({ isGlobal: true, validationSchema: envSchema }),
    RedisModule,
    KafkaModule,
  ],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchServiceModule {}
