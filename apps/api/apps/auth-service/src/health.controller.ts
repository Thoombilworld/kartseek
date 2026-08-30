import { Controller, Get } from '@nestjs/common';

/**
 * Liveness & readiness endpoints for Kubernetes probes.
 *
 * Exposed at the HTTP root so the k8s livenessProbe (GET /health) and
 * readinessProbe (GET /health/ready) resolve. This service registers no global
 * auth guard, so the kubelet can reach these without a token.
 *
 * By the time the HTTP server accepts requests, main.ts has already awaited
 * startAllMicroservices(), so a 200 here means the service is fully initialised.
 */
@Controller()
export class HealthController {
  @Get('health')
  health() {
    return { status: 'ok', service: 'auth-service', timestamp: new Date().toISOString() };
  }

  @Get('health/ready')
  ready() {
    return { status: 'ready', service: 'auth-service' };
  }
}
