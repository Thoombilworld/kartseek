import {
  Injectable,
  type ExecutionContext,
  UnauthorizedException,
  Logger,
  Optional,
} from '@nestjs/common';
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
          /**
           * The same verification a protected route gets, before this counts
           * as a session.
           *
           * This branch used to stop at passport — signature and expiry — and
           * return, never reaching the `type` / `revoked-tokens` /
           * `revoked-users` checks below. Harmless while `request.user` on a
           * public route was only a personalisation nicety, and not harmless
           * once a real authorisation decision hung off it: the gateway's
           * health board is `@Public()` so the kubelet can reach it without a
           * token, and it shows ADMIN/SUPER_ADMIN every internal port, gRPC URL
           * and the Kafka broker list. A just-deactivated administrator's
           * unexpired JWT would still have opened it — the population that
           * should lose it first.
           */
          await this.assertSessionUsable(req);
        } catch {
          // An unusable token on a public route is simply not a session, and
          // "unusable" includes revoked, deactivated and wrong-type. The
          // request continues; it continues anonymously.
          delete req.user;
        }
      }
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const hasAuthHeader = !!request.headers['authorization'];

    // Dev auth bypass — requires explicit opt-in via DEV_AUTH_BYPASS=true
    if (
      process.env.DEV_AUTH_BYPASS === 'true' &&
      process.env.NODE_ENV !== 'production' &&
      !hasAuthHeader
    ) {
      if (!request.user) {
        // The injected role decides what the bypass can reach. It used to be a
        // hard-coded CUSTOMER, which made every @Roles-protected admin and seller
        // route answer 403 no matter what — the bypass looked active while the
        // route stayed shut. Still CUSTOMER by default: widening it is a
        // deliberate act, set DEV_AUTH_BYPASS_ROLE (e.g. SUPER_ADMIN).
        const role = (process.env.DEV_AUTH_BYPASS_ROLE || 'CUSTOMER').toUpperCase();
        this.logger.warn(
          `⚠️  DEV AUTH BYPASS active — injecting ${role} user for ${request.method} ${request.path}`,
        );
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
          // A real staff token carries its role's permission keys, and routes
          // gated on `perm:` read nothing else. Without this the bypass could
          // reach a `@Roles(UserRole.SUPER_ADMIN)` route and still be refused
          // by the permission half of the same decorator.
          adminPermissions: ['SUPER_ADMIN', 'ADMIN'].includes(role) ? ['*'] : [],
        };
      }
      return true;
    }

    // Run passport JWT validation
    const result = await (super.canActivate(context) as Promise<boolean>);
    if (!result) return false;

    await this.assertSessionUsable(request);
    return true;
  }

  /**
   * Everything that must hold after passport has accepted the signature.
   *
   * Kept as one method so the `@Public()` branch and the protected path cannot
   * drift: for two years they did, and the public branch was the weaker of the
   * two by exactly these three checks. Throws `UnauthorizedException`; the
   * protected path lets that become a 401, the public branch catches it and
   * drops the user.
   */
  private async assertSessionUsable(request: any): Promise<void> {
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
        this.refuseIfUnverifiable(e, 'token');
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
          this.refuseIfUnverifiable(e, 'user');
        }
      }
    }
  }

  /**
   * A revocation check that could not run.
   *
   * Both checks used to log and continue, which means the answer to "has this
   * session been revoked?" was NO whenever the store that holds the answer was
   * unreachable. Logout, password reset and administrative deactivation all
   * work by writing `revoked-tokens:<jti>` / `revoked-users:<id>`, so a Redis
   * outage silently restored every session revoked in the preceding fifteen
   * minutes — including the one just taken from a dismissed administrator, who
   * would find their token working again for as long as the outage lasted. A
   * cache failure is not permission (dispatch addendum item 2).
   *
   * In production this now denies: `RedisService` throws `RedisUnavailableError`
   * for an unready client or a failed command, the shared HTTP filter maps that
   * to 503 `REDIS_UNAVAILABLE`, and the caller is told to retry rather than
   * being admitted. 503 and not 401 because the session may well be valid — the
   * platform cannot currently tell, and saying so is honest where "your session
   * ended" would not be.
   *
   * Outside production nothing changes: there is an in-memory emulator, so
   * `get()` answers instead of throwing and local work is unaffected. That
   * asymmetry is deliberate — it is the same one `RedisService` itself draws,
   * and it keeps a developer with no Redis running from being locked out of
   * their own gateway.
   *
   * The DDoS middleware deliberately makes the opposite choice, and the reason
   * is the direction of the failure: rate limiting off means unlimited requests
   * reach a platform that is already struggling, which is bad; revocation off
   * means a revoked credential works, which is worse and is not recoverable by
   * waiting.
   */
  private refuseIfUnverifiable(e: unknown, which: 'token' | 'user'): void {
    const message = (e as Error)?.message ?? String(e);
    // Rethrown as-is: a store outage is a `RedisUnavailableError`, which the
    // shared filter turns into 503 `REDIS_UNAVAILABLE`; anything else is a bug
    // in this path and becomes a 500. Both are denials, which is the point —
    // the one outcome ruled out is admitting a session nobody could check.
    if (process.env.NODE_ENV === 'production') {
      this.logger.error(
        `${which} revocation check could not run — refusing the request: ${message}`,
      );
      throw e;
    }
    this.logger.warn(`${which} revocation check failed (allowed, not production): ${message}`);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw err || new UnauthorizedException('You must be logged in to access this resource.');
    }
    return user;
  }
}
