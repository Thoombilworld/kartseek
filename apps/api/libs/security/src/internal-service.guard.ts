import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';

/**
 * InternalServiceGuard — opt-in service-to-service authentication for microservice
 * (TCP / Redis / NATS) message handlers.
 *
 * The platform's microservice transport is plaintext and unauthenticated: any process
 * that can reach a service's message port can invoke any @MessagePattern handler
 * (including privileged admin_* commands). Network isolation (K8s NetworkPolicies,
 * localhost binding) is the first line of defence; this guard adds a second one.
 *
 * Behaviour is intentionally NON-BREAKING:
 *   • If INTERNAL_SERVICE_SECRET is not set  → always allow (local dev / build).
 *   • For non-RPC (HTTP) contexts            → always allow (HTTP is guarded by JWT).
 *   • For primitive RPC payloads (e.g. a raw id string on public reads) → allow,
 *     since a secret cannot be attached to a primitive.
 *   • For object RPC payloads when the secret IS set → require a matching
 *     `_internalSecret` field, which the API Gateway attaches to every object payload.
 */
@Injectable()
export class InternalServiceGuard implements CanActivate {
  private readonly logger = new Logger(InternalServiceGuard.name);

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'rpc') return true;

    const secret = process.env.INTERNAL_SERVICE_SECRET;
    if (!secret) return true;

    const data = context.switchToRpc().getData();
    // Primitive payloads (string id, number, etc.) cannot carry a credential —
    // these are used only by public read patterns, so allow them through.
    if (data === null || typeof data !== 'object') return true;

    if (data._internalSecret && data._internalSecret === secret) return true;

    this.logger.warn('Rejected inter-service RPC call with missing/invalid internal secret');
    throw new UnauthorizedException('Invalid internal service credentials');
  }
}
