import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * KARTSEEK — the remaining service schemas
 *
 * Completes what `VerticalModuleSchemas1786500000000` and `GrocerySchema` began.
 * Those two were written from the list of verticals that were visibly failing;
 * this one is written from the code instead — every schema any service declares,
 * diffed against `information_schema.schemata`.
 *
 * Declared but never created: admin, commission, delivery, payment, refund,
 * report, user, franchise and location. `franchise` and `location` were missed
 * by the earlier sweep because they do not use a literal `schema:` option — they
 * declare theirs through `DatabaseModule.registerPostgres([...], 'franchise')`,
 * which a grep for `schema:` does not find. That is how `franchise` reached the
 * point of answering `relation "franchise.franchises" does not exist` on its
 * dashboard while looking like it had simply returned nothing.
 *
 * Same scope as its predecessors: **schemas only**. Development builds tables
 * from entities via each service's `synchronize`; production needs generated DDL
 * per service, as in `1785840000000-WalletAndPayoutSchemas`.
 */
export class RemainingServiceSchemas1786500200000 implements MigrationInterface {
  name = 'RemainingServiceSchemas1786500200000';

  private static readonly SCHEMAS = [
    'admin',
    'commission',
    'delivery',
    'payment',
    'refund',
    'report',
    'user',
    'franchise',
    'location',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const schema of RemainingServiceSchemas1786500200000.SCHEMAS) {
      await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // RESTRICT, so a rollback fails rather than silently dropping a service's
    // data if tables have been created since.
    for (const schema of [...RemainingServiceSchemas1786500200000.SCHEMAS].reverse()) {
      await queryRunner.query(`DROP SCHEMA IF EXISTS "${schema}" RESTRICT`);
    }
  }
}
