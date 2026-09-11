import type { AuthUser } from '../contexts/auth-context';
import type { AuthApiUser } from '../api-endpoints';
import { isStaffRole, type StaffRole } from './staff-roles';

export interface StaffSessionUser extends AuthApiUser {
  regionCode?: string | null;
  regionLocked?: boolean;
  adminPermissions?: string[];
  adminRole?: { id: string; name: string } | null;
}

const ROLE_LABEL: Record<StaffRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  SUPPORT_AGENT: 'Support Agent',
  FINANCE_MANAGER: 'Finance Manager',
  PRODUCT_MANAGER: 'Product Manager',
};

/**
 * The console user, built only from what the API signed. The old
 * `makeAdminUser` stamped every login as SUPER_ADMIN with permissions from a
 * demo table shipped to the browser; the shell then hid or showed actions
 * based on that fiction. Nothing here is invented: role, market lock and
 * permissions are the token's, and labels are derived from them.
 */
export function toAdminUser(session: { user: StaffSessionUser }): AuthUser {
  const u = session.user;
  const role = String(u.role ?? '').toUpperCase();
  if (!isStaffRole(role)) throw new Error('This account does not have admin access.');
  const regionLocked = u.regionLocked === true;
  const permissions =
    role === 'SUPER_ADMIN'
      ? ['*']
      : Array.isArray(u.adminPermissions)
        ? u.adminPermissions
        : // Transitional until B4 signs the claim: an ADMIN without one keeps the
          // full console rather than an empty sidebar.
          role === 'ADMIN'
          ? ['*']
          : [];
  return {
    id: u.id,
    name: u.name ?? u.email,
    email: u.email,
    phone: u.phone,
    role: role as AuthUser['role'],
    isVerified: true,
    regionCode: u.regionCode ?? undefined,
    regionLocked,
    adminRoleId: u.adminRole?.id,
    adminRoleName: u.adminRole?.name ?? (regionLocked ? 'Regional Admin' : ROLE_LABEL[role]),
    adminPermissions: permissions,
  };
}
