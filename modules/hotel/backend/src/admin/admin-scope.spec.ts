import { describe, it, expect, vi } from 'vitest';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  HotelAdminService,
  SETTINGS_ENFORCEMENT,
  SETTINGS_ENFORCEMENT_NOTE,
} from './admin.service';

/**
 * The twelve commands M5 added, and the market boundary each of them keeps.
 *
 * Rooms, bookings, reviews and seasonal pricing rules carry `hotel_id` and
 * nothing else, so every list here has to JOIN the property and filter on
 * `hotel.countryCode`, and every decision has to assert against the property's
 * own row. These tests pin both halves: the clause a list actually builds, and
 * the refusal a decision actually throws — before anything is written or
 * published, because a Kafka event is as visible as a database row.
 *
 * The clause asserted is `hotel.countryCode = :__market`, not `= :market`.
 * `applyMarketFilter` binds ONE parameter name platform-wide, deliberately
 * unlikely to collide with a caller's own binding; asserting any other spelling
 * would mean hand-writing the clause, which `scope-helper-uniqueness.spec` in
 * `apps/api` forbids.
 */

/** A query builder that records every clause it is given and answers nothing. */
function builder(rows: unknown[] = [], raw: Record<string, unknown> = {}, total?: number) {
  const clauses: string[] = [];
  const params: Record<string, unknown> = {};
  const qb: any = {
    clauses,
    params,
    joins: [] as string[],
    innerJoin: (r: string) => (qb.joins.push('inner:' + r), qb),
    leftJoin: (r: string) => (qb.joins.push('left:' + r), qb),
    addSelect: () => qb,
    select: () => qb,
    where: (w: string, p?: object) => (clauses.push(w), Object.assign(params, p ?? {}), qb),
    andWhere: (w: string, p?: object) => (clauses.push(w), Object.assign(params, p ?? {}), qb),
    orderBy: () => qb,
    addOrderBy: () => qb,
    groupBy: () => qb,
    addGroupBy: () => qb,
    skip: (n: number) => ((qb.skipped = n), qb),
    take: (n: number) => ((qb.taken = n), qb),
    limit: () => qb,
    getMany: async () => rows,
    getManyAndCount: async () => [rows, total ?? rows.length],
    getOne: async () => rows[0] ?? null,
    getCount: async () => rows.length,
    getRawOne: async () => raw,
    getRawMany: async () => [],
  };
  return qb;
}

interface Harness {
  hotel?: { id: string; name?: string; countryCode: string } | null;
  booking?: Record<string, unknown> | null;
  review?: Record<string, unknown> | null;
  settings?: Record<string, unknown> | null;
  seasonalRules?: unknown[];
  seasonalRuleTotal?: number;
}

function admin(h: Harness = {}) {
  const builders: Record<string, any[]> = {};
  const make = (
    key: string,
    rows: unknown[] = [],
    raw: Record<string, unknown> = {},
    total?: number,
  ) => {
    const qb = builder(rows, raw, total);
    (builders[key] ??= []).push(qb);
    return qb;
  };

  const hotelRepo = {
    findOne: vi.fn(async () => h.hotel ?? null),
    update: vi.fn(async () => ({ affected: 1 })),
    query: vi.fn(async () => []),
    createQueryBuilder: () => make('hotel'),
  };
  const roomRepo = { createQueryBuilder: () => make('room') };
  const bookingRepo = {
    findOne: vi.fn(async () => h.booking ?? null),
    createQueryBuilder: () => make('booking'),
  };
  const reviewRepo = {
    findOne: vi.fn(async () => h.review ?? null),
    save: vi.fn(async (r: any) => r),
    createQueryBuilder: () => make('review'),
  };
  const pricingRepo = {
    createQueryBuilder: () => make('pricing', h.seasonalRules ?? [], {}, h.seasonalRuleTotal),
  };
  const amenityRepo = {
    find: vi.fn(async () => []),
    findOne: vi.fn(async () => null),
    create: vi.fn((x: any) => x),
    save: vi.fn(async (x: any) => ({ id: 'amenity-1', ...x })),
  };
  const settingsRepo = {
    create: vi.fn((x: any) => ({ ...x })),
    merge: vi.fn((into: any, from: any) => Object.assign(into, from)),
    save: vi.fn(async (x: any) => ({ id: 'settings-1', ...x })),
    createQueryBuilder: () => make('settings', h.settings ? [h.settings] : []),
  };
  const kafka = { publish: vi.fn(async () => undefined) };
  // `HotelService.recomputeHotelRating` is the ONE implementation of the
  // property aggregate — `submitReview` takes the same sum — so moderation
  // calls it rather than keeping a second copy. The spy proves the call.
  // `HotelService` owns BOTH of these: the property aggregate (one sum,
  // shared with `submitReview`) and the market configuration read (one row,
  // shared with the registration path that now acts on it). The admin service
  // keeps a copy of neither.
  const svc = {
    recomputeHotelRating: vi.fn(async () => ({ rating: 4.5, reviewCount: 3 })),
    marketSettings: vi.fn(async (market: string) => {
      const qb = make('settings', h.settings ? [h.settings] : []);
      qb.andWhere('s.countryCode = :__market', { __market: market });
      return h.settings ?? null;
    }),
  };

  const admin = Object.create(HotelAdminService.prototype) as HotelAdminService;
  Object.assign(admin, {
    hotelRepo,
    roomRepo,
    bookingRepo,
    reviewRepo,
    pricingRepo,
    amenityRepo,
    settingsRepo,
    svc,
    kafka,
    logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
  });

  return {
    svc: admin,
    hotelService: svc,
    builders,
    hotelRepo,
    bookingRepo,
    reviewRepo,
    settingsRepo,
    amenityRepo,
    kafka,
    clausesOf: (key: string, i = 0) => (builders[key]?.[i]?.clauses ?? []) as string[],
    paramsOf: (key: string, i = 0) => (builders[key]?.[i]?.params ?? {}) as Record<string, unknown>,
  };
}

const MARKET_CLAUSE = 'hotel.countryCode = :__market';
const IN_UUID = '11111111-1111-4111-8111-111111111111';
const QA_UUID = '22222222-2222-4222-8222-222222222222';

// ── Lists reach their market through the property ────────────────────────────

describe('the hotel admin lists join the property and filter its market', () => {
  it('narrows rooms to the caller market', async () => {
    const h = admin();
    await h.svc.listRooms({ scope: 'QA' });
    expect(h.clausesOf('room')).toContain(MARKET_CLAUSE);
    expect(h.paramsOf('room').__market).toBe('QA');
  });

  it('narrows bookings to the caller market', async () => {
    const h = admin();
    await h.svc.listBookings({ scope: 'QA' });
    expect(h.clausesOf('booking')).toContain(MARKET_CLAUSE);
    expect(h.paramsOf('booking').__market).toBe('QA');
  });

  it('narrows reviews to the caller market', async () => {
    const h = admin();
    await h.svc.listReviews({ scope: 'IN' });
    expect(h.clausesOf('review')).toContain(MARKET_CLAUSE);
    expect(h.paramsOf('review').__market).toBe('IN');
  });

  it('adds no predicate at all for a global admin', async () => {
    const h = admin();
    await h.svc.listBookings({});
    expect(h.clausesOf('booking')).not.toContain(MARKET_CLAUSE);
  });

  it("takes a global admin's requested market", async () => {
    const h = admin();
    await h.svc.listBookings({ countryCode: 'IN' });
    expect(h.paramsOf('booking').__market).toBe('IN');
  });

  it('normalises a sub-region to its country', async () => {
    const h = admin();
    await h.svc.listRooms({ scope: 'IN-MH' });
    expect(h.paramsOf('room').__market).toBe('IN');
  });

  it('refuses an unreadable requested market rather than listing every market', async () => {
    const h = admin();
    await expect(h.svc.listRooms({ countryCode: 'NOT-A-COUNTRY' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('refuses an over-large page rather than quietly shortening it', async () => {
    // The gateway DTO caps `limit` at 100 with a 400 whose docstring says
    // capping is the ruling BECAUSE clamping hides rows. The service used to
    // clamp, so the two halves of one module stated opposite policies for a
    // direct TCP caller (M5 review, Minor 12).
    const h = admin();
    await expect(h.svc.listBookings({ scope: 'QA', limit: 5000 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('still coerces the lower bound — there is no page before the first', async () => {
    const h = admin();
    await h.svc.listBookings({ scope: 'QA', page: 0, limit: 20 });
    expect(h.builders.booking[0].taken).toBe(20);
    expect(h.builders.booking[0].skipped).toBe(0);
  });

  it('reaches a booking through a LEFT join so an orphan is findable globally', async () => {
    // `hotel_bookings.hotel` is `onDelete: SET NULL`, and `getBookingDetail`
    // deliberately serves an orphan to a GLOBAL caller — an inner join meant the
    // only list that could have given that caller the id excluded it (Minor 2).
    const h = admin();
    await h.svc.listBookings({});
    expect(h.builders.booking[0].joins).toContain('left:booking.hotel');
  });

  it("refuses a rooms list narrowed to another market's hotel", async () => {
    const h = admin({ hotel: { id: IN_UUID, countryCode: 'IN' } });
    await expect(h.svc.listRooms({ scope: 'QA', hotelId: IN_UUID })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('refuses an unknown hotelId with a 404, not a market denial', async () => {
    const h = admin({ hotel: null });
    await expect(h.svc.listRooms({ scope: 'QA', hotelId: IN_UUID })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

// ── The booking detail asserts the property's own market ─────────────────────

describe('the booking detail is refused across markets', () => {
  it('refuses a QA-scoped read of a booking at an IN hotel', async () => {
    const h = admin({ booking: { id: QA_UUID, hotel: { id: IN_UUID, countryCode: 'IN' } } });
    await expect(h.svc.getBookingDetail(QA_UUID, 'QA')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns the booking when the property is the caller market', async () => {
    const h = admin({ booking: { id: QA_UUID, hotel: { id: QA_UUID, countryCode: 'QA' } } });
    await expect(h.svc.getBookingDetail(QA_UUID, 'QA')).resolves.toMatchObject({ id: QA_UUID });
  });

  it('answers 404 for an unknown booking rather than a market denial', async () => {
    const h = admin({ booking: null });
    await expect(h.svc.getBookingDetail(QA_UUID, 'QA')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('answers 400 for a malformed id before it reaches a uuid column', async () => {
    const h = admin();
    await expect(h.svc.getBookingDetail('not-a-uuid', 'QA')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('refuses a booking whose property is gone for a scoped caller, and serves a global one', async () => {
    const orphan = { id: QA_UUID, hotel: null };
    await expect(
      admin({ booking: orphan }).svc.getBookingDetail(QA_UUID, 'QA'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      admin({ booking: orphan }).svc.getBookingDetail(QA_UUID, undefined),
    ).resolves.toMatchObject({ id: QA_UUID });
  });
});

// ── Moderation is a decision, so it asserts before it writes ─────────────────

describe('review moderation refuses another market and writes nothing', () => {
  const foreign = () => ({
    id: QA_UUID,
    hotelId: IN_UUID,
    hotel: { id: IN_UUID, countryCode: 'IN' },
    isFlagged: true,
    isVisible: true,
  });

  it("refuses a QA admin moderating an IN hotel's review", async () => {
    const h = admin({ review: foreign() });
    await expect(
      h.svc.moderateReview({ id: QA_UUID, action: 'remove', scope: 'QA', actorId: 'a1' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(h.reviewRepo.save).not.toHaveBeenCalled();
    expect(h.kafka.publish).not.toHaveBeenCalled();
  });

  it('records the actor, the reason and the outcome on a review it may moderate', async () => {
    const h = admin({
      review: {
        id: QA_UUID,
        hotelId: QA_UUID,
        hotel: { id: QA_UUID, countryCode: 'QA' },
        isFlagged: true,
        isVisible: true,
      },
    });
    const out = await h.svc.moderateReview({
      id: QA_UUID,
      action: 'remove',
      reason: 'abusive',
      scope: 'QA',
      actorId: 'qa-admin',
    });
    expect(h.reviewRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        isVisible: false,
        isFlagged: true,
        moderatedBy: 'qa-admin',
        moderationReason: 'abusive',
      }),
    );
    expect(out).toMatchObject({ success: true, action: 'remove', isVisible: false });
    expect(h.kafka.publish).toHaveBeenCalledWith(
      'hotel.review.moderated',
      expect.objectContaining({ market: 'QA', actorId: 'qa-admin' }),
    );
  });

  it("recomputes the property aggregate through the module's one implementation", async () => {
    const h = admin({
      review: {
        id: QA_UUID,
        hotelId: QA_UUID,
        hotel: { id: QA_UUID, countryCode: 'QA' },
        isFlagged: true,
        isVisible: true,
      },
    });
    const out = await h.svc.moderateReview({
      id: QA_UUID,
      action: 'remove',
      scope: 'QA',
      actorId: 'a',
    });
    expect(h.hotelService.recomputeHotelRating).toHaveBeenCalledWith(QA_UUID);
    expect(out.hotel).toMatchObject({ id: QA_UUID, rating: 4.5, reviewCount: 3 });
  });

  it('refuses an action it does not recognise instead of guessing', async () => {
    const h = admin();
    await expect(
      h.svc.moderateReview({ id: QA_UUID, action: 'delete', scope: 'QA' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(h.reviewRepo.findOne).not.toHaveBeenCalled();
  });
});

// ── The global amenity catalogue ─────────────────────────────────────────────

describe('the amenity catalogue is global, and only a global admin writes it', () => {
  it('refuses a region-locked admin the write, publishing nothing', async () => {
    const h = admin();
    await expect(h.svc.createAmenity({ name: 'Spa', scope: 'QA' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(h.amenityRepo.save).not.toHaveBeenCalled();
    expect(h.kafka.publish).not.toHaveBeenCalled();
  });

  it('says in the payload that its counts are platform-wide', async () => {
    // The catalogue being global is correct; a per-amenity count that is every
    // market's, on a screen a QA administrator reads as theirs, is the failure
    // `getReports` exists to avoid (M5 review, Minor 4).
    const h = admin();
    const out = await h.svc.listAmenities();
    expect(out.countScope).toBe('platform');
  });

  it('records the creating administrator', async () => {
    const h = admin();
    await h.svc.createAmenity({ name: 'Airport shuttle', actorId: 'su-1' });
    expect(h.amenityRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'airport-shuttle', createdBy: 'su-1' }),
    );
  });

  it('refuses a duplicate rather than catalogueing the same amenity twice', async () => {
    const h = admin();
    h.amenityRepo.findOne.mockResolvedValueOnce({ id: 'x', name: 'Spa', slug: 'spa' } as never);
    await expect(h.svc.createAmenity({ name: 'spa' })).rejects.toBeInstanceOf(BadRequestException);
  });
});

// ── Market settings: one row, two commands, never a NULL market ──────────────

describe('a market configuration write names a market or is refused', () => {
  it('refuses a global admin who names no market rather than writing a NULL row', async () => {
    const h = admin();
    await expect(h.svc.updatePricing({ platformFeePercent: 8.5 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(h.settingsRepo.save).not.toHaveBeenCalled();
  });

  it("refuses a locked admin writing another market's settings", async () => {
    const h = admin();
    await expect(
      h.svc.updateSettings({ countryCode: 'IN', autoApproveHotels: true, scope: 'QA' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(h.settingsRepo.save).not.toHaveBeenCalled();
  });

  it('writes the caller market, the actor and only the fields that were sent', async () => {
    const h = admin();
    const out = await h.svc.updatePricing({
      countryCode: 'QA',
      cleaningFee: 75,
      scope: 'QA',
      actorId: 'qa-admin',
    });
    expect(h.settingsRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ countryCode: 'QA', cleaningFee: 75, updatedBy: 'qa-admin' }),
    );
    expect(out).toMatchObject({ countryCode: 'QA', configured: true });
    expect(h.kafka.publish).toHaveBeenCalledWith(
      'hotel.settings.updated',
      expect.objectContaining({ section: 'pricing', changed: ['cleaningFee'] }),
    );
  });

  it('refuses an empty write instead of reporting a save that changed nothing', async () => {
    const h = admin();
    await expect(h.svc.updateSettings({ countryCode: 'QA', scope: 'QA' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('publishes ONE event for both halves of the same row', async () => {
    const h = admin();
    await h.svc.updateSettings({ countryCode: 'QA', maxRoomsPerHotel: 300, scope: 'QA' });
    expect(h.kafka.publish).toHaveBeenCalledWith(
      'hotel.settings.updated',
      expect.objectContaining({ section: 'settings', changed: ['maxRoomsPerHotel'] }),
    );
  });

  it('narrows a settings READ to the caller market', async () => {
    const h = admin();
    await h.svc.getSettings({ scope: 'QA' });
    expect(h.clausesOf('settings')).toContain('s.countryCode = :__market');
  });

  it('reports an unconfigured market as unconfigured rather than inventing a decision', async () => {
    const h = admin();
    const out = await h.svc.getSettings({ scope: 'QA' });
    expect(out.settings).toMatchObject({ countryCode: 'QA', configured: false });
  });
});

// ── Pricing reads join the property for the seasonal rules ───────────────────

describe('the pricing read narrows both halves to the market', () => {
  it('filters the seasonal rules through their property', async () => {
    const h = admin();
    await h.svc.getPricing({ scope: 'IN' });
    expect(h.clausesOf('pricing')).toContain(MARKET_CLAUSE);
    expect(h.paramsOf('pricing').__market).toBe('IN');
  });

  it('counts every seasonal rule in the market, not the length of the page', async () => {
    // `.take(200)` then `seasonalRules.length` told a market with 500 rules it
    // had 200, with nothing in the payload saying the list had been cut
    // (M5 review, Minor 1).
    const h = admin({ seasonalRules: [{ id: 'rule-1' }], seasonalRuleTotal: 500 });
    const out = await h.svc.getPricing({ scope: 'IN' });
    expect(out.seasonalRuleCount).toBe(500);
    expect(out.seasonalRules).toHaveLength(1);
    expect(out.seasonalRulesTruncated).toBe(true);
    expect(out.seasonalRuleLimit).toBe(200);
  });

  it('filters the market settings on their own column', async () => {
    const h = admin();
    await h.svc.getPricing({ scope: 'IN' });
    expect(h.clausesOf('settings')).toContain('s.countryCode = :__market');
  });
});

// ── Reports: attributable, therefore answered — see the method's docstring ───

describe('the hotel report answers a scoped admin with their own market', () => {
  /**
   * The M5 brief asked for this command to keep REFUSING a scoped caller, on
   * the grounds that reviews could not be narrowed without a join. R9 built
   * that join and rewrote `getAdminAnalytics` around it, so the premise is
   * spent: every leg below carries the predicate, and withholding a market's
   * own figures from its own administrator would be the opposite failure.
   * These tests pin what the brief was actually protecting — that no counter is
   * ever the PLATFORM's under a market's heading.
   */
  it('does not refuse a region-locked administrator', async () => {
    const h = admin();
    await expect(h.svc.getReports({ scope: 'QA' })).resolves.toMatchObject({ market: 'QA' });
  });

  it('carries the market predicate on hotels, bookings, rooms and reviews alike', async () => {
    const h = admin();
    await h.svc.getReports({ scope: 'QA' });
    for (const key of ['hotel', 'booking', 'room', 'review']) {
      const built = h.builders[key] ?? [];
      expect(built.length, `${key} queries were built`).toBeGreaterThan(0);
      for (const qb of built) {
        expect(qb.clauses, `${key} carries the market predicate`).toContain(MARKET_CLAUSE);
      }
    }
  });

  it('adds no predicate at all for a global admin', async () => {
    const h = admin();
    await h.svc.getReports({});
    for (const qb of h.builders.booking ?? []) {
      expect(qb.clauses).not.toContain(MARKET_CLAUSE);
    }
  });

  it('refuses a period it does not offer instead of silently using 30 days', async () => {
    const h = admin();
    await expect(h.svc.getReports({ scope: 'QA', period: '3y' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

// ── What the settings actually DO (M5 review, Important 1) ───────────────────

describe('the settings payload says which keys are enforced', () => {
  /**
   * The map is the contract, and it is pinned key by key ON PURPOSE.
   *
   * `hotel_market_settings` was stored, scoped and reported back as
   * `configured: true` while nothing on the platform read one of its keys, and
   * every field name is an EFFECT name. Two act now — both in
   * `HotelService.createHotel` — and five do not. Asserting the exact map means
   * wiring a consumer, or removing one, has to flip an entry here deliberately;
   * a screen cannot start claiming an effect the platform does not have, and a
   * key that gains one cannot stay silently marked `false`.
   */
  it('enforces exactly autoApproveHotels and defaultCommissionRate, and nothing else', () => {
    expect(SETTINGS_ENFORCEMENT).toEqual({
      autoApproveHotels: true,
      defaultCommissionRate: true,
      platformFeePercent: false,
      serviceTaxPercent: false,
      cleaningFee: false,
      freeCancellationWindowHours: false,
      maxRoomsPerHotel: false,
    });
  });

  it('covers every key the settings payload carries — no key is unaccounted for', async () => {
    const h = admin();
    const out = await h.svc.getSettings({ scope: 'QA' });
    const declared = Object.keys(SETTINGS_ENFORCEMENT);
    const bookkeeping = [
      'countryCode',
      'configured',
      'updatedBy',
      'updatedAt',
      'enforcement',
      'enforcementNote',
    ];
    const carried = Object.keys(out.settings ?? {}).filter((k) => !bookkeeping.includes(k));
    expect(carried.sort()).toEqual(declared.sort());
  });

  it('rides on the settings READ', async () => {
    const h = admin();
    const out = await h.svc.getSettings({ scope: 'QA' });
    expect(out.settings?.enforcement).toEqual(SETTINGS_ENFORCEMENT);
    expect(out.settings?.enforcementNote).toBe(SETTINGS_ENFORCEMENT_NOTE);
  });

  it('rides on the pricing READ', async () => {
    const h = admin();
    const out = await h.svc.getPricing({ scope: 'QA' });
    expect(out.base?.enforcement).toEqual(SETTINGS_ENFORCEMENT);
  });

  it('rides on both WRITE responses', async () => {
    const pricing = await admin().svc.updatePricing({
      countryCode: 'QA',
      cleaningFee: 1,
      scope: 'QA',
    });
    const settings = await admin().svc.updateSettings({
      countryCode: 'QA',
      maxRoomsPerHotel: 10,
      scope: 'QA',
    });
    expect(pricing.enforcement).toEqual(SETTINGS_ENFORCEMENT);
    expect(settings.enforcement).toEqual(SETTINGS_ENFORCEMENT);
    expect(settings.enforcementNote).toBe(SETTINGS_ENFORCEMENT_NOTE);
  });

  it('names the unenforced keys in a sentence a console can show', () => {
    expect(SETTINGS_ENFORCEMENT_NOTE).toMatch(/not enforced/i);
  });
});
