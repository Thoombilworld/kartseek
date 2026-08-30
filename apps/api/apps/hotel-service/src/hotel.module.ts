import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';

import { RedisModule } from '@app/redis';
import { KafkaModule } from '@app/kafka';
import { HotelController } from './hotel.controller';
import { HotelService } from './hotel.service';
import { HotelOwnerController } from './hotel-owner.controller';
import { HotelAdminController } from './hotel-admin.controller';
import { HotelWebhookController } from './hotel-webhook.controller';

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

const ENTITIES = [Hotel, HotelRoom, HotelBooking, HotelReview, HotelOwner, HotelGuest, HotelPayout, HotelStaff, HotelSeasonalPricing];
import { buildEnvSchema, Joi } from '@app/common';
import { databaseCredentials } from '@app/database';

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
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: envSchema,
      validationOptions: { abortEarly: false },
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule], inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres' as const,        ...databaseCredentials(cfg),
        schema: 'hotel',
        entities: ENTITIES,
        // See marketplace-service: dedicated schema, so dev auto-sync is safe.
        // DB_SYNCHRONIZE is explicitly false, so hotel's tables were never created.
        // Production uses migrations - see migrations/1786500000000.
        synchronize: cfg.get('NODE_ENV', 'development') !== 'production',
      }),
    }),
    TypeOrmModule.forFeature(ENTITIES),
    RedisModule,
    KafkaModule,
  ],
  controllers: [HotelController, HotelOwnerController, HotelAdminController, HotelWebhookController],
  providers: [HotelService],
})
export class HotelModule {}
