import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '@app/redis';
import { KafkaModule } from '@app/kafka';
import { RestaurantController } from './restaurant.controller';
import { RestaurantService } from './restaurant.service';
import { FranchiseViewService } from './franchise/franchise-view.service';

import {
  Restaurant, MenuCategory, MenuItem,
  RestaurantOrder, Reservation, RestaurantReview,
  RestaurantTable, RestaurantPromotion, RestaurantStaff,
} from './entities';

const ENTITIES = [
  Restaurant, MenuCategory, MenuItem,
  RestaurantOrder, Reservation, RestaurantReview,
  RestaurantTable, RestaurantPromotion, RestaurantStaff,
];
import { buildEnvSchema, Joi } from '@app/common';
import { databaseCredentials } from '@app/database';

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
    ConfigModule.forRoot({
      isGlobal: true,
      // Resolved against process.cwd(). As an extracted microservice this is
      // started from its own directory, so its own `.env` wins; the platform
      // file stays as a fallback for the ~120 shared values (Redis, Kafka
      // brokers, JWT secret) rather than copying them per module.
      envFilePath: ['.env', '../../../apps/api/.env'],
      validationSchema: envSchema,
      validationOptions: { abortEarly: false },
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        // Dedicated RESTAURANT_DB_* values win; anything unset falls back to the
        // shared DB_* credentials, so pointing this module at its own database is
        // config, not a code change. `databaseCredentials` still supplies the
        // password default and its production guard.
        ...databaseCredentials(cfg),
        host: cfg.get<string>('RESTAURANT_DB_HOST') || cfg.get<string>('DB_HOST', 'localhost'),
        port: cfg.get<number>('RESTAURANT_DB_PORT') || cfg.get<number>('DB_PORT', 5432),
        username: cfg.get<string>('RESTAURANT_DB_USER') || cfg.get<string>('DB_USER', 'postgres'),
        password: cfg.get<string>('RESTAURANT_DB_PASSWORD') || databaseCredentials(cfg).password,
        database: cfg.get<string>('RESTAURANT_DB_NAME') || cfg.get<string>('DB_NAME', 'kartseek_db'),
        // Fixed, not configurable: the same entity definitions must work whether
        // this points at the dedicated instance or back at shared Postgres.
        schema: 'restaurant',
        // Explicit classes, never a __dirname glob — the bundled build makes the
        // glob match nothing, leaving TypeORM with no metadata and every
        // DB-backed route throwing while /health still returns 200.
        entities: ENTITIES,
        // Matches marketplace-service: each vertical owns a dedicated schema, so a
        // dev auto-sync cannot collide with another service's tables. Was gated on
        // DB_SYNCHRONIZE, which is explicitly false, so these tables were never
        // created and every query failed with "relation ... does not exist".
        // Production still uses migrations - see migrations/1786500000000.
        synchronize: cfg.get('NODE_ENV', 'development') !== 'production',
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
