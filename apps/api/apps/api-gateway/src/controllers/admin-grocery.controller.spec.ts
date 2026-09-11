import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { of } from 'rxjs';
import { AdminGroceryController } from './admin-grocery.controller';

const qaAdmin = { id: 'u-qa', role: 'ADMIN', regionCode: 'QA', regionLocked: true };
const globalAdmin = { id: 'u-g', role: 'SUPER_ADMIN' };
const req = (user: object) => ({ user, method: 'GET', originalUrl: '/x', headers: {} });
const build = () => {
  const client = { send: vi.fn(() => of({ data: [], total: 0 })) };
  return { ctrl: new AdminGroceryController(client as any), client };
};

describe('AdminGroceryController market scope', () => {
  it("lists stores in the locked admin's market and refuses another", async () => {
    const { ctrl, client } = build();
    await ctrl.getStores(req(qaAdmin), 1, 20, undefined, undefined, undefined);
    expect(client.send).toHaveBeenCalledWith(
      { cmd: 'admin.grocery.stores' },
      expect.objectContaining({ regionCode: 'QA', scope: 'QA' }),
    );
    await expect(ctrl.getStores(req(qaAdmin), 1, 20, undefined, undefined, 'IN')).rejects.toThrow(
      ForbiddenException,
    );
    expect(client.send).toHaveBeenCalledTimes(1);
  });

  it('lets a global admin pick any market and sends no scope', async () => {
    const { ctrl, client } = build();
    await ctrl.getStores(req(globalAdmin), 1, 20, undefined, undefined, 'in');
    expect(client.send.mock.calls[0][1]).toMatchObject({ regionCode: 'IN' });
    expect(client.send.mock.calls[0][1].scope).toBeUndefined();
  });

  it('refuses a locked admin write to grocery settings and grocery taxonomy without calling the client', async () => {
    const { ctrl: settingsCtrl, client: settingsClient } = build();
    await expect(
      settingsCtrl.updateSettings(req(qaAdmin), { commissionPercent: 10 }),
    ).rejects.toThrow(ForbiddenException);
    expect(settingsClient.send).not.toHaveBeenCalled();

    const { ctrl: catCtrl, client: catClient } = build();
    await expect(catCtrl.createCategory(req(qaAdmin), { name: 'Snacks' })).rejects.toThrow(
      ForbiddenException,
    );
    expect(catClient.send).not.toHaveBeenCalled();
  });

  it('sends actor and scope when approving a store', async () => {
    const { ctrl, client } = build();
    await ctrl.approveStore(req(qaAdmin), 'store-1');
    expect(client.send).toHaveBeenCalledWith(
      { cmd: 'admin.grocery.approve' },
      expect.objectContaining({ id: 'store-1', actorId: 'u-qa', scope: 'QA' }),
    );
  });
});
