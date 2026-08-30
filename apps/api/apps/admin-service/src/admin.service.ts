import {
  Injectable, Logger, Optional, Inject,
  InternalServerErrorException, NotFoundException,
} from '@nestjs/common';
import { RedisService } from '@app/redis';
import { KafkaProducerService } from '@app/kafka';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { PageLayout } from './entities/page-layout.entity';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly kafka: KafkaProducerService,
    @InjectRepository(PageLayout) private readonly layoutRepo: Repository<PageLayout>,
    @Optional() @Inject(EntityManager) private readonly em: EntityManager | null,
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

    let layout = await this.layoutRepo.findOne({ where: { moduleName, pageName } });
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
  async getDashboardStats() {
    const cacheKey = 'admin:dashboard:stats';
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
           FROM public.users`,
          [today],
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
           FROM "order".orders`,
          [today],
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
      'api-gateway', 'auth-service', 'marketplace-service', 'grocery-service',
      'restaurant-service', 'pharmacy-service', 'doctor-service', 'taxi-service',
      'hotel-service', 'order-service', 'payment-service', 'delivery-service',
      'notification-service', 'search-service', 'wallet-service',
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
  async getUsersList(page = 1, limit = 20, role?: string, country?: string, search?: string) {
    // Try DB query first, fallback to Redis index
    if (this.isDbActive()) {
      try {
        const qb = this.em!.createQueryBuilder()
          .select('u')
          .from('users', 'u');

        if (role) qb.andWhere('u.role = :role', { role });
        if (country) qb.andWhere('u.country = :country', { country });
        if (search) {
          qb.andWhere('(u.name ILIKE :search OR u.email ILIKE :search OR u.phone ILIKE :search)', {
            search: `%${search}%`,
          });
        }

        qb.orderBy('u.createdAt', 'DESC')
          .skip((page - 1) * limit)
          .take(limit);

        const [data, total] = await qb.getManyAndCount();
        return { data, total, page, limit, hasMore: total > page * limit };
      } catch (err) {
        this.logger.warn(`DB query failed for users list: ${(err as Error).message}`);
      }
    }

    // Fallback: Redis-based user index
    const allUsers = (await this.redis.getJson<any[]>('admin:users:index')) ?? [];
    let filtered = allUsers;
    if (role) filtered = filtered.filter((u) => u.role === role);
    if (country) filtered = filtered.filter((u) => u.country === country);
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter((u) =>
        u.name?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s),
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

  // ── Ban User ───────────────────────────────────────────────────────────────
  async banUser(userId: string, reason: string, adminId: string) {
    await this.applyUserStatus(
      userId,
      `UPDATE users SET status = 'BANNED', banned_reason = $1 WHERE id = $2 RETURNING id`,
      [reason, userId],
    );

    // Redis marker
    await this.redis.setJson(`admin:banned:${userId}`, {
      userId, reason, adminId, bannedAt: new Date().toISOString(),
    }, 86400 * 365);

    await this.kafka.publish('admin.user.banned', { userId, reason, adminId, bannedAt: new Date().toISOString() });
    this.logger.warn(`User BANNED: ${userId} by admin ${adminId} — ${reason}`);
    return { success: true, userId, status: 'BANNED' };
  }

  // ── Unban User ─────────────────────────────────────────────────────────────
  async unbanUser(userId: string, adminId: string) {
    await this.applyUserStatus(
      userId,
      `UPDATE users SET status = 'ACTIVE', banned_reason = NULL WHERE id = $1 RETURNING id`,
      [userId],
    );

    await this.redis.del(`admin:banned:${userId}`);
    await this.kafka.publish('admin.user.unbanned', { userId, adminId, unbannedAt: new Date().toISOString() });
    return { success: true, userId, status: 'ACTIVE' };
  }

  // ── KYC Management ─────────────────────────────────────────────────────────
  async getPendingKyc(page = 1, limit = 20) {
    // Scan Redis for pending KYC records
    const keys = await this.redis.keys('admin:kyc:pending:*');
    const pendingRecords: any[] = [];

    for (const key of keys) {
      const record = await this.redis.getJson<any>(key);
      if (record) pendingRecords.push(record);
    }

    pendingRecords.sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
    const start = (page - 1) * limit;

    return {
      data: pendingRecords.slice(start, start + limit),
      total: pendingRecords.length,
      page,
      limit,
    };
  }

  async approveKyc(entityId: string, entityType: string, adminId: string) {
    // Remove from pending queue
    await this.redis.del(`admin:kyc:pending:${entityType}:${entityId}`);

    // Mark as verified
    await this.redis.setJson(`admin:kyc:verified:${entityType}:${entityId}`, {
      entityId, entityType, verifiedBy: adminId, verifiedAt: new Date().toISOString(),
    }, 86400 * 365);

    // Update counter
    const pending = parseInt(await this.redis.get('admin:counter:pending_kyc') ?? '0', 10);
    if (pending > 0) await this.redis.set('admin:counter:pending_kyc', String(pending - 1));

    await this.kafka.publish('admin.kyc.approved', { entityId, entityType, adminId });
    this.logger.log(`KYC approved: ${entityType}/${entityId} by admin ${adminId}`);
    return { success: true, entityId, entityType, status: 'APPROVED' };
  }

  async rejectKyc(entityId: string, entityType: string, adminId: string, reason: string) {
    await this.redis.del(`admin:kyc:pending:${entityType}:${entityId}`);

    await this.redis.setJson(`admin:kyc:rejected:${entityType}:${entityId}`, {
      entityId, entityType, rejectedBy: adminId, reason, rejectedAt: new Date().toISOString(),
    }, 86400 * 30);

    const pending = parseInt(await this.redis.get('admin:counter:pending_kyc') ?? '0', 10);
    if (pending > 0) await this.redis.set('admin:counter:pending_kyc', String(pending - 1));

    await this.kafka.publish('admin.kyc.rejected', { entityId, entityType, adminId, reason });
    return { success: true, entityId, entityType, status: 'REJECTED' };
  }

  // ── Audit Logs ─────────────────────────────────────────────────────────────
  async getAuditLogs(page = 1, limit = 50, filters?: { action?: string; adminId?: string; startDate?: string; endDate?: string }) {
    // Try Redis-based audit log storage
    const allLogs = (await this.redis.getJson<any[]>('admin:audit:logs')) ?? [];

    let filtered = allLogs;
    if (filters?.action) filtered = filtered.filter((l) => l.action === filters.action);
    if (filters?.adminId) filtered = filtered.filter((l) => l.adminId === filters.adminId);
    if (filters?.startDate) filtered = filtered.filter((l) => new Date(l.timestamp) >= new Date(filters.startDate!));
    if (filters?.endDate) filtered = filtered.filter((l) => new Date(l.timestamp) <= new Date(filters.endDate!));

    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const start = (page - 1) * limit;

    return {
      data: filtered.slice(start, start + limit),
      total: filtered.length,
      page,
      limit,
    };
  }

  async addAuditLog(entry: { action: string; adminId: string; entityType: string; entityId: string; details?: any }) {
    const log = {
      id: `AUDIT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ...entry,
      timestamp: new Date().toISOString(),
    };

    const logs = (await this.redis.getJson<any[]>('admin:audit:logs')) ?? [];
    logs.unshift(log);
    await this.redis.setJson('admin:audit:logs', logs.slice(0, 10000), 86400 * 90);

    return { success: true, logId: log.id };
  }

  // ── Revenue Report ─────────────────────────────────────────────────────────
  async getRevenueReport(startDate: string, endDate: string, groupBy: 'day' | 'week' | 'month' = 'day') {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const revenue: any[] = [];

    const current = new Date(start);
    while (current <= end) {
      const dateKey = current.toISOString().split('T')[0];
      const dayRevenue = parseFloat(await this.redis.get(`admin:counter:revenue:${dateKey}`) ?? '0');
      const dayOrders = parseInt(await this.redis.get(`admin:counter:orders:${dateKey}`) ?? '0', 10);

      revenue.push({
        date: dateKey,
        revenue: dayRevenue,
        orders: dayOrders,
        avgOrderValue: dayOrders > 0 ? Math.round((dayRevenue / dayOrders) * 100) / 100 : 0,
      });

      current.setDate(current.getDate() + 1);
    }

    const totalRevenue = revenue.reduce((sum, r) => sum + r.revenue, 0);
    const totalOrders = revenue.reduce((sum, r) => sum + r.orders, 0);

    return {
      startDate,
      endDate,
      groupBy,
      revenue,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalOrders,
      avgOrderValue: totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0,
    };
  }

  // ── Increment Counter (called by other services via Kafka) ─────────────────
  async incrementCounter(counter: string, value = 1) {
    const key = `admin:counter:${counter}`;
    const current = parseInt(await this.redis.get(key) ?? '0', 10);
    await this.redis.set(key, String(current + value), 86400 * 365);
  }
}
