import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * KARTSEEK — a market column on the money path.
 *
 * Admin routes over payouts, refunds, wallet transactions, commission rows and
 * settlement records fail closed for a region-locked admin — correct while
 * those rows carry no market, and wrong as a design, because every one of them
 * descends from an order or a seller that has one (2026-09-12 audit §3(b) /
 * AUD2-089). `seller_wallets` is already predicated through `sellers.regionCode`
 * on the marketplace-service side while the payout routes beside it refuse, so
 * "a seller's spendable money" has two answers depending on which route you ask
 * (AUD2-086 / I12).
 *
 * `region_code` varchar(2), ISO-2, NULL = not yet attributed — the platform's
 * one spelling (I7). `is_global` is deliberately NOT added here: money always
 * belongs to a market, and a payout that runs "in every market" is not a thing.
 *
 * Backfilled from the owning seller. Rows that cannot be attributed keep NULL
 * and stay refused, which is the behaviour they have today — this migration
 * widens what a regional admin can see, and narrows nothing.
 *
 * ── Two tables, not five: what the brief expected and what is actually there ─
 *
 * The plan named five tables. Three of them do not exist, and adding a column
 * to a table that is not there is not a schema change, it is a lie in a ledger:
 *
 *   • `refund.refunds` — there is no `refund` schema. `RefundServiceModule`
 *     imports `RedisModule` and no `TypeOrmModule` at all, so a refund is a
 *     Redis key with a 30-day TTL and there is no row to attribute. The refund
 *     routes stay `refuseLockedAdmin`.
 *   • `commission.commission_records` — same shape: `CommissionServiceModule`
 *     has no TypeORM import and commission records live in Redis. The
 *     commission routes stay `refuseLockedAdmin`.
 *   • `payment.settlement_records` — exists, and **already carries the market**
 *     as `countryCode varchar(2) NOT NULL`, indexed, and
 *     `settlement-engine.service.ts` already predicates on it. Adding
 *     `region_code` beside it would create exactly the dead second column that
 *     F-35 records on `restaurants` and `pharmacy_stores`: two market columns,
 *     one written, both readable, and no way to tell from the schema which the
 *     scope check honours. Settlements are `countryCode`, recorded as an I7
 *     exception rather than duplicated.
 *
 * That leaves the two tables that genuinely have no market and genuinely have a
 * parent to take one from.
 *
 * ── Why the backfill is guarded by a regex ──────────────────────────────────
 *
 * `marketplace.sellers.region_code` is not clean in dev: probe rows hold
 * `NOT-A-COUNTRY` and `<SCRIPT>ALERT(1)</SCRIPT>`. A plain `UPPER(...)` into a
 * `varchar(2)` would truncate those to `NO` and `<S` — inventing a market, and
 * `NO` is Norway. Only a genuine ISO-2 pair is copied; anything else leaves
 * NULL, which keeps the row refused rather than mis-attributed.
 */
export class MoneyPathMarket1786502200000 implements MigrationInterface {
  name = 'MoneyPathMarket1786502200000';

  /**
   * Whether a table exists in THIS database.
   *
   * Guarded because of the DataSource split. `payout.payouts` and
   * `payout.seller_wallets` were created by
   * `1785840000000-WalletAndPayoutSchemas`, which `data-source.main.ts`'s
   * classification lists under `data-source.ts` — the MARKETPLACE runner, which
   * in dev points at a different Postgres instance entirely (:5433) that has no
   * `payout` schema at all. The tables are in fact in this database, which is
   * why this migration is registered here; but a deployment that ran the two
   * runners in a different order, or a genuinely split marketplace database,
   * would reach `ALTER TABLE` on a table that is not there and fail the whole
   * migration — taking every later one with it. `ADD COLUMN IF NOT EXISTS`
   * tolerates a missing COLUMN, never a missing TABLE.
   */
  private async has(q: QueryRunner, table: string): Promise<boolean> {
    const [{ exists }] = await q.query(`SELECT to_regclass('${table}') IS NOT NULL AS exists`);
    if (!exists) {
      console.warn(
        `[MoneyPathMarket] ${table} is not in this database; skipping. If a ` +
          `region-locked admin still cannot see payouts, this is why: the table ` +
          `lives wherever the marketplace DataSource points.`,
      );
    }
    return Boolean(exists);
  }

  public async up(q: QueryRunner): Promise<void> {
    const present: string[] = [];
    for (const table of ['payout.payouts', 'payout.seller_wallets']) {
      if (!(await this.has(q, table))) continue;
      present.push(table);
      await q.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS "region_code" varchar(2)`);
    }
    if (!present.length) return;

    // Payouts: the owning seller's market. `payouts.seller_id` is varchar
    // holding the seller uuid as text, so the join casts rather than comparing
    // a uuid with a varchar (which Postgres refuses outright). Skipped when the
    // sellers table is in another database — an unattributed row stays refused,
    // which is the behaviour it has today.
    if (present.includes('payout.payouts') && (await this.has(q, 'marketplace.sellers')))
      await q.query(`
      UPDATE payout.payouts p SET "region_code" = UPPER(s.region_code)
        FROM marketplace.sellers s
       WHERE s.id::text = p.seller_id
         AND p."region_code" IS NULL
         AND s.region_code ~ '^[A-Za-z]{2}$'
    `);

    // Seller wallets: the same seller. The primary key is the quoted camel-case
    // "sellerId" this table was created with, not `seller_id`.
    if (present.includes('payout.seller_wallets') && (await this.has(q, 'marketplace.sellers')))
      await q.query(`
      UPDATE payout.seller_wallets w SET "region_code" = UPPER(s.region_code)
        FROM marketplace.sellers s
       WHERE s.id::text = w."sellerId"
         AND w."region_code" IS NULL
         AND s.region_code ~ '^[A-Za-z]{2}$'
    `);

    for (const [table, idx] of [
      ['payout.payouts', 'IDX_payouts_region_code'],
      ['payout.seller_wallets', 'IDX_seller_wallets_region_code'],
    ]) {
      if (!present.includes(table)) continue;
      await q.query(`CREATE INDEX IF NOT EXISTS "${idx}" ON ${table} ("region_code")`);
    }
  }

  public async down(q: QueryRunner): Promise<void> {
    for (const [table, idx] of [
      ['payout.payouts', 'IDX_payouts_region_code'],
      ['payout.seller_wallets', 'IDX_seller_wallets_region_code'],
    ]) {
      // Guarded in this direction too: a revert must not fail on a table that
      // was never there to alter, or the ledger and the schema disagree.
      if (!(await this.has(q, table))) continue;
      await q.query(`DROP INDEX IF EXISTS ${table.split('.')[0]}."${idx}"`);
      await q.query(`ALTER TABLE ${table} DROP COLUMN IF EXISTS "region_code"`);
    }
  }
}
