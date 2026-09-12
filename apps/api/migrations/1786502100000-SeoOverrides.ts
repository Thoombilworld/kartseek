import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * KARTSEEK — a real, durable store for SEO metadata overrides.
 *
 * `admin-seo.controller.ts` kept every override in a module-level `Map`,
 * which is per-process memory: a restart erased every override an admin had
 * ever saved, and two gateway replicas behind a load balancer each answered
 * from their own copy — the console's "saved" confirmation was true only for
 * the request that happened to land on the replica that made the change
 * (audit V17). `seo_overrides` replaces it with one row per path, gateway-owned,
 * in the main database alongside `static_pages` and `page_layouts` (see the
 * classification note in `data-source.main.ts`).
 *
 * Columns track exactly what `SeoOverrideDto` validates (`dto/admin-content.dto.ts`).
 * The legacy in-memory shape also carried Twitter-card, JSON-LD schema, FAQ
 * and hreflang fields that no caller had ever been able to set through a
 * validated body — the old type was an `interface`, so Nest had no metatype
 * and skipped validation entirely — and they are not carried forward as
 * permanently-null columns.
 *
 * `IF NOT EXISTS` throughout: idempotent against a partial apply, matching
 * every other migration in this list.
 */
export class SeoOverrides1786502100000 implements MigrationInterface {
  name = 'SeoOverrides1786502100000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE IF NOT EXISTS "seo_overrides" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "path" text NOT NULL,
        "module" varchar(32) NOT NULL,
        "meta_title" varchar(200),
        "meta_description" text,
        "keywords" jsonb,
        "canonical_url" text,
        "robots_index" boolean NOT NULL DEFAULT true,
        "robots_follow" boolean NOT NULL DEFAULT true,
        "sitemap_include" boolean NOT NULL DEFAULT true,
        "sitemap_priority" numeric(3,2),
        "sitemap_change_freq" varchar(16),
        "og_title" varchar(200),
        "og_description" text,
        "og_image" text,
        "updated_by" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await q.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_seo_overrides_path" ON "seo_overrides" ("path")`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE IF EXISTS "seo_overrides" CASCADE`);
  }
}
