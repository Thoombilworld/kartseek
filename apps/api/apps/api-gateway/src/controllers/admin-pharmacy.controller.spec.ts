import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { of } from 'rxjs';
import { AdminPharmacyController } from './admin-pharmacy.controller';

const qaAdmin = { id: 'u-qa', role: 'ADMIN', regionCode: 'QA', regionLocked: true };
const globalAdmin = { id: 'u-g', role: 'SUPER_ADMIN' };
const req = (user: object) => ({ user, method: 'GET', originalUrl: '/x', headers: {} });
const build = () => {
  const client = { send: vi.fn(() => of({ data: [], total: 0 })) };
  return { ctrl: new AdminPharmacyController(client as any), client };
};

describe('AdminPharmacyController market scope', () => {
  it("confines a locked admin's store list to their own market", async () => {
    const { ctrl, client } = build();
    await ctrl.getStores(req(qaAdmin), 1, 20, undefined);
    expect(client.send).toHaveBeenCalledWith(
      { cmd: 'admin.pharmacy.stores' },
      expect.objectContaining({ countryCode: 'QA', scope: 'QA' }),
    );
  });

  it('refuses another market before pharmacy-service is ever addressed', async () => {
    const { ctrl, client } = build();
    await expect(ctrl.getStores(req(qaAdmin), 1, 20, undefined, 'IN')).rejects.toThrow(
      ForbiddenException,
    );
    expect(client.send).not.toHaveBeenCalled();
  });

  it("forwards a global admin's filter, normalised, and sends no scope", async () => {
    const { ctrl, client } = build();
    await ctrl.getStores(req(globalAdmin), 1, 20, undefined, 'in');
    expect(client.send.mock.calls[0][1]).toMatchObject({ countryCode: 'IN' });
    expect(client.send.mock.calls[0][1].scope).toBeUndefined();
  });

  it('records the market and the acting admin on a suspension', async () => {
    const { ctrl, client } = build();
    await ctrl.suspendStore(req(qaAdmin), 's-1', { reason: 'licence expired' });
    expect(client.send).toHaveBeenCalledWith(
      { cmd: 'admin.pharmacy.suspend' },
      expect.objectContaining({
        id: 's-1',
        reason: 'licence expired',
        scope: 'QA',
        adminId: 'u-qa',
      }),
    );
  });

  it('refuses a locked admin the globally managed category taxonomy', async () => {
    const { ctrl, client } = build();
    await expect(ctrl.createCategory(req(qaAdmin), { name: 'Analgesics' })).rejects.toThrow(
      ForbiddenException,
    );
    expect(client.send).not.toHaveBeenCalled();
  });

  it('still lets a locked admin read that taxonomy, unfiltered', async () => {
    const { ctrl, client } = build();
    await ctrl.getCategories(req(qaAdmin));
    expect(client.send).toHaveBeenCalledWith({ cmd: 'admin.pharmacy.categories' }, {});
  });
});
