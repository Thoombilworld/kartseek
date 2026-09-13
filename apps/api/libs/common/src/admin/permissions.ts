/**
 * The admin console's permission vocabulary, declared once on the server.
 *
 * These keys used to exist only as a `const allPermissions` array inside
 * `apps/web/src/app/admin/roles/page.tsx`. Nothing on the server had ever
 * heard of them, so a role "granting" `finance.payouts` granted nothing: the
 * grid was a drawing. Moving the list here makes it the contract that
 * `admin.admin_roles.permissions` is validated against, and a later task signs
 * an assigned role's keys into the token so `perm:` checks can read them.
 *
 * `group` is what the console groups its checkbox grid by, and `label` is what
 * it prints — both are served from `GET /admin/roles` so the page renders the
 * server's vocabulary rather than its own copy of it.
 *
 * `'*'` is not a key. It is the wildcard SUPER_ADMIN carries, accepted by the
 * validator and by nothing else.
 */
export interface AdminPermission {
  key: string;
  label: string;
  group: string;
}

export const ADMIN_PERMISSIONS: ReadonlyArray<AdminPermission> = [
  // Dashboard
  { key: 'dashboard.view', label: 'View Dashboard', group: 'Dashboard' },
  // Users
  { key: 'users.view', label: 'View Users', group: 'Users' },
  { key: 'users.manage', label: 'Manage Users', group: 'Users' },
  { key: 'users.delete', label: 'Delete Users', group: 'Users' },
  // Sellers
  { key: 'sellers.view', label: 'View Sellers', group: 'Sellers' },
  { key: 'sellers.manage', label: 'Manage Sellers', group: 'Sellers' },
  { key: 'sellers.approve', label: 'Approve Sellers', group: 'Sellers' },
  // Orders
  { key: 'orders.view', label: 'View Orders', group: 'Orders' },
  { key: 'orders.manage', label: 'Manage Orders', group: 'Orders' },
  { key: 'orders.refund', label: 'Process Refunds', group: 'Orders' },
  // Finance
  { key: 'finance.view', label: 'View Financials', group: 'Finance' },
  { key: 'finance.payouts', label: 'Process Payouts', group: 'Finance' },
  { key: 'finance.reports', label: 'Export Reports', group: 'Finance' },
  // KYC
  { key: 'kyc.view', label: 'View KYC', group: 'KYC' },
  { key: 'kyc.approve', label: 'Approve KYC', group: 'KYC' },
  // Content
  { key: 'content.view', label: 'View Content', group: 'Content' },
  { key: 'content.manage', label: 'Manage Content', group: 'Content' },
  { key: 'promotions.manage', label: 'Manage Promotions', group: 'Content' },
  // System
  { key: 'system.settings', label: 'System Settings', group: 'System' },
  { key: 'system.health', label: 'System Health', group: 'System' },
  { key: 'audit.logs', label: 'Audit Logs', group: 'System' },
  { key: 'security.manage', label: 'Manage Security Controls', group: 'System' },
  // Franchise
  { key: 'franchise.view', label: 'View Franchises', group: 'Franchise' },
  { key: 'franchise.manage', label: 'Manage Franchises', group: 'Franchise' },
  // Delivery
  { key: 'delivery.view', label: 'View Delivery Ops', group: 'Delivery' },
  { key: 'delivery.manage', label: 'Manage Delivery', group: 'Delivery' },
  // Support
  { key: 'support.view', label: 'View Support Tickets', group: 'Support' },
  { key: 'support.respond', label: 'Respond to Tickets', group: 'Support' },
  // Modules
  { key: 'modules.marketplace', label: 'Marketplace Module', group: 'Modules' },
  { key: 'modules.grocery', label: 'Grocery Module', group: 'Modules' },
  { key: 'modules.restaurant', label: 'Restaurant Module', group: 'Modules' },
  { key: 'modules.pharmacy', label: 'Pharmacy Module', group: 'Modules' },
  { key: 'modules.doctor', label: 'Doctor Module', group: 'Modules' },
  { key: 'modules.hotel', label: 'Hotel Module', group: 'Modules' },
  { key: 'modules.taxi', label: 'Taxi Module', group: 'Modules' },
  // Staff
  { key: 'staff.view', label: 'View Staff', group: 'Staff' },
  { key: 'staff.manage', label: 'Manage Staff', group: 'Staff' },
  { key: 'staff.invite', label: 'Invite Staff', group: 'Staff' },
  // Loyalty
  { key: 'loyalty.config', label: 'Manage Loyalty Configuration', group: 'Loyalty' },
  { key: 'loyalty.adjust', label: 'Adjust User Points', group: 'Loyalty' },
  { key: 'loyalty.view', label: 'View Loyalty Analytics', group: 'Loyalty' },
  // Wallet
  { key: 'wallet.audit', label: 'View Wallet Transactions', group: 'Wallet' },
  { key: 'wallet.adjust', label: 'Adjust Wallet Balance', group: 'Wallet' },
  { key: 'wallet.freeze', label: 'Freeze/Unfreeze Wallets', group: 'Wallet' },
];

/** The wildcard SUPER_ADMIN holds. Never a key in its own right. */
export const ALL_PERMISSIONS = '*';

export interface SystemRole {
  key: string;
  name: string;
  description: string;
  permissions: string[];
}

/**
 * The roles the migration seeds, spelled in TypeScript.
 *
 * These must equal what a fresh database actually ends up holding:
 * the `INSERT` in `apps/api/migrations/1786501800000-AdminRoles.ts`, plus every
 * later migration that grants a key to a seeded role.
 * `permissions.spec.ts` parses both and compares the resulting sets, because
 * two copies of a permission set that are allowed to drift are worse than one
 * copy in the wrong place — and because comparing against the seed alone is
 * what let R12's `regional_admin` grant look applied while no provisioned
 * database had ever received it (review C2).
 *
 * A system role cannot be deleted, and `super_admin` cannot be edited: an
 * operator who could narrow it could lock every administrator out of the
 * platform from a web form.
 */
export const SYSTEM_ROLES: ReadonlyArray<SystemRole> = [
  {
    key: 'super_admin',
    name: 'Super Admin',
    description: 'Global control of every module, market and setting',
    permissions: [ALL_PERMISSIONS],
  },
  {
    key: 'admin',
    name: 'Admin',
    description: 'Platform operations across every market',
    permissions: [
      'dashboard.view',
      'orders.view',
      'orders.manage',
      'orders.refund',
      'users.view',
      'users.manage',
      'sellers.view',
      'sellers.manage',
      'sellers.approve',
      'finance.view',
      'finance.payouts',
      'finance.reports',
      'kyc.view',
      'kyc.approve',
      'content.view',
      'content.manage',
      'promotions.manage',
      'system.health',
      'audit.logs',
      'franchise.view',
      'franchise.manage',
      'delivery.view',
      'delivery.manage',
      'support.view',
      'support.respond',
      'staff.view',
      'wallet.audit',
      'loyalty.view',
      'modules.marketplace',
      'modules.grocery',
      'modules.restaurant',
      'modules.pharmacy',
      'modules.doctor',
      'modules.hotel',
      'modules.taxi',
    ],
  },
  {
    key: 'regional_admin',
    name: 'Regional Admin',
    description: 'Everything an Admin can do, inside one market',
    // No `franchise.manage`, `system.health`: franchises and platform health
    // are global entities, and the market lock is enforced separately
    // (guards/market-scope.ts) — this list is the second half of the same
    // rule, not a substitute for it.
    //
    // `staff.view`/`staff.manage` DO belong here now: staff are global as a
    // DIRECTORY but regional as RECORDS (audit F-31, R12) — all three staff
    // routes narrow to the caller's own market in the handler, the same way
    // every other list above does, and rank bounds what a regional admin may
    // then write (`ROLE_RANK` in `admin-access.controller.ts`); the seven role
    // routes stay SUPER_ADMIN-only regardless of this key.
    //
    // They are LAST in this array on purpose. An existing database receives
    // them from `1786502400000-RegionalAdminStaffPermissions`, which appends
    // rather than replacing so an operator's own edits to this role survive —
    // and `permissions.spec.ts` compares the ORDER a fresh database ends up
    // with against this list, so "seeded, then appended" has to read the same
    // here as it does in Postgres.
    permissions: [
      'dashboard.view',
      'orders.view',
      'orders.manage',
      'orders.refund',
      'users.view',
      'users.manage',
      'sellers.view',
      'sellers.manage',
      'sellers.approve',
      'finance.view',
      'finance.payouts',
      'finance.reports',
      'kyc.view',
      'kyc.approve',
      'content.view',
      'content.manage',
      'promotions.manage',
      'audit.logs',
      'franchise.view',
      'delivery.view',
      'delivery.manage',
      'support.view',
      'support.respond',
      'wallet.audit',
      'loyalty.view',
      'modules.marketplace',
      'modules.grocery',
      'modules.restaurant',
      'modules.pharmacy',
      'modules.doctor',
      'modules.hotel',
      'modules.taxi',
      // Appended by 1786502400000-RegionalAdminStaffPermissions — see above.
      'staff.view',
      'staff.manage',
    ],
  },
  {
    key: 'finance_manager',
    name: 'Finance Manager',
    description: 'Payouts, commissions, refunds and financial reports',
    permissions: [
      'dashboard.view',
      'orders.view',
      'orders.refund',
      'finance.view',
      'finance.payouts',
      'finance.reports',
      'wallet.audit',
      'audit.logs',
    ],
  },
  {
    key: 'support_agent',
    name: 'Support Agent',
    description: 'Customer and seller support, read-only elsewhere',
    permissions: [
      'dashboard.view',
      'orders.view',
      'users.view',
      'sellers.view',
      'support.view',
      'support.respond',
      'kyc.view',
    ],
  },
  {
    key: 'product_manager',
    name: 'Product Manager',
    description: 'Catalogue, content and promotions',
    permissions: [
      'dashboard.view',
      'sellers.view',
      'content.view',
      'content.manage',
      'promotions.manage',
      'modules.marketplace',
      'modules.grocery',
    ],
  },
];

/** Permission keys that are not in the vocabulary. Empty means all are known. */
export function unknownPermissionKeys(permissions: readonly string[]): string[] {
  const known = new Set(ADMIN_PERMISSIONS.map((p) => p.key));
  return permissions.filter((p) => p !== ALL_PERMISSIONS && !known.has(p));
}

/**
 * Does this caller hold a permission key?
 *
 * One implementation, because there were about to be two with different
 * answers. `RolesGuard` decides `perm:` requirements this way — the wildcard,
 * then exact membership of the signed `adminPermissions` claim — and the health
 * board needs the same verdict without being able to use the guard: its routes
 * are `@Public()` and must answer an unpermitted caller with a *reduced body*
 * rather than 403, because a readiness probe that can fail authorisation is a
 * probe that restarts healthy pods.
 *
 * A claim that is absent, or is not an array, holds nothing. That is the
 * direction that fails closed: `undefined` means "this token was not minted for
 * a member of staff", not "no restrictions were specified".
 */
export function hasPermission(user: unknown, key: string): boolean {
  const granted = (user as { adminPermissions?: unknown })?.adminPermissions;
  if (!Array.isArray(granted)) return false;
  return granted.includes(ALL_PERMISSIONS) || granted.includes(key);
}
