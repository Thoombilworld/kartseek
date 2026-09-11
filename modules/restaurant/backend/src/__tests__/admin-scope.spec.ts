import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { RestaurantService } from '../restaurant.service';

/**
 * A region-locked administrator carries their market as `scope` on every admin
 * message. These tests pin the two halves of that contract inside
 * restaurant-service: the admin list narrows to the market, and a decision on
 * one restaurant refuses a restaurant that belongs to another one — before
 * anything is written or published, because a Kafka event is as visible as a
 * database row.
 *
 * The market is `regionCode`, the platform's ISO-2 market identifier. It is not
 * `countryCode`: that column carries a legacy alpha-3 default ('KEN') that
 * nothing seeds, so filtering on it matched no row in any market. A restaurant
 * whose `regionCode` is null, or a sub-region like 'ZA-WC' rather than a plain
 * market, is deliberately outside every locked admin's scope.
 */

function service(restaurant: { id: string; regionCode: string | null } | null = null) {
  const restaurantRepo = {
    findAndCount: vi.fn(async () => [[], 0]),
    findOne: vi.fn(async () => restaurant),
    update: vi.fn(async () => ({ affected: 1 })),
  };
  const kafka = { publish: vi.fn(async () => undefined) };
  const svc = Object.create(RestaurantService.prototype) as RestaurantService;
  Object.assign(svc, {
    restaurantRepo,
    kafka,
    logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
  });
  return { svc, restaurantRepo, kafka };
}

describe('RestaurantService.getAdminRestaurantList narrows to the caller market', () => {
  it('adds the region predicate when a market is given', async () => {
    const { svc, restaurantRepo } = service();
    await svc.getAdminRestaurantList({ regionCode: 'QA' });
    expect(restaurantRepo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ regionCode: 'QA' }) }),
    );
  });

  it('leaves the list unfiltered for a global admin', async () => {
    const { svc, restaurantRepo } = service();
    await svc.getAdminRestaurantList({});
    expect(restaurantRepo.findAndCount.mock.calls[0][0].where.regionCode).toBeUndefined();
  });
});

describe('RestaurantService decisions assert the restaurant market', () => {
  it("refuses to approve another market's restaurant, writing and publishing nothing", async () => {
    const { svc, restaurantRepo, kafka } = service({ id: 'r-in', regionCode: 'IN' });
    await expect(svc.approveRestaurant('r-in', 'admin-qa', 'QA')).rejects.toThrow(
      ForbiddenException,
    );
    expect(restaurantRepo.update).not.toHaveBeenCalled();
    expect(kafka.publish).not.toHaveBeenCalled();
  });

  it('approves a restaurant inside the caller market', async () => {
    const { svc, restaurantRepo, kafka } = service({ id: 'r-qa', regionCode: 'QA' });
    await expect(svc.approveRestaurant('r-qa', 'admin-qa', 'QA')).resolves.toMatchObject({
      success: true,
    });
    expect(restaurantRepo.update).toHaveBeenCalled();
    expect(kafka.publish).toHaveBeenCalled();
  });

  it("refuses to suspend another market's restaurant, writing nothing", async () => {
    const { svc, restaurantRepo } = service({ id: 'r-in', regionCode: 'IN' });
    await expect(svc.suspendRestaurant('r-in', 'QA')).rejects.toThrow(ForbiddenException);
    expect(restaurantRepo.update).not.toHaveBeenCalled();
  });

  it('suspends a restaurant inside the caller market', async () => {
    const { svc, restaurantRepo } = service({ id: 'r-qa', regionCode: 'QA' });
    await expect(svc.suspendRestaurant('r-qa', 'QA')).resolves.toMatchObject({ success: true });
    expect(restaurantRepo.update).toHaveBeenCalled();
  });

  it('lets a global admin decide on a restaurant in any market', async () => {
    const { svc, restaurantRepo } = service({ id: 'r-in', regionCode: 'IN' });
    await expect(svc.suspendRestaurant('r-in')).resolves.toMatchObject({ success: true });
    expect(restaurantRepo.update).toHaveBeenCalled();
  });

  it('refuses a locked admin a restaurant that belongs to no market at all', async () => {
    const { svc, restaurantRepo } = service({ id: 'r-none', regionCode: null });
    await expect(svc.suspendRestaurant('r-none', 'QA')).rejects.toThrow(ForbiddenException);
    expect(restaurantRepo.update).not.toHaveBeenCalled();
  });
});
