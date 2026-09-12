import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SecurityModule } from '@app/security';
import { GdprService } from './gdpr.service';
import { GdprController } from './gdpr.controller';
import { DataRetentionService } from './data-retention.service';

/**
 * GDPR & Data Privacy Compliance Module
 *
 * Provides:
 *  - Right to Access (data export)
 *  - Right to Erasure (account deletion)
 *  - Consent management & audit trail
 *  - Automated data retention & purging
 *  - Data portability (JSON/CSV export)
 *  - Admin controls for managing data requests
 *
 * `SecurityModule` is imported for its exported `JwtModule`, not for a
 * provider of its own: `GdprController` binds the gateway's permission-aware
 * `RolesGuard`, Nest instantiates a `@UseGuards` class in the injector of the
 * module that declares the controller, and that guard injects `JwtService`.
 * Without this import the gateway would fail to boot with an
 * `UnknownDependenciesException` the moment the swap landed. The previous guard
 * (`@app/guards`) took only a `Reflector` and enforced no permission key at
 * all — see the import rationale in `gdpr.controller.ts`.
 */
@Global()
@Module({
  imports: [ConfigModule, SecurityModule],
  controllers: [GdprController],
  providers: [GdprService, DataRetentionService],
  exports: [GdprService, DataRetentionService],
})
export class GdprModule {}
