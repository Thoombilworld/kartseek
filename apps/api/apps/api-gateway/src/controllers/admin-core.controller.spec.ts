import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { of } from 'rxjs';
import { AdminCoreController } from './admin-core.controller';

const qaAdmin = { id: 'u-qa', role: 'ADMIN', regionCode: 'QA', regionLocked: true };
const globalAdmin = { id: 'u-g', role: 'SUPER_ADMIN' };
const req = (user: object) => ({ user, method: 'GET', originalUrl: '/x', headers: {} });

describe('AdminCoreController market scope', () => {
  let client: { send: ReturnType<typeof vi.fn> };
  let ctrl: AdminCoreController;

  beforeEach(() => {
    client = { send: vi.fn(() => of({ data: [], total: 0 })) };
    ctrl = new AdminCoreController(client as any);
  });

  it("forces a locked admin's users list into their market", async () => {
    await ctrl.users(req(qaAdmin), 1, 20, undefined, undefined, undefined);
    expect(client.send).toHaveBeenCalledWith(
      { cmd: 'admin_users_list' },
      expect.objectContaining({ scope: 'QA', country: 'QA' }),
    );
  });

  it('refuses a locked admin who asks for another market', async () => {
    await expect(ctrl.users(req(qaAdmin), 1, 20, undefined, 'IN', undefined)).rejects.toThrow(
      ForbiddenException,
    );
    expect(client.send).not.toHaveBeenCalled();
  });

  it("passes a global admin's filter through and no scope", async () => {
    await ctrl.users(req(globalAdmin), 1, 20, undefined, 'in', undefined);
    const payload = client.send.mock.calls[0][1];
    expect(payload.country).toBe('IN');
    expect(payload.scope).toBeUndefined();
  });

  it('carries scope on ban, unban, kyc and audit calls', async () => {
    await ctrl.banUser(req(qaAdmin), 'user-1', { reason: 'fraud' });
    await ctrl.unbanUser(req(qaAdmin), 'user-1');
    await ctrl.pendingKyc(req(qaAdmin), 1, 20);
    await ctrl.approveKyc(req(qaAdmin), 'e-1', { entityType: 'seller' });
    await ctrl.rejectKyc(req(qaAdmin), 'e-1', { entityType: 'seller', reason: 'blurry' });
    await ctrl.auditLogs(req(qaAdmin), 1, 50);
    await ctrl.revenueReport(req(qaAdmin));
    for (const call of client.send.mock.calls) expect(call[1]).toMatchObject({ scope: 'QA' });
  });
});
