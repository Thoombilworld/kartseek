import { isStaffRole, STAFF_ROLES } from '@/auth/staff-roles';
import { toAdminUser } from '@/auth/admin-session';

describe('staff roles', () => {
  it('names exactly the five staff roles', () => {
    expect([...STAFF_ROLES]).toEqual([
      'SUPER_ADMIN',
      'ADMIN',
      'SUPPORT_AGENT',
      'FINANCE_MANAGER',
      'PRODUCT_MANAGER',
    ]);
  });
  it('accepts lower-case wire values and rejects everything else', () => {
    expect(isStaffRole('admin')).toBe(true);
    expect(isStaffRole('customer')).toBe(false);
    expect(isStaffRole(undefined)).toBe(false);
  });
  it('pins every gate that decides console access: all five staff roles pass, customer and seller do not', () => {
    for (const role of STAFF_ROLES) {
      expect(isStaffRole(role)).toBe(true);
      expect(isStaffRole(role.toLowerCase())).toBe(true);
    }
    expect(isStaffRole('customer')).toBe(false);
    expect(isStaffRole('seller')).toBe(false);
  });
});

describe('toAdminUser', () => {
  const base = { id: 'u1', email: 'qa-admin@kartseek.com', name: 'Qatar Admin', role: 'admin' };

  it('keeps the token role instead of stamping SUPER_ADMIN', () => {
    expect(toAdminUser({ user: base }).role).toBe('ADMIN');
    expect(toAdminUser({ user: { ...base, role: 'super_admin' } }).role).toBe('SUPER_ADMIN');
  });
  it('carries the market lock and labels a locked admin as regional', () => {
    const u = toAdminUser({ user: { ...base, regionCode: 'QA', regionLocked: true } });
    expect(u.regionCode).toBe('QA');
    expect(u.regionLocked).toBe(true);
    expect(u.adminRoleName).toBe('Regional Admin');
  });
  it('takes permissions from the session, with a wildcard only for SUPER_ADMIN', () => {
    expect(
      toAdminUser({ user: { ...base, adminPermissions: ['orders.view'] } }).adminPermissions,
    ).toEqual(['orders.view']);
    expect(toAdminUser({ user: { ...base, role: 'super_admin' } }).adminPermissions).toEqual(['*']);
  });
  it('grants an ADMIN with no claim nothing at all', () => {
    // The transitional branch that handed ADMIN a wildcard is gone: the API
    // signs `adminPermissions` for every staff account now, so an absent claim
    // is a real answer — and a sidebar full of links that answer 403 is worse
    // than a short one.
    expect(toAdminUser({ user: base }).adminPermissions).toEqual([]);
    expect(toAdminUser({ user: { ...base, role: 'finance_manager' } }).adminPermissions).toEqual(
      [],
    );
  });
  it('never invents 2FA state', () => {
    expect(toAdminUser({ user: base }).twoFactorEnabled).toBeUndefined();
  });
});
