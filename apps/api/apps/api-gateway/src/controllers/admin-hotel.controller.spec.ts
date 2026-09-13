import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AdminHotelController } from './admin-hotel.controller';

/**
 * The market boundary and the command contract, at the gateway.
 *
 * Two separate things are pinned here and both were broken before M5:
 *
 *  1. A region-locked administrator is confined to their own market, and the
 *     refusal happens BEFORE hotel-service is addressed — `client.send` not
 *     having been called is the assertion, because a denial that still made the
 *     RPC would be a denial the service had to be trusted to repeat.
 *  2. Every route sends the command hotel-service actually implements. The
 *     spellings below are the contract: if one drifts back to the dotted
 *     convention, `test/gateway-service-contract.spec.ts` fails on the orphan
 *     AND these fail on the name.
 */

const qaAdmin = { id: 'u-qa', role: 'ADMIN', regionCode: 'QA', regionLocked: true };
const globalAdmin = { id: 'u-g', role: 'SUPER_ADMIN' };
const req = (user: object) => ({ user, method: 'GET', originalUrl: '/x', headers: {} });
const build = (send = vi.fn(() => of({ data: [], total: 0 }))) => {
  const client = { send };
  return { ctrl: new AdminHotelController(client as any), client };
};

const HOTEL = '11111111-1111-4111-8111-111111111111';

describe('AdminHotelController market scope', () => {
  it("confines a locked admin's hotel list to their own market", async () => {
    const { ctrl, client } = build();
    await ctrl.getHotels(req(qaAdmin), { page: 1, limit: 20 });
    expect(client.send).toHaveBeenCalledWith(
      { cmd: 'admin_list_hotels' },
      expect.objectContaining({ countryCode: 'QA', scope: 'QA' }),
    );
  });

  it('refuses another market before hotel-service is ever addressed', async () => {
    const { ctrl, client } = build();
    await expect(
      ctrl.getHotels(req(qaAdmin), { page: 1, limit: 20, countryCode: 'IN' }),
    ).rejects.toThrow(ForbiddenException);
    expect(client.send).not.toHaveBeenCalled();
  });

  it("forwards a global admin's filter, normalised, and sends no scope", async () => {
    const { ctrl, client } = build();
    await ctrl.getHotels(req(globalAdmin), { page: 1, limit: 20, countryCode: 'in' });
    expect(client.send.mock.calls[0][1]).toMatchObject({ countryCode: 'IN' });
    expect(client.send.mock.calls[0][1].scope).toBeUndefined();
  });

  it('records the market and the acting admin on a suspension', async () => {
    const { ctrl, client } = build();
    await ctrl.suspendHotel(req(qaAdmin), HOTEL, { reason: 'licence lapsed' });
    expect(client.send).toHaveBeenCalledWith(
      { cmd: 'admin_suspend_hotel' },
      expect.objectContaining({
        hotelId: HOTEL,
        reason: 'licence lapsed',
        scope: 'QA',
        actorId: 'u-qa',
      }),
    );
  });

  it('records the acting admin on an approval', async () => {
    const { ctrl, client } = build();
    await ctrl.approveHotel(req(qaAdmin), HOTEL);
    expect(client.send).toHaveBeenCalledWith(
      { cmd: 'admin_approve_hotel' },
      expect.objectContaining({ hotelId: HOTEL, scope: 'QA', actorId: 'u-qa' }),
    );
  });

  it('refuses a locked admin the globally managed amenity taxonomy', async () => {
    const { ctrl, client } = build();
    await expect(ctrl.createAmenity(req(qaAdmin), { name: 'Rooftop pool' })).rejects.toThrow(
      ForbiddenException,
    );
    expect(client.send).not.toHaveBeenCalled();
  });

  it('still lets a locked admin read that taxonomy, unfiltered', async () => {
    const { ctrl, client } = build();
    await ctrl.getAmenities(req(qaAdmin));
    expect(client.send).toHaveBeenCalledWith({ cmd: 'admin_hotel_amenities' }, {});
  });

  it("never lets a body's countryCode reach a locked admin's settings write", async () => {
    const { ctrl, client } = build();
    await expect(
      ctrl.updateSettings(req(qaAdmin), { countryCode: 'IN', autoApproveHotels: true }),
    ).rejects.toThrow(ForbiddenException);
    expect(client.send).not.toHaveBeenCalled();
  });

  it("stamps a locked admin's own market on a pricing write", async () => {
    const { ctrl, client } = build();
    await ctrl.updatePricing(req(qaAdmin), { cleaningFee: 75 });
    expect(client.send).toHaveBeenCalledWith(
      { cmd: 'admin_hotel_update_pricing' },
      expect.objectContaining({ countryCode: 'QA', scope: 'QA', actorId: 'u-qa' }),
    );
  });

  it('sends the market on every list and read a market can narrow', async () => {
    const { ctrl, client } = build();
    await ctrl.getRooms(req(qaAdmin), { page: 1, limit: 20 });
    await ctrl.getBookings(req(qaAdmin), { page: 1, limit: 20 });
    await ctrl.getReviews(req(qaAdmin), { page: 1, limit: 20 });
    await ctrl.getReports(req(qaAdmin), { period: '30d' });
    await ctrl.getPricing(req(qaAdmin), {});
    await ctrl.getSettings(req(qaAdmin), {});
    for (const call of client.send.mock.calls) {
      expect(call[1]).toMatchObject({ countryCode: 'QA', scope: 'QA' });
    }
  });
});

describe('AdminHotelController command spellings', () => {
  /**
   * One name per command — the whole point of M5. Every entry on the left is a
   * `@MessagePattern` in `modules/hotel/backend/src`; nothing here is a dotted
   * `admin.hotel.*` spelling any more, and no command answers to two names.
   */
  it('sends the seventeen names hotel-service implements', async () => {
    const { ctrl, client } = build();
    await ctrl.getDashboard(req(globalAdmin), {});
    await ctrl.getHotels(req(globalAdmin), {});
    await ctrl.getHotelById(req(globalAdmin), HOTEL);
    await ctrl.approveHotel(req(globalAdmin), HOTEL);
    await ctrl.suspendHotel(req(globalAdmin), HOTEL, { reason: 'probe' });
    await ctrl.getRooms(req(globalAdmin), {});
    await ctrl.getBookings(req(globalAdmin), {});
    await ctrl.getBookingById(req(globalAdmin), HOTEL);
    await ctrl.getAmenities(req(globalAdmin));
    await ctrl.createAmenity(req(globalAdmin), { name: 'Sauna' });
    await ctrl.getPricing(req(globalAdmin), {});
    await ctrl.updatePricing(req(globalAdmin), { countryCode: 'QA', cleaningFee: 1 });
    await ctrl.getReports(req(globalAdmin), {});
    await ctrl.getReviews(req(globalAdmin), {});
    await ctrl.moderateReview(req(globalAdmin), HOTEL, { action: 'approve' });
    await ctrl.getSettings(req(globalAdmin), {});
    await ctrl.updateSettings(req(globalAdmin), { countryCode: 'QA', maxRoomsPerHotel: 10 });

    expect(client.send.mock.calls.map((c) => c[0].cmd)).toEqual([
      'admin_hotel_stats',
      'admin_list_hotels',
      'get_hotel',
      'admin_approve_hotel',
      'admin_suspend_hotel',
      'admin_hotel_rooms',
      'admin_hotel_bookings',
      'admin_hotel_booking_detail',
      'admin_hotel_amenities',
      'admin_hotel_create_amenity',
      'admin_hotel_pricing',
      'admin_hotel_update_pricing',
      'admin_hotel_reports',
      'admin_hotel_reviews',
      'admin_hotel_moderate_review',
      'admin_hotel_settings',
      'admin_hotel_update_settings',
    ]);
  });
});

describe('every list route answers with data + total', () => {
  /**
   * ONE list shape for all five, and the rows one level down — no more.
   *
   * hotel-service answers a list with `{ data, total, page, limit }`, and the
   * global `TransformInterceptor` puts whatever the handler returns under
   * `data`. So a handler that returns the service result unwrapped puts the rows
   * at `json.data.data`, which is where M1's marketplace lists, M3's pharmacy
   * lists and M4's restaurant lists put theirs; a handler that adds its own
   * `{ data: … }` puts them at `json.data.data.data`. `GET /amenities` did
   * exactly that — it answers with `{ data, total, catalogued }` like any other
   * list — so the console would have read two different depths across five
   * screens of one module (M4 review I1, applied here).
   *
   * The assertion walks the routes rather than naming the one that was wrong, so
   * a list route added later cannot regress it: `data` and `total` have to be on
   * the payload the handler returns, not nested inside it.
   */
  const listRoutes: Array<[string, (c: AdminHotelController, r: any) => Promise<any>]> = [
    ['GET /hotels', (c, r) => c.getHotels(r, {})],
    ['GET /rooms', (c, r) => c.getRooms(r, {})],
    ['GET /bookings', (c, r) => c.getBookings(r, {})],
    ['GET /reviews', (c, r) => c.getReviews(r, {})],
    ['GET /amenities', (c, r) => c.getAmenities(r)],
  ];

  /** What hotel-service really answers a list with. */
  const paged = { data: [{ id: 'row-1' }], total: 1, page: 1, limit: 20, market: 'QA' };

  for (const [label, call] of listRoutes) {
    it(`${label} returns the paged payload unwrapped`, async () => {
      const client = { send: vi.fn(() => of(paged)) };
      const ctrl = new AdminHotelController(client as any);
      const body = await call(ctrl, req(qaAdmin));

      expect(Array.isArray(body.data), `${label} buries its rows`).toBe(true);
      expect(body.total).toBe(1);
      // The rows are the service's own, not a re-wrapped copy of the envelope.
      expect(body.data[0]).toEqual({ id: 'row-1' });
    });
  }

  it('leaves single-object reads and decisions wrapped', async () => {
    // These carry no `total`, nothing pages them, and a bare entity would give
    // the console nowhere to hang anything the route later adds beside it.
    const one = { id: 'h-1', name: 'KARTSEEK Business Suites' };
    const client = { send: vi.fn(() => of(one)) };
    const ctrl = new AdminHotelController(client as any);

    expect(await ctrl.getDashboard(req(qaAdmin), {})).toEqual({ data: one });
    expect(await ctrl.getHotelById(req(qaAdmin), HOTEL)).toEqual({ data: one });
    expect(await ctrl.getBookingById(req(qaAdmin), HOTEL)).toEqual({ data: one });
    expect(await ctrl.getReports(req(qaAdmin), {})).toEqual({ data: one });
    expect(await ctrl.getPricing(req(qaAdmin), {})).toEqual({ data: one });
    expect(await ctrl.getSettings(req(qaAdmin), {})).toEqual({ data: one });
    expect(await ctrl.approveHotel(req(qaAdmin), HOTEL)).toEqual({ data: one });
  });
});

describe('AdminHotelController failure handling', () => {
  it('reports an unreachable service as 503, never as an empty page', async () => {
    const { ctrl } = build(vi.fn(() => throwError(() => new Error('connect ECONNREFUSED'))));
    await expect(ctrl.getBookings(req(globalAdmin), {})).rejects.toMatchObject({ status: 503 });
  });
});
