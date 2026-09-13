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
 * For permission-based access, use the string prefix 'perm:':
 *   @Roles(UserRole.ADMIN, 'perm:orders.manage')
 *
 * Requires `RolesGuard` (`@app/guards`) to be bound on the route or controller.
 *
 * ── Why the argument type is `UserRole | string` ────────────────────────────
 *
 * There were two of these decorators — this one, typed `UserRole[]`, and the
 * gateway's, typed `(UserRole | string)[]` — paired with two guards that read
 * the same `'roles'` metadata key and disagreed about what it means. A
 * `perm:` key was inert under one and a real narrowing under the other, and
 * `libs/gdpr` was bound to the inert pair while carrying `perm:` keys on three
 * personal-data routes (review I2/I3). This file is now the only one, with the
 * wider type, so a permission key cannot be silently dropped by whichever
 * import a controller happened to reach for.
 */
export const Roles = (...roles: (UserRole | string)[]) => SetMetadata(ROLES_KEY, roles);
