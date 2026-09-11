import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RedisService } from '@app/redis';
import { AuditLog, type AuditLogDocument } from './schemas/audit-log.schema';

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
      store =
        state === 1 ? { status: 'up' } : { status: 'down', detail: `mongoose readyState=${state}` };
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
      // Top-level `userAgent`/`requestId` are the older HTTP caller's shape and
      // are folded into `metadata` — but only when they are actually present.
      // Assigning them unconditionally overwrote the nested values with
      // `undefined`, and both of this trail's real writers (the gateway
      // interceptor and the admin console) send them *inside* `metadata`. Every
      // stored row therefore lost its request id and user agent: the correlation
      // id that ties an audit entry to the gateway log line for the same request
      // was dropped on the way in, silently, on all 1,293 of them.
      metadata: {
        ...(dto.metadata ?? {}),
        ...(dto.userAgent ? { userAgent: dto.userAgent } : {}),
        ...(dto.requestId ? { requestId: dto.requestId } : {}),
      },
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
      existing.unshift({
        id: logId,
        ...entry,
        timestamp: saved.get('createdAt') ?? new Date().toISOString(),
      });
      await this.redis.setJson(
        AuditLogService.RECENT_KEY,
        existing.slice(0, AuditLogService.RECENT_CAP),
        86400,
      );
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
      this.auditModel
        .find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.auditModel.countDocuments(),
    ]);
    return { data, total, page, limit };
  }

  /** Every action taken by one administrator — previously a hardcoded `[]`. */
  async getLogsByUser(userId: string, page = 1, limit = 20) {
    ({ page, limit } = this.paginate(page, limit));
    const [data, total] = await Promise.all([
      this.auditModel
        .find({ actorId: userId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.auditModel.countDocuments({ actorId: userId }),
    ]);
    return { userId, data, total, page, limit };
  }

  /**
   * The filtered read the admin console asks for.
   *
   * `scope` is the caller's market as the gateway resolved it from the signed
   * token, and it overrides whatever `country` the request named — a
   * region-locked administrator cannot widen their own view by asking. The
   * `'ALL'` companion covers entries a service recorded as belonging to every
   * market (platform settings, a global rate change) which that administrator
   * is entitled to see.
   *
   * `'UNKNOWN'` is deliberately not in that set. It is what the gateway
   * interceptor writes when a request carried no `x-region-code` and the token
   * held no `regionCode` — in practice a global administrator's activity, with
   * no market to attribute it to. Handing those rows to a locked administrator
   * would leak exactly the cross-market activity the lock exists to hide, so an
   * unattributable row is withheld rather than shared.
   */
  async query(f: {
    page?: number;
    limit?: number;
    actorId?: string;
    actorEmail?: string;
    entityType?: string;
    entityId?: string;
    actionType?: string;
    country?: string;
    from?: string;
    to?: string;
    scope?: string;
  }) {
    const { page, limit } = this.paginate(f.page ?? 1, f.limit ?? 50);

    const filter: Record<string, unknown> = {};
    if (f.scope) filter.country = { $in: [f.scope.toUpperCase(), 'ALL'] };
    else if (f.country) filter.country = f.country.toUpperCase();
    if (f.actorId) filter.actorId = f.actorId;
    if (f.actorEmail) filter.actorEmail = f.actorEmail.toLowerCase();
    if (f.entityType) filter.entityType = f.entityType;
    if (f.entityId) filter.entityId = f.entityId;
    // A prefix match, so `http.post.` narrows to mutations and
    // `http.post./admin/marketplace` to one module. The action types the
    // gateway writes are dotted paths, so every metacharacter is escaped —
    // an unescaped `.` would match any character and quietly widen the filter.
    if (f.actionType) {
      filter.actionType = { $regex: `^${f.actionType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}` };
    }
    if (f.from || f.to) {
      filter.createdAt = {
        ...(f.from ? { $gte: new Date(f.from) } : {}),
        ...(f.to ? { $lte: new Date(f.to) } : {}),
      };
    }

    const [data, total] = await Promise.all([
      this.auditModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.auditModel.countDocuments(filter),
    ]);
    return { data, total, page, limit };
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
