import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * KARTSEEK — schema for the grocery vertical
 *
 * A follow-up to `VerticalModuleSchemas1786500000000`, which created the
 * restaurant, pharmacy, doctor, hotel and taxi schemas but missed this one.
 *
 * Grocery was overlooked because it was the one vertical still answering 200 —
 * the handful of endpoints being spot-checked did not reach the database, so it
 * looked healthy while `grocery-service` was in fact configured against a schema
 * that had never existed. Aligning its TypeORM `synchronize` with the other
 * verticals made the gap immediate: the service now fails to boot with
 * `QueryFailedError: schema "grocery" does not exist` instead of starting and
 * failing later, per query, in a way the old fallbacks would have hidden.
 *
 * Separate migration rather than an edit to the previous one: that migration has
 * already been applied, and rewriting applied history would leave environments
 * that ran it disagreeing with environments that did not.
 *
 * Same scope as its predecessor — schema only. In development each service's
 * `synchronize` builds its own tables; production needs generated DDL per
 * vertical, in the style of `1785840000000-WalletAndPayoutSchemas`.
 */
export class GrocerySchema1786500100000 implements MigrationInterface {
  name = 'GrocerySchema1786500100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "grocery"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // RESTRICT so a rollback fails loudly rather than dropping real grocery data
    // as a side effect of reverting a schema stub.
    await queryRunner.query(`DROP SCHEMA IF EXISTS "grocery" RESTRICT`);
  }
}
