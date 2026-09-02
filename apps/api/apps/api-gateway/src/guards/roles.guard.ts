import { Injectable, type CanActivate, type ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Enhanced RolesGuard with permission validation.
 *
 * Supports two modes:
 * 1. **Role-based**: @Roles('SUPER_ADMIN', 'ADMIN') — checks user.role
 * 2. **Permission-based**: @Roles('perm:orders.manage') — checks user.adminPermissions
 *    Prefix any permission key with 'perm:' to use permission-based validation.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredRoles) {
      return true; // No roles required, access granted
    }

    const request = context.switchToHttp().getRequest();
    let user = request.user;

    // If JwtAuthGuard hasn't run, decode the JWT from the Authorization header
    if (!user || !user.role) {
      const authHeader = request.headers?.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.substring(7);
          user = this.jwtService.verify(token);
          request.user = user; // Attach for downstream use
        } catch {
          // Token invalid or expired — fall through to forbidden
        }
      }
    }

    if (!user || !user.role) {
      throw new ForbiddenException('You do not have permission to access this resource.');
    }

    // Separate role requirements from permission requirements
    const roleRequirements = requiredRoles.filter(r => !r.startsWith('perm:'));
    const permRequirements = requiredRoles.filter(r => r.startsWith('perm:')).map(r => r.slice(5));

    // Check role-based access
    if (roleRequirements.length > 0) {
      const userRoleUpper = user.role.toUpperCase();
      const hasRole = roleRequirements.some((role) => role.toUpperCase() === userRoleUpper);
      if (!hasRole) {
        throw new ForbiddenException('Insufficient permissions. Your role cannot perform this action.');
      }
    }

    // Check permission-based access (if any perm: prefixed values).
    //
    // A user with no `adminPermissions` holds none of them, so the check must
    // deny. Guarding the branch on `&& user.adminPermissions` instead meant a
    // route protected only by `@Roles('perm:…')` skipped validation entirely for
    // exactly the users least entitled to it. No route uses `perm:` yet, so this
    // was a trap laid for the first one rather than a live hole.
    if (permRequirements.length > 0) {
      const granted: string[] = Array.isArray(user.adminPermissions) ? user.adminPermissions : [];
      const hasPerms = permRequirements.every((perm) => granted.includes(perm));
      if (!hasPerms) {
        throw new ForbiddenException(
          `Missing required permissions: ${permRequirements.join(', ')}`,
        );
      }
    }

    return true;
  }
}
