import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret && process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: JWT_SECRET environment variable must be set in production');
    }
    if (!secret) {
      new Logger('JwtStrategy').warn('⚠️  JWT_SECRET not set — using hardcoded dev secret. NEVER use this in production!');
    }
    super({
      // Extract JWT from the Authorization Header as Bearer token
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret || 'kartseek-dev-secret-NOT-FOR-PRODUCTION',
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
      role: payload.role 
    };
  }
}

