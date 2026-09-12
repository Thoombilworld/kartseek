import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Product } from './product.entity';

/**
 * ProductReport — a shopper flagging a listing for review.
 *
 * The product page has carried a "Report Counterfeit Product" control for as
 * long as it has existed, and there was nothing behind it: no endpoint, no
 * table, and for a while not even a click handler. A counterfeit report is the
 * one signal only a buyer can give — they are the ones holding the item — and
 * the platform was discarding all of it.
 *
 * Kept deliberately narrow. This records *that* a report was made and lets an
 * admin work through the queue; it does not itself unpublish a listing. Taking
 * a product down is an existing moderation action with its own audit trail
 * (`/admin/marketplace/products/action`), and coupling the two would let a
 * single malicious reporter delist a competitor.
 *
 * `reporterId` is the token subject, never a client-supplied value, so the same
 * account cannot file the same report repeatedly — see the unique index.
 */
export type ProductReportReason =
  | 'COUNTERFEIT'
  | 'PROHIBITED'
  | 'MISLEADING'
  | 'OFFENSIVE'
  | 'PRICING'
  | 'OTHER';

export type ProductReportStatus = 'PENDING' | 'REVIEWING' | 'ACTIONED' | 'DISMISSED';

@Entity({ name: 'product_reports', schema: 'marketplace' })
// The admin queue reads pending-first, oldest-first.
@Index(['status', 'createdAt'])
// "How many open reports does this listing have" — shown beside the product in
// the moderation table, and the reason a repeatedly-flagged listing surfaces.
@Index(['productId', 'status'])
// One open report per shopper per product. Without this a frustrated customer
// pressing the button five times becomes five queue entries an admin has to
// dismiss individually, and the per-product count stops meaning anything.
@Index(['productId', 'reporterId'], { unique: true })
export class ProductReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id' })
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Relation<Product>;

  /** The reporting customer's user id, taken from the verified JWT. */
  @Column({ name: 'reporter_id' })
  reporterId: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'OTHER',
    comment: 'Why the shopper flagged it',
  })
  reason: ProductReportReason;

  @Column({ type: 'text', nullable: true, comment: 'What the shopper wrote' })
  details: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'PENDING',
  })
  status: ProductReportStatus;

  /** What the reviewing admin concluded. Shown to nobody but admins. */
  @Column({ type: 'text', nullable: true, name: 'resolution_note' })
  resolutionNote: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'reviewed_by', comment: 'Admin user id' })
  reviewedBy: string | null;

  @Column({ type: 'timestamp', nullable: true, name: 'reviewed_at' })
  reviewedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
