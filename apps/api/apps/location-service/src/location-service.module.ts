import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '@app/redis';
import { DatabaseModule } from '@app/database';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Region, State, District, City, Pincode, DeliveryZone, ServiceArea } from './entities';
import { LocationController } from './location.controller';
import { LocationService } from './location.service';
import { HealthModule, buildEnvSchema, Joi } from '@app/common';

/**
 * Validated at boot, which is where a misconfiguration is cheapest.
 *
 * `buildEnvSchema()` carries the production refusal of SKIP_DB / SKIP_KAFKA /
 * SKIP_REDIS — each swaps a shared store for an in-process emulator — and that
 * refusal is only ever reached through `validationSchema`. This module called
 * a bare `ConfigModule.forRoot`, so it loaded no schema and the guard was
 * written, tested, and absent from this process.
 *
 * The port defaults must equal this service's own main.ts defaults:
 * @nestjs/config writes validated defaults BACK into process.env, and main.ts
 * reads process.env after the app is created — so a wrong default here silently
 * moves the port the service listens on, and `npm run registry:check` is what
 * catches the disagreement.
 */
const envSchema = buildEnvSchema({
  LOCATION_SERVICE_PORT: Joi.number().port().default(3023),
  LOCATION_TCP_PORT: Joi.number().port().default(4013),
});

@Module({
  imports: [
    HealthModule.register({ service: 'location-service', database: true, redis: true }),
    ConfigModule.forRoot({ isGlobal: true, validationSchema: envSchema }),
    RedisModule,
    DatabaseModule.registerPostgres(
      [Region, State, District, City, Pincode, DeliveryZone, ServiceArea],
      'location',
    ),
    TypeOrmModule.forFeature([Region, State, District, City, Pincode, DeliveryZone, ServiceArea]),
  ],
  controllers: [LocationController],
  providers: [LocationService],
})
export class LocationServiceModule {}
