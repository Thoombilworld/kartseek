import { Controller, Get } from '@nestjs/common';
import { AllowHttp } from './http-surface.guard';

/**
 * Liveness/readiness surface, at the root path.
 *
 * The Kubernetes deployment probes `GET /health` on the container's HTTP port,
 * but the only health route the service had was `GET /marketplace/health` —
 * mounted under MarketplaceController's `marketplace` prefix. Every liveness and
 * readiness probe therefore got a 404, which `failureThreshold: 3` turns into a
 * restart loop the moment the probes are actually enforced.
 *
 * Kept deliberately trivial: a probe must not depend on the database or on Redis,
 * or a transient dependency blip escalates into the pod being killed.
 *
 * `@AllowHttp()` is what keeps this reachable — see HttpSurfaceGuard, which
 * closes every other HTTP route on this service.
 */
@Controller()
export class HealthController {
  @AllowHttp()
  @Get('health')
  health() {
    return {
      service: 'marketplace-service',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
