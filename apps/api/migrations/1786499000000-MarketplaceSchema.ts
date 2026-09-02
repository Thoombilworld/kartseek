import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * KARTSEEK — create the `marketplace` schema.
 *
 * Every other module's schema is created by a migration: `wallet` and `payout`
 * in `WalletAndPayoutSchemas`, `grocery` in `GrocerySchema`, and `restaurant`,
 * `pharmacy`, `doctor`, `hotel` and `taxi` in `VerticalModuleSchemas`. The
 * marketplace — the largest of them — was the only one without one.
 *
 * It relied instead on `apps/marketplace-service/scripts/init-marketplace-schema.sql`,
 * a standalone script that targets `kartseek_marketplace` on the dedicated
 * `postgres-marketplace` host and grants to `marketplace_user`. That is the
 * topology the Kubernetes ConfigMap describes, but `apps/api/.env` sets no
 * `MARKETPLACE_DB_*` variables at all, so local development falls back to the
 * shared `DB_*` — `kartseek_db` on the shared host — where nothing had ever
 * created the schema.
 *
 * The consequence, on a database that has not been hand-prepared:
 *
 *     QueryFailedError: schema "marketplace" does not exist
 *
 * on every boot of marketplace-service. `synchronize: true` creates tables, not
 * schemas, so it cannot recover from this by itself — the service simply never
 * connects. Putting the schema where the other eight already live makes a fresh
 * environment bootstrappable by the same command as everything else.
 *
 * Ordered ahead of `VerticalModuleSchemas1786500000000` so schema creation
 * happens before anything tries to build inside one.
 */
export class MarketplaceSchema1786499000000 implements MigrationInterface {
  name = 'MarketplaceSchema1786499000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "marketplace"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // RESTRICT rather than CASCADE, matching `VerticalModuleSchemas`: if the
    // schema has since been filled with the catalogue, reverting a schema stub
    // must fail loudly instead of dropping the entire marketplace dataset as a
    // side effect.
    await queryRunner.query(`DROP SCHEMA IF EXISTS "marketplace" RESTRICT`);
  }
}
