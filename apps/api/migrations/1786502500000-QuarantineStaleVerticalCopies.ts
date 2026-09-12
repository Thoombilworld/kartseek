import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The main database holds 2024-era copies of five vertical tables whose real
 * rows are in the module schemas. Row counts checked live against
 * `kartseek_db` and each module's own database immediately before this
 * migration was written (public vs module schema): restaurants 8 vs 8,
 * grocery_stores 8 vs 14, pharmacy_stores 6 vs 6, hotels 0 vs 0, doctors 0 vs
 * 1 — the audit that opened AUD2-030 recorded restaurants 8 vs 12, hotels 0
 * vs 8 and doctors 0 vs 7, so the module-schema numbers have since drifted
 * with normal use; the `public` copies have not moved, which is exactly the
 * "stale" this migration is about. Nothing reads them — the gateway's entity
 * list is taxi, partner, page_layouts, static_pages, users and admin_roles —
 * but they are exactly the decoy shape that cost the platform a week the
 * last time (`public.*` shadowing `marketplace.*`).
 *
 * So they move rather than drop: a query that still points here fails loudly
 * with "relation public.restaurants does not exist" instead of quietly
 * serving last year's data. `down()` puts them back.
 */
const TABLES = ['restaurants', 'grocery_stores', 'pharmacy_stores', 'hotels', 'doctors'];

export class QuarantineStaleVerticalCopies1786502500000 implements MigrationInterface {
  name = 'QuarantineStaleVerticalCopies1786502500000';

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
  }
}
