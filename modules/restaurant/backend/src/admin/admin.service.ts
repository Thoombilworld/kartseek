import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  applyMarketFilter,
  assertRecordMarket,
  marketPredicate,
  refuseUnattributable,
  requireMarket,
} from '@app/common';
import { KafkaProducerService } from '@app/kafka';
import {
  ComplaintStatus,
  MenuItem,
  Reservation,
  Restaurant,
  RestaurantComplaint,
  RestaurantCuisine,
  RestaurantDeliveryZone,
  RestaurantOrder,
  RestaurantOrderStatus,
  RestaurantPaymentStatus,
  RestaurantReview,
  RestaurantStatus,
} from '../entities';
import { RestaurantService } from '../restaurant.service';

/** The order states in which money has actually been earned. */
const EARNED_ORDER_STATES = [
  RestaurantOrderStatus.DELIVERED,
  RestaurantOrderStatus.CUSTOMER_PICKED_UP,
  RestaurantOrderStatus.SERVED,
  RestaurantOrderStatus.COMPLETED,
];

/** The restaurant states that put a restaurant in the approvals queue. */
const AWAITING_DECISION = [RestaurantStatus.PENDING_KYC, RestaurantStatus.PENDING_APPROVAL];

/** The periods the analytics screen offers, in days. */
const PERIOD_DAYS: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 };

/** A complaint is still work until it has been closed. */
const OPEN_COMPLAINT_STATES = [
  ComplaintStatus.OPEN,
  ComplaintStatus.INVESTIGATING,
  ComplaintStatus.ESCALATED,
];

const numeric = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const money = (v: unknown): number => +numeric(v).toFixed(2);

/**
 * The restaurant admin console's backend.
 *
 * Thirteen of the seventeen commands `admin-restaurant.controller.ts` sends had
 * no `@MessagePattern` anywhere in this module, so every screen but Restaurants
 * and Cuisines answered 503 — and, before M2 removed the gateway's fallbacks, a
 * fabricated empty success that was indistinguishable from "this market has no
 * restaurants".
 *
 * ── The market ──────────────────────────────────────────────────────────────
 *
 * `restaurants.region_code` is this module's market, and almost its only one:
 * menu items, orders, reservations, reviews, promotions and complaints all carry
 * `restaurantId` and nothing else, so every list joins the restaurant and
 * filters on the restaurant's market. Delivery zones are the one exception —
 * a zone belongs to a market and to no restaurant, so it carries `region_code`
 * itself. No migration copies a market onto the joined tables: the join already
 * answers the question, and a second copy of the market is the dead-pair mistake
 * F-35 records (this module has already paid for one — the alpha-3 `countryCode`
 * that sat beside `region_code` defaulting to `'KEN'` on every row).
 *
 * ── `LEFT(r.regionCode, 2)`, on BOTH sides ──────────────────────────────────
 *
 * This module stores sub-regions ('IN-MH', 'QA-DOH') in a market column the rest
 * of the platform reads as ISO-2. Customer discovery narrowed it with a prefix
 * while the admin list used an exact match, so a 'QA-DOH' restaurant was listed
 * to shoppers in Qatar and invisible — and, on approve, 403 — to the Qatar
 * administrator who moderates it (audit I4). `RestaurantService.scopeToRegion`
 * is the platform's answer for sub-regional codes and every predicate in this
 * file uses the same expression, so the admin list and the decision taken from
 * it can never disagree about which market a restaurant is in.
 *
 * ── Why the predicate, never a post-filter ──────────────────────────────────
 *
 * Filtering after `take(limit)` returns a short page that reads as "this market
 * has nothing", which is indistinguishable from a leak in the other direction.
 * Every market clause here is written by `applyMarketFilter` (`@app/common`),
 * the single implementation of that clause on the platform.
 */
@Injectable()
export class RestaurantAdminService {
  private readonly logger = new Logger(RestaurantAdminService.name);

  constructor(
    @InjectRepository(Restaurant) private readonly restaurantRepo: Repository<Restaurant>,
    @InjectRepository(MenuItem) private readonly menuItemRepo: Repository<MenuItem>,
    @InjectRepository(RestaurantOrder) private readonly orderRepo: Repository<RestaurantOrder>,
    @InjectRepository(Reservation) private readonly reservationRepo: Repository<Reservation>,
    @InjectRepository(RestaurantReview) private readonly reviewRepo: Repository<RestaurantReview>,
    @InjectRepository(RestaurantComplaint)
    private readonly complaintRepo: Repository<RestaurantComplaint>,
    @InjectRepository(RestaurantCuisine)
    private readonly cuisineRepo: Repository<RestaurantCuisine>,
    @InjectRepository(RestaurantDeliveryZone)
    private readonly zoneRepo: Repository<RestaurantDeliveryZone>,
    private readonly svc: RestaurantService,
    private readonly kafka: KafkaProducerService,
  ) {}

  // ── Shared scope plumbing ──────────────────────────────────────────────────

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
   * Load a restaurant for a decision and refuse it when it is not the caller's.
   *
   * `assertRecordMarket` keeps "no such id" (404) and "not your market" (403)
   * apart: a handler that asserts on a row it did not check for existence
   * reports a typo as a permission problem and sends an operator hunting for the
   * wrong thing.
   */
  private async restaurantInMarket(
    id: string,
    scope: string | undefined,
    what = 'restaurant',
  ): Promise<Restaurant> {
    const row = await this.restaurantRepo.findOne({
      where: { id },
      select: { id: true, name: true, regionCode: true, commissionRate: true },
    });
    assertRecordMarket(row, 'regionCode', scope, what, this.logger);
    return row;
  }

  /** A date `days` ago, for the period windows the console asks for. */
  private since(days: number): Date {
    return new Date(Date.now() - days * 86_400_000);
  }

  // ── Dashboard ──────────────────────────────────────────────────────────────

  /**
   * The console's landing figures, every one of them counted inside the caller's
   * market.
   *
   * Orders, menu items, reservations and complaints have no market of their own,
   * so each count joins the restaurant. A global administrator's figures are the
   * platform's.
   */
  async getDashboard(q: { region?: string; scope?: string } = {}) {
    const market = this.market(q.scope, q.region, 'that dashboard');
    const since = this.since(30);

    const restaurantQb = () =>
      applyMarketFilter(
        this.restaurantRepo.createQueryBuilder('r'),
        'LEFT(r.regionCode, 2)',
        market,
      );
    const orderQb = () =>
      applyMarketFilter(
        this.orderRepo.createQueryBuilder('o').leftJoin('o.restaurant', 'r'),
        'LEFT(r.regionCode, 2)',
        market,
      );

    const [
      restaurants,
      pending,
      suspended,
      online,
      menuItems,
      pendingMenuItems,
      orders,
      recentOrders,
      openComplaints,
      upcomingReservations,
      zones,
      revenueRow,
    ] = await Promise.all([
      restaurantQb().getCount(),
      restaurantQb()
        .andWhere('r.status IN (:...pendingStates)', {
          pendingStates: AWAITING_DECISION,
        })
        .getCount(),
      restaurantQb()
        .andWhere('r.status = :suspended', {
          suspended: RestaurantStatus.SUSPENDED,
        })
        .getCount(),
      restaurantQb().andWhere('r.isOnline = true').getCount(),
      this.menuItemQb(market).getCount(),
      this.menuItemQb(market).andWhere('item.isPendingApproval = true').getCount(),
      orderQb().getCount(),
      orderQb().andWhere('o.createdAt >= :since', { since }).getCount(),
      applyMarketFilter(
        this.complaintRepo.createQueryBuilder('c').leftJoin('c.restaurant', 'r'),
        'LEFT(r.regionCode, 2)',
        market,
      )
        .andWhere('c.status IN (:...open)', { open: OPEN_COMPLAINT_STATES })
        .getCount(),
      applyMarketFilter(
        this.reservationRepo.createQueryBuilder('res').leftJoin('res.restaurant', 'r'),
        'LEFT(r.regionCode, 2)',
        market,
      )
        .andWhere('res.date >= CURRENT_DATE')
        .getCount(),
      applyMarketFilter(
        this.zoneRepo.createQueryBuilder('z'),
        'LEFT(z.regionCode, 2)',
        market,
      ).getCount(),
      orderQb()
        .andWhere('o.status IN (:...earned)', { earned: EARNED_ORDER_STATES })
        .andWhere('o.createdAt >= :since', { since })
        .select('COALESCE(SUM(o.grandTotal), 0)', 'gross')
        .addSelect('COALESCE(SUM(o.platformFee), 0)', 'platformFee')
        .getRawOne<{ gross: string; platformFee: string }>(),
    ]);

    return {
      // Named so the console can label the figures honestly: these are this
      // market's, not the platform's, whenever the caller is region-locked.
      market: market ?? null,
      restaurants: { total: restaurants, pending, suspended, online },
      menu: { items: menuItems, pendingApproval: pendingMenuItems },
      orders: { total: orders, last30Days: recentOrders },
      revenue: {
        window: '30d',
        gross: money(revenueRow?.gross),
        platformFee: money(revenueRow?.platformFee),
      },
      complaints: { open: openComplaints },
      reservations: { upcoming: upcomingReservations },
      zones: { total: zones },
    };
  }

  // ── Restaurants ────────────────────────────────────────────────────────────

  /**
   * The restaurant list.
   *
   * Delegates to `RestaurantService.getAdminRestaurantList` rather than building
   * a second query: that method already applies `scopeToRegion`, the prefix
   * predicate customer discovery uses, and a second copy of a predicate is how
   * two code paths come to disagree about which rows are in a market. What is
   * added here is the RESOLUTION — the lock beating the requested market, and an
   * unreadable request refused rather than dropped, which the gateway's old
   * `regionCode: d?.scope ?? d?.countryCode` collapsed into one slot.
   */
  async listRestaurants(q: {
    page?: number;
    limit?: number;
    status?: string;
    region?: string;
    scope?: string;
  }) {
    const market = this.market(q.scope, q.region, 'those restaurants');
    const { page, limit } = this.page(q, 50);
    return this.svc.getAdminRestaurantList({ status: q.status, page, limit, regionCode: market });
  }

  /**
   * One restaurant, with the counts the detail screen shows beside it.
   *
   * The market is asserted on the loaded row, not filtered in the query: a
   * restaurant in another market has to answer 403, and a query that simply
   * filtered it out would answer 404 — telling a Qatar administrator that an
   * Indian restaurant does not exist rather than that it is not theirs.
   */
  async getRestaurant(id: string, scope?: string) {
    const row = await this.restaurantRepo.findOne({ where: { id } });
    assertRecordMarket(row, 'regionCode', scope, 'restaurant', this.logger);

    const [menuItems, pendingMenuItems, orders, openComplaints, reviews] = await Promise.all([
      this.menuItemRepo.count({ where: { restaurantId: id } }),
      this.menuItemRepo.count({ where: { restaurantId: id, isPendingApproval: true } }),
      this.orderRepo.count({ where: { restaurantId: id } }),
      this.complaintRepo.count({
        where: { restaurantId: id, status: In(OPEN_COMPLAINT_STATES) },
      }),
      this.reviewRepo.count({ where: { restaurantId: id } }),
    ]);

    return {
      ...row,
      market: row.regionCode ?? null,
      counts: { menuItems, pendingMenuItems, orders, openComplaints, reviews },
    };
  }

  // ── Orders ─────────────────────────────────────────────────────────────────

  /**
   * Every order placed with a restaurant in the caller's market.
   *
   * `restaurant_orders` has no market column: the join to `restaurants` is the
   * attribution, and `LEFT JOIN` + the predicate is what excludes an order whose
   * restaurant has been deleted — such an order belongs to no market, and
   * guessing which one is the leak.
   */
  async listOrders(q: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
    region?: string;
    scope?: string;
  }) {
    const market = this.market(q.scope, q.region, 'those orders');
    const { page, limit, skip } = this.page(q);

    const qb = applyMarketFilter(
      this.orderRepo
        .createQueryBuilder('o')
        .leftJoin('o.restaurant', 'r')
        .addSelect(['r.id', 'r.name', 'r.regionCode']),
      'LEFT(r.regionCode, 2)',
      market,
    );
    if (q.status) qb.andWhere('o.status = :status', { status: q.status });
    if (q.type) qb.andWhere('o.orderType = :type', { type: q.type });

    const [data, total] = await qb
      .orderBy('o.createdAt', 'DESC')
      // A second, unique sort key: `createdAt` is not unique, and a paged query
      // whose ORDER BY ties can return the same row on two pages and skip
      // another entirely (the catalogue ruling, `ORDER BY … , id`).
      .addOrderBy('o.id', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit, market: market ?? null };
  }

  // ── Menu approvals ─────────────────────────────────────────────────────────

  /**
   * `menu_items` has no relation to `restaurants` — only a denormalised
   * `restaurantId`, and it is `character varying` while `restaurants.id` is
   * `uuid`. Without the cast Postgres answers `operator does not exist: uuid =
   * character varying` and the whole screen 500s.
   */
  private menuItemQb(market: string | undefined) {
    return applyMarketFilter(
      this.menuItemRepo
        .createQueryBuilder('item')
        .leftJoin(Restaurant, 'r', 'r.id::text = item.restaurantId'),
      'LEFT(r.regionCode, 2)',
      market,
    );
  }

  /** The menu moderation queue: items a restaurant has submitted and nobody has decided on. */
  async listMenuApprovals(q: { page?: number; limit?: number; region?: string; scope?: string }) {
    const market = this.market(q.scope, q.region, 'that queue');
    const { page, limit, skip } = this.page(q);

    const [rows, total] = await Promise.all([
      this.menuItemQb(market)
        .addSelect(['r.id', 'r.name', 'r.regionCode'])
        .andWhere('item.isPendingApproval = true')
        .orderBy('item.createdAt', 'ASC')
        .addOrderBy('item.id', 'ASC')
        .skip(skip)
        .take(limit)
        .getRawAndEntities(),
      this.menuItemQb(market).andWhere('item.isPendingApproval = true').getCount(),
    ]);

    // The restaurant columns are selected on a join with no relation to hydrate,
    // so they arrive on the raw row rather than on the entity.
    const data = rows.entities.map((item, i) => ({
      ...item,
      restaurant: {
        id: rows.raw[i]?.r_id ?? null,
        name: rows.raw[i]?.r_name ?? null,
        market: rows.raw[i]?.r_region_code ?? null,
      },
    }));

    return { data, total, page, limit, market: market ?? null };
  }

  /**
   * Approve one menu item.
   *
   * The item's market is its restaurant's, so the restaurant is loaded and
   * asserted first — before anything is written or published, because a Kafka
   * event is as visible as a database row. An item whose restaurant is missing
   * is attributable to no market and is refused for a scoped caller.
   */
  async approveMenuItem(id: string, actorId?: string, scope?: string) {
    const item = await this.menuItemRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('No menu item with that id');
    if (!item.restaurantId) {
      refuseUnattributable(scope, 'menu item', this.logger);
    }
    const restaurant = await this.restaurantInMarket(item.restaurantId, scope, 'menu item');

    await this.menuItemRepo.update(
      { id },
      // Approving a menu item is exactly two things: it leaves the queue, and it
      // becomes orderable. `isPendingApproval` alone would clear the queue and
      // leave the item invisible to customers, which reads to the restaurant as
      // an approval that did nothing.
      { isPendingApproval: false, isAvailable: true },
    );
    await this.kafka.publish('restaurant.menu_item.approved', {
      id,
      restaurantId: item.restaurantId,
      market: restaurant.regionCode ?? null,
      actorId: actorId ?? null,
      approvedAt: new Date().toISOString(),
    });
    this.logger.log(`Menu item ${id} approved by ${actorId ?? 'unknown'}`);
    return { success: true, id, restaurantId: item.restaurantId, isAvailable: true };
  }

  // ── Complaints ─────────────────────────────────────────────────────────────

  private complaintQb(market: string | undefined) {
    return applyMarketFilter(
      this.complaintRepo.createQueryBuilder('c').leftJoin('c.restaurant', 'r'),
      'LEFT(r.regionCode, 2)',
      market,
    );
  }

  async listComplaints(q: {
    page?: number;
    limit?: number;
    status?: string;
    region?: string;
    scope?: string;
  }) {
    const market = this.market(q.scope, q.region, 'those complaints');
    const { page, limit, skip } = this.page(q);

    const qb = this.complaintQb(market).addSelect(['r.id', 'r.name', 'r.regionCode']);
    if (q.status) qb.andWhere('c.status = :status', { status: q.status });

    const [data, total] = await qb
      .orderBy('c.status', 'ASC')
      .addOrderBy('c.createdAt', 'DESC')
      .addOrderBy('c.id', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit, market: market ?? null };
  }

  /**
   * Close a complaint.
   *
   * The complaint's market is its restaurant's — `restaurant_complaints` holds
   * no market of its own on purpose — so the restaurant is loaded and asserted
   * before the write. A resolution is required: "resolved" with no record of
   * what was done is the state this table exists to stop the console faking.
   */
  async resolveComplaint(id: string, resolution: string, actorId?: string, scope?: string) {
    const complaint = await this.complaintRepo.findOne({ where: { id } });
    if (!complaint) throw new NotFoundException('No complaint with that id');
    const text = String(resolution ?? '').trim();
    if (text.length < 3) {
      throw new BadRequestException('A resolution is required to close a complaint');
    }
    await this.restaurantInMarket(complaint.restaurantId, scope, 'complaint');

    complaint.status = ComplaintStatus.RESOLVED;
    complaint.resolution = text;
    complaint.resolvedBy = actorId ?? null;
    complaint.resolvedAt = new Date();
    const saved = await this.complaintRepo.save(complaint);

    await this.kafka.publish('restaurant.complaint.resolved', {
      id: saved.id,
      restaurantId: saved.restaurantId,
      customerId: saved.customerId,
      orderId: saved.orderId,
      actorId: actorId ?? null,
      resolvedAt: saved.resolvedAt?.toISOString() ?? null,
    });
    this.logger.log(`Complaint ${id} resolved by ${actorId ?? 'unknown'}`);
    return { success: true, complaint: saved };
  }

  // ── Commissions ────────────────────────────────────────────────────────────

  /**
   * What each restaurant in the market is charged, and what that has earned.
   *
   * The rate is the restaurant's own `commissionRate`; the amount is computed
   * from its earned orders over the last 90 days. The response says
   * `source: 'orders'` so the console can label these as derived figures rather
   * than rows from an agreed payout ledger — restaurant-service has no such
   * ledger, and presenting a computation as one would be the same lie in a
   * different place.
   */
  async getCommissions(q: { page?: number; limit?: number; region?: string; scope?: string }) {
    const market = this.market(q.scope, q.region, 'those commission rates');
    const { page, limit, skip } = this.page(q, 50);
    const since = this.since(90);

    const [restaurants, total] = await applyMarketFilter(
      this.restaurantRepo.createQueryBuilder('r'),
      'LEFT(r.regionCode, 2)',
      market,
    )
      .select(['r.id', 'r.name', 'r.regionCode', 'r.commissionRate', 'r.status'])
      .orderBy('r.name', 'ASC')
      .addOrderBy('r.id', 'ASC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const ids = restaurants.map((r) => r.id);
    const earned = ids.length
      ? await this.orderRepo
          .createQueryBuilder('o')
          .select('o.restaurantId', 'restaurantId')
          .addSelect('COALESCE(SUM(o.grandTotal), 0)', 'gross')
          .addSelect('COUNT(*)', 'orders')
          .where('o.restaurantId IN (:...ids)', { ids })
          .andWhere('o.status IN (:...earned)', { earned: EARNED_ORDER_STATES })
          .andWhere('o.createdAt >= :since', { since })
          .groupBy('o.restaurantId')
          .getRawMany<{ restaurantId: string; gross: string; orders: string }>()
      : [];
    const byRestaurant = new Map(earned.map((row) => [row.restaurantId, row]));

    const data = restaurants.map((r) => {
      const row = byRestaurant.get(r.id);
      const gross = numeric(row?.gross);
      const rate = numeric(r.commissionRate);
      return {
        id: r.id,
        name: r.name,
        market: r.regionCode ?? null,
        status: r.status,
        commissionRate: rate,
        orders: Number(row?.orders ?? 0),
        grossSales: money(gross),
        commissionEarned: money((gross * rate) / 100),
      };
    });

    return {
      data,
      total,
      page,
      limit,
      market: market ?? null,
      window: '90d',
      source: 'orders',
    };
  }

  /**
   * Change one restaurant's commission rate.
   *
   * ONE restaurant, named explicitly — not "every restaurant in this market".
   * The console's screen is a table of restaurants with an editable rate each,
   * and a market-wide default would be a different feature with different
   * storage: it would have to survive a restaurant that has negotiated its own
   * rate, which a bulk `UPDATE … WHERE region_code = …` silently overwrites.
   * When that default is wanted it needs a settings row and a migration, not a
   * bulk write hidden behind a plural command name.
   */
  async updateCommissions(
    body: { restaurantId?: string; commissionRate?: number },
    actorId?: string,
    scope?: string,
  ) {
    const id = String(body?.restaurantId ?? '').trim();
    if (!id) throw new BadRequestException('restaurantId is required');
    const rate = Number(body?.commissionRate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      throw new BadRequestException('commissionRate must be a percentage between 0 and 100');
    }

    const restaurant = await this.restaurantInMarket(id, scope, 'restaurant');
    const previous = numeric(restaurant.commissionRate);
    await this.restaurantRepo.update({ id }, { commissionRate: rate });
    this.logger.log(
      `Commission for ${id} changed ${previous}% -> ${rate}% by ${actorId ?? 'unknown'}`,
    );
    return {
      success: true,
      restaurantId: id,
      market: restaurant.regionCode ?? null,
      previousRate: previous,
      commissionRate: rate,
    };
  }

  // ── Cuisines ───────────────────────────────────────────────────────────────

  /**
   * Add a cuisine to the platform catalogue.
   *
   * Global, so a region-locked administrator is refused: adding to this list
   * changes what every other market's restaurants may claim. `refuseUnattributable`
   * is the platform's spelling of that refusal and logs it like any other denial;
   * the gateway refuses it first (`refuseLockedAdmin`), and this is the second
   * line for a caller reaching restaurant-service directly over TCP.
   */
  async createCuisine(
    body: { name?: string; slug?: string; icon?: string; description?: string; sortOrder?: number },
    actorId?: string,
    scope?: string,
  ) {
    refuseUnattributable(
      scope,
      'restaurant taxonomy',
      this.logger,
      'Restaurant taxonomy is managed globally.',
    );

    const name = String(body?.name ?? '').trim();
    if (name.length < 2) throw new BadRequestException('A cuisine name is required');
    const slug = (body?.slug ?? name).trim().toLowerCase().replace(/\s+/g, '-');

    const clash = await this.cuisineRepo
      .createQueryBuilder('c')
      .where('LOWER(c.name) = LOWER(:name)', { name })
      .orWhere('c.slug = :slug', { slug })
      .getOne();
    // A duplicate is a 400 with the existing row named, not a 500 from the unique
    // index: the console's operator typed a cuisine that is already there and
    // needs to be told which one, not handed a constraint violation.
    if (clash) {
      throw new BadRequestException(`Cuisine "${clash.name}" already exists`);
    }

    const saved = await this.cuisineRepo.save(
      this.cuisineRepo.create({
        name,
        slug,
        icon: body?.icon ?? null,
        description: body?.description ?? null,
        sortOrder: Number.isFinite(Number(body?.sortOrder)) ? Number(body?.sortOrder) : 0,
        isActive: true,
        createdBy: actorId ?? null,
      }),
    );
    this.logger.log(`Cuisine "${saved.name}" created by ${actorId ?? 'unknown'}`);
    return { success: true, cuisine: saved };
  }

  // ── Analytics ──────────────────────────────────────────────────────────────

  /**
   * The analytics screen, computed from this market's orders.
   *
   * Every figure joins the restaurant, so a region-locked administrator's chart
   * is their own market's and a global one's is the platform's. The period is
   * whitelisted rather than parsed: an unrecognised one is a 400, because a
   * silently-defaulted window is a chart that says something other than what its
   * label claims.
   */
  async getAnalytics(q: { period?: string; region?: string; scope?: string }) {
    const period = q.period ?? '30d';
    const days = PERIOD_DAYS[period];
    if (!days) {
      throw new BadRequestException(`period must be one of ${Object.keys(PERIOD_DAYS).join(', ')}`);
    }
    const market = this.market(q.scope, q.region, 'those analytics');
    const since = this.since(days);

    const base = () =>
      applyMarketFilter(
        this.orderRepo
          .createQueryBuilder('o')
          .leftJoin('o.restaurant', 'r')
          .where('o.createdAt >= :since', { since }),
        'LEFT(r.regionCode, 2)',
        market,
      );

    const [totals, byType, byDay, topRestaurants, newRestaurants] = await Promise.all([
      base()
        .select('COUNT(*)', 'orders')
        .addSelect('COALESCE(SUM(o.grandTotal), 0)', 'gross')
        .addSelect('COALESCE(SUM(o.platformFee), 0)', 'platformFee')
        .addSelect(
          `COUNT(*) FILTER (WHERE o.status = '${RestaurantOrderStatus.CANCELLED}')`,
          'cancelled',
        )
        .addSelect(
          `COUNT(*) FILTER (WHERE o.paymentStatus = '${RestaurantPaymentStatus.PAID}')`,
          'paid',
        )
        .getRawOne<Record<string, string>>(),
      base()
        .select('o.orderType', 'orderType')
        .addSelect('COUNT(*)', 'orders')
        .addSelect('COALESCE(SUM(o.grandTotal), 0)', 'gross')
        .groupBy('o.orderType')
        .getRawMany<{ orderType: string; orders: string; gross: string }>(),
      base()
        .select('DATE(o.createdAt)', 'day')
        .addSelect('COUNT(*)', 'orders')
        .addSelect('COALESCE(SUM(o.grandTotal), 0)', 'gross')
        .groupBy('DATE(o.createdAt)')
        .orderBy('DATE(o.createdAt)', 'ASC')
        .getRawMany<{ day: string; orders: string; gross: string }>(),
      base()
        .select('r.id', 'id')
        .addSelect('r.name', 'name')
        .addSelect('COUNT(*)', 'orders')
        .addSelect('COALESCE(SUM(o.grandTotal), 0)', 'gross')
        .groupBy('r.id')
        .addGroupBy('r.name')
        .orderBy('COALESCE(SUM(o.grandTotal), 0)', 'DESC')
        .addOrderBy('r.id', 'ASC')
        .limit(10)
        .getRawMany<{ id: string; name: string; orders: string; gross: string }>(),
      applyMarketFilter(
        this.restaurantRepo.createQueryBuilder('r').where('r.createdAt >= :since', { since }),
        'LEFT(r.regionCode, 2)',
        market,
      ).getCount(),
    ]);

    const orders = Number(totals?.orders ?? 0);
    const gross = numeric(totals?.gross);

    return {
      period,
      market: market ?? null,
      orders,
      grossSales: money(gross),
      platformFee: money(totals?.platformFee),
      cancelled: Number(totals?.cancelled ?? 0),
      paidOrders: Number(totals?.paid ?? 0),
      averageOrderValue: orders ? money(gross / orders) : 0,
      newRestaurants,
      byOrderType: byType.map((t) => ({
        orderType: t.orderType,
        orders: Number(t.orders),
        grossSales: money(t.gross),
      })),
      daily: byDay.map((d) => ({
        day: typeof d.day === 'string' ? d.day : new Date(d.day).toISOString().slice(0, 10),
        orders: Number(d.orders),
        grossSales: money(d.gross),
      })),
      topRestaurants: topRestaurants.map((t) => ({
        id: t.id,
        name: t.name,
        orders: Number(t.orders),
        grossSales: money(t.gross),
      })),
    };
  }

  // ── Delivery zones ─────────────────────────────────────────────────────────

  /**
   * A zone carries its OWN market, because it belongs to no restaurant. The
   * predicate is still `LEFT(…, 2)`, for the same reason it is on `restaurants`:
   * a value entered as 'QA-DOH' has to match a QA administrator's scope.
   */
  async listZones(q: { page?: number; limit?: number; region?: string; scope?: string }) {
    const market = this.market(q.scope, q.region, 'those delivery zones');
    const { page, limit, skip } = this.page(q, 50);

    const [data, total] = await applyMarketFilter(
      this.zoneRepo.createQueryBuilder('z'),
      'LEFT(z.regionCode, 2)',
      market,
    )
      .orderBy('z.name', 'ASC')
      .addOrderBy('z.id', 'ASC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit, market: market ?? null };
  }

  /**
   * Create a delivery zone in one market.
   *
   * The market comes from the caller's lock when they have one, and from the
   * request otherwise — never from a body field a locked admin could set to
   * somewhere else; `this.market()` resolves that precedence and refuses a
   * locked caller who named another market before anything is written.
   *
   * A zone with no market is refused rather than stored: it would be a row no
   * scoped administrator could edit and every scoped administrator could see.
   */
  async createZone(
    body: {
      name?: string;
      city?: string;
      pincodes?: string[];
      centerLat?: number;
      centerLng?: number;
      radiusKm?: number;
      deliveryFee?: number;
      minOrderAmount?: number;
      etaMinutes?: number;
      isActive?: boolean;
    },
    actorId?: string,
    scope?: string,
    requestedMarket?: string,
  ) {
    const market = this.market(scope, requestedMarket, 'that delivery zone');
    if (!market) {
      throw new BadRequestException(
        'countryCode is required: a delivery zone belongs to one market',
      );
    }
    const name = String(body?.name ?? '').trim();
    if (name.length < 2) throw new BadRequestException('A zone name is required');

    const saved = await this.zoneRepo.save(
      this.zoneRepo.create({
        name,
        regionCode: market,
        city: body?.city ?? null,
        pincodes: body?.pincodes ?? [],
        centerLat: body?.centerLat ?? null,
        centerLng: body?.centerLng ?? null,
        radiusKm: body?.radiusKm ?? 10,
        deliveryFee: body?.deliveryFee ?? 0,
        minOrderAmount: body?.minOrderAmount ?? 0,
        etaMinutes: body?.etaMinutes ?? 40,
        isActive: body?.isActive ?? true,
        createdBy: actorId ?? null,
      }),
    );
    this.logger.log(
      `Delivery zone "${saved.name}" created in ${market} by ${actorId ?? 'unknown'}`,
    );
    return { success: true, zone: saved };
  }
}
