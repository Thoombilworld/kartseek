import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KafkaModule } from '@app/kafka';
import { RedisModule } from '@app/redis';
import { DeliveryController } from './delivery.controller';
import { DeliveryService } from './delivery.service';
import { databaseCredentials } from '@app/database';
import { buildEnvSchema } from '@app/common';

/**
 * The minimum: `buildEnvSchema()` with no module variables of its own.
 *
 * This module is not the one `main.ts` bootstraps — see the sibling
 * `delivery-service.module.ts` — but it declares a `ConfigModule.forRoot`, and the
 * coverage spec deliberately keeps no exclusion list, because an exclusion list
 * is where the next genuinely unvalidated module would hide.
 */
const envSchema = buildEnvSchema();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema: envSchema }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres' as const,
        ...databaseCredentials(cfg),
        schema: 'delivery',
        // Empty by design: this service owns no SQL entities and injects no
        // repositories. List classes explicitly if that changes — a __dirname
        // glob matches nothing once the build bundles the service into a single
        // main.js, which fails silently (boot and /health stay green).
        entities: [],
        synchronize: cfg.get('DB_SYNCHRONIZE', 'false') === 'true',
      }),
    }),
    RedisModule,
    KafkaModule,
  ],
  controllers: [DeliveryController],
  providers: [DeliveryService],
})
export class DeliveryModule {}
