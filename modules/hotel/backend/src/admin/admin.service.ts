import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import {
  applyMarketFilter,
  assertInMarket,
  assertRecordMarket,
  marketPredicate,
  refuseUnattributable,
  requireMarket,
  requireUuid,
} from '@app/common';
import { KafkaProducerService } from '@app/kafka';
import { HotelService } from '../hotel.service';

import { Hotel, HotelStatus } from '../entities/hotel.entity';
import { HotelRoom } from '../entities/hotel-room.entity';
import { HotelBooking } from '../entities/hotel-booking.entity';
import { HotelReview } from '../entities/hotel-review.entity';
import { HotelSeasonalPricing } from '../entities/hotel-seasonal-pricing.entity';
import { HotelAmenity } from '../entities/hotel-amenity.entity';
import { HotelMarketSettings } from '../entities/hotel-market-settings.entity';
import type {
  AdminAmenityMsg,
  AdminListMsg,
  AdminModerateReviewMsg,
  AdminPricingMsg,
  AdminReportMsg,
  AdminRoomListMsg,
  AdminSettingsMsg,
} from './dto/admin.dto';

/** The booking states in which money has actually been earned. */
const EARNED_BOOKING_STATES = ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'COMPLETED'];

/** The hotel states that put a property in the approvals queue. */
const AWAITING_DECISION = [HotelStatus.PENDING_KYC, HotelStatus.PENDING_APPROVAL];

/** The periods the reports screen offers, in days. */
const PERIOD_DAYS: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 };

/** The review filters the moderation queue offers. */
const REVIEW_FILTERS = ['ALL', 'FLAGGED', 'VISIBLE', 'HIDDEN'] as const;
type ReviewFilter = (typeof REVIEW_FILTERS)[number];

/** What an administrator may do to a review. */
const REVIEW_ACTIONS = ['approve', 'remove'] as const;
type ReviewAction = (typeof REVIEW_ACTIONS)[number];

const numeric = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const money = (v: unknown): number => +numeric(v).toFixed(2);

/** The catalogue's identity for an amenity name — see `HotelAmenity.slug`. */
const amenitySlug = (name: string): string =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/**
 * The hotel admin console's backend.
 *
 * ── The gap this closes ─────────────────────────────────────────────────────
 *
 * `admin-hotel.controller.ts` sends seventeen distinct commands. Five reached a
 * handler; the other twelve had no `@MessagePattern` anywhere in this module, so
 * every hotel console screen but Dashboard, Hotels and the two hotel decisions
 * answered 503 — and, before M2 removed the gateway's fallbacks, a fabricated
 * empty success that was indistinguishable from "this market has no rooms".
 *
 * ── The market ──────────────────────────────────────────────────────────────
 *
 * `hotels.countryCode` is this module's market (ISO-2; the platform's
 * `region_code` under the name hotel predates it by — the exception is
 * registered in `libs/common/src/market/market-scope.ts`). Rooms, bookings,
 * reviews and seasonal pricing rules all carry `hotel_id` and nothing else, so
 * every list here joins the hotel and filters on the HOTEL's market, and every
 * decision asserts against the hotel's own row. No migration copies a market
 * onto the joined tables: the join already answers the question, and a second
 * copy of the market is the dead-pair mistake F-35 records — this module has
 * already paid for one, the `region_code` that sat beside `countryCode` holding
 * sub-regions nothing read.
 *
 * `hotel_market_settings` is the one exception, and it is not a copy: a market's
 * configuration belongs to a market and to no hotel, so it carries
 * `countryCode` itself and NOT NULL.
 *
 * ── Bookings: the join, not the snapshot ────────────────────────────────────
 *
 * `hotel_bookings.hotelCountryCode` is a nullable snapshot written at booking
 * time, and `HotelService.getAdminAnalytics` attributes the DASHBOARD through it
 * (the R9 ruling). Everything in this file goes through the hotel join instead,
 * deliberately and consistently: the boundary this file enforces is
 * AUTHORISATION — who may list, open and act on a row — and the detail read and
 * every decision must assert against the hotel's own current market. A list
 * filtered on a stale or NULL snapshot would show a QA administrator a booking
 * that then 403s the moment they open it, which is the worst of both answers.
 *
 * ── Why the predicate, never a post-filter ──────────────────────────────────
 *
 * Filtering after `take(limit)` returns a short page that reads as "this market
 * has nothing", which is indistinguishable from a leak in the other direction.
 * Every market clause here is written by `applyMarketFilter` (`@app/common`),
 * the single implementation of that clause on the platform.
 */
@Injectable()
export class HotelAdminService {
  private readonly logger = new Logger(HotelAdminService.name);

  constructor(
    @InjectRepository(Hotel) private readonly hotelRepo: Repository<Hotel>,
    @InjectRepository(HotelRoom) private readonly roomRepo: Repository<HotelRoom>,
    @InjectRepository(HotelBooking) private readonly bookingRepo: Repository<HotelBooking>,
    @InjectRepository(HotelReview) private readonly reviewRepo: Repository<HotelReview>,
    @InjectRepository(HotelSeasonalPricing)
    private readonly pricingRepo: Repository<HotelSeasonalPricing>,
    @InjectRepository(HotelAmenity) private readonly amenityRepo: Repository<HotelAmenity>,
    @InjectRepository(HotelMarketSettings)
    private readonly settingsRepo: Repository<HotelMarketSettings>,
    private readonly svc: HotelService,
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
   * passes it through, and the clause itself is still written in the one place
   * that writes it.
   */
  private market(scope?: string, requested?: string, what = 'market'): string | undefined {
    return marketPredicate(scope, requireMarket(requested, what, this.logger), this.logger);
  }

  /** Page controls, clamped: a page is a page and a limit is at most 100 rows. */
  private page(q: { page?: number; limit?: number }, fallbackLimit = 20) {
    const limit = Math.min(Math.max(Number(q.limit) || fallbackLimit, 1), 100);
    const page = Math.max(Number(q.page) || 1, 1);
    return { page, limit, skip: (page - 1) * limit };
  }

  /**
   * The property a room, booking, review or pricing rule belongs to — and the
   * refusal when it is not the caller's.
   *
   * `assertRecordMarket` keeps "no such id" (404) and "not your market" (403)
   * apart: a handler that asserts on a row it did not check for existence
   * reports a typo as a permission problem and sends an operator hunting for the
   * wrong thing. The brief's sketch of this helper returned `string | null`,
   * which cannot make that distinction — a missing hotel and a hotel in another
   * market both read as "no market" — so it loads and asserts instead.
   */
  private async hotelInMarket(id: string, scope?: string, what = 'hotel'): Promise<Hotel> {
    const row = await this.hotelRepo.findOne({
      where: { id: requireUuid(id, what) },
      select: { id: true, name: true, countryCode: true, rating: true, reviewCount: true },
    });
    assertRecordMarket(row, 'countryCode', scope, what, this.logger);
    return row;
  }

  /**
   * The hotel columns a console row needs, without dragging the whole property.
   *
   * `countryCode` is always among them on purpose: the console row shows which
   * market it belongs to, and the probe that proves a list is scoped reads it
   * off the payload rather than trusting the query.
   */
  private selectHotel<T extends ObjectLiteral>(qb: SelectQueryBuilder<T>): void {
    qb.addSelect(['hotel.id', 'hotel.name', 'hotel.city', 'hotel.countryCode', 'hotel.status']);
  }

  /** A date `days` ago, for the report windows the console asks for. */
  private since(days: number): Date {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  }

  // ── Rooms ──────────────────────────────────────────────────────────────────

  /**
   * Every room in the caller's market, reached through its property.
   *
   * `hotelId` narrows to one property and is asserted BEFORE the list is built:
   * without that, naming another market's hotel would return an empty page,
   * which reads as "that hotel has no rooms" rather than "that hotel is not
   * yours".
   */
  async listRooms(q: AdminRoomListMsg & { region?: string }) {
    const market = this.market(q.scope, q.region ?? q.countryCode, 'those rooms');
    const { page, limit, skip } = this.page(q);

    const qb = this.roomRepo.createQueryBuilder('room').innerJoin('room.hotel', 'hotel');
    this.selectHotel(qb);
    applyMarketFilter(qb, 'hotel.countryCode', market);

    if (q.hotelId) {
      const hotel = await this.hotelInMarket(q.hotelId, q.scope, 'hotel');
      qb.andWhere('room.hotelId = :hotelId', { hotelId: hotel.id });
    }
    if (q.status) qb.andWhere('room.status = :status', { status: q.status });

    const [data, total] = await qb
      .orderBy('hotel.name', 'ASC')
      .addOrderBy('room.name', 'ASC')
      // Ties broken on the primary key so page 2 cannot repeat a row from page 1.
      .addOrderBy('room.id', 'ASC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit, market: market ?? null };
  }

  // ── Bookings ───────────────────────────────────────────────────────────────

  async listBookings(q: AdminListMsg & { region?: string }) {
    const market = this.market(q.scope, q.region ?? q.countryCode, 'those bookings');
    const { page, limit, skip } = this.page(q);

    const qb = this.bookingRepo.createQueryBuilder('booking').innerJoin('booking.hotel', 'hotel');
    this.selectHotel(qb);
    applyMarketFilter(qb, 'hotel.countryCode', market);
    if (q.status) qb.andWhere('booking.status = :status', { status: q.status });

    const [data, total] = await qb
      .orderBy('booking.createdAt', 'DESC')
      .addOrderBy('booking.id', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit, market: market ?? null };
  }

  /**
   * One booking, with its property and room.
   *
   * A booking whose hotel has gone is UNATTRIBUTABLE, not global: it is refused
   * for a scoped caller and readable by a global one, which is what
   * `refuseUnattributable` means everywhere else on the platform. Widening it
   * to "every market" is the direction that leaks.
   */
  async getBookingDetail(id: string, scope?: string) {
    const booking = await this.bookingRepo.findOne({
      where: { id: requireUuid(id, 'hotel booking') },
      relations: { hotel: true, room: true },
    });
    if (!booking) throw new NotFoundException('No hotel booking with that id');

    if (!booking.hotel) refuseUnattributable(scope, 'hotel booking', this.logger);
    else assertInMarket(booking.hotel.countryCode, scope, 'hotel booking', this.logger);

    return booking;
  }

  // ── Amenities — one catalogue, every market ────────────────────────────────

  /**
   * The catalogue, unioned with what the properties actually offer.
   *
   * Two lists would have been easier and is exactly how a platform comes to
   * have two answers: a catalogue nobody's hotels use, and a set of amenity
   * strings nobody can edit. One read: every catalogued amenity plus every
   * amenity a hotel actually names, each with the number of properties offering
   * it. An uncatalogued entry carries `catalogued: false` and no `id` — `slug`
   * is its key — so the console can offer to add it rather than pretending it is
   * already a row.
   *
   * Deliberately GLOBAL and unfiltered: "Pool" is the same amenity in Doha and
   * in Delhi, the gateway marks this read `@GlobalEntity`, and the counts are
   * platform-wide by the same reasoning. A scoped caller reads it; only the
   * write is withheld.
   */
  async listAmenities() {
    const catalogue = await this.amenityRepo.find({ order: { name: 'ASC' } });

    // `hotels.amenities` is a `simple-array` — one comma-joined TEXT column —
    // so the live usage count has to unnest it. Raw because a lateral unnest is
    // not expressible on the query builder; it carries no market clause at all,
    // which is the point of this read.
    const used = await this.hotelRepo.query(`
      SELECT BTRIM(a.value) AS name, COUNT(DISTINCT h.id)::int AS "hotelCount"
        FROM "hotel"."hotels" h,
             LATERAL unnest(string_to_array(COALESCE(h."amenities", ''), ',')) AS a(value)
       WHERE BTRIM(a.value) <> ''
       GROUP BY 1
    `);

    const usage = new Map<string, { name: string; hotelCount: number }>();
    for (const row of used as Array<{ name: string; hotelCount: number }>) {
      usage.set(amenitySlug(row.name), { name: row.name, hotelCount: numeric(row.hotelCount) });
    }

    const data = catalogue.map((a) => ({
      id: a.id,
      name: a.name,
      slug: a.slug,
      icon: a.icon,
      category: a.category,
      isActive: a.isActive,
      catalogued: true,
      hotelCount: usage.get(a.slug)?.hotelCount ?? 0,
    }));
    const catalogued = new Set(catalogue.map((a) => a.slug));
    for (const [slug, row] of usage) {
      if (catalogued.has(slug)) continue;
      data.push({
        id: null as unknown as string,
        name: row.name,
        slug,
        icon: null,
        category: null,
        isActive: true,
        catalogued: false,
        hotelCount: row.hotelCount,
      });
    }

    data.sort((a, b) => a.name.localeCompare(b.name));
    return { data, total: data.length, catalogued: catalogue.length };
  }

  /**
   * Add one entry to the global catalogue.
   *
   * `refuseUnattributable` is the SECOND line: the gateway already refuses a
   * region-locked administrator with `refuseLockedAdmin`, and this refuses one
   * again for a caller that reached this service over TCP by any other path.
   * Editing a global taxonomy changes every other market's hotels along with
   * the caller's own, which is not a regional administrator's decision to take.
   */
  async createAmenity(d: AdminAmenityMsg) {
    refuseUnattributable(
      d.scope,
      'hotel amenity',
      this.logger,
      'Hotel taxonomy is managed globally.',
    );

    const name = String(d.name ?? '').trim();
    if (!name) throw new BadRequestException('An amenity name is required.');
    const slug = amenitySlug(name);
    if (!slug) throw new BadRequestException('An amenity name needs at least one letter or digit.');

    const existing = await this.amenityRepo.findOne({ where: { slug } });
    if (existing) throw new BadRequestException(`Amenity "${existing.name}" already exists`);

    const saved = await this.amenityRepo.save(
      this.amenityRepo.create({
        name,
        slug,
        icon: d.icon ?? null,
        category: d.category ?? null,
        isActive: d.isActive ?? true,
        createdBy: d.actorId ?? null,
      }),
    );

    await this.kafka.publish('hotel.amenity.created', {
      id: saved.id,
      name: saved.name,
      slug: saved.slug,
      actorId: d.actorId ?? null,
    });
    return saved;
  }

  // ── Market settings — the row behind Pricing AND Settings ──────────────────

  /** The configuration row for one market, or null when nothing has been set. */
  private async settingsRow(market: string): Promise<HotelMarketSettings | null> {
    const qb = this.settingsRepo.createQueryBuilder('s');
    applyMarketFilter(qb, 's.countryCode', market);
    return qb.getOne();
  }

  /**
   * What a market's configuration IS, whether or not a row has been written.
   *
   * The values below are the column defaults — the figures actually in force for
   * a market nobody has configured — and `configured: false` says so, so the
   * console can show the effective numbers without presenting them as decisions
   * somebody took.
   */
  private settingsView(market: string, row: HotelMarketSettings | null) {
    return {
      countryCode: market,
      configured: row !== null,
      platformFeePercent: row ? money(row.platformFeePercent) : 0,
      serviceTaxPercent: row ? money(row.serviceTaxPercent) : 0,
      cleaningFee: row ? money(row.cleaningFee) : 0,
      freeCancellationWindowHours: row ? numeric(row.freeCancellationWindowHours) : 24,
      autoApproveHotels: row ? row.autoApproveHotels : false,
      maxRoomsPerHotel: row ? numeric(row.maxRoomsPerHotel) : 500,
      defaultCommissionRate: row ? money(row.defaultCommissionRate) : 15,
      updatedBy: row?.updatedBy ?? null,
      updatedAt: row?.updatedAt ?? null,
    };
  }

  /** Every configuration row the caller may see, for the "all markets" view. */
  private async settingsForScope(market: string | undefined) {
    const qb = this.settingsRepo.createQueryBuilder('s');
    applyMarketFilter(qb, 's.countryCode', market);
    const rows = await qb.orderBy('s.countryCode', 'ASC').getMany();
    return rows.map((r) => this.settingsView(r.countryCode, r));
  }

  /**
   * The market a configuration WRITE applies to.
   *
   * `countryCode` on this payload is the market the gateway already resolved —
   * a locked administrator's own lock, or a global administrator's requested
   * `?countryCode=`. A global administrator who names none is refused rather
   * than defaulting to a NULL row: a settings row with no market is one every
   * scoped administrator can see and none can edit.
   */
  private writeMarket(scope: string | undefined, requested: string | undefined, what: string) {
    const asked = requireMarket(requested, what, this.logger);
    // A WRITE may not be quietly retargeted. `marketPredicate` lets the LOCK win
    // over whatever was requested, which is exactly right for a list — it
    // NARROWS — and exactly wrong here: a QA-locked caller naming `IN` would
    // have their request silently applied to QA's own configuration row. The
    // gateway already refuses that mismatch before the RPC; this is the second
    // line, for a caller that reached this service over TCP by another path.
    if (asked) assertInMarket(asked, scope, what, this.logger);
    const market = marketPredicate(scope, asked, this.logger);
    if (!market) {
      throw new BadRequestException(`countryCode is required: ${what} belongs to one market`);
    }
    return market;
  }

  /** Load-or-create the row, asserting the caller may write to that market. */
  private async settingsToWrite(market: string, scope: string | undefined, what: string) {
    const existing = await this.settingsRow(market);
    if (existing) {
      assertInMarket(existing.countryCode, scope, what, this.logger);
      return existing;
    }
    assertInMarket(market, scope, what, this.logger);
    return this.settingsRepo.create({ countryCode: market });
  }

  // ── Pricing ────────────────────────────────────────────────────────────────

  /**
   * A market's pricing terms, and the seasonal rules its properties run.
   *
   * The seasonal rules are per-HOTEL rows (`hotel_seasonal_pricing`), reached
   * through the same join as everything else here, so the console sees the rules
   * that actually apply in the market it is looking at rather than a
   * platform-wide list under a market's heading.
   */
  async getPricing(q: AdminReportMsg) {
    const market = this.market(q.scope, q.countryCode, 'that pricing');

    const rulesQb = this.pricingRepo
      .createQueryBuilder('rule')
      .innerJoin('rule.hotel', 'hotel')
      .addSelect(['hotel.id', 'hotel.name', 'hotel.countryCode']);
    applyMarketFilter(rulesQb, 'hotel.countryCode', market);
    const seasonalRules = await rulesQb
      .orderBy('rule.priority', 'DESC')
      .addOrderBy('rule.startDate', 'ASC')
      .addOrderBy('rule.id', 'ASC')
      .take(200)
      .getMany();

    return {
      market: market ?? null,
      base: market ? this.settingsView(market, await this.settingsRow(market)) : null,
      markets: await this.settingsForScope(market),
      seasonalRules,
      seasonalRuleCount: seasonalRules.length,
    };
  }

  /** Write the pricing half of a market's configuration row. */
  async updatePricing(d: AdminPricingMsg) {
    const what = 'that pricing';
    const market = this.writeMarket(d.scope, d.countryCode, what);
    const row = await this.settingsToWrite(market, d.scope, what);

    const changed: string[] = [];
    if (d.platformFeePercent !== undefined) {
      row.platformFeePercent = numeric(d.platformFeePercent);
      changed.push('platformFeePercent');
    }
    if (d.serviceTaxPercent !== undefined) {
      row.serviceTaxPercent = numeric(d.serviceTaxPercent);
      changed.push('serviceTaxPercent');
    }
    if (d.cleaningFee !== undefined) {
      row.cleaningFee = numeric(d.cleaningFee);
      changed.push('cleaningFee');
    }
    if (d.freeCancellationWindowHours !== undefined) {
      row.freeCancellationWindowHours = numeric(d.freeCancellationWindowHours);
      changed.push('freeCancellationWindowHours');
    }
    if (!changed.length) {
      throw new BadRequestException('Nothing to update: name at least one pricing field.');
    }

    row.updatedBy = d.actorId ?? null;
    const saved = await this.settingsRepo.save(row);
    await this.publishSettingsChange('pricing', saved, changed, d.actorId);
    return this.settingsView(saved.countryCode, saved);
  }

  // ── Settings ───────────────────────────────────────────────────────────────

  async getSettings(q: AdminReportMsg) {
    const market = this.market(q.scope, q.countryCode, 'those settings');
    return {
      market: market ?? null,
      settings: market ? this.settingsView(market, await this.settingsRow(market)) : null,
      markets: await this.settingsForScope(market),
    };
  }

  /** Write the operational half of the SAME row — see the entity for why one row. */
  async updateSettings(d: AdminSettingsMsg) {
    const what = 'those settings';
    const market = this.writeMarket(d.scope, d.countryCode, what);
    const row = await this.settingsToWrite(market, d.scope, what);

    const changed: string[] = [];
    if (d.autoApproveHotels !== undefined) {
      row.autoApproveHotels = Boolean(d.autoApproveHotels);
      changed.push('autoApproveHotels');
    }
    if (d.maxRoomsPerHotel !== undefined) {
      row.maxRoomsPerHotel = numeric(d.maxRoomsPerHotel);
      changed.push('maxRoomsPerHotel');
    }
    if (d.defaultCommissionRate !== undefined) {
      row.defaultCommissionRate = numeric(d.defaultCommissionRate);
      changed.push('defaultCommissionRate');
    }
    if (!changed.length) {
      throw new BadRequestException('Nothing to update: name at least one setting.');
    }

    row.updatedBy = d.actorId ?? null;
    const saved = await this.settingsRepo.save(row);
    await this.publishSettingsChange('settings', saved, changed, d.actorId);
    return this.settingsView(saved.countryCode, saved);
  }

  /**
   * ONE event for both writes.
   *
   * `hotel.settings.updated` carries which half changed and which fields, rather
   * than a second topic saying the same thing about the same row — a second
   * spelling of one event is how two consumers come to disagree about whether a
   * market has been reconfigured.
   */
  private async publishSettingsChange(
    section: 'pricing' | 'settings',
    row: HotelMarketSettings,
    changed: string[],
    actorId?: string,
  ) {
    await this.kafka.publish('hotel.settings.updated', {
      id: row.id,
      market: row.countryCode,
      section,
      changed,
      actorId: actorId ?? null,
    });
  }

  // ── Reports ────────────────────────────────────────────────────────────────

  /**
   * The market's own figures for a window, and nothing else's.
   *
   * ── A deliberate departure from the brief ───────────────────────────────
   *
   * The brief (written before R9 landed) asks for this command to keep
   * REFUSING a scoped caller, on the grounds that `hotel_reviews` carries only
   * `hotelId` and a half-scoped report is worse than none. That reasoning was
   * correct and has been ADDRESSED: R9 established the one-hop join
   * `hotel_reviews -> hotels.countryCode` and rewrote `getAdminAnalytics` to
   * carry the predicate on every leg — the comment at the top of
   * `admin.controller.ts` records it as "none of these refuses any more".
   * Every figure below is attributable through that same join, so refusing a
   * Qatar administrator their own market's report would withhold data that is
   * demonstrably theirs, and would leave the dashboard and the reports screen
   * disagreeing about whether this module can be scoped at all.
   *
   * What the brief was protecting against is still enforced, and is the part
   * that matters: no counter here is ever the PLATFORM's under a market's
   * heading. Every leg carries `applyMarketFilter`, and `market` is echoed in
   * the response so the console can label whose figures these are.
   */
  async getReports(q: AdminReportMsg) {
    const market = this.market(q.scope, q.countryCode, 'those reports');
    const period = String(q.period ?? '30d');
    const days = PERIOD_DAYS[period];
    if (!days) {
      throw new BadRequestException(
        `period must be one of the following values: ${Object.keys(PERIOD_DAYS).join(', ')}`,
      );
    }
    const since = this.since(days);

    const hotelsQb = this.hotelRepo.createQueryBuilder('hotel');
    applyMarketFilter(hotelsQb, 'hotel.countryCode', market);
    const totalHotels = await hotelsQb.getCount();

    const activeQb = this.hotelRepo
      .createQueryBuilder('hotel')
      .where('hotel.isAcceptingBookings = :accepting', { accepting: true });
    applyMarketFilter(activeQb, 'hotel.countryCode', market);
    const activeHotels = await activeQb.getCount();

    const pendingQb = this.hotelRepo
      .createQueryBuilder('hotel')
      .where('hotel.status IN (:...pending)', { pending: AWAITING_DECISION });
    applyMarketFilter(pendingQb, 'hotel.countryCode', market);
    const pendingApprovals = await pendingQb.getCount();

    const windowQb = this.bookingRepo
      .createQueryBuilder('booking')
      .innerJoin('booking.hotel', 'hotel')
      .where('booking.createdAt >= :since', { since });
    applyMarketFilter(windowQb, 'hotel.countryCode', market);
    const totalBookings = await windowQb.getCount();

    const cancelledQb = this.bookingRepo
      .createQueryBuilder('booking')
      .innerJoin('booking.hotel', 'hotel')
      .where('booking.createdAt >= :since', { since })
      .andWhere('booking.status = :cancelled', { cancelled: 'CANCELLED' });
    applyMarketFilter(cancelledQb, 'hotel.countryCode', market);
    const cancelledBookings = await cancelledQb.getCount();

    const revenueQb = this.bookingRepo
      .createQueryBuilder('booking')
      .innerJoin('booking.hotel', 'hotel')
      .select('COALESCE(SUM(booking.grandTotal), 0)', 'gross')
      .addSelect('COALESCE(AVG(booking.grandTotal), 0)', 'average')
      .where('booking.createdAt >= :since', { since })
      .andWhere('booking.status IN (:...earned)', { earned: EARNED_BOOKING_STATES });
    applyMarketFilter(revenueQb, 'hotel.countryCode', market);
    const revenue = await revenueQb.getRawOne<{ gross: string; average: string }>();

    const roomsQb = this.roomRepo
      .createQueryBuilder('room')
      .innerJoin('room.hotel', 'hotel')
      .select('COUNT(room.id)', 'types')
      .addSelect('COALESCE(SUM(room.totalInventory), 0)', 'inventory')
      .addSelect('COALESCE(SUM(room.availableCount), 0)', 'available');
    applyMarketFilter(roomsQb, 'hotel.countryCode', market);
    const rooms = await roomsQb.getRawOne<{
      types: string;
      inventory: string;
      available: string;
    }>();

    const reviewQb = this.reviewRepo
      .createQueryBuilder('review')
      .innerJoin('review.hotel', 'hotel')
      .select('COUNT(review.id)', 'total')
      .addSelect('COALESCE(AVG(review.rating), 0)', 'average')
      .addSelect('COUNT(review.id) FILTER (WHERE review."isFlagged")', 'flagged')
      .addSelect('COUNT(review.id) FILTER (WHERE NOT review."isVisible")', 'hidden')
      .where('review.createdAt >= :since', { since });
    applyMarketFilter(reviewQb, 'hotel.countryCode', market);
    const reviews = await reviewQb.getRawOne<{
      total: string;
      average: string;
      flagged: string;
      hidden: string;
    }>();

    const topQb = this.bookingRepo
      .createQueryBuilder('booking')
      .innerJoin('booking.hotel', 'hotel')
      .select('hotel.id', 'id')
      .addSelect('hotel.name', 'name')
      .addSelect('COUNT(booking.id)', 'bookings')
      .addSelect('COALESCE(SUM(booking.grandTotal), 0)', 'revenue')
      .where('booking.createdAt >= :since', { since })
      .andWhere('booking.status IN (:...earned)', { earned: EARNED_BOOKING_STATES });
    applyMarketFilter(topQb, 'hotel.countryCode', market);
    const topHotels = await topQb
      .groupBy('hotel.id')
      .addGroupBy('hotel.name')
      .orderBy('COALESCE(SUM(booking.grandTotal), 0)', 'DESC')
      .limit(5)
      .getRawMany<{ id: string; name: string; bookings: string; revenue: string }>();

    return {
      market: market ?? null,
      period,
      since: since.toISOString(),
      hotels: { total: totalHotels, active: activeHotels, pendingApprovals },
      bookings: {
        total: totalBookings,
        cancelled: cancelledBookings,
        cancelRate:
          totalBookings > 0 ? `${((cancelledBookings / totalBookings) * 100).toFixed(1)}%` : '0%',
      },
      revenue: {
        gross: money(revenue?.gross),
        averageBooking: money(revenue?.average),
        // Derived from bookings in the window, not read from a settled payout
        // ledger — this module has none, and presenting a computation as one
        // would be the same lie in a different place.
        source: 'bookings',
        window: period,
      },
      rooms: {
        types: numeric(rooms?.types),
        inventory: numeric(rooms?.inventory),
        available: numeric(rooms?.available),
      },
      reviews: {
        total: numeric(reviews?.total),
        average: reviews?.average == null ? null : Math.round(numeric(reviews.average) * 10) / 10,
        flagged: numeric(reviews?.flagged),
        hidden: numeric(reviews?.hidden),
      },
      topHotels: topHotels.map((h) => ({
        id: h.id,
        name: h.name,
        bookings: numeric(h.bookings),
        revenue: money(h.revenue),
      })),
    };
  }

  // ── Reviews ────────────────────────────────────────────────────────────────

  async listReviews(q: AdminListMsg & { region?: string }) {
    const market = this.market(q.scope, q.region ?? q.countryCode, 'those reviews');
    const { page, limit, skip } = this.page(q);

    const filter = String(q.status ?? 'ALL').toUpperCase() as ReviewFilter;
    if (!REVIEW_FILTERS.includes(filter)) {
      throw new BadRequestException(
        `status must be one of the following values: ${REVIEW_FILTERS.join(', ')}`,
      );
    }

    const qb = this.reviewRepo.createQueryBuilder('review').innerJoin('review.hotel', 'hotel');
    this.selectHotel(qb);
    applyMarketFilter(qb, 'hotel.countryCode', market);
    if (filter === 'FLAGGED') qb.andWhere('review.isFlagged = :yes', { yes: true });
    if (filter === 'VISIBLE') qb.andWhere('review.isVisible = :yes', { yes: true });
    if (filter === 'HIDDEN') qb.andWhere('review.isVisible = :no', { no: false });

    const [data, total] = await qb
      .orderBy('review.createdAt', 'DESC')
      .addOrderBy('review.id', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit, market: market ?? null, status: filter };
  }

  /**
   * Approve or remove one review, in the caller's market only.
   *
   * The property's own aggregates are recomputed afterwards over the reviews
   * that are still VISIBLE. Without that, hiding an abusive review would leave
   * its stars in `hotels.rating` and its count in `hotels.reviewCount` — the
   * review would disappear from the page while still dragging the property's
   * score down, which is a moderation decision that did half of what it said.
   */
  async moderateReview(d: AdminModerateReviewMsg) {
    const action = String(d.action ?? '').toLowerCase() as ReviewAction;
    if (!REVIEW_ACTIONS.includes(action)) {
      throw new BadRequestException(
        `action must be one of the following values: ${REVIEW_ACTIONS.join(', ')}`,
      );
    }

    const review = await this.reviewRepo.findOne({
      where: { id: requireUuid(d.id, 'hotel review') },
      relations: { hotel: true },
    });
    if (!review) throw new NotFoundException('No hotel review with that id');

    if (!review.hotel) refuseUnattributable(d.scope, 'hotel review', this.logger);
    else assertInMarket(review.hotel.countryCode, d.scope, 'hotel review', this.logger);

    if (action === 'approve') {
      review.isFlagged = false;
      review.isVisible = true;
    } else {
      review.isFlagged = true;
      review.isVisible = false;
    }
    review.moderationReason = d.reason ?? null;
    review.moderatedBy = d.actorId ?? null;
    review.moderatedAt = new Date();
    await this.reviewRepo.save(review);

    // `HotelService.recomputeHotelRating` — the SAME sum `submitReview` has
    // always taken, not a second copy of it. Hiding a review has to take its
    // stars out of the property's average and its row out of the count, and two
    // implementations of that is how two code paths come to disagree about what
    // a hotel is rated.
    const aggregate = await this.svc.recomputeHotelRating(review.hotelId);

    await this.kafka.publish('hotel.review.moderated', {
      id: review.id,
      hotelId: review.hotelId,
      market: review.hotel?.countryCode ?? null,
      action,
      actorId: d.actorId ?? null,
    });

    return {
      success: true,
      id: review.id,
      hotelId: review.hotelId,
      action,
      isVisible: review.isVisible,
      isFlagged: review.isFlagged,
      moderatedBy: review.moderatedBy,
      hotel: { id: review.hotelId, ...aggregate },
    };
  }
}
