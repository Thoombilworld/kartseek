import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * KARTSEEK — the seeded `regional_admin` role gains `staff.view` / `staff.manage`.
 *
 * R12 made staff **regional as records**: `GET /admin/staff`,
 * `POST /admin/staff` and `PATCH /admin/staff/:id` admit a region-locked admin,
 * narrowed to their own market. The gateway's `RolesGuard` is role **AND**
 * permission, so those routes are only reachable by an account whose assigned
 * role actually carries the two staff keys — and the seeded `regional_admin`
 * row carried neither, by design, under the older "staff is always global,
 * always refused" model.
 *
 * ── Why this is a new file and not an edit to the seed ───────────────────────
 *
 * The first attempt added the two keys to the `INSERT` in
 * `1786501800000-AdminRoles.ts`. That migration has already run everywhere, so
 * TypeORM will not run it again — and its seed ends in
 * `ON CONFLICT ("key") DO NOTHING`, so even a re-run would leave the existing
 * row untouched. Nothing reconciles `SYSTEM_ROLES` into the database at boot.
 * The effect was that every already-provisioned regional admin still answered
 * `Missing required permissions: staff.view` on the headline route, while the
 * repository looked correct and the drift spec stayed green (review C2). A
 * permission change is a data change: it needs a migration of its own.
 *
 * ── Why it appends rather than replaces ─────────────────────────────────────
 *
 * `admin.admin_roles.permissions` is operator-editable (`PATCH /admin/roles/:id`
 * refuses only `super_admin`), so a deployment may legitimately have narrowed
 * or extended `regional_admin` already. Writing the whole array from here would
 * silently discard that. One guarded `array_append` per key adds exactly what
 * is missing, is a no-op on a row that already has it — so it is safe to run
 * against a fresh database that seeded the keys from a later version of the
 * seed as well as against every existing one — and converges both to the same
 * value, which is what `permissions.spec.ts` now asserts.
 *
 * `down()` removes the same two keys and nothing else. It is a real revert,
 * not a comment: after it, `regional_admin` holds what the seed gave it.
 */
export class RegionalAdminStaffPermissions1786502400000 implements MigrationInterface {
  name = 'RegionalAdminStaffPermissions1786502400000';

  /** Appended in this order, and in this order in `SYSTEM_ROLES` too. */
  private static readonly KEYS = ['staff.view', 'staff.manage'] as const;

  public async up(q: QueryRunner): Promise<void> {
    for (const key of RegionalAdminStaffPermissions1786502400000.KEYS) {
      await q.query(
        `UPDATE "admin"."admin_roles"
            SET "permissions" = array_append("permissions", $1), "updated_at" = now()
          WHERE "key" = 'regional_admin'
            AND NOT ($1 = ANY("permissions"))`,
        [key],
      );
    }
    // Named rather than assumed: a deployment with no `regional_admin` row (one
    // that predates the seed, or where an operator deleted it) gets no keys and
    // no error, and the log is the only place that difference is visible.
    const [row]: Array<{ permissions: string[] } | undefined> = await q.query(
      `SELECT "permissions" FROM "admin"."admin_roles" WHERE "key" = 'regional_admin'`,
    );
    if (!row) {
      console.warn(
        '[RegionalAdminStaffPermissions] WARN no regional_admin role row in this database; ' +
          'nothing to grant. A regional admin provisioned later takes the keys from the seed.',
      );
    } else {
      console.log(
        `[RegionalAdminStaffPermissions] regional_admin now holds ${row.permissions.length} ` +
          `permission(s), staff.view/staff.manage included.`,
      );
    }
  }

  public async down(q: QueryRunner): Promise<void> {
    for (const key of RegionalAdminStaffPermissions1786502400000.KEYS) {
      await q.query(
        `UPDATE "admin"."admin_roles"
            SET "permissions" = array_remove("permissions", $1), "updated_at" = now()
          WHERE "key" = 'regional_admin'`,
        [key],
      );
    }
  }
}
