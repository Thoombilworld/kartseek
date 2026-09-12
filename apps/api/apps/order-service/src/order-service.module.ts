import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KafkaModule } from '@app/kafka';
import { RedisModule } from '@app/redis';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { Order } from './entities/order.entity';
import { databaseCredentials } from '@app/database';
import { HealthModule, buildEnvSchema, Joi } from '@app/common';

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
  ORDER_SERVICE_PORT: Joi.number().port().default(3014),
  ORDER_TCP_PORT: Joi.number().port().default(4004),
  ORDER_GRPC_PORT: Joi.number().port().default(5002),
});

@Module({
  imports: [
    HealthModule.register({ service: 'order-service', database: true, redis: true }),
    ConfigModule.forRoot({ isGlobal: true, validationSchema: envSchema }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres' as const,
        ...databaseCredentials(cfg),
        schema: 'order',
        // Listed explicitly, never as a `__dirname` glob: the build bundles this
        // service into a single main.js, where a glob matches nothing and fails
        // silently — boot and /health stay green while every DB route 500s.
        //
        // This was `entities: []` while OrderService kept orders in Redis alone,
        // so an order vanished after its 24h TTL and nothing survived a flush.
        entities: [Order],
        // Order rows are the system of record for money taken. Auto-sync stays
        // opt-in so a schema drift can never silently rewrite them in a deployed
        // environment; use a migration there.
        synchronize: cfg.get('DB_SYNCHRONIZE', 'false') === 'true',
      }),
    }),
    TypeOrmModule.forFeature([Order]),
    RedisModule,
    KafkaModule,
  ],
  controllers: [OrderController],
  providers: [OrderService],
})
export class OrderServiceModule {}
