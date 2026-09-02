import { createParamDecorator, type ExecutionContext, SetMetadata } from '@nestjs/common';
import { type SupportedCountryCode } from './region.types';

/**
 * Custom header name used to identify the client's operational region.
 * Mobile apps send this after GPS/IP detection; web clients send it
 * from the region context.
 */
export const REGION_HEADER = 'x-region-code';

/**
 * @Region() — Parameter decorator to extract the resolved region code
 * from the request. Requires RegionMiddleware to have run first.
 *
 * @example
 * @Get('sellers')
 * findSellers(@Region() regionCode: SupportedCountryCode) { ... }
 */
export const Region = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SupportedCountryCode => {
    const request = ctx.switchToHttp().getRequest();
    return request.regionCode ?? 'IN';
  },
);

/**
 * @RegionRequired() — Method decorator to enforce region detection.
 * Used with RegionGuard to reject requests without a valid region.
 */
export const REGION_REQUIRED_KEY = 'region_required';
export const RegionRequired = () => SetMetadata(REGION_REQUIRED_KEY, true);

/**
 * @BypassRegion() — Method decorator to skip region enforcement.
 * Used on endpoints that should work globally (e.g., health checks).
 */
export const BYPASS_REGION_KEY = 'bypass_region';
export const BypassRegion = () => SetMetadata(BYPASS_REGION_KEY, true);
