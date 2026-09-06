import { createHmac } from 'crypto';
import { Injectable, type CanActivate, type ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { type Request } from 'express';

const INTERNAL_KEY_HEADER = 'x-internal-api-key';

/**
 * ApiKeyGuard — service-to-service authentication for internal gRPC/HTTP calls.
 *
 * Prevents unauthorized services from calling internal endpoints
 * that bypass the public JWT-authenticated gateway.
 *
 * Configuration:
 *   INTERNAL_API_KEY env var — a shared secret rotated on a schedule.
 *   In production, use Kubernetes Secrets or HashiCorp Vault to inject this.
 *
 * Usage:
 *   @UseGuards(ApiKeyGuard)
 *   @Get('/internal/sync')
 *   internalSync() { ... }
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);
  private readonly validKey: string;

  constructor() {
    const key = process.env.INTERNAL_API_KEY;
    if (!key) {
      throw new Error(
        'INTERNAL_API_KEY environment variable is required for internal API security.',
      );
    }
    this.validKey = key;
  }

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const providedKey = req.headers[INTERNAL_KEY_HEADER] as string | undefined;

    if (!providedKey) {
      this.logger.warn(
        `Internal API call missing ${INTERNAL_KEY_HEADER} header from ${req.ip}`,
      );
      throw new UnauthorizedException('Internal API key required.');
    }

    // Constant-time comparison to prevent timing attacks
    if (!this.constantTimeCompare(providedKey, this.validKey)) {
      this.logger.warn(
        `Invalid internal API key from ${req.ip} — possible unauthorized service call`,
      );
      throw new UnauthorizedException('Invalid internal API key.');
    }

    return true;
  }

  /**
   * Constant-time string comparison to prevent timing-based key extraction.
   * Both strings are hashed to equal-length buffers before comparison.
   */
  private constantTimeCompare(a: string, b: string): boolean {
    const secret = process.env.INTERNAL_API_KEY ?? 'fallback';
    const hashA = createHmac('sha256', secret).update(a).digest();
    const hashB = createHmac('sha256', secret).update(b).digest();
    if (hashA.length !== hashB.length) return false;
    let diff = 0;
    for (let i = 0; i < hashA.length; i++) {
      diff |= hashA[i] ^ hashB[i];
    }
    return diff === 0;
  }
}
