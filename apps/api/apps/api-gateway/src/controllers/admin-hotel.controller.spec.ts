import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { of } from 'rxjs';
import { AdminHotelController } from './admin-hotel.controller';

const qaAdmin = { id: 'u-qa', role: 'ADMIN', regionCode: 'QA', regionLocked: true };
const globalAdmin = { id: 'u-g', role: 'SUPER_ADMIN' };
const req = (user: object) => ({ user, method: 'GET', originalUrl: '/x', headers: {} });
const build = () => {
  const client = { send: vi.fn(() => of({ data: [], total: 0 })) };
  return { ctrl: new AdminHotelController(client as any), client };
};

describe('AdminHotelController market scope', () => {
  it("confines a locked admin's hotel list to their own market", async () => {
    const { ctrl, client } = build();
    await ctrl.getHotels(req(qaAdmin), 1, 20, undefined);
    expect(client.send).toHaveBeenCalledWith(
      { cmd: 'admin_list_hotels' },
      expect.objectContaining({ countryCode: 'QA', scope: 'QA' }),
    );
  });

  it('refuses another market before hotel-service is ever addressed', async () => {
    const { ctrl, client } = build();
    await expect(ctrl.getHotels(req(qaAdmin), 1, 20, undefined, 'IN')).rejects.toThrow(
      ForbiddenException,
    );
    expect(client.send).not.toHaveBeenCalled();
  });

  it("forwards a global admin's filter, normalised, and sends no scope", async () => {
    const { ctrl, client } = build();
    await ctrl.getHotels(req(globalAdmin), 1, 20, undefined, 'in');
    expect(client.send.mock.calls[0][1]).toMatchObject({ countryCode: 'IN' });
    expect(client.send.mock.calls[0][1].scope).toBeUndefined();
  });

  it('records the market and the acting admin on a suspension', async () => {
    const { ctrl, client } = build();
    await ctrl.suspendHotel(req(qaAdmin), 'h-1', { reason: 'licence lapsed' });
    expect(client.send).toHaveBeenCalledWith(
      { cmd: 'admin.hotel.suspend' },
      expect.objectContaining({
        id: 'h-1',
        reason: 'licence lapsed',
        scope: 'QA',
        adminId: 'u-qa',
      }),
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
    expect(client.send).toHaveBeenCalledWith({ cmd: 'admin.hotel.amenities' }, {});
  });
});
