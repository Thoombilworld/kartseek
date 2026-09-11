import { describe, it, expect, vi, beforeEach } from 'vitest';
import 'reflect-metadata';
import { ForbiddenException } from '@nestjs/common';
import { of } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@app/common';
import { AdminCoreController } from './admin-core.controller';
import { RolesGuard } from '../guards/roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';

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

  // The audit calls moved to AdminAuditController, which talks to
  // audit-log-service rather than admin-service; their scoping is asserted in
  // `admin-audit.controller.spec.ts`.
  it('carries scope on ban, unban, kyc and revenue calls', async () => {
    await ctrl.banUser(req(qaAdmin), 'user-1', { reason: 'fraud' });
    await ctrl.unbanUser(req(qaAdmin), 'user-1');
    await ctrl.pendingKyc(req(qaAdmin), 1, 20);
    await ctrl.approveKyc(req(qaAdmin), 'e-1', { entityType: 'seller' });
    await ctrl.rejectKyc(req(qaAdmin), 'e-1', { entityType: 'seller', reason: 'blurry' });
    await ctrl.revenueReport(req(qaAdmin));
    for (const call of client.send.mock.calls) expect(call[1]).toMatchObject({ scope: 'QA' });
  });
});

/**
 * The console's forbidden panel names `dashboard.view`, so the route has to
 * enforce it.
 *
 * A 403 that was really a *role* refusal, shown under a panel telling the reader
 * to obtain a permission, sends them to ask for a grant that would change
 * nothing. Asserted through the real `RolesGuard` rather than by reading the
 * metadata alone, because `@Roles` on a handler **overrides** the class-level
 * list — writing the permission without repeating the two roles would have
 * opened the route to every signed-in account.
 */
describe('GET /admin/dashboard enforces dashboard.view', () => {
  const guard = new RolesGuard(new Reflector(), {} as never);

  const contextFor = (user: object) =>
    ({
      getHandler: () => AdminCoreController.prototype.dashboard,
      getClass: () => AdminCoreController,
      switchToHttp: () => ({ getRequest: () => ({ user, headers: {} }) }),
    }) as never;

  it('declares both roles and the permission on the handler', () => {
    const roles = Reflect.getMetadata(ROLES_KEY, AdminCoreController.prototype.dashboard);
    expect(roles).toEqual(
      expect.arrayContaining([UserRole.ADMIN, UserRole.SUPER_ADMIN, 'perm:dashboard.view']),
    );
  });

  it('admits an admin who holds it', () => {
    expect(
      guard.canActivate(contextFor({ role: 'ADMIN', adminPermissions: ['dashboard.view'] })),
    ).toBe(true);
  });

  it('admits SUPER_ADMIN through the wildcard', () => {
    expect(guard.canActivate(contextFor({ role: 'SUPER_ADMIN', adminPermissions: ['*'] }))).toBe(
      true,
    );
  });

  it('refuses an admin who does not hold it', () => {
    expect(() =>
      guard.canActivate(contextFor({ role: 'ADMIN', adminPermissions: ['orders.view'] })),
    ).toThrow(ForbiddenException);
  });

  it('still refuses a non-admin role outright', () => {
    expect(() =>
      guard.canActivate(contextFor({ role: 'CUSTOMER', adminPermissions: ['dashboard.view'] })),
    ).toThrow(ForbiddenException);
  });
});
