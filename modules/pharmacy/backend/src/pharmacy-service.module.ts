import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '@app/redis';
import { KafkaModule } from '@app/kafka';
import { PharmacyController } from './pharmacy.controller';
import { PharmacyService } from './pharmacy.service';
import { FranchiseViewService } from './franchise/franchise-view.service';

import {
  PharmacyStore, PharmacyCategory, PharmacyItem,
  PharmacyOrder, Prescription, PharmacyReview,
  PharmacyStaff, PharmacyPromotion,
} from './entities';

const ENTITIES = [
  PharmacyStore, PharmacyCategory, PharmacyItem,
  PharmacyOrder, Prescription, PharmacyReview,
  PharmacyStaff, PharmacyPromotion,
];
import { buildEnvSchema, Joi } from '@app/common';
import { databaseCredentials } from '@app/database';

const envSchema = buildEnvSchema({
  PHARMACY_TCP_PORT: Joi.number().default(4010),
  // Must match this service's own main.ts. @nestjs/config writes validated
  // defaults BACK into process.env, and main.ts reads process.env after the
  // app is created — so a wrong default here silently moves the port the
  // service actually listens on, and the k8s probe then points at nothing.
  PHARMACY_SERVICE_PORT: Joi.number().default(3020),
});

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Resolved against process.cwd(). As an extracted microservice this is
      // started from its own directory, so its own `.env` wins; the platform
      // file stays as a fallback for the ~120 shared values.
      envFilePath: ['.env', '../../../apps/api/.env'],
      validationSchema: envSchema,
      validationOptions: { abortEarly: false },
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        // Dedicated PHARMACY_DB_* values win; anything unset falls back to the
        // shared DB_* credentials. `databaseCredentials` still supplies the
        // password default and its production guard.
        ...databaseCredentials(cfg),
        host: cfg.get<string>('PHARMACY_DB_HOST') || cfg.get<string>('DB_HOST', 'localhost'),
        port: cfg.get<number>('PHARMACY_DB_PORT') || cfg.get<number>('DB_PORT', 5432),
        username: cfg.get<string>('PHARMACY_DB_USER') || cfg.get<string>('DB_USER', 'postgres'),
        password: cfg.get<string>('PHARMACY_DB_PASSWORD') || databaseCredentials(cfg).password,
        database: cfg.get<string>('PHARMACY_DB_NAME') || cfg.get<string>('DB_NAME', 'kartseek_db'),
        // Fixed, not configurable: the same entities must work against either.
        schema: 'pharmacy',
        // Explicit classes, never a __dirname glob: the build bundles this
        // service into a single dist/apps/<svc>/main.js, so the glob matches
        // zero files and TypeORM starts with no metadata — boot and /health
        // still succeed while every DB-backed route 500s.
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
  controllers: [PharmacyController],
  providers: [PharmacyService, FranchiseViewService],
  exports: [PharmacyService],
})
export class PharmacyServiceModule {}
