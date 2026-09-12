import { describe, it, expect, vi } from 'vitest';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AdminAccessController } from './admin-access.controller';

const qaAdmin = { id: 'u-qa', role: 'ADMIN', regionCode: 'QA', regionLocked: true };
const superAdmin = { id: 'u-s', role: 'SUPER_ADMIN' };
const req = (user: object) => ({ user, method: 'GET', originalUrl: '/x', headers: {} });

/** A staff row in QA, locked, at the role given. */
const qaStaff = (role: string, id = 's-1') => ({
  id,
  role,
  regionCode: 'QA',
  regionLocked: true,
  isActive: true,
});

/** A complete create payload; the caller's market and lock are added per test. */
const newStaff = {
  email: 'new@kartseek.com',
  firstName: 'New',
  lastName: 'Hire',
  role: 'SUPPORT_AGENT',
  adminRoleId: '11111111-1111-4111-8111-111111111111',
};

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
    // By id it is the staff row under test; by email it is nobody, so
    // `createStaff`'s "already exists" check passes.
    findOne: vi.fn(async ({ where }: any = {}) => (where?.email ? null : staff)),
    create: vi.fn((d: any) => ({ id: 'u-new', ...d })),
    save: vi.fn(async (u: any) => u),
    count: vi.fn(async () => 0),
  };
  const roleRepo = {
    find: vi.fn(async () => []),
    findOne: vi.fn(async () => ({ id: 'r-1', key: 'admin' })),
  };
  const kafka = { publish: vi.fn(async () => undefined) };
  const ctrl = Object.create(AdminAccessController.prototype) as AdminAccessController;
  Object.assign(ctrl, {
    userRepo,
    roleRepo,
    kafka,
    encryption: { encrypt: (s: string) => s, decrypt: (s: string) => s },
    logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
    endSessions: vi.fn(async () => true),
  });
  return { ctrl, userRepo, roleRepo, kafka, preds };
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

  it('narrows the list to locked accounts, so a global account never appears', async () => {
    // A global (unlocked) admin belongs to every market, which is not a
    // regional admin's to administer — and the market predicate alone would
    // not exclude one whose `region_code` happened to match.
    const { ctrl, preds } = build();
    await ctrl.listStaff(req(qaAdmin), 1, 20);
    expect(preds).toContain('u.regionLocked = true');
  });

  it('leaves a global admin the whole directory', async () => {
    const { ctrl, preds } = build();
    await ctrl.listStaff(req(superAdmin), 1, 20);
    expect(preds).not.toContain('u.regionLocked = true');
  });

  it('still refuses a locked admin touching roles', async () => {
    const { ctrl } = build();
    await expect(ctrl.listRoles(req(qaAdmin))).rejects.toThrow(ForbiddenException);
  });

  it('refuses a locked admin granting a role they could not grant themselves', async () => {
    const { ctrl } = build();
    await expect(
      ctrl.updateStaff(req(qaAdmin), 's-1', { adminRoleId: 'r-other' } as any),
    ).rejects.toThrow('Only a global administrator may change a role assignment.');
  });
});

/**
 * Rank, and the escalations it closes.
 *
 * R12 refused a locked caller `adminRoleId` and the market lock and then let
 * `dto.role` fall straight through to the assignment — so a locked
 * `SUPPORT_AGENT` holding `staff.manage` could `PATCH` itself to `ADMIN`, which
 * is the column every role gate in the gateway reads (review C1). The rules
 * below are one rank table read in one place, so each of these is the same
 * rule seen from a different side.
 */
describe('staff writes are bounded by rank', () => {
  it('refuses a locked admin who promotes themselves', async () => {
    const { ctrl, userRepo } = build(qaStaff('ADMIN', 'u-qa'));
    await expect(ctrl.updateStaff(req(qaAdmin), 'u-qa', { role: 'ADMIN' } as any)).rejects.toThrow(
      'You cannot change your own role, market lock or active flag',
    );
    expect(userRepo.save).not.toHaveBeenCalled();
  });

  it('refuses a locked admin who unlocks themselves', async () => {
    const { ctrl, userRepo } = build(qaStaff('ADMIN', 'u-qa'));
    await expect(
      ctrl.updateStaff(req(qaAdmin), 'u-qa', { regionLocked: false } as any),
    ).rejects.toThrow('You cannot change your own role, market lock or active flag');
    expect(userRepo.save).not.toHaveBeenCalled();
  });

  it('refuses a locked admin who grants ADMIN to a junior colleague', async () => {
    // The proxy version of promoting yourself: mint an ADMIN, sign in as it.
    const { ctrl, userRepo } = build(qaStaff('SUPPORT_AGENT'));
    await expect(ctrl.updateStaff(req(qaAdmin), 's-1', { role: 'ADMIN' } as any)).rejects.toThrow(
      'You may only assign a role below your own.',
    );
    expect(userRepo.save).not.toHaveBeenCalled();
  });

  it('refuses a locked admin who rewrites a peer of equal rank', async () => {
    const { ctrl, userRepo } = build(qaStaff('ADMIN', 's-peer'));
    await expect(
      ctrl.updateStaff(req(qaAdmin), 's-peer', { role: 'SUPPORT_AGENT' } as any),
    ).rejects.toThrow('You may only manage staff accounts whose role is below your own.');
    expect(userRepo.save).not.toHaveBeenCalled();
  });

  it('refuses a locked admin acting on a SUPER_ADMIN row locked to their own market', async () => {
    // Reachable: `PATCH /admin/staff/:id` can put a market lock on a
    // SUPER_ADMIN, and that row then passed the market check.
    const { ctrl, userRepo } = build(qaStaff('SUPER_ADMIN', 's-owner'));
    for (const dto of [{ isActive: false }, { firstName: 'X' }]) {
      await expect(ctrl.updateStaff(req(qaAdmin), 's-owner', dto as any)).rejects.toThrow(
        'A SUPER_ADMIN account can only be changed by a SUPER_ADMIN.',
      );
    }
    expect(userRepo.save).not.toHaveBeenCalled();
  });

  it('lets a locked admin retitle and deactivate a junior colleague in their market', async () => {
    const { ctrl, userRepo } = build(qaStaff('SUPPORT_AGENT'));
    await expect(
      ctrl.updateStaff(req(qaAdmin), 's-1', { firstName: 'Aisha', isActive: false } as any),
    ).resolves.toBeDefined();
    expect(userRepo.save).toHaveBeenCalled();
  });

  it('keeps the market lock and the role assignment for a global ADMIN too', async () => {
    // These were gated on `if (scope)`, so widening the route to admit the
    // regional admin handed both to every unlocked ADMIN holding
    // `staff.manage` — SUPER_ADMIN-only before R12 (review I5).
    const globalAdmin = { id: 'u-g', role: 'ADMIN' };
    const { ctrl, userRepo } = build(qaStaff('SUPPORT_AGENT'));
    await expect(
      ctrl.updateStaff(req(globalAdmin), 's-1', { regionCode: 'IN' } as any),
    ).rejects.toThrow('Only a global administrator may change a market lock.');
    await expect(
      ctrl.updateStaff(req(globalAdmin), 's-1', { adminRoleId: 'r-other' } as any),
    ).rejects.toThrow('Only a global administrator may change a role assignment.');
    expect(userRepo.save).not.toHaveBeenCalled();
  });
});

describe('a regional admin staffs their own market', () => {
  it('creates a junior account, forced into their market and locked', async () => {
    const { ctrl, userRepo } = build();
    await expect(ctrl.createStaff(req(qaAdmin), { ...newStaff } as any)).resolves.toBeDefined();
    expect(userRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ regionCode: 'QA', regionLocked: true, role: 'support_agent' }),
    );
  });

  it('refuses to create one in another market', async () => {
    const { ctrl, userRepo } = build();
    await expect(
      ctrl.createStaff(req(qaAdmin), { ...newStaff, regionCode: 'IN' } as any),
    ).rejects.toThrow(ForbiddenException);
    expect(userRepo.save).not.toHaveBeenCalled();
  });

  it('refuses to create an ADMIN — only roles below their own', async () => {
    const { ctrl, userRepo } = build();
    await expect(
      ctrl.createStaff(req(qaAdmin), { ...newStaff, role: 'ADMIN' } as any),
    ).rejects.toThrow('You may only assign a role below your own.');
    expect(userRepo.save).not.toHaveBeenCalled();
  });

  it('refuses to create an unlocked account', async () => {
    const { ctrl } = build();
    await expect(
      ctrl.createStaff(req(qaAdmin), { ...newStaff, regionLocked: false } as any),
    ).rejects.toThrow('Only a global administrator may change a market lock.');
  });

  it('refuses a GLOBAL admin minting an account — that stayed SUPER_ADMIN only', async () => {
    const { ctrl, userRepo } = build();
    await expect(
      ctrl.createStaff(req({ id: 'u-g', role: 'ADMIN' }), { ...newStaff } as any),
    ).rejects.toThrow('Only a SUPER_ADMIN may create a staff account outside a single market.');
    expect(userRepo.save).not.toHaveBeenCalled();
  });

  it('lets a SUPER_ADMIN mint a global account', async () => {
    const { ctrl, userRepo } = build();
    await expect(ctrl.createStaff(req(superAdmin), { ...newStaff } as any)).resolves.toBeDefined();
    expect(userRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ regionCode: null, regionLocked: false }),
    );
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

  /**
   * The resulting state has to be READABLE, not merely present.
   *
   * `'ZZ'` satisfies the DTO's `/^[A-Za-z]{2}$/` and is not a market this
   * platform knows, so `resolveMarket` refuses that account on every scoped
   * route: fail-closed, but bricked — and invisible to a
   * `region_locked AND region_code IS NULL` tripwire, which is how the first
   * round's database check came back clean (review I4).
   */
  it('refuses a lock on a market this platform cannot read', async () => {
    const { ctrl, userRepo } = build();
    await expect(
      ctrl.updateStaff(req(superAdmin), 's-1', { regionCode: 'ZZ' } as any),
    ).rejects.toThrow('cannot be attributed to a market yet');
    await expect(
      ctrl.updateStaff(req(superAdmin), 's-1', { regionCode: 'ZZ', regionLocked: true } as any),
    ).rejects.toThrow(BadRequestException);
    expect(userRepo.save).not.toHaveBeenCalled();
  });

  it('refuses the same unreadable market on create', async () => {
    const { ctrl, userRepo } = build();
    await expect(
      ctrl.createStaff(req(superAdmin), {
        ...newStaff,
        regionCode: 'ZZ',
        regionLocked: true,
      } as any),
    ).rejects.toThrow(BadRequestException);
    expect(userRepo.save).not.toHaveBeenCalled();
  });

  it('lets an unlocked account keep an unreadable market — nothing is scoped by it', async () => {
    // Only a LOCK needs a readable market: an unlocked account is global and
    // `region_code` is then a note, not a boundary. Refusing it here would
    // reject a row the platform has always accepted for no safety gain.
    const { ctrl, userRepo } = build();
    await expect(
      ctrl.updateStaff(req(superAdmin), 's-1', { regionCode: 'ZZ', regionLocked: false } as any),
    ).resolves.toBeDefined();
    expect(userRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ regionCode: 'ZZ', regionLocked: false }),
    );
  });

  it('refuses a locked caller changing a colleague lock, in those words', async () => {
    // The headline refusal of this task's own title item, live-probed in the
    // first round and asserted by nothing (review I8).
    const { ctrl, userRepo } = build(qaStaff('SUPPORT_AGENT'));
    await expect(
      ctrl.updateStaff(req(qaAdmin), 's-1', { regionLocked: false } as any),
    ).rejects.toThrow('Only a global administrator may change a market lock.');
    await expect(
      ctrl.updateStaff(req(qaAdmin), 's-1', { regionCode: 'QA' } as any),
    ).rejects.toThrow('Only a global administrator may change a market lock.');
    expect(userRepo.save).not.toHaveBeenCalled();
  });
});
