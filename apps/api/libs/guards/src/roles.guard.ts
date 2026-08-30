import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '@app/decorators/roles.decorator';
import { UserRole } from '@app/common';

/**
 * RolesGuard — enforces role-based access control on routes decorated with @Roles().
 *
 * Registered globally in main.ts. If a route has no @Roles() metadata,
 * access is allowed (no restriction). If @Roles() is present, the guard
 * checks req.user.role against the allowed roles.
 *
 * Role comparison is case-insensitive to handle both enum values
 * ('super_admin') and legacy uppercase strings ('SUPER_ADMIN').
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Roles() decorator → allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    // No user on request (not authenticated) → deny
    if (!user?.role) return false;

    // Case-insensitive comparison to handle both 'ADMIN' and 'admin'
    const userRoleUpper = user.role.toUpperCase();
    return requiredRoles.some((role) => role.toUpperCase() === userRoleUpper);
  }
}
