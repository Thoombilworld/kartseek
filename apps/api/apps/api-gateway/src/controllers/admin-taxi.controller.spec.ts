import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { of } from 'rxjs';
import { AdminTaxiController } from './admin-taxi.controller';

const qaAdmin = { id: 'u-qa', role: 'ADMIN', regionCode: 'QA', regionLocked: true };
const globalAdmin = { id: 'u-g', role: 'SUPER_ADMIN' };
const req = (user: object) => ({ user, method: 'GET', originalUrl: '/x', headers: {} });
const build = () => {
  const client = { send: vi.fn(() => of({ data: [], total: 0 })) };
  return { ctrl: new AdminTaxiController(client as any), client };
};

describe('AdminTaxiController market scope', () => {
  it("lists drivers in the locked admin's market and refuses another", async () => {
    const { ctrl, client } = build();
    await ctrl.getDrivers(req(qaAdmin), 1, undefined, undefined);
    expect(client.send).toHaveBeenCalledWith(
      { cmd: 'admin.taxi.drivers' },
      expect.objectContaining({ countryCode: 'QA', scope: 'QA' }),
    );
    await expect(ctrl.getDrivers(req(qaAdmin), 1, undefined, 'IN')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it("refuses a locked admin another country's config and rate card", async () => {
    const { ctrl } = build();
    await expect(ctrl.upsertConfig(req(qaAdmin), 'IN', {})).rejects.toThrow(ForbiddenException);
    await expect(
      ctrl.upsertRateCard(req(qaAdmin), { countryCode: 'IN', vehicleType: 'sedan' }),
    ).rejects.toThrow(ForbiddenException);
    await expect(ctrl.rateCards(req(qaAdmin), 'IN')).rejects.toThrow(ForbiddenException);
  });

  it('sends the working suspend command name with scope and actor', async () => {
    const { ctrl, client } = build();
    await ctrl.suspendDriver(req(qaAdmin), '11111111-1111-4111-8111-111111111111', {
      reason: 'docs',
    });
    expect(client.send).toHaveBeenCalledWith(
      { cmd: 'admin.taxi.driver.suspend' },
      expect.objectContaining({
        driverId: '11111111-1111-4111-8111-111111111111',
        reason: 'docs',
        scope: 'QA',
        adminId: 'u-qa',
      }),
    );
  });

  it('scopes a payout batch', async () => {
    const { ctrl, client } = build();
    await ctrl.processPayouts(req(qaAdmin), { payoutIds: ['p-1'] });
    expect(client.send.mock.calls[0][1]).toMatchObject({ payoutIds: ['p-1'], scope: 'QA' });
  });

  it('lets a global admin pick any market and sends no scope', async () => {
    const { ctrl, client } = build();
    await ctrl.getDrivers(req(globalAdmin), 1, undefined, 'in');
    expect(client.send.mock.calls[0][1]).toMatchObject({ countryCode: 'IN' });
    expect(client.send.mock.calls[0][1].scope).toBeUndefined();
  });
});
