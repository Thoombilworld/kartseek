import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * KARTSEEK — storage for the hotel admin console's twelve new commands (M5).
 *
 * Ten of the twelve commands `admin-hotel.controller.ts` sends could be answered
 * from tables that already exist: rooms, bookings and reviews all carry
 * `hotel_id`, and the join to `hotels.countryCode` is the market. Two could not,
 * and answering them with a constant and `{ success: true }` would have been the
 * placeholder API this plan exists to remove:
 *
 *   • `hotel.hotel_amenities` — `createAmenity` had nowhere to write. The only
 *     record of an amenity was `hotels.amenities`, a `simple-array` on each
 *     property, so an amenity no hotel uses yet could not be expressed at all.
 *     No market column: "Pool" is the same amenity in Doha and in Delhi, the
 *     gateway marks the read `@GlobalEntity`, and the write is refused to a
 *     region-locked administrator on both sides of the wire.
 *
 *   • `hotel.hotel_market_settings` — `pricing`/`settings` and their two writes
 *     configure a MARKET, and this module had no market-level row of any kind.
 *     `country_code` is NOT NULL and UNIQUE: a settings row belongs to exactly
 *     one market and to no hotel, so a NULL would be a row no scoped admin could
 *     edit and every scoped admin could see. One row per market serves both
 *     screens — see the entity's docstring for why that is one table, not two.
 *
 * Three columns on `hotel_reviews` and five on `hotels` are the other half of
 * the same gap: those decisions were being taken with nothing recorded about WHO
 * took them. `suspendHotel` was returning a `reason` to its caller and storing
 * none of it, so a property went offline with no record of why.
 *
 * ── Idempotent throughout ───────────────────────────────────────────────────
 *
 * `CREATE TABLE/INDEX IF NOT EXISTS` and `ADD COLUMN IF NOT EXISTS`, because
 * these tables and columns may already have been created by `synchronize` on a
 * developer machine before the runner existed — the same starting-state problem
 * `DropDeadMarketColumns` documents, where all three of its columns had already
 * been dropped by a sync engine before it first ran.
 *
 * ── `down()` ────────────────────────────────────────────────────────────────
 *
 * Drops what `up()` creates, in the reverse order, and says so: reverting this
 * removes the amenity catalogue and every market's configuration. It is a
 * schema rollback, not a data one.
 */
export class HotelAdminSurfaces1786503300000 implements MigrationInterface {
  name = 'HotelAdminSurfaces1786503300000';

  /** Whether a table this migration means to extend is in this database at all. */
  private async hasTable(q: QueryRunner, table: string): Promise<boolean> {
    const [{ exists }] = await q.query(`SELECT to_regclass('${table}') IS NOT NULL AS exists`);
    if (!exists) console.warn(`[HotelAdminSurfaces] ${table} is not in this database; skipping.`);
    return Boolean(exists);
  }

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE SCHEMA IF NOT EXISTS "hotel"`);

    // ── The global amenity catalogue ─────────────────────────────────────────
    await q.query(`
      CREATE TABLE IF NOT EXISTS "hotel"."hotel_amenities" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(128) NOT NULL,
        "slug" character varying(128) NOT NULL,
        "icon" character varying(64),
        "category" character varying(64),
        "isActive" boolean NOT NULL DEFAULT true,
        "createdBy" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_hotel_amenities_id" PRIMARY KEY ("id")
      )
    `);
    await q.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_hotel_amenities_slug" ON "hotel"."hotel_amenities" ("slug")`,
    );
    await q.query(
      `COMMENT ON COLUMN "hotel"."hotel_amenities"."name" IS 'Display name e.g. Airport shuttle'`,
    );
    await q.query(
      `COMMENT ON COLUMN "hotel"."hotel_amenities"."slug" IS 'Lower-cased identity, matched against hotels.amenities'`,
    );
    await q.query(
      `COMMENT ON COLUMN "hotel"."hotel_amenities"."icon" IS 'Icon key for the console'`,
    );
    await q.query(
      `COMMENT ON COLUMN "hotel"."hotel_amenities"."category" IS 'Grouping e.g. Wellness, Connectivity, Transport'`,
    );
    await q.query(
      `COMMENT ON COLUMN "hotel"."hotel_amenities"."createdBy" IS 'The administrator who created it, from the verified token'`,
    );

    // ── One configuration row per market ─────────────────────────────────────
    await q.query(`
      CREATE TABLE IF NOT EXISTS "hotel"."hotel_market_settings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "countryCode" character varying(3) NOT NULL,
        "platformFeePercent" numeric(5,2) NOT NULL DEFAULT '0',
        "serviceTaxPercent" numeric(5,2) NOT NULL DEFAULT '0',
        "cleaningFee" numeric(12,2) NOT NULL DEFAULT '0',
        "freeCancellationWindowHours" integer NOT NULL DEFAULT 24,
        "autoApproveHotels" boolean NOT NULL DEFAULT false,
        "maxRoomsPerHotel" integer NOT NULL DEFAULT 500,
        "defaultCommissionRate" numeric(5,2) NOT NULL DEFAULT '15',
        "updatedBy" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_hotel_market_settings_id" PRIMARY KEY ("id")
      )
    `);
    await q.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_hotel_market_settings_country" ON "hotel"."hotel_market_settings" ("countryCode")`,
    );
    for (const [column, comment] of [
      ['countryCode', 'ISO-2 market this configuration applies to'],
      ['platformFeePercent', 'Platform fee percentage charged on a booking'],
      ['serviceTaxPercent', 'Service tax / VAT percentage'],
      ['cleaningFee', "Flat cleaning fee, in the market's own currency"],
      ['freeCancellationWindowHours', 'Hours before check-in during which cancellation is free'],
      [
        'autoApproveHotels',
        'Whether a new hotel in this market goes live without a human decision',
      ],
      ['maxRoomsPerHotel', 'Upper bound on rooms a single property may list'],
      [
        'defaultCommissionRate',
        'Commission applied to a hotel in this market that has no negotiated rate',
      ],
      ['updatedBy', 'The administrator who last wrote this row, from the verified token'],
    ] as const) {
      await q.query(
        `COMMENT ON COLUMN "hotel"."hotel_market_settings"."${column}" IS '${comment.replace(/'/g, "''")}'`,
      );
    }

    // ── Who moderated a review, and why ──────────────────────────────────────
    if (await this.hasTable(q, 'hotel.hotel_reviews')) {
      await q.query(`
        ALTER TABLE "hotel"."hotel_reviews"
          ADD COLUMN IF NOT EXISTS "moderatedBy" character varying,
          ADD COLUMN IF NOT EXISTS "moderatedAt" TIMESTAMP WITH TIME ZONE,
          ADD COLUMN IF NOT EXISTS "moderationReason" text
      `);
      await q.query(
        `COMMENT ON COLUMN "hotel"."hotel_reviews"."moderatedBy" IS 'The administrator who last moderated this review'`,
      );
      await q.query(
        `COMMENT ON COLUMN "hotel"."hotel_reviews"."moderationReason" IS 'Why the administrator approved or removed it'`,
      );
    }

    // ── Who approved or suspended a hotel, when, and why ─────────────────────
    if (await this.hasTable(q, 'hotel.hotels')) {
      await q.query(`
        ALTER TABLE "hotel"."hotels"
          ADD COLUMN IF NOT EXISTS "approvedBy" character varying,
          ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP WITH TIME ZONE,
          ADD COLUMN IF NOT EXISTS "suspendedBy" character varying,
          ADD COLUMN IF NOT EXISTS "suspendedAt" TIMESTAMP WITH TIME ZONE,
          ADD COLUMN IF NOT EXISTS "suspensionReason" text
      `);
      await q.query(
        `COMMENT ON COLUMN "hotel"."hotels"."approvedBy" IS 'Administrator who approved this hotel'`,
      );
      await q.query(
        `COMMENT ON COLUMN "hotel"."hotels"."suspendedBy" IS 'Administrator who suspended this hotel'`,
      );
      await q.query(
        `COMMENT ON COLUMN "hotel"."hotels"."suspensionReason" IS 'Why this hotel was suspended'`,
      );
    }
  }

  public async down(q: QueryRunner): Promise<void> {
    if (await this.hasTable(q, 'hotel.hotels')) {
      await q.query(`
        ALTER TABLE "hotel"."hotels"
          DROP COLUMN IF EXISTS "suspensionReason",
          DROP COLUMN IF EXISTS "suspendedAt",
          DROP COLUMN IF EXISTS "suspendedBy",
          DROP COLUMN IF EXISTS "approvedAt",
          DROP COLUMN IF EXISTS "approvedBy"
      `);
    }
    if (await this.hasTable(q, 'hotel.hotel_reviews')) {
      await q.query(`
        ALTER TABLE "hotel"."hotel_reviews"
          DROP COLUMN IF EXISTS "moderationReason",
          DROP COLUMN IF EXISTS "moderatedAt",
          DROP COLUMN IF EXISTS "moderatedBy"
      `);
    }
    await q.query(`DROP INDEX IF EXISTS "hotel"."IDX_hotel_market_settings_country"`);
    await q.query(`DROP TABLE IF EXISTS "hotel"."hotel_market_settings"`);
    await q.query(`DROP INDEX IF EXISTS "hotel"."IDX_hotel_amenities_slug"`);
    await q.query(`DROP TABLE IF EXISTS "hotel"."hotel_amenities"`);
  }
}
