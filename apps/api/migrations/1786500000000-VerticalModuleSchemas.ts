import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * KARTSEEK — schemas for the restaurant, pharmacy, doctor, hotel and taxi verticals
 *
 * Creates the five schemas those services are configured to use. None of them
 * had ever existed: `information_schema.schemata` held only `marketplace`,
 * `order`, `payout`, `wallet` and `public`, so every query those services issued
 * failed with `relation "restaurant.restaurants" does not exist`.
 *
 * Why nobody noticed: each vertical's gateway controller wrapped its calls in a
 * `send(cmd, payload, fallback)` helper that swallowed the failure and returned
 * the fallback as a 200. A storefront asking for restaurants received
 * `{ data: [], total: 0 }` and rendered "no restaurants in your area"; the
 * pharmacy catalogue rendered empty; the doctor directory rendered empty. An
 * endpoint audit scored all of them healthy, because none of them could fail.
 * Those fallbacks are gone, which is what surfaced this.
 *
 * Scope — this creates the **schemas only**, deliberately:
 *
 *  - In development each service's TypeORM `synchronize` builds its own tables
 *    from its entities, exactly as marketplace-service already does. Creating
 *    the schema is the one step `synchronize` cannot do for itself, which is why
 *    it belongs here.
 *  - For production, table DDL still has to be generated per vertical and added
 *    as its own migration, the way `WalletAndPayoutSchemas` spells out
 *    `payout.seller_wallets`. `synchronize` must stay off there: every service
 *    shares one database, and letting five of them ALTER TABLE on boot is how
 *    you lose an index nobody declared as an entity.
 *
 * `IF NOT EXISTS` throughout, so this is safe to re-run and safe on an
 * environment where an operator has already created one of them by hand.
 */
export class VerticalModuleSchemas1786500000000 implements MigrationInterface {
  name = 'VerticalModuleSchemas1786500000000';

  private static readonly SCHEMAS = ['restaurant', 'pharmacy', 'doctor', 'hotel', 'taxi'];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const schema of VerticalModuleSchemas1786500000000.SCHEMAS) {
      await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // RESTRICT, not CASCADE: if a vertical has since been given real tables and
    // real rows, reverting this migration must fail loudly rather than drop a
    // module's entire dataset as a side effect of rolling back a schema stub.
    for (const schema of [...VerticalModuleSchemas1786500000000.SCHEMAS].reverse()) {
      await queryRunner.query(`DROP SCHEMA IF EXISTS "${schema}" RESTRICT`);
    }
  }
}
