import { describe, it, expect, vi } from 'vitest';
import { HotelService } from './hotel.service';
import { HotelAdminController } from './admin/admin.controller';

/**
 * Hotel platform statistics, per market.
 *
 * `admin_hotel_stats` and `admin_revenue` refused every scoped caller, because
 * `hotel_reviews` carries only `hotelId` and a half-scoped report is worse than
 * none: it reads as the market's own figures while the review total is every
 * market's (audit F-30). The three legs are all attributable — `hotels`
 * carries `countryCode`, `hotel_bookings` carries the `hotelCountryCode`
 * snapshot written at booking time, and a review reaches a market through its
 * hotel in one hop — so these tests assert the predicate reaches each QUERY,
 * not that the returned number looks plausible.
 */
function service() {
  const seen = {
    hotels: [] as any[],
    bookings: [] as string[],
    reviews: [] as string[],
    reviewJoins: [] as any[][],
  };
  const countingRepo = (bucket: 'bookings' | 'reviews', joins?: any[][]) => ({
    count: vi.fn(async () => 0),
    createQueryBuilder: vi.fn(() => {
      const qb: any = {
        select: () => qb,
        addSelect: () => qb,
        leftJoin: (...args: any[]) => (joins?.push(args), qb),
        innerJoin: (...args: any[]) => (joins?.push(args), qb),
        where: (w: string) => (seen[bucket].push(w), qb),
        andWhere: (w: string) => (seen[bucket].push(w), qb),
        groupBy: () => qb,
        having: () => qb,
        getCount: async () => 0,
        getRawOne: async () => ({ total: 0, average: null }),
        getRawMany: async () => [],
      };
      return qb;
    }),
  });
  const hotelRepo = {
    count: vi.fn(async (opts: any) => {
      seen.hotels.push(opts?.where ?? null);
      return 0;
    }),
    find: vi.fn(async () => []),
    findOne: vi.fn(async () => null),
  };
  const svc = Object.create(HotelService.prototype) as HotelService;
  Object.assign(svc, {
    hotelRepo,
    bookingRepo: countingRepo('bookings'),
    reviewRepo: countingRepo('reviews', seen.reviewJoins),
    redis: { getJson: vi.fn(async () => null), setJson: vi.fn(async () => undefined) },
    kafka: { publish: vi.fn(async () => undefined) },
    logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
  });
  return { svc, seen };
}

const has = (rows: any[], needle: string) => JSON.stringify(rows).includes(needle);

describe('hotel statistics answer per market instead of refusing', () => {
  it('narrows hotels, bookings and reviews to the market', async () => {
    const { svc, seen } = service();
    const res = await svc.getAdminAnalytics('QA');

    expect(has(seen.hotels, 'QA')).toBe(true);
    expect(has(seen.bookings, 'hotelCountryCode')).toBe(true);
    expect(has(seen.reviews, 'countryCode')).toBe(true);
    expect(res).toMatchObject({ market: 'QA' });
  });

  /**
   * Through the join, not through a post-filter over loaded rows: a review has
   * no market of its own, and counting every review and then discarding the
   * foreign ones in JavaScript is the shape that answers "5 reviews" from the
   * first page of a thousand.
   */
  it('reaches a review market through its hotel', async () => {
    const { svc, seen } = service();
    await svc.getAdminAnalytics('QA');
    expect(seen.reviewJoins.length).toBeGreaterThan(0);
    expect(JSON.stringify(seen.reviewJoins)).toContain('h');
  });

  it('adds no predicate at all for a global admin', async () => {
    const { svc, seen } = service();
    const res = await svc.getAdminAnalytics();
    expect(has(seen.hotels, 'countryCode')).toBe(false);
    expect(has(seen.bookings, 'hotelCountryCode')).toBe(false);
    expect(has(seen.reviews, 'countryCode')).toBe(false);
    expect(res.market).toBeNull();
  });

  it('normalises a sub-region to its country', async () => {
    const { svc, seen } = service();
    await svc.getAdminAnalytics('qa-doh');
    expect(has(seen.hotels, 'QA')).toBe(true);
    expect(has(seen.hotels, 'DOH')).toBe(false);
  });

  it('narrows the active count with the market, not only the flag', async () => {
    const { svc, seen } = service();
    await svc.getAdminAnalytics('QA');
    const active = seen.hotels.find((w) => w && w.isAcceptingBookings === true);
    expect(active).toMatchObject({ countryCode: 'QA', isAcceptingBookings: true });
  });
});

describe('the hotel admin handlers forward the market instead of refusing it', () => {
  function controller() {
    const svc = { getAdminAnalytics: vi.fn(async () => ({ totalHotels: 1 })) };
    const ctrl = Object.create(HotelAdminController.prototype) as HotelAdminController;
    Object.assign(ctrl, { svc, logger: { log: vi.fn(), warn: vi.fn() } });
    return { ctrl, svc };
  }

  it('answers admin_hotel_stats for a scoped admin, with their market', async () => {
    const { ctrl, svc } = controller();
    await expect(ctrl.msgStats({ scope: 'QA' } as any)).resolves.toMatchObject({ totalHotels: 1 });
    expect(svc.getAdminAnalytics).toHaveBeenCalledWith('QA');
  });

  it('answers admin_revenue for a scoped admin, with their market', async () => {
    const { ctrl, svc } = controller();
    await expect(ctrl.msgRevenue({ scope: 'QA' } as any)).resolves.toBeDefined();
    expect(svc.getAdminAnalytics).toHaveBeenCalledWith('QA');
  });

  it("takes a global admin's ?countryCode= when there is no lock", async () => {
    const { ctrl, svc } = controller();
    await ctrl.msgStats({ countryCode: 'IN' } as any);
    expect(svc.getAdminAnalytics).toHaveBeenCalledWith('IN');
  });

  it('sends no market at all for an unfiltered global admin', async () => {
    const { ctrl, svc } = controller();
    await ctrl.msgStats({} as any);
    expect(svc.getAdminAnalytics).toHaveBeenCalledWith(undefined);
  });
});
