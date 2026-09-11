/** The roles that may open the admin console. Mirrors UserRole in @app/common. */
export const STAFF_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'SUPPORT_AGENT',
  'FINANCE_MANAGER',
  'PRODUCT_MANAGER',
] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export function isStaffRole(role: unknown): role is StaffRole {
  return (
    typeof role === 'string' && (STAFF_ROLES as readonly string[]).includes(role.toUpperCase())
  );
}
