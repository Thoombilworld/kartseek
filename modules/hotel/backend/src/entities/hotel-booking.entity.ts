import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Hotel } from './hotel.entity';
import { HotelRoom } from './hotel-room.entity';

// ── Status Enums ──────────────────────────────────────────────────────────────

export enum HotelBookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  MODIFICATION_REQUESTED = 'MODIFICATION_REQUESTED',
  MODIFIED = 'MODIFIED',
  CHECKED_IN = 'CHECKED_IN',
  CHECKED_OUT = 'CHECKED_OUT',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
  REFUNDED = 'REFUNDED',
}

export enum HotelPaymentMethod {
  ONLINE = 'ONLINE',
  WALLET = 'WALLET',
  PAY_AT_HOTEL = 'PAY_AT_HOTEL',
  CARD = 'CARD',
  UPI = 'UPI',
  BANK_TRANSFER = 'BANK_TRANSFER',
}

export enum HotelPaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
}

// ── Status Transitions ────────────────────────────────────────────────────────

export const BOOKING_STATUS_TRANSITIONS: Record<HotelBookingStatus, HotelBookingStatus[]> = {
  [HotelBookingStatus.PENDING]:                  [HotelBookingStatus.CONFIRMED, HotelBookingStatus.CANCELLED],
  [HotelBookingStatus.CONFIRMED]:                [HotelBookingStatus.MODIFICATION_REQUESTED, HotelBookingStatus.CHECKED_IN, HotelBookingStatus.CANCELLED, HotelBookingStatus.NO_SHOW],
  [HotelBookingStatus.MODIFICATION_REQUESTED]:   [HotelBookingStatus.MODIFIED, HotelBookingStatus.CONFIRMED, HotelBookingStatus.CANCELLED],
  [HotelBookingStatus.MODIFIED]:                 [HotelBookingStatus.CHECKED_IN, HotelBookingStatus.CANCELLED, HotelBookingStatus.NO_SHOW],
  [HotelBookingStatus.CHECKED_IN]:               [HotelBookingStatus.CHECKED_OUT],
  [HotelBookingStatus.CHECKED_OUT]:              [HotelBookingStatus.COMPLETED, HotelBookingStatus.REFUNDED],
  [HotelBookingStatus.COMPLETED]:                [HotelBookingStatus.REFUNDED],
  [HotelBookingStatus.CANCELLED]:                [HotelBookingStatus.REFUNDED],
  [HotelBookingStatus.NO_SHOW]:                  [HotelBookingStatus.REFUNDED],
  [HotelBookingStatus.REFUNDED]:                 [],
};

// ── Entity ────────────────────────────────────────────────────────────────────

@Entity('hotel_bookings')
export class HotelBooking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ comment: 'Human-readable booking number e.g. HBK-A7B3C9' })
  bookingNumber: string;

  @Index({ unique: true })
  @Column({ comment: 'Confirmation code shown to guest e.g. KS-A7B3C9' })
  confirmationCode: string;

  // ── Relations ───────────────────────────────────────────────────────────────

  @Index()
  @ManyToOne(() => Hotel, (hotel) => hotel.bookings, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'hotel_id' })
  hotel: Hotel;

  @Column({ name: 'hotel_id' })
  hotelId: string;

  @Index()
  @ManyToOne(() => HotelRoom, (room) => room.bookings, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'room_id' })
  room: HotelRoom;

  @Column({ name: 'room_id' })
  roomId: string;

  @Index()
  @Column({ comment: 'Links to Auth Service user (customer)' })
  customerId: string;

  // ── Stay Details ────────────────────────────────────────────────────────────

  @Column({ type: 'date', comment: 'Check-in date' })
  checkinDate: string;

  @Column({ type: 'date', comment: 'Check-out date' })
  checkoutDate: string;

  @Column({ type: 'int', default: 1 })
  nights: number;

  @Column({ type: 'int', default: 1, comment: 'Number of rooms booked' })
  roomCount: number;

  @Column({ type: 'int', default: 2 })
  adults: number;

  @Column({ type: 'int', default: 0 })
  children: number;

  // ── Guest Info Snapshot ─────────────────────────────────────────────────────

  @Column({ type: 'jsonb' })
  primaryGuest: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    nationality?: string;
    idType?: string;
    idNumber?: string;
  };

  @Column({ type: 'jsonb', nullable: true, comment: 'Additional guests for multi-guest bookings' })
  additionalGuests: Array<{
    firstName: string;
    lastName: string;
    age?: number;
    isChild?: boolean;
  }>;

  @Column({ type: 'text', nullable: true })
  specialRequests: string | null;

  // ── Pricing ─────────────────────────────────────────────────────────────────

  @Column({ type: 'decimal', precision: 10, scale: 2, comment: 'Price per night at time of booking' })
  pricePerNight: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, comment: 'Room total = pricePerNight × nights × rooms' })
  roomTotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  extraCharges: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  serviceFee: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discount: number;

  @Column({ type: 'varchar', nullable: true })
  couponCode: string | null;

  @Column({ type: 'int', default: 0, comment: 'Loyalty points redeemed' })
  pointsRedeemed: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, comment: 'Monetary value of redeemed points' })
  pointsDiscount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, comment: 'Final amount charged' })
  grandTotal: number;

  @Column({ length: 3, default: 'AED' })
  currency: string;

  // ── Payment ─────────────────────────────────────────────────────────────────

  @Column({ type: 'enum', enum: HotelPaymentMethod, default: HotelPaymentMethod.ONLINE })
  paymentMethod: HotelPaymentMethod;

  @Column({ type: 'enum', enum: HotelPaymentStatus, default: HotelPaymentStatus.PENDING })
  paymentStatus: HotelPaymentStatus;

  @Column({ type: 'varchar', nullable: true, comment: 'Payment gateway transaction ID' })
  paymentTransactionId: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, comment: 'Amount paid from wallet' })
  walletAmountUsed: number;

  // ── Meal Plan ───────────────────────────────────────────────────────────────

  @Column({ type: 'varchar', length: 50, nullable: true, comment: 'e.g. Room Only, Breakfast, Half Board, Full Board, All Inclusive' })
  mealPlan: string | null;

  // ── Status ──────────────────────────────────────────────────────────────────

  @Column({ type: 'enum', enum: HotelBookingStatus, default: HotelBookingStatus.PENDING })
  status: HotelBookingStatus;

  @Column({ type: 'text', nullable: true })
  cancelReason: string | null;

  @Column({ type: 'varchar', nullable: true, comment: 'Who cancelled: customer, hotel, admin, system' })
  cancelledBy: string | null;

  // ── Refund ──────────────────────────────────────────────────────────────────

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  refundAmount: number;

  @Column({ type: 'varchar', nullable: true })
  refundStatus: string | null;

  @Column({ type: 'varchar', nullable: true })
  refundTransactionId: string | null;

  // ── Modification History ────────────────────────────────────────────────────

  @Column({ type: 'jsonb', nullable: true })
  modifications: Array<{
    field: string;
    oldValue: string;
    newValue: string;
    modifiedAt: string;
    modifiedBy: string;
  }>;

  // ── Hotel Snapshot ──────────────────────────────────────────────────────────

  @Column({ length: 255, comment: 'Hotel name at time of booking (snapshot)' })
  hotelName: string;

  @Column({ length: 255, comment: 'Room name at time of booking (snapshot)' })
  roomName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  hotelCity: string | null;

  @Column({ type: 'varchar', length: 3, nullable: true })
  hotelCountryCode: string | null;

  // ── Timestamps ──────────────────────────────────────────────────────────────

  @Column({ type: 'timestamptz', nullable: true })
  confirmedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  checkedInAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  checkedOutAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;

  @Column({ type: 'varchar', length: 36, nullable: true, comment: 'Idempotency key to prevent duplicate bookings' })
  idempotencyKey: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
