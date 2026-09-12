import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Doctor } from './doctor.entity';

@Entity({ name: 'appointments', schema: 'doctor' })
export class Appointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  doctorId: string;

  @ManyToOne(() => Doctor)
  @JoinColumn({ name: 'doctorId' })
  doctor: Relation<Doctor>;

  @Column()
  @Index()
  customerId: string;

  @Column({ length: 200 })
  patientName: string;

  @Column({ type: 'int', nullable: true })
  patientAge: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  patientGender: string | null;

  @Column({ type: 'date' })
  @Index()
  date: string;

  @Column({ length: 20 })
  timeSlot: string;

  @Column({ type: 'enum', enum: ['in-clinic', 'video'], default: 'in-clinic' })
  type: 'in-clinic' | 'video';

  @Column({ type: 'text', nullable: true })
  symptoms: string | null;

  @Column({
    type: 'enum',
    enum: ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
    default: 'CONFIRMED',
  })
  @Index()
  status: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  fee: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  platformFee: number;

  @Column({ type: 'varchar', nullable: true })
  paymentId: string | null;

  @Column({ type: 'text', nullable: true })
  prescriptionNotes: string | null;

  @Column({ type: 'date', nullable: true })
  followUpDate: string | null;

  // ── Token Queue Fields ─────────────────────────────────────────────────────

  /** Sequential token number assigned when the appointment is booked (per doctor per day). */
  @Column({ type: 'int', nullable: true })
  tokenNumber: number | null;

  /** Live position in the queue — decrements as the doctor advances tokens. */
  @Column({ type: 'int', nullable: true })
  queuePosition: number | null;

  /** Estimated wait time in minutes based on avg consultation duration × position. */
  @Column({ type: 'int', nullable: true })
  estimatedWaitMinutes: number | null;

  /** When the patient checked in / arrived at the facility. */
  @Column({ type: 'timestamptz', nullable: true })
  checkedInAt: Date | null;

  /** When the doctor started this consultation. */
  @Column({ type: 'timestamptz', nullable: true })
  consultationStartedAt: Date | null;

  /** When the doctor completed this consultation. */
  @Column({ type: 'timestamptz', nullable: true })
  consultationEndedAt: Date | null;

  /** When the 30-min-before push notification was sent. Prevents duplicate sends. */
  @Column({ type: 'timestamptz', nullable: true })
  notificationSentAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
