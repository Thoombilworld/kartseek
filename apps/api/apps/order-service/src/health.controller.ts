import { Controller, Get } from '@nestjs/common';

/**
 * Liveness & readiness endpoints for Kubernetes probes.
 *
 * OrderController is mounted at the 'orders' prefix, so its health route lives at
 * /orders/health — which the k8s probes (GET /health, GET /health/ready) never hit.
 * This root-mounted controller exposes the paths the probes actually use.
 */
@Controller()
export class HealthController {
  @Get('health')
  health() {
    return { status: 'ok', service: 'order-service', timestamp: new Date().toISOString() };
  }

  @Get('health/ready')
  ready() {
    return { status: 'ready', service: 'order-service' };
  }
}
