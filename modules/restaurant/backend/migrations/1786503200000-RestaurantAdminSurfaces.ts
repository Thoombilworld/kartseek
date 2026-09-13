import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * KARTSEEK — the three tables the restaurant admin console had no storage for.
 *
 * M4's census found seventeen `admin.restaurant.*` commands and thirteen with no
 * handler anywhere in this module. Eleven of the thirteen could be written
 * against tables that already exist — orders, menu items, restaurants — because
 * the state they read or decide is already stored. Three could not:
 *
 *   • `restaurant_complaints` — `complaints` and `resolveComplaint` had nothing
 *     to list and nowhere to record a resolution. `restaurant_reviews` is not
 *     that place: a review has no resolution, no assignee and no lifecycle, and
 *     overloading `is_flagged` would make hiding an abusive review and closing a
 *     complaint the same write.
 *   • `restaurant_delivery_zones` — `zones` and `createZone`, the same pair
 *     grocery already stores as `grocery_delivery_zones` and in the same shape.
 *   • `restaurant_cuisines` — `cuisines` answered from an aggregate over
 *     `restaurants.cuisines`, which has nowhere to put a cuisine no restaurant
 *     uses yet, so `createCuisine` could not be completed without it.
 *
 * Answering any of the three with a constant and a `success: true` would have
 * been the placeholder API the MODULES plan exists to remove, so the tables come
 * first. **No new market column**: `restaurants.region_code` already exists and
 * is this module's only market (the alpha-3 `country_code` beside it was dropped
 * by `1786502400000-DropDeadMarketColumns`), complaints attribute through the
 * restaurant they name, and the cuisine catalogue is deliberately global.
 *
 * Every statement is `IF NOT EXISTS`, so a database that already has one of
 * these from a stray `synchronize` is not a failed run.
 */
export class RestaurantAdminSurfaces1786503200000 implements MigrationInterface {
  name = 'RestaurantAdminSurfaces1786503200000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE SCHEMA IF NOT EXISTS "restaurant"`);

    // ── Cuisine catalogue ────────────────────────────────────────────────────
    //
    // No `region_code`: "Levantine" is the same cuisine in every market, the
    // gateway already marks the read `@GlobalEntity` and refuses the write to a
    // region-locked administrator, and a per-market copy would let two markets
    // compete for one name while hiding each other's additions.
    await q.query(
      `CREATE TABLE IF NOT EXISTS "restaurant"."restaurant_cuisines" (
         "id" uuid NOT NULL DEFAULT gen_random_uuid(),
         "name" character varying(128) NOT NULL,
         "slug" character varying(128) NOT NULL,
         "icon" character varying(16),
         "description" text,
         "sort_order" integer NOT NULL DEFAULT 0,
         "isActive" boolean NOT NULL DEFAULT true,
         "created_by" character varying,
         "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
         "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
         CONSTRAINT "PK_restaurant_cuisines" PRIMARY KEY ("id")
       )`,
    );
    // Unique on both: the read counts restaurants per cuisine NAME, so two rows
    // called "Italian" would split one cuisine's count across two console entries.
    await q.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_restaurant_cuisines_name"
         ON "restaurant"."restaurant_cuisines" ("name")`,
    );
    await q.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_restaurant_cuisines_slug"
         ON "restaurant"."restaurant_cuisines" ("slug")`,
    );

    // ── Delivery zones ───────────────────────────────────────────────────────
    //
    // `region_code` is NOT NULL here, unlike `restaurants.region_code`. A zone
    // belongs to a market and to no restaurant, so there is nothing to attribute
    // it through: a NULL would be a row no scoped administrator could ever edit
    // and every scoped administrator could see. `createZone` requires one.
    await q.query(
      `CREATE TABLE IF NOT EXISTS "restaurant"."restaurant_delivery_zones" (
         "id" uuid NOT NULL DEFAULT gen_random_uuid(),
         "name" character varying(128) NOT NULL,
         "region_code" character varying(8) NOT NULL,
         "city" character varying(128),
         "pincodes" text,
         "center_lat" numeric(10,7),
         "center_lng" numeric(10,7),
         "radius_km" numeric(5,2) NOT NULL DEFAULT 10,
         "delivery_fee" numeric(10,2) NOT NULL DEFAULT 0,
         "min_order_amount" numeric(10,2) NOT NULL DEFAULT 0,
         "eta_minutes" integer NOT NULL DEFAULT 40,
         "isActive" boolean NOT NULL DEFAULT true,
         "created_by" character varying,
         "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
         "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
         CONSTRAINT "PK_restaurant_delivery_zones" PRIMARY KEY ("id")
       )`,
    );
    await q.query(
      `CREATE INDEX IF NOT EXISTS "IDX_restaurant_delivery_zones_region"
         ON "restaurant"."restaurant_delivery_zones" ("region_code")`,
    );
    await q.query(
      `CREATE INDEX IF NOT EXISTS "IDX_restaurant_delivery_zones_active"
         ON "restaurant"."restaurant_delivery_zones" ("isActive")`,
    );
    await q.query(
      `COMMENT ON COLUMN "restaurant"."restaurant_delivery_zones"."region_code" IS
         'ISO-2 market, or a sub-region of one; predicates narrow with LEFT(region_code, 2)'`,
    );

    // ── Complaints ───────────────────────────────────────────────────────────
    await q.query(
      `DO $$ BEGIN
         CREATE TYPE "restaurant"."restaurant_complaints_status_enum"
           AS ENUM ('OPEN', 'INVESTIGATING', 'ESCALATED', 'RESOLVED');
       EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await q.query(
      `DO $$ BEGIN
         CREATE TYPE "restaurant"."restaurant_complaints_priority_enum"
           AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
       EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    // `restaurant_id` NOT NULL with ON DELETE CASCADE: the complaint's market IS
    // the restaurant's, read through this join and never copied, so a complaint
    // without one would be attributable to no market — invisible to every scoped
    // administrator and closable by none.
    await q.query(
      `CREATE TABLE IF NOT EXISTS "restaurant"."restaurant_complaints" (
         "id" uuid NOT NULL DEFAULT gen_random_uuid(),
         "restaurant_id" uuid NOT NULL,
         "order_id" character varying,
         "customer_id" character varying NOT NULL,
         "customer_name" character varying(200),
         "category" character varying(64) NOT NULL,
         "priority" "restaurant"."restaurant_complaints_priority_enum" NOT NULL DEFAULT 'MEDIUM',
         "subject" character varying(255) NOT NULL,
         "description" text NOT NULL,
         "status" "restaurant"."restaurant_complaints_status_enum" NOT NULL DEFAULT 'OPEN',
         "resolution" text,
         "resolved_by" character varying,
         "resolved_at" TIMESTAMP WITH TIME ZONE,
         "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
         "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
         CONSTRAINT "PK_restaurant_complaints" PRIMARY KEY ("id")
       )`,
    );
    await q.query(
      `DO $$ BEGIN
         ALTER TABLE "restaurant"."restaurant_complaints"
           ADD CONSTRAINT "FK_restaurant_complaints_restaurant"
           FOREIGN KEY ("restaurant_id") REFERENCES "restaurant"."restaurants"("id")
           ON DELETE CASCADE;
       EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    // The queue is read "this market's open complaints, newest first", which is
    // the restaurant join plus the status filter plus the sort.
    await q.query(
      `CREATE INDEX IF NOT EXISTS "IDX_restaurant_complaints_restaurant"
         ON "restaurant"."restaurant_complaints" ("restaurant_id")`,
    );
    await q.query(
      `CREATE INDEX IF NOT EXISTS "IDX_restaurant_complaints_status"
         ON "restaurant"."restaurant_complaints" ("status")`,
    );
    await q.query(
      `CREATE INDEX IF NOT EXISTS "IDX_restaurant_complaints_customer"
         ON "restaurant"."restaurant_complaints" ("customer_id")`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    // Dropping these does lose rows: complaints and their resolutions, the zones
    // operations configured, the cuisines they catalogued. That is what a revert
    // of "create the table" means. Nothing else reads them, so the drop is
    // complete rather than partial — and the cuisines a restaurant names in its
    // own profile survive, because they never lived here.
    await q.query(`DROP TABLE IF EXISTS "restaurant"."restaurant_complaints"`);
    await q.query(`DROP TYPE IF EXISTS "restaurant"."restaurant_complaints_status_enum"`);
    await q.query(`DROP TYPE IF EXISTS "restaurant"."restaurant_complaints_priority_enum"`);
    await q.query(`DROP TABLE IF EXISTS "restaurant"."restaurant_delivery_zones"`);
    await q.query(`DROP TABLE IF EXISTS "restaurant"."restaurant_cuisines"`);
  }
}
