import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Seller } from './seller.entity';

/**
 * Coupon — Discount coupons created by sellers or platform admins.
 *
 * Supports:
 *   - Percentage or flat discounts with min/max bounds
 *   - Per-user and global usage limits
 *   - Product/category/seller scoping
 *   - Auto-apply and first-order restrictions
 *   - Time-windowed validity
 *
 * Industry Reference:
 *   Amazon: Coupon clipping with category targeting
 *   Flipkart: Bank offer + seller coupon stacking
 */
@Entity('coupons')
@Index(['code'], { unique: true })
@Index(['sellerId', 'isActive'])
@Index(['validFrom', 'validUntil'])
export class Coupon {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 30, comment: 'Unique coupon code, e.g. SAVE20, NEWUSER50' })
  code: string;

  @Column({ type: 'varchar', nullable: true })
  title: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: ['PERCENTAGE', 'FLAT', 'FREE_SHIPPING', 'CASHBACK', 'BUY_X_GET_Y'],
    default: 'PERCENTAGE',
  })
  discountType: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, comment: 'Discount value (% or flat amount)' })
  discountValue: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, comment: 'Max discount cap for percentage coupons' })
  maxDiscount: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, comment: 'Minimum order value to apply' })
  minOrderValue: number;

  @Column({ type: 'int', default: -1, comment: 'Total redemption limit (-1 = unlimited)' })
  usageLimit: number;

  @Column({ type: 'int', default: 1, comment: 'Max uses per customer' })
  usageLimitPerUser: number;

  @Column({ type: 'int', default: 0, comment: 'Current total redemptions' })
  usedCount: number;

  @Column({ type: 'timestamp', comment: 'Coupon valid from' })
  validFrom: Date;

  @Column({ type: 'timestamp', comment: 'Coupon valid until' })
  validUntil: Date;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false, comment: 'Automatically applied if eligible (no code entry needed)' })
  autoApply: boolean;

  @Column({ default: false, comment: 'Only valid for first-time customers' })
  firstOrderOnly: boolean;

  @Column({ type: 'varchar', nullable: true, name: 'seller_id', comment: 'NULL = platform-wide coupon' })
  sellerId: string | null;

  @ManyToOne(() => Seller, { nullable: true })
  @JoinColumn({ name: 'seller_id' })
  seller: Seller;

  @Column('simple-array', { nullable: true, comment: 'Restrict to specific product IDs' })
  applicableProductIds: string[];

  @Column('simple-array', { nullable: true, comment: 'Restrict to specific category IDs' })
  applicableCategoryIds: string[];

  @Column('simple-array', { nullable: true, comment: 'Restrict to specific payment methods (UPI, CARD, etc.)' })
  applicablePaymentMethods: string[];

  @Column({ type: 'varchar', nullable: true, comment: 'Bank name for bank-specific offers' })
  bankName: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'franchise_id' })
  franchiseId: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'region_code' })
  regionCode: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

/**
 * CouponUsage — Tracks individual coupon redemptions for audit and limit enforcement.
 */
@Entity('coupon_usages')
@Index(['couponId', 'customerId'])
@Index(['orderId'], { unique: true })
export class CouponUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'coupon_id' })
  couponId: string;

  @ManyToOne(() => Coupon, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'coupon_id' })
  coupon: Coupon;

  @Column({ name: 'customer_id' })
  customerId: string;

  @Column({ name: 'order_id' })
  orderId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, comment: 'Actual discount applied' })
  discountApplied: number;

  @CreateDateColumn()
  redeemedAt: Date;
}
