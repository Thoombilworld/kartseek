import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Restaurant } from './restaurant.entity';

export enum ComplaintStatus {
  OPEN = 'OPEN',
  INVESTIGATING = 'INVESTIGATING',
  ESCALATED = 'ESCALATED',
  RESOLVED = 'RESOLVED',
}

export enum ComplaintPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * A customer complaint about a restaurant, and its resolution.
 *
 * `admin.restaurant.complaints` and `admin.restaurant.resolveComplaint` had no
 * handler and this module had no complaint storage of any kind, so the console's
 * Complaints screen rendered five literals and its Resolve button changed a
 * React state variable. A resolution has to be written somewhere for the
 * decision to mean anything, and `restaurant_reviews` is not that place: a
 * review is the customer's public rating, it carries no resolution, no assignee
 * and no lifecycle, and overloading `is_flagged` to mean "complaint open" would
 * make hiding an abusive review and closing a complaint the same write.
 *
 * ── Attribution ─────────────────────────────────────────────────────────────
 *
 * A complaint is ALWAYS about a restaurant, so `restaurant_id` is NOT NULL and
 * the market is the restaurant's — read through the join, never copied here. A
 * second copy of the market is the dead-pair mistake F-35 records, and it would
 * go stale the first time a restaurant moved market.
 *
 * `ON DELETE CASCADE`: a complaint about a restaurant that no longer exists is
 * attributable to no market, which means no scoped administrator could ever see
 * or close it. Rows nobody can act on are not an archive, they are a queue that
 * never empties.
 */
@Entity({ name: 'restaurant_complaints', schema: 'restaurant' })
export class RestaurantComplaint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => Restaurant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Relation<Restaurant>;

  /** The restaurant complained about. The market is read through it. */
  @Column({ name: 'restaurant_id' })
  restaurantId: string;

  /** The order the complaint is about, when the customer named one. */
  @Column({ type: 'varchar', name: 'order_id', nullable: true })
  orderId: string | null;

  @Index()
  @Column({ name: 'customer_id' })
  customerId: string;

  @Column({ type: 'varchar', name: 'customer_name', length: 200, nullable: true })
  customerName: string | null;

  /**
   * Free text rather than an enum: operations add complaint categories far more
   * often than a migration window comes round, and an unknown category read
   * back from an older row must not throw. The gateway DTO holds the list the
   * console may send.
   */
  @Column({ type: 'varchar', length: 64 })
  category: string;

  @Column({ type: 'enum', enum: ComplaintPriority, default: ComplaintPriority.MEDIUM })
  priority: ComplaintPriority;

  @Column({ type: 'varchar', length: 255 })
  subject: string;

  @Column({ type: 'text' })
  description: string;

  @Index()
  @Column({ type: 'enum', enum: ComplaintStatus, default: ComplaintStatus.OPEN })
  status: ComplaintStatus;

  // ── Resolution ──────────────────────────────────────────────────────────────

  /** What was done. Written only by `resolveComplaint`, and required there. */
  @Column({ type: 'text', nullable: true })
  resolution: string | null;

  /** The administrator who closed it, from the verified token. */
  @Column({ type: 'varchar', name: 'resolved_by', nullable: true })
  resolvedBy: string | null;

  @Column({ type: 'timestamptz', name: 'resolved_at', nullable: true })
  resolvedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
