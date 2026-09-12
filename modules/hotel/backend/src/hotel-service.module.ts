import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';

import { RedisModule } from '@app/redis';
import { KafkaModule } from '@app/kafka';
import { HotelController } from './hotel.controller';
import { HotelService } from './hotel.service';
import { HotelOwnerController } from './owner/owner.controller';
import { HotelAdminController } from './admin/admin.controller';
import { HotelWebhookController } from './webhooks/webhook.controller';

// ── Entities ──────────────────────────────────────────────────────────────────
import { Hotel } from './entities/hotel.entity';
import { HotelRoom } from './entities/hotel-room.entity';
import { HotelBooking } from './entities/hotel-booking.entity';
import { HotelReview } from './entities/hotel-review.entity';
import { HotelOwner } from './entities/hotel-owner.entity';
import { HotelGuest } from './entities/hotel-guest.entity';
import { HotelPayout } from './entities/hotel-payout.entity';
import { HotelStaff } from './entities/hotel-staff.entity';
import { HotelSeasonalPricing } from './entities/hotel-seasonal-pricing.entity';

const ENTITIES = [
  Hotel,
  HotelRoom,
  HotelBooking,
  HotelReview,
  HotelOwner,
  HotelGuest,
  HotelPayout,
  HotelStaff,
  HotelSeasonalPricing,
];
import { HealthModule, buildEnvSchema, Joi } from '@app/common';
import { assertSynchronizeAllowed, databaseCredentials } from '@app/database';
import { resolveHotelDbConfig, HOTEL_DB_SCHEMA } from './db-config';

const envSchema = buildEnvSchema({
  HOTEL_TCP_PORT: Joi.number().default(4025),
  // Must match this service's own main.ts. @nestjs/config writes validated
  // defaults BACK into process.env, and main.ts reads process.env after the
  // app is created — so a wrong default here silently moves the port the
  // service actually listens on, and the k8s probe then points at nothing.
  HOTEL_SERVICE_PORT: Joi.number().default(3035),
});

@Module({
  imports: [
    HealthModule.register({ service: 'hotel-service', database: true, redis: true }),
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
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres' as const, // Dedicated HOTEL_DB_* values win; anything unset falls back to the
        // Kept for the two things it owns: the SSL policy, and the production
        // guard that refuses to boot with the built-in development password
        // when NODE_ENV=production. The connection target itself is overridden
        // immediately below, by the resolver the CLI runner shares.
        ...databaseCredentials(cfg),
        // One resolver, shared with data-source.ts — see ./db-config.ts. The
        // two used to resolve these five values separately, with different
        // last resorts, so without a module .env the CLI and the service
        // reached different databases.
        ...resolveHotelDbConfig((key) => cfg.get<string>(key)),
        // Fixed, not configurable: each entity names this schema too.
        schema: HOTEL_DB_SCHEMA,
        entities: ENTITIES,
        // See marketplace-service: dedicated schema, so dev auto-sync is safe.
        // DB_SYNCHRONIZE is explicitly false, so hotel's tables were never created.
        // Production uses migrations - see migrations/1786500000000.
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
          'hotel-service',
        ),
      }),
    }),
    TypeOrmModule.forFeature(ENTITIES),
    RedisModule,
    KafkaModule,
  ],
  controllers: [
    HotelController,
    HotelOwnerController,
    HotelAdminController,
    HotelWebhookController,
  ],
  providers: [HotelService],
})
export class HotelServiceModule {}
