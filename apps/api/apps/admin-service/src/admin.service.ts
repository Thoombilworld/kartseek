import {
  Injectable,
  Logger,
  Optional,
  Inject,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { RedisService } from '@app/redis';
import { KafkaProducerService } from '@app/kafka';
import type { ClientProxy } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { catchError, firstValueFrom, timeout } from 'rxjs';
import { PageLayout } from './entities/page-layout.entity';
import { applyMarketFilter, assertInMarket, marketPredicate, rpcCatch } from '@app/common';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly kafka: KafkaProducerService,
    @InjectRepository(PageLayout) private readonly layoutRepo: Repository<PageLayout>,
    @Optional() @Inject(EntityManager) private readonly em: EntityManager | null,
    // Not optional. The revenue report is one of this service's routes and a
    // missing client must fail at boot with an UnknownDependenciesException,
    // where the log shows it, rather than as an unavailable report in
    // production.
    @Inject('ORDER_SERVICE') private readonly orderClient: ClientProxy,
  ) {}

  private isDbActive(): boolean {
    return process.env.SKIP_DB !== 'true' && this.em !== null;
  }

  // ── Layout Management ──────────────────────────────────────────────────────
  async getLayout(moduleName: string, pageName: string) {
    // Check Redis cache first
    const cacheKey = `admin:layout:${moduleName}:${pageName}`;
    const cached = await this.redis.getJson<PageLayout>(cacheKey);
    if (cached) return cached;

    const layout = await this.layoutRepo.findOne({ where: { moduleName, pageName } });
    if (!layout) {
      return { moduleName, pageName, sections: [] as unknown[] };
    }
    await this.redis.setJson(cacheKey, layout, 300);
    return layout;
  }

  async saveLayout(moduleName: string, pageName: string, sections: any[]) {
    let layout = await this.layoutRepo.findOne({ where: { moduleName, pageName } });
    if (!layout) {
      layout = this.layoutRepo.create({ moduleName, pageName, sections });
    } else {
      layout.sections = sections;
    }
    await this.layoutRepo.save(layout);

    // Invalidate cache
    await this.redis.del(`admin:layout:${moduleName}:${pageName}`);
    await this.kafka.publish(`${moduleName}.layout.updated`, { moduleName, pageName });
    return layout;
  }

  async healthCheck() {
    return {
      service: 'admin-service',
      status: 'ok',
      dbActive: this.isDbActive(),
      timestamp: new Date().toISOString(),
    };
  }

  // ── Dashboard Stats (Live Aggregation) ─────────────────────────────────────
  /**
   * Headline counters for the platform admin landing page.
   *
   * These used to be read entirely from `admin:counter:*` keys in Redis —
   * `admin:counter:users`, `admin:counter:orders`, `admin:counter:revenue` and
   * friends. Nothing in the platform ever wrote them. `incrementCounter` below
   * is the only writer and its sole caller is this service's own HTTP endpoint,
   * which nothing calls, so every figure on the dashboard was a hard zero while
   * the database held 44 users and 26 orders.
   *
   * The service split was worse: when Redis had no value it fell back to a
   * literal `{ marketplace: 35, grocery: 22, restaurant: 28, ... }`. Those are
   * not measurements, they are numbers someone typed, and they rendered as a
   * traffic breakdown chart.
   *
   * Counts now come from the database. Redis is kept only as a cache of the
   * result. Figures this service cannot reach are reported as `null` with a
   * reason rather than as zero — a module that moved to its own database is not
   * the same thing as a module with nothing in it, and the dashboard should not
   * present the two identically.
   */
  async getDashboardStats(scope?: string) {
    const cacheKey = `admin:dashboard:stats:${scope ?? 'ALL'}`;
    const cached = await this.redis.getJson<any>(cacheKey);
    if (cached) return cached;

    const today = new Date().toISOString().slice(0, 10);
    let users = { total: 0, active: 0, newToday: 0 };
    let orders = { total: 0, today: 0, pending: 0 };
    let revenue = { total: 0, today: 0 };

    if (this.isDbActive() && this.em) {
      try {
        // Schema-qualified on purpose: this service connects with schema
        // `admin`, so an unqualified `users` resolves to admin.users and finds
        // nothing.
        const [u] = await this.em.query(
          `SELECT
             COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE status = 'active')::int AS active,
             COUNT(*) FILTER (WHERE "createdAt"::date = $1)::int AS new_today
           -- region_code, not country: users.country carries an 'IN' DEFAULT,
           -- so a per-market user count taken from it was the whole platform's
           -- count under one market's name (audit V6). This has to count the
           -- same rows the users list shows for that market.
           FROM public.users${scope ? ' WHERE region_code = $2' : ''}`,
          scope ? [today, scope] : [today],
        );
        users = { total: u?.total ?? 0, active: u?.active ?? 0, newToday: u?.new_today ?? 0 };

        const [o] = await this.em.query(
          `SELECT
             COUNT(*)::int AS total,
             -- placedAt, not createdAt: order.orders has no createdAt column,
             -- and asking for one made the whole aggregate fail.
             COUNT(*) FILTER (WHERE "placedAt"::date = $1)::int AS today,
             -- status is an enum, so it is compared as text.
             COUNT(*) FILTER (WHERE status::text IN ('PENDING','PLACED','CONFIRMED'))::int AS pending,
             COALESCE(SUM("totalAmount"), 0)::float AS revenue_total,
             COALESCE(SUM("totalAmount") FILTER (WHERE "placedAt"::date = $1), 0)::float AS revenue_today
           FROM "order".orders${scope ? ' WHERE region_code = $2' : ''}`,
          scope ? [today, scope] : [today],
        );
        orders = { total: o?.total ?? 0, today: o?.today ?? 0, pending: o?.pending ?? 0 };
        revenue = { total: o?.revenue_total ?? 0, today: o?.revenue_today ?? 0 };
      } catch (err) {
        // Surfaced rather than swallowed: a failed aggregate must not be
        // indistinguishable from a genuinely empty platform.
        this.logger.error(`Dashboard aggregate failed: ${(err as Error)?.message}`);
        throw err;
      }
    }

    // Sellers and drivers live in kartseek_marketplace and kartseek_taxi now,
    // which this service has no connection to. Reported as unavailable rather
    // than zero, and rather than reaching across a database boundary the
    // module split exists to prevent — the figures belong behind each module's
    // own API.
    const crossModule = {
      value: null as number | null,
      unavailable: 'Owned by another module — query that module API directly',
    };

    const stats: Record<string, unknown> = {
      users,
      orders,
      revenue,
      sellers: crossModule,
      drivers: crossModule,
      pendingKyc: crossModule,
      // Null unless something has actually measured it. The previous literal
      // fallback rendered invented percentages as a traffic chart.
      serviceSplit: (await this.redis.getJson<any>('admin:service_split')) ?? null,
      generatedAt: new Date().toISOString(),
    };

    await this.redis.setJson(cacheKey, stats, 60);
    return stats;
  }

  // ── Platform Health ────────────────────────────────────────────────────────
  async getPlatformHealth() {
    // Check each infrastructure component
    const health: Record<string, any> = {
      services: [],
      infrastructure: {},
      checkedAt: new Date().toISOString(),
    };

    // Redis health (we're already using it)
    try {
      await this.redis.get('health:check:ping');
      health.infrastructure.redis = 'healthy';
    } catch {
      health.infrastructure.redis = 'unhealthy';
    }

    // PostgreSQL health
    if (this.isDbActive()) {
      try {
        await this.em!.query('SELECT 1');
        health.infrastructure.postgres = 'healthy';
      } catch {
        health.infrastructure.postgres = 'unhealthy';
      }
    } else {
      health.infrastructure.postgres = 'skipped';
    }

    // Kafka health (check via producer connectivity)
    health.infrastructure.kafka = 'healthy'; // If we got this far, Kafka module loaded

    // Service-level checks from Redis heartbeats
    const serviceNames = [
      'api-gateway',
      'auth-service',
      'marketplace-service',
      'grocery-service',
      'restaurant-service',
      'pharmacy-service',
      'doctor-service',
      'taxi-service',
      'hotel-service',
      'order-service',
      'payment-service',
      'delivery-service',
      'notification-service',
      'search-service',
      'wallet-service',
    ];

    for (const name of serviceNames) {
      const heartbeat = await this.redis.getJson<any>(`health:heartbeat:${name}`);
      health.services.push({
        name,
        status: heartbeat ? 'healthy' : 'unknown',
        lastHeartbeat: heartbeat?.timestamp ?? null,
        uptime: heartbeat?.uptime ?? null,
      });
    }

    return health;
  }

  // ── Users List (Real Query) ────────────────────────────────────────────────
  async getUsersList(
    page = 1,
    limit = 20,
    role?: string,
    country?: string,
    search?: string,
    scope?: string,
  ) {
    const market = marketPredicate(scope, country);

    // Try DB query first, fallback to Redis index
    if (this.isDbActive()) {
      try {
        // Raw columns, not `select('u')`.
        //
        // This service registers only `PageLayout`, so a query builder over the
        // bare table name `users` has no entity metadata at all: `select('u')`
        // emitted the invalid `SELECT u`, and `getManyAndCount()` threw
        // "Cannot get entity metadata for the given alias u" on every single
        // call. The catch below then fell through to `admin:users:index`, a
        // Redis key nothing in the platform writes — so GET /admin/users
        // answered 200 with an empty list for every administrator in every
        // market, and had done since it was written. Confirmed live against
        // both the previous and the current bundle before this was changed.
        //
        // The columns are named rather than taken as `u.*` so that
        // `passwordHash` and `refreshToken` cannot leave the service in a list
        // response.
        const qb = this.em!.createQueryBuilder()
          .select(
            'u.id, u.email, u.phone, u."firstName", u."lastName", u.role, u.status, ' +
              'u.country, u.region_code, u.region_locked, u."isActive", u."isEmailVerified", ' +
              'u."isPhoneVerified", u."isKycVerified", u."avatarUrl", u.seller_type, u."createdAt"',
          )
          .from('users', 'u');

        if (role) qb.andWhere('u.role = :role', { role });
        // `region_code`, not `country`: the lock in the token is minted from
        // `users.region_code`, and `users.country` carries an 'IN' DEFAULT that
        // made every customer look Indian (audit V6). A scoped caller also gets
        // NULL rows excluded — an unattributable user is nobody's to moderate.
        // One predicate for both the lock and a global admin's filter: the two
        // branches here bound the same column with two different parameter
        // names, which is how a repeated name silently takes the last value.
        applyMarketFilter(qb, 'u.region_code', scope, country);
        if (search) {
          // `u.name` does not exist on this table — the name is two columns —
          // so the old predicate turned any search into a 42703 and, through
          // the catch below, into an empty list.
          qb.andWhere(
            '(u."firstName" ILIKE :search OR u."lastName" ILIKE :search OR ' +
              'u.email ILIKE :search OR u.phone ILIKE :search)',
            { search: `%${search}%` },
          );
        }

        // `getCount()`/`skip`/`take` are entity-level too: they need the
        // primary key from the metadata this alias has none of. The count is
        // the same predicates over COUNT(*), and the page is OFFSET/LIMIT.
        const counted = await qb.clone().select('COUNT(*)', 'total').getRawOne<{ total: string }>();
        const total = Number(counted?.total ?? 0);

        const data = await qb
          // Quoted: unquoted `u.createdAt` is folded to `createdat` by Postgres
          // and the column does not exist under that name.
          .orderBy('u."createdAt"', 'DESC')
          .offset((page - 1) * limit)
          .limit(limit)
          .getRawMany();

        return { data, total, page, limit, hasMore: total > page * limit };
      } catch (err) {
        this.logger.warn(`DB query failed for users list: ${(err as Error).message}`);
      }
    }

    // Fallback: Redis-based user index
    const allUsers = (await this.redis.getJson<any[]>('admin:users:index')) ?? [];
    let filtered = allUsers;
    if (role) filtered = filtered.filter((u) => u.role === role);
    if (market && !scope) {
      filtered = filtered.filter(
        (u) => marketPredicate(undefined, u.regionCode ?? u.region_code) === market,
      );
    }
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (u) => u.name?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s),
      );
    }
    // A locked admin must not see every market's users just because the DB
    // query above failed or is switched off — fail closed: a user with no
    // resolvable market is excluded, not shown. `country` is deliberately not a
    // fallback source here; it is 'IN' on every row and would re-open V6.
    if (scope) {
      filtered = filtered.filter(
        (u) => marketPredicate(undefined, u.regionCode ?? u.region_code) === marketPredicate(scope),
      );
    }

    const start = (page - 1) * limit;
    return {
      data: filtered.slice(start, start + limit),
      total: filtered.length,
      page,
      limit,
      hasMore: filtered.length > start + limit,
    };
  }

  /**
   * Apply a moderation status change to the users table.
   *
   * Both callers used to swallow every failure here — a caught error was logged
   * at `warn` and the method still returned `{ success: true, status: 'BANNED' }`.
   * A ban that silently does not persist is the worst possible outcome for a
   * moderation action: the admin sees success, the account stays active, and
   * nothing surfaces until someone reads the logs. A zero-row update is treated
   * the same way, since "no such user" is equally not a completed ban.
   *
   * When the DB is deliberately switched off (`SKIP_DB`), Redis and the Kafka
   * event remain the record and this is a no-op by design — that is a configured
   * mode, not a failure.
   */
  private async applyUserStatus(userId: string, sql: string, params: unknown[]): Promise<void> {
    if (!this.isDbActive()) return;
    let result: any;
    try {
      result = await this.em!.query(sql, params);
    } catch (err) {
      const message = (err as Error).message;
      this.logger.error(`Moderation update failed for user ${userId}: ${message}`);
      throw new InternalServerErrorException(`Could not update user ${userId}: ${message}`);
    }
    // Each statement ends in `RETURNING id`, so the result is the list of rows
    // actually updated. `EntityManager.query` hands back only `result.rows` and
    // discards pg's `rowCount`, so RETURNING is the one portable way to tell a
    // successful update from one that matched nobody — without it a ban on a
    // non-existent user reports success.
    if (!Array.isArray(result) || result.length === 0) {
      this.logger.error(`Moderation update matched no user ${userId}`);
      throw new NotFoundException(`User ${userId} not found`);
    }
  }

  /**
   * The market a user belongs to, for the scope check on ban/unban.
   *
   * The aliases are given explicitly. `select(['u.id', 'u.region_code'])` on an
   * alias with no entity metadata — which is every alias in this service, see
   * `getUsersList` — emits the columns verbatim, so `getRawOne` hands back
   * `{ id, region_code }` and the `u_`-prefixed read was `undefined` for every
   * user. That resolved to "no market", which fails closed: a locked admin was
   * refused every ban, including in their own market, with copy claiming the
   * account belonged to every market. The two-argument `select`/`addSelect`
   * form sets the alias in SQL, so the shape below is the shape returned.
   */
  private async userMarket(userId: string): Promise<string | null> {
    if (!this.isDbActive() || !this.em) return null;
    const row = await this.em
      .createQueryBuilder()
      .select('u.id', 'u_id')
      .addSelect('u.region_code', 'u_region_code')
      .from('users', 'u')
      .where('u.id = :id', { id: userId })
      .getRawOne<{ u_id: string; u_region_code: string | null }>();
    if (!row) throw new NotFoundException('User not found');
    return row.u_region_code ?? null;
  }

  // ── Ban User ───────────────────────────────────────────────────────────────
  /**
   * Suspend an account, with the reason and the moment on the row.
   *
   * `banned_reason` had no column to land in until
   * `1786502000000-UserBanColumns`, so this UPDATE failed with 42703 on every
   * ban ever attempted and the endpoint answered 500 — the market check in
   * front of it was the only part that worked. `banned_at` is written with it:
   * a reason without a moment is not a record an appeal or an audit can use.
   *
   * The status is `suspended`, from the platform's own `AppStatus` vocabulary,
   * not the `'BANNED'` this wrote before. Nothing in the platform reads
   * `'BANNED'`, and the matching `'ACTIVE'` on unban left the account uncounted
   * by every `status = 'active'` filter — the dashboard's own included — so an
   * unbanned user came back invisible instead of active.
   *
   * One timestamp is used for the row, the Redis marker and the Kafka event, so
   * the record and the events cannot disagree about when it happened.
   */
  async banUser(userId: string, reason: string, adminId: string, scope?: string) {
    if (scope) assertInMarket(await this.userMarket(userId), scope, 'user', this.logger);
    const bannedAt = new Date().toISOString();
    await this.applyUserStatus(
      userId,
      `UPDATE users SET status = 'suspended', banned_reason = $1, banned_at = $2
        WHERE id = $3 RETURNING id`,
      [reason, bannedAt, userId],
    );

    // Redis marker
    await this.redis.setJson(
      `admin:banned:${userId}`,
      {
        userId,
        reason,
        adminId,
        bannedAt,
      },
      86400 * 365,
    );

    await this.kafka.publish('admin.user.banned', {
      userId,
      reason,
      adminId,
      bannedAt,
    });
    this.logger.warn(`User suspended: ${userId} by admin ${adminId} — ${reason}`);
    return { success: true, userId, status: 'suspended' };
  }

  // ── Unban User ─────────────────────────────────────────────────────────────
  /** Lift a ban: the account is active again and the record behind it is cleared. */
  async unbanUser(userId: string, adminId: string, scope?: string) {
    if (scope) assertInMarket(await this.userMarket(userId), scope, 'user', this.logger);
    await this.applyUserStatus(
      userId,
      `UPDATE users SET status = 'active', banned_reason = NULL, banned_at = NULL
        WHERE id = $1 RETURNING id`,
      [userId],
    );

    await this.redis.del(`admin:banned:${userId}`);
    await this.kafka.publish('admin.user.unbanned', {
      userId,
      adminId,
      unbannedAt: new Date().toISOString(),
    });
    return { success: true, userId, status: 'active' };
  }

  // ── KYC Management ─────────────────────────────────────────────────────────
  async getPendingKyc(page = 1, limit = 20, scope?: string) {
    // Scan Redis for pending KYC records
    const keys = await this.redis.keys('admin:kyc:pending:*');
    const pendingRecords: any[] = [];

    for (const key of keys) {
      const record = await this.redis.getJson<any>(key);
      if (record) pendingRecords.push(record);
    }

    const market = marketPredicate(scope);
    const inScope = market
      ? pendingRecords.filter(
          (r) => marketPredicate(undefined, r.country ?? r.countryCode ?? r.regionCode) === market,
        )
      : pendingRecords;

    inScope.sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
    const start = (page - 1) * limit;

    return {
      data: inScope.slice(start, start + limit),
      total: inScope.length,
      page,
      limit,
    };
  }

  async approveKyc(entityId: string, entityType: string, adminId: string, scope?: string) {
    const key = `admin:kyc:pending:${entityType}:${entityId}`;
    const pending = await this.redis.getJson<any>(key);
    if (!pending) throw new NotFoundException('No pending identity check with that id');
    assertInMarket(
      pending.country ?? pending.countryCode ?? pending.regionCode ?? null,
      scope,
      'identity check',
      this.logger,
    );

    // Remove from pending queue
    await this.redis.del(`admin:kyc:pending:${entityType}:${entityId}`);

    // Mark as verified
    await this.redis.setJson(
      `admin:kyc:verified:${entityType}:${entityId}`,
      {
        entityId,
        entityType,
        verifiedBy: adminId,
        verifiedAt: new Date().toISOString(),
      },
      86400 * 365,
    );

    // Update counter
    const pendingCount = parseInt((await this.redis.get('admin:counter:pending_kyc')) ?? '0', 10);
    if (pendingCount > 0)
      await this.redis.set('admin:counter:pending_kyc', String(pendingCount - 1));

    await this.kafka.publish('admin.kyc.approved', { entityId, entityType, adminId });
    this.logger.log(`KYC approved: ${entityType}/${entityId} by admin ${adminId}`);
    return { success: true, entityId, entityType, status: 'APPROVED' };
  }

  async rejectKyc(
    entityId: string,
    entityType: string,
    adminId: string,
    reason: string,
    scope?: string,
  ) {
    const key = `admin:kyc:pending:${entityType}:${entityId}`;
    const pending = await this.redis.getJson<any>(key);
    if (!pending) throw new NotFoundException('No pending identity check with that id');
    assertInMarket(
      pending.country ?? pending.countryCode ?? pending.regionCode ?? null,
      scope,
      'identity check',
      this.logger,
    );

    await this.redis.del(`admin:kyc:pending:${entityType}:${entityId}`);

    await this.redis.setJson(
      `admin:kyc:rejected:${entityType}:${entityId}`,
      {
        entityId,
        entityType,
        rejectedBy: adminId,
        reason,
        rejectedAt: new Date().toISOString(),
      },
      86400 * 30,
    );

    const pendingCount = parseInt((await this.redis.get('admin:counter:pending_kyc')) ?? '0', 10);
    if (pendingCount > 0)
      await this.redis.set('admin:counter:pending_kyc', String(pendingCount - 1));

    await this.kafka.publish('admin.kyc.rejected', { entityId, entityType, adminId, reason });
    return { success: true, entityId, entityType, status: 'REJECTED' };
  }

  // ── Audit Logs ─────────────────────────────────────────────────────────────
  async getAuditLogs(
    page = 1,
    limit = 50,
    filters?: {
      action?: string;
      adminId?: string;
      startDate?: string;
      endDate?: string;
      scope?: string;
    },
  ) {
    // Try Redis-based audit log storage
    const allLogs = (await this.redis.getJson<any[]>('admin:audit:logs')) ?? [];

    let filtered = allLogs;
    if (filters?.action) filtered = filtered.filter((l) => l.action === filters.action);
    if (filters?.adminId) filtered = filtered.filter((l) => l.adminId === filters.adminId);
    if (filters?.startDate)
      filtered = filtered.filter((l) => new Date(l.timestamp) >= new Date(filters.startDate!));
    if (filters?.endDate)
      filtered = filtered.filter((l) => new Date(l.timestamp) <= new Date(filters.endDate!));
    if (filters?.scope) {
      const market = marketPredicate(filters.scope);
      filtered = filtered.filter(
        (l) => marketPredicate(undefined, l.country) === market || l.country === 'ALL',
      );
    }

    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const start = (page - 1) * limit;

    return {
      data: filtered.slice(start, start + limit),
      total: filtered.length,
      page,
      limit,
    };
  }

  async addAuditLog(entry: {
    action: string;
    adminId: string;
    entityType: string;
    entityId: string;
    details?: any;
    country?: string;
  }) {
    const log = {
      id: `AUDIT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ...entry,
      country: entry.country ?? 'ALL',
      timestamp: new Date().toISOString(),
    };

    const logs = (await this.redis.getJson<any[]>('admin:audit:logs')) ?? [];
    logs.unshift(log);
    await this.redis.setJson('admin:audit:logs', logs.slice(0, 10000), 86400 * 90);

    // Forward onto the platform trail.
    //
    // This Redis list is capped at 10,000 entries under a 90-day TTL and is not
    // what the admin console reads any more — `GET /admin/audit-logs` goes to
    // audit-log-service and its immutable Mongo collection. The gateway stopped
    // calling `admin_audit_log_add`, but other services may still reach this
    // handler over TCP, and an entry written here and nowhere else would be an
    // administrative action absent from the one trail an auditor reads. The
    // publish makes the Redis list a cache of the real record rather than a
    // second, divergent one.
    //
    // Best-effort by design: a broker problem must not fail the write that has
    // already landed.
    try {
      await this.kafka.publish('audit.log', {
        actionType: entry.action,
        actorId: entry.adminId,
        entityType: entry.entityType,
        entityId: entry.entityId,
        metadata: entry.details,
        country: entry.country ?? 'ALL',
        service: 'admin-service',
      });
    } catch (err) {
      this.logger.warn(`audit forward failed for ${entry.action}: ${(err as Error)?.message}`);
    }

    return { success: true, logId: log.id };
  }

  // ── Revenue Report ─────────────────────────────────────────────────────────
  /**
   * The platform's revenue report, for one market or all of them.
   *
   * This used to sum per-day Redis counters — `admin:counter:revenue:<date>`
   * and `admin:counter:orders:<date>`, a key shape nothing writes: the counter
   * writer wrote `admin:counter:revenue` with no date at all before it was
   * bucketed by market, and writes `admin:counter:<kind>:<market>:<date>` now.
   * Both readings were zero, and that mismatch is older than the market
   * segment. A scoped caller got a `NotImplementedException` on top, so a
   * regional admin had no revenue report at all (audit F-27 / §3(b)).
   *
   * Pointing it at the new keys would not have fixed it: those buckets include
   * a `GLOBAL` one for events that carry no market, and reading that as a
   * market's revenue is the failure AUD2-095 exists to prevent. `"order".orders`
   * carries `region_code` per row, so the report is a query now — real rows,
   * grouped and filtered by the database, never a synthesised series.
   *
   * `country` is the market a global admin asked for; `scope` is the lock a
   * regional admin carries. `marketPredicate` puts the lock first, so a locked
   * admin naming another market gets their own figures rather than that
   * market's — the gateway has already refused the request outright by then.
   */
  async getRevenueReport(
    startDate: string,
    endDate: string,
    groupBy: 'day' | 'week' | 'month' = 'day',
    scope?: string,
    country?: string,
  ) {
    return firstValueFrom(
      this.orderClient
        .send(
          { cmd: 'orders.revenue_by_period' },
          { startDate, endDate, groupBy, market: marketPredicate(scope, country) },
        )
        .pipe(timeout(10_000), catchError(rpcCatch('Order service unavailable'))),
    );
  }

  // ── Increment Counter (called by other services) ───────────────────────────
  private static readonly COUNTER_TTL_SECONDS = 86400 * 365;

  /**
   * A dashboard counter, bucketed by market.
   *
   * These keys had no market segment at all, so there was exactly one revenue
   * figure and one order count for the whole platform and no per-market number
   * could ever be produced from them (audit C §2 #5 / AUD2-095). `GLOBAL` is
   * the bucket for an event that genuinely carries no market, so "not yet
   * attributed" stays distinguishable from "everyone's".
   *
   * The old unsegmented keys are left where they are, unread, and expire with
   * their existing one-year TTL.
   *
   * Private, and the two kinds are the type: the counters are written by this
   * service when it processes the event being counted, never by a request body
   * naming its own counter and its own market. The HTTP endpoint that did
   * exactly that is gone — see the note at the foot of `admin.controller.ts`.
   *
   * `amount` is summed as a float: revenue is not an integer and `parseInt`
   * used to truncate it.
   */
  private async incrementCounter(
    kind: 'revenue' | 'orders',
    amount = 1,
    market?: string,
  ): Promise<void> {
    const bucket = marketPredicate(market) ?? 'GLOBAL';
    const dateKey = new Date().toISOString().slice(0, 10);
    const key = `admin:counter:${kind}:${bucket}:${dateKey}`;
    const current = Number((await this.redis.get(key)) ?? 0);
    await this.redis.set(key, String(current + amount), AdminService.COUNTER_TTL_SECONDS);
  }
}
