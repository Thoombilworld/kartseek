import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import type { Relation } from 'typeorm';
import { HotelRoom } from './hotel-room.entity';
import { HotelBooking } from './hotel-booking.entity';
import { HotelReview } from './hotel-review.entity';
import { HotelStaff } from './hotel-staff.entity';

// ── Status Enum ───────────────────────────────────────────────────────────────

export enum HotelStatus {
  PENDING_KYC = 'PENDING_KYC',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  BLOCKED = 'BLOCKED',
  CLOSED = 'CLOSED',
}

export enum HotelType {
  HOTEL = 'HOTEL',
  RESORT = 'RESORT',
  BOUTIQUE = 'BOUTIQUE',
  BUSINESS = 'BUSINESS',
  BUDGET = 'BUDGET',
  HOSTEL = 'HOSTEL',
  VILLA = 'VILLA',
  APARTMENT = 'APARTMENT',
  HOMESTAY = 'HOMESTAY',
}

export enum HotelStarRating {
  ONE = 1,
  TWO = 2,
  THREE = 3,
  FOUR = 4,
  FIVE = 5,
}

// ── Entity ────────────────────────────────────────────────────────────────────

@Entity('hotels')
export class Hotel {
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
  @Column({ comment: 'Links to Auth Service user (hotel owner)' })
  ownerId: string;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: 'Hotel owner / management company name' })
  ownerName: string | null;

  // ── Location ────────────────────────────────────────────────────────────────

  @Column({ type: 'text' })
  address: string;

  @Column({ length: 100 })
  city: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  state: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  pincode: string | null;

  @Column({ length: 3, comment: 'ISO 3166-1 alpha-2 country code e.g. AE, IN, GB' })
  countryCode: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  longitude: number;

  @Column({ type: 'varchar', name: 'region_code', length: 8, nullable: true })
  regionCode: string | null;

  @Column({ type: 'text', nullable: true, comment: 'Nearest landmark or point of interest' })
  landmark: string | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, comment: 'Distance from city center in km' })
  distanceFromCenter: number | null;

  // ── Hotel Info ──────────────────────────────────────────────────────────────

  @Column({ type: 'enum', enum: HotelType, default: HotelType.HOTEL })
  type: HotelType;

  @Column({ type: 'smallint', default: 3, comment: '1-5 star rating classification' })
  starRating: number;

  @Column('simple-array', { nullable: true, comment: 'e.g. Pool, Spa, Gym, Restaurant, WiFi, Parking' })
  amenities: string[];

  @Column('simple-array', { nullable: true, comment: 'e.g. Luxury, Family-Friendly, Pet-Friendly, Beach' })
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

  @Column({ type: 'varchar', length: 10, default: '14:00', comment: 'Standard check-in time' })
  checkInTime: string;

  @Column({ type: 'varchar', length: 10, default: '12:00', comment: 'Standard check-out time' })
  checkOutTime: string;

  @Column({ type: 'int', default: 0, comment: 'Total number of rooms in the property' })
  totalRooms: number;

  @Column({ type: 'int', default: 0, comment: 'Total number of floors' })
  totalFloors: number;

  @Column({ type: 'int', nullable: true, comment: 'Year the hotel was built' })
  yearBuilt: number | null;

  @Column({ type: 'int', nullable: true, comment: 'Year of last renovation' })
  lastRenovated: number | null;

  // ── Policies ────────────────────────────────────────────────────────────────

  @Column({ type: 'jsonb', nullable: true, comment: 'Cancellation policy configuration' })
  cancellationPolicy: {
    freeCancellationHours: number;
    partialRefundPercentage?: number;
    nonRefundableDiscount?: number;
  };

  @Column({ type: 'text', nullable: true })
  childrenPolicy: string | null;

  @Column({ default: false })
  petsAllowed: boolean;

  @Column({ default: true })
  smokingAllowed: boolean;

  @Column({ type: 'jsonb', nullable: true, comment: 'Additional policies as key-value pairs' })
  additionalPolicies: Record<string, string> | null;

  // ── Ratings ─────────────────────────────────────────────────────────────────

  @Column({ type: 'decimal', precision: 3, scale: 1, default: 0 })
  rating: number;

  @Column({ type: 'int', default: 0 })
  reviewCount: number;

  @Column({ type: 'int', default: 0 })
  totalBookings: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0, comment: 'Occupancy rate percentage' })
  occupancyRate: number;

  // ── Commission & Financials ─────────────────────────────────────────────────

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 15.0, comment: 'Platform commission percentage' })
  commissionRate: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0, comment: 'GST/VAT percentage' })
  taxRate: number;

  @Column({ length: 3, default: 'AED', comment: 'Default currency ISO code' })
  currency: string;

  @Column({ type: 'jsonb', nullable: true, comment: 'Bank details for payouts' })
  bankDetails: {
    bankName: string;
    accountHolder: string;
    accountNumber: string;
    ifsc?: string;
    swift?: string;
    iban?: string;
    routingNumber?: string;
  };

  // ── KYC & Compliance ────────────────────────────────────────────────────────

  @Column({ type: 'jsonb', nullable: true })
  kycDocuments: Array<{
    type: string;
    documentNumber?: string;
    url: string;
    status: 'pending' | 'approved' | 'rejected';
    uploadedAt: string;
    reviewedAt?: string;
  }>;

  @Column({ type: 'varchar', nullable: true, comment: 'Tourism / hotel license number' })
  licenseNumber: string | null;

  @Column({ type: 'date', nullable: true })
  licenseExpiry: Date | null;

  // ── Status ──────────────────────────────────────────────────────────────────

  @Column({ type: 'enum', enum: HotelStatus, default: HotelStatus.PENDING_KYC })
  status: HotelStatus;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ default: false })
  isFeatured: boolean;

  @Column({ default: true })
  isAcceptingBookings: boolean;

  // ── Nearby Attractions ──────────────────────────────────────────────────────

  @Column({ type: 'jsonb', nullable: true })
  nearbyAttractions: Array<{ name: string; distance: string; type?: string }>;

  // ── Relations ───────────────────────────────────────────────────────────────

  @OneToMany(() => HotelRoom, (room) => room.hotel)
  rooms: Relation<HotelRoom[]>;

  @OneToMany(() => HotelBooking, (booking) => booking.hotel)
  bookings: Relation<HotelBooking[]>;

  @OneToMany(() => HotelReview, (review) => review.hotel)
  reviews: Relation<HotelReview[]>;

  @OneToMany(() => HotelStaff, (staff) => staff.hotel)
  staff: Relation<HotelStaff[]>;

  // ── Timestamps ──────────────────────────────────────────────────────────────

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
