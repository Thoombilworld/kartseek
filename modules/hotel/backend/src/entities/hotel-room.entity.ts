import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Hotel } from './hotel.entity';
import { HotelBooking } from './hotel-booking.entity';

// ── Enums ─────────────────────────────────────────────────────────────────────

export enum RoomBedType {
  SINGLE = 'SINGLE',
  DOUBLE = 'DOUBLE',
  QUEEN = 'QUEEN',
  KING = 'KING',
  TWIN = 'TWIN',
  BUNK = 'BUNK',
  SOFA_BED = 'SOFA_BED',
  KING_PLUS_TWIN = 'KING_PLUS_TWIN',
}

export enum RoomType {
  STANDARD = 'STANDARD',
  DELUXE = 'DELUXE',
  PREMIUM = 'PREMIUM',
  SUITE = 'SUITE',
  EXECUTIVE_SUITE = 'EXECUTIVE_SUITE',
  PRESIDENTIAL_SUITE = 'PRESIDENTIAL_SUITE',
  FAMILY = 'FAMILY',
  STUDIO = 'STUDIO',
  PENTHOUSE = 'PENTHOUSE',
  DORMITORY = 'DORMITORY',
}

export enum RoomStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  UNDER_MAINTENANCE = 'UNDER_MAINTENANCE',
}

// ── Entity ────────────────────────────────────────────────────────────────────

@Entity({ name: 'hotel_rooms', schema: 'hotel' })
export class HotelRoom {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => Hotel, (hotel) => hotel.rooms, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hotel_id' })
  hotel: Relation<Hotel>;

  @Column({ name: 'hotel_id' })
  hotelId: string;

  @Column({ length: 255, comment: 'Display name e.g. Deluxe King Room' })
  name: string;

  @Column({ type: 'enum', enum: RoomType, default: RoomType.STANDARD })
  type: RoomType;

  @Column({ type: 'enum', enum: RoomBedType, default: RoomBedType.DOUBLE })
  bedType: RoomBedType;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // ── Capacity ────────────────────────────────────────────────────────────────

  @Column({ type: 'int', default: 2, comment: 'Maximum number of guests' })
  maxGuests: number;

  @Column({ type: 'int', default: 2, comment: 'Maximum adults' })
  maxAdults: number;

  @Column({ type: 'int', default: 1, comment: 'Maximum children (0-12)' })
  maxChildren: number;

  @Column({ type: 'varchar', length: 20, nullable: true, comment: 'Room area e.g. 35 sqm' })
  area: string | null;

  @Column({ type: 'int', nullable: true, comment: 'Floor number' })
  floor: number | null;

  // ── Pricing ─────────────────────────────────────────────────────────────────

  @Column({ type: 'decimal', precision: 10, scale: 2, comment: 'Base price per night' })
  pricePerNight: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    comment: 'Rack rate (original price before discount)',
  })
  rackRate: number | null;

  @Column({ length: 3, default: 'AED', comment: 'Currency ISO code' })
  currency: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    comment: 'Extra bed charge per night',
  })
  extraBedCharge: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    comment: 'Tax percentage applied to this room',
  })
  taxPercentage: number;

  // ── Inventory ───────────────────────────────────────────────────────────────

  @Column({ type: 'int', default: 1, comment: 'Total rooms of this type' })
  totalInventory: number;

  @Column({ type: 'int', default: 1, comment: 'Currently available rooms' })
  availableCount: number;

  // ── Amenities & Photos ──────────────────────────────────────────────────────

  @Column('simple-array', {
    nullable: true,
    comment: 'Room-specific amenities e.g. Mini Bar, Safe, City View',
  })
  amenities: string[];

  @Column({ type: 'jsonb', nullable: true })
  images: string[];

  // ── View & Features ─────────────────────────────────────────────────────────

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'e.g. City View, Sea View, Garden View, Pool View',
  })
  view: string | null;

  @Column({ default: false })
  hasBalcony: boolean;

  @Column({ default: false })
  hasKitchenette: boolean;

  @Column({ default: false })
  hasLivingRoom: boolean;

  @Column({ default: false })
  isSmokingAllowed: boolean;

  @Column({ default: false, comment: 'Wheelchair accessible room' })
  isAccessible: boolean;

  // ── Meal Plans ──────────────────────────────────────────────────────────────

  @Column({ default: false })
  breakfastIncluded: boolean;

  @Column({ default: false })
  halfBoardAvailable: boolean;

  @Column({ default: false })
  fullBoardAvailable: boolean;

  @Column({ default: false })
  allInclusiveAvailable: boolean;

  // ── Policies ────────────────────────────────────────────────────────────────

  @Column({ default: false, comment: 'Whether this room offers free cancellation' })
  freeCancellation: boolean;

  @Column({ default: false, comment: 'Pay at hotel option' })
  payAtHotel: boolean;

  @Column({ default: false, comment: 'Non-refundable discounted rate' })
  nonRefundableRate: boolean;

  // ── Status ──────────────────────────────────────────────────────────────────

  @Column({ type: 'enum', enum: RoomStatus, default: RoomStatus.ACTIVE })
  status: RoomStatus;

  // ── Relations ───────────────────────────────────────────────────────────────

  @OneToMany(() => HotelBooking, (booking) => booking.room)
  bookings: Relation<HotelBooking[]>;

  // ── Timestamps ──────────────────────────────────────────────────────────────

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
