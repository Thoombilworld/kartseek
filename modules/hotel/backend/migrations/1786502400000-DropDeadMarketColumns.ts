import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * KARTSEEK — drop the dead second market column on `hotel.hotels`.
 *
 * This table carried TWO market columns. `countryCode` is the one every scope
 * check in this module reads; `region_code` held sub-region codes ('AE-DU', 'IN-MH') that nothing read, while
 * `countryCode` held the real ISO-2 market. Two market columns, one
 * written, both readable, and nothing in the schema to say which the scope check
 * honours — which is how a market predicate comes to be written against the
 * wrong one (2026-09-12 audit F-35 / I7/I13).
 *
 * Confirmed to have no readers before dropping: a grep over this module's
 * source matched only its own entity declaration, and the one caller-facing
 * option that could have reached it was itself dead.
 *
 * `down()` restores the column but NOT its contents. That is deliberate and is
 * the honest shape for this migration: the values were a constant that no
 * reader consumed, so re-inventing them on a revert would put fabricated market
 * data back into the table. The revert exists so the schema can be rolled back,
 * not so the dead data can be.
 */
export class DropDeadMarketColumns1786502400000 implements MigrationInterface {
  name = 'DropDeadMarketColumns1786502400000';

  private async hasTable(q: QueryRunner, table: string): Promise<boolean> {
    const [{ exists }] = await q.query(`SELECT to_regclass('${table}') IS NOT NULL AS exists`);
    if (!exists)
      console.warn(`[DropDeadMarketColumns] ${table} is not in this database; skipping.`);
    return Boolean(exists);
  }

  /**
   * Whether the column is still there.
   *
   * Not paranoia: by the time this migration was first run in dev, all three
   * columns had ALREADY been dropped — by `synchronize`, on the next boot of a
   * service whose entity no longer declared them. That is the same destructive
   * edge that emptied `marketplace.bank_offers.region_code`, and it is why
   * these runners exist. A migration that assumes its own starting state is a
   * migration that fails the moment a sync engine got there first, so the
   * count below is only taken when there is something to count.
   */
  private async hasColumn(q: QueryRunner, schema: string, table: string, column: string) {
    const [{ exists }] = await q.query(
      `SELECT COUNT(*) > 0 AS exists FROM information_schema.columns
        WHERE table_schema = '${schema}' AND table_name = '${table}'
          AND column_name = '${column}'`,
    );
    return Boolean(exists);
  }

  public async up(q: QueryRunner): Promise<void> {
    const table = 'hotel.hotels';
    if (!(await this.hasTable(q, table))) return;
    if (!(await this.hasColumn(q, 'hotel', 'hotels', 'region_code'))) {
      console.warn(
        `[DropDeadMarketColumns] ${table}."region_code" is already gone; nothing to drop.`,
      );
      return;
    }
    // Counted before the drop so the record says what was lost rather than
    // asserting that nothing was.
    const [before] = await q.query(
      `SELECT COUNT(*)::int AS rows, COUNT("region_code")::int AS populated FROM ${table}`,
    );
    console.warn(
      `[DropDeadMarketColumns] ${table}."region_code": dropping, ` +
        `${before.populated} of ${before.rows} rows populated (all with the dead value).`,
    );
    await q.query(`ALTER TABLE ${table} DROP COLUMN IF EXISTS "region_code"`);
  }

  public async down(q: QueryRunner): Promise<void> {
    const table = 'hotel.hotels';
    if (!(await this.hasTable(q, table))) return;
    await q.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS "region_code" varchar(8)`);
  }
}
