import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  applyMarketFilter,
  assertRecordMarket,
  marketPredicate,
  refuseUnattributable,
  requireMarket,
} from '@app/common';
import { KafkaProducerService } from '@app/kafka';
import {
  PharmacyCategory,
  PharmacyItem,
  PharmacyOrder,
  PharmacyOrderStatus,
  PharmacyPaymentStatus,
  PharmacySetting,
  PharmacyStore,
  PharmacyStoreStatus,
  PLATFORM_MARKET,
  Prescription,
  PrescriptionStatus,
} from '../entities';

/**
 * Pharmacy settings the platform recognises, with the values a market inherits
 * until an administrator overrides one.
 *
 * This constant is both the fallback and the WHITELIST: `updateSettings`
 * refuses a key that is not here rather than storing it, so a typo cannot look
 * saved and then be ignored by every reader, and the declared type of each
 * default is the type a written value has to match.
 */
export const PHARMACY_SETTING_DEFAULTS: Record<string, string | number | boolean> = {
  /** A prescription older than this is refused at checkout. Genuinely a market fact. */
  prescriptionValidityDays: 30,
  /** Schedule H / controlled lines may not be dispensed without a verified prescription. */
  requirePrescriptionForScheduleH: true,
  /** Applied to a new store that names no rate of its own. */
  defaultCommissionRate: 12,
  /** Days before `drugLicenseExpiry` that a store appears in the verification queue. */
  licenceExpiryWarningDays: 30,
  /** Below this basket value the store may refuse the order. */
  minOrderAmount: 0,
  defaultDeliveryFee: 0,
  deliveryRadiusKm: 5,
  /** Cold-chain lines may be sent out for delivery at all. */
  allowColdChainDelivery: true,
  /** A newly registered pharmacy still needs a human decision. */
  autoApproveStores: false,
};

/** The order states in which money has actually been earned and is settleable. */
const SETTLED_ORDER_STATES = [
  PharmacyOrderStatus.DELIVERED,
  PharmacyOrderStatus.COMPLETED,
  PharmacyOrderStatus.CUSTOMER_PICKED_UP,
];

/** The store states that put a pharmacy in the licence-verification queue. */
const AWAITING_VERIFICATION = [
  PharmacyStoreStatus.PENDING_KYC,
  PharmacyStoreStatus.PENDING_APPROVAL,
];

const numeric = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * The pharmacy admin console's backend.
 *
 * Seventeen of the nineteen commands `admin-pharmacy.controller.ts` sends had
 * no `@MessagePattern` anywhere in this module, so every screen in it answered
 * 503 — and, before M2 removed the gateway's fallbacks, a fabricated empty
 * success that was indistinguishable from "this market has no pharmacies".
 *
 * ── The market ──────────────────────────────────────────────────────────────
 *
 * `pharmacy_stores.region_code` is the ONLY market column in this module.
 * Items, orders and prescriptions carry `store_id` and nothing else, so every
 * list joins the store and filters on the store's market — the attribution
 * grocery documents at `grocery/admin/admin.service.ts:407-420`. No migration
 * adds a market column to those three tables: the join already answers the
 * question, and a second copy of the market is the dead-pair mistake F-35
 * records.
 *
 * A row whose store is gone, or which never named one, is attributable to no
 * market. It is not shown to a scoped caller and no scoped caller may decide
 * on it: it is nobody's market's, and guessing is the leak. The predicate is
 * what excludes it — `store.regionCode = :__market` is false for a NULL join,
 * so the row simply is not in the page.
 *
 * ── Why the predicate, never a post-filter ──────────────────────────────────
 *
 * Filtering after `take(limit)` returns a short page that reads as "this market
 * has nothing", which is indistinguishable from a leak in the other direction.
 * Every market clause here is written by `applyMarketFilter` (`@app/common`),
 * which is the single implementation of that clause on the platform.
 */
@Injectable()
export class PharmacyAdminService {
  private readonly logger = new Logger(PharmacyAdminService.name);

  constructor(
    @InjectRepository(PharmacyStore) private readonly storeRepo: Repository<PharmacyStore>,
    @InjectRepository(PharmacyItem) private readonly itemRepo: Repository<PharmacyItem>,
    @InjectRepository(PharmacyOrder) private readonly orderRepo: Repository<PharmacyOrder>,
    @InjectRepository(Prescription) private readonly prescriptionRepo: Repository<Prescription>,
    @InjectRepository(PharmacyCategory) private readonly categoryRepo: Repository<PharmacyCategory>,
    @InjectRepository(PharmacySetting) private readonly settingRepo: Repository<PharmacySetting>,
    private readonly kafka: KafkaProducerService,
  ) {}

  /**
   * The market this request may read, resolved once.
   *
   * The LOCK (`scope`, written only by the gateway, only from the token) wins
   * over whatever the request asked for. `requireMarket` wraps the requested
   * slot so an unreadable `?countryCode=` is a refusal rather than an absent
   * predicate — absent means every market, which is the direction that leaks
   * (R2-1). The resolved value is then handed to `applyMarketFilter` as the
   * scope argument: it is already this platform's ISO-2 form, so the helper
   * passes it straight through, and the clause itself is still written in the
   * one place that writes it.
   */
  private market(scope?: string, requested?: string, what = 'market'): string | undefined {
    return marketPredicate(scope, requireMarket(requested, what, this.logger), this.logger);
  }

  private page(q: { page?: number; limit?: number }, fallbackLimit = 20) {
    const limit = Math.min(Math.max(Number(q.limit) || fallbackLimit, 1), 100);
    const page = Math.max(Number(q.page) || 1, 1);
    return { page, limit, skip: (page - 1) * limit };
  }

  /**
   * Load a store for a decision and refuse it when it is not the caller's.
   *
   * `assertRecordMarket` keeps "no such id" and "not your market" apart: a
   * handler that asserts on a row it did not check for existence reports a typo
   * as a permission problem and sends an operator hunting for the wrong thing.
   */
  private async storeInMarket(
    storeId: string,
    scope: string | undefined,
    what = 'pharmacy',
  ): Promise<PharmacyStore> {
    const store = await this.storeRepo.findOne({ where: { id: storeId } });
    assertRecordMarket(store, 'regionCode', scope, what, this.logger);
    return store;
  }

  // ── Dashboard ──────────────────────────────────────────────────────────────

  /**
   * The console's landing figures, every one of them counted inside the
   * caller's market.
   *
   * Products, orders and prescriptions have no market of their own, so each
   * count joins the store. A global admin's figures are the platform's.
   */
  async getDashboard(q: { region?: string; scope?: string } = {}) {
    const market = this.market(q.scope, q.region, 'that dashboard');

    const storeQb = this.storeRepo.createQueryBuilder('store');
    applyMarketFilter(storeQb, 'store.regionCode', market);

    const itemQb = this.itemRepo.createQueryBuilder('item').leftJoin('item.store', 'store');
    applyMarketFilter(itemQb, 'store.regionCode', market);

    const orderQb = this.orderRepo.createQueryBuilder('o').leftJoin('o.store', 'store');
    applyMarketFilter(orderQb, 'store.regionCode', market);

    // `prescriptions."storeId"` is `character varying` while `pharmacy_stores.id`
    // is `uuid`, and there is no FK between them — so this join needs the cast
    // or Postgres answers `operator does not exist: uuid = character varying`
    // and the whole dashboard 500s. The relation-based joins above do not,
    // because `pharmacy_items.store_id` and `pharmacy_orders.store_id` really
    // are uuid columns with a foreign key.
    const prescriptionQb = this.prescriptionRepo
      .createQueryBuilder('presc')
      .leftJoin(PharmacyStore, 'store', 'store.id::text = presc.storeId');
    applyMarketFilter(prescriptionQb, 'store.regionCode', market);

    const since = new Date(Date.now() - 30 * 86_400_000);

    const [
      stores,
      pendingStores,
      suspendedStores,
      products,
      unavailableProducts,
      orders,
      recentOrders,
      pendingPrescriptions,
      revenueRow,
    ] = await Promise.all([
      storeQb.clone().getCount(),
      storeQb
        .clone()
        .andWhere('store.status IN (:...awaiting)', { awaiting: AWAITING_VERIFICATION })
        .getCount(),
      storeQb
        .clone()
        .andWhere('store.status = :suspended', { suspended: PharmacyStoreStatus.SUSPENDED })
        .getCount(),
      itemQb.clone().getCount(),
      itemQb.clone().andWhere('item.isAvailable = false').getCount(),
      orderQb.clone().getCount(),
      orderQb.clone().andWhere('o.createdAt >= :since', { since }).getCount(),
      prescriptionQb
        .clone()
        .andWhere('presc.status = :pending', { pending: PrescriptionStatus.PENDING_VERIFICATION })
        .getCount(),
      orderQb
        .clone()
        .andWhere('o.status IN (:...settled)', { settled: SETTLED_ORDER_STATES })
        .select('COALESCE(SUM(o.grandTotal), 0)', 'gross')
        .getRawOne<{ gross: string }>(),
    ]);

    return {
      market: market ?? null,
      stores: { total: stores, awaitingVerification: pendingStores, suspended: suspendedStores },
      products: { total: products, unavailable: unavailableProducts },
      orders: { total: orders, last30Days: recentOrders, grossRevenue: numeric(revenueRow?.gross) },
      prescriptions: { pendingVerification: pendingPrescriptions },
      generatedAt: new Date().toISOString(),
    };
  }

  // ── Stores ─────────────────────────────────────────────────────────────────

  /**
   * The Stores screen.
   *
   * `{ data, total, page, limit }`, not the `[rows, count]` tuple
   * `PharmacyService.getAdminStoreList` answers with — the shape the MODULES
   * plan's Interfaces table names for every list in this module.
   */
  async listStores(q: {
    page?: number;
    limit?: number;
    status?: string;
    region?: string;
    scope?: string;
  }) {
    const { page, limit, skip } = this.page(q);
    const market = this.market(q.scope, q.region, 'those pharmacies');
    const qb = this.storeRepo.createQueryBuilder('store');
    applyMarketFilter(qb, 'store.regionCode', market);
    if (q.status) qb.andWhere('store.status = :status', { status: q.status });
    const [data, total] = await qb
      .orderBy('store.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();
    return { data, total, page, limit };
  }

  /** One pharmacy, with the counts the detail screen shows beside it. */
  async getStoreDetail(id: string, scope?: string) {
    const store = await this.storeInMarket(id, scope);
    const [products, orders, pendingPrescriptions] = await Promise.all([
      this.itemRepo.count({ where: { storeId: id } }),
      this.orderRepo.count({ where: { storeId: id } }),
      this.prescriptionRepo.count({
        where: { storeId: id, status: PrescriptionStatus.PENDING_VERIFICATION },
      }),
    ]);
    return { ...store, counts: { products, orders, pendingPrescriptions } };
  }

  // ── Products ───────────────────────────────────────────────────────────────

  async listProducts(q: {
    page?: number;
    limit?: number;
    category?: string;
    available?: boolean;
    region?: string;
    scope?: string;
  }) {
    const { page, limit, skip } = this.page(q);
    const market = this.market(q.scope, q.region, 'those products');
    const qb = this.itemRepo.createQueryBuilder('item').leftJoinAndSelect('item.store', 'store');
    applyMarketFilter(qb, 'store.regionCode', market);
    if (q.category) qb.andWhere('item.categoryId = :category', { category: q.category });
    if (q.available !== undefined) {
      qb.andWhere('item.isAvailable = :available', { available: q.available });
    }
    const [data, total] = await qb
      .orderBy('item.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();
    return { data, total, page, limit };
  }

  /**
   * Approve one product — and what "approved" can honestly mean here.
   *
   * `pharmacy_items` has NO moderation column: no `status`, no
   * `approvalStatus`, no reviewer. The only state an approval decision can
   * actually change is `isAvailable`, so that is what this writes, and the
   * response says so rather than implying a review state that is not stored.
   * Inventing `{ success: true }` over a row that never changed is the exact
   * failure this plan is closing; writing the one real column is the honest
   * half of it. A genuine moderation queue for this module needs a column and
   * therefore a migration — recorded in the task report as open work, not
   * papered over here.
   */
  async approveProduct(id: string, actorId?: string, scope?: string) {
    const item = await this.itemRepo.findOne({ where: { id }, relations: { store: true } });
    if (!item) throw new NotFoundException(`Pharmacy product ${id} not found`);
    // Attributed through the store, exactly as the lists are. A product whose
    // store is gone belongs to no market and no scoped admin may decide on it.
    if (item.store) {
      assertRecordMarket(item.store, 'regionCode', scope, 'pharmacy product', this.logger);
    } else {
      refuseUnattributable(scope, 'pharmacy product', this.logger);
    }
    await this.itemRepo.update(id, { isAvailable: true });
    await this.kafka.publish('pharmacy.product.approved', {
      id,
      storeId: item.storeId,
      market: item.store?.regionCode ?? null,
      actorId: actorId ?? null,
      at: new Date().toISOString(),
    });
    return { success: true, id, status: 'AVAILABLE', isAvailable: true };
  }

  // ── Orders ─────────────────────────────────────────────────────────────────

  async listOrders(q: {
    page?: number;
    limit?: number;
    status?: string;
    region?: string;
    scope?: string;
  }) {
    const { page, limit, skip } = this.page(q);
    const market = this.market(q.scope, q.region, 'those orders');
    const qb = this.orderRepo.createQueryBuilder('o').leftJoinAndSelect('o.store', 'store');
    applyMarketFilter(qb, 'store.regionCode', market);
    if (q.status) qb.andWhere('o.status = :status', { status: q.status });
    const [data, total] = await qb
      .orderBy('o.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();
    return { data, total, page, limit };
  }

  // ── Prescriptions ──────────────────────────────────────────────────────────

  /**
   * The prescription queue.
   *
   * `leftJoin` with the `::text` cast, not the relation: `prescriptions` has no
   * `@ManyToOne` to the store and its `storeId` is `character varying` against
   * a `uuid` primary key, so an uncast join is a Postgres type error rather
   * than an empty result — which is at least loud, but only once it runs.
   */
  async listPrescriptions(q: {
    page?: number;
    limit?: number;
    status?: string;
    region?: string;
    scope?: string;
  }) {
    const { page, limit, skip } = this.page(q);
    const market = this.market(q.scope, q.region, 'those prescriptions');
    // The join is for the PREDICATE only, and carries no `addSelect`.
    //
    // `prescriptions` has no `@ManyToOne` to the store, so this is a join to a
    // bare entity class — and TypeORM cannot hydrate selected columns from one
    // of those into the returned `Prescription`. An `addSelect` here compiles,
    // runs, and silently changes nothing about the rows, which is worse than
    // its absence: it reads as though the console is being handed the store's
    // market when it is not. Each row carries `storeId`; a screen that needs
    // the pharmacy's name resolves it from the stores list it already has.
    const qb = this.prescriptionRepo
      .createQueryBuilder('presc')
      .leftJoin(PharmacyStore, 'store', 'store.id::text = presc.storeId');
    applyMarketFilter(qb, 'store.regionCode', market);
    qb.andWhere('presc.status = :status', {
      status: q.status ?? PrescriptionStatus.PENDING_VERIFICATION,
    });
    const [data, total] = await qb
      .orderBy('presc.createdAt', 'ASC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();
    return { data, total, page, limit };
  }

  // ── Licence verification ───────────────────────────────────────────────────

  /**
   * The licence queue — pharmacies whose drug licence still needs a human.
   *
   * There is no separate verification entity in this module: a licence belongs
   * to a store (`drugLicenseNumber`, `drugLicenseExpiry`, `pharmacistRegNumber`,
   * `kycDocuments`), so the queue is a store list and the `:id` on
   * `PATCH /admin/pharmacy/verifications/:id/verify` is a STORE id. That is
   * stated here because a reader looking for a `pharmacy_verifications` table
   * will not find one.
   */
  async listVerifications(q: {
    page?: number;
    limit?: number;
    status?: string;
    region?: string;
    scope?: string;
  }) {
    const { page, limit, skip } = this.page(q);
    const market = this.market(q.scope, q.region, 'those verifications');
    const qb = this.storeRepo
      .createQueryBuilder('store')
      .select([
        'store.id',
        'store.name',
        'store.slug',
        'store.regionCode',
        'store.status',
        'store.drugLicenseNumber',
        'store.drugLicenseExpiry',
        'store.pharmacistRegNumber',
        'store.pharmacistName',
        'store.canDispenseScheduleH',
        'store.kycDocuments',
        'store.rejectionReason',
        'store.createdAt',
      ]);
    applyMarketFilter(qb, 'store.regionCode', market);
    if (q.status) qb.andWhere('store.status = :status', { status: q.status });
    else qb.andWhere('store.status IN (:...awaiting)', { awaiting: AWAITING_VERIFICATION });
    const [data, total] = await qb
      .orderBy('store.createdAt', 'ASC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();
    return { data, total, page, limit };
  }

  /**
   * Record a licence decision against the store it belongs to.
   *
   * A pass moves a pharmacy out of `PENDING_KYC` and into `PENDING_APPROVAL` —
   * the licence is checked, the pharmacy is not yet trading. It deliberately
   * does NOT approve the store: that is `admin.pharmacy.approve`, a separate
   * decision behind a separate permission key (`sellers.approve` against this
   * route's `kyc.approve`), and collapsing the two would let a KYC reviewer put
   * a pharmacy live.
   *
   * A fail sends it back to `PENDING_KYC` with the reviewer's note as the
   * rejection reason, and marks the stored documents rejected.
   */
  async verifyLicence(
    storeId: string,
    decision: { verified: boolean; notes?: string },
    actorId?: string,
    scope?: string,
  ) {
    const store = await this.storeInMarket(storeId, scope, 'pharmacy licence');
    const verified = decision?.verified === true;
    const reviewedAt = new Date().toISOString();
    const documents = (store.kycDocuments ?? []).map((doc) => ({
      ...doc,
      status: verified ? ('approved' as const) : ('rejected' as const),
      reviewedAt,
    }));

    // Only PENDING_KYC advances. A store already approved or suspended keeps
    // the status it has: a licence re-check is not a trading decision.
    const status = verified
      ? store.status === PharmacyStoreStatus.PENDING_KYC
        ? PharmacyStoreStatus.PENDING_APPROVAL
        : store.status
      : PharmacyStoreStatus.PENDING_KYC;

    await this.storeRepo.update(storeId, {
      status,
      kycDocuments: documents,
      rejectionReason: verified ? null : (decision?.notes ?? 'Licence verification failed'),
    });
    await this.kafka.publish('pharmacy.store.licence.verified', {
      id: storeId,
      market: store.regionCode,
      verified,
      notes: decision?.notes ?? null,
      actorId: actorId ?? null,
      at: reviewedAt,
    });
    return { success: true, id: storeId, status, verified };
  }

  // ── Categories ─────────────────────────────────────────────────────────────

  /**
   * One catalogue for the whole platform — "Analgesics" is the same category in
   * every market — so a region-locked administrator may read it and may not add
   * to it: a new category would appear on every other market's shelves too.
   * The same ruling as marketplace taxonomy, refused here as well as at the
   * gateway so a direct TCP caller meets it too.
   */
  async createCategory(
    body: { name?: string; slug?: string; [field: string]: unknown },
    actorId?: string,
    scope?: string,
  ) {
    refuseUnattributable(
      scope,
      'pharmacy taxonomy',
      this.logger,
      'Pharmacy taxonomy is managed globally.',
    );
    const name = String(body?.name ?? '').trim();
    if (!name) throw new BadRequestException('A category name is required.');
    const slug =
      String(body?.slug ?? '').trim() ||
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    const existing = await this.categoryRepo.findOne({ where: { slug } });
    if (existing)
      throw new BadRequestException(`A category with the slug "${slug}" already exists.`);

    const created = await this.categoryRepo.save(
      this.categoryRepo.create({
        name,
        slug,
        description: (body?.description as string) ?? null,
        emoji: (body?.emoji as string) ?? null,
        parentId: (body?.parentId as string) ?? null,
        sortOrder: Number(body?.sortOrder) || 0,
        requiresPrescription: body?.requiresPrescription === true,
      }),
    );
    await this.kafka.publish('pharmacy.category.created', {
      id: created.id,
      slug: created.slug,
      actorId: actorId ?? null,
      at: new Date().toISOString(),
    });
    return created;
  }

  // ── Commissions ────────────────────────────────────────────────────────────

  /**
   * What each pharmacy in the market is charged.
   *
   * `pharmacy_stores.commissionRate` is a real per-store column written by
   * `set_pharmacy_commission`, so this is a read of the rates actually in
   * force, not a rate card.
   */
  async getCommissions(q: { region?: string; scope?: string } = {}) {
    const market = this.market(q.scope, q.region, 'those commission rates');
    const qb = this.storeRepo
      .createQueryBuilder('store')
      .select([
        'store.id',
        'store.name',
        'store.regionCode',
        'store.status',
        'store.commissionRate',
        'store.taxRate',
        'store.totalOrders',
      ]);
    applyMarketFilter(qb, 'store.regionCode', market);
    const stores = await qb.orderBy('store.name', 'ASC').getMany();
    const rates = stores.map((s) => numeric(s.commissionRate));
    return {
      market: market ?? null,
      platformDefault: PHARMACY_SETTING_DEFAULTS.defaultCommissionRate,
      stores,
      count: stores.length,
      averageRate: rates.length
        ? Math.round((rates.reduce((a, b) => a + b, 0) / rates.length) * 100) / 100
        : 0,
    };
  }

  // ── Settlements ────────────────────────────────────────────────────────────

  /**
   * What the platform owes each pharmacy, per store, for the market asked for.
   *
   * This module has no settlements TABLE, and the brief anticipated that the
   * screen would therefore have to refuse a scoped caller outright. It does not
   * have to: a settlement is money earned on delivered, paid orders less the
   * store's commission, and `pharmacy_orders` carries `store_id` — so every
   * figure here is attributable through exactly the join the rest of this file
   * uses, which is the brief's own rule ("`refuseUnattributable` ONLY where the
   * underlying rows genuinely carry no store link; where they do, they are
   * predicated like the rest").
   *
   * Computed, and labelled as computed: `source: 'orders'` tells the console
   * these are derived figures rather than rows from a ledger a finance system
   * has agreed. A payout ledger for this module is separate work.
   */
  async getSettlements(q: { page?: number; limit?: number; region?: string; scope?: string } = {}) {
    const { page, limit, skip } = this.page(q);
    const market = this.market(q.scope, q.region, 'those settlements');

    const base = this.orderRepo
      .createQueryBuilder('o')
      // INNER: an order whose store is gone cannot be settled to anyone, in any
      // market. It is excluded from every caller's figures, not just a scoped
      // one's, because there is no payee.
      .innerJoin('o.store', 'store')
      .where('o.status IN (:...settled)', { settled: SETTLED_ORDER_STATES })
      .andWhere('o.paymentStatus = :paid', { paid: PharmacyPaymentStatus.PAID });
    applyMarketFilter(base, 'store.regionCode', market);

    const totalRow = await base
      .clone()
      .select('COUNT(DISTINCT store.id)', 'stores')
      .getRawOne<{ stores: string }>();

    const rows = await base
      .clone()
      .select('store.id', 'storeId')
      .addSelect('store.name', 'storeName')
      .addSelect('store.region_code', 'regionCode')
      .addSelect('store.commissionRate', 'commissionRate')
      .addSelect('COUNT(o.id)', 'orders')
      .addSelect('COALESCE(SUM(o.grandTotal), 0)', 'gross')
      .groupBy('store.id')
      .addGroupBy('store.name')
      .addGroupBy('store.region_code')
      .addGroupBy('store.commissionRate')
      .orderBy('"gross"', 'DESC')
      // `offset`/`limit`, not `skip`/`take`: the latter paginate ENTITIES and
      // wrap the query in a DISTINCT sub-select, which a GROUP BY projection
      // has no primary key to be distinct on.
      .offset(skip)
      .limit(limit)
      .getRawMany<Record<string, string>>();

    const data = rows.map((r) => {
      const gross = numeric(r.gross);
      const rate = numeric(r.commissionRate);
      const commission = Math.round(gross * rate) / 100;
      return {
        storeId: r.storeId,
        storeName: r.storeName,
        regionCode: r.regionCode,
        orders: Number(r.orders) || 0,
        commissionRate: rate,
        gross: Math.round(gross * 100) / 100,
        commission,
        net: Math.round((gross - commission) * 100) / 100,
      };
    });

    return {
      data,
      total: Number(totalRow?.stores) || 0,
      page,
      limit,
      market: market ?? null,
      source: 'orders',
    };
  }

  // ── Reports ────────────────────────────────────────────────────────────────

  /**
   * The reporting screen, every aggregate attributed through the store.
   *
   * A locked admin's report is their own market's and nobody else's: the order
   * aggregates join `o.store`, the catalogue aggregate joins `item.store`, and
   * both filter on `store.regionCode`.
   */
  async getReports(q: { period?: string; region?: string; scope?: string } = {}) {
    const period = q.period ?? '30d';
    const days = period === '7d' ? 7 : period === '90d' ? 90 : period === '365d' ? 365 : 30;
    const since = new Date(Date.now() - days * 86_400_000);
    const market = this.market(q.scope, q.region, 'those reports');

    const orders = this.orderRepo
      .createQueryBuilder('o')
      .innerJoin('o.store', 'store')
      .where('o.createdAt >= :since', { since });
    applyMarketFilter(orders, 'store.regionCode', market);

    const items = this.itemRepo.createQueryBuilder('item').innerJoin('item.store', 'store');
    applyMarketFilter(items, 'store.regionCode', market);

    const [daily, byStatus, topStores, catalogue] = await Promise.all([
      orders
        .clone()
        .select('DATE(o.createdAt)', 'day')
        .addSelect('COUNT(o.id)', 'orders')
        .addSelect('COALESCE(SUM(o.grandTotal), 0)', 'gross')
        .groupBy('DATE(o.createdAt)')
        .orderBy('"day"', 'ASC')
        .getRawMany<Record<string, string>>(),
      orders
        .clone()
        .select('o.status', 'status')
        .addSelect('COUNT(o.id)', 'count')
        .groupBy('o.status')
        .getRawMany<Record<string, string>>(),
      orders
        .clone()
        .select('store.id', 'storeId')
        .addSelect('store.name', 'storeName')
        .addSelect('COUNT(o.id)', 'orders')
        .addSelect('COALESCE(SUM(o.grandTotal), 0)', 'gross')
        .groupBy('store.id')
        .addGroupBy('store.name')
        .orderBy('"gross"', 'DESC')
        .limit(10)
        .getRawMany<Record<string, string>>(),
      items
        .clone()
        .select('COUNT(item.id)', 'products')
        .addSelect('COUNT(item.id) FILTER (WHERE item.requiresPrescription)', 'rxProducts')
        .addSelect('COUNT(item.id) FILTER (WHERE item.stockLevel <= item.reorderLevel)', 'lowStock')
        .getRawOne<Record<string, string>>(),
    ]);

    return {
      period,
      since: since.toISOString(),
      market: market ?? null,
      daily: daily.map((d) => ({
        day: d.day,
        orders: Number(d.orders) || 0,
        gross: numeric(d.gross),
      })),
      ordersByStatus: byStatus.map((s) => ({ status: s.status, count: Number(s.count) || 0 })),
      topStores: topStores.map((s) => ({
        storeId: s.storeId,
        storeName: s.storeName,
        orders: Number(s.orders) || 0,
        gross: numeric(s.gross),
      })),
      catalogue: {
        products: Number(catalogue?.products) || 0,
        prescriptionOnly: Number(catalogue?.rxProducts) || 0,
        lowStock: Number(catalogue?.lowStock) || 0,
      },
    };
  }

  // ── Settings ───────────────────────────────────────────────────────────────

  /**
   * Pharmacy settings for one market, falling back to the platform defaults.
   *
   * `source` says which row answered, so the console can show "inherited from
   * platform defaults" rather than implying the market set these values — the
   * distinction grocery's read had to learn to make (audit I9 / review I6).
   */
  async getSettings(q: { region?: string; scope?: string } = {}) {
    // The lock wins over the requested market, and a market this platform
    // cannot read is REFUSED rather than dropped.
    //
    // `requireMarket` is named HERE, at the call site, rather than left inside
    // `this.market()` — because the value lands in a `where` OBJECT below, and a
    // dropped key there does not mean "no predicate", it means EVERY market's
    // rows. That is the R2-1 shape, and `scope-helper-uniqueness` requires the
    // refusal to be visible where the object is built rather than one
    // indirection away, for exactly the reason it went unnoticed the first time.
    const m = marketPredicate(
      q.scope,
      requireMarket(q.region, 'pharmacy settings', this.logger),
      this.logger,
    );
    const [scoped, platform] = await Promise.all([
      m ? this.settingRepo.find({ where: { regionCode: m } }) : Promise.resolve([]),
      this.settingRepo.find({ where: { regionCode: PLATFORM_MARKET } }),
    ]);
    const platformStored = Object.fromEntries(platform.map((r) => [r.key, r.value]));
    const scopedStored = Object.fromEntries(scoped.map((r) => [r.key, r.value]));
    const rows = [...platform, ...scoped];
    return {
      settings: { ...PHARMACY_SETTING_DEFAULTS, ...platformStored, ...scopedStored },
      defaults: { ...PHARMACY_SETTING_DEFAULTS, ...platformStored },
      /** Every key with a persisted row — the ones that differ from what ships. */
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
   * Writes only keys the platform recognises, into the row the caller may write.
   *
   * A region-locked administrator is refused outright, and that is the ruling
   * rather than an omission: the values here change what every store in a
   * market may dispense, and the console has no market-settings screen for a
   * locked operator yet. A GLOBAL admin may target one market (`?countryCode=QA`),
   * which is the only way a market row comes to exist and therefore the only
   * way `getSettings` can ever answer `source: 'market'`.
   */
  async updateSettings(
    body: Record<string, unknown>,
    actorId?: string,
    scope?: string,
    market?: string,
  ) {
    refuseUnattributable(
      scope,
      'pharmacy settings',
      this.logger,
      'Pharmacy settings are managed globally.',
    );
    // Refused, never widened: a market this platform cannot read must not fall
    // through to the platform row, which would edit every market under the name
    // of one.
    const target = requireMarket(market, 'pharmacy settings', this.logger) ?? PLATFORM_MARKET;
    const entries = Object.entries(body ?? {});
    if (!entries.length) throw new BadRequestException('No settings supplied');

    const unknown = entries.map(([k]) => k).filter((k) => !(k in PHARMACY_SETTING_DEFAULTS));
    if (unknown.length) {
      throw new BadRequestException(
        `Unknown setting(s): ${unknown.join(', ')}. ` +
          `Known keys: ${Object.keys(PHARMACY_SETTING_DEFAULTS).join(', ')}`,
      );
    }
    for (const [key, value] of entries) {
      const expected = typeof PHARMACY_SETTING_DEFAULTS[key];
      if (typeof value !== expected) {
        throw new BadRequestException(
          `Setting "${key}" must be a ${expected}, received ${typeof value}`,
        );
      }
    }

    for (const [key, value] of entries) {
      // `regionCode` is named explicitly because it is half of the primary key:
      // `save()` upserts on the full key, and an entity created without it
      // would INSERT and collide with the row it meant to replace.
      await this.settingRepo.save(
        this.settingRepo.create({ key, regionCode: target, value, updatedBy: actorId ?? null }),
      );
    }
    await this.kafka.publish('pharmacy.settings.updated', {
      keys: entries.map(([k]) => k),
      market: target === PLATFORM_MARKET ? null : target,
      actorId: actorId ?? null,
      updatedAt: new Date().toISOString(),
    });
    this.logger.log(
      `Pharmacy settings updated for ${target === PLATFORM_MARKET ? 'every market' : target}: ` +
        entries.map(([k]) => k).join(', '),
    );
    // `scope` is provably undefined here — `refuseUnattributable` above threw
    // for anything else — so the read back is the global admin's own view of
    // the row they just wrote.
    return this.getSettings({ region: market });
  }

  /** Categories are global; the read is deliberately unfiltered. */
  listCategories() {
    return this.categoryRepo.find({ where: { isActive: true }, order: { sortOrder: 'ASC' } });
  }
}
