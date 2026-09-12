import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '@app/redis';
import { KafkaModule } from '@app/kafka';
import { RestaurantController } from './restaurant.controller';
import { RestaurantService } from './restaurant.service';
import { FranchiseViewService } from './franchise/franchise-view.service';

import {
  Restaurant,
  MenuCategory,
  MenuItem,
  RestaurantOrder,
  Reservation,
  RestaurantReview,
  RestaurantTable,
  RestaurantPromotion,
  RestaurantStaff,
} from './entities';

const ENTITIES = [
  Restaurant,
  MenuCategory,
  MenuItem,
  RestaurantOrder,
  Reservation,
  RestaurantReview,
  RestaurantTable,
  RestaurantPromotion,
  RestaurantStaff,
];
import { HealthModule, buildEnvSchema, Joi } from '@app/common';
import { assertSynchronizeAllowed, databaseCredentials } from '@app/database';
import { resolveRestaurantDbConfig, RESTAURANT_DB_SCHEMA } from './db-config';

const envSchema = buildEnvSchema({
  RESTAURANT_TCP_PORT: Joi.number().default(4018),
  // Must match this service's own main.ts. @nestjs/config writes validated
  // defaults BACK into process.env, and main.ts reads process.env after the
  // app is created — so a wrong default here silently moves the port the
  // service actually listens on, and the k8s probe then points at nothing.
  RESTAURANT_SERVICE_PORT: Joi.number().default(3019),
});

@Module({
  imports: [
    HealthModule.register({ service: 'restaurant-service', database: true, redis: true }),
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
        ...resolveRestaurantDbConfig((key) => cfg.get<string>(key)),
        // Fixed, not configurable: each entity names this schema too.
        schema: RESTAURANT_DB_SCHEMA,
        // Explicit classes, never a __dirname glob — the bundled build makes the
        // glob match nothing, leaving TypeORM with no metadata and every
        // DB-backed route throwing while /health still returns 200.
        entities: ENTITIES,
        // Matches marketplace-service: each vertical owns a dedicated schema, so a
        // dev auto-sync cannot collide with another service's tables. Was gated on
        // DB_SYNCHRONIZE, which is explicitly false, so these tables were never
        // created and every query failed with "relation ... does not exist".
        // Production still uses migrations - see migrations/1786500000000.
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
          'restaurant-service',
        ),
      }),
    }),
    TypeOrmModule.forFeature(ENTITIES),
    RedisModule,
    KafkaModule,
  ],
  controllers: [RestaurantController],
  providers: [RestaurantService, FranchiseViewService],
  exports: [RestaurantService],
})
export class RestaurantServiceModule {}
