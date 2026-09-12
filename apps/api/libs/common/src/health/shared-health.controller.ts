import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

/**
 * Root-mounted so Kubernetes (`GET /health`, `GET /health/ready`), the Docker
 * HEALTHCHECK and tests/smoke/boot-all.mjs all reach the same routes. Services
 * that already expose a prefixed route (`/cart/health`, `/grocery/health`)
 * keep it — those are read by the gateway's service board and by humans.
 *
 * Deliberately unauthenticated: the kubelet holds no token, and a probe that
 * can 401 is a probe that restarts healthy pods. What it discloses is bounded
 * to this one service's own dependency states — never the platform's port map,
 * which is what the gateway's `/health/services` reduction is about.
 */
@Controller()
export class SharedHealthController {
  constructor(private readonly health: HealthService) {}

  @Get('health')
  live() {
    return this.health.live();
  }

  @Get('health/ready')
  ready() {
    return this.health.ready();
  }
}
