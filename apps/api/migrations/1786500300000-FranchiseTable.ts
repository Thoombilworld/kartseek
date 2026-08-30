import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * KARTSEEK — franchise.franchises
 *
 * `RemainingServiceSchemas1786500200000` created the `franchise` schema; this
 * creates the one table in it.
 *
 * A separate migration because franchise-service registers its connection
 * through `DatabaseModule.registerPostgres([Franchise], 'franchise')`, and that
 * helper hardcodes `synchronize: false` — deliberately, since every service
 * shares one database. So unlike the verticals that build their tables from
 * entities in development, this one has to be written out, the same way
 * `WalletAndPayoutSchemas` writes out `payout.seller_wallets`.
 *
 * Until it existed, `GET /franchise/:id/dashboard` answered
 * `relation "franchise.franchises" does not exist`, and before the gateway
 * fallbacks were removed it answered 200 with an empty dashboard instead.
 *
 * Columns mirror the `Franchise` entity exactly, including its snake_case
 * `@Column({ name: ... })` overrides and the two jsonb defaults.
 */
export class FranchiseTable1786500300000 implements MigrationInterface {
  name = 'FranchiseTable1786500300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "franchise"."franchises" (
        "id"                uuid NOT NULL DEFAULT uuid_generate_v4(),
        "owner_id"          character varying NOT NULL,
        "business_name"     character varying NOT NULL,
        "country_code"      character varying(2) NOT NULL,
        "operational_zones" jsonb NOT NULL DEFAULT '[]',
        "commission_rates"  jsonb NOT NULL DEFAULT '{}',
        "status"            character varying NOT NULL DEFAULT 'active',
        "created_at"        TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"        TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_franchises" PRIMARY KEY ("id")
      )
    `);

    // The dashboard and every franchise-scoped view filter by owner and by
    // market; without these each one is a sequential scan of the whole table.
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_franchises_owner_id" ON "franchise"."franchises" ("owner_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_franchises_country_code" ON "franchise"."franchises" ("country_code")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "franchise"."IDX_franchises_country_code"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "franchise"."IDX_franchises_owner_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "franchise"."franchises"`);
  }
}
