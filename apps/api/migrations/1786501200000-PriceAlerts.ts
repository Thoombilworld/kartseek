import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * KARTSEEK — storage for price-drop alerts.
 *
 * The wishlist offered "Notify for all price drops" with nothing behind it.
 *
 * `price_when_set` is what makes an alert answerable: "cheaper" only means
 * anything relative to the price the shopper saw when they asked. A table
 * holding only `(customer, product)` would either fire for every alert on the
 * first sweep or never fire at all, depending on which direction the comparison
 * was written.
 */
export class PriceAlerts1786501200000 implements MigrationInterface {
  name = 'PriceAlerts1786501200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "marketplace"."price_alerts" (
        "id"             uuid NOT NULL DEFAULT uuid_generate_v4(),
        "customer_id"    character varying NOT NULL,
        "product_id"     uuid NOT NULL,
        "price_when_set" numeric(12,2) NOT NULL,
        "target_price"   numeric(12,2),
        "is_active"      boolean NOT NULL DEFAULT true,
        "notified_at"    TIMESTAMP,
        "notified_price" numeric(12,2),
        "created_at"     TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_price_alerts" PRIMARY KEY ("id"),
        -- A non-positive reference price cannot be undercut, so the alert would
        -- never fire; reject it at the boundary rather than storing a dead row.
        CONSTRAINT "CHK_price_alerts_reference" CHECK ("price_when_set" > 0),
        CONSTRAINT "CHK_price_alerts_target" CHECK ("target_price" IS NULL OR "target_price" > 0),
        CONSTRAINT "FK_price_alerts_product" FOREIGN KEY ("product_id")
          REFERENCES "marketplace"."products"("id") ON DELETE CASCADE
      )
    `);

    // The sweep: every active alert on a product whose price just changed.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_price_alerts_product_active"
        ON "marketplace"."price_alerts" ("product_id", "is_active")
    `);
    // A customer's own alerts, for the wishlist page.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_price_alerts_customer_active"
        ON "marketplace"."price_alerts" ("customer_id", "is_active")
    `);
    // One alert per shopper per product — a second means two notifications for
    // one drop.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_price_alerts_customer_product"
        ON "marketplace"."price_alerts" ("customer_id", "product_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "marketplace"."price_alerts"`);
  }
}
