import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Restaurant } from './restaurant.entity';

export enum ReservationStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  WAITLISTED = 'WAITLISTED',
  SEATED = 'SEATED',
  COMPLETED = 'COMPLETED',
  NO_SHOW = 'NO_SHOW',
  CANCELLED = 'CANCELLED',
}

@Entity('reservations')
export class Reservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ unique: true, comment: 'Human-readable booking ref e.g. TBK-20263' })
  bookingRef: string;

  @Index()
  @ManyToOne(() => Restaurant, (r) => r.reservations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;

  @Column({ name: 'restaurant_id' })
  restaurantId: string;

  @Index()
  @Column()
  customerId: string;

  @Column({ length: 255 })
  customerName: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  customerPhone: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  customerEmail: string | null;

  // ── Booking Details ─────────────────────────────────────────────────────────

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'varchar', length: 10, comment: 'e.g. 19:30' })
  time: string;

  @Column({ type: 'int' })
  guests: number;

  @Column({ type: 'varchar', nullable: true })
  tableId: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, comment: 'e.g. indoor, outdoor, rooftop, private' })
  seatingPreference: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, comment: 'e.g. Birthday, Anniversary' })
  occasion: string | null;

  @Column({ type: 'text', nullable: true })
  specialRequests: string | null;

  // ── Deposit ─────────────────────────────────────────────────────────────────

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  depositAmount: number;

  @Column({ default: false })
  depositPaid: boolean;

  @Column({ type: 'varchar', nullable: true })
  depositTransactionId: string | null;

  // ── Status ──────────────────────────────────────────────────────────────────

  @Column({ type: 'enum', enum: ReservationStatus, default: ReservationStatus.PENDING })
  status: ReservationStatus;

  @Column({ type: 'text', nullable: true })
  cancellationReason: string | null;

  @Column({ type: 'varchar', nullable: true })
  cancelledBy: string | null; // 'customer' | 'restaurant' | 'admin'

  @Column({ type: 'timestamptz', nullable: true })
  confirmedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  seatedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  // ── Reminder ────────────────────────────────────────────────────────────────

  @Column({ default: false })
  reminderSent: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
