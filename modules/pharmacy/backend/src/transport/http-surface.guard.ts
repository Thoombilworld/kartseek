import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  Logger,
  NotFoundException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const ALLOW_HTTP_KEY = 'pharmacy:allowHttp';

/**
 * Marks a route as intentionally reachable over HTTP. Health probes only.
 */
export const AllowHttp = () => SetMetadata(ALLOW_HTTP_KEY, true);

/**
 * The two routes `@app/common`'s `HealthModule` serves, which a kubelet or a
 * Docker `HEALTHCHECK` has to reach.
 *
 * Matched by path rather than by metadata because that controller is shared by
 * all 26 services and cannot carry a pharmacy-specific decorator. They are the
 * registry's own values for this service (`services.yaml`: `health: { live:
 * /health, ready: /health/ready }`), and `k8s.mjs`/`compose.mjs` build the
 * probes from that same entry — so a change there and a silent divergence here
 * is not possible without `registry:check` noticing.
 */
const HEALTH_PATHS = new Set(['/health', '/health/ready']);

/**
 * HttpSurfaceGuard — closes pharmacy-service's HTTP surface.
 *
 * This service is consumed by the API Gateway over TCP (:4010). `app.listen()`
 * also publishes `PharmacyController`'s 41 HTTP routes — the customer
 * catalogue, orders, prescriptions and the whole `admin/*` family — and NONE of
 * them carries a guard: the comment in `main.ts` said so outright, and the
 * defence was the bind address alone (`app.listen(port, '127.0.0.1')`).
 *
 * That bind address is exactly what had to change. The kubelet probes a pod on
 * its pod IP, never on 127.0.0.1, so all three of pharmacy's probes fell back
 * to `tcpSocket: 4010` (`microservices-generated.yaml`) — a check that passes
 * while Postgres is gone and the service answers 503 to everything, which is
 * the AUD2-002 defect this plan set out to remove. A TCP port being open is a
 * weaker claim than `/health/ready`.
 *
 * So the listener binds wide in a container and the surface is closed instead:
 * `/health` and `/health/ready` answer, and every other HTTP route is a 404.
 * The gateway is unaffected — it has never used this port for anything but the
 * health board (`health.controller.ts:455`).
 *
 * 404, not 403: a 403 confirms the route exists and is worth attacking.
 *
 * TCP is untouched. `context.getType()` is `'rpc'` there, and
 * `InternalServiceGuard` is what authenticates that transport.
 *
 * If a route here ever genuinely needs to be reachable over HTTP, `@AllowHttp()`
 * should be a deliberate decision with its own authorisation, not an accident
 * of the controller having an `@Get()` on it.
 */
@Injectable()
export class HttpSurfaceGuard implements CanActivate {
  private readonly logger = new Logger(HttpSurfaceGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // TCP is the real transport — untouched.
    if (context.getType() !== 'http') return true;

    const allowed = this.reflector.getAllAndOverride<boolean>(ALLOW_HTTP_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (allowed) return true;

    const req = context.switchToHttp().getRequest();
    // The path without its query string, and without a trailing slash — a probe
    // URL is exact, but `/health/` and `/health?x=1` are the same route to Nest
    // and must not read as a different one here.
    const raw = String(req?.path ?? req?.url ?? '');
    const path = raw.split('?')[0].replace(/\/+$/, '') || '/';
    if (HEALTH_PATHS.has(path)) return true;

    this.logger.warn(`Refused HTTP request to closed surface: ${req?.method} ${raw}`);
    throw new NotFoundException('Cannot ' + (req?.method ?? 'GET') + ' ' + raw);
  }
}
