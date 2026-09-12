// ── grocery-service.module.ts ────────────────────────────────────────────
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { RedisModule } from '@app/redis';
import { KafkaModule } from '@app/kafka';
import { GroceryController } from './grocery.controller';
import { GroceryGrpcController } from './transport/grpc.controller';
import { GroceryService } from './grocery.service';
import { GroceryAdminService } from './admin/admin.service';
import { FranchiseViewService } from './franchise/franchise-view.service';
import { GroceryCategory } from './entities/grocery-category.entity';
import { GroceryStore } from './entities/grocery-store.entity';
import { GroceryItem } from './entities/grocery-item.entity';
import { GroceryOrder } from './entities/grocery-order.entity';
import { GroceryFlashDeal } from './entities/grocery-flash-deal.entity';
import { GroceryReview } from './entities/grocery-review.entity';
import { GroceryWishlist } from './entities/grocery-wishlist.entity';
import { GroceryDeliveryZone } from './entities/grocery-delivery-zone.entity';
import { GrocerySetting } from './entities/grocery-setting.entity';
import { HealthModule, buildEnvSchema, Joi } from '@app/common';
import { databaseCredentials } from '@app/database';
import {
  GroceryBrand,
  GroceryProductVariant,
  GroceryStockMovement,
  GroceryWarehouse,
  GroceryVariantStock,
} from './entities';

// Entity list is written out once and reused for both `forRoot` and `forFeature`.
// They drifted apart in other services — a repository registered for an entity the
// connection did not load fails at injection time, and vice versa the table is
// simply never created by `synchronize`.
const GROCERY_ENTITIES = [
  GroceryBrand,
  GroceryProductVariant,
  GroceryStockMovement,
  GroceryWarehouse,
  GroceryVariantStock,
  GroceryCategory,
  GroceryStore,
  GroceryItem,
  GroceryOrder,
  GroceryFlashDeal,
  GroceryReview,
  GroceryWishlist,
  GroceryDeliveryZone,
  GrocerySetting,
];

const envSchema = buildEnvSchema({
  GROCERY_TCP_PORT: Joi.number().default(4008),
  GROCERY_GRPC_PORT: Joi.number().default(5010),
  GROCERY_SERVICE_PORT: Joi.number().default(3018),
});

@Module({
  imports: [
    HealthModule.register({ service: 'grocery-service', database: true, redis: true }),
    ConfigModule.forRoot({
      isGlobal: true,
      // Resolved against process.cwd(). As an extracted microservice this is
      // started from its own directory, so its own `.env` wins; the platform
      // file stays as a fallback for the ~120 shared values (Redis, Kafka
      // brokers, JWT secret) rather than copying them per module.
      envFilePath: ['.env', '../../../apps/api/.env'],
      validationSchema: envSchema,
      // `validationOptions: { abortEarly: false }` was removed for
      // @nestjs/config v12: it validates through Standard Schema now, and
      // `abortEarly` is a Joi option the new type does not accept. Joi still
      // works as the schema — what changes is that a bad .env reports its
      // first problem rather than all of them, so fixing one may reveal the
      // next.
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        // Dedicated GROCERY_DB_* values win; anything unset falls back to the
        // shared DB_* credentials, so pointing this module at its own database
        // is config, not a code change, and a partial override is valid.
        // `databaseCredentials` still supplies the password default and its
        // production guard.
        ...databaseCredentials(cfg),
        host: cfg.get<string>('GROCERY_DB_HOST') || cfg.get<string>('DB_HOST', 'localhost'),
        port: cfg.get<number>('GROCERY_DB_PORT') || cfg.get<number>('DB_PORT', 5432),
        username: cfg.get<string>('GROCERY_DB_USER') || cfg.get<string>('DB_USER', 'postgres'),
        password: cfg.get<string>('GROCERY_DB_PASSWORD') || databaseCredentials(cfg).password,
        database: cfg.get<string>('GROCERY_DB_NAME') || cfg.get<string>('DB_NAME', 'kartseek_db'),
        // Fixed, not configurable: the same entity definitions must work whether
        // this points at the dedicated instance or back at shared Postgres.
        schema: 'grocery',
        entities: GROCERY_ENTITIES,
        // Matches marketplace-service: each vertical owns a dedicated schema, so a
        // dev auto-sync cannot collide with another service's tables. Was gated on
        // DB_SYNCHRONIZE, which is explicitly false, so these tables were never
        // created and every query failed with "relation ... does not exist".
        // Production still uses migrations - see migrations/1786500000000.
        synchronize: cfg.get('NODE_ENV', 'development') !== 'production',
        /*
         * An explicit pool, because the default is a platform-wide ceiling.
         *
         * node-postgres opens up to 10 connections per process when no size is
         * given. This platform runs 25 services against one Postgres whose
         * `max_connections` is 100, so the defaults alone reserve 250 — two and
         * a half times what the database will grant. Nothing fails in
         * development, where only a handful of services are up; under real load
         * the services that start last simply cannot acquire a connection.
         *
         * Five per service fits 25 services into 125 with the ceiling raised
         * modestly, and is ample for a service whose reads are Redis-cached.
         * Raising this is a decision about the *database*, not this service, so
         * it reads from the environment rather than being fixed here.
         */
        extra: {
          max: cfg.get<number>('DB_POOL_SIZE', 5),
          // Do not let a stalled checkout wait forever for a connection; failing
          // fast surfaces exhaustion as an error instead of a hung request.
          connectionTimeoutMillis: cfg.get<number>('DB_POOL_TIMEOUT_MS', 10_000),
          idleTimeoutMillis: 30_000,
        },
      }),
    }),
    TypeOrmModule.forFeature(GROCERY_ENTITIES),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    RedisModule,
    KafkaModule,
  ],
  // The gRPC controller is separate from the HTTP/TCP one so the transports
  // cannot quietly share request handling; both delegate to the same services.
  controllers: [GroceryController, GroceryGrpcController],
  providers: [
    GroceryService,
    GroceryAdminService,
    FranchiseViewService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class GroceryServiceModule {}
