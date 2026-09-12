import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * `1786502500000-QuarantineStaleVerticalCopies` moved the five parent decoys
 * (`restaurants`, `grocery_stores`, `pharmacy_stores`, `hotels`, `doctors`)
 * out of `public`. It did not touch their sibling tables — the review that
 * approved it flagged 23 FK-linked ones as still live in `public` and asked
 * for a full accounting rather than a partial one.
 *
 * That accounting turned out larger than the 23 named in the review: every
 * `public` table whose name also exists in one of the five module schemas
 * (`doctor`, `grocery`, `hotel`, `pharmacy`, `restaurant`) was checked live,
 * not just the ones with a direct foreign key to a parent — 41 in total.
 * Eighteen of them (`clinics`, `departments`, `documents`, `family_members`,
 * `hospitals`, `intake_forms`, `specialties`, `doctor_reviews`,
 * `grocery_categories`, `pharmacy_categories`, `prescriptions`, the three
 * `hotel_guests`/`hotel_owners`/`hotel_payouts`, …) have no FK into a parent
 * at all — they are just same-named, same-shaped tables that happen to sit
 * in both `public` and the module schema, the identical decoy pattern one
 * level removed from the FK graph the review's grep could see.
 *
 * Every one of the 41 passes the same test the parent migration used: row
 * count in `public` never exceeds the module schema's count for the same
 * table (mostly 0 vs 0, several exact matches, `grocery_items` 128 vs 225,
 * `grocery_categories` 23 vs 642 — never the reverse), and where a direct or
 * transitive FK exists it resolves into `legacy_public_verticals` (the
 * already-quarantined parents) rather than anything live. No table here has
 * rows that exist ONLY in `public`; if one had, it would be left out of this
 * list and recorded as a live table rather than a decoy. Full counts are in
 * the round's report, not repeated here to keep this file from drifting out
 * of date the way the parent migration's own counts already have.
 *
 *   doctor (12):     appointments, clinics, departments, doctor_availability,
 *                     doctor_prescriptions, doctor_reviews, documents,
 *                     family_members, hospitals, intake_forms,
 *                     prescription_items, specialties
 *   grocery (6):      grocery_categories, grocery_flash_deals, grocery_items,
 *                     grocery_orders, grocery_reviews, grocery_wishlists
 *   hotel (8):        hotel_bookings, hotel_guests, hotel_owners,
 *                     hotel_payouts, hotel_reviews, hotel_rooms,
 *                     hotel_seasonal_pricing, hotel_staff
 *   pharmacy (7):     pharmacy_categories, pharmacy_items, pharmacy_orders,
 *                     pharmacy_promotions, pharmacy_reviews, pharmacy_staff,
 *                     prescriptions
 *   restaurant (8):   menu_categories, menu_items, reservations,
 *                     restaurant_orders, restaurant_promotions,
 *                     restaurant_reviews, restaurant_staff, restaurant_tables
 *
 * Explicitly NOT included, checked and left alone: `payments`,
 * `payment_method_configs`, `invoices`, `settlement_records` — same "empty,
 * no FK" shape but no same-named table in any of the five module schemas, so
 * there is nothing to compare them against; they belong to a different
 * question than this one. `taxi_*`, `partner_*`, `bank_offers`,
 * `exchange_offers` are the gateway's own tables (already in its explicit
 * entity list) and were never candidates.
 *
 * `SET SCHEMA` moves the table, not its foreign keys — a constraint is
 * tracked by the referenced table's OID, so `hotel_bookings.hotel_id` keeps
 * pointing at the right row of `hotels` whichever schema `hotels` is in
 * today, exactly as it did after the parent migration moved `hotels` itself
 * without incident. `down()` puts every table back and drops the shared
 * schema only once both this migration and the parent one have emptied it.
 */
const TABLES = [
  // doctor
  'appointments',
  'clinics',
  'departments',
  'doctor_availability',
  'doctor_prescriptions',
  'doctor_reviews',
  'documents',
  'family_members',
  'hospitals',
  'intake_forms',
  'prescription_items',
  'specialties',
  // grocery
  'grocery_categories',
  'grocery_flash_deals',
  'grocery_items',
  'grocery_orders',
  'grocery_reviews',
  'grocery_wishlists',
  // hotel
  'hotel_bookings',
  'hotel_guests',
  'hotel_owners',
  'hotel_payouts',
  'hotel_reviews',
  'hotel_rooms',
  'hotel_seasonal_pricing',
  'hotel_staff',
  // pharmacy
  'pharmacy_categories',
  'pharmacy_items',
  'pharmacy_orders',
  'pharmacy_promotions',
  'pharmacy_reviews',
  'pharmacy_staff',
  'prescriptions',
  // restaurant
  'menu_categories',
  'menu_items',
  'reservations',
  'restaurant_orders',
  'restaurant_promotions',
  'restaurant_reviews',
  'restaurant_staff',
  'restaurant_tables',
];

export class QuarantineStaleVerticalSiblings1786502600000 implements MigrationInterface {
  name = 'QuarantineStaleVerticalSiblings1786502600000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE SCHEMA IF NOT EXISTS "legacy_public_verticals"`);
    for (const t of TABLES) {
      await q.query(
        `DO $$ BEGIN
           IF EXISTS (SELECT 1 FROM information_schema.tables
                      WHERE table_schema='public' AND table_name='${t}') THEN
             ALTER TABLE "public"."${t}" SET SCHEMA "legacy_public_verticals";
           END IF;
         END $$;`,
      );
    }
  }

  public async down(q: QueryRunner): Promise<void> {
    for (const t of TABLES) {
      await q.query(
        `DO $$ BEGIN
           IF EXISTS (SELECT 1 FROM information_schema.tables
                      WHERE table_schema='legacy_public_verticals' AND table_name='${t}') THEN
             ALTER TABLE "legacy_public_verticals"."${t}" SET SCHEMA "public";
           END IF;
         END $$;`,
      );
    }
    // Same shared-schema guard as the parent migration's down(): drop only
    // once nothing from either migration is left in it.
    await q.query(
      `DO $$ BEGIN
         IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                         WHERE table_schema='legacy_public_verticals') THEN
           EXECUTE 'DROP SCHEMA IF EXISTS "legacy_public_verticals"';
         END IF;
       END $$;`,
    );
  }
}
