import { Injectable, type CanActivate, type ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REGION_REQUIRED_KEY, BYPASS_REGION_KEY } from './region.decorator';
import { isActiveRegion, ACTIVE_REGION_CODES } from './region.config';

/**
 * RegionGuard — Enforces that requests to @RegionRequired() endpoints
 * have a valid, resolved region code. Returns 403 if missing.
 */
@Injectable()
export class RegionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if endpoint bypasses region
    const bypass = this.reflector.getAllAndOverride<boolean>(BYPASS_REGION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (bypass) return true;

    // Check if endpoint requires region
    const required = this.reflector.getAllAndOverride<boolean>(REGION_REQUIRED_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

    const request = context.switchToHttp().getRequest();
    const regionCode = request.regionCode;

    // The error used to list SUPPORTED_COUNTRIES — all ten registry entries —
    // which told a caller to send a header for a market that would then be
    // rejected downstream. It names the markets actually open for business.
    if (!regionCode || !isActiveRegion(regionCode)) {
      throw new ForbiddenException(
        `Valid region code required. Send X-Region-Code header with one of: ${ACTIVE_REGION_CODES.join(', ')}`,
      );
    }

    return true;
  }
}
