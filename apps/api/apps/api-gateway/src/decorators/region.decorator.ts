import { SetMetadata } from '@nestjs/common';

/**
 * Marks an endpoint as requiring region enforcement.
 * When applied, the RegionGuard will check that the request's
 * region parameter matches the user's assigned regionCode.
 *
 * @example
 *   @RequireRegion()
 *   @Get('sellers')
 *   findSellers(@Query('region') region: string) { ... }
 */
export const REQUIRE_REGION_KEY = 'require_region';
export const RequireRegion = () => SetMetadata(REQUIRE_REGION_KEY, true);
