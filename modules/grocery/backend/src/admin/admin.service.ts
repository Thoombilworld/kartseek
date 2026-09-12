import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, ILike, IsNull } from 'typeorm';
import { KafkaProducerService } from '@app/kafka';
import { RedisService } from '@app/redis';
import { applyMarketFilter, assertInMarket, requireMarket, normaliseMarket } from '@app/common';

import { GroceryStore } from '../entities/grocery-store.entity';
import { GroceryItem } from '../entities/grocery-item.entity';
import { GroceryOrder, GroceryOrderStatus } from '../entities/grocery-order.entity';
import { GroceryFlashDeal, FlashDealStatus } from '../entities/grocery-flash-deal.entity';
import { GroceryDeliveryZone } from '../entities/grocery-delivery-zone.entity';
import { GrocerySetting, GROCERY_SETTING_DEFAULTS } from '../entities/grocery-setting.entity';

/**
 * GroceryAdminService — the super-admin console's read/write surface.
 *
 * The gateway's `AdminGroceryController` addresses grocery with eighteen
 * `admin.grocery.*` commands. Two had handlers; the other sixteen had none, and
 * once the gateway's invented fallbacks were removed every one of them answered
 * 503 — the whole admin grocery section (dashboard, store approvals, orders,
 * category CRUD, delivery zones, flash-deal moderation, reports, settings) was
 * dead. This service implements them against the real tables.
 *
 * Kept separate from `GroceryService` so the privileged operations — approving a
 * store, suspending a seller, editing platform settings — are visibly a distinct
 * surface from the storefront and seller ones, rather than a block of methods
 * buried in a 1,700-line class.
 */
@Injectable()
export class GroceryAdminService {
  private readonly logger = new Logger(GroceryAdminService.name);

  constructor(
    @InjectRepository(GroceryStore) private readonly storeRepo: Repository<GroceryStore>,
    @InjectRepository(GroceryItem) private readonly itemRepo: Repository<GroceryItem>,
    @InjectRepository(GroceryOrder) private readonly orderRepo: Repository<GroceryOrder>,
    @InjectRepository(GroceryFlashDeal)
    private readonly flashDealRepo: Repository<GroceryFlashDeal>,
    @InjectRepository(GroceryDeliveryZone)
    private readonly zoneRepo: Repository<GroceryDeliveryZone>,
    @InjectRepository(GrocerySetting) private readonly settingRepo: Repository<GrocerySetting>,
    private readonly kafka: KafkaProducerService,
    private readonly redis: RedisService,
  ) {}

  // ── Dashboard ──────────────────────────────────────────────────────────────

  /**
   * Headline counters for the admin landing page.
   *
   * `scope` is set for a market-locked admin: every count and sum below is
   * attributed to that market's own stores (directly for stores, through the
   * `store` relation for orders/flash deals, through the item's own store for
   * products) rather than the platform total.
   */
  async getDashboard(scope?: string) {
    const storeWhere = (extra: Record<string, unknown> = {}) =>
      scope ? { ...extra, regionCode: scope } : extra;

    const [totalStores, approvedStores, pendingStores, suspendedStores] = await Promise.all([
      this.storeRepo.count({ where: storeWhere() }),
      this.storeRepo.count({ where: storeWhere({ status: 'APPROVED' }) }),
      this.storeRepo.count({ where: storeWhere({ status: 'PENDING_KYC' }) }),
      this.storeRepo.count({ where: storeWhere({ status: 'SUSPENDED' }) }),
    ]);

    // Listings waiting on a moderation decision. Absent from this block until
    // now, so the admin landing page reported "nothing to moderate" while a
    // seller's new product sat in the queue at
    // GET /grocery/admin/products/pending — the queue was only visible to an
    // admin who already knew to open that screen.
    let totalProducts: number;
    let pendingProducts: number;
    if (scope) {
      const productsQb = () =>
        applyMarketFilter(
          this.itemRepo.createQueryBuilder('item').innerJoin('item.store', 'store'),
          'store.regionCode',
          scope,
        );
      totalProducts = await productsQb().getCount();
      pendingProducts = await productsQb()
        .andWhere('item.approvalStatus = :pending', { pending: 'PENDING' })
        .getCount();
    } else {
      [totalProducts, pendingProducts] = await Promise.all([
        this.itemRepo.count(),
        this.itemRepo.count({ where: { approvalStatus: 'PENDING' } }),
      ]);
    }

    const since = new Date(Date.now() - 30 * 86_400_000);
    const revenueQb = this.orderRepo
      .createQueryBuilder('o')
      .where('o.createdAt >= :since', { since });
    if (scope)
      applyMarketFilter(revenueQb.innerJoin('o.store', 'store'), 'store.regionCode', scope);
    const revenueRow = await revenueQb
      .select('COALESCE(SUM(o.grandTotal), 0)', 'revenue')
      .addSelect('COUNT(o.id)', 'orders')
      .getRawOne<{ revenue: string; orders: string }>();

    const totalOrders = scope
      ? await applyMarketFilter(
          this.orderRepo.createQueryBuilder('o').innerJoin('o.store', 'store'),
          'store.regionCode',
          scope,
        ).getCount()
      : await this.orderRepo.count();

    const pendingFlashDeals = scope
      ? await applyMarketFilter(
          this.flashDealRepo
            .createQueryBuilder('d')
            .innerJoin('d.store', 'store')
            .where('d.status = :status', { status: FlashDealStatus.PENDING }),
          'store.regionCode',
          scope,
        ).getCount()
      : await this.flashDealRepo.count({ where: { status: FlashDealStatus.PENDING } });

    // One grouped query rather than one per status — the status breakdown is what
    // the dashboard's queue tiles read.
    const byStatusQb = this.orderRepo
      .createQueryBuilder('o')
      .select('o.status', 'status')
      .addSelect('COUNT(o.id)', 'count');
    if (scope)
      applyMarketFilter(byStatusQb.innerJoin('o.store', 'store'), 'store.regionCode', scope);
    const byStatus = await byStatusQb
      .groupBy('o.status')
      .getRawMany<{ status: string; count: string }>();

    return {
      stores: {
        total: totalStores,
        approved: approvedStores,
        pending: pendingStores,
        suspended: suspendedStores,
      },
      products: { total: totalProducts, pending: pendingProducts },
      orders: {
        total: totalOrders,
        last30Days: Number(revenueRow?.orders ?? 0),
        byStatus: Object.fromEntries(byStatus.map((r) => [r.status, Number(r.count)])),
      },
      revenue: { last30Days: Number(revenueRow?.revenue ?? 0) },
      moderation: { pendingFlashDeals, pendingStores, pendingProducts },
      generatedAt: new Date().toISOString(),
    };
  }

  // ── Stores ─────────────────────────────────────────────────────────────────

  async listStores(
    opts: {
      page?: number;
      limit?: number;
      status?: string;
      search?: string;
      regionCode?: string;
    } = {},
  ) {
    const page = Math.max(1, Number(opts.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(opts.limit) || 20));

    const qb = this.storeRepo.createQueryBuilder('s');
    // `requireMarket`, not the permissive `requested` slot: `grocery.controller.ts`
    // collapses the lock into this field (`regionCode: d?.scope ?? d?.regionCode`),
    // and an unreadable value in the `requested` slot is IGNORED — which would
    // turn a lock meant to narrow into no predicate at all, and hand a
    // QA-confined admin every market's rows (N1).
    applyMarketFilter(qb, 's.regionCode', requireMarket(opts.regionCode, 'market', this.logger));
    if (opts.status && opts.status !== 'All') {
      qb.andWhere('s.status = :status', { status: opts.status });
    }
    if (opts.search) {
      qb.andWhere('(s.name ILIKE :q OR s.address ILIKE :q OR s.phone ILIKE :q)', {
        q: `%${opts.search}%`,
      });
    }

    const [data, total] = await qb
      .orderBy('s.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  /** Store detail plus the counters the admin drawer shows. */
  async getStoreDetail(id: string, scope?: string) {
    const store = await this.storeRepo.findOne({ where: { id } });
    if (!store) throw new NotFoundException(`Store ${id} not found`);
    assertInMarket(store.regionCode, scope, 'store', this.logger);

    const [productCount, orderCount, revenueRow] = await Promise.all([
      this.itemRepo.count({ where: { storeId: id } }),
      this.orderRepo.count({ where: { storeId: id } }),
      this.orderRepo
        .createQueryBuilder('o')
        .select('COALESCE(SUM(o.grandTotal), 0)', 'revenue')
        .where('o.storeId = :id', { id })
        .andWhere('o.status = :status', { status: GroceryOrderStatus.DELIVERED })
        .getRawOne<{ revenue: string }>(),
    ]);

    return {
      ...store,
      stats: { productCount, orderCount, deliveredRevenue: Number(revenueRow?.revenue ?? 0) },
    };
  }

  /**
   * Move a store between lifecycle states.
   *
   * The admin UI drove this through `PATCH /grocery/orders/<storeId>/status` with
   * values like `APPROVED` that are not order statuses at all, swallowed the
   * resulting error and reported success — so no store was ever actually approved,
   * suspended or blocked.
   */
  async setStoreStatus(
    id: string,
    status: 'PENDING_KYC' | 'APPROVED' | 'SUSPENDED',
    reason?: string,
    actorId?: string,
    scope?: string,
  ) {
    const allowed = ['PENDING_KYC', 'APPROVED', 'SUSPENDED'];
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        `Invalid status "${status}". Expected one of ${allowed.join(', ')}.`,
      );
    }

    const store = await this.storeRepo.findOne({ where: { id } });
    if (!store) throw new NotFoundException(`Store ${id} not found`);
    assertInMarket(store.regionCode, scope, 'store', this.logger);

    const previous = store.status;
    store.status = status;
    // A suspended store must stop taking orders immediately; leaving `isOnline`
    // true would keep it in the customer store list.
    if (status !== 'APPROVED') store.isOnline = false;
    const saved = await this.storeRepo.save(store);
    await this.redis.del(`grocery:store:${id}`);

    await this.kafka.publish('grocery.store.status_changed', {
      storeId: id,
      storeName: store.name,
      ownerId: store.ownerId,
      previousStatus: previous,
      newStatus: status,
      reason: reason ?? null,
      actorId: actorId ?? null,
    });
    if (store.ownerId) {
      await this.kafka.publish('notification.push', {
        userId: store.ownerId,
        title:
          status === 'APPROVED'
            ? 'Store approved ✅'
            : status === 'SUSPENDED'
              ? 'Store suspended'
              : 'Store under review',
        body:
          status === 'APPROVED'
            ? `${store.name} is live and can start taking orders.`
            : `${store.name}: ${reason ?? 'contact support for details'}`,
        data: { type: 'grocery_store_status', storeId: id, status },
      });
    }

    this.logger.log(`Store ${id} (${store.name}): ${previous} → ${status}`);
    return { success: true, store: saved, previousStatus: previous };
  }

  // ── Orders ─────────────────────────────────────────────────────────────────

  async listOrders(
    opts: {
      page?: number;
      limit?: number;
      status?: string;
      storeId?: string;
      search?: string;
      regionCode?: string;
    } = {},
  ) {
    const page = Math.max(1, Number(opts.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(opts.limit) || 20));

    const qb = this.orderRepo.createQueryBuilder('o').leftJoinAndSelect('o.store', 'store');
    if (opts.regionCode) {
      // `requireMarket` — see the note in `listStores`: the lock arrives in
      // this field, so an unreadable one must refuse rather than widen (N1).
      applyMarketFilter(
        qb,
        'store.regionCode',
        requireMarket(opts.regionCode, 'market', this.logger),
      );
    }
    if (opts.status && opts.status !== 'All')
      qb.andWhere('o.status = :status', { status: opts.status });
    if (opts.storeId) qb.andWhere('o.storeId = :storeId', { storeId: opts.storeId });
    if (opts.search) {
      qb.andWhere('(o.orderNumber ILIKE :q OR o.customerId ILIKE :q)', { q: `%${opts.search}%` });
    }

    const [data, total] = await qb
      .orderBy('o.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  // ── Delivery zones ─────────────────────────────────────────────────────────

  async listDeliveryZones(regionCode?: string) {
    const where = regionCode && regionCode !== 'All' ? { regionCode } : {};
    const [data, total] = await this.zoneRepo.findAndCount({ where, order: { createdAt: 'DESC' } });
    return { data, total };
  }

  async createDeliveryZone(body: Partial<GroceryDeliveryZone>, scope?: string) {
    if (!body?.name?.trim()) throw new BadRequestException('Zone name is required');
    // A locked admin cannot create a zone outside their own market, whatever the
    // request body says — the scope always wins.
    if (scope) body.regionCode = scope;
    const zone = this.zoneRepo.create({
      ...body,
      // `simple-array` stores a comma-joined string; accept the array the console
      // sends as well as a pasted comma-separated list.
      pincodes: Array.isArray(body.pincodes)
        ? body.pincodes
            .map(String)
            .map((p) => p.trim())
            .filter(Boolean)
        : typeof body.pincodes === 'string'
          ? String(body.pincodes)
              .split(',')
              .map((p) => p.trim())
              .filter(Boolean)
          : [],
      isActive: body.isActive ?? true,
    });
    const saved = await this.zoneRepo.save(zone);
    this.logger.log(`Delivery zone created: ${saved.name} (${saved.id})`);
    return { success: true, zone: saved };
  }

  async updateDeliveryZone(id: string, body: Partial<GroceryDeliveryZone>, scope?: string) {
    const zone = await this.zoneRepo.findOne({ where: { id } });
    if (!zone) throw new NotFoundException(`Delivery zone ${id} not found`);
    assertInMarket(zone.regionCode, scope, 'delivery zone', this.logger);
    // Same rule as create: a locked admin cannot move a zone into another market.
    if (scope) body.regionCode = scope;
    Object.assign(zone, body, { id: zone.id });
    return { success: true, zone: await this.zoneRepo.save(zone) };
  }

  async deleteDeliveryZone(id: string, scope?: string) {
    const zone = await this.zoneRepo.findOne({ where: { id } });
    if (!zone) throw new NotFoundException(`Delivery zone ${id} not found`);
    assertInMarket(zone.regionCode, scope, 'delivery zone', this.logger);
    const result = await this.zoneRepo.delete({ id });
    if (!result.affected) throw new NotFoundException(`Delivery zone ${id} not found`);
    return { success: true, deletedId: id };
  }

  // ── Flash-deal moderation ──────────────────────────────────────────────────

  /**
   * The moderation queue.
   *
   * The gateway pointed `GET /grocery/flash-deals` at `get_store_flash_deals`,
   * which returns ACTIVE deals for one store and ignores `status` entirely — so
   * the queue of deals awaiting approval was permanently empty and no deal could
   * ever be approved.
   */
  async listFlashDeals(
    opts: {
      status?: string;
      storeId?: string;
      page?: number;
      limit?: number;
      regionCode?: string;
    } = {},
  ) {
    const page = Math.max(1, Number(opts.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(opts.limit) || 20));

    const where: Record<string, unknown> = {};
    if (opts.storeId) where.storeId = opts.storeId;
    let status: FlashDealStatus | undefined;
    if (opts.status && opts.status !== 'All') {
      status = String(opts.status).toLowerCase() as FlashDealStatus;
      if (!Object.values(FlashDealStatus).includes(status)) {
        throw new BadRequestException(`Unknown flash deal status "${opts.status}"`);
      }
      where.status = status;
    }

    // No market filter: the plain repository query the moderation queue has
    // always used. A market-locked admin's request always carries a
    // `regionCode` (see `AdminGroceryController.scopeOf`), which needs a join
    // to the deal's store — `grocery_flash_deals` does not itself carry a
    // market column.
    if (!opts.regionCode) {
      const [data, total] = await this.flashDealRepo.findAndCount({
        where,
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });
      return { data, total, page, limit };
    }

    const qb = this.flashDealRepo.createQueryBuilder('d').leftJoin('d.store', 'store');
    // `requireMarket` — see the note in `listStores` (N1).
    applyMarketFilter(
      qb,
      'store.regionCode',
      requireMarket(opts.regionCode, 'market', this.logger),
    );
    if (opts.storeId) qb.andWhere('d.storeId = :storeId', { storeId: opts.storeId });
    if (status) qb.andWhere('d.status = :status', { status });

    const [data, total] = await qb
      .orderBy('d.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { data, total, page, limit };
  }

  // ── Reports ────────────────────────────────────────────────────────────────

  async getReports(period = '30d', scope?: string) {
    const days = period === '7d' ? 7 : period === '90d' ? 90 : period === '365d' ? 365 : 30;
    const since = new Date(Date.now() - days * 86_400_000);

    // A locked admin's report is attributed to their own market only — every
    // order aggregate joins to the order's store, every product aggregate to
    // the item's store, and both filter on `store.regionCode`.
    const dailyQb = this.orderRepo
      .createQueryBuilder('o')
      .where('o.createdAt >= :since', { since });
    if (scope) applyMarketFilter(dailyQb.innerJoin('o.store', 'store'), 'store.regionCode', scope);

    const topStoresQb = this.orderRepo.createQueryBuilder('o').leftJoin('o.store', 'store');
    topStoresQb.where('o.createdAt >= :since', { since });
    applyMarketFilter(topStoresQb, 'store.regionCode', scope);

    const byCategoryQb = this.itemRepo.createQueryBuilder('item');
    if (scope)
      applyMarketFilter(byCategoryQb.innerJoin('item.store', 'store'), 'store.regionCode', scope);

    const totalsQb = this.orderRepo
      .createQueryBuilder('o')
      .where('o.createdAt >= :since', { since });
    if (scope) applyMarketFilter(totalsQb.innerJoin('o.store', 'store'), 'store.regionCode', scope);

    const [daily, topStores, byCategory, totals] = await Promise.all([
      dailyQb
        .select('DATE(o.createdAt)', 'date')
        .addSelect('COUNT(o.id)', 'orders')
        .addSelect('COALESCE(SUM(o.grandTotal), 0)', 'revenue')
        .groupBy('DATE(o.createdAt)')
        .orderBy('DATE(o.createdAt)', 'ASC')
        .getRawMany<{ date: string; orders: string; revenue: string }>(),

      topStoresQb
        .select('o.storeId', 'storeId')
        .addSelect('MAX(store.name)', 'storeName')
        .addSelect('COUNT(o.id)', 'orders')
        .addSelect('COALESCE(SUM(o.grandTotal), 0)', 'revenue')
        .groupBy('o.storeId')
        .orderBy('COALESCE(SUM(o.grandTotal), 0)', 'DESC')
        .limit(10)
        .getRawMany<{ storeId: string; storeName: string; orders: string; revenue: string }>(),

      byCategoryQb
        .select('item.category', 'category')
        .addSelect('COUNT(item.id)', 'products')
        .groupBy('item.category')
        .orderBy('COUNT(item.id)', 'DESC')
        .getRawMany<{ category: string; products: string }>(),

      totalsQb
        .select('COUNT(o.id)', 'orders')
        .addSelect('COALESCE(SUM(o.grandTotal), 0)', 'revenue')
        .addSelect('COALESCE(AVG(o.grandTotal), 0)', 'aov')
        .addSelect(`COUNT(CASE WHEN o.status = 'CANCELLED' THEN 1 END)`, 'cancelled')
        .addSelect(`COUNT(CASE WHEN o.status = 'DELIVERED' THEN 1 END)`, 'delivered')
        .getRawOne<Record<string, string>>(),
    ]);

    const orders = Number(totals?.orders ?? 0);
    return {
      period,
      since: since.toISOString(),
      summary: {
        orders,
        revenue: Number(totals?.revenue ?? 0),
        averageOrderValue: Math.round(Number(totals?.aov ?? 0) * 100) / 100,
        delivered: Number(totals?.delivered ?? 0),
        cancelled: Number(totals?.cancelled ?? 0),
        cancellationRate: orders
          ? Math.round((Number(totals?.cancelled ?? 0) / orders) * 1000) / 10
          : 0,
      },
      daily: daily.map((d) => ({
        date: d.date,
        orders: Number(d.orders),
        revenue: Number(d.revenue),
      })),
      topStores: topStores.map((s) => ({
        storeId: s.storeId,
        storeName: s.storeName,
        orders: Number(s.orders),
        revenue: Number(s.revenue),
      })),
      productsByCategory: byCategory.map((c) => ({
        category: c.category,
        products: Number(c.products),
      })),
    };
  }

  // ── Settings ───────────────────────────────────────────────────────────────

  /**
   * Grocery settings for one market, falling back to the platform defaults.
   *
   * Marketplace's own settings read is platform-wide by deliberate design
   * (`getMarketplaceSettings`, one Redis record — no market has its own
   * commission or return window); grocery's took nothing either, so one
   * admin screen showed a delivery fee, a minimum basket and a service radius
   * that read as every market's at once (audit I9), when a delivery fee and a
   * service radius really are a market's own facts. `source` says which row
   * answered, so the console can show "inherited from platform defaults"
   * rather than implying the market set these values — and today it always
   * will, because nothing yet writes a market-scoped row (see the entity's
   * docstring): the write stays platform-only until the MODULES plan's
   * per-market editor exists.
   */
  async getSettings(market?: string) {
    const m = normaliseMarket(market);
    const [scoped, global] = await Promise.all([
      m ? this.settingRepo.find({ where: { regionCode: m } }) : Promise.resolve([]),
      this.settingRepo.find({ where: { regionCode: IsNull() } }),
    ]);
    const globalStored = Object.fromEntries(global.map((r) => [r.key, r.value]));
    const scopedStored = Object.fromEntries(scoped.map((r) => [r.key, r.value]));
    const rows = [...global, ...scoped];
    return {
      settings: { ...GROCERY_SETTING_DEFAULTS, ...globalStored, ...scopedStored },
      defaults: { ...GROCERY_SETTING_DEFAULTS, ...globalStored },
      // Every key that has a persisted row, global or market-scoped — the keys
      // that differ from the shipped `GROCERY_SETTING_DEFAULTS` constant.
      overridden: [...new Set(rows.map((r) => r.key))],
      market: m ?? null,
      source: scoped.length ? 'market' : 'platform',
      updatedAt: rows.reduce<string | null>(
        (latest, r) =>
          !latest || r.updatedAt > new Date(latest) ? r.updatedAt.toISOString() : latest,
        null,
      ),
    };
  }

  /**
   * Writes only keys the platform actually recognises. An unknown key is rejected
   * rather than stored, so a typo cannot look saved and then be silently ignored
   * by every reader.
   */
  async updateSettings(body: Record<string, unknown>, actorId?: string, scope?: string) {
    // Grocery settings apply to the whole platform — a market-locked admin has
    // no market of their own to write them into, so the write is refused
    // outright rather than silently applied to every market.
    if (scope) {
      this.logger.warn(
        `[region-scope-denied] grocery settings write refused for a ${scope}-scoped admin`,
      );
      throw new ForbiddenException('Grocery settings are managed globally.');
    }
    const entries = Object.entries(body ?? {}).filter(([k]) => k !== 'actorId');
    if (!entries.length) throw new BadRequestException('No settings supplied');

    const unknown = entries.map(([k]) => k).filter((k) => !(k in GROCERY_SETTING_DEFAULTS));
    if (unknown.length) {
      throw new BadRequestException(
        `Unknown setting(s): ${unknown.join(', ')}. Known keys: ${Object.keys(GROCERY_SETTING_DEFAULTS).join(', ')}`,
      );
    }

    for (const [key, value] of entries) {
      const expected = typeof GROCERY_SETTING_DEFAULTS[key];
      if (typeof value !== expected) {
        throw new BadRequestException(
          `Setting "${key}" must be a ${expected}, received ${typeof value}`,
        );
      }
      await this.settingRepo.save(this.settingRepo.create({ key, value, updatedBy: actorId }));
    }

    await this.kafka.publish('grocery.settings.updated', {
      keys: entries.map(([k]) => k),
      actorId: actorId ?? null,
      updatedAt: new Date().toISOString(),
    });
    this.logger.log(`Grocery settings updated: ${entries.map(([k]) => k).join(', ')}`);
    return this.getSettings();
  }

  /** Single setting read, used by the storefront/seller paths that need a policy value. */
  async getSetting<T = unknown>(key: string): Promise<T> {
    const row = await this.settingRepo.findOne({ where: { key } });
    return (row?.value ?? GROCERY_SETTING_DEFAULTS[key]) as T;
  }
}
