import { describe, it, expect, vi } from 'vitest';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AdminAccessController } from './admin-access.controller';

const qaAdmin = { id: 'u-qa', role: 'ADMIN', regionCode: 'QA', regionLocked: true };
const superAdmin = { id: 'u-s', role: 'SUPER_ADMIN' };
const req = (user: object) => ({ user, method: 'GET', originalUrl: '/x', headers: {} });

function build(staff: any = { id: 's-1', role: 'admin', regionCode: 'QA', regionLocked: true }) {
  const preds: string[] = [];
  const qb: any = {
    where: (s: string) => (preds.push(s), qb),
    andWhere: (s: string) => (preds.push(s), qb),
    orderBy: () => qb,
    skip: () => qb,
    take: () => qb,
    getManyAndCount: async () => [[staff], 1],
  };
  const userRepo = {
    createQueryBuilder: () => qb,
    findOne: vi.fn(async () => staff),
    save: vi.fn(async (u: any) => u),
    count: vi.fn(async () => 0),
  };
  const roleRepo = {
    find: vi.fn(async () => []),
    findOne: vi.fn(async () => ({ id: 'r-1', key: 'admin' })),
  };
  const ctrl = Object.create(AdminAccessController.prototype) as AdminAccessController;
  Object.assign(ctrl, {
    userRepo,
    roleRepo,
    encryption: { encrypt: (s: string) => s, decrypt: (s: string) => s },
    logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
    endSessions: vi.fn(async () => true),
  });
  return { ctrl, userRepo, preds };
}

describe('a regional admin manages their own market staff', () => {
  it('lists staff, narrowed to their market whether or not they asked', async () => {
    const { ctrl, preds } = build();
    await ctrl.listStaff(req(qaAdmin), 1, 20);
    expect(preds.some((p) => p.includes('u.regionCode'))).toBe(true);
  });

  it('refuses a locked admin who filters for another market', async () => {
    const { ctrl } = build();
    await expect(ctrl.listStaff(req(qaAdmin), 1, 20, undefined, undefined, 'IN')).rejects.toThrow(
      ForbiddenException,
    );
  });

  // N4: a valid-shape but unknown market code must never widen to every
  // market. `applyMarketFilter`'s `requested` slot deliberately ignores a
  // value it cannot read (that is the right call for a genuine typo it has
  // no lock to fall back to) — `requireMarket` is what refuses it instead,
  // the same fix R11 landed for grocery's admin lists (611f0ae).
  it('refuses an unreadable market filter rather than listing every market', async () => {
    const { ctrl, preds } = build();
    await expect(
      ctrl.listStaff(req(superAdmin), 1, 20, undefined, undefined, 'ZZ'),
    ).rejects.toThrow(ForbiddenException);
    expect(preds.some((p) => p.includes('u.regionCode'))).toBe(false);
  });

  it('still lists one market for a global admin filtering by a readable market', async () => {
    const { ctrl, preds } = build();
    await expect(
      ctrl.listStaff(req(superAdmin), 1, 20, undefined, undefined, 'qa'),
    ).resolves.toBeDefined();
    expect(preds.some((p) => p.includes('u.regionCode'))).toBe(true);
  });

  it('edits a staff member in their own market', async () => {
    const { ctrl, userRepo } = build();
    await expect(
      ctrl.updateStaff(req(qaAdmin), 's-1', { firstName: 'Aisha' } as any),
    ).resolves.toBeDefined();
    expect(userRepo.save).toHaveBeenCalled();
  });

  it('refuses to edit a staff member in another market', async () => {
    const { ctrl, userRepo } = build({
      id: 's-2',
      role: 'admin',
      regionCode: 'IN',
      regionLocked: true,
    });
    await expect(ctrl.updateStaff(req(qaAdmin), 's-2', { firstName: 'X' } as any)).rejects.toThrow(
      ForbiddenException,
    );
    expect(userRepo.save).not.toHaveBeenCalled();
  });

  it('refuses to edit a GLOBAL staff member — an unlocked account is nobody market', async () => {
    const { ctrl } = build({ id: 's-3', role: 'admin', regionCode: null, regionLocked: false });
    await expect(ctrl.updateStaff(req(qaAdmin), 's-3', { firstName: 'X' } as any)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('still refuses a locked admin creating an account or touching roles', async () => {
    const { ctrl } = build();
    await expect(ctrl.createStaff(req(qaAdmin), {} as any)).rejects.toThrow(
      'Roles and staff are managed globally.',
    );
    await expect(ctrl.listRoles(req(qaAdmin))).rejects.toThrow(ForbiddenException);
  });

  it('refuses a locked admin granting a role they could not grant themselves', async () => {
    const { ctrl } = build();
    await expect(
      ctrl.updateStaff(req(qaAdmin), 's-1', { adminRoleId: 'r-other' } as any),
    ).rejects.toThrow('Only a global administrator may change a role assignment.');
  });
});

describe('the market lock is validated on the resulting state', () => {
  it('H-13 refuses clearing the market while the lock stays on', async () => {
    const { ctrl, userRepo } = build();
    await expect(
      ctrl.updateStaff(req(superAdmin), 's-1', { regionCode: null } as any),
    ).rejects.toThrow(BadRequestException);
    // The account would otherwise read as GLOBAL to marketScopeOf while the
    // console still drew a "region locked" badge (audit H-13).
    expect(userRepo.save).not.toHaveBeenCalled();
  });

  it('allows clearing both together', async () => {
    const { ctrl, userRepo } = build();
    await expect(
      ctrl.updateStaff(req(superAdmin), 's-1', { regionCode: null, regionLocked: false } as any),
    ).resolves.toBeDefined();
    expect(userRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ regionCode: null, regionLocked: false }),
    );
  });

  it('allows setting a market while the lock stays on', async () => {
    const { ctrl, userRepo } = build();
    await expect(
      ctrl.updateStaff(req(superAdmin), 's-1', { regionCode: 'ae' } as any),
    ).resolves.toBeDefined();
    expect(userRepo.save).toHaveBeenCalledWith(expect.objectContaining({ regionCode: 'AE' }));
  });

  it('refuses turning the lock on for an account with no market', async () => {
    const { ctrl } = build({ id: 's-4', role: 'admin', regionCode: null, regionLocked: false });
    await expect(
      ctrl.updateStaff(req(superAdmin), 's-4', { regionLocked: true } as any),
    ).rejects.toThrow('A locked account needs a market');
  });
});
