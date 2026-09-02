import { SetMetadata } from '@nestjs/common';
import { type UserRole } from '@app/common';

export const ROLES_KEY = 'roles';

/**
 * Roles decorator — restricts route access to users with the specified roles.
 *
 * Usage:
 *   @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
 *   @Roles(UserRole.SELLER)
 *
 * For permission-based access, use string prefix 'perm:':
 *   @Roles('perm:orders.manage' as any)
 *
 * Requires RolesGuard to be active (registered globally in main.ts).
 */
export const Roles = (...roles: (UserRole | string)[]) => SetMetadata(ROLES_KEY, roles);
