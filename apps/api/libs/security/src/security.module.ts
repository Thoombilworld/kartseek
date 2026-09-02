import { Module, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { DdosProtectionMiddleware } from './ddos-protection.middleware';
import { WsDdosGuard } from './ws-ddos.guard';
import { DdosMonitorService } from './ddos-monitor.service';
import { PciSecurityService } from './pci-security.service';
import { PciComplianceInterceptor } from './pci-compliance.interceptor';
import { PiiEncryptionInterceptor } from './pii-encryption.interceptor';
import { InputSanitizerMiddleware } from './input-sanitizer.middleware';
import { RequestIdMiddleware } from './request-id.middleware';
import { CsrfGuard } from './csrf-protection.guard';
import { AccountLockoutService } from './account-lockout.service';
import { EncryptionService } from './encryption.service';
import { ResourceOwnershipGuard } from './resource-ownership.guard';
import { RedisModule } from '@app/redis';

/**
 * SecurityModule — Comprehensive security layer for KARTSEEK.
 *
 * Includes:
 *  - JWT authentication (Passport strategy + guard)
 *  - DDoS protection middleware (HTTP rate limiting + burst detection)
 *  - WebSocket DDoS guard (message flood + connection storm protection)
 *  - DDoS monitoring service (scheduled health checks + admin controls)
 *  - PCI-DSS Compliance security helper (validation, masking, and redaction)
 *  - PCI-DSS Compliance interceptor (automatic card masking and redaction)
 *  - Input sanitization middleware (SQL/NoSQL/XSS/CMD injection prevention)
 *  - Request ID middleware (distributed tracing correlation)
 *  - CSRF protection guard (double-submit cookie pattern)
 *  - Account lockout service (progressive login attempt throttling)
 */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    RedisModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret && process.env.NODE_ENV === 'production') {
          throw new Error('FATAL: JWT_SECRET environment variable must be set in production');
        }
        return {
          secret: secret || 'kartseek-dev-secret-NOT-FOR-PRODUCTION',
          signOptions: { expiresIn: `${configService.get<number>('JWT_EXPIRES_IN', 900)}s` },
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [
    JwtStrategy,
    JwtAuthGuard,
    DdosProtectionMiddleware,
    WsDdosGuard,
    DdosMonitorService,
    PciSecurityService,
    PciComplianceInterceptor,
    PiiEncryptionInterceptor,
    InputSanitizerMiddleware,
    RequestIdMiddleware,
    CsrfGuard,
    AccountLockoutService,
    EncryptionService,
    ResourceOwnershipGuard,
  ],
  exports: [
    JwtStrategy,
    JwtAuthGuard,
    DdosProtectionMiddleware,
    WsDdosGuard,
    DdosMonitorService,
    PciSecurityService,
    PciComplianceInterceptor,
    PiiEncryptionInterceptor,
    InputSanitizerMiddleware,
    RequestIdMiddleware,
    CsrfGuard,
    AccountLockoutService,
    EncryptionService,
    ResourceOwnershipGuard,
    PassportModule,
    JwtModule,
  ],
})
export class SecurityModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply security middleware stack to ALL API routes (order matters)
    consumer
      .apply(
        RequestIdMiddleware,       // 1. Assign correlation ID
        InputSanitizerMiddleware,  // 2. Scan & sanitize injection patterns
        DdosProtectionMiddleware,  // 3. Rate limiting & DDoS protection
      )
      .forRoutes('*');
  }
}
