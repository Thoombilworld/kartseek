import { Module, Global, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { RedisModule } from '@app/redis';
import { RegionService } from './region.service';
import { RegionMiddleware } from './region.middleware';
import { RegionGuard } from './region.guard';
import { IndiaPinCodeService } from './india-pincode.service';

/**
 * RegionModule — Global module that provides region detection, scoping,
 * and management across the entire KARTSEEK backend.
 *
 * Provides:
 *  - RegionService      : region detection, config lookup, stats
 *  - RegionGuard        : route guard for region-scoped endpoints
 *  - IndiaPinCodeService: India PIN code lookup and delivery serviceability
 *
 * Import once in AppModule — all controllers automatically get region
 * resolution via middleware.
 */
@Global()
@Module({
  imports: [RedisModule],
  providers: [RegionService, RegionGuard, IndiaPinCodeService],
  exports: [RegionService, RegionGuard, IndiaPinCodeService],
})
export class RegionModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply region detection middleware to all routes
    consumer.apply(RegionMiddleware).forRoutes('*');
  }
}
