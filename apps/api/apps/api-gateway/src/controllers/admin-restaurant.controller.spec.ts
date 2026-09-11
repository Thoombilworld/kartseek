import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { of } from 'rxjs';
import { AdminRestaurantController } from './admin-restaurant.controller';

const qaAdmin = { id: 'u-qa', role: 'ADMIN', regionCode: 'QA', regionLocked: true };
const globalAdmin = { id: 'u-g', role: 'SUPER_ADMIN' };
const req = (user: object) => ({ user, method: 'GET', originalUrl: '/x', headers: {} });
const build = () => {
  const client = { send: vi.fn(() => of({ data: [], total: 0 })) };
  return { ctrl: new AdminRestaurantController(client as any), client };
};

describe('AdminRestaurantController market scope', () => {
  it("confines a locked admin's restaurant list to their own market", async () => {
    const { ctrl, client } = build();
    await ctrl.getRestaurants(req(qaAdmin), 1, 20, undefined);
    expect(client.send).toHaveBeenCalledWith(
      { cmd: 'admin.restaurant.list' },
      expect.objectContaining({ countryCode: 'QA', scope: 'QA' }),
    );
  });

  it('refuses another market before restaurant-service is ever addressed', async () => {
    const { ctrl, client } = build();
    await expect(ctrl.getRestaurants(req(qaAdmin), 1, 20, undefined, 'IN')).rejects.toThrow(
      ForbiddenException,
    );
    expect(client.send).not.toHaveBeenCalled();
  });

  it("forwards a global admin's filter, normalised, and sends no scope", async () => {
    const { ctrl, client } = build();
    await ctrl.getRestaurants(req(globalAdmin), 1, 20, undefined, 'in');
    expect(client.send.mock.calls[0][1]).toMatchObject({ countryCode: 'IN' });
    expect(client.send.mock.calls[0][1].scope).toBeUndefined();
  });

  it('records the market and the acting admin on a suspension', async () => {
    const { ctrl, client } = build();
    await ctrl.suspendRestaurant(req(qaAdmin), 'r-1', { reason: 'hygiene report' });
    expect(client.send).toHaveBeenCalledWith(
      { cmd: 'admin.restaurant.suspend' },
      expect.objectContaining({
        id: 'r-1',
        reason: 'hygiene report',
        scope: 'QA',
        adminId: 'u-qa',
      }),
    );
  });

  it('refuses a locked admin the globally managed cuisine taxonomy', async () => {
    const { ctrl, client } = build();
    await expect(ctrl.createCuisine(req(qaAdmin), { name: 'Levantine' })).rejects.toThrow(
      ForbiddenException,
    );
    expect(client.send).not.toHaveBeenCalled();
  });

  it('still lets a locked admin read that taxonomy, unfiltered', async () => {
    const { ctrl, client } = build();
    await ctrl.getCuisines(req(qaAdmin));
    expect(client.send).toHaveBeenCalledWith({ cmd: 'admin.restaurant.cuisines' }, {});
  });
});
