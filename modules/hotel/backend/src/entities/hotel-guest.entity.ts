import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('hotel_guests')
export class HotelGuest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ comment: 'Links to hotel booking' })
  bookingId: string;

  @Index()
  @Column({ comment: 'Links to hotel' })
  hotelId: string;

  @Index()
  @Column({ type: 'varchar', nullable: true, comment: 'Links to Auth Service user (if registered)' })
  customerId: string | null;

  @Column({ length: 128 })
  firstName: string;

  @Column({ length: 128 })
  lastName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  nationality: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, comment: 'e.g. Passport, National ID, Driving License' })
  idType: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  idNumber: string | null;

  @Column({ type: 'date', nullable: true })
  dateOfBirth: string | null;

  // ── Stay Details ────────────────────────────────────────────────────────────

  @Column({ type: 'date' })
  checkinDate: string;

  @Column({ type: 'date' })
  checkoutDate: string;

  @Column({ type: 'varchar', length: 100, nullable: true, comment: 'Room number assigned' })
  roomNumber: string | null;

  @Column({ default: false })
  isPrimaryGuest: boolean;

  @Column({ default: false })
  isChild: boolean;

  @Column({ type: 'int', nullable: true })
  age: number | null;

  // ── Check-in/out Status ─────────────────────────────────────────────────────

  @Column({ default: false })
  hasCheckedIn: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  actualCheckinTime: Date | null;

  @Column({ default: false })
  hasCheckedOut: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  actualCheckoutTime: Date | null;

  // ── Preferences ─────────────────────────────────────────────────────────────

  @Column({ type: 'text', nullable: true })
  specialRequests: string | null;

  @Column({ type: 'jsonb', nullable: true, comment: 'Guest preferences e.g. pillow type, floor preference' })
  preferences: Record<string, string> | null;

  @Column({ default: false, comment: 'VIP/loyalty guest flag' })
  isVip: boolean;

  @Column({ type: 'int', default: 0, comment: 'Number of previous stays at this hotel' })
  previousStays: number;

  @CreateDateColumn()
  createdAt: Date;
}
