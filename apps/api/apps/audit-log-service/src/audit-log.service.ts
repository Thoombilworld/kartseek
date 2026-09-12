import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RedisService } from '@app/redis';
import { AuditLog, type AuditLogDocument } from './schemas/audit-log.schema';

/**
 * One filter value, or nothing.
 *
 * `query` is reached over TCP, where the payload is whatever the caller
 * serialised — this service, not the gateway, is the enforcement point for its
 * own scoping, and that has to cover the *types* of its inputs too. A non-string
 * here used to reach Mongo unchanged, so `{ entityType: { $ne: 'x' } }` would
 * have become a field-level operator, and `f.actorEmail.toLowerCase()` on a
 * number threw a TypeError the gateway reported as a 503. Anything that is not a
 * non-empty string is dropped, which is the safe reading of "no filter".
 */
function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/**
 * An `'ALL'` row as a locked reader may see it: the fact, not the payload.
 *
 * The scope filter is `country ∈ [scope, 'ALL']`, as the B5 plan ruled (task-5
 * report: "**not** `country = scope`") — because a global action that a
 * regional administrator cannot see at all reads as "nothing happened in my
 * market", which is the lie this trail exists to prevent. That ruling is about
 * DISCLOSING THE FACT of the action. It is not a reason to ship its contents:
 * a console row is stamped `scope ?? x-region-code ?? 'ALL'`, so a global
 * administrator acting with no market selected filed under `'ALL'` and every
 * regional administrator then read that row's `metadata`, `reason` and
 * before/after values — entity ids, stated reasons and the values themselves,
 * for actions taken in other markets (whole-branch review, finding A-4).
 *
 * Withheld in the PROJECTION and not in the filter, deliberately: dropping the
 * row would change the totals a locked reader sees, and a marker that says
 * "there is a platform-wide action here and its payload is not yours" is both
 * more honest and less informative than a gap in the page. Everything that
 * makes the row visible survives — actor, action type, entity TYPE, service,
 * timestamps.
 *
 * A row in the reader's own market is untouched, and a global reader (no
 * `scope`) sees everything.
 */
const WITHHELD = 'platform-wide action; payload not in your market';

function withholdGlobalPayload<T extends Record<string, any>>(row: T): T {
  if (String(row?.country ?? '').toUpperCase() !== 'ALL') return row;
  const { reason, oldValue, newValue, entityId, metadata, ...rest } = row;
  return { ...rest, metadata: { withheld: WITHHELD } } as unknown as T;
}

/** One end of the `createdAt` range, dropped unless it parses to a real date. */
function dateBound(op: '$gte' | '$lte', value: unknown): Record<string, Date> {
  const text = str(value);
  if (!text) return {};
  const date = new Date(text);
  // `new Date('nonsense')` is an Invalid Date, and Mongo matches *nothing*
  // against one — a typo in the date box would empty the table and read as "no
  // administrative activity" rather than "that is not a date".
  return Number.isNaN(date.getTime()) ? {} : { [op]: date };
}

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
      // Lower-cased to match how `query` filters, for the same reason `country`
      // is upper-cased below.
      actorEmail: dto.actorEmail ? String(dto.actorEmail).toLowerCase() : undefined,
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
      // Normalised on the way in, because `query` filters on the upper-cased
      // form. A writer that sent `x-region-code: qa` stored `country: 'qa'`,
      // which matches neither `{ $in: ['QA', 'ALL'] }` nor `'QA'` — the row was
      // written, durable, and invisible to every scoped query, which on an audit
      // trail is indistinguishable from never having been written. Doing it here
      // rather than at each caller closes it for all three writers at once: the
      // gateway interceptor, the Kafka events other services publish, and the
      // console's `audit.record`.
      country: String(dto.country ?? dto.regionCode ?? 'UNKNOWN').toUpperCase(),
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
   *
   * An `'ALL'` row reaches a locked reader with its payload withheld — see
   * `withholdGlobalPayload` above for why the fact and the contents are
   * different questions.
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
    const { page, limit } = this.paginate(Number(f?.page ?? 1), Number(f?.limit ?? 50));

    const filter: Record<string, unknown> = {};
    const scope = str(f?.scope);
    const country = str(f?.country);
    const actorEmail = str(f?.actorEmail);
    const actionType = str(f?.actionType);

    if (scope) filter.country = { $in: [scope.toUpperCase(), 'ALL'] };
    else if (country) filter.country = country.toUpperCase();
    if (str(f?.actorId)) filter.actorId = str(f?.actorId);
    if (actorEmail) filter.actorEmail = actorEmail.toLowerCase();
    if (str(f?.entityType)) filter.entityType = str(f?.entityType);
    if (str(f?.entityId)) filter.entityId = str(f?.entityId);
    // A prefix match, so `http.post.` narrows to mutations and
    // `http.post./admin/marketplace` to one module. The action types the
    // gateway writes are dotted paths, so every metacharacter is escaped —
    // an unescaped `.` would match any character and quietly widen the filter.
    if (actionType) {
      filter.actionType = { $regex: `^${actionType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}` };
    }
    const range = {
      ...dateBound('$gte', f?.from),
      ...dateBound('$lte', f?.to),
    };
    if (Object.keys(range).length) filter.createdAt = range;

    const [data, total] = await Promise.all([
      this.auditModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.auditModel.countDocuments(filter),
    ]);
    return {
      data: scope ? data.map((row) => withholdGlobalPayload(row)) : data,
      total,
      page,
      limit,
    };
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
