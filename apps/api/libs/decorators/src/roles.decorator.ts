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
 * Requires RolesGuard to be active (registered globally in main.ts).
 * The guard reads this metadata and compares against req.user.role.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
