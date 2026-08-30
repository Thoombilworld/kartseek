import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * KARTSEEK — durable storage for the flash-deal pipeline
 *
 * Campaigns and seller nominations were two JSON blobs in Redis under a 24-hour
 * TTL, behind a comment that read "admin-owned, no table". Three things followed
 * from that, and this migration is what stops all three:
 *
 *   1. A campaign an admin created expired overnight, or on any eviction.
 *   2. `submitNomination` rewrote one shared array for every seller on the
 *      platform, so two sellers nominating at the same moment lost each other's
 *      row. The unique index below makes a duplicate impossible instead.
 *   3. The customer-facing query read neither key — it ranked products by review
 *      count and stamped `now + 4h` on the response — so nothing an admin or a
 *      seller did could reach a shopper, and the "countdown" reset rather than
 *      counted down.
 *
 * `deal_price` is the column that makes a flash deal a deal rather than a
 * popular product: it is the price the shopper actually pays while the window is
 * open, and there was previously nowhere to record it.
 *
 * Lives in the `marketplace` schema alongside `sellers` and `products`, with
 * cascading foreign keys so a nomination cannot outlive its campaign, its seller
 * or its product.
 */
export class FlashDealTables1786500800000 implements MigrationInterface {
  name = 'FlashDealTables1786500800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Campaigns ────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "marketplace"."flash_deals" (
        "id"                    uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name"                  character varying(120) NOT NULL,
        "description"           text,
        "status"                character varying(20) NOT NULL DEFAULT 'DRAFT',
        "window_start"          TIMESTAMP NOT NULL,
        "window_end"            TIMESTAMP NOT NULL,
        "min_discount_percent"  integer NOT NULL DEFAULT 0,
        "stock_limit"           integer NOT NULL DEFAULT 0,
        "units_sold"            integer NOT NULL DEFAULT 0,
        "priority"              integer NOT NULL DEFAULT 5,
        "region_code"           character varying,
        "created_by"            character varying,
        "created_at"            TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"            TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_flash_deals" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_flash_deals_window" CHECK ("window_end" > "window_start"),
        CONSTRAINT "CHK_flash_deals_status" CHECK (
          "status" IN ('DRAFT', 'SCHEDULED', 'ACTIVE', 'ENDED', 'CANCELLED')
        )
      )
    `);

    // The storefront query filters on status + window and orders by priority.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_flash_deals_live"
        ON "marketplace"."flash_deals" ("status", "window_start", "window_end")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_flash_deals_region"
        ON "marketplace"."flash_deals" ("region_code", "status")
    `);

    // ── Nominations ──────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "marketplace"."flash_deal_nominations" (
        "id"                        uuid NOT NULL DEFAULT uuid_generate_v4(),
        "deal_id"                   uuid NOT NULL,
        "seller_id"                 uuid NOT NULL,
        "product_id"                uuid NOT NULL,
        -- NOT NULL with no default, deliberately. A DEFAULT 0 stood here, and it
        -- was the wrong shape twice over: the entity declares no default, so a
        -- dev boot with synchronize enabled dropped it and the two environments
        -- diverged; and a nomination reaching the table without a price would be
        -- stored as free rather than rejected. The price is the whole point of
        -- the row, so the insert has to supply it.
        "deal_price"                numeric(10,2) NOT NULL,
        "proposed_discount_percent" integer NOT NULL DEFAULT 0,
        "stock_allocated"           integer NOT NULL DEFAULT 0,
        "stock_sold"                integer NOT NULL DEFAULT 0,
        "status"                    character varying(20) NOT NULL DEFAULT 'PENDING',
        "seller_note"               text,
        "decision_reason"           text,
        "decided_at"                TIMESTAMP,
        "decided_by"                character varying,
        "submitted_at"              TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at"                TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_flash_deal_nominations" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_flash_deal_nominations_status" CHECK (
          "status" IN ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN')
        ),
        CONSTRAINT "CHK_flash_deal_nominations_stock" CHECK ("stock_sold" <= "stock_allocated" OR "stock_allocated" = 0),
        CONSTRAINT "FK_flash_deal_nominations_deal" FOREIGN KEY ("deal_id")
          REFERENCES "marketplace"."flash_deals"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_flash_deal_nominations_seller" FOREIGN KEY ("seller_id")
          REFERENCES "marketplace"."sellers"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_flash_deal_nominations_product" FOREIGN KEY ("product_id")
          REFERENCES "marketplace"."products"("id") ON DELETE CASCADE
      )
    `);

    // One offer per seller per product per campaign. This is the constraint the
    // Redis array could not express, and the reason duplicate pending rows had
    // to be reconciled by hand.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_flash_deal_nominations_entry"
        ON "marketplace"."flash_deal_nominations" ("deal_id", "seller_id", "product_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_flash_deal_nominations_deal_status"
        ON "marketplace"."flash_deal_nominations" ("deal_id", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_flash_deal_nominations_seller_status"
        ON "marketplace"."flash_deal_nominations" ("seller_id", "status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "marketplace"."flash_deal_nominations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "marketplace"."flash_deals"`);
  }
}
