import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import { Seller } from './seller.entity';

@Entity('seller_settings')
export class SellerSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'seller_id', unique: true })
  sellerId: string;

  @OneToOne(() => Seller)
  @JoinColumn({ name: 'seller_id' })
  seller: Relation<Seller>;

  // ── Store Settings ────────────────────────────────────────────
  @Column({ type: 'varchar', nullable: true })
  storeName: string | null;

  @Column({ type: 'text', nullable: true })
  storeDescription: string | null;

  @Column({ type: 'varchar', nullable: true })
  logoUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  bannerUrl: string | null;

  @Column({ default: true })
  isOnline: boolean;

  @Column({ default: false })
  autoAcceptOrders: boolean;

  @Column({ type: 'int', default: 0, comment: 'Delivery radius in km' })
  deliveryRadius: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  minimumOrder: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, comment: 'Free delivery above this amount' })
  freeDeliveryThreshold: number;

  @Column({ type: 'jsonb', nullable: true })
  businessHours: { open: string; close: string; days?: string[] };

  // ── Shipping & Fulfillment ───────────────────────────────────
  @Column({
    type: 'enum',
    enum: ['SELF', 'KARTSEEK_FULFILLMENT', 'HYBRID'],
    default: 'SELF',
  })
  fulfillmentMode: string;

  @Column({ type: 'jsonb', nullable: true, comment: 'Default shipping rates by region' })
  shippingRates: Array<{ region: string; rate: number; freeAbove?: number }>;

  @Column({ type: 'int', default: 2, comment: 'Default dispatch SLA in days' })
  dispatchSla: number;

  // ── Payment & Tax ─────────────────────────────────────────────
  @Column({ type: 'jsonb', nullable: true })
  bankDetails: { accountName: string; bankName: string; accountNumber: string; ifscCode?: string; swiftCode?: string };

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 10, comment: 'Platform commission %' })
  commissionRate: number;

  @Column({ type: 'varchar', nullable: true, comment: 'GST/VAT number' })
  taxId: string | null;

  // ── Notification Preferences ──────────────────────────────────
  @Column({ type: 'jsonb', nullable: true })
  notifications: { email: boolean; sms: boolean; push: boolean; orderAlerts: boolean; lowStockAlerts: boolean };

  // ── Security ──────────────────────────────────────────────────
  @Column({ default: false })
  twoFactorEnabled: boolean;

  @Column({ type: 'varchar', nullable: true })
  twoFactorSecret: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
