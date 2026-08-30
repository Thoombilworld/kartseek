import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RedisService } from '@app/redis';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema';

/**
 * The platform's audit trail.
 *
 * `AuditLog` (Mongo, `audit_logs`) is the system of record: the schema blocks
 * `findOneAndUpdate` and `deleteOne`, so a written entry cannot be altered.
 * Redis holds only a rolling cache of the most recent entries so the admin
 * "recent activity" panel does not query Mongo on every page load.
 *
 * That split matters because it used to be the other way round: `logEvent`
 * wrote *only* to Redis, under a 24-hour TTL and capped at 1000 entries, with a
 * `TODO: persist to MongoDB` where the durable write belonged. The immutable
 * collection was declared and registered but never received a single document,
 * so the platform's audit trail silently expired every day and dropped the
 * oldest record once a thousand admin actions had accumulated — while
 * `getLogsByUser` and `getLogsByResource` returned hardcoded empty arrays, so
 * nothing on screen revealed that the history was gone.
 */
@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);
  private static readonly RECENT_KEY = 'audit:recent';
  private static readonly RECENT_CAP = 1000;

  constructor(
    @InjectModel(AuditLog.name) private readonly auditModel: Model<AuditLogDocument>,
    private readonly redis: RedisService,
  ) {}

  async healthCheck() {
    // Report the durable store, not just the process: an audit service that
    // cannot reach Mongo is not healthy, it is silently losing the trail.
    let store: { status: string; detail?: string };
    try {
      const state = this.auditModel.db.readyState;
      store = state === 1
        ? { status: 'up' }
        : { status: 'down', detail: `mongoose readyState=${state}` };
    } catch (err) {
      store = { status: 'down', detail: (err as Error)?.message };
    }
    return {
      service: 'audit-log-service',
      status: store.status === 'up' ? 'ok' : 'degraded',
      store,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Record one auditable action.
   *
   * Accepts both the shape the gateway interceptor emits and the older
   * `{ userId, action, resource }` shape the HTTP endpoint was written against,
   * so existing callers keep working while new ones can supply the full
   * before/after payload the governance spec asks for.
   */
  async logEvent(dto: Record<string, any>) {
    const entry = {
      actionType: dto.actionType ?? dto.action ?? 'unknown',
      actorId: String(dto.actorId ?? dto.userId ?? 'anonymous'),
      actorEmail: dto.actorEmail,
      actorRole: dto.actorRole,
      actorIp: dto.actorIp ?? dto.ipAddress,
      entityType: dto.entityType ?? dto.resource,
      entityId: dto.entityId ?? dto.resourceId,
      oldValue: dto.oldValue,
      newValue: dto.newValue,
      reason: dto.reason,
      metadata: { ...(dto.metadata ?? {}), userAgent: dto.userAgent, requestId: dto.requestId },
      isSensitive: Boolean(dto.isSensitive),
      country: dto.country ?? dto.regionCode ?? 'UNKNOWN',
      service: dto.service ?? 'api-gateway',
    };

    // The durable write is the one that must succeed. If Mongo is unreachable we
    // surface the failure rather than returning `{ success: true }` over a lost
    // record — a silently dropped audit entry is worse than a failed request.
    const saved = await this.auditModel.create(entry);
    const logId = String(saved._id);

    // Best-effort recent-activity cache. A Redis outage must not fail the write
    // that already landed in the system of record.
    try {
      const existing = (await this.redis.getJson<any[]>(AuditLogService.RECENT_KEY)) ?? [];
      existing.unshift({ id: logId, ...entry, timestamp: saved.get('createdAt') ?? new Date().toISOString() });
      await this.redis.setJson(AuditLogService.RECENT_KEY, existing.slice(0, AuditLogService.RECENT_CAP), 86400);
    } catch (err) {
      this.logger.warn(`recent-activity cache write failed: ${(err as Error)?.message}`);
    }

    return { success: true, logId };
  }

  /**
   * Recent entries. Served from Mongo, not from the Redis cache: the cache holds
   * at most the last 1000 entries for 24 hours, so paging past that returned an
   * empty page that read as "no admin activity" rather than "cache exhausted".
   */
  async getRecentLogs(page = 1, limit = 50) {
    ({ page, limit } = this.paginate(page, limit));
    const [data, total] = await Promise.all([
      this.auditModel.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      this.auditModel.countDocuments(),
    ]);
    return { data, total, page, limit };
  }

  /** Every action taken by one administrator — previously a hardcoded `[]`. */
  async getLogsByUser(userId: string, page = 1, limit = 20) {
    ({ page, limit } = this.paginate(page, limit));
    const [data, total] = await Promise.all([
      this.auditModel.find({ actorId: userId }).sort({ createdAt: -1 })
        .skip((page - 1) * limit).limit(limit).lean(),
      this.auditModel.countDocuments({ actorId: userId }),
    ]);
    return { userId, data, total, page, limit };
  }

  /** Full history for one entity — previously a hardcoded `[]`. */
  async getLogsByResource(resource: string, resourceId: string) {
    const data = await this.auditModel
      .find({ entityType: resource, entityId: resourceId })
      .sort({ createdAt: -1 })
      .lean();
    return { resource, resourceId, data, total: data.length };
  }

  private paginate(page: number, limit: number) {
    return {
      page: Math.max(1, Number(page) || 1),
      limit: Math.min(200, Math.max(1, Number(limit) || 50)),
    };
  }
}
