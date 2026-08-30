import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { PharmacyCategory } from './pharmacy-category.entity';
import { PharmacyItem } from './pharmacy-item.entity';
import { PharmacyOrder } from './pharmacy-order.entity';
import { PharmacyReview } from './pharmacy-review.entity';
import { PharmacyStaff } from './pharmacy-staff.entity';
import { PharmacyPromotion } from './pharmacy-promotion.entity';

export enum PharmacyStoreStatus {
  PENDING_KYC = 'PENDING_KYC',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  SUSPENDED = 'SUSPENDED',
  BLOCKED = 'BLOCKED',
  CLOSED = 'CLOSED',
}

@Entity('pharmacy_stores')
export class PharmacyStore {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Index({ unique: true })
  @Column({ length: 128 })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Index()
  @Column({ comment: 'Links to Auth Service user (pharmacy owner)' })
  ownerId: string;

  // ── Location ────────────────────────────────────────────────────────────────

  @Column({ type: 'text' })
  address: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  state: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  pincode: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  longitude: number;

  @Column({ type: 'varchar', name: 'region_code', length: 8, nullable: true })
  regionCode: string | null;

  @Column({ type: 'varchar', name: 'zone_id', nullable: true })
  zoneId: string | null;

  @Column({ length: 3, default: 'KEN', comment: 'ISO 3166-1 alpha-3 country code' })
  countryCode: string;

  // ── Store Info ──────────────────────────────────────────────────────────────

  @Column({ type: 'varchar', nullable: true })
  logoUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  bannerUrl: string | null;

  @Column({ type: 'jsonb', nullable: true })
  photos: string[];

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  website: string | null;

  // ── Operating Configuration ─────────────────────────────────────────────────

  @Column({ type: 'jsonb', nullable: true, comment: '{ mon: { open: "08:00", close: "22:00" }, ... }' })
  openingHours: Record<string, { open: string; close: string }>;

  @Column({ default: false, comment: '24-hour pharmacy' })
  is24hr: boolean;

  @Column({ default: false })
  isOnline: boolean;

  @Column({ default: true })
  isTemporarilyClosed: boolean;

  @Column({ type: 'int', default: 20, comment: 'Average preparation time in minutes' })
  avgPrepTime: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  minOrderAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  deliveryFee: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 5.0, comment: 'Delivery radius in km' })
  deliveryRadius: number;

  @Column({ default: true })
  deliveryEnabled: boolean;

  @Column({ default: false })
  pickupEnabled: boolean;

  // ── Licensing & Compliance ──────────────────────────────────────────────────

  @Column({ type: 'varchar', nullable: true, comment: 'Drug license number (e.g. DL-20B-KEN-12345)' })
  drugLicenseNumber: string | null;

  @Column({ type: 'date', nullable: true })
  drugLicenseExpiry: Date | null;

  @Column({ type: 'varchar', nullable: true, comment: 'Pharmacist registration number' })
  pharmacistRegNumber: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true, comment: 'Licensed pharmacist on duty' })
  pharmacistName: string | null;

  @Column({ default: false, comment: 'Can dispense Schedule H drugs' })
  canDispenseScheduleH: boolean;

  @Column({ type: 'jsonb', nullable: true })
  kycDocuments: Array<{
    type: string;
    url: string;
    status: 'pending' | 'approved' | 'rejected';
    uploadedAt: string;
    reviewedAt?: string;
  }>;

  // ── Ratings ─────────────────────────────────────────────────────────────────

  @Column({ type: 'decimal', precision: 3, scale: 1, default: 0 })
  rating: number;

  @Column({ type: 'int', default: 0 })
  ratingCount: number;

  @Column({ type: 'int', default: 0 })
  totalOrders: number;

  // ── Commission & Financials ─────────────────────────────────────────────────

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 12.0, comment: 'Platform commission percentage' })
  commissionRate: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0, comment: 'GST/VAT percentage' })
  taxRate: number;

  @Column({ type: 'jsonb', nullable: true, comment: 'Bank details for settlements' })
  bankDetails: {
    bankName: string;
    accountHolder: string;
    accountNumber: string;
    swift?: string;
    routingNumber?: string;
  };

  // ── Status ──────────────────────────────────────────────────────────────────

  @Column({ type: 'enum', enum: PharmacyStoreStatus, default: PharmacyStoreStatus.PENDING_KYC })
  status: PharmacyStoreStatus;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ type: 'varchar', nullable: true })
  franchiseId: string | null;

  // ── Relations ───────────────────────────────────────────────────────────────

  @OneToMany(() => PharmacyItem, (item) => item.store)
  items: PharmacyItem[];

  @OneToMany(() => PharmacyOrder, (order) => order.store)
  orders: PharmacyOrder[];

  @OneToMany(() => PharmacyReview, (rev) => rev.store)
  reviews: PharmacyReview[];

  @OneToMany(() => PharmacyStaff, (staff) => staff.store)
  staff: PharmacyStaff[];

  @OneToMany(() => PharmacyPromotion, (promo) => promo.store)
  promotions: PharmacyPromotion[];

  // ── Timestamps ──────────────────────────────────────────────────────────────

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
