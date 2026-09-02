import { Injectable, type CanActivate, type ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class RegionIsolationGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const regionCode = request.headers['x-region-code'];

    if (!user) {
      return false;
    }

    // Admins or Sellers assigned to a specific region should only access that region
    if (user.regionScope && user.regionScope !== 'ALL') {
      if (regionCode && regionCode !== user.regionScope) {
        throw new ForbiddenException(`Access to region ${regionCode} is denied for your profile.`);
      }
      
      // Override the header/query to ensure downstream services filter correctly
      request.headers['x-region-code'] = user.regionScope;
      if (request.query) {
        request.query.region = user.regionScope;
      }
    }

    return true;
  }
}
