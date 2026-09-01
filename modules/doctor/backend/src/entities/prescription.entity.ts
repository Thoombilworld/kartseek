import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, OneToMany, Index,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { Appointment } from './appointment.entity';
import { Doctor } from './doctor.entity';
import { PrescriptionItem } from './prescription-item.entity';

@Entity('doctor_prescriptions')
export class Prescription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  appointmentId: string;

  @ManyToOne(() => Appointment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'appointmentId' })
  appointment: Relation<Appointment>;

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

  @Column({ type: 'text', nullable: true })
  diagnosis: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'date', nullable: true })
  followUpDate: string | null;

  @Column({
    type: 'enum',
    enum: ['DRAFT', 'ISSUED', 'DISPENSED'],
    default: 'DRAFT',
  })
  @Index()
  status: 'DRAFT' | 'ISSUED' | 'DISPENSED';

  @Column({ type: 'timestamptz', nullable: true })
  issuedAt: Date | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  pdfUrl: string | null;

  /** Links to a pharmacy order when the patient orders medicines from this prescription. */
  @Column({ type: 'varchar', nullable: true })
  pharmacyOrderId: string | null;

  @OneToMany(() => PrescriptionItem, (item) => item.prescription, { cascade: true, eager: true })
  items: Relation<PrescriptionItem[]>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
