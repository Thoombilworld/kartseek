import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Category } from './category.entity';
import { Brand } from './brand.entity';
import { ProductImage } from './product-image.entity';
import { ProductListing } from './product-listing.entity';

/**
 * Indexes.
 *
 * This table had none beyond its three unique keys (`id`, `globalTradeItemNumber`,
 * `slug`), so every catalogue read was a sequential scan — confirmed with
 * EXPLAIN ANALYZE during the August audit. Foreign keys on `category_id`,
 * `subcategory_id` and `brand_id` do not help: Postgres does not index the
 * referencing side of a constraint.
 *
 * Declared on the entity rather than only in the migration because this module
 * runs with `synchronize: true` outside production — an index that exists in the
 * database but not in the metadata is liable to be dropped on the next boot.
 *
 * The expression indexes search needs (a GIN index over the name/description
 * tsvector, and a pg_trgm index for the ILIKE fallback) cannot be expressed as
 * decorators and live in the migration alone.
 */
@Entity('products')
// Both predicates appear on every storefront read.
@Index(['is_active', 'approval_status'])
// Curated featured rail.
@Index(['is_featured', 'is_active'])
// Category, subcategory and brand landing pages.
@Index(['category'])
@Index(['subcategory'])
@Index(['brand'])
// Seller catalogue, dashboard counts, and the region-scope subquery.
@Index(['seller_id'])
// The sort keys: newest first, and the rating/review default.
@Index(['created_at'])
@Index(['averageRating', 'reviewCount'])
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  globalTradeItemNumber: string; // ASIN or GTIN/UPC

  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  short_description: string | null;

  @Column({ type: 'text', nullable: true })
  long_description: string | null;

  @Column({ type: 'jsonb', nullable: true, comment: 'Stores localized translations for dynamic fields like name and descriptions. Format: { "ar": { "name": "تفاحة", "short_description": "..." } }' })
  translations: Record<string, any>;

  @ManyToOne(() => Brand)
  @JoinColumn({ name: 'brand_id' })
  brand: Brand;

  @ManyToOne(() => Category)
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @ManyToOne(() => Category)
  @JoinColumn({ name: 'subcategory_id' })
  subcategory: Category;

  /**
   * The seller who lists this product.
   *
   * `uuid`, not `varchar`. It was declared as a plain string with no foreign
   * key, which meant two things: nothing stopped a product pointing at a seller
   * that does not exist, and the region-scope predicate had to compare
   * `sellers.id::text = products.seller_id`. A cast on the indexed side is
   * unindexable, so that subquery scanned the whole sellers table on every
   * catalogue request.
   *
   * Left as a bare column rather than a `@ManyToOne` relation: the property is
   * read as a string id in a dozen places (`where: { seller_id: sellerId }`), and
   * the foreign key added by the migration gives the referential integrity
   * without changing any of those call sites.
   */
  @Column({ type: 'uuid', nullable: true })
  seller_id: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  mrp: number | null; // Maximum Retail Price

  @Column({ type: 'float', default: 0 })
  averageRating: number;

  @Column({ type: 'int', default: 0 })
  reviewCount: number;

  @Column({ default: 'ACTIVE' })
  status: string; // ACTIVE, DRAFT, DISCONTINUED

  @Column({ default: 'PENDING' })
  approval_status: string; // PENDING, APPROVED, REJECTED

  @Column({ default: true })
  is_active: boolean;

  /**
   * Curated onto the storefront's featured rail by an admin.
   *
   * There was no such column, so `addFeaturedProduct` / `removeFeaturedProduct`
   * published a Kafka event, cleared a cache key and returned
   * `{ success: true }` without recording anything — an admin could "feature" a
   * product and nothing anywhere changed. `getFeaturedProducts` meanwhile just
   * ranked by rating, so the rail could not be curated at all.
   */
  @Column({ name: 'is_featured', default: false })
  is_featured: boolean;

  // ── Indian Marketplace Enhancements ──

  @Column({ type: 'varchar', nullable: true })
  hsnCode: string | null; // Harmonized System of Nomenclature code for GST

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  gstBracket: number | null; // e.g., 5.00, 12.00, 18.00, 28.00

  @Column({ default: true })
  isPanIndia: boolean; // If false, the product is restricted to availablePincodes

  @Column("simple-array", { nullable: true })
  availablePincodes: string[]; // Hyper-local inventory mapping

  /**
   * Presentation extras that are not worth a column each.
   *
   * The storefront has read `product.metadata.*` from the beginning —
   * `richDescriptionHtml`, `specifications`, `imageGalleryUrls`,
   * `variantDimensions` — but **the column did not exist**, so every one of
   * those reads resolved to `undefined` and each caller quietly fell through to
   * its `|| ''` branch. `getProductById` even builds a `metadata` object on the
   * way out (`(product as any).metadata ?? {}`), which is why the response
   * carried the key and nothing ever noticed the store behind it was missing.
   *
   * Writes are deliberately narrow. Nothing accepts a whole `metadata` object
   * from a seller or admin payload: `richDescriptionHtml` is rendered by an
   * SSR'd server component, so a blanket write here would be a stored-XSS
   * surface. Each key gets its own validated endpoint —
   * `SellerService.setProductSpin360` is the pattern.
   *
   * Known keys:
   *   `spin360Urls`      — ordered frames of a 360° capture (≥ 8 to render)
   *   `richDescriptionHtml` — A+ content, sanitised at render
   *   `specifications`   — [{ label, value }] spec table rows
   *   `imageGalleryUrls` — legacy gallery, superseded by the `images` relation
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // ── Image Gallery ──

  @OneToMany(() => ProductImage, (img) => img.product, { cascade: true })
  images: ProductImage[];

  // ── Seller Listings ──

  /**
   * Offers from sellers. The buy-box winner's `sellingPrice` is the price a
   * customer pays; `mrp` above is only the struck-through list price.
   *
   * Until this relation existed the catalogue could not return a selling price at
   * all — getProductById had to query the listing repository separately — so every
   * product card across the storefront rendered at MRP with no discount, and any
   * mapper that priced from `sellingPrice` showed ₹0.
   *
   * Never eager: it is joined explicitly by the queries that feed product cards,
   * so the rest of the catalogue reads keep their current payload size.
   */
  @OneToMany(() => ProductListing, (listing) => listing.product)
  listings: ProductListing[];
}
