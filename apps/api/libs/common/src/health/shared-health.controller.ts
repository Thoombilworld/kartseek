import { Controller, Get, Res } from '@nestjs/common';
import { HealthService } from './health.service';
import { publicReadiness, readinessHttpStatus } from './health.types';

/**
 * Just the sliver of the HTTP response these handlers touch.
 *
 * Typed structurally rather than as express's `Response` so `@app/common` needs
 * no express types — it is imported by all 26 deployables and by eight module
 * backends with their own tsconfigs, and it also keeps the spec honest: the
 * status code is asserted against a two-line stub rather than a framework.
 */
interface StatusSink {
  status(code: number): unknown;
}

/**
 * Root-mounted so Kubernetes (`GET /health`, `GET /health/ready`), the Docker
 * HEALTHCHECK and tests/smoke/boot-all.mjs all reach the same routes. Services
 * that already expose a prefixed route (`/cart/health`, `/grocery/health`)
 * keep it — those are read by the gateway's service board and by humans.
 *
 * Deliberately unauthenticated: the kubelet holds no token, and a probe that
 * can 401 is a probe that restarts healthy pods. Because every caller here is
 * therefore anonymous, `/health/ready` answers with the verdict and one word
 * per dependency and nothing else — no `detail`, no driver message. The reason
 * a dependency failed goes to this service's own log, where `HealthService`
 * writes it; the gateway's SUPER_ADMIN board is the only place it is served.
 */
@Controller()
export class SharedHealthController {
  constructor(private readonly health: HealthService) {}

  /** Liveness: the process, and nothing it talks to. Always 200 while it runs. */
  @Get('health')
  live() {
    return this.health.live();
  }

  @Get('health/ready')
  async ready(@Res({ passthrough: true }) res: StatusSink) {
    const result = await this.health.ready();
    // The status line is the only part a `readinessProbe` reads.
    res.status(readinessHttpStatus(result.status));
    return publicReadiness(result);
  }
}
