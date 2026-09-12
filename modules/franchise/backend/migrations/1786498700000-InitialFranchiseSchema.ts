import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The franchise module's schema, as its entities define it (IN3 / AUD2-003).
 *
 * Generated with `migration:generate` against an EMPTY scratch database, so it
 * is the whole schema rather than a diff against whatever `synchronize` had
 * built. Before this file the franchise database had no way to be created except by
 * booting the service with auto-sync on and hoping; that is off by default in
 * every environment now (`src/franchise-service.module.ts`), and this is the schema.
 *
 * One table is not a reason to skip the migration. `franchises` carries the
 * per-franchise country and currency the whole multi-region money path reads,
 * and an unversioned table is a deploy that either has the column or does not,
 * with nothing to say which.
 *
 * ── It starts from nothing ─────────────────────────────────────────────────
 *
 * The first two statements are `CREATE SCHEMA IF NOT EXISTS "franchise"` and
 * `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`, because a dedicated module
 * database arrives with neither and every primary key below defaults to
 * `uuid_generate_v4()`. Nothing else in a deploy creates them: dev
 * `synchronize` used to create the schema, and IN3 turned that off. This works
 * only because the ledger lives in `public.franchise_migrations` rather than inside
 * this schema — TypeORM builds the ledger before the first `up()` runs, so a
 * ledger in `franchise` would need the schema that this line creates.
 *
 * ── Why up() is guarded ────────────────────────────────────────────────────
 *
 * The dev and staging databases already hold `franchises` — `synchronize` built
 * it, with no ledger row to say so. This migration has to be recordable against
 * those without dropping a single row, so every statement is idempotent: here
 * that is `CREATE SCHEMA IF NOT EXISTS`, `CREATE EXTENSION IF NOT EXISTS` and
 * one `CREATE TABLE IF NOT EXISTS`. (The seven other modules also guard
 * `CREATE TYPE` and `ALTER TABLE … ADD CONSTRAINT`, which Postgres has no
 * `IF NOT EXISTS` for, inside a DO block; this module has neither.) On an empty
 * database every guard is a no-op and this builds the schema.
 *
 * ── down() ─────────────────────────────────────────────────────────────────
 *
 * The generated reverse: it DROPs the table up() creates, then the schema if
 * nothing else is left in it. That is the honest inverse of an initial schema,
 * and it is what `npm run migration:revert` will do to the module's whole
 * database. Read the ledger before running it.
 */
export class InitialFranchiseSchema1786498700000 implements MigrationInterface {
  name = 'InitialFranchiseSchema1786498700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // The schema itself, and it has to be first. A dedicated module
    // database is created empty and nothing else in the deploy creates
    // this schema — dev `synchronize` used to, and IN3 turned that off.
    // The ledger is deliberately `public.franchise_migrations` (see
    // data-source.ts), so TypeORM does not need this schema to exist
    // before this line runs.
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "franchise"`);
    // Every table below defaults its primary key to uuid_generate_v4().
    // A plain postgres image does not ship this enabled.
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "franchise"."franchises" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "owner_id" character varying NOT NULL, "business_name" character varying NOT NULL, "country_code" character varying(2) NOT NULL, "operational_zones" jsonb NOT NULL DEFAULT '[]', "commission_rates" jsonb NOT NULL DEFAULT '{}', "status" character varying NOT NULL DEFAULT 'active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5ff74e1ad0637c499c4ed139e2c" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "franchise"."franchises"`);
    // The schema last, and only if nothing is left in it. RESTRICT
    // raises dependent_objects_still_exist when it still holds objects
    // this migration did not create — exactly the case where dropping it
    // would take somebody else's tables with it.
    await queryRunner.query(`DO $guard$ BEGIN
  DROP SCHEMA IF EXISTS "franchise" RESTRICT;
EXCEPTION WHEN dependent_objects_still_exist THEN NULL;
END $guard$`);
  }
}
