import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** The development secret, named once so no call site can spell it differently. */
const DEV_SECRET = 'kartseek-development-secret-not-for-any-deployment';

/**
 * The signing secret, required everywhere.
 *
 * The old fallback was a literal in tracked source, guarded only by
 * NODE_ENV === 'production' — and Compose sets NODE_ENV nowhere, so a staging
 * box signed tokens with a secret anyone can read. There is now one resolver,
 * it throws when JWT_SECRET is unset, and ALLOW_DEV_JWT_SECRET=true is the
 * only way to get the development value — a choice someone has to make.
 *
 * There were four such literals, and they did not agree: `jwt.strategy.ts` and
 * `security.module.ts` used `kartseek-dev-secret-NOT-FOR-PRODUCTION`,
 * `ws-auth.util.ts` used `kartseek-dev-secret` and `app.config.ts` used
 * `kartseek_dev_secret_change_in_production`. A deployment missing JWT_SECRET
 * therefore verified HTTP requests against one secret and WebSocket handshakes
 * against another, so a token good for `/api/v1` was rejected at `/orders` and
 * the failure looked like a client bug rather than a missing variable.
 *
 * The 32-character floor is the same one `env.validation.ts` applies, so a
 * secret Joi accepts at boot is a secret this resolver accepts at use.
 */
export function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.ALLOW_DEV_JWT_SECRET === 'true') return DEV_SECRET;
  throw new Error(
    'JWT_SECRET is not set (or is shorter than 32 characters). Set it, or set ' +
      'ALLOW_DEV_JWT_SECRET=true for local development only.',
  );
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger('JwtStrategy');

  /**
   * `configService` is still injected and still consulted first: a process that
   * loads JWT_SECRET through a `ConfigModule` source other than `process.env`
   * (a `.env` file Nest expanded, a custom loader) must keep working. The
   * resolver is what decides when there is no answer.
   */
  constructor(private configService: ConfigService) {
    const configured = configService.get<string>('JWT_SECRET');
    const secret =
      configured && configured.length >= 32 ? configured : JwtStrategy.resolve(configured);

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /**
   * Split out so the `super()` call above stays a single expression — a
   * `PassportStrategy` constructor may not touch `this` before it, and may not
   * hold a statement between the local and the call either.
   */
  private static resolve(configured?: string): string {
    if (configured && configured.length > 0 && configured.length < 32) {
      new Logger('JwtStrategy').warn(
        `JWT_SECRET is ${configured.length} characters; at least 32 are required. ` +
          'Falling through to the resolver, which will refuse unless ALLOW_DEV_JWT_SECRET=true.',
      );
    }
    return resolveJwtSecret();
  }

  async validate(payload: any) {
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Invalid token payload: missing subject');
    }
    if (!payload.role) {
      this.logger.warn(
        `JWT token for user ${payload.sub} is missing role claim — defaulting to CUSTOMER`,
      );
    }
    return {
      userId: payload.sub,
      id: payload.sub,
      sub: payload.sub,
      email: payload.email,
      role: payload.role || 'CUSTOMER',
      // Which seller portal this account may open. Absent for non-sellers, which
      // server-side guards must read as "no portal access" rather than "any".
      sellerType: payload.sellerType,
      // Staff market scope, straight from the signed claim; the gateway's
      // market-scope helper reads these to confine a regional admin.
      regionCode: payload.regionCode,
      regionLocked: payload.regionLocked === true,
      // Permission keys signed at login from the account's admin role; RolesGuard
      // checks `perm:` requirements against them. Absent for non-staff.
      adminPermissions: Array.isArray(payload.adminPermissions)
        ? payload.adminPermissions
        : undefined,
      // Carried through for JwtAuthGuard and the logout handler: `type` keeps a
      // refresh token from being used as a Bearer credential, and `jti`/`exp` are
      // what let a single session be revoked for exactly its remaining lifetime.
      type: payload.type,
      jti: payload.jti,
      exp: payload.exp,
    };
  }
}
