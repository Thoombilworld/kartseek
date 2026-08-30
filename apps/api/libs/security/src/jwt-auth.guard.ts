import { Injectable, ExecutionContext, UnauthorizedException, Logger, Optional } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { RedisService } from '@app/redis';

const IS_PUBLIC_KEY = 'isPublic';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger('JwtAuthGuard');

  constructor(
    @Optional() private reflector?: Reflector,
    @Optional() private redis?: RedisService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Allow @Public() decorated routes to bypass JWT authentication
    const isPublic = this.reflector?.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      /**
       * Public means "no login required", not "ignore the login".
       *
       * This returned immediately, so `request.user` stayed unset even when the
       * request carried a valid token — a signed-in seller browsing their own
       * store's catalogue was indistinguishable from an anonymous shopper, and
       * the grocery listing route (shared by the portal and the storefront)
       * could not tell whose moderation queue to include.
       *
       * Attempting authentication here is additive: a missing, expired or
       * malformed token still passes through as an anonymous request, exactly
       * as before. Only the success case changes, and only by populating
       * `request.user`.
       */
      const req = context.switchToHttp().getRequest();
      if (req?.headers?.['authorization']) {
        try {
          await super.canActivate(context);
        } catch {
          // An unusable token on a public route is simply not a session.
        }
      }
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const hasAuthHeader = !!request.headers['authorization'];

    // Dev auth bypass — requires explicit opt-in via DEV_AUTH_BYPASS=true
    if (process.env.DEV_AUTH_BYPASS === 'true' && process.env.NODE_ENV !== 'production' && !hasAuthHeader) {
      if (!request.user) {
        // The injected role decides what the bypass can reach. It used to be a
        // hard-coded CUSTOMER, which made every @Roles-protected admin and seller
        // route answer 403 no matter what — the bypass looked active while the
        // route stayed shut. Still CUSTOMER by default: widening it is a
        // deliberate act, set DEV_AUTH_BYPASS_ROLE (e.g. SUPER_ADMIN).
        const role = (process.env.DEV_AUTH_BYPASS_ROLE || 'CUSTOMER').toUpperCase();
        this.logger.warn(`⚠️  DEV AUTH BYPASS active — injecting ${role} user for ${request.method} ${request.path}`);
        // Shape must match what `JwtStrategy.validate()` returns, not just
        // overlap with it. This used to inject `{ id, email, role, name }` and
        // nothing else, while every user-scoped handler reads `req.user.userId`
        // (or `sub`) — so under the bypass those routes saw no user at all and
        // answered "a customer id is required" instead of acting as the dev
        // user. The bypass is meant to stand in for a signed-in account; a
        // partial impersonation is worse than none, because the failure looks
        // like a bug in the handler rather than in the stand-in.
        const devUserId = '00000000-0000-0000-0000-000000000000';
        request.user = {
          userId: devUserId,
          id: devUserId,
          sub: devUserId,
          email: 'dev@kartseek.dev',
          role,
          name: 'Dev User',
        };
      }
      return true;
    }

    // Run passport JWT validation
    const result = await (super.canActivate(context) as Promise<boolean>);
    if (!result) return false;

    // A refresh token must not work as a Bearer credential. The two used to carry
    // identical claims apart from `exp`, which made the 30-day refresh token a
    // 30-day access token on every protected route. Tokens minted before `type`
    // existed carry none and are still admitted, so sessions live at rollout are
    // not broken; they age out with their own expiry.
    if (request.user?.type && request.user.type !== 'access') {
      throw new UnauthorizedException('This token cannot be used to access resources.');
    }

    // After passport validates the JWT, check if this token was revoked by a
    // logout, or all of the user's tokens by a password reset.
    if (this.redis && request.user?.jti) {
      try {
        if (await this.redis.get(`revoked-tokens:${request.user.jti}`)) {
          throw new UnauthorizedException('Session ended. Please log in again.');
        }
      } catch (e) {
        if (e instanceof UnauthorizedException) throw e;
        this.logger.warn(`Token revocation check failed: ${(e as Error).message}`);
      }
    }

    if (this.redis && request.user) {
      const userId = request.user.id || request.user.sub || request.user.userId;
      if (userId) {
        try {
          const revoked = await this.redis.get(`revoked-users:${userId}`);
          if (revoked) {
            throw new UnauthorizedException('Session revoked. Please log in again.');
          }
        } catch (e) {
          if (e instanceof UnauthorizedException) throw e;
          // Redis errors should not block auth — log and continue
          this.logger.warn(`Revocation check failed: ${(e as Error).message}`);
        }
      }
    }

    return true;
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw err || new UnauthorizedException('You must be logged in to access this resource.');
    }
    return user;
  }
}

