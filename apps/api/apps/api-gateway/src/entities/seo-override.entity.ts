import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * A per-path SEO metadata override, gateway-owned, in the main database.
 *
 * Replaces the module-level `Map` `admin-seo.controller.ts` used to keep
 * these in: per-process memory that emptied on every restart and differed by
 * gateway replica, so the console's "saved" confirmation was true only for
 * the request that happened to land on the replica that made the change
 * (audit V17 / H-12). One row per `path` here now, applied through
 * `SeoOverrideDto` (`dto/admin-content.dto.ts`).
 *
 * Columns track exactly what the DTO validates. The legacy in-memory shape
 * also carried Twitter-card, JSON-LD schema, FAQ and hreflang fields that no
 * caller had ever been able to set through a validated body — the old type
 * was an `interface`, so Nest had no metatype and skipped validation
 * entirely — and they are not carried forward as permanently-null columns.
 *
 * Physical columns are snake_case (`updated_by`, `meta_title`, …), unlike
 * `static_pages`/`page_layouts` which kept TypeORM's camelCase default: this
 * table is queried directly by operators (`psql`) as part of the migration
 * runbook, and `updated_by` in particular is asserted verbatim by the R7 live
 * probe.
 */
@Entity('seo_overrides')
@Index(['path'], { unique: true })
export class SeoOverride {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  path: string;

  @Column({ type: 'varchar', length: 32 })
  module: string;

  @Column({ name: 'meta_title', type: 'varchar', length: 200, nullable: true })
  metaTitle: string | null;

  @Column({ name: 'meta_description', type: 'text', nullable: true })
  metaDescription: string | null;

  @Column({ type: 'jsonb', nullable: true })
  keywords: string[] | null;

  @Column({ name: 'canonical_url', type: 'text', nullable: true })
  canonicalUrl: string | null;

  @Column({ name: 'robots_index', type: 'boolean', default: true })
  robotsIndex: boolean;

  @Column({ name: 'robots_follow', type: 'boolean', default: true })
  robotsFollow: boolean;

  @Column({ name: 'sitemap_include', type: 'boolean', default: true })
  sitemapInclude: boolean;

  @Column({ name: 'sitemap_priority', type: 'numeric', precision: 3, scale: 2, nullable: true })
  sitemapPriority: number | null;

  @Column({ name: 'sitemap_change_freq', type: 'varchar', length: 16, nullable: true })
  sitemapChangeFreq: string | null;

  @Column({ name: 'og_title', type: 'varchar', length: 200, nullable: true })
  ogTitle: string | null;

  @Column({ name: 'og_description', type: 'text', nullable: true })
  ogDescription: string | null;

  @Column({ name: 'og_image', type: 'text', nullable: true })
  ogImage: string | null;

  /** The verified `req.user.id` at write time — never a caller-supplied value. */
  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
