export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  SUPPORT_AGENT = 'support_agent',
  FINANCE_MANAGER = 'finance_manager',
  PRODUCT_MANAGER = 'product_manager',
  CUSTOMER = 'customer',
  SELLER = 'seller',
  RESTAURANT_SELLER = 'restaurant_seller',
  GROCERY_SELLER = 'grocery_seller',
  PHARMACY_SELLER = 'pharmacy_seller',
  PHARMACIST = 'pharmacist',
  DOCTOR = 'doctor',
  DRIVER = 'driver',
  TAXI_DRIVER = 'taxi_driver',
  DELIVERY_DRIVER = 'delivery_driver',
  DELIVERY_BOY = 'delivery_boy',
  FRANCHISE_OWNER = 'franchise_owner',
}

export const ADMIN_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.SUPPORT_AGENT,
  UserRole.FINANCE_MANAGER,
  UserRole.PRODUCT_MANAGER,
];

/**
 * The roles that sign in to the admin console — the same list as ADMIN_ROLES,
 * spelled as the wire values so it can be compared against whatever a token or
 * a `users.role` column holds. Mirrors `STAFF_ROLES` in shared-core, which is
 * the web client's half of the same contract.
 *
 * `isStaffRole` is what decides that a login must clear a second factor before
 * it gets a session, so it is deliberately case-insensitive: the enum stores
 * `super_admin` while the JWT and the console both talk in `SUPER_ADMIN`, and a
 * casing mismatch here would silently hand staff a session with no second
 * factor at all.
 */
export const STAFF_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'SUPPORT_AGENT',
  'FINANCE_MANAGER',
  'PRODUCT_MANAGER',
] as const;

export function isStaffRole(role: unknown): boolean {
  return (
    typeof role === 'string' && (STAFF_ROLES as readonly string[]).includes(role.toUpperCase())
  );
}

export const SELLER_ROLES = [
  UserRole.SELLER,
  UserRole.RESTAURANT_SELLER,
  UserRole.GROCERY_SELLER,
  UserRole.PHARMACY_SELLER,
  UserRole.DOCTOR,
];

/**
 * Which seller portal an account belongs to.
 *
 * Distinct from `UserRole` because role cannot express it: marketplace, hotel and
 * taxi sellers all carry the plain `seller` role. Stored on `users.seller_type`
 * and signed into the JWT, so the portal a seller may open is decided by the
 * backend rather than by the client.
 *
 * These values are the wire contract — the web client's `SellerType` union and
 * the seller app's `SellerRole` both map onto them.
 */
export const SELLER_TYPES = [
  'marketplace',
  'grocery',
  'restaurant',
  'pharmacy',
  'doctor',
  'hotel',
  'taxi',
  'delivery',
] as const;

export type SellerType = (typeof SELLER_TYPES)[number];

export function isSellerType(value: unknown): value is SellerType {
  return typeof value === 'string' && (SELLER_TYPES as readonly string[]).includes(value);
}

/**
 * Best-effort module for a role, used only where no explicit `seller_type` is
 * stored yet. Returns null for roles that cannot name their module on their own —
 * a plain `seller` may be marketplace, hotel or taxi, and guessing would hand a
 * seller the wrong portal.
 */
export function sellerTypeFromRole(role: string | undefined): SellerType | null {
  switch ((role ?? '').toLowerCase()) {
    case 'grocery_seller':
      return 'grocery';
    case 'restaurant_seller':
      return 'restaurant';
    case 'pharmacy_seller':
    case 'pharmacist':
      return 'pharmacy';
    case 'doctor':
      return 'doctor';
    default:
      return null;
  }
}
