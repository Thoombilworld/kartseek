import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolveJwtSecret } from '@app/security';

/**
 * auth-service is the process that MINTS tokens, so its verifying secret and
 * the gateway's have to be the same string or every token it issues is rejected
 * one hop later. It kept its own copy of the old fallback; it now calls the
 * shared resolver, which refuses rather than inventing a secret (AUD2-071).
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    const configured = configService.get<string>('JWT_SECRET');
    super({
      // Extract JWT from the Authorization Header as Bearer token
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configured && configured.length >= 32 ? configured : resolveJwtSecret(),
    });
  }

  // Once the JWT signature is verified, this payload is injected into req.user
  async validate(payload: any) {
    if (!payload.sub || !payload.role) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
