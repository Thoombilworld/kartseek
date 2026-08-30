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
import { buildEnvSchema, Joi } from '@app/common';
import { databaseCredentials } from '@app/database';

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
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: envSchema,
      validationOptions: { abortEarly: false },
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule], inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres' as const,
        ...databaseCredentials(cfg),
        schema: 'taxi',
        entities: ENTITIES,
        synchronize: cfg.get('DB_SYNCHRONIZE', 'false') === 'true',
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
export class TaxiModule {}
