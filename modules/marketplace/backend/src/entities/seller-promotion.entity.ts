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
import { Seller } from './seller.entity';

/**
 * A seller-run offer.
 *
 * Distinct from `Coupon`, which is a code the customer types at checkout: a
 * promotion is the seller's own campaign and may apply automatically. Replaces
 * `createPromotion()` returning a `PROMO-<timestamp>` id that was never stored,
 * with `getPromotions()` answering `[]` — so a discount a seller thought they
 * had launched simply did not exist.
 */
@Entity({ name: 'seller_promotions', schema: 'marketplace' })
@Index(['sellerId', 'status'])
export class SellerPromotion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'seller_id' })
  sellerId: string;

  @ManyToOne(() => Seller, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'seller_id' })
  seller: Relation<Seller>;

  @Column()
  name: string;

  @Column({ type: 'varchar', nullable: true })
  code: string | null;

  /** percentage | flat | bogo | freebie */
  @Column({ default: 'percentage' })
  type: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  value: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxDiscount: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  minOrderValue: number;

  @Column({ type: 'int', default: 0 })
  usageCount: number;

  @Column({ type: 'int', nullable: true })
  usageLimit: number | null;

  /** active | paused | scheduled | expired */
  @Column({ default: 'active' })
  status: string;

  @Column({ type: 'timestamp', nullable: true })
  startDate: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  endDate: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  applicableProducts: string[] | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
