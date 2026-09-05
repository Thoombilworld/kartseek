import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KafkaModule } from '@app/kafka';
import { RedisModule } from '@app/redis';
import { OrderController } from './order.controller';
import { HealthController } from './health.controller';
import { OrderService } from './order.service';
import { Order } from './entities/order.entity';
import { databaseCredentials } from '@app/database';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule], inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres' as const,        ...databaseCredentials(cfg),
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
  controllers: [OrderController, HealthController],
  providers: [OrderService],
})
export class OrderServiceModule {}
