import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger('JwtStrategy');

  constructor(private configService: ConfigService) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret && process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: JWT_SECRET environment variable must be set in production');
    }
    if (!secret) {
      const logger = new Logger('JwtStrategy');
      logger.warn('⚠️  JWT_SECRET not set — using hardcoded dev secret. NEVER use this in production!');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret || 'kartseek-dev-secret-NOT-FOR-PRODUCTION',
    });
  }

  async validate(payload: any) {
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Invalid token payload: missing subject');
    }
    if (!payload.role) {
      this.logger.warn(`JWT token for user ${payload.sub} is missing role claim — defaulting to CUSTOMER`);
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
      // Carried through for JwtAuthGuard and the logout handler: `type` keeps a
      // refresh token from being used as a Bearer credential, and `jti`/`exp` are
      // what let a single session be revoked for exactly its remaining lifetime.
      type: payload.type,
      jti: payload.jti,
      exp: payload.exp,
    };
  }
}

