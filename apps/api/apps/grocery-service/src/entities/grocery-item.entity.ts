import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { GroceryStore } from './grocery-store.entity';

@Entity('grocery_items')
export class GroceryItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: true, default: '' })
  name: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Index()
  @Column({ type: 'varchar', length: 64, nullable: true, default: '' })
  category: string | null; // e.g., 'fresh-meat' — matches GroceryCategory.id

  // Paired with `category` in the store-by-category lookup, so it needs the
  // same index; only `category` had one.
  @Index()
  @Column({ type: 'varchar', length: 64, nullable: true })
  subCategory: string | null; // e.g., 'poultry', 'fresh-fish'

  @Column({ default: true })
  isAvailable: boolean;

  /**
   * Moderation state. Distinct from `isAvailable`, which is the seller's own
   * in-stock switch — this is the platform's decision about whether the listing
   * may be shown to customers at all.
   *
   * Grocery had no such column: a seller's new product was queryable by
   * customers through the store listing and public search the instant it was
   * created. Marketplace already gated its catalogue this way
   * (`marketplace.products.approval_status` + `PATCH /admin/marketplace/products/:id/approve`);
   * grocery simply never got it.
   *
   * The database default is APPROVED **on purpose**: adding this column to a
   * table of live products must not blank the storefront, and the 225 rows that
   * predate moderation were already trading. New listings are set to PENDING
   * explicitly by `createProduct`, so the default only ever applies to rows that
   * existed before the column did.
   */
  @Index()
  @Column({ type: 'varchar', length: 16, default: 'APPROVED' })
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';

  /** Why a moderator rejected it — shown to the seller so it can be fixed. */
  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ type: 'jsonb' })
  weightVariants: Array<{
    weight: string;
    price: number;
    mrp: number;
    stock: number;
    sku?: string;
  }>;
  /* Example:
     [
       { weight: "500g", price: 450, mrp: 500, stock: 12, sku: "FM-AVO-500" },
       { weight: "1kg",  price: 850, mrp: 1000, stock: 5,  sku: "FM-AVO-1K" }
     ]
  */

  @Column({ type: 'jsonb', nullable: true })
  preparationPreferences: {
    allowCutSelection: boolean;
    options: string[];
  } | null;
  /* Example:
     { allowCutSelection: true, options: ["Curry Cut", "Steaks", "Whole"] }
  */

  @Column({ type: 'varchar', nullable: true })
  imageUrl: string | null;

  /**
   * Localized name/description per locale, e.g. `{ ar: { name, description } }`.
   *
   * `updateProductTranslation` wrote this via `(product as any).translations = …`
   * against an entity that had no such column, so TypeORM dropped it on save and
   * `getProductTranslated` returned the untranslated row for every locale — the
   * whole translation feature was a no-op. `GroceryCategory` and `GroceryStore`
   * already carry the equivalent column.
   */
  // ── Identification ─────────────────────────────────────────────────────────

  /**
   * Product-level SKU. Distinct from a variant's SKU: this identifies the
   * article, each variant identifies a sellable pack of it.
   */
  @Index({ unique: true, where: '"sku" IS NOT NULL' })
  @Column({ type: 'varchar', length: 64, nullable: true })
  sku: string | null;

  /**
   * Approved brand. `brand` above stays as the free-text value products were
   * created with, so nothing breaks while listings are re-pointed at real rows.
   */
  @Index()
  @Column({ type: 'uuid', nullable: true })
  brandId: string | null;

  // ── Food information ───────────────────────────────────────────────────────

  @Column({ type: 'text', nullable: true })
  ingredients: string | null;

  /** Per-100g/ml figures, shape left open because it differs by market. */
  @Column({ type: 'jsonb', nullable: true })
  nutrition: Record<string, string | number> | null;

  /**
   * Declared allergens. A list rather than prose so it can be filtered on —
   * "does this store have anything nut-free" is a query, not a text search.
   */
  @Column({ type: 'jsonb', nullable: true })
  allergens: string[] | null;

  @Column({ type: 'text', nullable: true })
  storageInstructions: string | null;

  // ── Traceability ───────────────────────────────────────────────────────────

  @Column({ type: 'date', nullable: true })
  expiryDate: Date | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  batchNumber: string | null;

  /**
   * Whether this listing satisfies its market's rules — the food-safety licence,
   * the labelling requirements a country's profile declares. Set by moderation,
   * separate from `approvalStatus`: a listing can be approved to sell and still
   * be missing a compliance document.
   */
  @Column({ type: 'varchar', length: 16, default: 'NOT_REQUIRED' })
  complianceStatus: 'NOT_REQUIRED' | 'PENDING' | 'COMPLIANT' | 'NON_COMPLIANT';

  // ── Ordering rules ─────────────────────────────────────────────────────────

  @Column({ type: 'int', default: 1 })
  minOrderQuantity: number;

  /** NULL = no cap. */
  @Column({ type: 'int', nullable: true })
  maxOrderQuantity: number | null;

  /** Minimum buyer age, where a market restricts the product. NULL = none. */
  @Column({ type: 'int', nullable: true })
  ageRestriction: number | null;

  @Column({ type: 'jsonb', nullable: true })
  translations: Record<string, { name?: string; description?: string }>;

  @Column({ type: 'varchar', length: 128, nullable: true })
  brand: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  barcode: string | null;

  @Column({ default: false })
  isPromoted: boolean;

  @Column({ type: 'decimal', precision: 3, scale: 1, default: 0 })
  rating: number;

  @Column({ type: 'int', default: 0 })
  reviewCount: number;

  // ── Full-text search support ──────────────────────────────────────────────
  @Index()
  @Column({ type: 'tsvector', nullable: true, select: false })
  searchVector: any | null;

  @ManyToOne(() => GroceryStore, (store) => store.inventory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'storeId' })
  store: GroceryStore;

  /**
   * Indexed explicitly.
   *
   * Postgres does not create an index for a foreign key constraint, only for a
   * primary or unique one — so `storeId` had none despite being the column every
   * "products in this store" query filters on, which is the hottest read in the
   * module. Every such query was a sequential scan of the whole catalogue.
   */
  @Index()
  @Column()
  storeId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
