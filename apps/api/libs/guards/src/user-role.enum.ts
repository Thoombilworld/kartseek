/**
 * UserRole — Canonical role enum used across the entire platform.
 *
 * All @Roles() decorators, JWT payloads, and role checks MUST use these
 * values (uppercase). The RolesGuard performs case-insensitive comparison
 * to handle legacy tokens that may contain lowercase values.
 */
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  FRANCHISE_ADMIN = 'FRANCHISE_ADMIN',
  SELLER = 'SELLER',
  DRIVER = 'DRIVER',
  CUSTOMER = 'CUSTOMER',
}

/**
 * Helper to normalize a role string to the canonical enum value.
 * Handles legacy lowercase values like 'admin', 'super_admin', 'seller'.
 */
export function normalizeRole(role: string): UserRole | undefined {
  const upper = role?.toUpperCase();
  return Object.values(UserRole).find((r) => r === upper);
}
