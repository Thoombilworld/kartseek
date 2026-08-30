import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
 */
@Global()
@Module({
  imports: [ConfigModule],
  controllers: [GdprController],
  providers: [GdprService, DataRetentionService],
  exports: [GdprService, DataRetentionService],
})
export class GdprModule {}
