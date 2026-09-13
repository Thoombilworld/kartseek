import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KafkaModule } from '@app/kafka';
import { RedisModule } from '@app/redis';
import { SecurityModule } from '@app/security';
import { ThrottlerModule } from '@nestjs/throttler';
import { TaxiController } from './taxi.controller';
import { TaxiAdminController } from './admin/admin.controller';
import { TaxiAdminService } from './admin/admin.service';
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
import { resolveTaxiDbConfig, TAXI_DB_SCHEMA } from './db-config';

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
        // SSL, the pool, the connect timeout and the retry policy — one policy
        // for every service (AUD2-033). The connection target itself is
        // overridden immediately below, by the resolver the CLI runner shares.
        //
        // The prefix matters: this module reads `TAXI_DB_PASSWORD`, not
        // `DB_PASSWORD`, and its .env.example declares only the former. Without
        // it the helper refused to boot on a variable this service never uses —
        // masked in-repo by the fallback to apps/api/.env, fatal for a module
        // lifted out of this repository into an image of its own.
        ...databaseCredentials(cfg, { envPrefix: 'TAXI_DB' }),
        // One resolver, shared with data-source.ts — see ./db-config.ts. The
        // two used to resolve these five values separately, with different
        // last resorts, so without a module .env the CLI and the service
        // reached different databases.
        ...resolveTaxiDbConfig((key) => cfg.get<string>(key)),
        // Fixed, not configurable: each entity names this schema too.
        schema: TAXI_DB_SCHEMA,
        entities: ENTITIES,
        // The schema comes from `migrations/`, and from nothing else.
        //
        // What stood here was the rationale for allowing a development
        // auto-sync — "each vertical owns a dedicated schema, so an auto-sync
        // cannot collide with another service's tables" — written when
        // DB_SYNCHRONIZE being false meant these tables were never created at
        // all. IN3 gave this module a migration folder, so that reasoning is
        // spent, and leaving it in place argued for the opposite of what the
        // two guards below now enforce (IN3 review N1).
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
          'taxi-service',
        ),
      }),
    }),
    TypeOrmModule.forFeature(ENTITIES),
    RedisModule,
    KafkaModule.forService('taxi-service'),
    SecurityModule,
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
  ],
  // TaxiAdminController is the second controller on purpose: the seven
  // `admin.taxi.*` commands M7 owns live in `src/admin/`, beside their own
  // service and DTOs, rather than being bolted onto the bottom of the
  // storefront controller — the shape M3–M6 settled on for the other five
  // verticals. The sixteen admin commands that already had a handler stay on
  // `TaxiController` until the taxi plan moves them.
  controllers: [TaxiController, TaxiAdminController],
  providers: [
    TaxiAdminService,
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
    TaxiAdminService,
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
