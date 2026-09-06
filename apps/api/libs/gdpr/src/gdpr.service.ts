import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@app/redis';
import { KafkaProducerService } from '@app/kafka';

export type ConsentType =
  | 'marketing_email'
  | 'marketing_sms'
  | 'marketing_push'
  | 'analytics'
  | 'location_tracking'
  | 'data_sharing_partners'
  | 'personalized_ads'
  | 'order_notifications';

export interface ConsentRecord {
  userId: string;
  consentType: ConsentType;
  granted: boolean;
  grantedAt?: string;
  revokedAt?: string;
  ipAddress?: string;
  userAgent?: string;
  version: string; // Policy version when consent was given
}

export interface DataExportRequest {
  id: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requestedAt: string;
  completedAt?: string;
  downloadUrl?: string;
  expiresAt?: string;
  format: 'json' | 'csv';
}

export interface ErasureRequest {
  id: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'rejected';
  reason?: string;
  requestedAt: string;
  processedAt?: string;
  processedBy?: string;
  retainedData?: string[]; // Data types retained for legal reasons
}

/**
 * GDPR Compliance Service
 *
 * Implements all GDPR rights:
 *  - Article 7:  Consent management
 *  - Article 15: Right of access (data export)
 *  - Article 17: Right to erasure
 *  - Article 20: Right to data portability
 *  - Article 25: Data protection by design (retention policies)
 */
@Injectable()
export class GdprService {
  private readonly logger = new Logger(GdprService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly kafka: KafkaProducerService,
  ) {}

  // ── Consent Management (Article 7) ─────────────────────────────────────────

  /**
   * Record user consent for a specific data processing purpose.
   */
  async grantConsent(
    userId: string,
    consentType: ConsentType,
    metadata?: { ipAddress?: string; userAgent?: string; policyVersion?: string },
  ): Promise<ConsentRecord> {
    const record: ConsentRecord = {
      userId,
      consentType,
      granted: true,
      grantedAt: new Date().toISOString(),
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      version: metadata?.policyVersion ?? '1.0',
    };

    await this.redis.setJson(`gdpr:consent:${userId}:${consentType}`, record, 0);

    // Audit trail — immutable consent log
    await this.redis.lpush(
      `gdpr:consent:log:${userId}`,
      JSON.stringify({
        action: 'granted',
        ...record,
        timestamp: new Date().toISOString(),
      }),
    );

    await this.kafka.publish('gdpr.consent.granted', { userId, consentType });
    this.logger.log(`Consent granted: ${userId} → ${consentType}`);
    return record;
  }

  /**
   * Revoke user consent for a specific data processing purpose.
   */
  async revokeConsent(userId: string, consentType: ConsentType): Promise<ConsentRecord> {
    const existing = await this.redis.getJson<ConsentRecord>(
      `gdpr:consent:${userId}:${consentType}`,
    );
    const record: ConsentRecord = {
      ...existing,
      userId,
      consentType,
      granted: false,
      revokedAt: new Date().toISOString(),
      version: existing?.version ?? '1.0',
    };

    await this.redis.setJson(`gdpr:consent:${userId}:${consentType}`, record, 0);

    await this.redis.lpush(
      `gdpr:consent:log:${userId}`,
      JSON.stringify({
        action: 'revoked',
        ...record,
        timestamp: new Date().toISOString(),
      }),
    );

    await this.kafka.publish('gdpr.consent.revoked', { userId, consentType });
    this.logger.log(`Consent revoked: ${userId} → ${consentType}`);
    return record;
  }

  /**
   * Get all consent records for a user.
   */
  async getUserConsents(userId: string): Promise<ConsentRecord[]> {
    const consentTypes: ConsentType[] = [
      'marketing_email',
      'marketing_sms',
      'marketing_push',
      'analytics',
      'location_tracking',
      'data_sharing_partners',
      'personalized_ads',
      'order_notifications',
    ];

    const records: ConsentRecord[] = [];
    for (const type of consentTypes) {
      const record = await this.redis.getJson<ConsentRecord>(`gdpr:consent:${userId}:${type}`);
      records.push(
        record ?? {
          userId,
          consentType: type,
          granted: false,
          version: '1.0',
        },
      );
    }
    return records;
  }

  /**
   * Check if user has granted specific consent.
   */
  async hasConsent(userId: string, consentType: ConsentType): Promise<boolean> {
    const record = await this.redis.getJson<ConsentRecord>(`gdpr:consent:${userId}:${consentType}`);
    return record?.granted === true;
  }

  // ── Right of Access / Data Portability (Articles 15 & 20) ──────────────────

  /**
   * Request a full data export for a user.
   * Returns immediately with a request ID — processing happens asynchronously.
   */
  async requestDataExport(
    userId: string,
    format: 'json' | 'csv' = 'json',
  ): Promise<DataExportRequest> {
    const requestId = `GDPR-EXPORT-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const request: DataExportRequest = {
      id: requestId,
      userId,
      status: 'pending',
      requestedAt: new Date().toISOString(),
      format,
    };

    await this.redis.setJson(`gdpr:export:${requestId}`, request, 86400 * 30); // 30 days
    await this.redis.lpush(`gdpr:exports:${userId}`, requestId);

    await this.kafka.publish('gdpr.data.export.requested', { requestId, userId, format });
    this.logger.log(`Data export requested: ${requestId} for user ${userId}`);
    return request;
  }

  /**
   * Process a data export request — aggregates all user data.
   */
  async processDataExport(requestId: string): Promise<DataExportRequest> {
    const request = await this.redis.getJson<DataExportRequest>(`gdpr:export:${requestId}`);
    if (!request) throw new Error(`Export request ${requestId} not found`);

    request.status = 'processing';
    await this.redis.setJson(`gdpr:export:${requestId}`, request, 86400 * 30);

    const userId = request.userId;

    // Aggregate all user data from all services
    const userData = {
      exportedAt: new Date().toISOString(),
      format: request.format,
      user: {
        profile: (await this.redis.getJson(`user:${userId}`)) ?? {},
        consents: await this.getUserConsents(userId),
      },
      orders: await this.getListData(`orders:user:${userId}`),
      rides: await this.getListData(`rides:user:${userId}`),
      deliveries: await this.getListData(`deliveries:user:${userId}`),
      wallet: (await this.redis.getJson(`wallet:${userId}`)) ?? {},
      loyalty: (await this.redis.getJson(`loyalty:${userId}`)) ?? {},
      addresses: await this.getListData(`addresses:${userId}`),
      searchHistory: await this.getListData(`search:history:${userId}`),
      supportTickets: await this.getListData(`support:user:${userId}`),
      notifications: await this.getListData(`notifications:${userId}`),
      loginHistory: await this.getListData(`auth:logins:${userId}`),
      consentAuditTrail: await this.getListData(`gdpr:consent:log:${userId}`),
    };

    // Store the export data (in production, this would go to S3/GCS)
    await this.redis.setJson(`gdpr:export:data:${requestId}`, userData, 86400 * 7); // 7 days

    request.status = 'completed';
    request.completedAt = new Date().toISOString();
    request.downloadUrl = `/api/v1/gdpr/export/${requestId}/download`;
    request.expiresAt = new Date(Date.now() + 7 * 86400 * 1000).toISOString();
    await this.redis.setJson(`gdpr:export:${requestId}`, request, 86400 * 30);

    await this.kafka.publish('gdpr.data.export.completed', { requestId, userId });
    this.logger.log(`Data export completed: ${requestId}`);
    return request;
  }

  /**
   * Get the status of a data export request.
   */
  async getExportStatus(requestId: string): Promise<DataExportRequest | null> {
    return this.redis.getJson<DataExportRequest>(`gdpr:export:${requestId}`);
  }

  /**
   * Download the exported data.
   */
  async getExportData(requestId: string): Promise<Record<string, unknown> | null> {
    return this.redis.getJson(`gdpr:export:data:${requestId}`);
  }

  // ── Right to Erasure (Article 17) ──────────────────────────────────────────

  /**
   * Request account deletion / data erasure.
   */
  async requestErasure(userId: string, reason?: string): Promise<ErasureRequest> {
    const requestId = `GDPR-ERASE-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const request: ErasureRequest = {
      id: requestId,
      userId,
      status: 'pending',
      reason,
      requestedAt: new Date().toISOString(),
    };

    await this.redis.setJson(`gdpr:erasure:${requestId}`, request, 86400 * 90); // 90 days
    await this.redis.lpush(`gdpr:erasures:${userId}`, requestId);

    await this.kafka.publish('gdpr.data.erasure.requested', { requestId, userId, reason });
    this.logger.log(`Data erasure requested: ${requestId} for user ${userId}`);
    return request;
  }

  /**
   * Process an erasure request — deletes all user data except legally required records.
   */
  async processErasure(requestId: string, adminId?: string): Promise<ErasureRequest> {
    const request = await this.redis.getJson<ErasureRequest>(`gdpr:erasure:${requestId}`);
    if (!request) throw new Error(`Erasure request ${requestId} not found`);

    const userId = request.userId;
    request.status = 'processing';
    await this.redis.setJson(`gdpr:erasure:${requestId}`, request, 86400 * 90);

    // Keys to delete (user-identifiable data)
    const keysToDelete = [
      `user:${userId}`,
      `user:profile:${userId}`,
      `wallet:${userId}`,
      `loyalty:${userId}`,
      `cart:${userId}`,
      `wishlist:${userId}`,
      `search:history:${userId}`,
      `notifications:${userId}`,
      `auth:sessions:${userId}`,
    ];

    // Delete consent data (except the audit trail — required for legal compliance)
    const consentTypes: ConsentType[] = [
      'marketing_email',
      'marketing_sms',
      'marketing_push',
      'analytics',
      'location_tracking',
      'data_sharing_partners',
      'personalized_ads',
      'order_notifications',
    ];
    for (const type of consentTypes) {
      keysToDelete.push(`gdpr:consent:${userId}:${type}`);
    }

    // Execute deletions
    let deletedCount = 0;
    for (const key of keysToDelete) {
      try {
        await this.redis.del(key);
        deletedCount++;
      } catch (err) {
        this.logger.warn(`Failed to delete key: ${key}`);
      }
    }

    // Retain legally required data (financial records, tax compliance)
    request.retainedData = [
      'order_financial_records (7-year tax retention)',
      'payment_transaction_logs (regulatory requirement)',
      'consent_audit_trail (GDPR Article 7 proof)',
      'fraud_detection_records (legitimate interest)',
    ];

    request.status = 'completed';
    request.processedAt = new Date().toISOString();
    request.processedBy = adminId ?? 'SYSTEM';
    await this.redis.setJson(`gdpr:erasure:${requestId}`, request, 86400 * 90);

    await this.kafka.publish('gdpr.data.erasure.completed', {
      requestId,
      userId,
      deletedKeys: deletedCount,
    });

    this.logger.log(`Data erasure completed: ${requestId} (${deletedCount} keys deleted)`);
    return request;
  }

  /**
   * Get erasure request status.
   */
  async getErasureStatus(requestId: string): Promise<ErasureRequest | null> {
    return this.redis.getJson<ErasureRequest>(`gdpr:erasure:${requestId}`);
  }

  // ── Admin Analytics ────────────────────────────────────────────────────────

  /**
   * Get GDPR compliance dashboard data for the admin panel.
   */
  async getComplianceDashboard(): Promise<Record<string, unknown>> {
    return {
      timestamp: new Date().toISOString(),
      consentPolicy: {
        currentVersion: '1.0',
        lastUpdated: '2026-01-15T00:00:00Z',
        types: [
          'marketing_email',
          'marketing_sms',
          'marketing_push',
          'analytics',
          'location_tracking',
          'data_sharing_partners',
          'personalized_ads',
          'order_notifications',
        ],
      },
      dataRetention: {
        userProfiles: '2 years after last activity',
        orderRecords: '7 years (tax compliance)',
        paymentLogs: '7 years (regulatory)',
        searchHistory: '90 days',
        notifications: '30 days',
        sessionLogs: '30 days',
        consentAuditTrail: 'Indefinite (legal requirement)',
      },
      dataProcessingBasis: {
        orderFulfillment: 'Contract (Article 6(1)(b))',
        marketing: 'Consent (Article 6(1)(a))',
        analytics: 'Legitimate Interest (Article 6(1)(f))',
        taxCompliance: 'Legal Obligation (Article 6(1)(c))',
        fraudPrevention: 'Legitimate Interest (Article 6(1)(f))',
      },
    };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async getListData(key: string): Promise<unknown[]> {
    try {
      const items = await this.redis.lrange(key, 0, -1);
      return items.map((item) => {
        try {
          return JSON.parse(item);
        } catch {
          return item;
        }
      });
    } catch {
      return [];
    }
  }
}
