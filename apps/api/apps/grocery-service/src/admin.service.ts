import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, ILike } from 'typeorm';
import { KafkaProducerService } from '@app/kafka';
import { RedisService } from '@app/redis';

import { GroceryStore } from './entities/grocery-store.entity';
import { GroceryItem } from './entities/grocery-item.entity';
import { GroceryOrder, GroceryOrderStatus } from './entities/grocery-order.entity';
import { GroceryFlashDeal, FlashDealStatus } from './entities/grocery-flash-deal.entity';
import { GroceryDeliveryZone } from './entities/grocery-delivery-zone.entity';
import { GrocerySetting, GROCERY_SETTING_DEFAULTS } from './entities/grocery-setting.entity';

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
    @InjectRepository(GroceryFlashDeal) private readonly flashDealRepo: Repository<GroceryFlashDeal>,
    @InjectRepository(GroceryDeliveryZone) private readonly zoneRepo: Repository<GroceryDeliveryZone>,
    @InjectRepository(GrocerySetting) private readonly settingRepo: Repository<GrocerySetting>,
    private readonly kafka: KafkaProducerService,
    private readonly redis: RedisService,
  ) {}

  // ── Dashboard ──────────────────────────────────────────────────────────────

  /** Headline counters for the admin landing page. */
  async getDashboard() {
    const [totalStores, approvedStores, pendingStores, suspendedStores, totalProducts, pendingProducts] =
      await Promise.all([
        this.storeRepo.count(),
        this.storeRepo.count({ where: { status: 'APPROVED' } }),
        this.storeRepo.count({ where: { status: 'PENDING_KYC' } }),
        this.storeRepo.count({ where: { status: 'SUSPENDED' } }),
        this.itemRepo.count(),
        // Listings waiting on a moderation decision. Absent from this block until
        // now, so the admin landing page reported "nothing to moderate" while a
        // seller's new product sat in the queue at
        // GET /grocery/admin/products/pending — the queue was only visible to an
        // admin who already knew to open that screen.
        this.itemRepo.count({ where: { approvalStatus: 'PENDING' } }),
      ]);

    const since = new Date(Date.now() - 30 * 86_400_000);
    const revenueRow = await this.orderRepo
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.grandTotal), 0)', 'revenue')
      .addSelect('COUNT(o.id)', 'orders')
      .where('o.createdAt >= :since', { since })
      .getRawOne<{ revenue: string; orders: string }>();

    const [totalOrders, pendingFlashDeals] = await Promise.all([
      this.orderRepo.count(),
      this.flashDealRepo.count({ where: { status: FlashDealStatus.PENDING } }),
    ]);

    // One grouped query rather than one per status — the status breakdown is what
    // the dashboard's queue tiles read.
    const byStatus = await this.orderRepo
      .createQueryBuilder('o')
      .select('o.status', 'status')
      .addSelect('COUNT(o.id)', 'count')
      .groupBy('o.status')
      .getRawMany<{ status: string; count: string }>();

    return {
      stores: { total: totalStores, approved: approvedStores, pending: pendingStores, suspended: suspendedStores },
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

  async listStores(opts: { page?: number; limit?: number; status?: string; search?: string } = {}) {
    const page = Math.max(1, Number(opts.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(opts.limit) || 20));

    const qb = this.storeRepo.createQueryBuilder('s');
    if (opts.status && opts.status !== 'All') {
      qb.andWhere('s.status = :status', { status: opts.status });
    }
    if (opts.search) {
      qb.andWhere('(s.name ILIKE :q OR s.address ILIKE :q OR s.phone ILIKE :q)', { q: `%${opts.search}%` });
    }

    const [data, total] = await qb
      .orderBy('s.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  /** Store detail plus the counters the admin drawer shows. */
  async getStoreDetail(id: string) {
    const store = await this.storeRepo.findOne({ where: { id } });
    if (!store) throw new NotFoundException(`Store ${id} not found`);

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
  async setStoreStatus(id: string, status: 'PENDING_KYC' | 'APPROVED' | 'SUSPENDED', reason?: string, actorId?: string) {
    const allowed = ['PENDING_KYC', 'APPROVED', 'SUSPENDED'];
    if (!allowed.includes(status)) {
      throw new BadRequestException(`Invalid status "${status}". Expected one of ${allowed.join(', ')}.`);
    }

    const store = await this.storeRepo.findOne({ where: { id } });
    if (!store) throw new NotFoundException(`Store ${id} not found`);

    const previous = store.status;
    store.status = status;
    // A suspended store must stop taking orders immediately; leaving `isOnline`
    // true would keep it in the customer store list.
    if (status !== 'APPROVED') store.isOnline = false;
    const saved = await this.storeRepo.save(store);
    await this.redis.del(`grocery:store:${id}`);

    await this.kafka.publish('grocery.store.status_changed', {
      storeId: id, storeName: store.name, ownerId: store.ownerId,
      previousStatus: previous, newStatus: status, reason: reason ?? null, actorId: actorId ?? null,
    });
    if (store.ownerId) {
      await this.kafka.publish('notification.push', {
        userId: store.ownerId,
        title: status === 'APPROVED' ? 'Store approved ✅' : status === 'SUSPENDED' ? 'Store suspended' : 'Store under review',
        body: status === 'APPROVED'
          ? `${store.name} is live and can start taking orders.`
          : `${store.name}: ${reason ?? 'contact support for details'}`,
        data: { type: 'grocery_store_status', storeId: id, status },
      });
    }

    this.logger.log(`Store ${id} (${store.name}): ${previous} → ${status}`);
    return { success: true, store: saved, previousStatus: previous };
  }

  // ── Orders ─────────────────────────────────────────────────────────────────

  async listOrders(opts: { page?: number; limit?: number; status?: string; storeId?: string; search?: string } = {}) {
    const page = Math.max(1, Number(opts.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(opts.limit) || 20));

    const qb = this.orderRepo.createQueryBuilder('o').leftJoinAndSelect('o.store', 'store');
    if (opts.status && opts.status !== 'All') qb.andWhere('o.status = :status', { status: opts.status });
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

  async createDeliveryZone(body: Partial<GroceryDeliveryZone>) {
    if (!body?.name?.trim()) throw new BadRequestException('Zone name is required');
    const zone = this.zoneRepo.create({
      ...body,
      // `simple-array` stores a comma-joined string; accept the array the console
      // sends as well as a pasted comma-separated list.
      pincodes: Array.isArray(body.pincodes)
        ? body.pincodes.map(String).map((p) => p.trim()).filter(Boolean)
        : typeof body.pincodes === 'string'
          ? String(body.pincodes).split(',').map((p) => p.trim()).filter(Boolean)
          : [],
      isActive: body.isActive ?? true,
    });
    const saved = await this.zoneRepo.save(zone);
    this.logger.log(`Delivery zone created: ${saved.name} (${saved.id})`);
    return { success: true, zone: saved };
  }

  async updateDeliveryZone(id: string, body: Partial<GroceryDeliveryZone>) {
    const zone = await this.zoneRepo.findOne({ where: { id } });
    if (!zone) throw new NotFoundException(`Delivery zone ${id} not found`);
    Object.assign(zone, body, { id: zone.id });
    return { success: true, zone: await this.zoneRepo.save(zone) };
  }

  async deleteDeliveryZone(id: string) {
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
  async listFlashDeals(opts: { status?: string; storeId?: string; page?: number; limit?: number } = {}) {
    const page = Math.max(1, Number(opts.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(opts.limit) || 20));

    const where: Record<string, unknown> = {};
    if (opts.storeId) where.storeId = opts.storeId;
    if (opts.status && opts.status !== 'All') {
      const status = String(opts.status).toLowerCase() as FlashDealStatus;
      if (!Object.values(FlashDealStatus).includes(status)) {
        throw new BadRequestException(`Unknown flash deal status "${opts.status}"`);
      }
      where.status = status;
    }

    const [data, total] = await this.flashDealRepo.findAndCount({
      where, order: { createdAt: 'DESC' }, skip: (page - 1) * limit, take: limit,
    });
    return { data, total, page, limit };
  }

  // ── Reports ────────────────────────────────────────────────────────────────

  async getReports(period = '30d') {
    const days = period === '7d' ? 7 : period === '90d' ? 90 : period === '365d' ? 365 : 30;
    const since = new Date(Date.now() - days * 86_400_000);

    const [daily, topStores, byCategory, totals] = await Promise.all([
      this.orderRepo.createQueryBuilder('o')
        .select('DATE(o.createdAt)', 'date')
        .addSelect('COUNT(o.id)', 'orders')
        .addSelect('COALESCE(SUM(o.grandTotal), 0)', 'revenue')
        .where('o.createdAt >= :since', { since })
        .groupBy('DATE(o.createdAt)')
        .orderBy('DATE(o.createdAt)', 'ASC')
        .getRawMany<{ date: string; orders: string; revenue: string }>(),

      this.orderRepo.createQueryBuilder('o')
        .leftJoin('o.store', 'store')
        .select('o.storeId', 'storeId')
        .addSelect('MAX(store.name)', 'storeName')
        .addSelect('COUNT(o.id)', 'orders')
        .addSelect('COALESCE(SUM(o.grandTotal), 0)', 'revenue')
        .where('o.createdAt >= :since', { since })
        .groupBy('o.storeId')
        .orderBy('COALESCE(SUM(o.grandTotal), 0)', 'DESC')
        .limit(10)
        .getRawMany<{ storeId: string; storeName: string; orders: string; revenue: string }>(),

      this.itemRepo.createQueryBuilder('item')
        .select('item.category', 'category')
        .addSelect('COUNT(item.id)', 'products')
        .groupBy('item.category')
        .orderBy('COUNT(item.id)', 'DESC')
        .getRawMany<{ category: string; products: string }>(),

      this.orderRepo.createQueryBuilder('o')
        .select('COUNT(o.id)', 'orders')
        .addSelect('COALESCE(SUM(o.grandTotal), 0)', 'revenue')
        .addSelect('COALESCE(AVG(o.grandTotal), 0)', 'aov')
        .addSelect(`COUNT(CASE WHEN o.status = 'CANCELLED' THEN 1 END)`, 'cancelled')
        .addSelect(`COUNT(CASE WHEN o.status = 'DELIVERED' THEN 1 END)`, 'delivered')
        .where('o.createdAt >= :since', { since })
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
        cancellationRate: orders ? Math.round((Number(totals?.cancelled ?? 0) / orders) * 1000) / 10 : 0,
      },
      daily: daily.map((d) => ({ date: d.date, orders: Number(d.orders), revenue: Number(d.revenue) })),
      topStores: topStores.map((s) => ({
        storeId: s.storeId, storeName: s.storeName, orders: Number(s.orders), revenue: Number(s.revenue),
      })),
      productsByCategory: byCategory.map((c) => ({ category: c.category, products: Number(c.products) })),
    };
  }

  // ── Settings ───────────────────────────────────────────────────────────────

  /** Stored settings merged over the shipped defaults. */
  async getSettings() {
    const rows = await this.settingRepo.find();
    const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      settings: { ...GROCERY_SETTING_DEFAULTS, ...stored },
      defaults: GROCERY_SETTING_DEFAULTS,
      overridden: rows.map((r) => r.key),
      updatedAt: rows.reduce<string | null>(
        (latest, r) => (!latest || r.updatedAt > new Date(latest) ? r.updatedAt.toISOString() : latest),
        null,
      ),
    };
  }

  /**
   * Writes only keys the platform actually recognises. An unknown key is rejected
   * rather than stored, so a typo cannot look saved and then be silently ignored
   * by every reader.
   */
  async updateSettings(body: Record<string, unknown>, actorId?: string) {
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
        throw new BadRequestException(`Setting "${key}" must be a ${expected}, received ${typeof value}`);
      }
      await this.settingRepo.save(this.settingRepo.create({ key, value, updatedBy: actorId }));
    }

    await this.kafka.publish('grocery.settings.updated', {
      keys: entries.map(([k]) => k), actorId: actorId ?? null, updatedAt: new Date().toISOString(),
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
