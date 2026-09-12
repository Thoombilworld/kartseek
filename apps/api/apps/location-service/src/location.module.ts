import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { RedisModule } from '@app/redis';
import { LocationController } from './location.controller';
import { LocationService } from './location.service';
import { buildEnvSchema } from '@app/common';

/**
 * The minimum: `buildEnvSchema()` with no module variables of its own.
 *
 * This module is not the one `main.ts` bootstraps — see the sibling
 * `location-service.module.ts` — but it declares a `ConfigModule.forRoot`, and the
 * coverage spec deliberately keeps no exclusion list, because an exclusion list
 * is where the next genuinely unvalidated module would hide.
 */
const envSchema = buildEnvSchema();

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, validationSchema: envSchema }), RedisModule],
  controllers: [LocationController],
  providers: [LocationService],
})
export class LocationModule {}
