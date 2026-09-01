import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import type { Relation } from 'typeorm';
import { Restaurant } from './restaurant.entity';

export enum PromotionType {
  PERCENTAGE = 'PERCENTAGE',
  FLAT = 'FLAT',
  FREE_DELIVERY = 'FREE_DELIVERY',
  BUY_ONE_GET_ONE = 'BUY_ONE_GET_ONE',
  COMBO = 'COMBO',
}

@Entity('restaurant_promotions')
export class RestaurantPromotion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => Restaurant, (r) => r.promotions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Relation<Restaurant>;

  @Column({ name: 'restaurant_id' })
  restaurantId: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Index()
  @Column({ type: 'varchar', length: 50, nullable: true, comment: 'Coupon code e.g. FIRST20' })
  code: string | null;

  @Column({ type: 'enum', enum: PromotionType, default: PromotionType.PERCENTAGE })
  type: PromotionType;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, comment: 'Discount value (% or flat)' })
  discountValue: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, comment: 'Minimum order to qualify' })
  minOrderAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, comment: 'Cap on discount' })
  maxDiscount: number | null;

  @Column({ type: 'int', nullable: true, comment: 'Max total usages' })
  usageLimit: number | null;

  @Column({ type: 'int', default: 0 })
  usedCount: number;

  @Column({ type: 'int', nullable: true, comment: 'Max usages per customer' })
  perUserLimit: number | null;

  @Column({ type: 'timestamptz' })
  validFrom: Date;

  @Column({ type: 'timestamptz' })
  validUntil: Date;

  @Column({ default: true })
  isActive: boolean;

  @Column('simple-array', { nullable: true, comment: 'Restrict to specific menu item IDs' })
  applicableItemIds: string[];

  @Column({ type: 'varchar', length: 50, nullable: true, comment: 'e.g. DELIVERY_ONLY, TAKEAWAY_ONLY' })
  applicableOrderType: string | null;

  @Column({ default: false, comment: 'Platform-funded or restaurant-funded' })
  platformFunded: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
