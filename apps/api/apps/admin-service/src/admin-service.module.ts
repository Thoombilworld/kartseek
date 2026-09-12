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
import { HealthModule } from '@app/common';

@Module({
  imports: [
    HealthModule.register({ service: 'admin-service', database: true, redis: true }),
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres' as const,
        ...databaseCredentials(cfg),
        schema: 'admin',
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
