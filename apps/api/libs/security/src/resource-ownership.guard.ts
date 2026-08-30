import {
  Injectable, CanActivate, ExecutionContext,
  ForbiddenException, Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RESOURCE_OWNER_KEY, ResourceOwnerOptions } from './resource-owner.decorator';

/**
 * ResourceOwnershipGuard — IDOR Protection Guard
 *
 * Prevents Insecure Direct Object Reference attacks by verifying that
 * the authenticated user owns the resource referenced in the URL.
 *
 * Supports two modes:
 *
 * 1. **Direct ownership** — The route parameter value IS the user ID.
 *    Example: `GET /wallet/:userId/balance` — checks `userId === req.user.userId`
 *
 * 2. **Indirect ownership** — The route parameter references an entity whose
 *    owner field must match the user. (Reserved for future DB lookups.)
 *    Example: `GET /orders/:orderId` — look up order, check `order.customerId === req.user.userId`
 *
 * Users with bypass roles (default: SUPER_ADMIN) skip the ownership check entirely.
 *
 * Usage:
 * ```typescript
 * @UseGuards(JwtAuthGuard, ResourceOwnershipGuard)
 * @ResourceOwner({ paramKey: 'userId' })
 * ```
 */
@Injectable()
export class ResourceOwnershipGuard implements CanActivate {
  private readonly logger = new Logger(ResourceOwnershipGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Read @ResourceOwner() metadata from the handler
    const options = this.reflector.getAllAndOverride<ResourceOwnerOptions>(
      RESOURCE_OWNER_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no @ResourceOwner decorator, allow (other guards handle auth)
    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // No user attached — JwtAuthGuard should have already rejected
    if (!user || !user.userId) {
      throw new ForbiddenException('Authentication required to access this resource.');
    }

    // Bypass check for privileged roles
    const bypassRoles = options.bypassRoles ?? ['SUPER_ADMIN'];
    if (bypassRoles.includes(user.role?.toUpperCase())) {
      return true;
    }

    const paramValue = request.params?.[options.paramKey];
    if (!paramValue) {
      // Parameter not in URL — guard is misconfigured but don't block
      this.logger.warn(
        `ResourceOwnershipGuard: param '${options.paramKey}' not found in request params. ` +
        `Route: ${request.method} ${request.url}`,
      );
      return true;
    }

    // ── Direct ownership check ────────────────────────────────────────────
    if (!options.ownerField && !options.entity) {
      if (paramValue !== user.userId) {
        this.logger.warn(
          `IDOR blocked: user ${user.userId} attempted to access ${options.paramKey}=${paramValue}. ` +
          `Route: ${request.method} ${request.url}`,
        );
        throw new ForbiddenException(
          'You do not have permission to access this resource.',
        );
      }
      return true;
    }

    // ── Indirect ownership check (entity lookup) ──────────────────────────
    // NOT IMPLEMENTED. This guard has no EntityManager, so it cannot load the
    // entity and compare `ownerField`.
    //
    // This branch previously logged and returned `true`, which meant a route
    // annotated for indirect ownership looked protected while allowing every
    // caller through — worse than having no guard, because the annotation
    // discourages a handler-level check. It now fails closed.
    //
    // For indirect ownership use a guard that can query the owning repository —
    // see SellerOwnershipGuard in marketplace-service for the pattern.
    this.logger.error(
      `ResourceOwnershipGuard: indirect ownership is not supported (entity='${options.entity}', ` +
      `param='${options.paramKey}', ownerField='${options.ownerField}'). Denying. ` +
      `Route: ${request.method} ${request.url}`,
    );
    throw new ForbiddenException('You do not have permission to access this resource.');
  }
}
