import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { MenuCategory } from './menu-category.entity';
import { RestaurantOrder } from './restaurant-order.entity';
import { Reservation } from './reservation.entity';
import { RestaurantReview } from './restaurant-review.entity';
import { RestaurantTable } from './restaurant-table.entity';
import { RestaurantPromotion } from './restaurant-promotion.entity';
import { RestaurantStaff } from './restaurant-staff.entity';

export enum RestaurantStatus {
  PENDING_KYC = 'PENDING_KYC',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  SUSPENDED = 'SUSPENDED',
  BLOCKED = 'BLOCKED',
  CLOSED = 'CLOSED',
}

@Entity('restaurants')
export class Restaurant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Index({ unique: true })
  @Column({ length: 128 })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'jsonb', nullable: true, comment: 'Localized name/description translations' })
  translations: Record<string, { name?: string; description?: string }>;

  @Index()
  @Column({ comment: 'Links to Auth Service user (restaurant owner)' })
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

  // ── Restaurant Info ─────────────────────────────────────────────────────────

  @Column('simple-array', { comment: 'e.g. Indian, Chinese, Italian' })
  cuisines: string[];

  @Column('simple-array', { nullable: true, comment: 'e.g. Fine Dining, Casual, Fast Food' })
  tags: string[];

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

  @Column({ type: 'jsonb', nullable: true, comment: '{ mon: { open: "10:00", close: "23:00" }, ... }' })
  openingHours: Record<string, { open: string; close: string }>;

  @Column({ type: 'jsonb', nullable: true, comment: 'Array of ISO dates for holidays' })
  holidays: string[];

  @Column({ default: false })
  isOnline: boolean;

  // Defaulted false. It used to default true, which meant a restaurant that
  // finished onboarding and was approved still did not appear to customers
  // until someone flipped a flag — every one of the eight seeded restaurants
  // was invisible for exactly this reason. Closing is the exception a
  // restaurant opts into, not the state it starts in.
  @Column({ default: false })
  isTemporarilyClosed: boolean;

  @Column({ type: 'int', default: 30, comment: 'Average preparation time in minutes' })
  avgPrepTime: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  minOrderAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  deliveryFee: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 10.0, comment: 'Delivery radius in km' })
  deliveryRadius: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, comment: 'Packaging fee per order' })
  packagingFee: number;

  @Column({ type: 'int', default: 600, comment: 'Cost for two persons in local currency' })
  costForTwo: number;

  // ── Service Modes ───────────────────────────────────────────────────────────

  @Column({ default: true })
  deliveryEnabled: boolean;

  @Column({ default: false })
  takeawayEnabled: boolean;

  @Column({ default: false })
  dineInEnabled: boolean;

  @Column({ default: false })
  tableBookingEnabled: boolean;

  // ── Ratings ─────────────────────────────────────────────────────────────────

  @Column({ type: 'decimal', precision: 3, scale: 1, default: 0 })
  rating: number;

  @Column({ type: 'int', default: 0 })
  ratingCount: number;

  @Column({ type: 'int', default: 0 })
  totalOrders: number;

  // ── Commission & Financials ─────────────────────────────────────────────────

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 15.0, comment: 'Platform commission percentage' })
  commissionRate: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0, comment: 'GST/VAT percentage' })
  taxRate: number;

  @Column({ type: 'jsonb', nullable: true, comment: 'Bank details for settlements' })
  bankDetails: {
    bankName: string;
    accountHolder: string;
    accountNumber: string;
    ifsc?: string;
    swift?: string;
    routingNumber?: string;
  };

  // ── KYC & Compliance ────────────────────────────────────────────────────────

  @Column({ type: 'jsonb', nullable: true })
  kycDocuments: Array<{
    type: string;
    url: string;
    status: 'pending' | 'approved' | 'rejected';
    uploadedAt: string;
    reviewedAt?: string;
  }>;

  @Column({ type: 'varchar', nullable: true, comment: 'Food license / FSSAI number' })
  foodLicenseNumber: string | null;

  @Column({ type: 'date', nullable: true })
  foodLicenseExpiry: Date | null;

  // ── Status ──────────────────────────────────────────────────────────────────

  @Column({ type: 'enum', enum: RestaurantStatus, default: RestaurantStatus.PENDING_KYC })
  status: RestaurantStatus;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ type: 'varchar', nullable: true })
  franchiseId: string | null;

  // ── Relations ───────────────────────────────────────────────────────────────

  @OneToMany(() => MenuCategory, (cat) => cat.restaurant)
  menuCategories: MenuCategory[];

  @OneToMany(() => RestaurantOrder, (order) => order.restaurant)
  orders: RestaurantOrder[];

  @OneToMany(() => Reservation, (res) => res.restaurant)
  reservations: Reservation[];

  @OneToMany(() => RestaurantReview, (rev) => rev.restaurant)
  reviews: RestaurantReview[];

  @OneToMany(() => RestaurantTable, (tbl) => tbl.restaurant)
  tables: RestaurantTable[];

  @OneToMany(() => RestaurantPromotion, (promo) => promo.restaurant)
  promotions: RestaurantPromotion[];

  @OneToMany(() => RestaurantStaff, (staff) => staff.restaurant)
  staff: RestaurantStaff[];

  // ── Timestamps ──────────────────────────────────────────────────────────────

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
