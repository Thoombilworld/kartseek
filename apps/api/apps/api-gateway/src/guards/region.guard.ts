import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { REQUIRE_REGION_KEY } from '../decorators/region.decorator';

/**
 * RegionGuard — NestJS Guard
 *
 * Enforces region-scoped access on endpoints decorated with @RequireRegion().
 *
 * Flow:
 * 1. Reads `regionCode` and `regionLocked` from the JWT payload (decoded user).
 * 2. If `regionLocked` is true, extracts the target region from:
 *    - `request.query.region`
 *    - `request.body.region`
 *    - `request.params.region`
 * 3. If the target region doesn't match the user's `regionCode`, throws 403.
 * 4. If `regionLocked` is false (Super Admin / Admin), access is always granted.
 *
 * This guard runs AFTER RolesGuard and JwtAuthGuard, so `request.user` should
 * already be populated.
 */
@Injectable()
export class RegionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if endpoint requires region enforcement
    const requireRegion = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_REGION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requireRegion) {
      return true; // Endpoint doesn't require region enforcement
    }

    const request = context.switchToHttp().getRequest();
    let user = request.user;

    // If JwtAuthGuard hasn't run, try to decode the JWT
    if (!user || !user.regionCode) {
      const authHeader = request.headers?.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.substring(7);
          user = this.jwtService.verify(token);
          request.user = user;
        } catch {
          // Token invalid — let other guards handle this
          return true;
        }
      }
    }

    // If user is not region-locked, grant access
    if (!user?.regionLocked) {
      return true;
    }

    // Extract the target region from the request
    const targetRegion =
      request.query?.region ||
      request.body?.region ||
      request.body?.regionCode ||
      request.params?.region;

    // If no region specified in request, allow (the backend should filter by user's region)
    if (!targetRegion) {
      return true;
    }

    // Enforce: target region MUST match user's region
    if (targetRegion !== user.regionCode) {
      throw new ForbiddenException(
        `Access denied: Your account is restricted to region '${user.regionCode}'. ` +
        `Cannot access data for region '${targetRegion}'.`,
      );
    }

    return true;
  }
}
