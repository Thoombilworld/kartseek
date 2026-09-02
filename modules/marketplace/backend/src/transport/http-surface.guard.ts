import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  Logger,
  NotFoundException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const ALLOW_HTTP_KEY = 'marketplace:allowHttp';

/**
 * Marks a route as intentionally reachable over HTTP. Health probes only.
 */
export const AllowHttp = () => SetMetadata(ALLOW_HTTP_KEY, true);

/**
 * HttpSurfaceGuard — closes the marketplace service's HTTP surface.
 *
 * This service is reached by the API Gateway over TCP (:4002) and gRPC (:5006).
 * It also called `app.listen()`, which published a *second, parallel copy of the
 * entire API* over HTTP — MarketplaceController's 1,563 lines including every
 * `admin/*` route — on a port bound to 0.0.0.0.
 *
 * Nothing guarded it in practice:
 *
 *   • `InternalServiceGuard`, the global guard, returns true immediately for any
 *     non-RPC context. It is shared by all 26 services and HTTP is the primary
 *     surface for most of them, so it cannot be the thing that says no here.
 *   • The remaining defence was per-route `JwtAuthGuard`, and `DEV_AUTH_BYPASS`
 *     switches that off for any request that simply omits the Authorization
 *     header — which is how `GET /marketplace/admin/dashboard` answered 200 to an
 *     unauthenticated caller during the audit.
 *   • Where a route did authenticate, it took the *subject* from the query string
 *     (`getCart(@Query('userId'))`, and the same for wishlist, orders and
 *     recently-viewed), so any valid token read any user's data. The gateway
 *     equivalents were hardened to read identity from the JWT; these were not.
 *
 * Rather than re-guard sixty-odd duplicate routes, the surface is closed: HTTP
 * serves health probes and nothing else. The gateway is unaffected — it has never
 * used this port for anything.
 *
 * Answers 404, not 403: a 403 confirms the route exists and is worth attacking.
 *
 * If a route here ever genuinely needs to be reachable over HTTP, marking it
 * `@AllowHttp()` should be a deliberate decision with its own authorisation, not
 * an accident of the controller having an `@Get()` on it.
 */
@Injectable()
export class HttpSurfaceGuard implements CanActivate {
  private readonly logger = new Logger(HttpSurfaceGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // TCP and gRPC are the real transports — untouched. InternalServiceGuard
    // still authenticates those.
    if (context.getType() !== 'http') return true;

    const allowed = this.reflector.getAllAndOverride<boolean>(ALLOW_HTTP_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (allowed) return true;

    const req = context.switchToHttp().getRequest();
    this.logger.warn(
      `Refused HTTP request to closed surface: ${req?.method} ${req?.url ?? req?.path}`,
    );
    throw new NotFoundException('Cannot ' + (req?.method ?? 'GET') + ' ' + (req?.url ?? ''));
  }
}
