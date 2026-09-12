import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';

import { RedisModule } from '@app/redis';
import { KafkaModule } from '@app/kafka';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PageLayout } from './entities/page-layout.entity';
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
  ADMIN_SERVICE_PORT: Joi.number().port().default(3027),
  ADMIN_TCP_PORT: Joi.number().port().default(4017),
});

@Module({
  imports: [
    HealthModule.register({ service: 'admin-service', database: true, redis: true }),
    ConfigModule.forRoot({ isGlobal: true, validationSchema: envSchema }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres' as const,
        ...databaseCredentials(cfg),
        // `public`, not `admin`. The `admin` schema holds `admin_roles` only;
        // `page_layouts` is `public.page_layouts`, and the gateway registers
        // the same entity against it. One table, one owner, one schema.
        schema: 'public',
        // Explicit classes, never a __dirname glob — the bundled build makes the
        // glob match nothing, leaving TypeORM with no metadata and every
        // DB-backed route throwing while /health still returns 200.
        entities: [PageLayout],
        synchronize: cfg.get('DB_SYNCHRONIZE', 'false') === 'true',
      }),
    }),
    TypeOrmModule.forFeature([PageLayout]),
    // The revenue report is a query over `"order".orders`, which order-service
    // owns; this service only owns the admin route in front of it. TCP, because
    // the report is request/response — a Kafka client would return nothing and
    // report success while doing it.
    //
    // The default must be order-service's own bind port (4004 in
    // `services.yaml`, `ORDER_TCP_PORT` in `env.validation.ts`). A mismatch is
    // silently masked whenever `.env` happens to set the variable, and then
    // shows up only as "Order service unavailable" in an environment that does
    // not.
    ClientsModule.register([
      {
        name: 'ORDER_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.ORDER_SERVICE_HOST ?? '127.0.0.1',
          port: +(process.env.ORDER_TCP_PORT ?? 4004),
        },
      },
    ]),
    RedisModule,
    KafkaModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminServiceModule {}
