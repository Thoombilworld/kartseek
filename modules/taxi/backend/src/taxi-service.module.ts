import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KafkaModule } from '@app/kafka';
import { RedisModule } from '@app/redis';
import { SecurityModule } from '@app/security';
import { ThrottlerModule } from '@nestjs/throttler';
import { TaxiController } from './taxi.controller';
import { TaxiService } from './taxi.service';
import { RideMatchingService } from './services/ride-matching.service';
import { FareCalculationService } from './services/fare-calculation.service';
import { DriverDispatchService } from './services/driver-dispatch.service';
import { VendorManagementService } from './services/vendor-management.service';
import { DriverOnboardingService } from './services/driver-onboarding.service';
import { TaxiConfigService } from './services/taxi-config.service';
import { TaxiPayoutService } from './services/taxi-payout.service';
import { ComplaintManagementService } from './services/complaint-management.service';
import {
  TaxiVendorEntity,
  TaxiDriverEntity,
  TaxiDocumentEntity,
  TaxiCountryConfigEntity,
  TaxiRateCardEntity,
  TaxiPayoutRecordEntity,
  TaxiComplaintEntity,
  TaxiDisciplinaryActionEntity,
  TaxiRideEntity,
} from './entities';
import { HealthModule, buildEnvSchema, Joi } from '@app/common';
import { assertSynchronizeAllowed, databaseCredentials } from '@app/database';

const envSchema = buildEnvSchema({
  TAXI_TCP_PORT: Joi.number().default(4027),
  // Must match this service's own main.ts. @nestjs/config writes validated
  // defaults BACK into process.env, and main.ts reads process.env after the
  // app is created — so a wrong default here silently moves the port the
  // service actually listens on, and the k8s probe then points at nothing.
  TAXI_SERVICE_PORT: Joi.number().default(3021),
});

// Shared by forRoot and forFeature. Explicit classes, never a __dirname glob —
// the bundled build makes the glob match nothing, leaving TypeORM with no
// metadata and every DB-backed route throwing while /health still returns 200.
const ENTITIES = [
  TaxiVendorEntity,
  TaxiDriverEntity,
  TaxiDocumentEntity,
  TaxiCountryConfigEntity,
  TaxiRateCardEntity,
  TaxiPayoutRecordEntity,
  TaxiComplaintEntity,
  TaxiDisciplinaryActionEntity,
  TaxiRideEntity,
];

@Module({
  imports: [
    HealthModule.register({ service: 'taxi-service', database: true, redis: true }),
    ConfigModule.forRoot({
      isGlobal: true,
      // Resolved against process.cwd(). As an extracted microservice this is
      // started from its own directory, so its own `.env` wins; the platform
      // file stays as a fallback for the ~120 shared values.
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
        type: 'postgres' as const,
        // Dedicated TAXI_DB_* values win; anything unset falls back to the
        // shared DB_* credentials. `databaseCredentials` still supplies the
        // password default and its production guard.
        ...databaseCredentials(cfg),
        host: cfg.get<string>('TAXI_DB_HOST') || cfg.get<string>('DB_HOST', 'localhost'),
        port: cfg.get<number>('TAXI_DB_PORT') || cfg.get<number>('DB_PORT', 5432),
        username: cfg.get<string>('TAXI_DB_USER') || cfg.get<string>('DB_USER', 'postgres'),
        password: cfg.get<string>('TAXI_DB_PASSWORD') || databaseCredentials(cfg).password,
        database: cfg.get<string>('TAXI_DB_NAME') || cfg.get<string>('DB_NAME', 'kartseek_db'),
        // Fixed, not configurable: the same entities must work against either.
        schema: 'taxi',
        entities: ENTITIES,
        // Matches the other verticals now that taxi owns its own database.
        //
        // This was gated on DB_SYNCHRONIZE, which is explicitly false because
        // the services used to share one database and an auto-sync could ALTER
        // another service's tables. The consequence here was that none of the
        // nine entities below ever became tables: the `taxi` schema existed in
        // kartseek_db with zero tables in it, so the service booted, answered
        // /health with 200, and failed every database-backed route with
        // "relation ... does not exist". Nothing created them — no migration
        // covers this schema either.
        //
        // With a dedicated kartseek_taxi database that risk is gone: an
        // auto-sync here cannot reach another service's tables. Production
        // still uses migrations.
        // Keyed on DB_SYNCHRONIZE so `validateDatabaseConfig()` and this factory
        // read the same value, and wrapped so a boot with auto-sync on under
        // NODE_ENV=production fails here rather than rewriting the schema
        // (AUD2-070).
        //
        // The default is OFF in every environment, development included. This
        // module's schema comes from `migrations/` and nothing else (IN3): the
        // previous `NODE_ENV !== 'production'` meant annotating an existing
        // column made dev auto-sync DROP and recreate it, which emptied the
        // column three times during the regional plan. Set DB_SYNCHRONIZE=true
        // deliberately, for an afternoon of entity iteration, and never against
        // a database whose rows matter.
        synchronize: assertSynchronizeAllowed(
          cfg.get('DB_SYNCHRONIZE', 'false') === 'true',
          cfg.get('NODE_ENV', 'development'),
          'taxi-service',
        ),
      }),
    }),
    TypeOrmModule.forFeature(ENTITIES),
    RedisModule,
    KafkaModule,
    SecurityModule,
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
  ],
  controllers: [TaxiController],
  providers: [
    TaxiService,
    RideMatchingService,
    FareCalculationService,
    DriverDispatchService,
    VendorManagementService,
    DriverOnboardingService,
    TaxiConfigService,
    TaxiPayoutService,
    ComplaintManagementService,
  ],
  exports: [
    TaxiService,
    RideMatchingService,
    FareCalculationService,
    DriverDispatchService,
    VendorManagementService,
    DriverOnboardingService,
    TaxiConfigService,
    TaxiPayoutService,
    ComplaintManagementService,
  ],
})
export class TaxiServiceModule {}
