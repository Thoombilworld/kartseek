import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { HotelService } from '../hotel.service';
import { HotelAdminController } from '../admin/admin.controller';

/**
 * A region-locked administrator carries their market as `scope` on every admin
 * message. These tests pin the two halves of that contract inside
 * hotel-service: a list narrows to the market, and a decision on one hotel
 * refuses a hotel that belongs to another one — before anything is written or
 * published, because a Kafka event is as visible as a database row.
 */

function service(hotel: { id: string; countryCode: string } | null = null) {
  const hotelRepo = {
    findAndCount: vi.fn(async () => [[], 0]),
    find: vi.fn(async () => []),
    findOne: vi.fn(async () => hotel),
    save: vi.fn(async (h: any) => h),
    update: vi.fn(async () => ({ affected: 1 })),
    count: vi.fn(async () => 0),
  };
  const qbWhere: string[] = [];
  const qb: any = {
    select: () => qb,
    where: (w: string) => (qbWhere.push(w), qb),
    andWhere: (w: string) => (qbWhere.push(w), qb),
    groupBy: () => qb,
    having: () => qb,
    getRawOne: async () => ({ total: 0 }),
    getRawMany: async () => [],
    getCount: async () => 0,
  };
  const bookingRepo = { count: vi.fn(async () => 0), createQueryBuilder: () => qb };
  const redis = { del: vi.fn(async () => undefined) };
  const kafka = { publish: vi.fn(async () => undefined) };
  const svc = Object.create(HotelService.prototype) as HotelService;
  Object.assign(svc, {
    hotelRepo,
    bookingRepo,
    reviewRepo: { count: vi.fn(async () => 0) },
    redis,
    kafka,
    logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
  });
  return { svc, hotelRepo, bookingRepo, redis, kafka, qbWhere };
}

describe('HotelService.getAllHotels narrows to the caller market', () => {
  it('adds the country predicate when a market is given', async () => {
    const { svc, hotelRepo } = service();
    await svc.getAllHotels(1, 20, undefined, 'QA');
    expect(hotelRepo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ countryCode: 'QA' }) }),
    );
  });

  it('leaves the list unfiltered for a global admin', async () => {
    const { svc, hotelRepo } = service();
    await svc.getAllHotels(1, 20);
    expect(hotelRepo.findAndCount.mock.calls[0][0].where.countryCode).toBeUndefined();
  });
});

describe('HotelService decisions assert the hotel market', () => {
  it("refuses to approve another market's hotel, writing and publishing nothing", async () => {
    const { svc, hotelRepo, kafka } = service({ id: 'h-in', countryCode: 'IN' });
    await expect(svc.approveHotel('h-in', 'QA')).rejects.toThrow(ForbiddenException);
    expect(hotelRepo.save).not.toHaveBeenCalled();
    expect(kafka.publish).not.toHaveBeenCalled();
  });

  it('approves a hotel inside the caller market', async () => {
    const { svc, hotelRepo } = service({ id: 'h-qa', countryCode: 'QA' });
    await expect(svc.approveHotel('h-qa', 'QA')).resolves.toMatchObject({ status: 'ACTIVE' });
    expect(hotelRepo.save).toHaveBeenCalled();
  });

  it("refuses to suspend another market's hotel, writing nothing", async () => {
    const { svc, hotelRepo } = service({ id: 'h-in', countryCode: 'IN' });
    await expect(svc.suspendHotel('h-in', 'licence lapsed', 'QA')).rejects.toThrow(
      ForbiddenException,
    );
    expect(hotelRepo.update).not.toHaveBeenCalled();
  });

  it('suspends a hotel inside the caller market', async () => {
    const { svc, hotelRepo } = service({ id: 'h-qa', countryCode: 'QA' });
    await expect(svc.suspendHotel('h-qa', 'licence lapsed', 'QA')).resolves.toMatchObject({
      status: 'SUSPENDED',
    });
    expect(hotelRepo.update).toHaveBeenCalled();
  });

  it('lets a global admin decide on a hotel in any market', async () => {
    const { svc, hotelRepo } = service({ id: 'h-in', countryCode: 'IN' });
    await expect(svc.approveHotel('h-in')).resolves.toMatchObject({ status: 'ACTIVE' });
    expect(hotelRepo.save).toHaveBeenCalled();
  });
});

describe('Hotel reports that can be attributed to a market are', () => {
  it('narrows the compliance list to the market', async () => {
    const { svc, hotelRepo } = service();
    await svc.getComplianceData('QA');
    expect(hotelRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ countryCode: 'QA' }) }),
    );
  });

  it('narrows the fraud queries to the market', async () => {
    const { svc, qbWhere } = service();
    await svc.getAdminFraudAnalytics('QA');
    expect(qbWhere.filter((w) => w.includes('b.hotelCountryCode = :cc'))).toHaveLength(2);
  });
});

describe('Hotel reports that cannot be attributed to a market fail closed', () => {
  function controller() {
    const svc = {
      getAdminAnalytics: vi.fn(async () => ({ totalHotels: 3 })),
      getAdminFraudAnalytics: vi.fn(async () => ({})),
    };
    const ctrl = Object.create(HotelAdminController.prototype) as HotelAdminController;
    Object.assign(ctrl, { svc });
    return { ctrl, svc };
  }

  // Both handlers are synchronous and throw directly rather than returning a
  // rejected promise, so the call must be wrapped for `.toThrow` to catch it.
  it('refuses platform statistics to a scoped admin without reading them', () => {
    const { ctrl, svc } = controller();
    expect(() => ctrl.msgStats({ scope: 'QA' })).toThrow(ForbiddenException);
    expect(svc.getAdminAnalytics).not.toHaveBeenCalled();
  });

  it('refuses the revenue report to a scoped admin without reading it', () => {
    const { ctrl, svc } = controller();
    expect(() => ctrl.msgRevenue({ scope: 'QA' })).toThrow(ForbiddenException);
    expect(svc.getAdminAnalytics).not.toHaveBeenCalled();
  });

  it('still serves both to a global admin', async () => {
    const { ctrl, svc } = controller();
    await expect(ctrl.msgStats({})).resolves.toMatchObject({ totalHotels: 3 });
    expect(svc.getAdminAnalytics).toHaveBeenCalled();
  });
});
