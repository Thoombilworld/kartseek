import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Product-specific attribute values, and the definition columns that make them
 * validatable and presentable.
 *
 * ── What was missing ─────────────────────────────────────────────────────────
 *
 * `marketplace.product_attributes` held the *definitions* (per category: name,
 * type, options, unit) but no table held a product's *values*. The product
 * page read `metadata.specifications`, which nothing wrote — 0 of 178 products
 * carried one — so no product ever rendered a specification, and a seller's
 * "specifications" field was dropped on the floor by the write path. This
 * migration adds:
 *
 *   • `product_attribute_values`: one row per (product, attribute), typed
 *     value columns (text / numeric / boolean / jsonb), unique per pair,
 *     cascading from both parents. See the entity for which column each
 *     attribute type uses.
 *   • On `product_attributes`: `groupName` (the specification heading the
 *     page files the value under), `isHighlight` (the value feeds the product
 *     highlights), `minValue` / `maxValue` (server-side bounds for NUMBER and
 *     RANGE values — a 999 999-inch screen is refused here, not in the form).
 *
 * Every statement is idempotent (`IF NOT EXISTS`, guarded constraints) so the
 * runner can be re-run against a database `synchronize` already touched, and
 * the DDL mirrors the entity metadata verbatim — `verify:schema-drift
 * --module=marketplace` is the check that it does.
 */
export class ProductAttributeValues1786503000000 implements MigrationInterface {
  name = 'ProductAttributeValues1786503000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "marketplace"."product_attributes" ADD COLUMN IF NOT EXISTS "groupName" character varying`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "marketplace"."product_attributes"."groupName" IS 'Specification group heading on the product page'`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace"."product_attributes" ADD COLUMN IF NOT EXISTS "isHighlight" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "marketplace"."product_attributes"."isHighlight" IS 'Value is surfaced in the product highlights'`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace"."product_attributes" ADD COLUMN IF NOT EXISTS "minValue" numeric(18,4)`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "marketplace"."product_attributes"."minValue" IS 'Lowest accepted numeric value'`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace"."product_attributes" ADD COLUMN IF NOT EXISTS "maxValue" numeric(18,4)`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "marketplace"."product_attributes"."maxValue" IS 'Highest accepted numeric value'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "marketplace"."product_attributes"."type" IS 'TEXT | NUMBER | SELECT | MULTI_SELECT | BOOLEAN | COLOR | DATE | RANGE'`,
    );

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "marketplace"."product_attribute_values" (` +
        `"id" uuid NOT NULL DEFAULT uuid_generate_v4(), ` +
        `"product_id" uuid NOT NULL, ` +
        `"attribute_id" uuid NOT NULL, ` +
        `"value_text" text, ` +
        `"value_number" numeric(18,4), ` +
        `"value_bool" boolean, ` +
        `"value_json" jsonb, ` +
        `"created_at" TIMESTAMP NOT NULL DEFAULT now(), ` +
        `"updated_at" TIMESTAMP NOT NULL DEFAULT now(), ` +
        `CONSTRAINT "PK_product_attribute_values" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_pav_product_attribute" ON "marketplace"."product_attribute_values" ("product_id", "attribute_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_pav_attribute_number" ON "marketplace"."product_attribute_values" ("attribute_id", "value_number")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_pav_attribute_text" ON "marketplace"."product_attribute_values" ("attribute_id", "value_text")`,
    );
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "marketplace"."product_attribute_values" ADD CONSTRAINT "FK_pav_product" FOREIGN KEY ("product_id") REFERENCES "marketplace"."products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
    await queryRunner.query(`DO $guard$ BEGIN
  ALTER TABLE "marketplace"."product_attribute_values" ADD CONSTRAINT "FK_pav_attribute" FOREIGN KEY ("attribute_id") REFERENCES "marketplace"."product_attributes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "marketplace"."product_attribute_values"`);
    await queryRunner.query(
      `ALTER TABLE "marketplace"."product_attributes" DROP COLUMN IF EXISTS "maxValue"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace"."product_attributes" DROP COLUMN IF EXISTS "minValue"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace"."product_attributes" DROP COLUMN IF EXISTS "isHighlight"`,
    );
    await queryRunner.query(
      `ALTER TABLE "marketplace"."product_attributes" DROP COLUMN IF EXISTS "groupName"`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "marketplace"."product_attributes"."type" IS 'TEXT | NUMBER | SELECT | MULTI_SELECT | BOOLEAN | COLOR'`,
    );
  }
}
