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
import { assertSynchronizeAllowed, databaseCredentials } from '@app/database';
import { resolveGroceryDbConfig, GROCERY_DB_SCHEMA } from './db-config';
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
        // Kept for the two things it owns: the SSL policy, and the production
        // guard that refuses to boot with the built-in development password
        // when NODE_ENV=production. The connection target itself is overridden
        // immediately below, by the resolver the CLI runner shares.
        ...databaseCredentials(cfg),
        // One resolver, shared with data-source.ts — see ./db-config.ts. The
        // two used to resolve these five values separately, with different
        // last resorts, so without a module .env the CLI and the service
        // reached different databases.
        ...resolveGroceryDbConfig((key) => cfg.get<string>(key)),
        // Fixed, not configurable: each entity names this schema too.
        schema: GROCERY_DB_SCHEMA,
        entities: GROCERY_ENTITIES,
        // Auto-sync is refused, everywhere, by two independent guards:
        //
        //   • `validateDatabaseConfig()` in main.ts throws on DB_SYNCHRONIZE=true
        //     in EVERY environment — there is no dev escape hatch, and asking
        //     for one is a fatal boot, not a warning;
        //   • `assertSynchronizeAllowed()` here throws when auto-sync survives
        //     as far as this factory under NODE_ENV=production — reachable when
        //     SKIP_DB=true has skipped the first guard (AUD2-070).
        //
        // The schema comes from `migrations/` and nothing else (IN3). To iterate
        // on entities, generate a migration against a scratch database:
        // `docs/guides/database-migrations.md`, "Generating a migration". The
        // previous `NODE_ENV !== 'production'` default is why annotating an
        // existing column made dev auto-sync DROP and recreate it — which
        // emptied that column three times during the regional plan.
        synchronize: assertSynchronizeAllowed(
          cfg.get('DB_SYNCHRONIZE', 'false') === 'true',
          cfg.get('NODE_ENV', 'development'),
          'grocery-service',
        ),
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
