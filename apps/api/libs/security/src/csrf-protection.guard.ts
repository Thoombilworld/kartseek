import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as crypto from 'crypto';

/**
 * CSRF Protection Guard — Double Submit Cookie + Token Header pattern.
 *
 * For browser-based clients (Next.js web portal), this guard ensures that
 * state-changing requests (POST, PUT, PATCH, DELETE) include a valid
 * X-CSRF-Token header that matches the csrf cookie.
 *
 * Mobile clients send an X-Client-Platform header ('flutter', 'ios', 'android')
 * and are exempt from CSRF checks because they don't use cookies.
 *
 * Usage:
 *  - Apply globally via APP_GUARD or per-controller with @UseGuards(CsrfGuard)
 *  - Set @SkipCsrf() decorator on endpoints that should bypass (e.g., auth/login)
 */
export const SKIP_CSRF_KEY = 'skipCsrf';

/** Decorator to skip CSRF check on a handler or controller. */
export function SkipCsrf() {
  return (target: any, key?: string | symbol, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata(SKIP_CSRF_KEY, true, descriptor.value);
    } else {
      Reflect.defineMetadata(SKIP_CSRF_KEY, true, target);
    }
    return descriptor ?? target;
  };
}

@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly logger = new Logger('CSRF-Guard');

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const method = request.method?.toUpperCase();

    // Safe methods don't need CSRF protection
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return true;
    }

    // Check if handler or controller has @SkipCsrf()
    const skipCsrf = this.reflector.getAllAndOverride<boolean>(SKIP_CSRF_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skipCsrf) return true;

    // Mobile clients are exempt (they don't use browser cookies)
    const platform = (request.headers['x-client-platform'] || '').toLowerCase();
    if (['flutter', 'ios', 'android', 'react-native'].includes(platform)) {
      return true;
    }

    // API key authenticated requests are exempt (service-to-service)
    if (request.headers['x-api-key']) {
      return true;
    }

    // For browser clients: validate double-submit pattern
    const cookieToken = this.extractCsrfCookie(request);
    const headerToken = request.headers['x-csrf-token'];

    if (!headerToken) {
      this.logger.warn(`CSRF: Missing X-CSRF-Token header from ${request.ip} on ${method} ${request.path}`);
      throw new ForbiddenException('CSRF token missing. Include X-CSRF-Token header with your request.');
    }

    if (!cookieToken || !this.timingSafeEqual(cookieToken, headerToken)) {
      this.logger.warn(`CSRF: Token mismatch from ${request.ip} on ${method} ${request.path}`);
      throw new ForbiddenException('CSRF token invalid. Please refresh the page and try again.');
    }

    return true;
  }

  private extractCsrfCookie(request: any): string | null {
    const cookies = request.headers.cookie;
    if (!cookies) return null;
    const match = cookies.match(/(?:^|;\s*)kartseek_csrf=([^;]+)/);
    if (!match) return null;
    // Reject oversized cookie values (max 256 chars for CSRF token)
    if (match[1].length > 256) {
      this.logger.warn(`CSRF: Oversized cookie value (${match[1].length} chars) from ${request.ip}`);
      return null;
    }
    try {
      return decodeURIComponent(match[1]);
    } catch {
      // Malformed URL encoding (e.g., %ZZ) — treat as invalid
      this.logger.warn(`CSRF: Malformed cookie encoding from ${request.ip}`);
      return null;
    }
  }

  /**
   * Timing-safe string comparison to prevent timing attacks
   * on CSRF token validation.
   */
  private timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    try {
      return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
    } catch {
      return false;
    }
  }

  /**
   * Generate a new CSRF token (to be used by the token endpoint).
   */
  static generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}
