import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import type { Relation } from 'typeorm';
import { Restaurant } from './restaurant.entity';

@Entity('restaurant_reviews')
export class RestaurantReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => Restaurant, (r) => r.reviews, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Relation<Restaurant>;

  @Column({ name: 'restaurant_id' })
  restaurantId: string;

  @Index()
  @Column()
  customerId: string;

  @Column({ length: 128 })
  customerName: string;

  @Column({ type: 'varchar', nullable: true })
  customerAvatar: string | null;

  @Column({ type: 'varchar', nullable: true, comment: 'Links to the order being reviewed' })
  orderId: string | null;

  @Column({ type: 'smallint', comment: '1-5 star rating' })
  rating: number;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ type: 'jsonb', nullable: true })
  photos: string[];

  // ── Restaurant Response ─────────────────────────────────────────────────────

  @Column({ type: 'text', nullable: true })
  restaurantReply: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  repliedAt: Date | null;

  // ── Moderation ──────────────────────────────────────────────────────────────

  @Column({ default: false })
  isFlagged: boolean;

  @Column({ default: true })
  isVisible: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
