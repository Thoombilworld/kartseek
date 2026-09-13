import {
  Injectable,
  Optional,
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ROLES_KEY } from '@app/decorators';
import { hasPermission } from '@app/common';

/**
 * RolesGuard with permission validation — the ONLY one.
 *
 * Supports two modes:
 * 1. **Role-based**: @Roles('SUPER_ADMIN', 'ADMIN') — checks user.role
 * 2. **Permission-based**: @Roles('perm:orders.manage') — checks user.adminPermissions
 *    Prefix any permission key with 'perm:' to use permission-based validation.
 *
 * When both appear in one `@Roles(...)` they are ANDed: the caller must hold a
 * listed role AND every listed permission key.
 *
 * ── One guard, because two disagreed ────────────────────────────────────────
 *
 * This file used to hold a second, weaker implementation — a single flat
 * `some()` over the whole argument list — while `apps/api-gateway/src/guards`
 * held the one above. Both read the same `'roles'` metadata key, so
 * `@Roles(SUPER_ADMIN, ADMIN, 'perm:staff.manage')` meant "an ADMIN who holds
 * staff.manage" under one and "any ADMIN, or anyone whose role is literally the
 * string `perm:staff.manage`" under the other. R12 put such a key on
 * `libs/gdpr`'s three personal-data routes while that controller was bound to
 * the weak one, and the key enforced nothing (review I2/I3).
 *
 * The gateway's implementation moved here, and the gateway file is now an alias
 * of it, because `libs/gdpr` — a library — cannot import from
 * `apps/api-gateway/src` (dispatch addendum item 5). One implementation, in the
 * place both an application and a library may point at.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  /**
   * `jwtService` is `@Optional()`.
   *
   * It is used for one thing: decoding the bearer token when `JwtAuthGuard` has
   * not already run and put a user on the request. `modules/marketplace/backend`
   * binds this guard in an injector that registers no `JwtModule`, and it always
   * binds `JwtAuthGuard` first — so requiring the dependency would turn a
   * working service into an `UnknownDependenciesException` at boot to support a
   * fallback it never reaches. Missing it, the guard simply relies on whatever
   * authenticated the request, which is the ordinary case.
   */
  constructor(
    private reflector: Reflector,
    @Optional() private jwtService?: JwtService,
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
      if (this.jwtService && authHeader && authHeader.startsWith('Bearer ')) {
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
    const roleRequirements = requiredRoles.filter((r) => !r.startsWith('perm:'));
    const permRequirements = requiredRoles
      .filter((r) => r.startsWith('perm:'))
      .map((r) => r.slice(5));

    // Check role-based access
    if (roleRequirements.length > 0) {
      const userRoleUpper = user.role.toUpperCase();
      const hasRole = roleRequirements.some((role) => role.toUpperCase() === userRoleUpper);
      if (!hasRole) {
        throw new ForbiddenException(
          'Insufficient permissions. Your role cannot perform this action.',
        );
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
      // `hasPermission` (`@app/common`) is the shared verdict: it honours the
      // `'*'` wildcard SUPER_ADMIN signs in with — one wildcard instead of an
      // enumerated list, so a permission key introduced by a later route does
      // not have to be back-filled onto the account that grants it — and treats
      // an absent or non-array claim as holding nothing.
      //
      // Shared because the gateway's health board has to reach the same verdict
      // without being able to use this guard (its routes are `@Public()`, and a
      // readiness probe that can answer 403 restarts healthy pods). Two copies
      // of "what does a permission key mean" is one copy too many, and the
      // board is the surface where the weaker copy would go unnoticed: it
      // discloses more, it does not deny.
      const hasPerms = permRequirements.every((perm) => hasPermission(user, perm));
      if (!hasPerms) {
        throw new ForbiddenException(
          `Missing required permissions: ${permRequirements.join(', ')}`,
        );
      }
    }

    return true;
  }
}
