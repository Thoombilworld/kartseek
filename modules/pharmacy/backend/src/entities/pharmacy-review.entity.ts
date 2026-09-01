import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import type { Relation } from 'typeorm';
import { PharmacyStore } from './pharmacy-store.entity';

@Entity('pharmacy_reviews')
export class PharmacyReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => PharmacyStore, (s) => s.reviews, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store: Relation<PharmacyStore>;

  @Column({ name: 'store_id' })
  storeId: string;

  @Index()
  @Column()
  customerId: string;

  @Column({ type: 'varchar', nullable: true, comment: 'Links to pharmacy_orders' })
  orderId: string | null;

  @Column({ length: 128, default: 'Anonymous' })
  customerName: string;

  @Column({ type: 'int', comment: 'Rating 1-5' })
  rating: number;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ type: 'jsonb', nullable: true })
  photos: string[];

  // ── Store response ──────────────────────────────────────────────────────────

  @Column({ type: 'text', nullable: true })
  storeReply: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  storeRepliedAt: Date | null;

  @Column({ default: true })
  isVisible: boolean;

  @Column({ default: false })
  isFlagged: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
