import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import type { Relation } from 'typeorm';
import { Product } from './product.entity';
import { Seller } from './seller.entity';

/**
 * FlashDeal — a time-boxed campaign the platform runs across a set of products.
 *
 * Both halves of this pipeline used to live in Redis under a 24-hour TTL, with
 * a comment reading "admin-owned, no table". That had three consequences worth
 * recording, because they are what this file exists to fix:
 *
 *   1. A campaign an admin created vanished within a day, or on any eviction.
 *   2. The customer-facing query never read the admin's key — it ranked
 *      products by review count and stamped `now + 4h` on the response — so a
 *      campaign could not reach a shopper no matter what the admin did, and the
 *      countdown reset instead of counting down.
 *   3. Every seller's nominations shared one JSON array, rewritten whole on each
 *      write, so simultaneous nominations silently overwrote each other.
 *
 * `windowStart`/`windowEnd` are the real deal window; `status` is derived from
 * them by `isLive()` rather than being trusted on its own, so a campaign cannot
 * be left ACTIVE past its end by a missed cron.
 */
export type FlashDealStatus = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'ENDED' | 'CANCELLED';

@Entity('flash_deals')
@Index(['status', 'windowStart', 'windowEnd'])
@Index(['regionCode', 'status'])
export class FlashDeal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 120, comment: 'Campaign name shown to admins, e.g. "Smartphone Mega Sale"' })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * Stored as `varchar` with a CHECK constraint, not a Postgres enum type.
   *
   * Every migrated table in the `marketplace` schema does the same — there is
   * no `CREATE TYPE` anywhere in that schema — and matching it matters here
   * because the service runs `synchronize: true` outside production. Declaring
   * `type: 'enum'` would have TypeORM create `flash_deals_status_enum` on every
   * dev boot while production, which only runs the migration, kept a varchar.
   * The union type still rejects a bad value at compile time.
   */
  @Column({ type: 'varchar', length: 20, default: 'DRAFT' })
  status: FlashDealStatus;

  @Column({ type: 'timestamp', name: 'window_start', comment: 'Deal opens' })
  windowStart: Date;

  @Column({ type: 'timestamp', name: 'window_end', comment: 'Deal closes' })
  windowEnd: Date;

  @Column({ type: 'int', name: 'min_discount_percent', default: 0, comment: 'Floor a nomination must meet to be eligible' })
  minDiscountPercent: number;

  @Column({ type: 'int', name: 'stock_limit', default: 0, comment: 'Units released across the campaign (0 = uncapped)' })
  stockLimit: number;

  @Column({ type: 'int', name: 'units_sold', default: 0 })
  unitsSold: number;

  @Column({ type: 'int', default: 5, comment: 'Lower sorts first on the storefront' })
  priority: number;

  @Column({ type: 'varchar', nullable: true, name: 'region_code', comment: 'NULL = every region' })
  regionCode: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'created_by', comment: 'Admin user id' })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /**
   * Whether the campaign should be visible to shoppers right now.
   *
   * Deliberately derived rather than read from `status`: nothing sweeps ENDED
   * campaigns on a timer, so a stored status alone would keep yesterday's deal
   * on the storefront indefinitely.
   */
  isLive(at: Date = new Date()): boolean {
    if (this.status === 'CANCELLED' || this.status === 'DRAFT') return false;
    return this.windowStart <= at && this.windowEnd > at;
  }
}

/**
 * FlashDealNomination — a seller offering one product into a campaign.
 *
 * The unique index is the part that matters: a seller may nominate a given
 * product into a given campaign exactly once. The Redis array it replaces had no
 * such constraint, so a double-tap created two pending rows an admin then had to
 * reconcile by hand.
 */
export type NominationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';

@Entity('flash_deal_nominations')
@Index(['dealId', 'status'])
@Index(['sellerId', 'status'])
@Index(['dealId', 'sellerId', 'productId'], { unique: true })
export class FlashDealNomination {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'deal_id' })
  dealId: string;

  @ManyToOne(() => FlashDeal, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'deal_id' })
  deal: Relation<FlashDeal>;

  @Column({ name: 'seller_id' })
  sellerId: string;

  @ManyToOne(() => Seller, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'seller_id' })
  seller: Relation<Seller>;

  @Column({ name: 'product_id' })
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Relation<Product>;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'deal_price',
    comment: 'Price the shopper pays while the campaign runs — the reason a flash deal is not just a popular product',
  })
  dealPrice: number;

  @Column({ type: 'int', name: 'proposed_discount_percent', default: 0 })
  proposedDiscountPercent: number;

  @Column({ type: 'int', name: 'stock_allocated', default: 0 })
  stockAllocated: number;

  @Column({ type: 'int', name: 'stock_sold', default: 0 })
  stockSold: number;

  /** varchar + CHECK, for the reason given on `FlashDeal.status`. */
  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  status: NominationStatus;

  @Column({ type: 'text', nullable: true, name: 'seller_note' })
  sellerNote: string | null;

  @Column({ type: 'text', nullable: true, name: 'decision_reason', comment: 'Why an admin approved or rejected' })
  decisionReason: string | null;

  @Column({ type: 'timestamp', nullable: true, name: 'decided_at' })
  decidedAt: Date | null;

  @Column({ type: 'varchar', nullable: true, name: 'decided_by', comment: 'Admin user id' })
  decidedBy: string | null;

  @CreateDateColumn({ name: 'submitted_at' })
  submittedAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
