import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * KARTSEEK — the actor and the moment behind a vendor suspension (M7).
 *
 * Six of the seven admin commands M7 implements could be answered from columns
 * that already exist: `taxi_vendors`, `taxi_drivers` and `taxi_payout_records`
 * each carry `countryCode` (this module's spelling of the market), and each of
 * the three APPROVALS already had an `approvedBy` / `approvedAt` pair to record
 * who took the decision and when.
 *
 * `admin.taxi.suspendVendor` is the seventh, and it had nowhere to write the
 * actor. `VendorManagementService.suspendVendor(vendorId, adminId, reason)`
 * accepted an `adminId`, used it for a log line, and stored only the reason —
 * so a fleet operator could be taken off the road with a record of WHY and no
 * record of WHO. That is the same gap M6 closed on `doctors.verifiedBy` and M5
 * on `hotels.suspendedBy`, and it is the one piece of storage this task needs.
 *
 * Two columns, on one table:
 *
 *   • `taxi_vendors.suspendedBy`  — the administrator, from the verified token
 *   • `taxi_vendors.suspendedAt`  — when the decision was taken
 *
 * They are the exact mirror of the `approvedBy` / `approvedAt` pair beside them,
 * deliberately: a reviewer reading the row should not have to learn a second
 * convention to answer the same question about the opposite decision.
 *
 * ── No market column is added, and none is needed ───────────────────────────
 *
 * `taxi_vendors.countryCode`, `taxi_drivers.countryCode` and
 * `taxi_payout_records.countryCode` are all NOT NULL `varchar(5)` already, and
 * every scope check in this module reads them (the register of modules that
 * spell the market `countryCode` rather than `region_code` is in
 * `libs/common/src/market/market-scope.ts`). Taxi is the one vertical in this
 * plan that never needed a market column added.
 *
 * ── Idempotent throughout ───────────────────────────────────────────────────
 *
 * `ADD COLUMN IF NOT EXISTS`, because this module's tables may already have
 * been created by `synchronize` on a developer machine before the runner
 * existed — the starting-state problem `DropDeadMarketColumns` documents, where
 * all three of its columns had already been dropped by a sync engine before it
 * first ran. `hasTable` skips with a warning rather than failing when the table
 * is not in this database at all, so the same file can run against the shared
 * `kartseek_db` and the dedicated `kartseek_taxi` without a branch.
 *
 * ── `down()` ────────────────────────────────────────────────────────────────
 *
 * Drops the two columns. Reverting this discards the suspension audit trail it
 * recorded; it is a schema rollback, not a data one.
 */
export class TaxiAdminApprovals1786503400000 implements MigrationInterface {
  name = 'TaxiAdminApprovals1786503400000';

  /** Whether a table this migration means to extend is in this database at all. */
  private async hasTable(q: QueryRunner, table: string): Promise<boolean> {
    const [{ exists }] = await q.query(`SELECT to_regclass('${table}') IS NOT NULL AS exists`);
    if (!exists) console.warn(`[TaxiAdminApprovals] ${table} is not in this database; skipping.`);
    return Boolean(exists);
  }

  public async up(q: QueryRunner): Promise<void> {
    if (!(await this.hasTable(q, 'taxi.taxi_vendors'))) return;

    await q.query(`
      ALTER TABLE "taxi"."taxi_vendors"
        ADD COLUMN IF NOT EXISTS "suspendedBy" character varying,
        ADD COLUMN IF NOT EXISTS "suspendedAt" TIMESTAMP WITH TIME ZONE
    `);
    await q.query(
      `COMMENT ON COLUMN "taxi"."taxi_vendors"."suspendedBy" IS 'Administrator who suspended this vendor, from the verified token'`,
    );
    await q.query(
      `COMMENT ON COLUMN "taxi"."taxi_vendors"."suspendedAt" IS 'When the suspension decision was taken'`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    if (!(await this.hasTable(q, 'taxi.taxi_vendors'))) return;

    await q.query(`
      ALTER TABLE "taxi"."taxi_vendors"
        DROP COLUMN IF EXISTS "suspendedAt",
        DROP COLUMN IF EXISTS "suspendedBy"
    `);
  }
}
