import { Controller, Get } from '@nestjs/common';

/**
 * Liveness & readiness endpoints for Kubernetes probes.
 *
 * PaymentController only exposes a TCP `payment_health` message pattern, so there is
 * no HTTP route for the k8s probes (GET /health, GET /health/ready) to hit. This
 * root-mounted controller provides them. No global auth guard is registered on this
 * service, so the kubelet can reach these without a token.
 */
@Controller()
export class HealthController {
  @Get('health')
  health() {
    return { status: 'ok', service: 'payment-service', timestamp: new Date().toISOString() };
  }

  @Get('health/ready')
  ready() {
    return { status: 'ready', service: 'payment-service' };
  }
}
