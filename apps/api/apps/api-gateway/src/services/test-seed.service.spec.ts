import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestSeedService } from './test-seed.service';
import { UserRole } from '@app/common';

/**
 * The seed mints working credentials. Which accounts it is willing to mint is
 * therefore a security decision, not a convenience one — a SUPER_ADMIN with a
 * literal shared password must not appear just because an environment is
 * "not production".
 */
function service(): TestSeedService {
  return new TestSeedService({} as any, {} as any, {} as any);
}

const SUPER_ADMIN_EMAIL = 'superadmin@kartseek.com';

describe('TestSeedService.seededUsers', () => {
  const FLAG = process.env.SEED_SUPER_ADMIN;

  beforeEach(() => {
    delete process.env.SEED_SUPER_ADMIN;
  });
  afterEach(() => {
    if (FLAG === undefined) delete process.env.SEED_SUPER_ADMIN;
    else process.env.SEED_SUPER_ADMIN = FLAG;
  });

  it('omits the SUPER_ADMIN account when SEED_SUPER_ADMIN is unset', () => {
    const emails = service()
      .seededUsers()
      .map((u) => u.email);
    expect(emails).not.toContain(SUPER_ADMIN_EMAIL);
    expect(
      service()
        .seededUsers()
        .some((u) => u.role === UserRole.SUPER_ADMIN),
    ).toBe(false);
  });

  it.each(['false', '0', 'yes', 'TRUE', ''])(
    'omits it for SEED_SUPER_ADMIN=%j — only the exact string "true" opts in',
    (value) => {
      process.env.SEED_SUPER_ADMIN = value;
      expect(
        service()
          .seededUsers()
          .map((u) => u.email),
      ).not.toContain(SUPER_ADMIN_EMAIL);
    },
  );

  it('includes it when SEED_SUPER_ADMIN=true', () => {
    process.env.SEED_SUPER_ADMIN = 'true';
    const seeded = service().seededUsers();
    expect(seeded.map((u) => u.email)).toContain(SUPER_ADMIN_EMAIL);
    expect(seeded.find((u) => u.email === SUPER_ADMIN_EMAIL)?.role).toBe(UserRole.SUPER_ADMIN);
  });

  it('never gates the ordinary test accounts on the flag', () => {
    const withoutFlag = service()
      .seededUsers()
      .map((u) => u.email);
    process.env.SEED_SUPER_ADMIN = 'true';
    const withFlag = service()
      .seededUsers()
      .map((u) => u.email);
    expect(withFlag.filter((e) => e !== SUPER_ADMIN_EMAIL)).toEqual(withoutFlag);
    expect(withoutFlag).toContain('admin@kartseek.com');
    expect(withoutFlag).toContain('qa-admin@kartseek.com');
  });

  it('assigns an admin role key to every staff account it seeds', () => {
    process.env.SEED_SUPER_ADMIN = 'true';
    for (const u of service().seededUsers()) {
      const isStaff = [UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(u.role);
      expect({ email: u.email, hasRoleKey: Boolean(u.adminRoleKey) }).toEqual({
        email: u.email,
        hasRoleKey: isStaff,
      });
    }
  });
});
