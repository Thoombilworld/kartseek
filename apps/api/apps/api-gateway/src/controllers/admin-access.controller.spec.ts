import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { AdminAccessController } from './admin-access.controller';
import { CreateStaffDto } from '../dto/admin-access.dto';

const superAdmin = { id: 'u-s', role: 'SUPER_ADMIN' };
const lockedAdmin = { id: 'u-qa', role: 'ADMIN', regionCode: 'QA', regionLocked: true };
const req = (user: object) => ({ user, method: 'POST', originalUrl: '/x', headers: {} });

function build(roles: any[] = [], users: any[] = []) {
  const roleRepo = {
    find: vi.fn(async () => roles),
    findOne: vi.fn(
      async ({ where }: any) =>
        roles.find((r) => (where.id && r.id === where.id) || (where.key && r.key === where.key)) ??
        null,
    ),
    create: vi.fn((d: any) => ({ id: 'r-new', isSystem: false, ...d })),
    save: vi.fn(async (r: any) => r),
    remove: vi.fn(async () => undefined),
  };
  const userRepo = {
    count: vi.fn(
      async ({ where }: any) => users.filter((u) => u.adminRoleId === where.adminRoleId).length,
    ),
    findOne: vi.fn(async ({ where }: any) => users.find((u) => u.id === where.id) ?? null),
    create: vi.fn((d: any) => ({ id: 'u-new', ...d })),
    save: vi.fn(async (u: any) => u),
    createQueryBuilder: vi.fn(() => {
      const qb: any = {
        where: () => qb,
        andWhere: () => qb,
        orderBy: () => qb,
        skip: () => qb,
        take: () => qb,
        getManyAndCount: async () => [users, users.length],
      };
      return qb;
    }),
  };
  const kafka = { publish: vi.fn(async () => undefined) };
  const encryption = { encrypt: vi.fn((v: string) => `enc:${v}`) };
  return {
    ctrl: new AdminAccessController(
      roleRepo as any,
      userRepo as any,
      kafka as any,
      encryption as any,
    ),
    roleRepo,
    userRepo,
    kafka,
    encryption,
  };
}

describe('AdminAccessController', () => {
  const NODE_ENV = process.env.NODE_ENV;
  const ECHO = process.env.DEV_MFA_ECHO;
  const BYPASS = process.env.DEV_AUTH_BYPASS;

  beforeEach(() => {
    process.env.NODE_ENV = 'production';
    delete process.env.DEV_MFA_ECHO;
    delete process.env.DEV_AUTH_BYPASS;
  });
  afterEach(() => {
    process.env.NODE_ENV = NODE_ENV;
    if (ECHO === undefined) delete process.env.DEV_MFA_ECHO;
    else process.env.DEV_MFA_ECHO = ECHO;
    if (BYPASS === undefined) delete process.env.DEV_AUTH_BYPASS;
    else process.env.DEV_AUTH_BYPASS = BYPASS;
  });

  // ── Market lock ────────────────────────────────────────────────────────────

  it('refuses a locked admin even on a read — staff are not managed per market', async () => {
    const { ctrl } = build();
    await expect(ctrl.listRoles(req(lockedAdmin))).rejects.toThrow(ForbiddenException);
    await expect(
      ctrl.listStaff(req(lockedAdmin), 1, 20, undefined, undefined, undefined),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      ctrl.createRole(req(lockedAdmin), { key: 'x_role', name: 'X', permissions: [] } as any),
    ).rejects.toThrow(ForbiddenException);
  });

  it('lets a global admin through', async () => {
    const { ctrl } = build();
    const res = await ctrl.listRoles(req(superAdmin));
    expect(res.data).toEqual([]);
    expect(res.permissions.length).toBeGreaterThan(0);
  });

  it('sends timestamps as ISO strings — a Date is flattened to {} by the PCI interceptor', async () => {
    const when = new Date('2026-01-02T03:04:05.000Z');
    const { ctrl } = build(
      [{ id: 'r1', key: 'ops_lead', isSystem: false, permissions: [], createdAt: when }],
      [],
    );
    const res = await ctrl.listRoles(req(superAdmin));
    expect(res.data[0].createdAt).toBe('2026-01-02T03:04:05.000Z');
    // What the interceptor would have done to a Date, and why this matters.
    expect(JSON.stringify({ ...when })).toBe('{}');
  });

  // ── Roles ──────────────────────────────────────────────────────────────────

  it('creates a role with known permissions only', async () => {
    const { ctrl } = build();
    await expect(
      ctrl.createRole(req(superAdmin), {
        key: 'ops_lead',
        name: 'Ops Lead',
        permissions: ['orders.view', 'not.a.key'],
      } as any),
    ).rejects.toThrow(BadRequestException);
    const created = await ctrl.createRole(req(superAdmin), {
      key: 'ops_lead',
      name: 'Ops Lead',
      permissions: ['orders.view'],
    } as any);
    expect(created.data.permissions).toEqual(['orders.view']);
    expect(created.data.isSystem).toBe(false);
  });

  it('refuses a duplicate role key', async () => {
    const { ctrl } = build([{ id: 'r1', key: 'ops_lead', isSystem: false, permissions: [] }]);
    await expect(
      ctrl.createRole(req(superAdmin), {
        key: 'ops_lead',
        name: 'Ops Lead',
        permissions: [],
      } as any),
    ).rejects.toThrow(ConflictException);
  });

  it('never edits the super_admin role', async () => {
    const sys = { id: 'r-sa', key: 'super_admin', isSystem: true, permissions: ['*'] };
    const { ctrl } = build([sys]);
    await expect(
      ctrl.updateRole(req(superAdmin), 'r-sa', { permissions: ['orders.view'] } as any),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects an unknown permission on update too', async () => {
    const role = { id: 'r1', key: 'ops_lead', isSystem: false, permissions: [] };
    const { ctrl } = build([role]);
    await expect(
      ctrl.updateRole(req(superAdmin), 'r1', { permissions: ['nope.nope'] } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('never deletes a system role or a role with staff assigned', async () => {
    const sys = { id: 'r-sys', key: 'admin', isSystem: true, permissions: [] };
    const custom = { id: 'r-cus', key: 'ops_lead', isSystem: false, permissions: [] };
    const held = build([sys, custom], [{ id: 'u1', adminRoleId: 'r-cus' }]);
    await expect(held.ctrl.deleteRole(req(superAdmin), 'r-sys')).rejects.toThrow(ConflictException);
    await expect(held.ctrl.deleteRole(req(superAdmin), 'r-cus')).rejects.toThrow(ConflictException);
    expect(held.roleRepo.remove).not.toHaveBeenCalled();

    const free = build([custom], []);
    await expect(free.ctrl.deleteRole(req(superAdmin), 'r-cus')).resolves.toEqual({
      success: true,
    });
    expect(free.roleRepo.remove).toHaveBeenCalled();
  });

  it('404s on a role that does not exist', async () => {
    const { ctrl } = build();
    await expect(ctrl.deleteRole(req(superAdmin), 'r-gone')).rejects.toThrow(NotFoundException);
  });

  // ── Staff ──────────────────────────────────────────────────────────────────

  const newStaff = {
    email: 'X@Kartseek.com',
    firstName: 'X',
    lastName: 'Y',
    phone: '+971500000000',
    role: 'ADMIN',
    adminRoleId: 'r-reg',
    regionCode: 'ae',
    regionLocked: true,
  };
  const regionalRole = { id: 'r-reg', key: 'regional_admin', isSystem: true, permissions: [] };

  it('creates a staff account with a hashed temporary password and no secret in the response', async () => {
    const { ctrl, userRepo, kafka, encryption } = build([regionalRole]);
    const res = await ctrl.createStaff(req(superAdmin), newStaff as any);

    const saved = userRepo.save.mock.calls[0][0];
    expect(saved.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(saved).toMatchObject({
      email: 'x@kartseek.com',
      // The enum label, not the wire spelling — see the controller.
      role: 'admin',
      regionCode: 'AE',
      regionLocked: true,
      adminRoleId: 'r-reg',
      isActive: true,
    });
    // PII at rest: the phone is stored through EncryptionService, never plain.
    expect(encryption.encrypt).toHaveBeenCalledWith('+971500000000');
    expect(saved.phone).toBe('enc:+971500000000');

    const body = JSON.stringify(res);
    expect(body).not.toContain(saved.passwordHash);
    expect(body).not.toContain('+971500000000');
    expect(res.data.temporaryPassword).toBeUndefined();
    expect(res.data.role).toBe('ADMIN');

    const email = kafka.publish.mock.calls.find((c: any[]) => c[0] === 'notification.email');
    expect(email).toBeTruthy();
    expect(email![1]).toMatchObject({ to: 'x@kartseek.com', templateId: 'staff-welcome' });
    expect(String(email![1].body)).toContain(email![1].variables.temporaryPassword);
  });

  it('echoes the temporary password only outside production', async () => {
    process.env.NODE_ENV = 'development';
    process.env.DEV_MFA_ECHO = 'true';
    const { ctrl } = build([regionalRole]);
    const res = await ctrl.createStaff(req(superAdmin), newStaff as any);
    expect(typeof res.data.temporaryPassword).toBe('string');
  });

  it('never creates a SUPER_ADMIN through the console', async () => {
    const sa = { id: 'r-sa', key: 'super_admin', isSystem: true, permissions: ['*'] };
    const { ctrl } = build([sa]);
    await expect(
      ctrl.createStaff(req(superAdmin), { ...newStaff, adminRoleId: 'r-sa' } as any),
    ).rejects.toThrow(ForbiddenException);
  });

  it('refuses an unknown admin role', async () => {
    const { ctrl } = build([]);
    await expect(ctrl.createStaff(req(superAdmin), newStaff as any)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('refuses a locked account with no market', async () => {
    const { ctrl } = build([regionalRole]);
    await expect(
      ctrl.createStaff(req(superAdmin), {
        ...newStaff,
        regionCode: undefined,
        regionLocked: true,
      } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('refuses self-deactivation', async () => {
    const me = { id: 'u-s', role: 'ADMIN', adminRoleId: 'r-reg' };
    const { ctrl } = build([regionalRole], [me]);
    await expect(
      ctrl.updateStaff(req(superAdmin), 'u-s', { isActive: false } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('deactivates another staff account and suspends its status', async () => {
    const other = { id: 'u-other', role: 'ADMIN', adminRoleId: 'r-reg', isActive: true };
    const { ctrl, userRepo } = build([regionalRole], [other]);
    const res = await ctrl.updateStaff(req(superAdmin), 'u-other', { isActive: false } as any);
    expect(userRepo.save.mock.calls[0][0]).toMatchObject({
      isActive: false,
      status: 'suspended',
    });
    expect(res.data.isActive).toBe(false);
  });

  it('will not touch a non-staff account through the staff routes', async () => {
    const customer = { id: 'u-c', role: 'CUSTOMER' };
    const { ctrl } = build([], [customer]);
    await expect(
      ctrl.updateStaff(req(superAdmin), 'u-c', { isActive: false } as any),
    ).rejects.toThrow(NotFoundException);
  });

  it('never returns a password hash or a stored phone in the staff list', async () => {
    const row = {
      id: 'u1',
      email: 'a@kartseek.com',
      role: 'ADMIN',
      passwordHash: '$2b$12$notasecretbutlooksliketone',
      phone: 'enc:+9715000',
      adminRoleId: 'r-reg',
      isActive: true,
    };
    const { ctrl } = build([regionalRole], [row]);
    const res = await ctrl.listStaff(req(superAdmin), 1, 20, undefined, undefined, undefined);
    const body = JSON.stringify(res);
    expect(body).not.toContain('$2b$12$notasecretbutlooksliketone');
    expect(body).not.toContain('enc:+9715000');
    expect(res.data[0]).toMatchObject({ id: 'u1', email: 'a@kartseek.com' });
  });
});

describe('CreateStaffDto', () => {
  const valid = {
    email: 'a@kartseek.com',
    firstName: 'A',
    lastName: 'B',
    role: 'ADMIN',
    adminRoleId: '5a9e1a0e-6f2b-4a5b-9c3d-1e2f3a4b5c6d',
  };
  const errorsFor = async (patch: object) =>
    (await validate(plainToInstance(CreateStaffDto, { ...valid, ...patch }))).map(
      (e) => e.property,
    );

  it('accepts a complete staff record', async () => {
    expect(await errorsFor({})).toEqual([]);
  });

  it('requires an email — the second factor is delivered there', async () => {
    expect(await errorsFor({ email: undefined })).toContain('email');
    expect(await errorsFor({ email: 'not-an-email' })).toContain('email');
  });

  it('refuses SUPER_ADMIN and any non-staff role', async () => {
    expect(await errorsFor({ role: 'SUPER_ADMIN' })).toContain('role');
    expect(await errorsFor({ role: 'CUSTOMER' })).toContain('role');
    expect(await errorsFor({ role: 'FINANCE_MANAGER' })).toEqual([]);
  });

  it('requires a uuid admin role and a two-letter market', async () => {
    expect(await errorsFor({ adminRoleId: 'r-reg' })).toContain('adminRoleId');
    expect(await errorsFor({ regionCode: 'UAE' })).toContain('regionCode');
    expect(await errorsFor({ regionCode: 'AE' })).toEqual([]);
  });
});
